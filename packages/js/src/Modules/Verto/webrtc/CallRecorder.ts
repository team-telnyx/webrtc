/**
 * CallRecorder
 *
 * Captures the raw audio payload flowing through the active WebRTC
 * `MediaStreamTrack`s during a call, synthesizes RTP packets from the
 * depacketized PCM that `MediaStreamTrackProcessor` exposes, buffers them with
 * a bounded in-memory ring buffer, and submits intermediate flushes every
 * `flushIntervalMs` plus a final flush at end of call. The captured packets
 * are stored as `.pcap` files by voice-sdk-debug for Wireshark-based
 * audio-quality diagnosis.
 *
 * Lifecycle mirrors `CallReportCollector`: `start()`, `stop()` (implicit on
 * final flush), `postFinalReport()`, `cleanup()`. BaseCall tracks the upload
 * via `session.trackCallReportUpload` so disconnect() can drain it.
 *
 * ## Browser support (Chromium only)
 *
 * `MediaStreamTrackProcessor` (Chrome 94+, Edge 94+) is required. Firefox and
 * Safari do not implement it. On those browsers the recorder logs a single
 * `RECORDING_UNAVAILABLE` warning at `start()` time and no-ops for the rest
 * of the call — the call path is never affected. There is deliberately NO
 * `ScriptProcessorNode` / `AudioContext` fallback (see the VSDK-279 plan).
 *
 * ## Privacy / consent
 *
 * Recording audio on the client requires user consent by law in most
 * jurisdictions. The SDK does NOT request consent — applications that enable
 * recording are responsible for the consent flow.
 *
 * ## Recording of muted tracks
 *
 * If the local audio track is muted or has zero audio level, the captured PCM
 * is silence — that's expected and the resulting `.pcap` correctly shows
 * silence (zero-amplitude PCM in RTP frames). Investigators should interpret
 * silence accordingly.
 *
 * ## call_report_id reuse
 *
 * Recording and stats share the same `call_report_id`. There is no race
 * because both go to distinct endpoints (`/call_report` vs `/call_recording`)
 * and both forward through different `Task.start` calls on the proxy.
 */

import logger from '../util/logger';
import {
  RECORDING_UNAVAILABLE,
  RECORDING_BUFFER_OVERFLOW,
} from '../util/constants/errorCodes';
import {
  type ITelnyxWarning,
  createTelnyxWarning,
} from '../util/constants/warnings';
import {
  DEFAULT_CALL_RECORDING_FLUSH_INTERVAL_MS,
  DEFAULT_CALL_RECORDING_MAX_BUFFER_BYTES,
  DEFAULT_CALL_RECORDING_SAMPLE_RATE,
} from './constants';

// ── WebCodecs / MediaStreamTrackProcessor global type declarations ──────
// These are Chromium-only globals (Chrome 94+) not present in the TS DOM
// lib. Declared here as minimal structural types so the recorder compiles
// without a custom lib. At runtime, `typeof MediaStreamTrackProcessor ===
// 'function'` guards construction (see start()).

/** Minimal AudioData surface used by the recorder. */
interface AudioData {
  readonly numberOfFrames: number;
  readonly sampleRate?: number;
  readonly numberOfChannels?: number;
  copyTo(
    destination: ArrayBufferView | ArrayBuffer,
    options?: { planeIndex?: number }
  ): void;
  close(): void;
}

/**
 * Minimal MediaStreamTrackProcessor (Chrome 94+). Declared as a value
 * (constructor) so both `typeof MediaStreamTrackProcessor === 'function'`
 * and `new MediaStreamTrackProcessor(...)` type-check.
 */
declare class MediaStreamTrackProcessor {
  readonly readable: ReadableStream<AudioData>;
  constructor(options: { track: MediaStreamTrack });
}

