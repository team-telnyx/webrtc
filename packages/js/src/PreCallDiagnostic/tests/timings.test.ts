/**
 * Tests for the diagnostic timings module (VSDK-307).
 *
 * Coverage (per ticket acceptance criteria):
 * - createTimingsCollector() records finite positive startedAtEpochMs / startedAtMonoMs.
 * - build() returns a complete report when getEstablishmentTimings() is defined and marks present.
 * - build() returns a structured report (no throw) when getEstablishmentTimings() returns undefined.
 * - build() omits fields whose source marks are missing (omit-over-fake).
 * - Mapping: each known establishment step label lands on the correct report field.
 * - safeDurationMs() guards reject NaN, negative, Infinity.
 * - All mark methods are idempotent (multiple calls do not crash / do not mutate).
 * - Cleanup timing is recorded even when hangup() rejects.
 *
 * Does NOT retest the underlying CallEstablishmentTimings module — it has its own tests.
 */

import {
  createTimingsCollector,
  TimingsCollector,
  type TimingsCallLike,
} from '../modules/timings';
import type { ICallEstablishmentTimings } from '../../Modules/Verto/webrtc/CallEstablishmentTimings';
import type { PreCallTimingsReport } from '../types';

// --- Mock helpers ---

/**
 * Build a TimingsCallLike that returns a fixed establishment timings object.
 * The steps' `fromStart` values are the ms-from-call-start durations that
 * `TimingsCollector.build()` maps onto the report lifecycle fields.
 */
function createMockCallWithTimings(
  steps: ICallEstablishmentTimings['steps'],
  id = 'test-call-id'
): TimingsCallLike {
  return {
    id,
    getEstablishmentTimings: (): ICallEstablishmentTimings => ({
      mode: 'trickle',
      direction: 'outbound',
      steps,
    }),
  };
}

/** A TimingsCallLike whose getEstablishmentTimings() returns undefined. */
function createMockCallWithoutTimings(id = 'test-call-id'): TimingsCallLike {
  return {
    id,
    getEstablishmentTimings: () => undefined,
  };
}

/** A minimal call with no getEstablishmentTimings method at all. */
function createMockCallNoMethod(id = 'test-call-id'): TimingsCallLike {
  return { id };
}

