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
}

/**
 * Extended RTCOutboundRtpStreamStats
 */
interface ExtendedOutboundRtpStreamStats extends RTCOutboundRtpStreamStats {
  trackId?: string;
}

/**
 * Extended RTCIceCandidatePairStats
 */
interface ExtendedCandidatePairStats extends RTCIceCandidatePairStats {
  packetsSent?: number;
  packetsReceived?: number;
  bytesSent?: number;
  bytesReceived?: number;
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
  /** True only on the final segment of a multi-part report or on a single-part report. */
  isFinal?: boolean;
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
  } = {};

  // Maximum buffer size to prevent memory issues on long calls
  private readonly MAX_BUFFER_SIZE = 360; // 30 minutes at 5-second intervals

  // ── Size-aware flush ──────────────────────────────────────────────
  // Server limit is 2 MB. We flush at 1.5 MB to leave headroom for
  // the final segment's summary/headers and JSON serialization overhead.
  private static readonly SERVER_MAX_BYTES = 2 * 1024 * 1024;        // 2 MB
  private static readonly FLUSH_THRESHOLD_BYTES = 1.5 * 1024 * 1024;  // 1.5 MB
  private static readonly ESTIMATED_SUMMARY_BYTES = 2048;              // ~2 KB

  /** Callback invoked when estimated payload size crosses the flush threshold. */
  public onFlushNeeded: (() => void) | null = null;

  /** Running segment counter for multi-part reports. */
  private _segmentIndex: number = 0;

  /** Whether a flush is already in progress (prevents re-entrant flushes). */
  private _flushing: boolean = false;

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

    logger.info('CallReportCollector: Starting stats collection', {
      interval: this.options.interval,
      logCollectorActive: this.logCollector?.isActive() ?? false,
    });

    this.intervalId = setInterval(() => {
      this._collectStats();
    }, this.options.interval);
  }

  /**
   * Stop collecting stats and prepare for final report
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.callEndTime = new Date();

    // Collect final stats before stopping
    if (this.peerConnection && this.intervalStartTime) {
      this._collectStats();
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
          durationSeconds: (now.getTime() - this.callStartTime.getTime()) / 1000,
          startTimestamp: this.callStartTime.toISOString(),
        },
        stats,
        ...(logs.length > 0 ? { logs } : {}),
        segment,
        isFinal: false,
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
    if (!this.options.enabled || this.statsBuffer.length === 0) {
      return;
    }

    // Get remaining logs (getLogs for final, drain was used for intermediates)
    const logs = this.logCollector?.getLogs();

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
      ...(isMultiSegment ? { segment, isFinal: true } : {}),
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

      const isIntermediate = payload.isFinal === false;
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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`CallReportCollector: Failed to post ${label}`, {
          status: response.status,
          error: errorText,
        });
      } else {
        logger.info(`CallReportCollector: Successfully posted ${label}`);
      }
    } catch (error) {
      logger.error('CallReportCollector: Error posting report', { error });
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
   * Collect stats from the peer connection and aggregate them
   */
  private async _collectStats(): Promise<void> {
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
        }
      });

      // Collect sample values for averaging
      if (outboundAudio) {
        const audioLevel = this._getTrackAudioLevel(
          stats,
          outboundAudio.trackId
        );
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
        const audioLevel = this._getTrackAudioLevel(
          stats,
          inboundAudio.trackId
        );
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
      }

      this.previousStats.timestamp = now.getTime();

      // Check if interval is complete (end of collection period)
      const intervalDuration = now.getTime() - this.intervalStartTime.getTime();
      if (intervalDuration >= this.options.interval) {
        // Create stats entry for this interval
        const statsEntry = this._createStatsEntry(
          this.intervalStartTime,
          now,
          outboundAudio,
          inboundAudio,
          candidatePair
        );

        // Add to buffer with size limit
        this.statsBuffer.push(statsEntry);
        if (this.statsBuffer.length > this.MAX_BUFFER_SIZE) {
          this.statsBuffer.shift(); // Remove oldest entry
          logger.warn(
            'CallReportCollector: Buffer size limit reached, removing oldest entry'
          );
        }

        // Check estimated payload size and trigger flush if approaching server limit
        if (this.onFlushNeeded && !this._flushing) {
          const estimatedSize = this._estimatePayloadSize();
          if (estimatedSize >= CallReportCollector.FLUSH_THRESHOLD_BYTES) {
            logger.info(
              'CallReportCollector: Payload approaching size limit, requesting flush',
              {
                estimatedBytes: estimatedSize,
                thresholdBytes: CallReportCollector.FLUSH_THRESHOLD_BYTES,
                statsIntervals: this.statsBuffer.length,
                logEntries: this.logCollector?.getLogCount() ?? 0,
              }
            );
            try {
              this.onFlushNeeded();
            } catch (err) {
              logger.error('CallReportCollector: onFlushNeeded callback error', { error: err });
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
    candidatePair: ExtendedCandidatePairStats | null
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
    }

    return entry;
  }

  /**
   * Get audio level from track stats
   */
  private _getTrackAudioLevel(
    stats: RTCStatsReport,
    trackId?: string
  ): number | null {
    if (!trackId) return null;

    // RTCStatsReport.get() returns RTCStats which doesn't include audioLevel in TS types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trackStats = (stats as any).get(trackId);
    if (!trackStats) return null;

    // Chrome/Safari use 'audioLevel', Firefox might use different property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (trackStats as any).audioLevel || null;
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

  // ── Payload size estimation ─────────────────────────────────────

  /**
   * Estimate the total JSON byte size of the payload that would be sent.
   * Avoids full serialization by using per-entry estimates.
   *
   * Typical stats entry ≈ 400-700 bytes JSON. We sample a few entries to
   * get a representative average rather than serializing all of them.
   */
  private _estimatePayloadSize(): number {
    let total = CallReportCollector.ESTIMATED_SUMMARY_BYTES;

    // Stats size
    total += this._estimateStatsSize();

    // Logs size
    if (this.logCollector) {
      total += this.logCollector.estimateByteSize();
    }

    // JSON wrapper overhead (keys, braces, commas)
    total += 128;

    return total;
  }

  /**
   * Estimate the serialized size of the stats buffer.
   */
  private _estimateStatsSize(): number {
    const count = this.statsBuffer.length;
    if (count === 0) return 2; // "[]"

    // Sample up to 3 entries at start, middle, end
    const indices = [0, Math.floor(count / 2), count - 1];
    const unique = [...new Set(indices)];

    let sampleTotal = 0;
    for (const i of unique) {
      // Quick estimate per entry without full JSON.stringify
      const entry = this.statsBuffer[i];
      let size = 80; // timestamps + keys overhead
      if (entry.audio?.outbound) size += 120;
      if (entry.audio?.inbound) size += 280;
      if (entry.connection) size += 140;
      sampleTotal += size;
    }

    const avgEntrySize = sampleTotal / unique.length;
    return Math.ceil(avgEntrySize * count) + 2 + Math.max(0, count - 1);
  }

  /**
   * Get the current estimated payload size in bytes (for external monitoring/debugging).
   */
  public getEstimatedPayloadSize(): number {
    return this._estimatePayloadSize();
  }
}
