import SustainedRttDetector, {
  type ISustainedRttSample,
  type ISustainedRttState,
} from '../../webrtc/SustainedRttDetector';

/**
 * The shapes below are taken from production call reports, named by the first
 * eight characters of their call id so a failure can be traced back to the
 * call it came from.
 */

type Interval = {
  /** RTT in ms; converted to the seconds the WebRTC API reports. */
  rttMs?: number;
  /** Outbound audio packets in this interval. 0 means media is not flowing. */
  packets?: number;
  /** STUN binding requests sent in this interval. */
  requests?: number;
  /** STUN binding responses received in this interval. */
  responses?: number;
  pairState?: string;
  /** Set on the interval where the selected pair changes. */
  pairChange?: boolean;
};

/**
 * Turn per-interval deltas into the cumulative counters the detector reads,
 * so the fixtures below can be written the way the traces are read.
 */
function feed(
  detector: SustainedRttDetector,
  intervals: Interval[]
): ISustainedRttState[] {
  let packetsSent = 0;
  let requestsSent = 0;
  let responsesReceived = 0;
  let pairChanges = 1;

  return intervals.map((interval) => {
    if (interval.pairChange) {
      pairChanges += 1;
      // A new pair starts its own counters, exactly as the browser reports it.
      requestsSent = 0;
      responsesReceived = 0;
    }
    packetsSent += interval.packets ?? 50;
    requestsSent += interval.requests ?? 1;
    responsesReceived += interval.responses ?? 1;

    const sample: ISustainedRttSample = {
      rttSeconds:
        interval.rttMs === undefined ? undefined : interval.rttMs / 1000,
      packetsSent,
      iceRequestsSent: requestsSent,
      iceResponsesReceived: responsesReceived,
      icePairState: interval.pairState ?? 'succeeded',
      selectedCandidatePairChanges: pairChanges,
    };
    return detector.observe(sample);
  });
}

/** `n` intervals all at `rttMs`, with media flowing and STUN answering. */
function flat(n: number, rttMs: number): Interval[] {
  return Array.from({ length: n }, () => ({ rttMs }));
}

function everElevated(states: ISustainedRttState[]): boolean {
  return states.some((s) => s.elevated);
}

function firstElevatedIndex(states: ISustainedRttState[]): number {
  return states.findIndex((s) => s.elevated);
}