/** A single captured RTP packet in the ring buffer. */
export interface IRecordingPacket {
  /** Per-track incrementing RTP sequence number. */
  rtpSeq: number;
  /** Per-track RTP timestamp (increments by frame size in samples). */
  rtpTs: number;
  /** Per-track fixed random SSRC captured at start(). */
  rtpSsrc: number;
  /** ISO-8601 timestamp of frame capture. */
  capturedAt: string;
  /** Raw Float32 PCM bytes (Float32Array.buffer). */
  payloadBytes: Uint8Array;
}

/** Which audio track a packet belongs to. */
export type RecordingTrackKind = 'local' | 'remote';

/** Options for the CallRecorder, derived from IClientOptions. */
export interface ICallRecordingOptions {
  /** Whether recording is enabled (mirrors `enableCallRecording`). */
  enabled: boolean;
  /** Interval (ms) between intermediate flushes. */
  flushIntervalMs?: number;
  /** Hard cap (bytes) on the in-memory packet buffer. */
  maxBufferBytes?: number;
  /** Sample rate (Hz) advertised in the recording envelope. */
  sampleRate?: number;
  /** Which tracks to record. */
  tracks?: RecordingTrackKind[];
  /** Endpoint path (relative to host) for recording POSTs. */
  endpoint?: string;
  /** Injectable fetch for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Per-call context passed to the CallRecorder constructor. Mirrors the
 * fields the call-report path already holds; BaseCall builds this from
 * `this.session` and `this.id`.
 *
 * `host` may be omitted at construction and set later via `_setHost()` —
 * BaseCall constructs the recorder before the connection host is always
 * known, so the periodic and final flushes read whichever of
 * `callContext.host` / `_setHost(host)` is available.
 */
export interface ICallRecordingContext {
  /** The SDK call id (this.id). */
  callId: string;
  /** The SDK session id (this.session.sessionid). Optional, for logging. */
  sessionId?: string;
  /** Optional voice_sdk_id header value (mirrors the call-report path). */
  voiceSdkId?: string;
  /** The call_report_id (shared with the call report). */
  callReportId: string;
  /** Connection host (ws/wss/http/https or bare host) used to resolve the
   * /call_recording endpoint for intermediate + final flushes. May be
   * omitted here and set via `_setHost()`. */
  host?: string;
  /** Optional recording id override; defaults to `${callId}-${timestamp36}`. */
  recordingId?: string;
}

/** Per-track synthesis state. */
interface TrackState {
  /** Fixed random SSRC, captured once at start(). */
  ssrc: number;
  /** Incrementing sequence number. */
  seq: number;
  /** Accumulating timestamp (in samples). */
  ts: number;
}

/** Wire envelope posted to /call_recording (mirrors the VSDK-279 plan). */
export interface ICallRecordingEnvelope {
  call_report_id: string;
  call_id: string;
  voice_sdk_id?: string;
  recording_id: string;
  segment: 'intermediate' | 'final';
  track: RecordingTrackKind;
  codec: 'pcm-f32-le';
  sample_rate: number;
  channels: 1;
  started_at: string;
  ended_at: string;
  packet_count: number;
  byte_count: number;
  packets: Array<{
    rtp_seq: number;
    rtp_ts: number;
    rtp_ssrc: number;
    captured_at: string;
    payload_b64: string;
  }>;
}

/**
 * CallRecorder — captures raw audio PCM from WebRTC tracks, synthesizes RTP
 * packets, buffers them with a bounded ring buffer, and POSTs flushes.
 *
 * Mirrors `CallReportCollector`'s POST/retry/keepalive shape so the upload
 * behaves the same way the call-report upload does (x-call-report-id /
 * x-call-id / x-voice-sdk-id headers, retry with [500,1000,2000]ms backoff,
 * `keepalive: true` for small final payloads).
 */
export class CallRecorder {
  private options: ICallRecordingOptions;
  private callContext: ICallRecordingContext;
  private recordingId: string;

