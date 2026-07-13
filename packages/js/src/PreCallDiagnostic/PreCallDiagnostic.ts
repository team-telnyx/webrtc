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
  PreCallIceReport,
  PreCallIceCandidateCounts,
  PreCallIceServerResult,
} from './types';
import Call from '../Modules/Verto/webrtc/Call';
import { createDiagnosticContext } from './context';
import type { PreCallDiagnosticContext } from './context';
import { buildPreCallIceReport, testSingleIceServer } from './modules/ice';
import { buildPreCallNetworkReport } from './modules/network';
import { buildPreCallMediaReport } from './modules/media';
import { buildPreCallMicrophoneReport } from './modules/microphone';
import { createTimingsCollector } from './modules/timings';
import type { TimingsCollector } from './modules/timings';
import { buildVerdict } from './modules/verdict';

/**
 * Default timeout for the call setup phase in milliseconds.
 *
 * Applied when `options.callSetupTimeoutMs` is omitted. This is the hard
 * upper bound for the diagnostic call to reach the `active` (established)
 * state; on expiry the report returns `verdict: 'inconclusive'` with a
 * `call_setup_timeout` reason and omits ICE/network/media/microphone data.
 *
 * Aligned with the public `RunPreCallOptions.callSetupTimeoutMs` documented
 * default of ~30000ms (VSDK-412). Calls that establish between 15s and 30s
 * must not fail despite the old 15s internal default.
 */
const DEFAULT_CALL_SETUP_TIMEOUT_MS = 30000;

/** Default interval between stats samples in milliseconds. */
const DEFAULT_STATS_SAMPLE_INTERVAL_MS = 1000;

/** Default duration to keep the diagnostic call active in milliseconds. */
const DEFAULT_DURATION_MS = 5000;

