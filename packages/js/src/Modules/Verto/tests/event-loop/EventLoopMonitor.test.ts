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

const mockObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};
(global as any).PerformanceObserver = jest.fn(() => mockObserver);

describe('EventLoopMonitor', () => {
  let monitor: EventLoopMonitor;
  let baseTime: number;

  beforeEach(() => {
    baseTime = 1700000000000;
    jest.useFakeTimers('modern');
    jest.setSystemTime(baseTime);
    monitor = new EventLoopMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    monitor.stop();
    jest.useRealTimers();
  });

  describe('start()', () => {
    it('should start the heartbeat interval', () => {
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });

    it('should not double-start (idempotent)', () => {
      monitor.start();
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });

    it('should invoke onCongestion callback when heartbeat fires late', () => {
      const onCongestion = jest.fn();
      monitor.start(onCongestion);

      jest.advanceTimersByTime(2000);
      expect(onCongestion).not.toHaveBeenCalled();

      jest.setSystemTime(baseTime + 7000);
      jest.advanceTimersByTime(2000);

      expect(onCongestion).toHaveBeenCalled();
      const episode = onCongestion.mock.calls[0][0];
      expect(episode.source).toBe('heartbeat');
      expect(episode.lagMs).toBeGreaterThan(999);
      expect(episode.intervalMs).toBe(2000);
      expect(episode.timestamp).toBeDefined();
    });
  });

  describe('stop()', () => {
    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isRunning).toBe(false);
    });

    it('should be safe to call when not running', () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('getSummary()', () => {
    it('should return null when no episodes recorded', () => {
      monitor.start();
      expect(monitor.getSummary()).toBeNull();
    });

    it('should return summary with episodes after congestion', () => {
      const onCongestion = jest.fn();
      monitor.start(onCongestion);

      jest.advanceTimersByTime(2000);
      jest.setSystemTime(baseTime + 7000);
      jest.advanceTimersByTime(2000);

      const summary = monitor.getSummary();
      expect(summary).not.toBeNull();
      expect(summary!.totalEpisodes).toBeGreaterThan(0);
      expect(summary!.maxLagMs).toBeGreaterThan(999);
      expect(summary!.episodes.length).toBeGreaterThan(0);
      expect(summary!.episodes[0].source).toBe('heartbeat');
    });

    it('should not record episodes under normal load', () => {
      monitor.start();
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(2000);
      }
      expect(monitor.getSummary()).toBeNull();
    });
  });

  describe('PerformanceObserver integration', () => {
    it('should create a PerformanceObserver for longtask', () => {
      monitor.start();
      expect((global as any).PerformanceObserver).toHaveBeenCalled();
    });

    it('should handle PerformanceObserver unsupported gracefully', () => {
      const original = (global as any).PerformanceObserver;
      delete (global as any).PerformanceObserver;
      expect(() => monitor.start()).not.toThrow();
      (global as any).PerformanceObserver = original;
    });
  });

  describe('episode cap', () => {
    it('should cap episodes at MAX_EPISODES (50)', () => {
      const onCongestion = jest.fn();
      monitor.start(onCongestion);

      for (let i = 0; i < 60; i++) {
        jest.setSystemTime(baseTime + 2000 * (i + 1) + 5000);
        jest.advanceTimersByTime(2000);
      }

      const summary = monitor.getSummary();
      expect(summary).not.toBeNull();
      expect(summary!.episodes.length).toBeLessThanOrEqual(50);
    });
  });
});