  /** Per-track ring buffer of captured RTP packets, oldest first. */
  private _buffers: Record<RecordingTrackKind, IRecordingPacket[]> = {
    local: [],
    remote: [],
  };
  /** Per-track current byte size of the buffer (header estimate + payload). */
  private _bufferBytes: Record<RecordingTrackKind, number> = {
    local: 0,
    remote: 0,
  };
  /** Per-track synthesis state. */
  private _trackStates: Record<RecordingTrackKind, TrackState | null> = {
    local: null,
    remote: null,
  };
  /** Active MediaStreamTrackProcessor instances, for cleanup. */
  private _processors: MediaStreamTrackProcessor[] = [];
  /** Active reader loops (so cleanup can cancel). */
  private _readerCancellers: Array<() => void> = [];
  /** setInterval id for periodic flushes. */
  private _flushTimerId: ReturnType<typeof setInterval> | null = null;
  /** Whether a flush is in progress (prevents re-entrant flushes). */
  private _flushing: boolean = false;
  /** Whether stop() has been requested. */
  private _stopped: boolean = false;
  /** Whether start() succeeded (at least one track attached). */
  private _started: boolean = false;
  /** Recording start timestamp. */
  private _startedAt: Date | null = null;
  /** Recording end timestamp (set on final flush). */
  private _endedAt: Date | null = null;
  /** Throttle: only log RECORDING_BUFFER_OVERFLOW once per flush window. */
  private _overflowWarnedThisWindow: boolean = false;

  /** Callback invoked when a quality warning should be surfaced. */
  public onWarning: ((warning: ITelnyxWarning) => void) | null = null;

  // ── Retry configuration (mirrors CallReportCollector) ────────────────
  private static readonly RETRY_DELAYS_MS = [500, 1000, 2000];
  private static readonly KEEPALIVE_BODY_LIMIT_BYTES = 60 * 1024;
  /** Per-packet overhead estimate (envelope JSON keys ~120B + RTP header). */
  private static readonly PACKET_OVERHEAD_BYTES = 160;

