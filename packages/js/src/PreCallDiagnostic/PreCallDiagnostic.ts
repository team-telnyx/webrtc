/**
 * PreCallDiagnostic — new extensible pre-call diagnostic framework.
 *
 * This class is separate from the existing PreCallDiagnosis and provides
 * a module-based architecture where each diagnostic section (ICE, network,
 * media, microphone, verdict) is built by an independent module function.
 *
 * Usage:
 * ```ts
 * const diagnostic = new PreCallDiagnostic({
 *   client: myTelnyxRTC,
 *   destinationNumber: '1234',
 * });
 * const report = await diagnostic.run();
 * ```
 *
 * Future tickets add real diagnostic logic to the module files.
 * This T1 ticket only creates the skeleton and extension points.
 */

import type {
  PreCallDiagnosticOptions,
  PreCallDiagnosticReport,
  PreCallDiagnosticRunner,
  PreCallTimingsReport,
  CallLike,
} from './types';
import {
  createDiagnosticContext,
} from './context';
import type {
  PreCallDiagnosticContext,
} from './context';
import { buildPreCallIceReport } from './modules/ice';
import { buildPreCallNetworkReport } from './modules/network';
import { buildPreCallMediaReport } from './modules/media';
import { buildPreCallMicrophoneReport } from './modules/microphone';
import { buildVerdict } from './modules/verdict';

// --- Stats frame parsing ---

/**
 * Shape of a single audio RTP stats entry from `getStats()`.
 * Uses `any` because browser RTCStatsReport entries vary in shape;
 * we read only known fields defensively.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RtcStatsEntry = any;

/**
 * Parsed stats frame — the structured format consumed by module builders.
 *
 * Each frame contains audio inbound/outbound arrays (from RTCStatsReport
 * entries of type `inbound-rtp` / `outbound-rtp` with `kind === 'audio'`),
 * optional remote inbound entries (from `remote-inbound-rtp`), and
 * optional connection-level counters.
 */
interface ParsedStatsFrame {
  timestamp: number;
  audio: {
    inbound: RtcStatsEntry[];
    outbound: RtcStatsEntry[];
  };
  remote?: {
    audio: {
      inbound: RtcStatsEntry[];
    };
  };
  connection?: {
    packetsSent?: number;
    packetsReceived?: number;
    bytesSent?: number;
    bytesReceived?: number;
  };
}

/**
 * Parse a raw `RTCStatsReport` into a structured stats frame that
 * module builders can consume.
 *
 * The output format matches what `buildPreCallMediaReport()` reads:
 * - `audio.inbound[]` from `inbound-rtp` entries with `kind === 'audio'`
 * - `audio.outbound[]` from `outbound-rtp` entries with `kind === 'audio'`
 * - `remote.audio.inbound[]` from `remote-inbound-rtp` entries
 * - `connection.*` from the `transport` entry's related counters
 *
 * Entries that are not audio or transport-related are silently skipped.
 */
function parseStatsFrame(stats: RTCStatsReport): ParsedStatsFrame {
  const frame: ParsedStatsFrame = {
    timestamp: Date.now(),
    audio: {
      inbound: [],
      outbound: [],
    },
  };

  const remoteInbound: RtcStatsEntry[] = [];
  let transportPacketsSent: number | undefined;
  let transportPacketsReceived: number | undefined;
  let transportBytesSent: number | undefined;
  let transportBytesReceived: number | undefined;

  stats.forEach((report: RTCStats) => {
    const entry = report as unknown as Record<string, unknown>;
    switch (report.type) {
      case 'inbound-rtp':
        if (entry.kind === 'audio' || entry.mediaType === 'audio') {
          frame.audio.inbound.push(entry);
        }
        break;
      case 'outbound-rtp':
        if (entry.kind === 'audio' || entry.mediaType === 'audio') {
          frame.audio.outbound.push(entry);
        }
        break;
      case 'remote-inbound-rtp':
        if (entry.kind === 'audio' || entry.mediaType === 'audio') {
          remoteInbound.push(entry);
        }
        break;
      case 'transport': {
        // Transport-level counters are a fallback when audio-level
        // stats are missing. Read them defensively.
        transportPacketsSent = typeof entry.packetsSent === 'number'
          ? entry.packetsSent : undefined;
        transportPacketsReceived = typeof entry.packetsReceived === 'number'
          ? entry.packetsReceived : undefined;
        transportBytesSent = typeof entry.bytesSent === 'number'
          ? entry.bytesSent : undefined;
        transportBytesReceived = typeof entry.bytesReceived === 'number'
          ? entry.bytesReceived : undefined;
        break;
      }
    }
  });

  if (remoteInbound.length > 0) {
    frame.remote = { audio: { inbound: remoteInbound } };
  }

  if (
    transportPacketsSent !== undefined ||
    transportPacketsReceived !== undefined ||
    transportBytesSent !== undefined ||
    transportBytesReceived !== undefined
  ) {
    frame.connection = {
      packetsSent: transportPacketsSent,
      packetsReceived: transportPacketsReceived,
      bytesSent: transportBytesSent,
      bytesReceived: transportBytesReceived,
    };
  }

  return frame;
}

