/**
 * Tests for CallEstablishmentTimings.
 *
 * Other test files in this suite mock `global.performance` with stubs via
 * Object.defineProperty. Since Jest runs tests in the same worker process,
 * those stubs leak into this file. We restore a working performance API
 * before our tests run.
 */
import {
  callMarkName,
  collectCallEstablishmentTimings,
  clearCallMarks,
} from '../../webrtc/CallEstablishmentTimings';

// Restore a real-acting performance API — the one from Node's perf_hooks
// does not support mark/clearMarks in older Node versions, so we build
// a lightweight in-memory implementation.
const _marks = new Map<string, number>();
let _time = 0;

Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark(name: string) {
      _marks.set(name, _time);
      _time += 1;
    },
    clearMarks(name?: string) {
      if (name === undefined) {
        _marks.clear();
        _time = 0;
      } else {
        _marks.delete(name);
      }
    },
    getEntriesByName(name: string) {
      const t = _marks.get(name);
      if (t !== undefined) {
        return [{ startTime: t }];
      }
      return [];
    },
    getEntriesByType() {
      return [];
    },
    measure: jest.fn(),
    clearMeasures: jest.fn(),
    now: jest.fn().mockReturnValue(Date.now()),
  },
});

describe('CallEstablishmentTimings', () => {
  beforeEach(() => {
    _marks.clear();
    _time = 0;
  });

  describe('callMarkName', () => {
    it('should produce a call-scoped mark name', () => {
      expect(callMarkName('call-abc', 'ringing')).toBe(
        'telnyx:call:call-abc:ringing'
      );
    });

    it('should produce different names for different call IDs', () => {
      expect(callMarkName('call-1', 'ringing')).not.toBe(
        callMarkName('call-2', 'ringing')
      );
    });
  });

  describe('collectCallEstablishmentTimings', () => {
    it('should return empty steps when no start mark exists', () => {
      const timings = collectCallEstablishmentTimings(
        'call-1',
        'trickle',
        'outbound'
      );
      expect(timings.steps).toEqual([]);
    });

    it('should collect timings scoped to a specific call ID', () => {
      const callId = 'call-123';

      performance.mark(callMarkName(callId, 'new-call-start'));
      performance.mark(callMarkName(callId, 'ringing'));
      performance.mark(callMarkName(callId, 'call-active'));

      const timings = collectCallEstablishmentTimings(
        callId,
        'trickle',
        'outbound'
      );

      expect(timings.steps).toHaveLength(2);
      expect(timings.steps[0].label).toBe('Remote side ringing');
      expect(timings.steps[1].label).toBe('Call is active');
    });

    it('should NOT include marks from a different call ID', () => {
      const callId1 = 'call-1';
      const callId2 = 'call-2';

      performance.mark(callMarkName(callId1, 'new-call-start'));
      performance.mark(callMarkName(callId1, 'ringing'));

      performance.mark(callMarkName(callId2, 'new-call-start'));
      performance.mark(callMarkName(callId2, 'ringing'));
      performance.mark(callMarkName(callId2, 'call-active'));

      const timings1 = collectCallEstablishmentTimings(
        callId1,
        'trickle',
        'outbound'
      );
      const timings2 = collectCallEstablishmentTimings(
        callId2,
        'trickle',
        'outbound'
      );

      expect(timings1.steps).toHaveLength(1);
      expect(timings1.steps[0].label).toBe('Remote side ringing');

      expect(timings2.steps).toHaveLength(2);
      expect(timings2.steps[0].label).toBe('Remote side ringing');
      expect(timings2.steps[1].label).toBe('Call is active');
    });

    it('should compute non-negative fromStart deltas', () => {
      const callId = 'call-delta';

      performance.mark(callMarkName(callId, 'new-call-start'));
      performance.mark(callMarkName(callId, 'ringing'));

      const timings = collectCallEstablishmentTimings(
        callId,
        'non-trickle',
        'inbound'
      );

      expect(timings.steps).toHaveLength(1);
      // From our mock: new-call-start at t=0, ringing at t=1
      expect(timings.steps[0].fromStart).toBe(1);
      expect(timings.steps[0].delta).toBe(1);
    });
  });

  describe('clearCallMarks', () => {
    it('should clear only marks for the specified call ID', () => {
      const callId1 = 'call-clear-1';
      const callId2 = 'call-clear-2';

      performance.mark(callMarkName(callId1, 'new-call-start'));
      performance.mark(callMarkName(callId1, 'ringing'));
      performance.mark(callMarkName(callId2, 'new-call-start'));
      performance.mark(callMarkName(callId2, 'ringing'));

      clearCallMarks(callId1);

      expect(
        performance.getEntriesByName(
          callMarkName(callId1, 'new-call-start'),
          'mark'
        ).length
      ).toBe(0);
      expect(
        performance.getEntriesByName(callMarkName(callId1, 'ringing'), 'mark')
          .length
      ).toBe(0);

      expect(
        performance.getEntriesByName(
          callMarkName(callId2, 'new-call-start'),
          'mark'
        ).length
      ).toBe(1);
      expect(
        performance.getEntriesByName(callMarkName(callId2, 'ringing'), 'mark')
          .length
      ).toBe(1);
    });

    it('should not throw when clearing marks for a call that has none', () => {
      expect(() => clearCallMarks('nonexistent-call')).not.toThrow();
    });
  });

  describe('stale marks isolation (bug fix)', () => {
    it('should not reuse stale marks from a previous call', () => {
      const call1Id = 'stale-call-1';

      performance.mark(callMarkName(call1Id, 'new-call-start'));
      performance.mark(callMarkName(call1Id, 'ringing'));
      // Call 1 never reaches call-active or connected.
      // Peer close clears the stale marks.
      clearCallMarks(call1Id);

      // Call 2 starts
      const call2Id = 'fresh-call-2';
      performance.mark(callMarkName(call2Id, 'new-call-start'));
      performance.mark(callMarkName(call2Id, 'ringing'));
      performance.mark(callMarkName(call2Id, 'call-active'));

      const timings2 = collectCallEstablishmentTimings(
        call2Id,
        'trickle',
        'outbound'
      );

      expect(timings2.steps).toHaveLength(2);
      // From our mock: new-call-start at t=0, ringing at t=1, call-active at t=2
      expect(timings2.steps[0].fromStart).toBe(1);
      expect(timings2.steps[1].fromStart).toBe(2);
    });

    it('should isolate concurrent calls with overlapping marks', () => {
      const callA = 'concurrent-a';
      const callB = 'concurrent-b';

      performance.mark(callMarkName(callA, 'new-call-start'));
      performance.mark(callMarkName(callA, 'ringing'));

      performance.mark(callMarkName(callB, 'new-call-start'));
      performance.mark(callMarkName(callB, 'ringing'));
      performance.mark(callMarkName(callB, 'call-active'));

      performance.mark(callMarkName(callA, 'call-active'));

      const timingsA = collectCallEstablishmentTimings(
        callA,
        'trickle',
        'outbound'
      );
      const timingsB = collectCallEstablishmentTimings(
        callB,
        'trickle',
        'outbound'
      );

      expect(timingsA.steps).toHaveLength(2);
      expect(timingsB.steps).toHaveLength(2);

      // Each call's fromStart values should be relative to its own start mark
      // Call A: new-call-start=0, ringing=1, call-active=5
      expect(timingsA.steps[0].fromStart).toBe(1);
      expect(timingsA.steps[1].fromStart).toBe(5);

      // Call B: new-call-start=2, ringing=3, call-active=4
      expect(timingsB.steps[0].fromStart).toBe(1);
      expect(timingsB.steps[1].fromStart).toBe(2);
    });

    it('should handle a previous call whose marks were NOT cleared (defense in depth)', () => {
      // Even if clearCallMarks was never called for the previous call,
      // the call-scoped mark names prevent cross-contamination.
      const call1Id = 'unclean-call-1';

      performance.mark(callMarkName(call1Id, 'new-call-start'));
      performance.mark(callMarkName(call1Id, 'ringing'));
      // Marks NOT cleared — simulating a path where clearCallMarks wasn't called

      const call2Id = 'second-call-2';
      performance.mark(callMarkName(call2Id, 'new-call-start'));
      performance.mark(callMarkName(call2Id, 'ringing'));
      performance.mark(callMarkName(call2Id, 'call-active'));

      const timings2 = collectCallEstablishmentTimings(
        call2Id,
        'trickle',
        'outbound'
      );

      // Still correct — no cross-contamination because marks are scoped
      expect(timings2.steps).toHaveLength(2);
      expect(timings2.steps[0].label).toBe('Remote side ringing');
      expect(timings2.steps[1].label).toBe('Call is active');
    });

    it('should clear marks even when no peer was created (peerless teardown)', () => {
      // Simulate: inbound invite marks new-call-start, but the call is
      // rejected/terminated before answer() creates a peer.
      // _finalize() should still clear the marks.
      const callId = 'peerless-call';

      performance.mark(callMarkName(callId, 'new-call-start'));
      performance.mark(callMarkName(callId, 'ringing'));

      // Simulate _finalize() clearing marks (no peer close involved)
      clearCallMarks(callId);

      // Marks for this call should be gone
      expect(
        performance.getEntriesByName(
          callMarkName(callId, 'new-call-start'),
          'mark'
        ).length
      ).toBe(0);
      expect(
        performance.getEntriesByName(callMarkName(callId, 'ringing'), 'mark')
          .length
      ).toBe(0);

      // A subsequent call with a different ID should not be affected
      const nextCallId = 'after-peerless';
      performance.mark(callMarkName(nextCallId, 'new-call-start'));
      performance.mark(callMarkName(nextCallId, 'ringing'));
      performance.mark(callMarkName(nextCallId, 'call-active'));

      const timings = collectCallEstablishmentTimings(
        nextCallId,
        'trickle',
        'outbound'
      );
      expect(timings.steps).toHaveLength(2);
    });
  });
});
