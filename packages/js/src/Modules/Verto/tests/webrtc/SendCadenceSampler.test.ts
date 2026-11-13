import {
  SendCadenceSampler,
  type ISendCadenceMetrics,
  type ISendCadenceSamplerConfig,
} from '../../webrtc/SendCadenceSampler';

const PERIOD = 250;
/** Default Opus: 50 packets/s, so 12.5 packets per 250 ms window. */
const PER_PERIOD = 12.5;

/**
 * Drive the sampler with a packet-rate script.
 *
 * Each step says how many packets the counter advanced and how far the WebRTC
 * clock advanced, so a test can make our own timer late independently of what
 * the send path did — the distinction the sampler exists to draw.
 */
function run(
  steps: Array<{ packets: number; ms?: number }>,
  config: Partial<ISendCadenceSamplerConfig> = {}
): { sampler: SendCadenceSampler; metrics: ISendCadenceMetrics | null } {
  const sampler = new SendCadenceSampler({ periodMs: PERIOD, ...config });
  let packetsSent = 0;
  let timestampMs = 1_000_000;

  sampler.addSample({ packetsSent, timestampMs });
  steps.forEach(({ packets, ms }) => {
    packetsSent += packets;
    timestampMs += ms ?? PERIOD;
    sampler.addSample({ packetsSent, timestampMs });
  });

  return { sampler, metrics: sampler.drain() };
}

/** `n` windows of undisturbed 50 packets/s. */
function steady(n: number): Array<{ packets: number }> {
  return Array.from({ length: n }, () => ({ packets: PER_PERIOD }));
}

