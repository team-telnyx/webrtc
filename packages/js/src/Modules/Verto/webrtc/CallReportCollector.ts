/**
 * CallReportCollector
 *
 * Collects WebRTC statistics during a call and posts them to voice-sdk-proxy
 * at the end of the call for quality analysis and debugging.
 *
 * Stats Collection Strategy (based on Twilio/Jitsi best practices):
 * - Collects stats at regular intervals (default 5 seconds)
 * - Stores cumulative values (packets, bytes) from WebRTC API
 * - Calculates averages for variable metrics (audio level, jitter, RTT)
 * - Uses in-memory buffer with size limits for long calls
 * - Posts aggregated stats to voice-sdk-proxy on call end
 */

import logger from '../../../Modules/Verto/util/logger';
import {
  LogCollector,
  ILogEntry,
  createLogCollector,
  setGlobalLogCollector,
  getGlobalLogCollector,
} from '../../../Modules/Verto/util/LogCollector';
import {
  SilenceDetector,
  SilenceEvent,
} from './SilenceDetector';

/**
 * Extended RTCInboundRtpStreamStats with additional audio quality metrics
 * not yet in the standard TypeScript definitions
 */
interface ExtendedInboundRtpStreamStats extends RTCInboundRtpStreamStats {
  trackId?: string;
  bytesReceived?: number;
  packetsDiscarded?: number;
  jitterBufferDelay?: number;
  jitterBufferEmittedCount?: number;
  totalSamplesReceived?: number;
  concealedSamples?: number;
  concealmentEvents?: number;
  audioLevel?: number;
  /** Cumulative audio energy (sum of squared samples) — available without RTP header extension */
  totalAudioEnergy?: number;
  /** Cumulative duration of received audio in seconds */
  totalSamplesDuration?: number;
}

/**
 * Extended RTCOutboundRtpStreamStats
 */
interface ExtendedOutboundRtpStreamStats extends RTCOutboundRtpStreamStats {
  trackId?: string;
  mediaSourceId?: string;
}

/**
 * Extended RTCAudioSourceStats (type: 'media-source', kind: 'audio')
 * Available in Chrome 96+ via outbound-rtp.mediaSourceId
 */
interface ExtendedMediaSourceStats {
  type: string;
  kind?: string;
  audioLevel?: number;
  totalAudioEnergy?: number;
  totalSamplesDuration?: number;
}

/**
 * Extended transport stats from getStats() 'transport' type
 */
interface ExtendedTransportStats {
  type: string;
  id: string;
  iceState?: string; // new | checking | connected | completed | disconnected | failed | closed
  dtlsState?: string; // new | connecting | connected | closed | failed
  srtpCipher?: string; // e.g. AES_CM_128_HMAC_SHA1_80
  tlsVersion?: string; // e.g. FEFD (DTLS 1.2)
  selectedCandidatePairChanges?: number;
  selectedCandidatePairId?: string;
}

/**
 * Extended RTCIceCandidatePairStats
 */
interface ExtendedCandidatePairStats extends RTCIceCandidatePairStats {
  packetsSent?: number;
  packetsReceived?: number;
  bytesSent?: number;
  bytesReceived?: number;
  requestsSent?: number;
  responsesReceived?: number;
  writable?: boolean;
}

/**
 * ICE candidate info extracted from local-candidate / remote-candidate stats
 */
interface ICECandidateInfo {
  address?: string;
  port?: number;
  candidateType?: string; // host | srflx | prflx | relay
  protocol?: string; // udp | tcp
  networkType?: string; // wifi | cellular | ethernet | vpn | unknown
}

/**
 * ICE candidate pair snapshot for a stats interval
 */
export interface IICECandidatePair {
  id?: string;
  state?: string; // frozen | waiting | in-progress | failed | succeeded
  nominated?: boolean;
  writable?: boolean;
  local?: ICECandidateInfo;
  remote?: ICECandidateInfo;
  requestsSent?: number;
  responsesReceived?: number;
}

/**
 * Transport-level stats snapshot for a stats interval
 */
export interface ITransportStats {
  iceState?: string;
  dtlsState?: string;
  srtpCipher?: string;
  tlsVersion?: string;
  selectedCandidatePairChanges?: number;
}

export interface ICallReportOptions {
  enabled: boolean;
  interval: number;
}

export interface ILogCollectorOptions {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  maxEntries: number;
}