describe('SustainedRttDetector', () => {
  describe('fires on a step that holds', () => {
    // b043142b: 151 ms for two intervals, a small step to ~215, then a second
    // step to ~300 that held for 17 intervals until the pair changed. The
    // detector must find the 151 ms floor even though only two intervals sit
    // on it, and must raise on the 300 ms plateau.
    it('finds a floor that lasts only two intervals (b043142b)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        ...flat(2, 151),
        ...flat(5, 215),
        ...flat(10, 300),
      ]);

      expect(everElevated(states)).toBe(true);
      const last = states[states.length - 1];
      expect(last.floorMs).toBe(151);
      expect(Math.round(last.liftMs ?? 0)).toBe(149);
      expect(last.ramp).toBeCloseTo(1.99, 2);
    });

    it('does not raise until the condition has held (b043142b)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [...flat(2, 151), ...flat(10, 300)]);

      // Two intervals at the floor plus the smoothing window, then three
      // breaches. Nothing before that.
      const index = firstElevatedIndex(states);
      expect(index).toBeGreaterThanOrEqual(4);
      expect(states.slice(0, index).every((s) => !s.elevated)).toBe(true);
    });

    // c1dc2c2a: a 613 s call that stepped from a ~40 ms floor to a flat
    // 380 ms plateau — the clearest square step in the dataset.
    it('fires on a square step from a low floor (c1dc2c2a)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [...flat(10, 39), ...flat(20, 381)]);

      expect(everElevated(states)).toBe(true);
      expect(states[states.length - 1].ramp).toBeCloseTo(9.77, 1);
    });

    it('clears when RTT returns to the floor', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        ...flat(5, 150),
        ...flat(6, 400),
        ...flat(4, 150),
      ]);

      expect(everElevated(states)).toBe(true);
      expect(states[states.length - 1].elevated).toBe(false);
    });
  });

  describe('stays quiet on calls that are merely distant', () => {
    // 0bea2628: 455 s at a 342 ms floor, drifting to 418. High in absolute
    // terms — 31001 fires throughout — but the call never degraded.
    it('ignores a high floor that only drifts (0bea2628)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [...flat(20, 342), ...flat(20, 418)]);

      expect(everElevated(states)).toBe(false);
      // The lift alone would qualify; the ramp is what rejects it.
      expect(states[states.length - 1].liftMs).toBe(76);
      expect(states[states.length - 1].ramp).toBeCloseTo(1.22, 2);
    });

    // 92911261: 468 s, ramp 1.01 end to end.
    it('ignores a long flat call (92911261)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, flat(60, 220));

      expect(everElevated(states)).toBe(false);
    });

    // a502f532: flat ~370 ms for 135 intervals with isolated two-interval
    // excursions to 951, 917, 656 and 606. Peak lift 597 ms, peak ramp 2.7x —
    // every threshold cleared, and still the right answer is silence, because
    // a spike is not what this detector is for.
    it('rejects two-interval spikes on an otherwise flat call (a502f532)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        ...flat(10, 370),
        ...flat(2, 951),
        ...flat(10, 365),
        ...flat(2, 656),
        ...flat(10, 372),
      ]);

      expect(everElevated(states)).toBe(false);
    });
  });

  describe('what may form the floor', () => {
    // Stats collection starts before media. Those intervals carry an RTT from
    // ICE connectivity checks with packetsSent still frozen, and on one call
    // it read 442 ms against a real floor of 755 — low enough to invert the
    // sign of every later lift.
    it('excludes pre-media intervals from the floor', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        ...Array.from({ length: 6 }, () => ({ rttMs: 442, packets: 0 })),
        ...flat(10, 755),
      ]);

      expect(states[states.length - 1].floorMs).toBe(755);
      expect(everElevated(states)).toBe(false);
    });

    // The counterweight to qualifying the first interval: one low reading at
    // media onset is media starting up, not the floor. 0a77e09b opened at
    // 178 ms and settled at 291 — firing on that would be wrong.
    it('does not let a single low interval set the floor (0a77e09b)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [{ rttMs: 178 }, ...flat(20, 295)]);

      expect(states[states.length - 1].floorMs).toBe(295);
      expect(everElevated(states)).toBe(false);
    });

    it('follows the floor down when a call genuinely improves', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [...flat(8, 400), ...flat(8, 120)]);

      expect(states[states.length - 1].floorMs).toBe(120);
      expect(everElevated(states)).toBe(false);
    });
  });

  describe('stale RTT', () => {
    // fecb803f: STUN frozen at 41 requests / 40 responses while
    // roundTripTimeAvg kept reading 857 ms for four consecutive intervals.
    // That is a dead path, owned by the no-RTP logic, not a measurement.
    it('ignores intervals where STUN requests go unanswered (fecb803f)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        ...flat(10, 150),
        ...Array.from({ length: 6 }, () => ({
          rttMs: 857,
          requests: 1,
          responses: 0,
        })),
      ]);

      expect(everElevated(states)).toBe(false);
      expect(states[states.length - 1].currentMs).toBe(150);
    });

    it('reports the path as unresponsive once responses stop', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        ...flat(5, 150),
        ...Array.from({ length: 6 }, () => ({
          rttMs: 857,
          requests: 1,
          responses: 0,
        })),
      ]);

      expect(states[4].pathAliveAndResponsive).toBe(true);
      expect(states[states.length - 1].pathAliveAndResponsive).toBe(false);
    });
  });

  describe('path liveness is windowed, not instantaneous', () => {
    // A healthy pair reads in-progress for one interval on every consent
    // refresh whose response has not landed yet — four times in 40 s on
    // b043142b. Reading it instantaneously would call a live path dead.
    it('tolerates a transient in-progress interval (b043142b)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        ...flat(4, 215),
        { rttMs: 215, pairState: 'in-progress', requests: 1, responses: 0 },
        ...flat(4, 215),
      ]);

      expect(states[states.length - 1].pathAliveAndResponsive).toBe(true);
    });

    it('does not report liveness before any STUN response is seen', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        { rttMs: 150, requests: 1, responses: 0, pairState: 'in-progress' },
      ]);

      expect(states[0].pathAliveAndResponsive).toBe(false);
    });
  });

  describe('candidate pair changes', () => {
    // b043142b again: the restart at t=44 dropped RTT from 301 to 154 in one
    // interval. Measuring the new pair against the old pair's floor would
    // report the recovered call as still elevated.
    it('starts over on a pair change (b043142b)', () => {
      const detector = new SustainedRttDetector();
      const states = feed(detector, [
        ...flat(4, 151),
        ...flat(8, 300),
        { rttMs: 154, pairChange: true },
        ...flat(6, 154),
      ]);

      const beforeChange = states[11];
      const afterChange = states[states.length - 1];

      expect(beforeChange.elevated).toBe(true);
      expect(afterChange.elevated).toBe(false);
      expect(afterChange.floorMs).toBe(154);
    });

    it('does not difference the new pair against the old counters', () => {
      const detector = new SustainedRttDetector();
      // Requests/responses reset on the pair change; a naive delta would read
      // the drop as a stale-RTT interval and discard it.
      const states = feed(detector, [
        ...flat(6, 400),
        { rttMs: 120, pairChange: true },
        ...flat(6, 120),
      ]);

      expect(states[states.length - 1].floorMs).toBe(120);
    });
  });

  describe('configuration', () => {
    it('honours a raised lift threshold', () => {
      const states = feed(new SustainedRttDetector({ minLiftMs: 400 }), [
        ...flat(5, 150),
        ...flat(8, 300),
      ]);

      expect(everElevated(states)).toBe(false);
    });

    it('honours a raised hold requirement', () => {
      const states = feed(
        new SustainedRttDetector({ consecutiveSamples: 10 }),
        [...flat(5, 150), ...flat(5, 400)]
      );

      expect(everElevated(states)).toBe(false);
    });
  });

  describe('describe()', () => {
    it('says so when the floor is not established yet', () => {
      expect(new SustainedRttDetector().describe()).toBe(
        'floor not established'
      );
    });

    it('reports floor, current, lift and ramp', () => {
      const detector = new SustainedRttDetector();
      feed(detector, [...flat(5, 150), ...flat(5, 450)]);

      expect(detector.describe()).toBe(
        'floor=150ms current=450ms lift=300ms ramp=3.00x'
      );
    });
  });

  it('tolerates intervals with no RTT at all', () => {
    const detector = new SustainedRttDetector();
    const states = feed(detector, [
      ...flat(5, 150),
      { rttMs: undefined },
      ...flat(5, 400),
    ]);

    expect(everElevated(states)).toBe(true);
  });
});
