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
 * T10 adds timing/lifecycle measurements with monotonic clock support.
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
  nowMonoMs,
} from './context';
import type {
  PreCallDiagnosticContext,
} from './context';
import { buildPreCallIceReport } from './modules/ice';
import { buildPreCallNetworkReport } from './modules/network';
import { buildPreCallMediaReport } from './modules/media';
import { buildPreCallMicrophoneReport } from './modules/microphone';
import { buildVerdict } from './modules/verdict';

/** Default timeout for the overall diagnostic run in milliseconds. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_TIMEOUT_MS = 30000;

/** Default timeout for the call setup phase in milliseconds. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_CALL_SETUP_TIMEOUT_MS = 15000;

/** Default interval between stats samples in milliseconds. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_STATS_SAMPLE_INTERVAL_MS = 1000;

/** Default duration to keep the diagnostic call active in milliseconds. */
const DEFAULT_DURATION_MS = 5000;

/**
 * Internal structure for holding partial report data before timings
 * are finalized. This allows cleanup timing to be included in the
 * final report even though cleanup runs in the finally block.
 */
interface PartialReportData {
  ice?: PreCallDiagnosticReport['ice'];
  network?: PreCallDiagnosticReport['network'];
  media?: PreCallDiagnosticReport['media'];
  microphone?: PreCallDiagnosticReport['microphone'];
  verdict?: PreCallDiagnosticReport['verdict'];
  reasons?: PreCallDiagnosticReport['reasons'];
  raw?: PreCallDiagnosticReport['raw'];
  error?: Error;
}

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
   * 7. Build the timings report (including cleanup timing).
   * 8. Return the complete PreCallDiagnosticReport.
   */
  async run(): Promise<PreCallDiagnosticReport> {
    const context = createDiagnosticContext(this.options);
    let call: CallLike | undefined;
    let partialData: PartialReportData;

    try {
      // Establish temporary diagnostic call
      call = this.createDiagnosticCall();
      context.call = call;
      context.timings.callCreatedAtMonoMs = nowMonoMs();

      // Set up PeerConnection event listeners for ICE/media timing
      this.setupTimingListeners(call, context);

      // Wait for call setup (placeholder — real implementation in future tickets)
      // For T1, we just record the timing
      context.timings.callActiveAtMonoMs = nowMonoMs();

      // Collect stats samples (placeholder — real sampling in future tickets)
      context.timings.statsSamplingStartedAtMonoMs = nowMonoMs();
      await this.collectSamples();
      context.timings.statsSamplingCompletedAtMonoMs = nowMonoMs();

      // Build module reports
      const ice = await this.getIceReport(context);
      const network = await this.getNetworkReport(context);
      const media = await this.getMediaReport(context);
      const microphone = await this.getMicrophoneReport(context);

      // Build partial report (without timings — those are finalized after cleanup)
      const partialReport: Partial<PreCallDiagnosticReport> = {
        version: 1,
        ice,
        network,
        media,
        microphone,
        raw: {
          stats: undefined,
          samples: context.statsSamples.length > 0 ? context.statsSamples : undefined,
        },
      };

      // Build verdict
      const { verdict, reasons } = buildVerdict(partialReport, context);

      partialData = {
        ice,
        network,
        media,
        microphone,
        verdict,
        reasons: reasons.length > 0 ? reasons : undefined,
        raw: partialReport.raw,
      };
    } catch (error) {
      context.error = error instanceof Error ? error : new Error(String(error));
      partialData = { error: context.error };
    } finally {
      // Cleanup temporary resources — must await because cleanupCall is async
      // and hangup() may return a Promise (real SDK Call).
      context.timings.cleanupStartedAtMonoMs = nowMonoMs();

      if (call && this.options.autoHangup !== false) {
        await this.cleanupCall(call);
      }

      context.timings.cleanupCompletedAtMonoMs = nowMonoMs();

      // Record final completion timestamps (after cleanup)
      context.timings.completedAtEpochMs = Date.now();
      context.timings.completedAtMonoMs = nowMonoMs();
    }

    // Build the timings report AFTER cleanup so cleanup timing is included
    const timings = this.buildTimingsReport(context);

    // Assemble the final report
    if (partialData.error) {
      const { verdict, reasons } = buildVerdict({}, context);
      return {
        version: 1,
        verdict: verdict ?? 'inconclusive',
        reasons: reasons.length > 0 ? reasons : undefined,
        timings,
      };
    }

    return {
      version: 1,
      verdict: partialData.verdict,
      reasons: partialData.reasons,
      timings,
      ice: partialData.ice,
      network: partialData.network,
      media: partialData.media,
      microphone: partialData.microphone,
      raw: partialData.raw,
    };
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
   * Set up PeerConnection event listeners for ICE and media timing.
   *
   * These listeners observe the call's PeerConnection for ICE connection
   * state changes and track events to capture timing marks without
   * altering call behavior.
   */
  private setupTimingListeners(
    call: CallLike,
    context: PreCallDiagnosticContext
  ): void {
    const pc = call.peerConnection;
    if (!pc) return;

    // ICE connection state listener
    const onIceConnectionStateChange = (): void => {
      try {
        const state = pc.iceConnectionState;
        if (
          state === 'connected' ||
          state === 'completed'
        ) {
          if (!context.timings.iceConnectedAtMonoMs) {
            context.timings.iceConnectedAtMonoMs = nowMonoMs();
          }
          // Remove listener after first connected/completed event
          pc.removeEventListener(
            'iceconnectionstatechange',
            onIceConnectionStateChange
          );
        }
      } catch {
        // Swallow errors from listener — timing must not block behavior
      }
    };

    // Track listener for first media stats detection
    const onTrack = (): void => {
      try {
        if (!context.timings.firstMediaStatsAtMonoMs) {
          context.timings.firstMediaStatsAtMonoMs = nowMonoMs();
        }
        // Remove listener after first track event
        pc.removeEventListener('track', onTrack);
      } catch {
        // Swallow errors from listener — timing must not block behavior
      }
    };

    try {
      pc.addEventListener('iceconnectionstatechange', onIceConnectionStateChange);
      pc.addEventListener('track', onTrack);
    } catch {
      // PeerConnection may not support addEventListener in all environments
      // Swallow — timing is optional
    }
  }

  /**
   * Collect stats samples during the diagnostic call.
   *
   * Placeholder for T1 — real sampling will be added in future tickets.
   * This method exists as an extension point.
   */
  private async collectSamples(): Promise<void> {
    // Placeholder — real stats sampling to be implemented in future tickets.
    // The duration and interval options will be used here to control
    // how many samples are collected.
    const durationMs = this.options.durationMs ?? DEFAULT_DURATION_MS;
    // Wait for the configured duration so the diagnostic call stays active
    await new Promise((resolve) => setTimeout(resolve, Math.min(durationMs, DEFAULT_DURATION_MS)));
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
   * Compute a safe duration from two monotonic timestamps.
   * Returns undefined if either timestamp is missing, or if the
   * resulting duration is negative, NaN, or Infinity.
   */
  private safeDurationMs(
    startMonoMs?: number,
    endMonoMs?: number
  ): number | undefined {
    if (startMonoMs == null || endMonoMs == null) return undefined;
    const duration = endMonoMs - startMonoMs;
    if (!isFinite(duration) || duration < 0) return undefined;
    return duration;
  }

  /**
   * Build the timings report from the diagnostic context.
   *
   * Computes durations using monotonic timestamps and epoch timestamps
   * for absolute correlation. Omits fields when timing sources are
   * unavailable — never reports fake zero-duration values.
   */
  private buildTimingsReport(
    context: PreCallDiagnosticContext
  ): PreCallTimingsReport | undefined {
    const { timings } = context;

    const totalMs = this.safeDurationMs(
      timings.startedAtMonoMs,
      timings.completedAtMonoMs
    );
    const callCreateMs = this.safeDurationMs(
      timings.startedAtMonoMs,
      timings.callCreatedAtMonoMs
    );
    const callSetupMs = this.safeDurationMs(
      timings.callCreatedAtMonoMs,
      timings.callActiveAtMonoMs
    );
    const callAnsweredMs = this.safeDurationMs(
      timings.callCreatedAtMonoMs,
      timings.callAnsweredAtMonoMs
    );
    const iceConnectedMs = this.safeDurationMs(
      timings.callCreatedAtMonoMs,
      timings.iceConnectedAtMonoMs
    );
    const firstStatsMs = this.safeDurationMs(
      timings.startedAtMonoMs,
      timings.firstStatsAtMonoMs
    );
    const firstMediaStatsMs = this.safeDurationMs(
      timings.startedAtMonoMs,
      timings.firstMediaStatsAtMonoMs
    );
    const statsSamplingMs = this.safeDurationMs(
      timings.statsSamplingStartedAtMonoMs,
      timings.statsSamplingCompletedAtMonoMs
    );
    const cleanupMs = this.safeDurationMs(
      timings.cleanupStartedAtMonoMs,
      timings.cleanupCompletedAtMonoMs
    );

    return {
      startedAt: timings.startedAtEpochMs,
      completedAt: timings.completedAtEpochMs,
      totalMs,
      callCreateMs,
      callSetupMs,
      callAnsweredMs,
      iceConnectedMs,
      firstStatsMs,
      firstMediaStatsMs,
      statsSamplingMs,
      cleanupMs,
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
