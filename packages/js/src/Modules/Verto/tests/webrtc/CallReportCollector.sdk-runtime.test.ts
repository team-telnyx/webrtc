import {
  CallReportCollector,
  type ICallReportOptions,
  type IStatsInterval,
} from '../../webrtc/CallReportCollector';
import type { IEventLoopWindow } from '../../services/EventLoopMonitor';

/**
 * `sdkRuntime` describes the observer rather than the call, and keeps two
 * quantities apart on purpose:
 *
 * - `collectionLatenessMs` — callback-entry delay, stamped before any await,
 *   so it is the event loop alone.
 * - `collectionDurationMs` — how long `await getStats()` took. Asynchronous
 *   work, not blocking.
 *
 * Conflating them attributes a slow stats call to a blocked main thread, so
 * these tests drive the real scheduler and make each one move independently.
 */
type Testable = {
  start: (pc: unknown) => void;
  stop: () => Promise<void>;
  getStatsBuffer: () => IStatsInterval[];
  onDrainEventLoopWindow: (() => IEventLoopWindow | null) | null;
};

const statsReport = (entries: Array<Record<string, unknown>>) =>
  ({
    forEach: (fn: (value: unknown) => void) => entries.forEach(fn),
  }) as unknown as RTCStatsReport;

/** Controlled clock. Jest's fake timers cannot express a late callback: a
 * setSystemTime jump does not make a pending timer due, and
 * advanceTimersByTime fires it with the clock set to its *due* time, so
 * lateness always reads zero. Driving Date.now() separately from the timer
 * queue is the only way to model a callback that entered late. */
let clock = 0;
const advanceClock = (ms: number) => {
  clock += ms;
};

/** A peer connection whose getStats() takes `delayMs` of asynchronous time. */
const createPeerConnection = (getDelay: () => number = () => 0) => ({
  getSenders: () => [{ track: { kind: 'audio', id: 't1' } }],
  getStats: async () => {
    // Asynchronous elapsed time that did not block the event loop.
    advanceClock(getDelay());
    return statsReport([
      {
        type: 'outbound-rtp',
        kind: 'audio',
        mediaType: 'audio',
        id: 'out-1',
        packetsSent: 500,
        bytesSent: 40_000,
        timestamp: 2_000_000,
      },
    ]);
  },
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
 * Let the scheduled collection fire, having spent `extraLagMs` more wall time
 * than the period — i.e. the callback entered that late.
 */
async function runOneCollection(extraLagMs = 0): Promise<void> {
  advanceClock(1000 + extraLagMs);
  jest.advanceTimersByTime(1000);
  // Flush the promise chain inside the timer callback.
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

const lastRuntime = (collector: Testable) =>
  collector.getStatsBuffer().at(-1)?.sdkRuntime;

describe('CallReportCollector sdkRuntime', () => {
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    clock = 1_700_000_000_000;
    jest.useFakeTimers('modern');
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    setVisibility('visible');
  });

  afterEach(() => {
    nowSpy.mockRestore();
    jest.useRealTimers();
    setVisibility('visible');
  });

  it('reports a punctual collection as not late', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());

    await runOneCollection();

    expect(lastRuntime(collector)?.collectionIntervalMs).toBe(1000);
    expect(lastRuntime(collector)?.collectionLatenessMs).toBe(0);
  });

  it('attributes a late callback entry to the event loop', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());

    await runOneCollection(1350);

    expect(lastRuntime(collector)?.collectionLatenessMs).toBe(1350);
  });

  it('does not count a slow getStats() as event-loop lateness (review)', async () => {
    // The interval timestamps fold the stats call into the period, which is
    // why a 300ms getStats() could read as a blocked main thread. Callback
    // entry was on time, so lateness must stay zero.
    const collector = createCollector();
    collector.start(createPeerConnection(() => 300));

    await runOneCollection();

    const runtime = lastRuntime(collector);
    expect(runtime?.collectionLatenessMs).toBe(0);
    expect(runtime?.collectionDurationMs).toBeGreaterThanOrEqual(300);
  });

  it('separates the two when both are present', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection(() => 200));

    await runOneCollection(800);

    const runtime = lastRuntime(collector);
    expect(runtime?.collectionLatenessMs).toBe(800);
    expect(runtime?.collectionDurationMs).toBeGreaterThanOrEqual(200);
    // Their sum is what a server-side derivation would have seen.
    expect(
      (runtime?.collectionLatenessMs ?? 0) +
        (runtime?.collectionDurationMs ?? 0)
    ).toBeGreaterThanOrEqual(1000);
  });

  it('records the document visibility with each interval', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());

    setVisibility('hidden');
    await runOneCollection();

    expect(lastRuntime(collector)?.visibilityState).toBe('hidden');
  });

  it('attributes event-loop activity to the interval that is closing', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());
    collector.onDrainEventLoopWindow = jest
      .fn()
      .mockReturnValueOnce(
        window({ episodes: 2, blockedEpisodes: 2, maxLagMs: 1346 })
      )
      .mockReturnValue(window());

    await runOneCollection();
    const first = lastRuntime(collector);
    expect(first?.maxEventLoopLagMs).toBe(1346);
    expect(first?.eventLoopEpisodes).toBe(2);
    expect(first?.eventLoopBlockedEpisodes).toBe(2);

    await runOneCollection();
    const second = lastRuntime(collector);
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

    await runOneCollection();

    const runtime = lastRuntime(collector);
    expect(runtime?.eventLoopThrottledEpisodes).toBe(1);
    expect(runtime?.eventLoopBlockedEpisodes).toBe(0);
    expect(runtime?.maxEventLoopLagMs).toBe(0);
    expect(runtime?.hiddenMs).toBe(58_000);
  });

  it('still reports its own timing with no monitor attached', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());
    collector.onDrainEventLoopWindow = null;

    await runOneCollection(800);

    const runtime = lastRuntime(collector);
    expect(runtime?.collectionLatenessMs).toBe(800);
    expect(runtime?.eventLoopEpisodes).toBeUndefined();
  });

  it('survives a throwing drain hook', async () => {
    const collector = createCollector();
    collector.start(createPeerConnection());
    collector.onDrainEventLoopWindow = () => {
      throw new Error('monitor gone');
    };

    await runOneCollection(500);

    expect(lastRuntime(collector)?.collectionLatenessMs).toBe(500);
  });
});