  constructor(
    options: ICallRecordingOptions,
    callContext: ICallRecordingContext
  ) {
    this.options = options;
    this.callContext = callContext;
    // Deterministic-enough per-call recording id (uuid not required; the
    // (recording_id, call_id) tuple is unique per call).
    this.recordingId =
      callContext.recordingId ||
      `${callContext.callId}-${Date.now().toString(36)}`;
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Start capturing PCM from the local outbound and/or remote inbound audio
   * tracks. If `MediaStreamTrackProcessor` is unavailable, logs a single
   * `RECORDING_UNAVAILABLE` warning and no-ops. Safe to call with undefined
   * tracks (skips the missing ones).
   */
  public start(
    localTrack?: MediaStreamTrack,
    remoteTrack?: MediaStreamTrack
  ): void {
    if (!this.options.enabled || this._started) {
      return;
    }

    // Capability check — Chromium-only. No fallback (see module header).
    if (typeof MediaStreamTrackProcessor !== 'function') {
      logger.warn(
        'CallRecorder: MediaStreamTrackProcessor unavailable — recording disabled for this call'
      );
      this._emitWarning(RECORDING_UNAVAILABLE);
      // No-op: call proceeds normally, no capture, no buffer, no POST.
      this._started = true;
      return;
    }

    const tracks = this.options.tracks || (['local', 'remote'] as const);
    let attached = 0;

    if (tracks.includes('local') && localTrack) {
      this._attach(localTrack, 'local');
      attached++;
    }
    if (tracks.includes('remote') && remoteTrack) {
      this._attach(remoteTrack, 'remote');
      attached++;
    }

    if (attached === 0) {
      // No tracks available to record — log once and no-op. Do NOT emit
      // RECORDING_UNAVAILABLE here (that's for the API-missing case); a
      // missing track is a call-state issue, not a browser-capability issue.
      logger.info(
        'CallRecorder: no audio tracks available to record — recording idle for this call',
        { callId: this.callContext.callId }
      );
      this._started = true;
      return;
    }

    this._startedAt = new Date();
    this._started = true;
    this._scheduleFlush();

    logger.info('CallRecorder: started', {
      callId: this.callContext.callId,
      tracksAttached: attached,
      flushIntervalMs: this._flushIntervalMs(),
      maxBufferBytes: this._maxBufferBytes(),
    });
  }

  /**
   * Stop capturing. Cancels reader loops, clears the flush timer, and marks
   * the recorder stopped so no further flushes are scheduled. Does NOT post
   * the final flush — call `postFinalReport()` for that.
   */
  public stop(): void {
    if (this._stopped) {
      return;
    }
    this._stopped = true;
    this._clearFlushTimer();
    this._cancelReaders();
    this._endedAt = new Date();
    logger.info('CallRecorder: stopped', {
      callId: this.callContext.callId,
      packetsBuffered: this._buffers.local.length + this._buffers.remote.length,
    });
  }

  /**
   * Post the remaining buffered packets as the final segment. Called from
   * BaseCall._postCallReport at end of call. Mirrors CallReportCollector's
   * final-report POST (retry + keepalive). Throws on exhaustion so the caller
   * can record failure. The final segment carries `segment: 'final'` and
   * `ended_at`. The endpoint is resolved from the host passed at construction
   * (BaseCall sets `callContext.host`).
   */
  public async postFinalReport(): Promise<void> {
    if (!this.options.enabled) {
      return;
    }

    // Ensure capture is stopped so no new frames arrive mid-flush.
    this.stop();

    if (!this._startedAt) {
      // start() never ran or no-op'd — nothing to post.
      logger.debug('CallRecorder: postFinalReport skipped — never started');
      return;
    }

    const endpoint = this._resolveEndpointFromContext();
    if (!endpoint) {
      logger.debug(
        'CallRecorder: postFinalReport skipped — no host available'
      );
      return;
    }
    // Post each track's buffered packets as its own final segment. The wire
    // envelope is per-track (the plan's envelope has a single `track` field).
    const tracks: RecordingTrackKind[] = (this.options.tracks || [
      'local',
      'remote',
    ]) as RecordingTrackKind[];

    for (const track of tracks) {
      const packets = this._drain(track);
      if (packets.length === 0) {
        continue;
      }
      const envelope = this._buildEnvelope(
        packets,
        track,
        'final',
        this._startedAt,
        this._endedAt || new Date()
      );
      await this._postRecording(endpoint, envelope, true);
    }
  }

  /**
   * Deterministic cleanup — clears the flush timer, cancels readers, nulls
   * the buffer. Idempotent and never throws. Called from BaseCall finally
   * blocks and _finalize so failed/aborted calls still release resources.
   */
  public cleanup(): void {
    this._clearFlushTimer();
    this._cancelReaders();
    this._buffers = { local: [], remote: [] };
    this._bufferBytes = { local: 0, remote: 0 };
    this._trackStates = { local: null, remote: null };
  }

  // ── Internal: capture ──────────────────────────────────────────────

  /**
   * Attach a MediaStreamTrackProcessor to a track and pump frames into the
   * ring buffer. Capability check is assumed to have passed in start().
   */
  private _attach(track: MediaStreamTrack, kind: RecordingTrackKind): void {
    // Initialize per-track synthesis state with a random SSRC.
    this._trackStates[kind] = {
      ssrc: Math.floor(Math.random() * 0xffffffff) >>> 0,
      seq: 0,
      ts: 0,
    };

    try {
      // MediaStreamTrackProcessor is a global constructor (Chrome 94+).
      const processor = new MediaStreamTrackProcessor({ track });
      this._processors.push(processor);

      const reader = processor.readable.getReader();
      let cancelled = false;
      const cancel = () => {
        cancelled = true;
        reader
          .cancel()
          .catch(() => undefined)
          .finally(() => undefined);
      };
      this._readerCancellers.push(cancel);

      const pump = async (): Promise<void> => {
        try {
          while (!cancelled && !this._stopped) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            this._onFrame(kind, value as AudioData);
          }
        } catch (err) {
          if (!this._stopped) {
            logger.warn('CallRecorder: reader loop error', {
              track: kind,
              error: err,
            });
          }
        }
      };
      // Fire-and-forget; cleanup() cancels via this._readerCancellers.
      pump();
    } catch (err) {
      // Failed to construct the processor for this track — log and continue.
      // Don't emit RECORDING_UNAVAILABLE (the API exists; this track failed).
      logger.warn('CallRecorder: failed to attach track', {
        track: kind,
        error: err,
      });
      this._trackStates[kind] = null;
    }
  }

