import {
  CallReportCollector,
  type ICallReportOptions,
  type IStatsInterval,
} from '../../webrtc/CallReportCollector';

/**
 * The cadence sampler is driven by its own fast timer inside the collector.
 * These tests reach for the private sampling step directly so they assert the
 * plumbing — sender-scoped stats in, `audio.outbound.sendCadence` out — without
 * orchestrating two interleaved timers.
 */
type Testable = {
  peerConnection: unknown;
  start: (pc: unknown) => void;
  stop: () => Promise<void>;
  getStatsBuffer: () => IStatsInterval[];
  _sampleSendCadence: () => Promise<void>;
  _sendCadenceTimerId: ReturnType<typeof setTimeout> | null;
  _sendCadence: unknown;
};

const statsReport = (entries: Array<Record<string, unknown>>) => {
  const map = new Map(entries.map((e, i) => [String(i), e]));
  return {
    forEach: (fn: (value: unknown) => void) => map.forEach((v) => fn(v)),
  } as unknown as RTCStatsReport;
};

/** A peer connection whose audio sender reports a given packet counter. */
const createPeerConnection = (
  senderStats: () => RTCStatsReport,
  options: { senderHasGetStats?: boolean } = {}
) => {
  const sender: Record<string, unknown> = {
    track: { kind: 'audio', enabled: true, muted: false, id: 'track-1' },
  };
  if (options.senderHasGetStats !== false) {
    sender.getStats = jest.fn().mockImplementation(async () => senderStats());
  }

  return {
    getSenders: () => [sender],
    getStats: async () =>
      statsReport([
        {
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          id: 'out-1',
          packetsSent: 500,
          bytesSent: 40_000,
          timestamp: 2_000_000,
        },
      ]),
    sender,
  };
};

const createCollector = (options: Partial<ICallReportOptions> = {}) =>
  new CallReportCollector({
    enabled: true,
    interval: 1000,
    ...options,
  }) as unknown as Testable;

/** Feed `n` readings advancing by `packetsPerSample` every `periodMs`. */
const feed = async (
  collector: Testable,
  counter: { packets: number; timestamp: number },
  n: number,
  packetsPerSample: number,
  periodMs = 250
) => {
  for (let i = 0; i < n; i += 1) {
    counter.packets += packetsPerSample;
    counter.timestamp += periodMs;
    await collector._sampleSendCadence();
  }
};

describe('CallReportCollector send cadence', () => {
  let counter: { packets: number; timestamp: number };
  let pc: ReturnType<typeof createPeerConnection>;

  beforeEach(() => {
    counter = { packets: 0, timestamp: 1_000_000 };
    pc = createPeerConnection(() =>
      statsReport([
        {
          type: 'outbound-rtp',
          kind: 'audio',
          id: 'out-1',
          packetsSent: counter.packets,
          timestamp: counter.timestamp,
        },
      ])
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('attaches a sendCadence block to the stats entry', async () => {
    const collector = createCollector();
    collector.start(pc);

    // 10 undisturbed windows at 50 packets/s.
    await feed(collector, counter, 10, 12.5);
    await collector.stop();

    const entry = collector.getStatsBuffer().at(-1);
    const cadence = entry?.audio?.outbound?.sendCadence;

    expect(cadence).toBeDefined();
    // 10 readings bound 9 measurable windows.
    expect(cadence?.samples).toBe(9);
    expect(cadence?.baselinePacketRate).toBeCloseTo(50, 1);
    expect(cadence?.ptimeMs).toBeCloseTo(20, 1);
    expect(cadence?.maxBurstPackets).toBe(0);
    expect(cadence?.stalledMs).toBe(0);
  });

  it('surfaces a stall and the burst that flushes it', async () => {
    const collector = createCollector();
    collector.start(pc);

    await feed(collector, counter, 8, 12.5);
    await feed(collector, counter, 1, 0); // 250 ms produced nothing
    await feed(collector, counter, 1, 25); // the backlog goes out
    await collector.stop();

    const cadence = collector.getStatsBuffer().at(-1)?.audio
      ?.outbound?.sendCadence;

    expect(cadence?.maxStallMs).toBeCloseTo(250, 0);
    expect(cadence?.maxBurstPackets).toBeCloseTo(12.5, 0);
    expect(cadence?.stallFlushPairs).toBe(1);
  });

  it('reads the sender rather than the whole connection', async () => {
    const collector = createCollector();
    collector.start(pc);

    await feed(collector, counter, 3, 12.5);
    await collector.stop();

    expect(pc.sender.getStats).toHaveBeenCalledTimes(3);
  });

  it('omits the block entirely when disabled', async () => {
    const collector = createCollector({ sendCadenceInterval: 0 });
    collector.start(pc);

    await feed(collector, counter, 10, 12.5);
    await collector.stop();

    const entry = collector.getStatsBuffer().at(-1);

    expect(entry?.audio?.outbound).toBeDefined();
    expect(entry?.audio?.outbound?.sendCadence).toBeUndefined();
    expect(collector._sendCadence).toBeNull();
    expect(pc.sender.getStats).not.toHaveBeenCalled();
  });

  it('omits the block when nothing was ever sampled', async () => {
    const collector = createCollector();
    collector.start(pc);

    await collector.stop();

    expect(
      collector.getStatsBuffer().at(-1)?.audio?.outbound?.sendCadence
    ).toBeUndefined();
  });

  it('tolerates a sender without getStats', async () => {
    const legacy = createPeerConnection(() => statsReport([]), {
      senderHasGetStats: false,
    });
    const collector = createCollector();
    collector.start(legacy);

    await expect(collector._sampleSendCadence()).resolves.toBeUndefined();

    await collector.stop();

    expect(
      collector.getStatsBuffer().at(-1)?.audio?.outbound?.sendCadence
    ).toBeUndefined();
  });

  it('never lets a failing stats call disturb the report', async () => {
    const collector = createCollector();
    collector.start(pc);
    (pc.sender.getStats as jest.Mock).mockRejectedValueOnce(
      new Error('stats unavailable')
    );

    await expect(collector._sampleSendCadence()).resolves.toBeUndefined();

    await feed(collector, counter, 10, 12.5);
    await collector.stop();

    expect(
      collector.getStatsBuffer().at(-1)?.audio?.outbound?.sendCadence?.samples
    ).toBe(9);
  });

  it('clears the sampling timer on stop', async () => {
    const collector = createCollector();
    collector.start(pc);

    expect(collector._sendCadenceTimerId).not.toBeNull();

    await collector.stop();

    expect(collector._sendCadenceTimerId).toBeNull();
  });
});
