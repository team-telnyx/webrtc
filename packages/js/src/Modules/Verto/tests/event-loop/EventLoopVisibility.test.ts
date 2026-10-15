/* eslint-disable @typescript-eslint/no-explicit-any */
import EventLoopMonitor from '../../services/EventLoopMonitor';

jest.mock('../../util/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockObserver = { observe: jest.fn(), disconnect: jest.fn() };
(global as any).PerformanceObserver = jest.fn(() => mockObserver);

const HEARTBEAT = 2000;

/**
 * Replace `document.visibilityState` and fire the event the monitor listens
 * for. jsdom defines the property as a read-only getter, so it has to be
 * redefined rather than assigned.
 */
function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('EventLoopMonitor visibility and per-interval attribution', () => {
  let monitor: EventLoopMonitor;
  let clock: number;
  let fireHeartbeat: (() => void) | null;
  let setIntervalSpy: jest.SpyInstance;

  beforeEach(() => {
    clock = 1700000000000;
    jest.useFakeTimers('modern');
    jest.setSystemTime(clock);
    jest.clearAllMocks();
    setVisibility('visible');

    // Capture the heartbeat callback and fire it by hand. Letting jest run the
    // interval is not usable here: advanceTimersByTime moves the mocked clock
    // as well, so injecting lag by also setting the system time counts the
    // period twice. Worse, a 58s advance would fire a 2s interval 29 times,
    // which is the opposite of the throttling being modelled — a throttled
    // timer fires once, late.
    fireHeartbeat = null;
    setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(((
      fn: () => void
    ) => {
      fireHeartbeat = fn;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as unknown as typeof setInterval);

    monitor = new EventLoopMonitor();
  });

  afterEach(() => {
    monitor.stop();
    setIntervalSpy.mockRestore();
    setVisibility('visible');
    jest.useRealTimers();
  });

  /** Move the clock forward without firing anything. */
  function advance(ms: number): void {
    clock += ms;
    jest.setSystemTime(clock);
  }

  /** Fire the heartbeat once, `lagMs` later than it was scheduled for. */
  function tickWithLag(lagMs: number): void {
    advance(HEARTBEAT + lagMs);
    fireHeartbeat?.();
  }

  describe('a hidden document is throttled, not blocked', () => {
    it('classifies a long lag on a hidden document as throttled', () => {
      const onCongestion = jest.fn();
      monitor.start(onCongestion);

      // The tab goes hidden, then the timer fires a minute late — which is
      // what intensive throttling does, not what a blocked thread does.
      setVisibility('hidden');
      tickWithLag(58_000);

      const summary = monitor.getSummary();
      expect(summary?.totalEpisodes).toBe(1);
      expect(summary?.episodes[0].kind).toBe('throttled');
      expect(summary?.episodes[0].visibilityState).toBe('hidden');
      expect(summary?.throttledEpisodes).toBe(1);
      expect(summary?.blockedEpisodes).toBe(0);
      // Nobody should be warned that the main thread was blocked for 58s.
      expect(onCongestion).not.toHaveBeenCalled();
    });

    it('keeps maxBlockedLagMs clear of throttled episodes', () => {
      monitor.start();
      setVisibility('hidden');
      tickWithLag(58_000);

      const summary = monitor.getSummary();
      expect(summary?.maxLagMs).toBe(58_000);
      expect(summary?.maxBlockedLagMs).toBe(0);
    });

    it('still reports blocking on a visible document', () => {
      const onCongestion = jest.fn();
      monitor.start(onCongestion);

      tickWithLag(1500);

      const summary = monitor.getSummary();
      expect(summary?.episodes[0].kind).toBe('blocked');
      expect(summary?.episodes[0].visibilityState).toBe('visible');
      expect(summary?.blockedEpisodes).toBe(1);
      expect(summary?.maxBlockedLagMs).toBe(1500);
      expect(onCongestion).toHaveBeenCalledTimes(1);
    });

    it('counts a tab hidden only part of the window as blocked', () => {
      monitor.start();

      // Hidden partway through: throttling cannot account for the whole lag.
      advance(1500);
      setVisibility('hidden');
      tickWithLag(1500);

      expect(monitor.getSummary()?.episodes[0].kind).toBe('blocked');
    });

    it('a long task is always blocking, whatever the visibility', () => {
      // Also covers the timestamp path: performance.timeOrigin is a function
      // stub under jsdom, and the unguarded arithmetic threw a RangeError from
      // inside the observer callback.
      monitor.start();
      setVisibility('hidden');

      const listener = (global as any).PerformanceObserver.mock.calls[0][0];
      listener({ getEntries: () => [{ duration: 800, startTime: 10 }] });

      const summary = monitor.getSummary();
      expect(summary?.episodes[0].source).toBe('longtask');
      expect(summary?.episodes[0].kind).toBe('blocked');
      expect(summary?.blockedEpisodes).toBe(1);
    });
  });

  describe('recording and warning thresholds are separate', () => {
    it('records a 500ms lag that would not have been recorded before', () => {
      const onCongestion = jest.fn();
      monitor.start(onCongestion);

      tickWithLag(600);

      // Recorded, because the measured stalls were 100-513ms and a 1s bar
      // fired once in 645s on the call this was built from...
      expect(monitor.getSummary()?.totalEpisodes).toBe(1);
      expect(monitor.getSummary()?.episodes[0].lagMs).toBe(600);
      // ...but not warned about, so 37001 is no noisier than before.
      expect(onCongestion).not.toHaveBeenCalled();
    });

    it('ignores normal scheduling jitter below the recording bar', () => {
      monitor.start();
      tickWithLag(120);

      expect(monitor.getSummary()).toBeNull();
    });

    it('warns once the lag reaches the warning bar', () => {
      const onCongestion = jest.fn();
      monitor.start(onCongestion);

      tickWithLag(1000);

      expect(onCongestion).toHaveBeenCalledTimes(1);
    });
  });

  describe('drainWindow()', () => {
    it('attributes episodes to the interval that is closing, then resets', () => {
      monitor.start();

      tickWithLag(1500);
      const first = monitor.drainWindow();
      expect(first.episodes).toBe(1);
      expect(first.blockedEpisodes).toBe(1);
      expect(first.maxLagMs).toBe(1500);

      // A quiet interval must report its own emptiness, not the last one's lag.
      const second = monitor.drainWindow();
      expect(second.episodes).toBe(0);
      expect(second.blockedEpisodes).toBe(0);
      expect(second.maxLagMs).toBe(0);

      // The session total still holds the episode.
      expect(monitor.getSummary()?.totalEpisodes).toBe(1);
    });

    it('separates throttled from blocked within a window', () => {
      monitor.start();

      tickWithLag(1500);
      setVisibility('hidden');
      tickWithLag(5000);

      const window = monitor.drainWindow();
      expect(window.episodes).toBe(2);
      expect(window.blockedEpisodes).toBe(1);
      expect(window.throttledEpisodes).toBe(1);
      // Only real blocking contributes to the lag figure.
      expect(window.maxLagMs).toBe(1500);
    });

    it('reports visibility at drain time', () => {
      monitor.start();
      expect(monitor.drainWindow().visibilityState).toBe('visible');

      setVisibility('hidden');
      expect(monitor.drainWindow().visibilityState).toBe('hidden');
    });

    it('counts hidden time per window without double counting', () => {
      monitor.start();

      setVisibility('hidden');
      advance(3000);
      setVisibility('visible');

      const first = monitor.drainWindow();
      expect(first.hiddenMs).toBe(3000);

      // The next window starts clean even though the session total keeps it.
      const second = monitor.drainWindow();
      expect(second.hiddenMs).toBe(0);
    });

    it('counts only the in-window part of a hidden span that straddles a drain', () => {
      monitor.start();

      setVisibility('hidden');
      advance(1000);
      expect(monitor.drainWindow().hiddenMs).toBe(1000);

      // Still hidden. The next window must count from the drain, not from
      // when the tab was first hidden.
      advance(500);
      expect(monitor.drainWindow().hiddenMs).toBe(500);
    });
  });

  describe('session summary', () => {
    it('accumulates hidden time across the session', () => {
      monitor.start();

      setVisibility('hidden');
      advance(2000);
      setVisibility('visible');
      advance(1000);
      setVisibility('hidden');
      advance(500);
      tickWithLag(600);

      expect(monitor.getSummary()?.hiddenMs).toBeGreaterThanOrEqual(2500);
    });

    it('removes the visibility listener on stop', () => {
      const remove = jest.spyOn(document, 'removeEventListener');
      monitor.start();
      monitor.stop();

      expect(remove).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
      remove.mockRestore();
    });

    it('starts from a hidden document without losing the span', () => {
      setVisibility('hidden');
      monitor.start();

      advance(1200);

      expect(monitor.drainWindow().hiddenMs).toBe(1200);
    });
  });
});
