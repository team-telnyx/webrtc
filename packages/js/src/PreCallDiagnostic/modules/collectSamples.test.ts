/**
 * Unit tests for PreCallDiagnostic.collectSamples bounded-retry behavior
 * (VSDK-412 round-12 review: "failed stats reads can create a tight retry
 * loop").
 *
 * When getStats() always rejects, collectOneSample() returns false and no
 * frame is appended to context.statsSamples. The retry schedule must still
 * advance by intervalMs on every attempt (using an independent counter, not
 * statsSamples.length), so the loop does NOT hammer getStats() continuously.
 *
 * Also asserts firstStatsMs is absent from the timings report when no sample
 * was ever collected (VSDK-412 round-11/12 review).
 */
import { PreCallDiagnostic } from '../PreCallDiagnostic';
import type { PreCallDiagnosticContext } from '../context';
import { createTimingsCollector } from './timings';
import type { TimingsCollector } from './timings';

// Minimal Call-like mock: state 'active' so waitForCallEstablishment passes
// immediately, and a zero-arg getStats() that always rejects. The
// collectOneSample code path checks `call.getStats.length === 0` to
// distinguish the promise-returning override from the SDK's callback-based
// getStats(callback, constraints).
function makeRejectingCall(getStatsRejectCount: { count: number }) {
  const rejectingGetStats = () => {
    getStatsRejectCount.count++;
    return Promise.reject(new Error('getStats() always rejects'));
  };
  // length === 0 signals the promise-returning override path
  Object.defineProperty(rejectingGetStats, 'length', { value: 0 });
  return {
    state: 'active' as string,
    id: 'test-call-id',
    getStats: rejectingGetStats,
    hangup: () => {},
    peer: { instance: undefined },
  };
}

describe('PreCallDiagnostic.collectSamples — bounded retry on getStats failure (VSDK-412 round-12)', () => {
  it('does not create a tight retry loop when getStats() always rejects', async () => {
    const getStatsRejectCount = { count: 0 };
    const call = makeRejectingCall(getStatsRejectCount) as never;

    const context: PreCallDiagnosticContext = {
      options: {
        client: {} as never,
        mode: 'full' as never,
        durationMs: 500, // enough window for multiple attempts even on slow CI
        statsSampleIntervalMs: 50, // 50ms between attempts
      } as never,
      statsSamples: [],
      call,
    };

    const timings = createTimingsCollector();
    timings.markStatsSamplingStarted();

    // Access the private method via type assertion (common TS test pattern).
    const diag = new PreCallDiagnostic({
      client: {} as never,
      mode: 'full' as never,
      durationMs: 500,
      statsSampleIntervalMs: 50,
    } as never);

    const collectSamples = (
      diag as unknown as {
        collectSamples: (
          this: PreCallDiagnostic,
          call: never,
          context: PreCallDiagnosticContext,
          timings: TimingsCollector
        ) => Promise<void>;
      }
    ).collectSamples.bind(diag);

    await collectSamples(call, context, timings);
    timings.markStatsSamplingCompleted();
    timings.markCompleted();

    // With durationMs=500 and intervalMs=50, we expect ~9-10 attempts
    // (initial + ~4 loop iterations). The OLD buggy code would have made
    // hundreds of calls because nextSampleTime never advanced. A bounded
    // count under 20 proves the retry loop is not tight.
    expect(getStatsRejectCount.count).toBeLessThan(20);
    expect(getStatsRejectCount.count).toBeGreaterThanOrEqual(2);

    // No sample was ever appended — statsSamples should be empty.
    expect(context.statsSamples.length).toBe(0);

    // firstStatsMs must be absent from the timings report when no sample
    // was collected (VSDK-412 round-11/12 review).
    const report = timings.build({ call, callId: 'test-call-id' });
    expect(report.firstStatsMs).toBeUndefined();
  });
});

/**
 * Verdict test: empty network.reasons[] must NOT force degraded.
 *
 * buildPreCallNetworkReport() returns { quality: 'unknown', reasons: [] }
 * when no stats frames exist. The old code used `if (network.reasons)` which
 * is truthy for `[]`, incorrectly degrading the verdict. The fix gates on
 * `network.reasons.length > 0` (VSDK-412 round-12 review).
 */
import { buildVerdict } from './verdict';
import type { PreCallDiagnosticReport } from '../types';

describe('buildVerdict — empty network reasons do not degrade (VSDK-412 round-12)', () => {
  it('returns inconclusive for a no-data network report (empty reasons[])', () => {
    const report: Partial<PreCallDiagnosticReport> = {
      version: 1,
      network: {
        quality: 'unknown',
        reasons: [],
      } as PreCallDiagnosticReport['network'],
    };
    const context: PreCallDiagnosticContext = {
      options: {} as never,
      statsSamples: [],
    };

    const result = buildVerdict(report, context);

    // No module contributed a real verdict → inconclusive (not degraded).
    expect(result.verdict).toBe('inconclusive');
    expect(result.reasons.length).toBe(0);
  });
});