  /**
   * Handle a captured AudioData frame: pull Float32 PCM, synthesize an RTP
   * packet, push to the ring buffer.
   */
  private _onFrame(kind: RecordingTrackKind, audioData: AudioData): void {
    const state = this._trackStates[kind];
    if (!state || this._stopped) {
      return;
    }

    // Pull Float32 PCM samples from the AudioData. AudioData.copyTo writes
    // planar Float32 into the destination buffer.
    const numberOfFrames = audioData.numberOfFrames;
    const float32 = new Float32Array(numberOfFrames);
    audioData.copyTo(float32, { planeIndex: 0 });
    audioData.close?.();

    // Raw Float32 PCM bytes (little-endian) — the RTP payload.
    const payloadBytes = new Uint8Array(float32.buffer, float32.byteOffset, float32.byteLength);

    // Synthesize RTP header values (per-track).
    state.seq = (state.seq + 1) & 0xffff;
    const rtpTs = state.ts;
    state.ts += numberOfFrames; // increment by frame size in samples

    const packet: IRecordingPacket = {
      rtpSeq: state.seq,
      rtpTs: rtpTs,
      rtpSsrc: state.ssrc,
      capturedAt: new Date().toISOString(),
      payloadBytes,
    };

    this._pushPacket(packet, kind);
  }

  /**
   * Push a packet into the per-track ring buffer, enforcing the
   * maxBufferBytes cap. On overflow, drop oldest packets and emit
   * RECORDING_BUFFER_OVERFLOW at most once per flush window.
   */
  private _pushPacket(
    packet: IRecordingPacket,
    track: RecordingTrackKind
  ): void {
    const packetBytes =
      packet.payloadBytes.length + CallRecorder.PACKET_OVERHEAD_BYTES;
    const cap = this._maxBufferBytes();
    const buffer = this._buffers[track];

    buffer.push(packet);
    this._bufferBytes[track] += packetBytes;

    if (this._bufferBytes[track] > cap) {
      // Drop oldest until under cap.
      while (buffer.length > 1 && this._bufferBytes[track] > cap) {
        const dropped = buffer.shift();
        if (dropped) {
          this._bufferBytes[track] -=
            dropped.payloadBytes.length +
            CallRecorder.PACKET_OVERHEAD_BYTES;
        }
      }
      if (!this._overflowWarnedThisWindow) {
        this._overflowWarnedThisWindow = true;
        logger.warn('CallRecorder: buffer overflow — oldest packets dropped', {
          track,
        });
        this._emitWarning(RECORDING_BUFFER_OVERFLOW);
      }
    }
  }

  // ── Internal: flush ─────────────────────────────────────────────────

  private _flushIntervalMs(): number {
    return (
      this.options.flushIntervalMs ??
      DEFAULT_CALL_RECORDING_FLUSH_INTERVAL_MS
    );
  }

  private _maxBufferBytes(): number {
    return (
      this.options.maxBufferBytes ?? DEFAULT_CALL_RECORDING_MAX_BUFFER_BYTES
    );
  }

  private _sampleRate(): number {
    return this.options.sampleRate ?? DEFAULT_CALL_RECORDING_SAMPLE_RATE;
  }