export interface IStatsInterval {
  intervalStartUtc: string;
  intervalEndUtc: string;
  audio?: {
    outbound?: {
      packetsSent?: number;
      bytesSent?: number;
      audioLevelAvg?: number;
      bitrateAvg?: number;
    };
    inbound?: {
      packetsReceived?: number;
      bytesReceived?: number;
      packetsLost?: number;
      packetsDiscarded?: number;
      jitterBufferDelay?: number;
      jitterBufferEmittedCount?: number;
      totalSamplesReceived?: number;
      concealedSamples?: number;
      concealmentEvents?: number;
      audioLevelAvg?: number;
      jitterAvg?: number;
      bitrateAvg?: number;
    };
  };
  connection?: {
    roundTripTimeAvg?: number;
    packetsSent?: number;
    packetsReceived?: number;
    bytesSent?: number;
    bytesReceived?: number;
  };
  ice?: IICECandidatePair;
  transport?: ITransportStats;
}

export interface ICallSummary {
  callId: string;
  destinationNumber?: string;
  callerNumber?: string;
  direction?: 'inbound' | 'outbound';
  state?: string;
  durationSeconds?: number;
  telnyxSessionId?: string;
  telnyxLegId?: string;
  voiceSdkSessionId?: string;
  sdkVersion?: string;
  startTimestamp?: string;
  endTimestamp?: string;
}

export interface ICallReportPayload {
  summary: ICallSummary;
  stats: IStatsInterval[];
  logs?: ILogEntry[];
  /** Segment index for multi-part reports (0-based). Present when a report was flushed early. */
  segment?: number;
}

export class CallReportCollector {
  private options: ICallReportOptions;
  private logCollectorOptions: ILogCollectorOptions;
  private peerConnection: RTCPeerConnection | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private statsBuffer: IStatsInterval[] = [];
  private intervalStartTime: Date | null = null;
  private callStartTime: Date;
  private callEndTime: Date | null = null;
  private logCollector: LogCollector | null = null;

  // Accumulated values for averaging within an interval
  private intervalAudioLevels: { outbound: number[]; inbound: number[] } = {
    outbound: [],
    inbound: [],
  };
  private intervalJitters: number[] = [];
  private intervalRTTs: number[] = [];
  private intervalBitrates: {
    outbound: number[];
    inbound: number[];
  } = {
    outbound: [],
    inbound: [],
  };

  // Previous values for rate calculations
  private previousStats: {
    timestamp?: number;
    outboundBytes?: number;
    inboundBytes?: number;
    // For computing audio level from totalAudioEnergy deltas
    inboundAudioEnergy?: number;
    inboundSamplesDuration?: number;
    outboundAudioEnergy?: number;
    outboundSamplesDuration?: number;
  } = {};

  // Track selected candidate pair ID to detect mid-call path changes
  private previousCandidatePairId: string | null = null;

  // Maximum buffer size to prevent memory issues on long calls
  private readonly MAX_BUFFER_SIZE = 360; // 30 minutes at 5-second intervals

  // ── Size-aware flush ──────────────────────────────────────────────
  // Flush when stats or logs approach their buffer limits to avoid
  // hitting the server's 2 MB body limit or dropping oldest entries.
  private static readonly STATS_FLUSH_THRESHOLD = 300; // flush before 360 max
  private static readonly LOGS_FLUSH_THRESHOLD = 800; // flush before 1000 max

  /** Callback invoked when stats or logs approach their buffer limits. */
  public onFlushNeeded: (() => void) | null = null;

  /** Running segment counter for multi-part reports. */
  private _segmentIndex: number = 0;

  /** Whether a flush is already in progress (prevents re-entrant flushes). */
  private _flushing: boolean = false;

  /** Detects sustained silence on both audio directions */
  private _silenceDetector: SilenceDetector | null = null;

  /** Public callback for silence events — wired by BaseCall to dispatch notifications */
  public onSilenceDetected: ((event: SilenceEvent) => void) | null = null;

  // ── Retry configuration ───────────────────────────────────────────
  private static readonly RETRY_DELAY_MS = 500;

  constructor(
    options: ICallReportOptions,
    logCollectorOptions?: ILogCollectorOptions
  ) {
    this.options = options;
    this.logCollectorOptions = logCollectorOptions || {
      enabled: false,
      level: 'debug',
      maxEntries: 1000,
    };
    this.callStartTime = new Date();

    // Create log collector if enabled — start immediately to capture setup/negotiation logs
    if (this.logCollectorOptions.enabled) {
      this.logCollector = createLogCollector(this.logCollectorOptions);
      this.logCollector.start();
      setGlobalLogCollector(this.logCollector);
    }
  }