/** Reason code emitted when the diagnostic call fails to establish in time. */
const CALL_SETUP_TIMEOUT_REASON = 'call_setup_timeout';

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
   * Dispatches on `options.mode`:
   * - `'full'` (default): establish a real diagnostic call via
   *   `client.newCall()`, wait for it to reach the `active` state (enforced
   *   by `callSetupTimeoutMs`), then sample stats for `durationMs` and run
   *   all four modules.
   * - `'network-only'`: build a raw `RTCPeerConnection` from the client's
   *   ICE servers, gather candidates for `durationMs`, then close. No call
   *   is placed. Only the ICE module runs.
   * - `'microphone-only'`: run `getUserMedia` + Web Audio level analysis for
   *   `durationMs`, then stop tracks. No call is placed. Only the
   *   microphone module runs.
   */
  async run(): Promise<PreCallDiagnosticReport> {
    const context = createDiagnosticContext(this.options);
    const timings = createTimingsCollector();

    switch (this.options.mode) {
      case 'network-only':
        return this.runNetworkOnly(context, timings);
      case 'microphone-only':
        return this.runMicrophoneOnly(context, timings);
      case 'full':
      default:
        return this.runFull(context, timings);
    }
  }

  /**
   * Full diagnostic run — establishes a real call and runs all modules.
   *
   * B2/B3: the sampling timer (`durationMs`) starts ONLY after the call
   * reaches the `active` state. If the call does not establish within
   * `callSetupTimeoutMs`, the report returns `verdict: 'inconclusive'`
   * with a `call_setup_timeout` reason and no module data.
   */
  private async runFull(
    context: PreCallDiagnosticContext,
    timings: TimingsCollector
  ): Promise<PreCallDiagnosticReport> {
    let call: Call | undefined;
    // Built inside try/catch, finalized in the finally block after cleanup so
    // the timings report includes cleanupMs and an accurate totalMs.
    let fullResult: PreCallDiagnosticReport | undefined;

    try {
      // Establish temporary diagnostic call
      call = this.createDiagnosticCall();
      context.call = call;

      // B2/B3: wait for the call to reach the established ('active') state,
      // enforcing callSetupTimeoutMs. On timeout we return an inconclusive
      // report with a call_setup_timeout reason and NO module data.
      const established = await this.waitForCallEstablishment(call);
      if (!established) {
        timings.markCompleted();
        const timingsReport = timings.build({ call, callId: call?.id });
        return {
          version: 1,
          verdict: 'inconclusive',
          reasons: [
            {
              code: CALL_SETUP_TIMEOUT_REASON,
              message:
                'The diagnostic call did not reach the established state ' +
                `within ${this.effectiveCallSetupTimeoutMs()}ms.`,
              source: 'diagnostic',
            },
          ],
          callId: call?.id,
          timings: timingsReport,
        };
      }

      // Sampling starts only AFTER establishment (B2). The timings collector
      // records phase boundaries around it. markFirstStats() is called inside
      // collectSamples() right after the first sample — NOT after the whole
      // window (VSDK-412 round-10 review).
      timings.markStatsSamplingStarted();
      await this.collectSamples(call, context, timings);
      timings.markStatsSamplingCompleted();

      // Build module reports
      const ice = await this.getIceReport(context);
      const network = this.getNetworkReport(context);
      const media = await this.getMediaReport(context);
      const microphone = await this.getMicrophoneReport(context);

      // Build a PRELIMINARY timings report BEFORE cleanup. Establishment
      // timings are read from the call's performance marks, which are cleared
      // by `_finalize()` during `call.hangup()` in the finally block below, so
      // they must be captured now. The cleanup-duration and final totalMs
      // fields are merged in AFTER the finally block runs (VSDK-412 round-10
      // review: previously the report was built entirely before cleanup, so
      // cleanupMs was permanently absent and totalMs excluded hangup/release).
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
        callId: call?.id,
        raw: {
          stats: undefined,
          samples:
            context.statsSamples.length > 0 ? context.statsSamples : undefined,
        },
      };

      // Build verdict + warnings
      const { verdict, reasons, warnings } = buildVerdict(
        partialReport,
        context
      );

      // Stash the report parts; we finalize timings AFTER the finally block
      // runs cleanup so cleanupMs and totalMs include hangup/resource release.
      // The establishment-timing fields were already captured into
      // timingsReport above (before marks were cleared).
      fullResult = {
        version: 1,
        verdict,
        reasons: reasons.length > 0 ? reasons : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        timings: timingsReport,
        ice,
        network,
        media,
        microphone,
        callId: call?.id,
        raw: partialReport.raw,
      };
      return fullResult;
    } catch (error) {
      context.error = error instanceof Error ? error : new Error(String(error));

      // Return an error report with whatever we collected
      timings.markCompleted();
      const timingsReport = timings.build({ call, callId: call?.id });
      const { verdict, reasons, warnings } = buildVerdict({}, context);

      fullResult = {
        version: 1,
        verdict: verdict ?? 'inconclusive',
        reasons: reasons.length > 0 ? reasons : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        callId: call?.id,
        timings: timingsReport,
      };
      return fullResult;
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

      // Merge cleanup duration + final totalMs into the already-built report.
      // The establishment fields were captured before hangup cleared the
      // marks; now that cleanup has finished we can record how long it took
      // and recompute totalMs to span the whole run (VSDK-412 round-10).
      if (fullResult) {
        timings.finalizeTimings(fullResult.timings);
      }
    }
  }

  /**
   * Network-only diagnostic run — gathers ICE candidates from each ICE
   * server independently (B1, per reviewer request).
   *
   * Tests each configured ICE server one at a time (one RTCPeerConnection
   * per server), so the caller can see exactly which servers produce
   * candidates, how long gathering takes for each, and which servers
   * are not working. Also runs a combined gathering pass for the
   * aggregate ICE report (selected pair, server comparison).
   *
   * No `client.newCall()` is invoked and no SIP signaling is involved.
   */
  private async runNetworkOnly(
    context: PreCallDiagnosticContext,
    timings: TimingsCollector
  ): Promise<PreCallDiagnosticReport> {
    let networkResult: PreCallDiagnosticReport | undefined;
    const iceServers = this.getClientIceServers();
    const rtcConfig = this.options.rtcConfig ?? {
      iceServers,
    };
    const effectiveServers = rtcConfig.iceServers ?? iceServers ?? [];
    const durationMs = this.effectiveDurationMs();

    // Per-server results: test each ICE server URL independently and
    // simultaneously. Each server gets its own RTCPeerConnection so
    // candidates are isolated, and they all run in parallel for speed
    // (total wall-clock ≈ durationMs instead of N × durationMs).
    //
    // Flatten multi-URL RTCIceServer entries (e.g. one credential object
    // containing STUN + TURN UDP/TCP URLs) into single-URL servers so every
    // configured endpoint gets its own peer/result/timing (VSDK-412 review:
    // "per-server isolation is still per RTCIceServer object, not per
    // configured URL" — a working TCP URL was obscuring a failed UDP URL).
    const flattenedServers = flattenIceServersByURL(effectiveServers);
    const perServerResults = await Promise.all(
      flattenedServers.map((server) => testSingleIceServer(server, durationMs))
    );

    // Combined gathering pass for the aggregate ICE report
    let pc: RTCPeerConnection | undefined;
    try {
      pc = new RTCPeerConnection(rtcConfig);
      pc.createDataChannel('precall-diagnostic');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      timings.markStatsSamplingStarted();
      await this.waitForIceGathering(pc, durationMs);
      timings.markStatsSamplingCompleted();

      context.call = this.makeCallShim(pc) as unknown as Call;

      const ice = await this.getIceReport(context);

      // Attach per-server results to the ICE report
      if (ice) {
        ice.perServerResults = perServerResults;
      }

      timings.markCompleted();
      const timingsReport = timings.build({});

      // Populate ICE gathering timing fields from the per-server results.
      // In network-only mode there is no SDK call, so establishment timings
      // (which come from getEstablishmentTimings()) are empty. We derive the
      // ICE gathering timing fields from the per-server results instead,
      // so the timings report is not empty (VSDK-412 comment #19: "Timings
      // in verdicts didn't change at all" — the establishment fields were
      // missing because no SDK call was made).
      this.populateNetworkOnlyTimings(timingsReport, perServerResults);

      const partialReport: Partial<PreCallDiagnosticReport> = {
        version: 1,
        ice,
        timings: timingsReport,
      };
      const { verdict, reasons, warnings } = buildVerdict(
        partialReport,
        context
      );

      networkResult = {
        version: 1,
        verdict,
        reasons: reasons.length > 0 ? reasons : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        timings: timingsReport,
        ice,
        raw: undefined,
      };
      return networkResult;
    } catch (error) {
      context.error = error instanceof Error ? error : new Error(String(error));
      timings.markCompleted();
      const timingsReport = timings.build({});
      this.populateNetworkOnlyTimings(timingsReport, perServerResults);
      const { verdict, reasons, warnings } = buildVerdict({}, context);
      networkResult = {
        version: 1,
        verdict: verdict ?? 'inconclusive',
        reasons: reasons.length > 0 ? reasons : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        timings: timingsReport,
        ice:
          perServerResults.length > 0
            ? aggregatePerServerResults(perServerResults)
            : undefined,
      };
      return networkResult;
    } finally {
      timings.markCleanupStarted();
      try {
        pc?.close();
      } catch {
        // ignore close errors
      }
      timings.markCleanupCompleted();

      // Merge cleanupMs + final totalMs into the already-built report
      // (VSDK-412 round-10: previously built before cleanup).
      if (networkResult) {
        timings.finalizeTimings(networkResult.timings);
      }
    }
  }

  /**
   * Populate ICE gathering timing fields on the timings report from the
   * per-server results, for network-only mode where there is no SDK call.
   *
   * Computes:
   * - `firstCandidateMs`: earliest first-candidate time across all servers
   * - `iceGatheringCompletedMs`: latest gathering-complete time
   * - `iceGatheringMs`: total gathering duration (latest complete - 0)
   *
   * These mirror the fields that `getEstablishmentTimings()` would populate
   * in full mode, giving the caller consistent timing data regardless of
   * which diagnostic mode was used (VSDK-412 comment #19).
   */
  private populateNetworkOnlyTimings(
    timingsReport: import('./types').PreCallTimingsReport,
    perServerResults: PreCallIceServerResult[]
  ): void {
    if (perServerResults.length === 0) return;

    let earliestFirstCandidate: number | undefined;
    let latestGatheringMs: number | undefined;

    for (const r of perServerResults) {
      if (r.firstCandidateMs !== undefined) {
        if (
          earliestFirstCandidate === undefined ||
          r.firstCandidateMs < earliestFirstCandidate
        ) {
          earliestFirstCandidate = r.firstCandidateMs;
        }
      }
      if (r.gatheringMs !== undefined) {
        if (
          latestGatheringMs === undefined ||
          r.gatheringMs > latestGatheringMs
        ) {
          latestGatheringMs = r.gatheringMs;
        }
      }
    }

    if (earliestFirstCandidate !== undefined) {
      timingsReport.firstCandidateMs = earliestFirstCandidate;
    }
    if (latestGatheringMs !== undefined) {
      timingsReport.iceGatheringMs = latestGatheringMs;
      timingsReport.iceGatheringCompletedMs = latestGatheringMs;
    }
  }

  /**
   * Microphone-only diagnostic run — checks mic permission/device and
   * optionally captures audio level without placing a call (B1).
   *
   * Delegates to the microphone module (which already encapsulates
   * getUserMedia + Web Audio). No `client.newCall()` is invoked. The other
   * modules (ice/network/media) are disabled via the options set by
   * `TelnyxRTC.runMicrophoneCheck()`.
   */
  private async runMicrophoneOnly(
    context: PreCallDiagnosticContext,
    timings: TimingsCollector
  ): Promise<PreCallDiagnosticReport> {
    try {
      const microphone = await this.getMicrophoneReport(context);

      timings.markCompleted();
      const timingsReport = timings.build({});

      const partialReport: Partial<PreCallDiagnosticReport> = {
        version: 1,
        microphone,
        timings: timingsReport,
      };
      const { verdict, reasons, warnings } = buildVerdict(
        partialReport,
        context
      );

      return {
        version: 1,
        verdict,
        reasons: reasons.length > 0 ? reasons : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        timings: timingsReport,
        microphone,
      };
    } catch (error) {
      context.error = error instanceof Error ? error : new Error(String(error));
      timings.markCompleted();
      const timingsReport = timings.build({});
      const { verdict, reasons, warnings } = buildVerdict({}, context);
      return {
        version: 1,
        verdict: verdict ?? 'inconclusive',
        reasons: reasons.length > 0 ? reasons : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        timings: timingsReport,
      };
    } finally {
      // Microphone module owns its own track cleanup; nothing to do here.
      timings.markCleanupStarted();
      timings.markCleanupCompleted();
    }
  }

  /**
   * Resolve the effective call-setup timeout in ms.
   */
  private effectiveCallSetupTimeoutMs(): number {
    return this.options.callSetupTimeoutMs ?? DEFAULT_CALL_SETUP_TIMEOUT_MS;
  }

  /**
   * Resolve the effective sampling duration in ms.
   */
  private effectiveDurationMs(): number {
    return this.options.durationMs ?? DEFAULT_DURATION_MS;
  }

  /**
   * Wait for the diagnostic call to reach the established (`active`) state,
   * enforcing `callSetupTimeoutMs` (B2/B3).
   *
   * Returns true when the call is established, false on timeout. The call's
   * public `state` string is set to `'active'` by the SDK when the underlying
   * `State.Active` enum is entered (BaseCall.setState → _dispatchNotification).
   * We poll `call.state` at a short interval rather than subscribing to
   * notifications, so the wait is robust to notification ordering and works
   * with any Call-like object that exposes a `state` string.
   */
  private async waitForCallEstablishment(call: Call): Promise<boolean> {
    // Fast path: already established.
    if (call.state === 'active') return true;

    const timeoutMs = this.effectiveCallSetupTimeoutMs();
    const deadline = Date.now() + timeoutMs;
    const pollIntervalMs = 100;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      const state = (call as { state?: string }).state;
      // 'active' is the established state. 'done'/'hangup'/'destroy' means
      // the call ended before establishing — treat as not-established.
      if (state === 'active') return true;
      if (state === 'done' || state === 'hangup' || state === 'destroy') {
        return false;
      }
    }
    return false;
  }

  /**
   * Wait for ICE gathering to complete, or until `maxWaitMs` elapses.
   *
   * Polls `pc.iceGatheringState` for `'complete'`. Returns early when
   * gathering is complete (so a 5s default does not force a full wait when
   * candidates arrive in 200ms).
   */
  private async waitForIceGathering(
    pc: RTCPeerConnection,
    maxWaitMs: number
  ): Promise<void> {
    // Read into a string-typed local to avoid TS control-flow narrowing of
    // RTCIceGatheringState across the await gap (the state changes between
    // polls, but TS assumes it stays constant within the function).
    if ((pc.iceGatheringState as string) === 'complete') return;
    const deadline = Date.now() + maxWaitMs;
    const pollIntervalMs = 100;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      const state: string = pc.iceGatheringState as string;
      if (state === 'complete') return;
    }
  }

  /**
   * Create a minimal Call-like shim exposing `peer.instance` so the ICE
   * module can read stats from a raw RTCPeerConnection in network-only mode.
   *
   * The ICE module only accesses `context.call?.peer?.instance`; this shim
   * provides exactly that and nothing else, so no real SDK Call is needed.
   */
  private makeCallShim(pc: RTCPeerConnection): {
    peer: { instance: RTCPeerConnection };
  } {
    return { peer: { instance: pc } };
  }

  /**
   * Get the client's configured ICE servers, when available.
   */
  private getClientIceServers(): RTCIceServer[] | undefined {
    return (this.options.client as unknown as { iceServers?: RTCIceServer[] })
      .iceServers;
  }

  /**
   * Create a temporary diagnostic call using the client dependency.
   *
   * `debug` defaults to false — diagnostic calls must not silently opt the
   * caller into the SDK's full debug-log path. Callers opt in via
   * `options.debug: true` (m2).
   */
  private createDiagnosticCall(): Call {
    const {
      client,
      destinationNumber,
      callerName,
      callerNumber,
      audio,
      debug,
      rtcConfig,
    } = this.options;

    return client.newCall({
      destinationNumber,
      callerName,
      callerNumber,
      audio,
      debug: debug === true,
      // Pass the effective ICE servers override (from rtcConfig.iceServers or
      // the client's configured servers) into the diagnostic call. Without this,
      // the call gathers candidates with the client's default servers while
      // buildPreCallIceReport() compares against context.options.rtcConfig.iceServers
      // — a custom override would then falsely report "no candidates" for the
      // requested servers (VSDK-412 review P43Pw).
      iceServers: rtcConfig?.iceServers ?? this.getClientIceServers(),
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
    context: PreCallDiagnosticContext,
    timings?: TimingsCollector
  ): Promise<void> {
    const durationMs = this.options.durationMs ?? DEFAULT_DURATION_MS;
    const intervalMs =
      this.options.statsSampleIntervalMs ?? DEFAULT_STATS_SAMPLE_INTERVAL_MS;

    const startTime = Date.now();
    const deadline = startTime + durationMs;

    // Collect at least one sample immediately
    await this.collectOneSample(call, context);
    // Record the first-sample timestamp right after the first sample is
    // collected — NOT after the whole sampling window. Calling markFirstStats()
    // only after collectSamples() returned recorded ~durationMs late
    // (VSDK-412 round-10 review).
    timings?.markFirstStats();

    // Continue collecting at the configured interval until the duration expires
    while (Date.now() < deadline) {
      const nextSampleTime = Math.min(
        startTime + Math.round(context.statsSamples.length * intervalMs),
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
        const getStatsZeroArg = call.getStats as unknown as () => Promise<
          RTCStatsReport | unknown
        >;
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
  private normalizeStatsFrame(
    rawStats: RTCStatsReport | unknown
  ): Record<string, unknown> | undefined {
    // If rawStats is already a structured object (not a Map/RTCStatsReport),
    // pass it through — this supports test mocks and IStatsInterval shapes.
    if (
      rawStats &&
      typeof rawStats === 'object' &&
      !(rawStats instanceof Map)
    ) {
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
    if (
      rawStats instanceof Map ||
      (rawStats &&
        typeof (rawStats as Map<unknown, unknown>).forEach === 'function')
    ) {
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
      typeof (report as unknown as { timestamp?: unknown }).timestamp ===
      'number'
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
              totalRoundTripTime: entry.totalRoundTripTime,
              roundTripTimeMeasurements: entry.roundTripTimeMeasurements,
              jitter: entry.jitter,
              packetsReceived: entry.packetsReceived,
              packetsLost: entry.packetsLost,
            });
            break;
        }
      }

      // Transport-level stats (candidate-pair RTT, bytes, packets)
      if (
        entry.type === 'candidate-pair' &&
        (entry as Record<string, unknown>).selected === true
      ) {
        connection.currentRoundTripTime = entry.currentRoundTripTime;
        connection.bytesSent = entry.bytesSent;
        connection.bytesReceived = entry.bytesReceived;
        connection.packetsSent = entry.packetsSent;
        connection.packetsReceived = entry.packetsReceived;
      }
      if (entry.type === 'transport') {
        if (entry.bytesSent !== undefined)
          connection.bytesSent = entry.bytesSent;
        if (entry.bytesReceived !== undefined)
          connection.bytesReceived = entry.bytesReceived;
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

/**
 * Aggregate per-server ICE results into a minimal `PreCallIceReport`.
 *
 * Used in the `runNetworkOnly` error path: when the combined gathering pass
 * fails, we still have the per-server results (which ran before the error).
 * This builds a valid `PreCallIceReport` so the caller can see which servers
 * produced candidates even if the overall check errored.
 */
function aggregatePerServerResults(
  results: PreCallIceServerResult[]
): PreCallIceReport {
  const candidateCounts: PreCallIceCandidateCounts = {
    total: 0,
    host: 0,
    srflx: 0,
    prflx: 0,
    relay: 0,
    unknown: 0,
  };
  const candidateTypes = new Set<string>();
  const candidates: PreCallIceReport['candidates'] = [];
  let hasRelayCandidate = false;
  let gatheringComplete = true;

  for (const r of results) {
    candidateCounts.total += r.candidateCounts.total;
    candidateCounts.host += r.candidateCounts.host;
    candidateCounts.srflx += r.candidateCounts.srflx;
    candidateCounts.prflx += r.candidateCounts.prflx;
    candidateCounts.relay += r.candidateCounts.relay;
    candidateCounts.unknown += r.candidateCounts.unknown;

    for (const t of r.candidateTypes) {
      candidateTypes.add(t);
    }
    for (const c of r.candidates) {
      candidates.push(c);
    }
    if (r.hasRelayCandidate) {
      hasRelayCandidate = true;
    }
    if (!r.gatheringComplete) {
      gatheringComplete = false;
    }
  }

  return {
    candidateGatheringCompleted: gatheringComplete,
    gatheringComplete,
    candidateCounts,
    candidateTypes: Array.from(candidateTypes).sort(),
    candidates,
    hasRelayCandidate,
    onlyHostCandidates:
      candidateCounts.total > 0 &&
      candidateCounts.host === candidateCounts.total,
    hasSelectedPair: false,
    perServerResults: results,
  };
}

/**
 * Flatten multi-URL `RTCIceServer` entries into single-URL servers.
 *
 * A single `RTCIceServer` object may carry multiple URLs in its `urls` array
 * (commonly one credential object containing STUN + TURN UDP/TCP URLs).
 * When per-server isolation tests that whole object with one
 * `RTCPeerConnection`, a working TCP URL can obscure a failed UDP URL
 * because candidates from both URLs are gathered together.
 *
 * This helper splits each `RTCIceServer` into one server per URL entry,
 * preserving `username`, `credential`, and `credentialType`. The resulting
 * array has one entry per configured URL so every endpoint gets its own
 * peer, result, and timing in `perServerResults`.
 *
 * (VSDK-412 review: "per-server isolation is still per RTCIceServer object,
 * not per configured URL".)
 */
function flattenIceServersByURL(servers: RTCIceServer[]): RTCIceServer[] {
  const flattened: RTCIceServer[] = [];
  for (const server of servers) {
    const urls = Array.isArray(server.urls)
      ? server.urls
      : server.urls
        ? [server.urls]
        : [];
    for (const url of urls) {
      const single: RTCIceServer = { urls: url };
      if (server.username !== undefined) {
        single.username = server.username;
      }
      if (server.credential !== undefined) {
        single.credential = server.credential;
      }
      if (server.credentialType !== undefined) {
        single.credentialType = server.credentialType;
      }
      flattened.push(single);
    }
  }
  return flattened;
}