describe('SendCadenceSampler', () => {
  describe('baseline', () => {
    it('reports nothing until the call has calibrated its own rate', () => {
      const { metrics } = run(steady(2));

      expect(metrics?.samples).toBe(2);
      // Lateness needs no baseline, so it is always present.
      expect(metrics?.lateSamples).toBe(0);
      // Everything rate-derived is withheld.
      expect(metrics?.baselinePacketRate).toBeUndefined();
      expect(metrics?.maxBurstPackets).toBeUndefined();
      expect(metrics?.stalledMs).toBeUndefined();
    });

    it('calibrates to 50 packets/s and 20 ms ptime for default Opus', () => {
      const { metrics } = run(steady(8));

      expect(metrics?.baselinePacketRate).toBeCloseTo(50, 1);
      expect(metrics?.ptimeMs).toBeCloseTo(20, 1);
    });

    it('calibrates to a negotiated ptime of 60 ms instead of assuming 20', () => {
      // ptime=60 -> 16.67 packets/s -> ~4.17 per 250 ms window.
      const { metrics } = run(
        Array.from({ length: 10 }, () => ({ packets: 1000 / 60 / 4 }))
      );

      expect(metrics?.baselinePacketRate).toBeCloseTo(16.67, 1);
      expect(metrics?.ptimeMs).toBeCloseTo(60, 0);
      // A hardcoded 50 packets/s would read this whole call as one long stall.
      expect(metrics?.stalledMs).toBe(0);
      expect(metrics?.maxBurstPackets).toBe(0);
    });

    it('is not dragged to zero by pre-media windows', () => {
      const { metrics } = run([
        { packets: 0 },
        { packets: 0 },
        { packets: 0 },
        ...steady(8),
      ]);

      expect(metrics?.baselinePacketRate).toBeCloseTo(50, 1);
      // With a zero-weighted baseline every later window would look like a burst.
      expect(metrics?.maxBurstPackets).toBe(0);
    });
  });

  describe('steady cadence', () => {
    it('reports no stall and no burst', () => {
      const { metrics } = run(steady(12));

      expect(metrics?.stalledMs).toBe(0);
      expect(metrics?.maxStallMs).toBe(0);
      expect(metrics?.maxBurstPackets).toBe(0);
      expect(metrics?.stallFlushPairs).toBe(0);
      expect(metrics?.stalledRatio).toBe(0);
    });
  });

  describe('stall and flush', () => {
    it('measures the shortfall, the flush, and pairs them', () => {
      const { metrics } = run([
        ...steady(8),
        // 200 ms of the 250 ms window produced nothing.
        { packets: 2.5 },
        // The backlog goes out on top of the window's own packets.
        { packets: 22.5 },
        ...steady(2),
      ]);

      expect(metrics?.maxStallMs).toBeCloseTo(200, 0);
      expect(metrics?.stalledMs).toBeCloseTo(200, 0);
      expect(metrics?.maxBurstPackets).toBeCloseTo(10, 0);
      expect(metrics?.maxBurstMs).toBeCloseTo(200, 0);
      expect(metrics?.stallFlushPairs).toBe(1);
    });

    it('does not pair a shortfall that is never flushed', () => {
      // Media simply stopped: that is loss, which the loss counters own.
      const { metrics } = run([...steady(8), { packets: 0 }, { packets: 0 }]);

      expect(metrics?.stalledMs).toBeGreaterThan(0);
      expect(metrics?.stallFlushPairs).toBe(0);
      expect(metrics?.maxBurstPackets).toBe(0);
    });

    it('reproduces the 43-packet burst measured in production', () => {
      // Call 568d1039: a 43-datagram flush preceded the server's answering
      // latency stepping from 442 ms to 818 ms. 20 ms x 43 = 860 ms predicted.
      const { metrics } = run([
        ...steady(8),
        { packets: 0 },
        { packets: 0 },
        { packets: 0 },
        { packets: 43 + PER_PERIOD },
        ...steady(2),
      ]);

      expect(metrics?.maxBurstPackets).toBeCloseTo(43, 0);
      expect(metrics?.maxBurstMs).toBeCloseTo(860, -1);
      expect(metrics?.stallFlushPairs).toBe(1);
      expect(metrics?.maxStallMs).toBeCloseTo(250, 0);
      expect(metrics?.stalledMs).toBeCloseTo(750, 0);
    });

    it('reports a stalled ratio against measured, not nominal, duration', () => {
      const { metrics } = run([
        ...steady(8),
        { packets: 0 },
        { packets: 25 },
        ...steady(2),
      ]);

      // 250 ms stalled out of 12 x 250 ms measured.
      expect(metrics?.stalledRatio).toBeCloseTo(250 / (12 * PERIOD), 3);
    });
  });

  describe('our own lateness is not a send-path stall', () => {
    it('reports no stall when the packets arrive in proportion to a late timer', () => {
      // The event loop blocked for 500 ms. The send path was fine: three
      // windows' worth of packets in a window three times as long.
      const { metrics } = run([
        ...steady(8),
        { packets: PER_PERIOD * 3, ms: PERIOD * 3 },
        ...steady(2),
      ]);

      expect(metrics?.stalledMs).toBe(0);
      expect(metrics?.maxBurstPackets).toBe(0);
      // ...but the lateness itself is recorded, for the event-loop monitor.
      expect(metrics?.lateSamples).toBe(1);
      expect(metrics?.maxSamplerLatenessMs).toBeCloseTo(500, 0);
    });

    it('reports both when a thread stall holds up the timer and the send path', () => {
      const { metrics } = run([
        ...steady(8),
        // Timer 3x late and almost nothing sent: the stall was broad.
        { packets: PER_PERIOD, ms: PERIOD * 3 },
        { packets: PER_PERIOD * 3 },
        ...steady(2),
      ]);

      expect(metrics?.lateSamples).toBe(1);
      expect(metrics?.maxStallMs).toBeGreaterThan(400);
      expect(metrics?.maxBurstPackets).toBeGreaterThan(0);
      expect(metrics?.stallFlushPairs).toBe(1);
    });

    it('never reports negative lateness when the timer runs early', () => {
      const { metrics } = run([...steady(8), { packets: 5, ms: 100 }]);

      expect(metrics?.maxSamplerLatenessMs).toBe(0);
      expect(metrics?.lateSamples).toBe(0);
    });
  });

  describe('robustness', () => {
    it('returns null when no window was measured', () => {
      const sampler = new SendCadenceSampler({ periodMs: PERIOD });

      expect(sampler.drain()).toBeNull();

      sampler.addSample({ packetsSent: 0, timestampMs: 1_000 });
      expect(sampler.drain()).toBeNull();
    });

    it('ignores a duplicate reading rather than dividing by zero', () => {
      const sampler = new SendCadenceSampler({ periodMs: PERIOD });
      sampler.addSample({ packetsSent: 100, timestampMs: 1_000 });
      sampler.addSample({ packetsSent: 100, timestampMs: 1_000 });

      expect(sampler.drain()).toBeNull();
    });

    it('ignores a clock that goes backwards', () => {
      const sampler = new SendCadenceSampler({ periodMs: PERIOD });
      sampler.addSample({ packetsSent: 100, timestampMs: 2_000 });
      sampler.addSample({ packetsSent: 112, timestampMs: 1_000 });

      expect(sampler.drain()).toBeNull();
    });

    it('starts over when the counter resets on a replaced sender', () => {
      const sampler = new SendCadenceSampler({ periodMs: PERIOD });
      let packetsSent = 0;
      let timestampMs = 1_000_000;
      for (let i = 0; i < 10; i += 1) {
        packetsSent += PER_PERIOD;
        timestampMs += PERIOD;
        sampler.addSample({ packetsSent, timestampMs });
      }
      expect(sampler.drain()?.baselinePacketRate).toBeCloseTo(50, 1);

      // replaceTrack: new SSRC, counter back to zero.
      timestampMs += PERIOD;
      sampler.addSample({ packetsSent: 0, timestampMs });
      timestampMs += PERIOD;
      sampler.addSample({ packetsSent: PER_PERIOD, timestampMs });

      // The old baseline is gone, so nothing rate-derived is reported yet.
      const after = sampler.drain();
      expect(after?.baselinePacketRate).toBeUndefined();
      expect(after?.maxBurstPackets).toBeUndefined();
    });

    it('clears accumulators on drain but keeps the baseline', () => {
      const sampler = new SendCadenceSampler({ periodMs: PERIOD });
      let packetsSent = 0;
      let timestampMs = 1_000_000;
      const push = (packets: number) => {
        packetsSent += packets;
        timestampMs += PERIOD;
        sampler.addSample({ packetsSent, timestampMs });
      };
      for (let i = 0; i < 8; i += 1) push(PER_PERIOD);
      push(0);
      push(25);

      const first = sampler.drain();
      expect(first?.stalledMs).toBeGreaterThan(0);
      expect(first?.maxBurstPackets).toBeGreaterThan(0);

      push(PER_PERIOD);
      push(PER_PERIOD);
      const second = sampler.drain();

      // Accumulators reset...
      expect(second?.stalledMs).toBe(0);
      expect(second?.maxBurstPackets).toBe(0);
      expect(second?.samples).toBe(2);
      // ...baseline survives, so cadence is judged against the whole call.
      expect(second?.baselinePacketRate).toBeCloseTo(50, 1);
    });

    it('forgets everything on reset', () => {
      const { sampler } = run(steady(10));
      sampler.reset();

      expect(sampler.drain()).toBeNull();
    });
  });
});
