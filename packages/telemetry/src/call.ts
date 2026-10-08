/**
 * Call Report V2: the events of one call (contract 1.4, 1.5): call_started,
 * call_state, ice_candidate, call_media_changed, call_metrics, call_warning,
 * call_timings, call_ended and call/media errors. Every public method is a
 * hook called from the SDK; none of them throws (guard).
 */
import {
  WARNING_CODES,
  type CallEndReason,
  type CallOptions,
  type CallState,
  type EventName,
  type IceCandidate,
  type KnownIds,
  type PayloadOf,
} from './contract';
import { METRICS_INTERVAL_MS } from './sender';
import type SessionTelemetry from './session';
import {
  hasFocusNow,
  onlineNow,
  readPeerConfiguration,
  readPeerStates,
  readRtpParameters,
  resolveMediaElement,
  visibilityNow,
} from './browser';
import {
  attempt,
  bool,
  cleanObject,
  defined,
  guard,
  num,
  round,
  sanitizeDetails,
  str,
  stripDeviceLabel,
  table,
  toCodedErrorInfo,
  toIceServerInfo,
  words,
  type Any,
  type Flat,
} from './sanitize';
import {
  addTrackStats,
  buildMetrics,
  buildTotals,
  extractStats,
  ICE_STATES,
  isCarriedKey,
  RELAY_PROTOCOLS,
  splitMedia,
  TCP_TYPES,
  type StatsSnapshot,
} from './stats';

/** What CallTelemetry reads from the call (BaseCall). */
export interface CallHost {
  id: string;
  options: Any;
  cause?: string;
  causeCode?: number;
  sipCode?: number;
  sipReason?: string;
  sipCallId?: string;
}

/** What the quality detector may give with a warning. */
export type WarningDetails = {
  metric?: string;
  value?: number;
  threshold?: number;
};

/** Custom header names whose value is a credential. */
const CREDENTIAL_HEADER =
  /auth|token|secret|passw|api[-_]?key|credential|cookie|session[-_]?key/i;
const FINAL_STATS_TIMEOUT_MS = 1000;

/** performance mark suffix -> call_timings field; "+" = an extra (telemetry's own marks). */
const TIMING_MARKS = table(`
  answer-called             answer_called_ms
  new-peer                  peer_created_ms
  get-user-media            media_devices_acquired_ms
  peer-creation-end         peer_setup_complete_ms
  start-negotiation         sdp_negotiation_started_ms
  create-offer              sdp_local_created_ms
  create-answer             sdp_local_created_ms
  set-local-description     local_description_applied_ms
  ice-gathering-started     ice_gathering_started_ms
  send-sdp                  sdp_sent_ms
  first-candidate           first_ice_candidate_ms
  first-non-host-candidate  first_srflx_or_relay_candidate_ms
  ice-gathering-completed   all_ice_candidates_gathered_ms
  ringing                   remote_ringing_ms
  telnyx-rtc-media          early_media_ms
  telnyx-rtc-answer         remote_answered_ms
  first-remote-media-track  first_remote_track_ms
  set-remote-description    remote_description_applied_ms
  call-active               call_active_ms
  ice-connected             ice_connected_ms
  dtls-connected            dtls_connected_ms
  cr2-ice-checking          ice_checking_ms     +
  cr2-peer-connecting       peer_connecting_ms  +
`);

/** Media snapshot groups: a change in any of a group's fields names the group in `changed`. */
const MEDIA_GROUPS = table(`
  codec           codec_in codec_out target_bitrate_bps
  candidate_pair  local_candidate remote_candidate
  ice_state       ice_state ice_role
  dtls_state      dtls_state srtp_cipher dtls_version dtls_role dtls_cipher local_certificate_algorithm remote_certificate_algorithm
  sending         sending
  input_device    input_device input_device_count
  output_device   output_device_label output_device_id output_device_count
  echo            echo_return_loss_db echo_return_loss_enhancement_db
  peer_state      peer pair_state pair_nominated
  configuration   peer_configuration
  rtp_parameters  send_parameters receive_parameters transceiver_direction transceiver_current_direction mid ssrc_in ssrc_out
  remote_track    remote_track
  playback        playback
`);

const nowPerf = (): number =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();

/** Milliseconds since `from` (performance clock), 0.1 ms precision. */
const since = (from: number, to = nowPerf()) =>
  round(Math.max(0, to - from), 1);

type ParsedCandidate = IceCandidate & { component: 'rtp' | 'rtcp' };

/**
 * An ICE candidate line ("candidate:..." with or without "a="): the
 * contract's fields, the extras, and the ufrag (generation tracking only,
 * never sent). raddr/rport are never sent (owner, 2026-10-06).
 */
