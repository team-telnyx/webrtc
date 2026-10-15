import {
  CallReportCollector,
  type ICallReportOptions,
  type IStatsInterval,
} from '../../webrtc/CallReportCollector';
import type { IEventLoopWindow } from '../../services/EventLoopMonitor';

/**
 * The runtime block describes the observer rather than the call. These tests
 * drive the private collection step so the plumbing is asserted without
 * orchestrating a live timer.
 */
type Testable = {
  start: (pc: unknown) => void;
  stop: () => Promise<void>;
  getStatsBuffer: () => IStatsInterval[];
  onDrainEventLoopWindow: (() => IEventLoopWindow | null) | null;
  _collectStats: (isFinal?: boolean) => Promise<void>;
};

const statsReport = (entries: Array<Record<string, unknown>>) =>
  ({
    forEach: (fn: (value: unknown) => void) => entries.forEach(fn),
  }) as unknown as RTCStatsReport;

const createPeerConnection = () => ({
  getSenders: () => [{ track: { kind: 'audio', id: 't1' } }],
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
});

const createCollector = (options: Partial<ICallReportOptions> = {}) =>
  new CallReportCollector({
    enabled: true,
    interval: 1000,
    ...options,
  }) as unknown as Testable;

const window = (over: Partial<IEventLoopWindow> = {}): IEventLoopWindow => ({
  episodes: 0,
  blockedEpisodes: 0,
  throttledEpisodes: 0,
  maxLagMs: 0,
  hiddenMs: 0,
  ...over,
});

const setVisibility = (state: 'visible' | 'hidden') =>
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });

/**
 * The interval most recently pushed to the buffer.
 *
 * These tests deliberately never call `stop()`: it performs its own final
 * collection, which lands a second interval measured at zero elapsed time and
 * shadows the one under test.
 */
const lastEntry = (collector: Testable) => collector.getStatsBuffer().at(-1);

describe('CallReportCollector sdkRuntime', () => {
  let clock: number;

  // The collector reads the clock with `new Date()`, which a Date.now spy does
  // not affect. Fake timers move both.
  const advance = (ms: number) => {
    clock += ms;
    jest.setSystemTime(clock);
  };

  beforeEach(() => {
    clock = 1_700_000_000_000;
    jest.useFakeTimers('modern');
    jest.setSystemTime(clock);
    setVisibility('visible');
  });

  afterEach(() => {
    jest.useRealTimers();
    setVisibility('visible');
  });

  it('measures how late its own collection ran', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());

    // First collection establishes the reference point.
    await collector._collectStats(true);
    // Second runs 1350 ms after a 1000 ms request.
    advance(2350);
    await collector._collectStats(true);

    const runtime = lastEntry(collector)?.sdkRuntime;
    expect(runtime?.collectionIntervalMs).toBe(1000);
    expect(runtime?.collectionLatenessMs).toBe(1350);
  });

  it('reports no lateness for a punctual collection', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());

    await collector._collectStats(true);
    advance(1004);
    await collector._collectStats(true);

    expect(lastEntry(collector)?.sdkRuntime?.collectionLatenessMs).toBe(4);
  });

  it('never reports negative lateness when a collection runs early', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());

    await collector._collectStats(true);
    advance(400);
    await collector._collectStats(true);

    expect(lastEntry(collector)?.sdkRuntime?.collectionLatenessMs).toBe(0);
  });

  it('omits lateness on the very first collection', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());

    await collector._collectStats(true);

    const runtime = collector.getStatsBuffer()[0]?.sdkRuntime;
    // Absent means not measured, which is not the same as measured as zero.
    expect(runtime?.collectionLatenessMs).toBeUndefined();
    expect(runtime?.visibilityState).toBe('visible');
  });

  it('records the document visibility with each interval', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());

    setVisibility('hidden');
    await collector._collectStats(true);

    expect(lastEntry(collector)?.sdkRuntime?.visibilityState).toBe('hidden');
  });

  it('attributes event-loop activity to the interval that is closing', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());
    collector.onDrainEventLoopWindow = jest
      .fn()
      .mockReturnValueOnce(
        window({ episodes: 2, blockedEpisodes: 2, maxLagMs: 1346 })
      )
      .mockReturnValueOnce(window());

    await collector._collectStats(true);
    const first = lastEntry(collector)?.sdkRuntime;
    expect(first?.maxEventLoopLagMs).toBe(1346);
    expect(first?.eventLoopEpisodes).toBe(2);
    expect(first?.eventLoopBlockedEpisodes).toBe(2);

    advance(1000);
    await collector._collectStats(true);

    // A quiet interval reports its own emptiness, not the previous lag.
    const second = lastEntry(collector)?.sdkRuntime;
    expect(second?.maxEventLoopLagMs).toBe(0);
    expect(second?.eventLoopEpisodes).toBe(0);
  });

  it('keeps throttled episodes distinguishable from blocking', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());
    collector.onDrainEventLoopWindow = () =>
      window({
        episodes: 1,
        throttledEpisodes: 1,
        maxLagMs: 0,
        hiddenMs: 58_000,
      });

    await collector._collectStats(true);

    const runtime = lastEntry(collector)?.sdkRuntime;
    expect(runtime?.eventLoopThrottledEpisodes).toBe(1);
    expect(runtime?.eventLoopBlockedEpisodes).toBe(0);
    // A hidden tab is not a blocked main thread, so the lag figure stays clear.
    expect(runtime?.maxEventLoopLagMs).toBe(0);
    expect(runtime?.hiddenMs).toBe(58_000);
  });

  it('still reports its own lateness with no monitor attached', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());
    collector.onDrainEventLoopWindow = null;

    await collector._collectStats(true);
    advance(1800);
    await collector._collectStats(true);

    const runtime = lastEntry(collector)?.sdkRuntime;
    expect(runtime?.collectionLatenessMs).toBe(800);
    expect(runtime?.eventLoopEpisodes).toBeUndefined();
  });

  it('survives a throwing drain hook', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());
    collector.onDrainEventLoopWindow = () => {
      throw new Error('monitor gone');
    };

    await collector._collectStats(true);
    advance(1500);
    await expect(collector._collectStats(true)).resolves.toBeUndefined();

    expect(lastEntry(collector)?.sdkRuntime?.collectionLatenessMs).toBe(500);
  });
});