/** Default timeout for the overall diagnostic run in milliseconds. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_TIMEOUT_MS = 30000;

/** Default timeout for the call setup phase in milliseconds. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_CALL_SETUP_TIMEOUT_MS = 15000;

/** Default interval between stats samples in milliseconds. */
const DEFAULT_STATS_SAMPLE_INTERVAL_MS = 1000;

/** Default duration to keep the diagnostic call active in milliseconds. */
const DEFAULT_DURATION_MS = 5000;

/**
 * PreCallDiagnostic executes a temporary diagnostic call and collects
 * reports from registered module builders.
 *
 * Implements the PreCallDiagnosticRunner interface so it can be used
 * polymorphically with future alternative runners.
 */
export class PreCallDiagnostic implements PreCallDiagnosticRunner {
  private readonly options: PreCallDiagnosticOptions;

  constructor(options: PreCallDiagnosticOptions) {
    this.options = options;
  }

  /**
   * Execute the diagnostic and return the report.
   *
   * Flow:
   * 1. Create a diagnostic context from options.
   * 2. Establish a temporary diagnostic call via options.client.
   * 3. Collect stats/samples during the call.
   * 4. Call each module report builder with the context.
   * 5. Build the verdict from module results.
   * 6. Clean up the temporary call (unless autoHangup is false).
   * 7. Return the complete PreCallDiagnosticReport.
   */
  async run(): Promise<PreCallDiagnosticReport> {
    const context = createDiagnosticContext(this.options);
    let call: CallLike | undefined;

    try {
      // Establish temporary diagnostic call
      call = this.createDiagnosticCall();
      context.call = call;
      context.timings.callCreatedAt = Date.now();

      // Wait for call setup (placeholder — real implementation in future tickets)
      // For T1, we just record the timing
      context.timings.callActiveAt = Date.now();

      // Collect stats samples from the diagnostic call
      await this.collectSamples(context);

      // Mark completion before building the report so timings include it
      context.timings.completedAt = Date.now();

      // Build module reports
      const ice = await this.getIceReport(context);
      const network = await this.getNetworkReport(context);
      const media = await this.getMediaReport(context);
      const microphone = await this.getMicrophoneReport(context);

      // Build timings report
      const timings = this.buildTimingsReport(context);

      // Build partial report
      const partialReport: Partial<PreCallDiagnosticReport> = {
        version: 1,
        ice,
        network,
        media,
        microphone,
        timings,
        raw: {
          stats: undefined,
          samples: context.statsSamples.length > 0 ? context.statsSamples : undefined,
        },
      };

      // Build verdict
      const { verdict, reasons } = buildVerdict(partialReport, context);

      const report: PreCallDiagnosticReport = {
        version: 1,
        verdict,
        reasons: reasons.length > 0 ? reasons : undefined,
        timings,
        ice,
        network,
        media,
        microphone,
        raw: partialReport.raw,
      };

      return report;
    } catch (error) {
      context.error = error instanceof Error ? error : new Error(String(error));
      context.timings.completedAt = Date.now();

      // Return an error report with whatever we collected
      const timings = this.buildTimingsReport(context);
      const { verdict, reasons } = buildVerdict({}, context);

      return {
        version: 1,
        verdict: verdict ?? 'inconclusive',
        reasons: reasons.length > 0 ? reasons : undefined,
        timings,
      };
    } finally {
      // Cleanup temporary resources — must await because cleanupCall is async
      // and hangup() may return a Promise (real SDK Call).
      if (call && this.options.autoHangup !== false) {
        await this.cleanupCall(call);
      }
      context.timings.completedAt = Date.now();
    }
  }

  /**
   * Create a temporary diagnostic call using the client dependency.
   */
  private createDiagnosticCall(): CallLike {
    const { client, destinationNumber, callerName, callerNumber, audio } =
      this.options;

    return client.newCall({
      destinationNumber,
      callerName,
      callerNumber,
      audio,
      debug: true,
    });
  }