export function parseCandidateLine(
  line: string
): { candidate: ParsedCandidate; extra: Flat; ufrag?: string } | null {
  const parts = (line || '')
    .trim()
    .replace(/^a=/, '')
    .replace(/^candidate:/, '')
    .split(/\s+/);
  if (parts.length < 8) return null;
  const [foundation, component, protocol, priority, address, port] = parts;
  const attrs: Record<string, string> = {};
  for (let i = 6; i + 1 < parts.length; i += 2) attrs[parts[i]] = parts[i + 1];
  const proto = protocol.toLowerCase();
  const type = attrs.typ as IceCandidate['candidate_type'];
  if (!words('host srflx prflx relay').includes(type)) return null;
  if (proto !== 'udp' && proto !== 'tcp') return null;
  const number = (value?: string) =>
    value !== undefined && Number.isFinite(Number(value))
      ? Number(value)
      : undefined;
  return {
    candidate: {
      candidate_type: type,
      protocol: proto,
      component: component === '2' ? 'rtcp' : 'rtp',
      ...defined({
        foundation: foundation || undefined,
        priority: number(priority),
        address: address || undefined,
        port: number(port),
        tcp_type: TCP_TYPES.includes(attrs.tcptype)
          ? (attrs.tcptype as IceCandidate['tcp_type'])
          : undefined,
      }),
    },
    extra: defined({
      candidate_generation: number(attrs.generation),
      network_id: number(attrs['network-id']),
      network_cost: number(attrs['network-cost']),
    }),
    ufrag: attrs.ufrag,
  };
}

export function mapEndReason(input: {
  initiator?: string;
  execute: boolean;
  recovering: boolean;
  answered: boolean;
  direction: 'inbound' | 'outbound';
  cause?: string;
  sipCode?: number;
}): CallEndReason {
  const { initiator, answered, cause, sipCode } = input;
  if (input.recovering) return 'network_lost';
  // hangup({}, false) without an initiator: the SDK lost the session.
  if (!initiator) return input.execute ? 'unknown' : 'network_lost';
  if (initiator.startsWith('remote:')) {
    if (answered) return 'remote_hangup';
    if (words('USER_BUSY CALL_REJECTED_BUSY').includes(cause)) return 'busy';
    if (sipCode === 486 || sipCode === 600) return 'busy';
    if (
      words('NO_ANSWER NO_USER_RESPONSE ORIGINATOR_CANCEL_TIMEOUT').includes(
        cause
      )
    ) {
      return 'no_answer';
    }
    return sipCode === 480 || sipCode === 408 ? 'no_answer' : 'remote_hangup';
  }
  if (initiator === 'sdk:server-disconnect') return 'network_lost';
  if (
    initiator.startsWith('app:') ||
    initiator === 'sdk:beforeunload' ||
    initiator === 'sdk:screenshare-track-ended'
  ) {
    if (answered) return 'local_hangup';
    return input.direction === 'inbound' ? 'rejected' : 'cancelled';
  }
  return initiator.startsWith('sdk:') ? 'failed' : 'unknown';
}

export default class CallTelemetry {
  /** The newest recorder per call ID: a reattach builds a new call with the same ID. */
  private static _latest = new Map<string, CallTelemetry>();

  private readonly _startedAt = Date.now();
  private readonly _startedPerf = nowPerf();
  private readonly _direction: 'inbound' | 'outbound';
  private _telnyxIds: Partial<KnownIds> = {};
  private _lastState: CallState = 'new';
  private _lastStatePerf: number | null = null;
  private _lastEmittedState: CallState | null = null;
  private _frozenLastState: CallState | null = null;
  private _answered = false;
  private _activeAtPerf: number | null = null;
  private _ended = false;
  private _endPromise: Promise<void> | null = null;
  private _hangup: {
    initiator?: string;
    execute: boolean;
    recovering: boolean;
  } | null = null;
  private _hangupPeer: Flat | undefined;
  private _finalStats: Promise<StatsSnapshot | null> | null = null;

  private _pc: RTCPeerConnection | null = null;
  private _pcCleanup: Array<() => void> = [];
  private _timer: Any = null;
  private _inFlight = false;
  private _prevSnapshot: StatsSnapshot | null = null;
  private _carried: Record<string, number> = {};
  private _countersReset = false;
  private _lastTickPerf = 0;
  private _metricsSamples = 0;
  private _rttSamples: number[] = [];
  private _pairIds = new Set<string>();
  private _peerConnections = 0;
  private _statsFailures = 0;
  private _localCandidates = 0;
  private _remoteCandidates = 0;

  private _lastMedia: Flat | null = null;
  private _inputCount?: number;
  private _outputCount?: number;
  private _outputLabels: Record<string, string> = {};
  private _deviceCleanup: (() => void) | null = null;
  private _devicesReady: Promise<void> | null = null;