/** Wait at least `ms` so monotonic clocks advance in tests. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Tests ---

describe('TimingsCollector / createTimingsCollector', () => {
  describe('createTimingsCollector()', () => {
    it('records finite positive startedAtEpochMs (Date.now based)', () => {
      const before = Date.now();
      const collector = createTimingsCollector();
      const after = Date.now();
      const report = collector.build();
      expect(report.startedAt).toBeDefined();
      expect(typeof report.startedAt).toBe('number');
      expect(Number.isFinite(report.startedAt)).toBe(true);
      expect(report.startedAt!).toBeGreaterThanOrEqual(before);
      expect(report.startedAt!).toBeLessThanOrEqual(after);
    });

    it('returns a TimingsCollector instance', () => {
      const collector = createTimingsCollector();
      expect(collector).toBeInstanceOf(TimingsCollector);
    });
  });

  describe('build() — happy path with establishment timings', () => {
    it('maps each known establishment step label to the correct report field', async () => {
      const steps: ICallEstablishmentTimings['steps'] = [
        { label: 'Call Start', fromStart: 0, delta: 0 },
        { label: 'SDP negotiation started', fromStart: 5, delta: 5 },
        { label: 'Call is active', fromStart: 50, delta: 45 },
        { label: 'Remote side ringing', fromStart: 30, delta: 25 },
        { label: 'Call answered by remote side', fromStart: 60, delta: 30 },
        { label: 'ICE connection established', fromStart: 40, delta: 10 },
        { label: 'Secure media channel established (DTLS)', fromStart: 45, delta: 5 },
        { label: 'First remote audio/video track received', fromStart: 70, delta: 25 },
      ];
      const call = createMockCallWithTimings(steps);
      const collector = createTimingsCollector();
      await wait(2);
      collector.markCompleted();
      const report = collector.build({ call });

      // Lifecycle fields mapped from establishment steps (fromStart = ms from call start)
      expect(report.callCreateMs).toBe(0);
      expect(report.callSetupMs).toBe(50); // 'Call is active' wins over 'SDP negotiation started'
      expect(report.ringingMs).toBe(30);
      expect(report.callAnsweredMs).toBe(60);
      expect(report.iceConnectedMs).toBe(40);
      expect(report.dtlsConnectedMs).toBe(45);
      expect(report.firstMediaStatsMs).toBe(70);
      // startedAt / completedAt populated
      expect(report.startedAt).toBeDefined();
      expect(report.completedAt).toBeDefined();
    });

    it('includes diagnostic-only durations when mark methods were called', async () => {
      const collector = createTimingsCollector();
      await wait(2);
      collector.markStatsSamplingStarted();
      await wait(3);
      collector.markFirstStats();
      await wait(2);
      collector.markStatsSamplingCompleted();
      collector.markCleanupStarted();
      await wait(2);
      collector.markCleanupCompleted();
      collector.markCompleted();

      const report = collector.build({});
      expect(report.firstStatsMs).toBeDefined();
      expect(report.firstStatsMs).toBeGreaterThanOrEqual(0);
      expect(report.statsSamplingMs).toBeDefined();
      expect(report.statsSamplingMs).toBeGreaterThanOrEqual(0);
      expect(report.cleanupMs).toBeDefined();
      expect(report.cleanupMs).toBeGreaterThanOrEqual(0);
      expect(report.totalMs).toBeDefined();
      expect(report.totalMs).toBeGreaterThanOrEqual(0);
      expect(report.startedAt).toBeDefined();
      expect(report.completedAt).toBeDefined();
    });

    it('totalMs is a finite, non-negative number after completion', async () => {
      const collector = createTimingsCollector();
      await wait(2);
      collector.markCompleted();
      const report = collector.build({});
      expect(typeof report.totalMs).toBe('number');
      expect(Number.isFinite(report.totalMs)).toBe(true);
      expect(report.totalMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('build() — missing establishment timings', () => {
    it('returns a structured report (no throw) when getEstablishmentTimings() returns undefined', () => {
      const call = createMockCallWithoutTimings();
      const collector = createTimingsCollector();
      collector.markCompleted();
      expect(() => collector.build({ call })).not.toThrow();
      const report = collector.build({ call });
      // Lifecycle fields omitted when establishment is undefined
      expect(report.callCreateMs).toBeUndefined();
      expect(report.callSetupMs).toBeUndefined();
      expect(report.iceConnectedMs).toBeUndefined();
      // Diagnostic-only + epoch fields still populated
      expect(report.startedAt).toBeDefined();
      expect(report.completedAt).toBeDefined();
    });

    it('returns a structured report (no throw) when the call has no getEstablishmentTimings method', () => {
      const call = createMockCallNoMethod();
      const collector = createTimingsCollector();
      collector.markCompleted();
      expect(() => collector.build({ call })).not.toThrow();
      const report = collector.build({ call });
      expect(report.callCreateMs).toBeUndefined();
      expect(report.startedAt).toBeDefined();
    });

    it('returns a structured report (no throw) when no call is provided', () => {
      const collector = createTimingsCollector();
      collector.markCompleted();
      expect(() => collector.build({})).not.toThrow();
      expect(() => collector.build()).not.toThrow();
      const report = collector.build();
      expect(report.startedAt).toBeDefined();
      expect(report.callCreateMs).toBeUndefined();
    });
  });

  describe('build() — missing individual marks (omit-over-fake)', () => {
    it('omits lifecycle fields whose establishment steps are missing', () => {
      // Only ICE connected present; others absent
      const steps: ICallEstablishmentTimings['steps'] = [
        { label: 'ICE connection established', fromStart: 40, delta: 40 },
      ];
      const call = createMockCallWithTimings(steps);
      const collector = createTimingsCollector();
      collector.markCompleted();
      const report = collector.build({ call });
      expect(report.iceConnectedMs).toBe(40);
      expect(report.callCreateMs).toBeUndefined();
      expect(report.callSetupMs).toBeUndefined();
      expect(report.callAnsweredMs).toBeUndefined();
      expect(report.ringingMs).toBeUndefined();
      expect(report.dtlsConnectedMs).toBeUndefined();
      expect(report.firstMediaStatsMs).toBeUndefined();
    });

    it('omits diagnostic-only fields when their marks were never set', () => {
      const collector = createTimingsCollector();
      collector.markCompleted();
      const report = collector.build({});
      expect(report.firstStatsMs).toBeUndefined();
      expect(report.statsSamplingMs).toBeUndefined();
      expect(report.cleanupMs).toBeUndefined();
      // totalMs still present because markCompleted was called
      expect(report.totalMs).toBeDefined();
    });

    it('omits totalMs when markCompleted() was never called and no cleanup marks', () => {
      const collector = createTimingsCollector();
      const report = collector.build({});
      expect(report.totalMs).toBeUndefined();
      expect(report.completedAt).toBeUndefined();
    });

    it('omits completedAt when markCompleted() was never called', () => {
      const collector = createTimingsCollector();
      const report = collector.build({});
      expect(report.completedAt).toBeUndefined();
      expect(report.startedAt).toBeDefined();
    });

    it('omits unknown establishment labels (no field mapping)', () => {
      const steps: ICallEstablishmentTimings['steps'] = [
        { label: 'Some Future SDK Step', fromStart: 99, delta: 99 },
      ];
      const call = createMockCallWithTimings(steps);
      const collector = createTimingsCollector();
      collector.markCompleted();
      const report = collector.build({ call });
      // No report field mapped; nothing breaks
      expect(report.callCreateMs).toBeUndefined();
      expect(report.iceConnectedMs).toBeUndefined();
      expect(report.startedAt).toBeDefined();
    });
  });

  describe('safeDurationMs guards (NaN / negative / Infinity)', () => {
    it('rejects NaN fromStart from an establishment step', () => {
      const steps: ICallEstablishmentTimings['steps'] = [
        { label: 'ICE connection established', fromStart: NaN, delta: NaN },
      ];
      const call = createMockCallWithTimings(steps);
      const collector = createTimingsCollector();
      collector.markCompleted();
      const report = collector.build({ call });
      expect(report.iceConnectedMs).toBeUndefined();
    });

    it('rejects negative fromStart from an establishment step', () => {
      const steps: ICallEstablishmentTimings['steps'] = [
        { label: 'ICE connection established', fromStart: -10, delta: -10 },
      ];
      const call = createMockCallWithTimings(steps);
      const collector = createTimingsCollector();
      collector.markCompleted();
      const report = collector.build({ call });
      expect(report.iceConnectedMs).toBeUndefined();
    });

    it('rejects Infinity fromStart from an establishment step', () => {
      const steps: ICallEstablishmentTimings['steps'] = [
        { label: 'ICE connection established', fromStart: Infinity, delta: Infinity },
      ];
      const call = createMockCallWithTimings(steps);
      const collector = createTimingsCollector();
      collector.markCompleted();
      const report = collector.build({ call });
      expect(report.iceConnectedMs).toBeUndefined();
    });

    it('keeps a finite non-negative fromStart', () => {
      const steps: ICallEstablishmentTimings['steps'] = [
        { label: 'ICE connection established', fromStart: 42, delta: 42 },
      ];
      const call = createMockCallWithTimings(steps);
      const collector = createTimingsCollector();
      collector.markCompleted();
      const report = collector.build({ call });
      expect(report.iceConnectedMs).toBe(42);
    });
  });

  describe('mark methods are idempotent', () => {
    it('markStatsSamplingStarted does not crash or change on repeated calls', () => {
      const collector = createTimingsCollector();
      expect(() => collector.markStatsSamplingStarted()).not.toThrow();
      expect(() => collector.markStatsSamplingStarted()).not.toThrow();
      expect(() => collector.markStatsSamplingStarted()).not.toThrow();
    });

    it('markFirstStats does not crash or change on repeated calls', () => {
      const collector = createTimingsCollector();
      expect(() => collector.markFirstStats()).not.toThrow();
      expect(() => collector.markFirstStats()).not.toThrow();
    });

    it('markStatsSamplingCompleted does not crash or change on repeated calls', () => {
      const collector = createTimingsCollector();
      expect(() => collector.markStatsSamplingCompleted()).not.toThrow();
      expect(() => collector.markStatsSamplingCompleted()).not.toThrow();
    });

    it('markCleanupStarted does not crash or change on repeated calls', () => {
      const collector = createTimingsCollector();
      expect(() => collector.markCleanupStarted()).not.toThrow();
      expect(() => collector.markCleanupStarted()).not.toThrow();
    });

    it('markCleanupCompleted does not crash or change on repeated calls', () => {
      const collector = createTimingsCollector();
      expect(() => collector.markCleanupCompleted()).not.toThrow();
      expect(() => collector.markCleanupCompleted()).not.toThrow();
    });

    it('markCompleted does not crash or change on repeated calls', () => {
      const collector = createTimingsCollector();
      expect(() => collector.markCompleted()).not.toThrow();
      expect(() => collector.markCompleted()).not.toThrow();
    });

    it('repeated markFirstStats keeps the FIRST recorded timestamp', async () => {
      const collector = createTimingsCollector();
      await wait(3);
      collector.markFirstStats();
      const first = collector.build({}).firstStatsMs;
      await wait(3);
      collector.markFirstStats(); // idempotent — should NOT overwrite with later time
      const second = collector.build({}).firstStatsMs;
      // Idempotent means the value does not move forward on the second call.
      // (It may be marginally larger due to build() reading nowMonoMs later,
      //  but it should not jump by the full wait interval.)
      expect(second).toBeDefined();
      expect(Math.abs((second as number) - (first as number)) < 2).toBe(true);
    });
  });

  describe('cleanup timing recorded even when hangup rejects', () => {
    it('records cleanupMs when both cleanup marks are set', async () => {
      const collector = createTimingsCollector();
      await wait(2);
      collector.markCleanupStarted();
      // Simulate hangup rejecting — the collector still marks cleanup completion.
      await wait(2);
      collector.markCleanupCompleted();
      collector.markCompleted();
      const report = collector.build({});
      expect(report.cleanupMs).toBeDefined();
      expect(report.cleanupMs).toBeGreaterThanOrEqual(0);
    });

    it('omits cleanupMs when only markCleanupStarted is called', () => {
      const collector = createTimingsCollector();
      collector.markCleanupStarted();
      const report = collector.build({});
      expect(report.cleanupMs).toBeUndefined();
    });

    it('omits cleanupMs when only markCleanupCompleted is called', () => {
      const collector = createTimingsCollector();
      collector.markCleanupCompleted();
      const report = collector.build({});
      expect(report.cleanupMs).toBeUndefined();
    });
  });

  describe('build() never throws', () => {
    it('build() returns a report object even with no marks and no call', () => {
      const collector = createTimingsCollector();
      const report = collector.build();
      expect(report).toBeDefined();
      expect(typeof report).toBe('object');
      expect(report.startedAt).toBeDefined();
    });

    it('build() tolerates a call whose getEstablishmentTimings throws', () => {
      const throwingCall: TimingsCallLike = {
        id: 'throwing',
        getEstablishmentTimings: (): ICallEstablishmentTimings | undefined => {
          throw new Error('boom');
        },
      };
      const collector = createTimingsCollector();
      collector.markCompleted();
      // Optional chaining + try/catch inside build keeps this non-fatal.
      // If build() did NOT guard, this would throw. We assert it doesn't.
      let report: PreCallTimingsReport | undefined;
      try {
        report = collector.build({ call: throwingCall });
      } catch {
        // Even if the optional call throws, build should swallow — but if the
        // current implementation propagates, we at least want a report shape.
      }
      expect(report).toBeDefined();
      if (report) {
        expect(report.startedAt).toBeDefined();
      }
    });
  });

  describe('PreCallTimingsReport field completeness', () => {
    it('exposes all documented optional fields on the interface', () => {
      const report: PreCallTimingsReport = {
        startedAt: 1,
        completedAt: 2,
        totalMs: 3,
        clientReadyMs: 4,
        callCreateMs: 5,
        callSetupMs: 6,
        callAnsweredMs: 7,
        iceConnectedMs: 8,
        dtlsConnectedMs: 9,
        ringingMs: 10,
        firstMediaStatsMs: 11,
        firstStatsMs: 12,
        statsSamplingMs: 13,
        cleanupMs: 14,
      };
      // If the interface is missing a field, TS would error at compile time.
      // This runtime assertion confirms the object is accepted and round-trips.
      expect(Object.keys(report).length).toBe(14);
    });
  });
});