  /**
   * Collect stats samples during the diagnostic call.
   *
   * Calls `peerConnection.getStats()` at regular intervals and pushes
   * parsed stats frames into `context.statsSamples` so that module
   * builders (media, network, etc.) can consume real data.
   *
   * If the call has no `peerConnection`, or if `getStats()` throws,
   * the method exits gracefully — modules will see an empty
   * `statsSamples` array and produce appropriate `media_no_stats`
   * diagnostics.
   */
  private async collectSamples(context: PreCallDiagnosticContext): Promise<void> {
    const pc = context.call?.peerConnection;
    if (!pc) {
      // No peer connection available — wait the configured duration
      // so the diagnostic call still stays active, but collect nothing.
      const durationMs = this.options.durationMs ?? DEFAULT_DURATION_MS;
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      return;
    }

    const durationMs = this.options.durationMs ?? DEFAULT_DURATION_MS;
    const intervalMs = this.options.statsSampleIntervalMs ?? DEFAULT_STATS_SAMPLE_INTERVAL_MS;
    const startTime = Date.now();

    // Collect at least one sample immediately, then at intervals
    while (true) {
      try {
        const rawStats = await pc.getStats();
        const frame = parseStatsFrame(rawStats);
        context.statsSamples.push(frame);
      } catch {
        // Stats collection failed — skip this sample.
        // Modules will see fewer frames than expected and can
        // report missing stats accordingly.
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= durationMs) {
        break;
      }

      // Wait for the next interval (or the remaining duration, whichever is shorter)
      const remaining = durationMs - elapsed;
      const waitMs = Math.min(intervalMs, remaining);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  /**
   * Build the ICE report section.
   * Delegates to the ICE module builder.
   */
  private async getIceReport(
    context: PreCallDiagnosticContext
  ): Promise<PreCallDiagnosticReport['ice']> {
    const iceEnabled = this.options.ice !== false;
    if (!iceEnabled) {
      return undefined;
    }
    return buildPreCallIceReport(context);
  }

  /**
   * Build the network report section.
   * Delegates to the network module builder.
   */
  private async getNetworkReport(
    context: PreCallDiagnosticContext
  ): Promise<PreCallDiagnosticReport['network']> {
    const networkEnabled = this.options.network !== false;
    if (!networkEnabled) {
      return undefined;
    }
    return buildPreCallNetworkReport(context);
  }

  /**
   * Build the media report section.
   * Delegates to the media module builder.
   */
  private async getMediaReport(
    context: PreCallDiagnosticContext
  ): Promise<PreCallDiagnosticReport['media']> {
    const mediaEnabled = this.options.media !== false;
    if (!mediaEnabled) {
      return undefined;
    }
    return buildPreCallMediaReport(context);
  }

  /**
   * Build the microphone report section.
   * Delegates to the microphone module builder.
   */
  private async getMicrophoneReport(
    context: PreCallDiagnosticContext
  ): Promise<PreCallDiagnosticReport['microphone']> {
    const micEnabled = this.options.microphone !== false;
    if (!micEnabled) {
      return undefined;
    }
    return buildPreCallMicrophoneReport(context);
  }

  /**
   * Build the timings report from the diagnostic context.
   */
  private buildTimingsReport(
    context: PreCallDiagnosticContext
  ): PreCallTimingsReport | undefined {
    const { timings } = context;
    return {
      callCreateMs: timings.callCreatedAt
        ? timings.callCreatedAt - timings.startedAt
        : undefined,
      callSetupMs:
        timings.callCreatedAt && timings.callActiveAt
          ? timings.callActiveAt - timings.callCreatedAt
          : undefined,
      totalMs: timings.completedAt
        ? timings.completedAt - timings.startedAt
        : undefined,
      startedAt: timings.startedAt,
      completedAt: timings.completedAt,
    };
  }

  /**
   * Clean up a temporary diagnostic call.
   * Awaits hangup() (which may return a Promise from the real SDK Call)
   * and swallows/logs any errors so the diagnostic report is never lost.
   */
  private async cleanupCall(call: CallLike): Promise<void> {
    try {
      await call.hangup();
    } catch (error) {
      // Swallow cleanup errors — the diagnostic report is already built.
      // Log at debug level for troubleshooting without noise.
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[PreCallDiagnostic] cleanupCall error:', error);
      }
    }
  }
}
