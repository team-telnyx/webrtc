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

export interface ICallReportOptions {
  enabled: boolean;
  interval: number;
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
}

export class CallReportCollector {
  private options: ICallReportOptions;
  private peerConnection: RTCPeerConnection | null = null;
  private intervalId: any = null;
  private statsBuffer: IStatsInterval[] = [];
  private intervalStartTime: Date | null = null;
  private callStartTime: Date;
  private callEndTime: Date | null = null;

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

  constructor(options: ICallReportOptions) {
    this.options = options;
    this.callStartTime = new Date();
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

    logger.info('CallReportCollector: Stopped stats collection', {
      totalIntervals: this.statsBuffer.length,
      duration: this.callEndTime.getTime() - this.callStartTime.getTime(),
    });
  }

  /**
   * Post the collected stats to voice-sdk-proxy
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
    };

    try {
      const wsUrl = new URL(host);
      const endpoint = `${wsUrl.protocol.replace('ws', 'http')}//${wsUrl.host}/call_report`;

      logger.info('CallReportCollector: Posting report', {
        endpoint,
        intervals: this.statsBuffer.length,
        callId: summary.callId,
      });

      // Build headers with required call_report_id and call_id, optional voice_sdk_id
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-call-report-id': callReportId,
        'x-call-id': summary.callId,
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
        logger.error('CallReportCollector: Failed to post report', {
          status: response.status,
          error: errorText,
        });
      } else {
        logger.info('CallReportCollector: Successfully posted report');
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
      let outboundAudio: RTCOutboundRtpStreamStats | null = null;
      let inboundAudio: RTCInboundRtpStreamStats | null = null;
      let candidatePair: RTCIceCandidatePairStats | null = null;

      stats.forEach((report) => {
        switch (report.type) {
          case 'outbound-rtp':
            if (report.kind === 'audio' && report.mediaType === 'audio') {
              outboundAudio = report as RTCOutboundRtpStreamStats;
            }
            break;
          case 'inbound-rtp':
            if (report.kind === 'audio' && report.mediaType === 'audio') {
              inboundAudio = report as RTCInboundRtpStreamStats;
            }
            break;
          case 'candidate-pair':
            if ((report as any).nominated || (report as any).state === 'succeeded') {
              candidatePair = report as RTCIceCandidatePairStats;
            }
            break;
        }
      });

      // Collect sample values for averaging
      if (outboundAudio) {
        const audioLevel = this._getTrackAudioLevel(
          stats,
          (outboundAudio as any).trackId
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
            ((outboundAudio as any).timestamp || now.getTime()) -
            this.previousStats.timestamp;
          if (timeDelta > 0) {
            const bitrate = (bytesDelta * 8 * 1000) / timeDelta; // bps
            this.intervalBitrates.outbound.push(bitrate);
          }
        }
        this.previousStats.outboundBytes = outboundAudio.bytesSent;
      }

      if (inboundAudio) {
        const audioLevel = this._getTrackAudioLevel(stats, (inboundAudio as any).trackId);
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
            ((inboundAudio as any).bytesReceived || 0) - this.previousStats.inboundBytes;
          const timeDelta =
            ((inboundAudio as any).timestamp || now.getTime()) -
            this.previousStats.timestamp;
          if (timeDelta > 0) {
            const bitrate = (bytesDelta * 8 * 1000) / timeDelta; // bps
            this.intervalBitrates.inbound.push(bitrate);
          }
        }
        this.previousStats.inboundBytes = (inboundAudio as any).bytesReceived;
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
    outboundAudio: RTCOutboundRtpStreamStats | null,
    inboundAudio: RTCInboundRtpStreamStats | null,
    candidatePair: RTCIceCandidatePairStats | null
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
        bytesReceived: (inboundAudio as any).bytesReceived,
        packetsLost: inboundAudio.packetsLost,
        audioLevelAvg: this._average(this.intervalAudioLevels.inbound),
        jitterAvg: this._average(this.intervalJitters),
        bitrateAvg: this._average(this.intervalBitrates.inbound),
      };
    }

    // Connection stats
    if (candidatePair) {
      entry.connection = {
        roundTripTimeAvg: this._average(this.intervalRTTs),
        packetsSent: (candidatePair as any).packetsSent,
        packetsReceived: (candidatePair as any).packetsReceived,
        bytesSent: (candidatePair as any).bytesSent,
        bytesReceived: (candidatePair as any).bytesReceived,
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

    const trackStats = (stats as any).get(trackId);
    if (!trackStats) return null;

    // Chrome/Safari use 'audioLevel', Firefox might use different property
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
}