  private _iceGeneration = 1;
  private _localUfrag: string | null = null;
  private _gatheringStartedPerf: number | null = null;
  private _remoteDescriptionPerf: number | null = null;
  private _isLocalCandidateSignaled: () => boolean = () => true;

  private _marks: Record<string, number> = {};
  private _stopObservingMarks: (() => void) | null = null;
  private _dtlsConnected = false;
  private _timingsSent = false;
  private _firstPacketPerf: number | null = null;
  private _firstPacketSentPerf: number | null = null;

  /** null when telemetry is off: the call then does nothing for telemetry. */
  static create(
    call: CallHost,
    session: SessionTelemetry | null | undefined
  ): CallTelemetry | null {
    return (session && attempt(() => new CallTelemetry(call, session))) || null;
  }

  constructor(
    private readonly _call: CallHost,
    private readonly _session: SessionTelemetry
  ) {
    const options = _call.options || {};
    this._direction =
      options.remoteSdp || options.attach ? 'inbound' : 'outbound';
    guard(this);
  }

  private _emit<N extends EventName>(
    name: N,
    payload: PayloadOf<N>,
    timestamp?: number
  ) {
    // The Telnyx IDs are constant per call: never on call_metrics.
    const telnyx = name === 'call_metrics' ? {} : this._telnyxIds;
    const ids = { call_id: this._call.id, ...telnyx };
    const at = timestamp !== undefined ? { timestamp } : {};
    return attempt(() =>
      this._session.client.emit(name, payload, { ids, ...at })
    );
  }

  // ── call_started and call_state ──────────────────────────────────────

  start(): void {
    CallTelemetry._latest.set(this._call.id, this);
    this._session.client.callStarted(this._call.id);
    this._stopObservingMarks = this._session.config.observeCallMarks(
      this._call.id,
      (marks) => this._mergeMarks(marks)
    );
    this._emit('call_started', this._buildStarted(), this._startedAt);
  }

  private _buildStarted(): PayloadOf<'call_started'> {
    const options = this._call.options || {};
    const session = this._session.session as Any;
    const inbound = this._direction === 'inbound';
    const iceServers: RTCIceServer[] = Array.isArray(options.iceServers)
      ? options.iceServers
      : [];
    const appIceServers = session.options?.iceServers;
    const headers: Any[] = Array.isArray(options.customHeaders)
      ? options.customHeaders
      : [];
    const codecs: Any[] = Array.isArray(options.preferred_codecs)
      ? options.preferred_codecs
      : [];
    const useSdpAs = !!options.mediaSettings?.useSdpASBandwidthKbps;
    const raw: Flat = { ...options, remoteSdp: undefined, localSdp: undefined };
    // A header that carries a credential (by its name) keeps its name only.
    if (Array.isArray(options.customHeaders)) {
      raw.customHeaders = headers.map((h) =>
        h && CREDENTIAL_HEADER.test(String(h.name ?? ''))
          ? { ...h, value: '[REDACTED]' }
          : h
      );
    }
    const servers = attempt(() => toIceServerInfo(iceServers));
    // true/false, or the MediaTrackConstraints the app gave.
    const media = (value: unknown, fallback: boolean) =>
      value && typeof value === 'object'
        ? (attempt(() => sanitizeDetails(value)) ?? true)
        : fallback;
    return {
      options: this._startedOptions(
        options,
        session,
        inbound,
        iceServers,
        appIceServers,
        headers,
        codecs,
        useSdpAs,
        media
      ),
      // The SDPs are whole in signaling_message.
      raw_call_options: attempt(() => sanitizeDetails(raw)) ?? {},
      extra: defined({
        ice_servers: servers?.length ? servers : undefined,
        online: onlineNow(),
        visibility_state: visibilityNow(),
        has_focus: hasFocusNow(),
      }),
    };
  }

