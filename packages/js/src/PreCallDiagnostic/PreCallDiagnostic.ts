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
} from './types';
import Call from '../Modules/Verto/webrtc/Call';
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
import { createTimingsCollector } from './modules/timings';
import type { TimingsCollector } from './modules/timings';
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
    const timings = createTimingsCollector();
    let call: Call | undefined;

    try {
      // Establish temporary diagnostic call
      call = this.createDiagnosticCall();
      context.call = call;

      // Wait for call setup (placeholder — real implementation in future tickets)
      // For T1, the call-active timing comes from the SDK establishment marks.

      // Collect stats samples (placeholder — real sampling in future tickets).
      // collectSamples marks the stats-sampling phase boundaries on the collector.
      await this.collectSamples(timings);

      // Build module reports
      const ice = await this.getIceReport(context);
      const network = await this.getNetworkReport(context);
      const media = await this.getMediaReport(context);
      const microphone = await this.getMicrophoneReport(context);

      // Build timings report BEFORE cleanup. Establishment timings are read
      // from the call's performance marks, which are cleared by `_finalize()`
      // during `call.hangup()` in the finally block below.
      timings.markCompleted();
      const timingsReport = timings.build({ call, callId: call?.id });

      // Build partial report
      const partialReport: Partial<PreCallDiagnosticReport> = {
        version: 1,
        ice,
        network,
        media,
        microphone,
        timings: timingsReport,
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
        timings: timingsReport,
        ice,
        network,
        media,
        microphone,
        raw: partialReport.raw,
      };

      return report;
    } catch (error) {
      context.error = error instanceof Error ? error : new Error(String(error));

      // Return an error report with whatever we collected
      timings.markCompleted();
      const timingsReport = timings.build({ call, callId: call?.id });
      const { verdict, reasons } = buildVerdict({}, context);

      return {
        version: 1,
        verdict: verdict ?? 'inconclusive',
        reasons: reasons.length > 0 ? reasons : undefined,
        timings: timingsReport,
      };
    } finally {
      // Cleanup temporary resources — must await because cleanupCall is async
      // and hangup() returns a Promise (real SDK Call). The timings collector
      // has already read establishment marks above, so clearing them during
      // hangup → _finalize() is safe.
      timings.markCleanupStarted();
      if (call && this.options.autoHangup !== false) {
        await this.cleanupCall(call);
      }
      timings.markCleanupCompleted();
    }
  }

  /**
   * Create a temporary diagnostic call using the client dependency.
   */
  private createDiagnosticCall(): Call {
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
   * Marks the stats-sampling phase boundaries on the supplied collector.
   * Placeholder for T1 — real sampling will be added in future tickets.
   * This method exists as an extension point.
   */
  private async collectSamples(timings: TimingsCollector): Promise<void> {
    // Mark the stats-sampling phase for the timings report.
    timings.markStatsSamplingStarted();

    // Placeholder — real stats sampling to be implemented in future tickets.
    // The duration and interval options will be used here to control
    // how many samples are collected.
    const durationMs = this.options.durationMs ?? DEFAULT_DURATION_MS;
    // Wait for the configured duration so the diagnostic call stays active
    await new Promise((resolve) => setTimeout(resolve, Math.min(durationMs, DEFAULT_DURATION_MS)));

    // Mark first-stats after the sampling window (placeholder — real
    // implementation marks this on the first received sample).
    timings.markFirstStats();
    timings.markStatsSamplingCompleted();
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
   * Clean up a temporary diagnostic call.
   * Awaits hangup() (which returns a Promise from the real SDK Call)
   * and swallows/logs any errors so the diagnostic report is never lost.
   */
  private async cleanupCall(call: Call): Promise<void> {
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