  /**
   * Start collecting stats from the peer connection
   */
  public start(peerConnection: RTCPeerConnection): void {
    if (!this.options.enabled) {
      return;
    }

    this.peerConnection = peerConnection;
    this.intervalStartTime = new Date();

    // Create silence detector — polls every stats interval
    this._silenceDetector = new SilenceDetector({
      pollingIntervalMs: this.options.interval,
    });
    this._silenceDetector.onSilenceDetected = (event) => {
      this.onSilenceDetected?.(event);
    };

    logger.info('CallReportCollector: Starting stats collection', {
      interval: this.options.interval,
      logCollectorActive: this.logCollector?.isActive() ?? false,
    });

    this.intervalId = setInterval(() => {
      this._collectStats();
    }, this.options.interval);
  }

  /**
   * Stop collecting stats and prepare for final report.
   * Awaits the final stats collection so the buffer is populated
   * before postReport() is called — critical for short calls where
   * no periodic interval has completed yet.
   */
  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.callEndTime = new Date();

    // Collect final stats before stopping (isFinal = true to force
    // a partial-interval entry into the buffer for short calls)
    if (this.peerConnection && this.intervalStartTime) {
      await this._collectStats(true);
    }

    // Stop log collector
    const logCount = this.logCollector?.getLogCount() ?? 0;
    if (this.logCollector) {
      this.logCollector.stop();
    }

