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
      // For now, we just record the timing when the call becomes active
      context.timings.callActiveAt = Date.now();

      // Collect stats samples from the diagnostic call
      await this.collectSamples(call, context);

      // Mark completion before building the report so timings include it
      context.timings.completedAt = Date.now();

      // Build module reports
      const ice = await this.getIceReport(context);
      const network = this.getNetworkReport(context);
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
   * Periodically polls the diagnostic call's stats source (call.getStats()
   * or call.peerConnection.getStats()), normalizes each RTCStatsReport into
   * a frame matching the SDK stats shapes, and pushes frames into
   * context.statsSamples for module builders (e.g. network report).
   */
  private async collectSamples(
    call: Call,
    context: PreCallDiagnosticContext
  ): Promise<void> {
    const durationMs = this.options.durationMs ?? DEFAULT_DURATION_MS;
    const intervalMs = this.options.statsSampleIntervalMs ?? DEFAULT_STATS_SAMPLE_INTERVAL_MS;

    const startTime = Date.now();
    const deadline = startTime + Math.min(durationMs, DEFAULT_DURATION_MS);

    // Collect at least one sample immediately
    await this.collectOneSample(call, context);

    // Continue collecting at the configured interval until the duration expires
    while (Date.now() < deadline) {
      const nextSampleTime = Math.min(
        startTime + Math.round((context.statsSamples.length) * intervalMs),
        deadline
      );
      const waitMs = nextSampleTime - Date.now();
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      if (Date.now() >= deadline) break;
      await this.collectOneSample(call, context);
    }
  }

  /**
   * Resolve the RTCPeerConnection from a real SDK Call object.
   *
   * The real SDK Call exposes `peer.instance` (BaseCall.peer.instance)
   * as the RTCPeerConnection. Test mocks provide `peer.instance` via
   * `as unknown as Call` casts.
   */
  private resolvePeerConnection(call: Call): RTCPeerConnection | undefined {
    if (call.peer?.instance) return call.peer.instance;
    return undefined;
  }

  /**
   * Collect a single stats sample from the diagnostic call and push it
   * into context.statsSamples.
   *
   * Tries call.getStats() first (test-friendly override), then falls back
   * to the peer connection's getStats(). Normalizes the raw RTCStatsReport
   * into a structured frame that buildPreCallNetworkReport() can consume.
   */
  private async collectOneSample(
    call: Call,
    context: PreCallDiagnosticContext
  ): Promise<void> {
    try {
      let rawStats: RTCStatsReport | unknown | undefined;

      // Prefer call.getStats() — allows tests to inject stats without
      // needing a full RTCPeerConnection mock.
      //
      // IMPORTANT: The real SDK BaseCall.getStats(callback, constraints) is
      // callback-based and returns undefined, not a Promise<RTCStatsReport>.
      // When call.getStats exists but returns undefined (or a non-thenable),
      // we must fall through to peerConnection.getStats() so that production
      // calls still collect stats. The SDK's callback-style getStats has
      // length > 0 (it declares 2 parameters), while the real SDK Call type
      // declares getStats(): Promise<...> with length === 0. We use this to
      // distinguish the two shapes without calling the wrong one.
      if (typeof call.getStats === 'function' && call.getStats.length === 0) {
        // Promise-returning, zero-arg getStats (test-friendly override).
        // Cast to a zero-arg function type: we verified length === 0 above,
        // so this is NOT the SDK's callback-based getStats(callback, constraints).
        const getStatsZeroArg = call.getStats as unknown as () => Promise<RTCStatsReport | unknown>;
        rawStats = await getStatsZeroArg();
      }

      // Fall back to peer connection getStats() when:
      // - call.getStats doesn't exist, OR
      // - call.getStats is the SDK's callback-based version (length > 0), OR
      // - call.getStats() returned undefined/void (safety net)
      const pc = this.resolvePeerConnection(call);
      if (!rawStats && pc && typeof pc.getStats === 'function') {
        rawStats = await pc.getStats();
      }

      if (!rawStats) return;

      const frame = this.normalizeStatsFrame(rawStats);
      if (frame) {
        context.statsSamples.push(frame);
      }
    } catch {
      // Stats collection failures should not abort the diagnostic.
      // Individual sample failures are non-fatal — the report is built
      // from whatever samples were successfully collected.
    }
  }

  /**
   * Normalize a raw RTCStatsReport (or equivalent) into a structured
   * stats frame that buildPreCallNetworkReport() can consume.
   *
   * Handles two shapes:
   * 1. Standard RTCStatsReport (Map-like with typed stat entries)
   * 2. Pre-normalized frame objects (e.g. from test mocks or the SDK's
   *    CallReportCollector IStatsInterval shape) — passed through directly.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeStatsFrame(rawStats: RTCStatsReport | unknown): Record<string, any> | undefined {
    // If rawStats is already a structured object (not a Map/RTCStatsReport),
    // pass it through — this supports test mocks and IStatsInterval shapes.
    if (rawStats && typeof rawStats === 'object' && !(rawStats instanceof Map)) {
      // Check if it behaves like a real RTCStatsReport (has forEach and is
      // Map-like with a size property) vs. a plain pre-normalized frame object.
      const obj = rawStats as Record<string, unknown>;
      const hasForEach = typeof obj.forEach === 'function';
      const hasSize = typeof obj.size === 'number';
      if (hasForEach && hasSize) {
        // It's a real RTCStatsReport — parse it
        return this.parseRTCStatsReport(rawStats as RTCStatsReport);
      }
      // It's a pre-normalized frame — pass through
      return rawStats as Record<string, unknown>;
    }

    // Map-like RTCStatsReport
    if (rawStats instanceof Map || (rawStats && typeof (rawStats as Map<unknown, unknown>).forEach === 'function')) {
      return this.parseRTCStatsReport(rawStats as RTCStatsReport);
    }

    return undefined;
  }

  /**
   * Parse a standard RTCStatsReport into a structured stats frame.
   *
   * Reads inbound-rtp, outbound-rtp, remote-inbound-rtp, and transport
   * stat entries and organizes them into the audio/connection shape that
   * buildPreCallNetworkReport() expects.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseRTCStatsReport(report: RTCStatsReport): Record<string, any> {
    // Prefer the actual RTCStats timestamp from the report rather than the
    // wall-clock time of parsing. RTCStatsReport is a Map of RTCStats objects,
    // each of which carries its own `timestamp` (epoch ms) from the browser;
    // the report itself may also expose a top-level `timestamp`. Using the
    // stats timestamp keeps bitrate/time-delta math consistent with the
    // browser's sample timing. Fall back to Date.now() only if no stats
    // timestamp is present (e.g. synthetic report with no entries).
    let timestamp: number | undefined =
      typeof (report as unknown as { timestamp?: unknown }).timestamp === 'number'
        ? (report as unknown as { timestamp: number }).timestamp
        : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioInbound: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioOutbound: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remoteAudioInbound: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection: Record<string, any> = {};

    report.forEach((stats) => {
      const entry = stats as Record<string, unknown>;
      // Capture the first per-stat timestamp if we don't yet have one.
      if (timestamp === undefined && typeof entry.timestamp === 'number') {
        timestamp = entry.timestamp;
      }
      if (entry.kind === 'audio' || entry.mediaType === 'audio') {
        switch (entry.type) {
          case 'inbound-rtp':
            audioInbound.push({
              packetsReceived: entry.packetsReceived,
              packetsLost: entry.packetsLost,
              jitter: entry.jitter,
              bytesReceived: entry.bytesReceived,
            });
            break;
          case 'outbound-rtp':
            audioOutbound.push({
              packetsSent: entry.packetsSent,
              bytesSent: entry.bytesSent,
            });
            break;
          case 'remote-inbound-rtp':
            remoteAudioInbound.push({
              roundTripTime: entry.roundTripTime,
              jitter: entry.jitter,
              packetsReceived: entry.packetsReceived,
              packetsLost: entry.packetsLost,
            });
            break;
        }
      }

      // Transport-level stats (candidate-pair RTT, bytes, packets)
      if (entry.type === 'candidate-pair' && (entry as Record<string, unknown>).selected === true) {
        connection.currentRoundTripTime = entry.currentRoundTripTime;
        connection.bytesSent = entry.bytesSent;
        connection.bytesReceived = entry.bytesReceived;
        connection.packetsSent = entry.packetsSent;
        connection.packetsReceived = entry.packetsReceived;
      }
      if (entry.type === 'transport') {
        if (entry.bytesSent !== undefined) connection.bytesSent = entry.bytesSent;
        if (entry.bytesReceived !== undefined) connection.bytesReceived = entry.bytesReceived;
      }
    });

    // Fall back to wall-clock time only if the report carried no stats
    // timestamp (e.g. a synthetic/empty report). This keeps the frame
    // timestamp defined for downstream bitrate/time-delta math.
    if (timestamp === undefined) {
      timestamp = Date.now();
    }

    const frame: Record<string, unknown> = { timestamp };
    if (audioInbound.length > 0 || audioOutbound.length > 0) {
      frame.audio = {
        ...(audioInbound.length > 0 ? { inbound: audioInbound } : {}),
        ...(audioOutbound.length > 0 ? { outbound: audioOutbound } : {}),
      };
    }
    if (remoteAudioInbound.length > 0) {
      frame.remote = { audio: { inbound: remoteAudioInbound } };
    }
    if (Object.keys(connection).length > 0) {
      frame.connection = connection;
    }
    return frame;
  }

  /**
   * Normalize a module option that may be a boolean or an options object
   * with an `enabled` flag into a single enabled boolean.
   *
   * - `undefined` / `true` → enabled (default-on)
   * - `false` → disabled
   * - `{ enabled: false }` → disabled
   * - `{ enabled: true }` (or any object without an `enabled: false`) → enabled
   *
   * This is the single normalization point in the runner so that the
   * `enabled: false` form is honored consistently instead of being
   * duplicated across each module getter. Module builders also defend
   * independently so they remain unit-testable with a disabled context.
   *
   * The parameter is intentionally loose (`unknown`) so it accepts every
   * module option shape (network/media use `{ enabled? }`; ice/microphone
   * use their own option objects without an `enabled` field).
   */
  private isModuleEnabled(opt: unknown): boolean {
    if (opt === false) return false;
    if (opt === undefined || opt === true) return true;
    if (typeof opt === 'object' && opt !== null) {
      const enabled = (opt as { enabled?: unknown }).enabled;
      if (enabled === false) return false;
    }
    return true;
  }

  /**
   * Build the ICE report section.
   * Delegates to the ICE module builder.
   */
  private async getIceReport(
    context: PreCallDiagnosticContext
  ): Promise<PreCallDiagnosticReport['ice']> {
    if (!this.isModuleEnabled(this.options.ice)) {
      return undefined;
    }
    return buildPreCallIceReport(context);
  }

  /**
   * Build the network report section.
   * Delegates to the network module builder.
   */
  private getNetworkReport(
    context: PreCallDiagnosticContext
  ): PreCallDiagnosticReport['network'] {
    if (!this.isModuleEnabled(this.options.network)) {
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
    if (!this.isModuleEnabled(this.options.media)) {
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
    if (!this.isModuleEnabled(this.options.microphone)) {
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