  private _startedOptions(
    options: Any,
    session: Any,
    inbound: boolean,
    iceServers: RTCIceServer[],
    appIceServers: unknown,
    headers: Any[],
    codecs: Any[],
    useSdpAs: boolean,
    media: (value: unknown, fallback: boolean) => boolean | Flat
  ): CallOptions {
    return {
      direction: this._direction,
      audio: media(options.audio, options.audio !== false),
      video: media(options.video, !!options.video),
      trickle_ice: !!options.trickleIce,
      force_relay_candidate: options.forceRelayCandidate ?? false,
      prefetch_ice_candidates: options.prefetchIceCandidates ?? false,
      keep_connection_alive_on_socket_close:
        options.keepConnectionAliveOnSocketClose ??
        session.options?.keepConnectionAliveOnSocketClose ??
        false,
      // The app's own servers, for the client or this call (not the SDK's defaults).
      custom_ice_servers:
        (Array.isArray(appIceServers) && appIceServers.length > 0) ||
        (iceServers.length > 0 && iceServers !== session.iceServers),
      ice_servers_count: iceServers.length,
      use_stereo: !!options.useStereo,
      use_sdp_as_bandwidth: useSdpAs,
      remote_element_provided: !!options.remoteElement,
      local_element_provided: !!options.localElement,
      mic_id_provided: !!options.micId,
      speaker_id_provided: !!options.speakerId,
      camera_id_provided: !!options.camId,
      is_reattach: options.attach === true || !!options.recoveredCallId,
      ...defined({
        caller_number: str(
          inbound ? options.remoteCallerNumber : options.callerNumber
        ),
        caller_name: str(
          inbound ? options.remoteCallerName : options.callerName
        ),
        destination_number:
          typeof options.destinationNumber === 'string'
            ? options.destinationNumber
            : undefined,
        sdp_as_bandwidth_kbps: useSdpAs
          ? num(options.mediaSettings?.sdpASBandwidthKbps)
          : undefined,
        preferred_codecs: codecs.length
          ? codecs
              .filter((codec) => codec && codec.mimeType)
              .map((c) =>
                [c.mimeType, c.clockRate, c.channels > 1 ? c.channels : null]
                  .filter((part) => part !== null && part !== undefined)
                  .join('/')
              )
          : undefined,
        custom_header_names: headers.length
          ? headers.map((h) => h?.name).filter((name) => str(name))
          : undefined,
      }),
    };
  }

  onState(state: string, previousState: string): void {
    if (this._ended) return;
    const options = this._call.options || {};
    this._telnyxIds.telnyx_leg_id ||= options.telnyxLegId || undefined;
    this._telnyxIds.telnyx_session_id ||= options.telnyxSessionId || undefined;
    const now = nowPerf();
    const extra: Flat = {
      since_call_started_ms: since(this._startedPerf, now),
    };
    if (this._lastStatePerf !== null) {
      extra.since_previous_state_ms = since(this._lastStatePerf, now);
    }
    this._lastStatePerf = now;
    const peer = readPeerStates(this._pc);
    if (peer) extra.peer = peer;
    // Always when known, also for a repeated state: a lost call_state shows.
    const previous = (previousState || this._lastEmittedState) as CallState;
    this._lastEmittedState = state as CallState;
    if (!words('hangup destroy purge recovering').includes(state)) {
      this._lastState = state as CallState;
    }
    if (state === 'active') {
      this._answered = true;
      this._activeAtPerf ??= nowPerf();
    }
    if (state === 'hangup' || state === 'purge') this._freezeLastState();
    this._emit('call_state', {
      state: state as CallState,
      ...(previous ? { previous_state: previous } : {}),
      extra,
    });
  }

  /** After the SDK handled the state (marks set): the timings may be complete. */
  afterState(state: string): void {
    if (state === 'active') this._maybeSendTimings();
  }

  private _freezeLastState(): void {
    this._frozenLastState ??= this._lastState;
  }

  // ── Peer connection: ICE candidates, DTLS, metrics loop ──────────────

  /** Hooks the Peer calls. */
  peerHooks() {
    return {
      onRemoteDescription: (sdp: string) => this.onRemoteSdp(sdp),
      onError: (error: unknown) => this.onError(error),
    };
  }