    logger.info('CallReportCollector: Stopped stats collection', {
      totalIntervals: this.statsBuffer.length,
      totalLogs: logCount,
      duration: this.callEndTime.getTime() - this.callStartTime.getTime(),
    });
  }

  /**
   * Flush the current stats and logs as an intermediate segment.
   * Returns the flushed payload (stats + logs) and resets the internal
   * buffers so collection can continue for the next segment.
   *
   * The caller is responsible for posting the returned payload.
   */
  public flush(summary: ICallSummary): ICallReportPayload | null {
    if (this._flushing || this.statsBuffer.length === 0) {
      return null;
    }

    this._flushing = true;
    try {
      const segment = this._segmentIndex++;
      const stats = this.statsBuffer;
      this.statsBuffer = [];

      // Drain logs accumulated since last flush
      const logs = this.logCollector?.drain() ?? [];

      const now = new Date();
      const payload: ICallReportPayload = {
        summary: {
          ...summary,
          durationSeconds:
            (now.getTime() - this.callStartTime.getTime()) / 1000,
          startTimestamp: this.callStartTime.toISOString(),
          endTimestamp: now.toISOString(),
        },
        stats,
        ...(logs.length > 0 ? { logs } : {}),
        segment,
      };

      logger.info('CallReportCollector: Flushed intermediate segment', {
        segment,
        intervals: stats.length,
        logEntries: logs.length,
        callId: summary.callId,
      });

      return payload;
    } finally {
      this._flushing = false;
    }
  }

  /**
   * Post the collected stats to voice-sdk-proxy.
   *
   * When called after one or more `flush()` calls, this posts the final
   * segment. Otherwise it posts the entire report as a single segment.
   */
  public async postReport(
    summary: ICallSummary,
    callReportId: string,
    host: string,
    voiceSdkId?: string
  ): Promise<void> {
    // Get remaining logs (getLogs for final, drain was used for intermediates)
    const logs = this.logCollector?.getLogs();
    const hasLogs = logs && logs.length > 0;

    if (!this.options.enabled) {
      logger.info(
        'CallReportCollector: Skipping report — call reports disabled'
      );
      return;
    }

    if (this.statsBuffer.length === 0 && !hasLogs) {
      logger.info(
        'CallReportCollector: Skipping report — no stats or logs collected'
      );
      return;
    }

    const isMultiSegment = this._segmentIndex > 0;
    const segment = this._segmentIndex;

    // Build the report payload
    const payload: ICallReportPayload = {
      summary: {
        ...summary,
        durationSeconds:
          this.callEndTime && this.callStartTime
            ? (this.callEndTime.getTime() - this.callStartTime.getTime()) / 1000
            : undefined,
        startTimestamp: this.callStartTime.toISOString(),
        endTimestamp: this.callEndTime?.toISOString(),
      },
      stats: this.statsBuffer,
      ...(logs && logs.length > 0 ? { logs } : {}),
      ...(isMultiSegment ? { segment } : {}),
    };

    await this._sendPayload(payload, callReportId, host, voiceSdkId);
  }

  /**
   * Post an arbitrary call report payload to voice-sdk-proxy.
   * Used both for intermediate flushes and the final report.
   */
  public async sendPayload(
    payload: ICallReportPayload,
    callReportId: string,
    host: string,
    voiceSdkId?: string
  ): Promise<void> {
    await this._sendPayload(payload, callReportId, host, voiceSdkId);
  }

  /**
   * Internal: send a payload to the call_report endpoint.
   *
   * On network error (e.g., ERR_SOCKET_NOT_CONNECTED from Chrome reusing
   * a stale TCP socket), retries once after a short delay. If the retry
   * also fails, logs the error and moves on.
   */
  private async _sendPayload(
    payload: ICallReportPayload,
    callReportId: string,
    host: string,
    voiceSdkId?: string
  ): Promise<void> {
    try {
      const wsUrl = new URL(host);
      const endpoint = `${wsUrl.protocol.replace(/^ws/, 'http')}//${wsUrl.host}/call_report`;

      const isIntermediate =
        payload.segment !== undefined && !payload.summary.endTimestamp;
      const label = isIntermediate
        ? `intermediate segment ${payload.segment}`
        : 'final report';

      logger.info(`CallReportCollector: Posting ${label}`, {
        endpoint,
        intervals: payload.stats.length,
        logEntries: payload.logs?.length ?? 0,
        callId: payload.summary.callId,
        segment: payload.segment,
      });

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-call-report-id': callReportId,
        'x-call-id': payload.summary.callId,
      };
      if (voiceSdkId) {
        headers['x-voice-sdk-id'] = voiceSdkId;
      }

      const body = JSON.stringify(payload);

      const doFetch = () => fetch(endpoint, { method: 'POST', headers, body });

      const response = await doFetch();

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`CallReportCollector: Failed to post ${label}`, {
          status: response.status,
          error: errorText,
        });
      } else {
        logger.info(`CallReportCollector: Successfully posted ${label}`);
      }
    } catch (firstError) {
      // Network error (stale socket, DNS failure, etc.) — retry once
      logger.warn(
        `CallReportCollector: Network error posting call report, retrying in ${CallReportCollector.RETRY_DELAY_MS}ms`,
        { error: firstError }
      );

      await new Promise((r) =>
        setTimeout(r, CallReportCollector.RETRY_DELAY_MS)
      );

      try {
        const wsUrl = new URL(host);
        const endpoint = `${wsUrl.protocol.replace(/^ws/, 'http')}//${wsUrl.host}/call_report`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-call-report-id': callReportId,
          'x-call-id': payload.summary.callId,
        };
        if (voiceSdkId) {
          headers['x-voice-sdk-id'] = voiceSdkId;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(
            'CallReportCollector: Failed to post call report on retry',
            { status: response.status, error: errorText }
          );
        } else {
          logger.info(
            'CallReportCollector: Successfully posted call report on retry'
          );
        }
      } catch (retryError) {
        logger.error('CallReportCollector: Retry also failed, giving up', {
          error: retryError,
        });
      }
    }
  }

  /**
   * Get the current stats buffer (for debugging)
   */
  public getStatsBuffer(): IStatsInterval[] {
    return this.statsBuffer;
  }

  /**
   * Get the collected logs (for debugging)
   */
  public getLogs(): ILogEntry[] {
    return this.logCollector?.getLogs() ?? [];
  }

  /**
   * Clean up resources (call after postReport)
   */
  public cleanup(): void {
    if (this._silenceDetector) {
      this._silenceDetector.destroy();
      this._silenceDetector = null;
    }
    if (this.logCollector) {
      this.logCollector.clear();
      // Clear global reference if it points to this collector
      if (getGlobalLogCollector() === this.logCollector) {
        setGlobalLogCollector(null);
      }
      this.logCollector = null;
    }
  }

  /**
   * Collect stats from the peer connection and aggregate them.
   * @param isFinal - When true (called from stop()), always push a partial
   *   interval entry to the buffer even if the full interval hasn't elapsed.
   *   This ensures short calls (< interval duration) still produce stats.
   */
  private async _collectStats(isFinal: boolean = false): Promise<void> {
    if (!this.peerConnection || !this.intervalStartTime) {
      return;
    }

    try {
      const stats = await this.peerConnection.getStats();
      const now = new Date();

      // Process stats reports
      let outboundAudio: ExtendedOutboundRtpStreamStats | null = null;
      let inboundAudio: ExtendedInboundRtpStreamStats | null = null;
      let candidatePair: ExtendedCandidatePairStats | null = null;
      let transportStats: ExtendedTransportStats | null = null;

      stats.forEach((report) => {
        switch (report.type) {
          case 'outbound-rtp':
            if (report.kind === 'audio' && report.mediaType === 'audio') {
              outboundAudio = report as ExtendedOutboundRtpStreamStats;
            }
            break;
          case 'inbound-rtp':
            if (report.kind === 'audio' && report.mediaType === 'audio') {
              inboundAudio = report as ExtendedInboundRtpStreamStats;
            }
            break;
          case 'candidate-pair':
            if (
              (report as ExtendedCandidatePairStats).nominated ||
              (report as ExtendedCandidatePairStats).state === 'succeeded'
            ) {
              candidatePair = report as ExtendedCandidatePairStats;
            }
            break;
          case 'transport':
            transportStats = report as unknown as ExtendedTransportStats;
            break;
        }
      });

      // Collect sample values for averaging
      if (outboundAudio) {
        // Outbound audioLevel: available on the media-source stat (Chrome 96+)
        // or on the deprecated track stat as fallback
        const audioLevel = this._getOutboundAudioLevel(stats, outboundAudio);
        if (audioLevel !== null) {
          this.intervalAudioLevels.outbound.push(audioLevel);
        }

        // Calculate bitrate
        if (
          this.previousStats.outboundBytes !== undefined &&
          this.previousStats.timestamp !== undefined
        ) {
          const bytesDelta =
            (outboundAudio.bytesSent || 0) - this.previousStats.outboundBytes;
          const timeDelta =
            (outboundAudio.timestamp || now.getTime()) -
            this.previousStats.timestamp;
          if (timeDelta > 0) {
            const bitrate = (bytesDelta * 8 * 1000) / timeDelta; // bps
            this.intervalBitrates.outbound.push(bitrate);
          }
        }
        this.previousStats.outboundBytes = outboundAudio.bytesSent;
      }

      if (inboundAudio) {
        // Inbound audioLevel: try direct audioLevel on inbound-rtp (requires
        // ssrc-audio-level RTP header extension), then compute from
        // totalAudioEnergy deltas, then deprecated track stat
        const audioLevel = this._getInboundAudioLevel(stats, inboundAudio);
        if (audioLevel !== null) {
          this.intervalAudioLevels.inbound.push(audioLevel);
        }

        // Jitter (convert to ms)
        if (inboundAudio.jitter !== undefined) {
          this.intervalJitters.push(inboundAudio.jitter * 1000);
        }

        // Calculate bitrate
        if (
          this.previousStats.inboundBytes !== undefined &&
          this.previousStats.timestamp !== undefined
        ) {
          const bytesDelta =
            (inboundAudio.bytesReceived || 0) - this.previousStats.inboundBytes;
          const timeDelta =
            (inboundAudio.timestamp || now.getTime()) -
            this.previousStats.timestamp;
          if (timeDelta > 0) {
            const bitrate = (bytesDelta * 8 * 1000) / timeDelta; // bps
            this.intervalBitrates.inbound.push(bitrate);
          }
        }
        this.previousStats.inboundBytes = inboundAudio.bytesReceived;
      }

      if (candidatePair) {
        // RTT (already in seconds)
        if (candidatePair.currentRoundTripTime !== undefined) {
          this.intervalRTTs.push(candidatePair.currentRoundTripTime);
        }

        // Detect mid-call path changes
        if (
          this.previousCandidatePairId !== null &&
          candidatePair.id !== this.previousCandidatePairId
        ) {
          logger.debug(
            'CallReportCollector: ICE candidate pair changed mid-call',
            {
              previous: this.previousCandidatePairId,
              current: candidatePair.id,
            }
          );
        }
        this.previousCandidatePairId = candidatePair.id ?? null;
      }

      // Resolve local and remote candidates for the selected pair
      let localCandidate: ICECandidateInfo | undefined;
      let remoteCandidate: ICECandidateInfo | undefined;

      if (candidatePair) {
        localCandidate = this._resolveCandidate(
          stats,
          candidatePair.localCandidateId
        );
        remoteCandidate = this._resolveCandidate(
          stats,
          candidatePair.remoteCandidateId
        );
      }

      this.previousStats.timestamp = now.getTime();

      // Feed audio levels to silence detector on every stats poll
      if (this._silenceDetector) {
        const lastInbound =
          this.intervalAudioLevels.inbound.length > 0
            ? this.intervalAudioLevels.inbound[
                this.intervalAudioLevels.inbound.length - 1
              ]
            : null;
        const lastOutbound =
          this.intervalAudioLevels.outbound.length > 0
            ? this.intervalAudioLevels.outbound[
                this.intervalAudioLevels.outbound.length - 1
              ]
            : null;
        this._silenceDetector.onAudioLevels(lastInbound, lastOutbound);
      }

      // Check if interval is complete (end of collection period).
      // When isFinal is true, always push the partial interval so that
      // short calls (shorter than the collection interval) still produce
      // at least one stats entry in the buffer.
      const intervalDuration = now.getTime() - this.intervalStartTime.getTime();
      if (isFinal || intervalDuration >= this.options.interval) {
        // Create stats entry for this interval
        const statsEntry = this._createStatsEntry(
          this.intervalStartTime,
          now,
          outboundAudio,
          inboundAudio,
          candidatePair,
          localCandidate,
          remoteCandidate,
          transportStats
        );

        // Add to buffer with size limit
        this.statsBuffer.push(statsEntry);
        if (this.statsBuffer.length > this.MAX_BUFFER_SIZE) {
          this.statsBuffer.shift(); // Remove oldest entry
          logger.warn(
            'CallReportCollector: Buffer size limit reached, removing oldest entry'
          );
        }

        // Check if stats or logs are approaching buffer limits and flush early
        if (this.onFlushNeeded && !this._flushing) {
          const statsCount = this.statsBuffer.length;
          const logCount = this.logCollector?.getLogCount() ?? 0;
          if (
            statsCount >= CallReportCollector.STATS_FLUSH_THRESHOLD ||
            logCount >= CallReportCollector.LOGS_FLUSH_THRESHOLD
          ) {
            logger.info(
              'CallReportCollector: Approaching buffer limits, requesting flush',
              { statsIntervals: statsCount, logEntries: logCount }
            );
            try {
              this.onFlushNeeded();
            } catch (err) {
              logger.error(
                'CallReportCollector: onFlushNeeded callback error',
                { error: err }
              );
            }
          }
        }

        // Reset interval
        this.intervalStartTime = now;
        this._resetIntervalAccumulators();
      }
    } catch (error) {
      logger.error('CallReportCollector: Error collecting stats', { error });
    }
  }

  /**
   * Create a stats entry from accumulated values
   */
  private _createStatsEntry(
    start: Date,
    end: Date,
    outboundAudio: ExtendedOutboundRtpStreamStats | null,
    inboundAudio: ExtendedInboundRtpStreamStats | null,
    candidatePair: ExtendedCandidatePairStats | null,
    localCandidate?: ICECandidateInfo,
    remoteCandidate?: ICECandidateInfo,
    transportStats?: ExtendedTransportStats | null
  ): IStatsInterval {
    const entry: IStatsInterval = {
      intervalStartUtc: start.toISOString(),
      intervalEndUtc: end.toISOString(),
    };

    // Audio stats
    entry.audio = {};

    if (outboundAudio) {
      entry.audio.outbound = {
        packetsSent: outboundAudio.packetsSent,
        bytesSent: outboundAudio.bytesSent,
        audioLevelAvg: this._average(this.intervalAudioLevels.outbound),
        bitrateAvg: this._average(this.intervalBitrates.outbound),
      };
    }

    if (inboundAudio) {
      entry.audio.inbound = {
        packetsReceived: inboundAudio.packetsReceived,
        bytesReceived: inboundAudio.bytesReceived,
        packetsLost: inboundAudio.packetsLost,
        packetsDiscarded: inboundAudio.packetsDiscarded,
        jitterBufferDelay: inboundAudio.jitterBufferDelay,
        jitterBufferEmittedCount: inboundAudio.jitterBufferEmittedCount,
        totalSamplesReceived: inboundAudio.totalSamplesReceived,
        concealedSamples: inboundAudio.concealedSamples,
        concealmentEvents: inboundAudio.concealmentEvents,
        audioLevelAvg: this._average(this.intervalAudioLevels.inbound),
        jitterAvg: this._average(this.intervalJitters),
        bitrateAvg: this._average(this.intervalBitrates.inbound),
      };
    }

    // Connection stats
    if (candidatePair) {
      entry.connection = {
        roundTripTimeAvg: this._average(this.intervalRTTs),
        packetsSent: candidatePair.packetsSent,
        packetsReceived: candidatePair.packetsReceived,
        bytesSent: candidatePair.bytesSent,
        bytesReceived: candidatePair.bytesReceived,
      };

      // ICE candidate pair details
      entry.ice = {
        id: candidatePair.id,
        state: candidatePair.state,
        nominated: candidatePair.nominated,
        writable: candidatePair.writable,
        requestsSent: candidatePair.requestsSent,
        responsesReceived: candidatePair.responsesReceived,
        ...(localCandidate ? { local: localCandidate } : {}),
        ...(remoteCandidate ? { remote: remoteCandidate } : {}),
      };
    }

    // Transport stats
    if (transportStats) {
      entry.transport = {
        ...(transportStats.iceState !== undefined
          ? { iceState: transportStats.iceState }
          : {}),
        ...(transportStats.dtlsState !== undefined
          ? { dtlsState: transportStats.dtlsState }
          : {}),
        ...(transportStats.srtpCipher !== undefined
          ? { srtpCipher: transportStats.srtpCipher }
          : {}),
        ...(transportStats.tlsVersion !== undefined
          ? { tlsVersion: transportStats.tlsVersion }
          : {}),
        ...(transportStats.selectedCandidatePairChanges !== undefined
          ? {
              selectedCandidatePairChanges:
                transportStats.selectedCandidatePairChanges,
            }
          : {}),
      };
    }

    return entry;
  }

  /**
   * Resolve a local-candidate or remote-candidate from the RTCStatsReport
   * by its stat entry ID.
   */
  private _resolveCandidate(
    stats: RTCStatsReport,
    candidateId?: string
  ): ICECandidateInfo | undefined {
    if (!candidateId) {
      logger.debug(
        'CallReportCollector: candidateId is empty, skipping resolve'
      );
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const report = (stats as any).get(candidateId);
    if (!report) {
      logger.debug('CallReportCollector: candidate not found in stats report', {
        candidateId,
      });
      return undefined;
    }

    const info: ICECandidateInfo = {};
    if (report.address !== undefined) info.address = report.address;
    if (report.port !== undefined) info.port = report.port;
    if (report.candidateType !== undefined)
      info.candidateType = report.candidateType;
    if (report.protocol !== undefined) info.protocol = report.protocol;
    // networkType is only available on local candidates and may be absent in some browsers
    if (report.networkType !== undefined) info.networkType = report.networkType;

    if (Object.keys(info).length === 0) {
      logger.debug(
        'CallReportCollector: candidate report has no usable fields',
        { candidateId }
      );
      return undefined;
    }

    return info;
  }

  /**
   * Get outbound audio level from media-source stats (Chrome 96+)
   * or compute from totalAudioEnergy deltas, or fall back to deprecated track stats.
   *
   * Strategy (in priority order):
   * 1. media-source stat via outbound-rtp.mediaSourceId (Chrome 96+) — audioLevel
   * 2. media-source stat by iterating all stats (fallback when mediaSourceId missing)
   * 3. Compute RMS from media-source totalAudioEnergy / totalSamplesDuration deltas
   * 4. Deprecated track stat via trackId (legacy browsers)
   */
  private _getOutboundAudioLevel(
    stats: RTCStatsReport,
    outboundAudio: ExtendedOutboundRtpStreamStats
  ): number | null {
    // 1. Try media-source stat by ID (Chrome 96+)
    let mediaSource: ExtendedMediaSourceStats | undefined;

    if (outboundAudio.mediaSourceId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mediaSource = (stats as any).get(outboundAudio.mediaSourceId) as
        | ExtendedMediaSourceStats
        | undefined;
    }

    // 2. If mediaSourceId not set or not found, iterate stats for media-source
    if (!mediaSource) {
      stats.forEach((report) => {
        if (
          !mediaSource &&
          report.type === 'media-source' &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (report as any).kind === 'audio'
        ) {
          mediaSource = report as unknown as ExtendedMediaSourceStats;
        }
      });
    }

    // Try direct audioLevel on media-source
    if (mediaSource?.audioLevel !== undefined) {
      return mediaSource.audioLevel;
    }

    // 3. Compute RMS audio level from totalAudioEnergy deltas on media-source
    if (mediaSource) {
      const level = this._computeAudioLevelFromEnergy(
        mediaSource.totalAudioEnergy,
        mediaSource.totalSamplesDuration,
        'outbound'
      );
      if (level !== null) {
        return level;
      }
    }

    // 4. Deprecated track stat fallback (legacy browsers only)
    return this._getTrackAudioLevel(stats, outboundAudio.trackId);
  }

  /**
   * Get inbound audio level from the best available source.
   *
   * Strategy (in priority order):
   * 1. audioLevel directly on inbound-rtp (requires remote to negotiate
   *    urn:ietf:params:rtp-hdrext:ssrc-audio-level RTP header extension)
   * 2. Compute RMS from inbound-rtp totalAudioEnergy / totalSamplesDuration deltas
   * 3. Deprecated track stat via trackId (legacy browsers)
   */
  private _getInboundAudioLevel(
    stats: RTCStatsReport,
    inboundAudio: ExtendedInboundRtpStreamStats
  ): number | null {
    // 1. Direct audioLevel on inbound-rtp (needs ssrc-audio-level ext)
    if (inboundAudio.audioLevel !== undefined) {
      return inboundAudio.audioLevel;
    }

    // 2. Compute RMS from totalAudioEnergy deltas (always available)
    const level = this._computeAudioLevelFromEnergy(
      inboundAudio.totalAudioEnergy,
      inboundAudio.totalSamplesDuration,
      'inbound'
    );
    if (level !== null) {
      return level;
    }

    // 3. Deprecated track stat fallback (legacy browsers only)
    return this._getTrackAudioLevel(stats, inboundAudio.trackId);
  }

  /**
   * Compute RMS audio level from totalAudioEnergy and totalSamplesDuration
   * deltas between consecutive stats collections.
   *
   * Formula: audioLevel = sqrt(deltaEnergy / deltaDuration)
   *
   * Returns a value between 0.0 (silence) and 1.0 (max), or null if
   * insufficient data (first sample or missing fields).
   *
   * @see https://www.w3.org/TR/webrtc-stats/#dom-rtcaudiohandlerstats-totalaudioenergy
   */
  private _computeAudioLevelFromEnergy(
    currentEnergy: number | undefined,
    currentDuration: number | undefined,
    direction: 'inbound' | 'outbound'
  ): number | null {
    if (currentEnergy === undefined || currentDuration === undefined) {
      return null;
    }

    const prevEnergyKey =
      direction === 'inbound' ? 'inboundAudioEnergy' : 'outboundAudioEnergy';
    const prevDurationKey =
      direction === 'inbound'
        ? 'inboundSamplesDuration'
        : 'outboundSamplesDuration';

    const prevEnergy = this.previousStats[prevEnergyKey];
    const prevDuration = this.previousStats[prevDurationKey];

    // Store current values for next delta calculation
    this.previousStats[prevEnergyKey] = currentEnergy;
    this.previousStats[prevDurationKey] = currentDuration;

    // Need previous values to compute delta (skip first sample)
    if (prevEnergy === undefined || prevDuration === undefined) {
      return null;
    }

    const deltaEnergy = currentEnergy - prevEnergy;
    const deltaDuration = currentDuration - prevDuration;

    if (deltaDuration <= 0) {
      return null;
    }

    // RMS audio level: sqrt(energy / duration), clamped to [0, 1]
    const rms = Math.sqrt(deltaEnergy / deltaDuration);
    return Math.min(1.0, Math.max(0.0, rms));
  }

  /**
   * Get audio level from deprecated track stats (legacy browsers only).
   * Chrome removed trackId from outbound-rtp/inbound-rtp stats in ~Chrome 117.
   * This method is kept as a last-resort fallback.
   * @deprecated Use _getOutboundAudioLevel / _getInboundAudioLevel instead
   */
  private _getTrackAudioLevel(
    stats: RTCStatsReport,
    trackId?: string
  ): number | null {
    if (!trackId) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trackStats = (stats as any).get(trackId);
    if (!trackStats) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (trackStats as any).audioLevel ?? null;
  }

  /**
   * Calculate average of an array of numbers
   */
  private _average(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    const sum = values.reduce((a, b) => a + b, 0);
    return parseFloat((sum / values.length).toFixed(4));
  }

  /**
   * Reset interval accumulators for next collection period
   */
  private _resetIntervalAccumulators(): void {
    this.intervalAudioLevels = { outbound: [], inbound: [] };
    this.intervalJitters = [];
    this.intervalRTTs = [];
    this.intervalBitrates = { outbound: [], inbound: [] };
  }
}