  private _scheduleFlush(): void {
    if (this._stopped || this._flushTimerId) {
      return;
    }
    const interval = this._flushIntervalMs();
    if (interval <= 0) {
      return; // 0 disables time-based flushes; rely on final flush only
    }
    this._flushTimerId = setInterval(() => {
      this._periodicFlush().catch((err) => {
        logger.error('CallRecorder: periodic flush error', { error: err });
      });
    }, interval);
  }

  private _clearFlushTimer(): void {
    if (this._flushTimerId) {
      clearInterval(this._flushTimerId);
      this._flushTimerId = null;
    }
  }

  private _cancelReaders(): void {
    for (const cancel of this._readerCancellers) {
      try {
        cancel();
      } catch {
        // ignore — cleanup must not throw
      }
    }
    this._readerCancellers = [];
    this._processors = [];
  }

  /**
   * Periodic intermediate flush: POSTs each track's buffered packets with
   * `segment: 'intermediate'` and clears that track's packets on success.
   * Resets the overflow-warning throttle window.
   */
  private async _periodicFlush(): Promise<void> {
    if (this._flushing || this._stopped) {
      return;
    }
    this._flushing = true;
    try {
      const endpoint = this._resolveEndpointFromContext();
      if (!endpoint) {
        logger.debug(
          'CallRecorder: periodic flush skipped — no host available'
        );
        return;
      }
      const tracks: RecordingTrackKind[] = (this.options.tracks || [
        'local',
        'remote',
      ]) as RecordingTrackKind[];
      const windowStart = this._startedAt || new Date();
      const windowEnd = new Date();
      for (const track of tracks) {
        const packets = this._drain(track);
        if (packets.length === 0) {
          continue;
        }
        const envelope = this._buildEnvelope(
          packets,
          track,
          'intermediate',
          windowStart,
          windowEnd
        );
        await this._postRecording(endpoint, envelope, false);
      }
      // New flush window — allow overflow warning to fire again.
      this._overflowWarnedThisWindow = false;
    } finally {
      this._flushing = false;
    }
  }

  /**
   * Remove and return all buffered packets for a track. Clears that track's
   * slice of the per-track buffer and recomputes its byte count.
   */
  private _drain(track: RecordingTrackKind): IRecordingPacket[] {
    const drained = this._buffers[track];
    this._buffers[track] = [];
    this._bufferBytes[track] = 0;
    return drained;
  }

  // ── Internal: POST ──────────────────────────────────────────────────

  private _resolveEndpointFromContext(): string | null {
    const host = this.callContext.host;
    if (!host) {
      // Host was not available at construction (e.g. callReportId not yet
      // assigned). The final flush will carry the tail if host is set later
      // via _setHost; otherwise the recording for this call is not uploaded.
      return this._host ? this._resolveEndpoint(this._host) : null;
    }
    return this._resolveEndpoint(host);
  }

  private _host: string | null = null;
  /**
   * Set/update the connection host. BaseCall constructs the recorder before
   * the connection host is always known (it reads `this.session.connection?.host`
   * at construction), so the periodic flush and final flush can use an
   * up-to-date host if the session reconnects to a different host.
   */
  public _setHost(host: string): void {
    this._host = host;
  }

  private _resolveEndpoint(host: string): string {
    const path = this.options.endpoint || '/call_recording';
    try {
      const wsUrl = new URL(host);
      const base = `${wsUrl.protocol.replace(/^ws/, 'http')}//${wsUrl.host}`;
      return `${base}${path}`;
    } catch {
      // host may already be an http(s) URL or a bare host; fall back.
      if (/^https?:\/\//.test(host)) {
        return `${host}${path}`;
      }
      return `https://${host}${path}`;
    }
  }

