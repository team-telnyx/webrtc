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
} from './types';
import Call from '../Modules/Verto/webrtc/Call';
import type { ICallOptions } from '../utils/interfaces';
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
    let call: Call | undefined;

    try {
      // Establish temporary diagnostic call
      call = this.createDiagnosticCall();
      context.call = call;
      context.timings.callCreatedAt = Date.now();

      // Wait for call setup (placeholder — real implementation in future tickets)
      // For T1, we just record the timing
      context.timings.callActiveAt = Date.now();

      // Collect stats samples (placeholder — real sampling in future tickets)
      await this.collectSamples();

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
      // and hangup() returns a Promise (real SDK Call).
      if (call && this.options.autoHangup !== false) {
        await this.cleanupCall(call);
      }
      context.timings.completedAt = Date.now();
    }
  }

  /**
   * Create a temporary diagnostic call using the client dependency.
   *
   * The diagnostic ICE servers (custom or client-default) live in
   * `options.rtcConfig.iceServers`. The public SDK call path consumes
   * per-call ICE servers via `ICallOptions.iceServers` (which overrides
   * the client default for this single call without mutating persistent
   * client config), so we pass them through here instead of carrying a
   * full `rtcConfig` (the SDK's per-call surface only exposes `iceServers`).
   * When `rtcConfig` is undefined or carries no ICE servers, no `iceServers`
   * is forwarded and the call uses the client's own default ICE
   * configuration (normal behavior).
   */
  private createDiagnosticCall(): Call {
    const { client, destinationNumber, callerName, callerNumber, audio } =
      this.options;

    const callOptions: ICallOptions = {
      destinationNumber,
      callerName,
      callerNumber,
      audio,
      debug: true,
    };

    // Only forward `iceServers` when the diagnostic options carry a non-empty
    // `rtcConfig.iceServers`. The TelnyxRTC public methods
    // (`runPreCall`/`runNetworkCheck`/`runMicrophoneCheck`) always build
    // `rtcConfig` from `options.iceServers ?? this.iceServers`, so this
    // branch is taken on every diagnostic run that goes through the public
    // API. Lower-level callers who construct `PreCallDiagnosticOptions`
    // directly without `rtcConfig` (or with an empty `iceServers` array)
    // fall back to the client's default ICE configuration (matches normal
    // `client.newCall()` behavior).
    if (this.options.rtcConfig?.iceServers?.length) {
      callOptions.iceServers = this.options.rtcConfig.iceServers;
    }

    return client.newCall(callOptions);
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