  /** A new RTCPeerConnection: own listeners (the SDK drops its icecandidate one early). */
  attachPeer(
    pc: RTCPeerConnection,
    isLocalCandidateSignaled?: () => boolean
  ): void {
    if (this._ended || !pc) return;
    if (isLocalCandidateSignaled) {
      this._isLocalCandidateSignaled = isLocalCandidateSignaled;
    }
    if (this._pc && this._pc !== pc) {
      // Replaced: its counters go into the totals; deltas restart.
      for (const [key, value] of Object.entries(this._prevSnapshot?.n ?? {})) {
        if (isCarriedKey(key))
          this._carried[key] = (this._carried[key] ?? 0) + value;
      }
      this._prevSnapshot = null;
      this._countersReset = true;
    }
    this._detachPeer();
    if (this._pc !== pc) this._peerConnections += 1;
    this._pc = pc;
    this._dtlsConnected = pc.connectionState === 'connected';
    const listen = (type: string, handler: (event: Any) => void) => {
      pc.addEventListener?.(type, handler);
      this._pcCleanup.push(() => pc.removeEventListener?.(type, handler));
    };
    listen('icecandidate', (event) =>
      attempt(() => this._onLocalCandidate(event))
    );
    listen('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'gathering')
        this._gatheringStartedPerf = nowPerf();
    });
    listen('connectionstatechange', () => {
      if (pc.connectionState === 'connecting')
        this._mark('cr2-peer-connecting');
      if (pc.connectionState === 'connected') {
        this._dtlsConnected = true;
        this._maybeSendTimings();
      }
    });
    listen('iceconnectionstatechange', () => {
      if (pc.iceConnectionState === 'checking') this._mark('cr2-ice-checking');
    });
    this._maybeSendTimings();
    this._lastTickPerf = nowPerf();
    this._timer = setInterval(() => void this._tick(), METRICS_INTERVAL_MS);
    this._watchDevices();
  }

  private _detachPeer(): void {
    clearInterval(this._timer);
    this._timer = null;
    this._pcCleanup.splice(0).forEach((cleanup) => attempt(cleanup));
  }

  private _onLocalCandidate(event: Any): void {
    const candidate = event?.candidate;
    const parsed =
      candidate?.candidate && parseCandidateLine(candidate.candidate);
    if (!parsed) return;
    const { ufrag } = parsed;
    if (ufrag) {
      if (this._localUfrag && ufrag !== this._localUfrag)
        this._iceGeneration += 1;
      this._localUfrag = ufrag;
    }
    const relay = String(candidate.relayProtocol || '').toLowerCase();
    const signaled = attempt(this._isLocalCandidateSignaled) ?? true;
    const payload: PayloadOf<'ice_candidate'> = {
      ...parsed.candidate,
      ...defined({
        url: str(candidate.url) ?? str(event.url),
        relay_protocol: RELAY_PROTOCOLS.includes(relay)
          ? (relay as IceCandidate['relay_protocol'])
          : undefined,
      }),
      side: 'local',
      ice_generation: this._iceGeneration,
      signaled,
      ...(this._gatheringStartedPerf !== null
        ? { since_gathering_started_ms: since(this._gatheringStartedPerf) }
        : {}),
      extra: {
        ...parsed.extra,
        ...defined({
          sdp_mid: str(candidate.sdpMid),
          sdp_m_line_index: num(candidate.sdpMLineIndex),
          ice_gathering_state: attempt(() => str(this._pc?.iceGatheringState)),
        }),
      },
    };
    if (this._emit('ice_candidate', payload)) this._localCandidates += 1;
  }

  /** The remote SDP was applied: one ice_candidate per a=candidate line. */
  onRemoteSdp(sdp: string): void {
    if (this._ended) return;
    this._remoteDescriptionPerf = nowPerf();
    for (const line of String(sdp || '').split(/\r?\n/)) {
      if (line.startsWith('a=candidate:')) this._emitRemote(line, 0);
    }
  }

  /** A trickle telnyx_rtc.candidate frame. */
  onRemoteCandidate(params: Any): void {
    const line = params?.candidate;
    if (this._ended || typeof line !== 'string' || !line) return;
    const started = this._remoteDescriptionPerf;
    this._emitRemote(
      line,
      started !== null ? since(started) : undefined,
      params
    );
  }

  private _emitRemote(
    line: string,
    sinceMs: number | undefined,
    params?: Any
  ): void {
    const parsed = parseCandidateLine(line);
    if (!parsed) return;
    const payload: PayloadOf<'ice_candidate'> = {
      ...parsed.candidate,
      side: 'remote',
      ice_generation: this._iceGeneration,
      ...(sinceMs !== undefined ? { since_gathering_started_ms: sinceMs } : {}),
      extra: {
        ...parsed.extra,
        ...defined({
          sdp_mid: str(params?.sdpMid),
          sdp_m_line_index: num(params?.sdpMLineIndex),
        }),
      },
    };
    if (this._emit('ice_candidate', payload)) this._remoteCandidates += 1;
  }

  // ── Media snapshot ───────────────────────────────────────────────────

  private _watchDevices(): void {
    if (this._deviceCleanup) return;
    const media =
      typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (typeof media?.enumerateDevices !== 'function') return;
    const refresh = () =>
      Promise.resolve(media.enumerateDevices())
        .then((devices) => {
          if (!Array.isArray(devices)) return;
          const outputs = devices.filter((d) => d.kind === 'audiooutput');
          this._inputCount = devices.filter(
            (d) => d.kind === 'audioinput'
          ).length;
          this._outputCount = outputs.length;
          this._outputLabels = {};
          for (const d of outputs)
            if (d.label) this._outputLabels[d.deviceId] = d.label;
        })
        .catch(() => undefined);
    // The first media snapshot waits for the device counts.
    this._devicesReady = refresh();
    media.addEventListener?.('devicechange', refresh);
    this._deviceCleanup = () =>
      media.removeEventListener?.('devicechange', refresh);
  }

  private _micTrack(): Any {
    return attempt(
      () => this._call.options?.localStream?.getAudioTracks?.()[0]
    );
  }

  private _inputDevice(): Flat | undefined {
    const track = this._call.options?.localStream?.getAudioTracks?.()[0];
    if (!track) return undefined;
    const settings: Any = track.getSettings?.() ?? {};
    return {
      label: stripDeviceLabel(track.label),
      enabled: track.enabled,
      muted: track.muted,
      ready_state: track.readyState === 'ended' ? 'ended' : 'live',
      ...defined({
        auto_gain_control: bool(settings.autoGainControl),
        echo_cancellation: bool(settings.echoCancellation),
        noise_suppression: bool(settings.noiseSuppression),
        sample_rate: num(settings.sampleRate),
        sample_size: num(settings.sampleSize),
        channel_count: num(settings.channelCount),
        latency_ms:
          num(settings.latency) !== undefined
            ? round(settings.latency * 1000, 1)
            : undefined,
        device_id: str(settings.deviceId),
        group_id: str(settings.groupId),
        voice_isolation: bool(settings.voiceIsolation),
        content_hint: attempt(() =>
          typeof track.contentHint === 'string' ? track.contentHint : undefined
        ),
        settings: cleanObject(settings),
        constraints: cleanObject(attempt(() => track.getConstraints?.())),
        capabilities: cleanObject(attempt(() => track.getCapabilities?.())),
      }),
    };
  }

  private _mediaSnapshot(snapshot: StatsSnapshot): Flat {
    const options = this._call.options;
    const { media } = snapshot;
    const iceState = media.ice_state ?? this._pc?.iceConnectionState;
    const transceiver: Any = attempt(() => {
      const all: Any[] = this._pc?.getTransceivers?.() ?? [];
      const isAudio = (t: Any) =>
        t.receiver?.track?.kind === 'audio' ||
        t.sender?.track?.kind === 'audio';
      return all.find(isAudio) ?? all[0];
    });
    const speakerId = options?.speakerId || 'default';
    const label = this._outputLabels[speakerId];
    return defined({
      ...media,
      ice_state: ICE_STATES.includes(iceState as string) ? iceState : undefined,
      input_device: this._inputDevice(),
      output_device_label: label ? stripDeviceLabel(label) : undefined,
      input_device_count: this._inputCount,
      output_device_count: this._outputCount,
      peer: readPeerStates(this._pc),
      peer_configuration: readPeerConfiguration(this._pc),
      send_parameters: readRtpParameters(transceiver?.sender),
      receive_parameters: readRtpParameters(transceiver?.receiver),
      transceiver_direction: attempt(() => str(transceiver?.direction)),
      transceiver_current_direction: attempt(() =>
        str(transceiver?.currentDirection)
      ),
      mid: media.mid ?? attempt(() => str(transceiver?.mid)),
      output_device_id: speakerId,
      remote_track: attempt(() => {
        const track =
          transceiver?.receiver?.track ??
          options?.remoteStream?.getAudioTracks?.()[0];
        if (!track) return undefined;
        const { enabled, muted } = track;
        return {
          enabled,
          muted,
          ready_state: track.readyState === 'ended' ? 'ended' : 'live',
        };
      }),
      playback: attempt(() => {
        const element: Any = resolveMediaElement(options?.remoteElement);
        if (!element) return undefined;
        return {
          paused: !!element.paused,
          muted: !!element.muted,
          volume: num(element.volume) ?? 1,
          has_stream: !!element.srcObject,
          ...defined({
            sink_id:
              typeof element.sinkId === 'string' ? element.sinkId : undefined,
            ready_state: num(element.readyState),
          }),
        };
      }),
    });
  }

  private _checkMedia(snapshot: StatsSnapshot, timestamp: number): void {
    const media = this._mediaSnapshot(snapshot);
    const previous = this._lastMedia;
    let changed = ['initial'];
    if (previous) {
      const differs = (key: string) =>
        JSON.stringify(media[key]) !== JSON.stringify(previous[key]);
      changed = MEDIA_GROUPS.filter(([, ...keys]) => keys.some(differs)).map(
        ([group]) => group
      );
      // The pair can change and change back within one tick: the counter still went up.
      const [before, after] = [previous.pair_changes, media.pair_changes];
      if (
        !changed.includes('candidate_pair') &&
        typeof before === 'number' &&
        typeof after === 'number' &&
        after > before
      ) {
        changed.push('candidate_pair');
      }
      if (!changed.length) return;
    }
    const pairChanged = !!previous && changed.includes('candidate_pair');
    const [payload, extra] = splitMedia({
      changed,
      ...media,
      ...(pairChanged
        ? defined({
            previous_local_candidate: previous.local_candidate,
            previous_remote_candidate: previous.remote_candidate,
          })
        : {}),
    });
    this._lastMedia = media;
    const body = { ...payload, ...(extra ? { extra } : {}) };
    this._emit(
      'call_media_changed',
      body as PayloadOf<'call_media_changed'>,
      timestamp
    );
  }

  /** One metrics interval. Public for tests. */
  async _tick(): Promise<void> {
    const pc = this._pc;
    if (this._ended || this._inFlight || !pc) return;
    if (pc.connectionState === 'closed' || pc.signalingState === 'closed') {
      return this._detachPeer();
    }
    this._inFlight = true;
    try {
      if (this._devicesReady) await this._devicesReady;
      const report = await pc.getStats();
      if (this._ended || pc !== this._pc) return;
      const timestamp = Date.now();
      const perf = nowPerf();
      const snapshot = extractStats(report);
      addTrackStats(snapshot, this._micTrack());
      const metrics = buildMetrics(
        this._prevSnapshot,
        snapshot,
        perf - this._lastTickPerf,
        this._countersReset
      );
      this._lastTickPerf = perf;
      this._countersReset = false;
      this._prevSnapshot = snapshot;
      if (snapshot.pairId) this._pairIds.add(snapshot.pairId);
      if (metrics.rtt_ms !== undefined) this._rttSamples.push(metrics.rtt_ms);
      if ((metrics.in_packets ?? 0) > 0) this._firstPacketPerf ??= perf;
      if ((metrics.out_packets ?? 0) > 0) this._firstPacketSentPerf ??= perf;
      this._checkMedia(snapshot, timestamp);
      if (this._emit('call_metrics', metrics, timestamp))
        this._metricsSamples += 1;
    } catch {
      this._statsFailures += 1; // a failed getStats() loses this interval only
    } finally {
      this._inFlight = false;
    }
  }

  // ── call_warning, error, call_timings ────────────────────────────────

  onWarning(
    warning: { code: number; name?: string; message?: string },
    details?: WarningDetails
  ): void {
    if (this._ended || !warning) return;
    const code = Number(warning.code);
    const known = (WARNING_CODES as Record<number, string>)[code];
    this._emit('call_warning', {
      code,
      name: known ?? String(warning.name || code).toLowerCase(),
      ...defined({
        metric: details?.metric || undefined,
        value:
          num(details?.value) !== undefined
            ? round(details.value, 4)
            : undefined,
        threshold: num(details?.threshold),
      }),
      extra: defined({
        sdk_name: str(warning.name),
        message: str(warning.message),
        since_call_started_ms: since(this._startedPerf),
      }),
    });
  }

  /** A call or media error: media = the 420xx device/getUserMedia codes. */
  onError(
    error: unknown,
    fallbackCode: string | number = 49000,
    details?: Flat
  ): void {
    const info = toCodedErrorInfo(error, fallbackCode);
    const fatal = (error as Any)?.fatal;
    this._emit('error', {
      stage: /^42\d{3}$/.test(info.code) ? 'media' : 'call',
      error: info,
      is_fatal: typeof fatal === 'boolean' ? fatal : false,
      ...(details ? { details } : {}),
      extra: {
        ...defined({ online: onlineNow(), visibility_state: visibilityNow() }),
        call_state: this._lastEmittedState ?? this._lastState,
      },
    });
  }

  private _mark(suffix: string): void {
    this._marks[suffix] ??= nowPerf();
  }

  private _mergeMarks(marks: Record<string, number>): void {
    for (const [suffix, time] of Object.entries(marks))
      this._marks[suffix] ??= time;
  }

  /** Once the call is active and DTLS connected, whichever comes last. */
  private _maybeSendTimings(): void {
    if (this._timingsSent || this._ended) return;
    if (this._dtlsConnected && this._activeAtPerf !== null)
      this._sendTimings(true);
  }

  private _sendTimings(complete: boolean): void {
    if (this._timingsSent) return;
    this._timingsSent = true;
    attempt(() => {
      this._mergeMarks(this._session.config.readCallMarks(this._call.id));
      const payload: Flat = { complete };
      const extra: Flat = {};
      for (const [suffix, field, isExtra] of TIMING_MARKS) {
        const target = isExtra ? extra : payload;
        const time = this._marks[suffix];
        if (time !== undefined && target[field] === undefined) {
          target[field] = since(this._startedPerf, time);
        }
      }
      if (this._firstPacketPerf !== null) {
        payload.first_packet_received_ms = since(
          this._startedPerf,
          this._firstPacketPerf
        );
      }
      if (this._firstPacketSentPerf !== null) {
        extra.first_packet_sent_ms = since(
          this._startedPerf,
          this._firstPacketSentPerf
        );
      }
      this._emit('call_timings', {
        ...payload,
        extra,
      } as PayloadOf<'call_timings'>);
    });
  }

  // ── call_ended ───────────────────────────────────────────────────────

  /** hangup() entered: freezes the state before hangup and takes the final getStats(). */
  noteHangup(
    initiator: string | undefined,
    execute: boolean,
    recovering: boolean
  ): void {
    if (this._ended) return;
    if (!this._hangup) {
      this._hangup = { initiator, execute, recovering };
      this._hangupPeer = readPeerStates(this._pc);
    }
    this._freezeLastState();
    this._startFinalStats();
  }

  private _startFinalStats(): void {
    if (this._finalStats) return;
    const pc = this._pc;
    if (
      !pc ||
      pc.connectionState === 'closed' ||
      typeof pc.getStats !== 'function'
    ) {
      this._finalStats = Promise.resolve(null);
      return;
    }
    // getStats() now, before the SDK closes the connection.
    const micTrack = this._micTrack();
    const stats =
      attempt(() =>
        Promise.resolve(pc.getStats())
          .then((report) => {
            const snapshot = extractStats(report);
            addTrackStats(snapshot, micTrack);
            return snapshot;
          })
          .catch((): null => null)
      ) ?? Promise.resolve(null);
    let timer: Any = null;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), FINAL_STATS_TIMEOUT_MS);
    });
    this._finalStats = Promise.race([stats, timeout]).finally(() =>
      clearTimeout(timer)
    );
  }

  /** The call object is destroyed: stops everything, then call_timings (if never sent) and call_ended. */
  end(): Promise<void> {
    if (this._endPromise) return this._endPromise;
    this._ended = true;
    attempt(() => {
      this._freezeLastState();
      this._startFinalStats();
      this._detachPeer();
      this._deviceCleanup?.();
      this._deviceCleanup = null;
      this._stopObservingMarks?.();
      this._stopObservingMarks = null;
      // The marks still exist (cleared right after this hook).
      this._mergeMarks(this._session.config.readCallMarks(this._call.id));
    });
    const endedAt = Date.now();
    const endedPerf = nowPerf();
    const release = () =>
      attempt(() => {
        if (CallTelemetry._latest.get(this._call.id) !== this) return;
        CallTelemetry._latest.delete(this._call.id);
        this._session.client.callEnded(this._call.id);
      });
    this._endPromise = (this._finalStats ?? Promise.resolve(null))
      .catch((): null => null)
      .then((final) => {
        attempt(() => {
          this._sendTimings(false);
          this._emit(
            'call_ended',
            this._buildEnded(final, endedAt, endedPerf),
            endedAt
          );
        });
        release(); // at once after call_ended (2.1): nothing later carries its ID
      })
      .finally(release);
    return this._endPromise;
  }

  private _buildEnded(
    final: StatsSnapshot | null,
    endedAt: number,
    endedPerf: number
  ): PayloadOf<'call_ended'> {
    const finalUsed = !!final && Object.keys(final.n).length > 0;
    const hangup = this._hangup ?? { execute: true, recovering: false };
    const call = this._call;
    const code = (value: unknown) =>
      value !== null && value !== undefined ? num(Number(value)) : undefined;
    const [totals, totalsExtra] = buildTotals(
      finalUsed ? final : this._prevSnapshot,
      this._carried,
      this._rttSamples,
      this._pairIds.size
    );
    return {
      end_reason: mapEndReason({
        ...hangup,
        answered: this._answered,
        direction: this._direction,
        cause: call.cause,
        sipCode: num(Number(call.sipCode)) || undefined,
      }),
      last_state: this._frozenLastState ?? this._lastState,
      answered: this._answered,
      duration_ms: Math.max(0, endedAt - this._startedAt),
      metrics_samples: this._metricsSamples,
      totals,
      ...defined({
        cause: str(call.cause),
        cause_code: code(call.causeCode),
        sip_code: code(call.sipCode),
        sip_reason: str(call.sipReason),
        talk_ms:
          this._activeAtPerf !== null
            ? Math.max(0, Math.round(endedPerf - this._activeAtPerf))
            : undefined,
      }),
      extra: {
        ...defined({
          totals: totalsExtra,
          hangup_initiator: str(hangup.initiator),
          sip_call_id: str(call.sipCallId),
          peer: this._hangupPeer,
        }),
        peer_connections: this._peerConnections,
        ice_restarts: Math.max(0, this._iceGeneration - 1),
        local_candidates: this._localCandidates,
        remote_candidates: this._remoteCandidates,
        stats_failures: this._statsFailures,
        final_stats: finalUsed,
      },
    };
  }
}