  private _buildEnvelope(
    packets: IRecordingPacket[],
    track: RecordingTrackKind,
    segment: 'intermediate' | 'final',
    startedAt: Date,
    endedAt: Date
  ): ICallRecordingEnvelope {
    let byteCount = 0;
    const wirePackets = packets.map((p) => {
      byteCount += p.payloadBytes.length;
      return {
        rtp_seq: p.rtpSeq,
        rtp_ts: p.rtpTs,
        rtp_ssrc: p.rtpSsrc,
        captured_at: p.capturedAt,
        payload_b64: this._toBase64(p.payloadBytes),
      };
    });
    return {
      call_report_id: this.callContext.callReportId,
      call_id: this.callContext.callId,
      ...(this.callContext.voiceSdkId
        ? { voice_sdk_id: this.callContext.voiceSdkId }
        : {}),
      recording_id: this.recordingId,
      segment,
      track,
      codec: 'pcm-f32-le',
      sample_rate: this._sampleRate(),
      channels: 1,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      packet_count: packets.length,
      byte_count: byteCount,
      packets: wirePackets,
    };
  }

  /**
   * POST a recording envelope with retry + keepalive, mirroring
   * CallReportCollector._sendPayload. `isFinal` controls keepalive for small
   * payloads. Throws on exhaustion.
   */
  private async _postRecording(
    endpoint: string,
    envelope: ICallRecordingEnvelope,
    isFinal: boolean
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-call-report-id': envelope.call_report_id,
      'x-call-id': envelope.call_id,
    };
    if (envelope.voice_sdk_id) {
      headers['x-voice-sdk-id'] = envelope.voice_sdk_id;
    }

    const body = JSON.stringify(envelope);
    const useKeepalive =
      isFinal && body.length <= CallRecorder.KEEPALIVE_BODY_LIMIT_BYTES;
    const fetchImpl = this.options.fetchImpl || fetch;

    let lastError: unknown;

    for (
      let attempt = 0;
      attempt <= CallRecorder.RETRY_DELAYS_MS.length;
      attempt++
    ) {
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers,
          body,
          ...(useKeepalive ? { keepalive: true } : {}),
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          lastError = new Error(
            `Call recording POST failed with status ${response.status}`
          );
          logger.error('CallRecorder: failed to post', {
            track: envelope.track,
            segment: envelope.segment,
            attempt: attempt + 1,
            status: response.status,
            error: errorText,
          });
        } else {
          logger.info('CallRecorder: posted', {
            track: envelope.track,
            segment: envelope.segment,
            attempt: attempt + 1,
            status: response.status,
            packets: envelope.packet_count,
          });
          return;
        }
      } catch (err) {
        lastError = err;
        logger.warn('CallRecorder: network error posting', {
          track: envelope.track,
          segment: envelope.segment,
          attempt: attempt + 1,
          error: err,
        });
      }

      const retryDelay = CallRecorder.RETRY_DELAYS_MS[attempt];
      if (retryDelay === undefined) {
        break;
      }
      logger.info('CallRecorder: retrying', {
        track: envelope.track,
        segment: envelope.segment,
        inMs: retryDelay,
        attempt: attempt + 2,
      });
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    logger.error('CallRecorder: exhausted retries', {
      track: envelope.track,
      segment: envelope.segment,
      error: lastError,
    });
    throw lastError instanceof Error
      ? lastError
      : new Error('Call recording POST failed after retries');
  }

  // ── Internal: helpers ──────────────────────────────────────────────

  private _emitWarning(
    code: typeof RECORDING_UNAVAILABLE | typeof RECORDING_BUFFER_OVERFLOW
  ): void {
    try {
      const warning = createTelnyxWarning(code);
      this.onWarning?.(warning);
    } catch (err) {
      logger.warn('CallRecorder: failed to emit warning', { code, error: err });
    }
  }

  /** Base64-encode a Uint8Array without large-string stack issues. */
  private _toBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(
        null,
        Array.from(chunk) as unknown as number[]
      );
    }
    // btoa is available in browsers and Node 16+.
    return btoa(binary);
  }
}
