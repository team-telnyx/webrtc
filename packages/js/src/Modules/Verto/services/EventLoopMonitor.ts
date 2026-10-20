import logger from '../util/logger';

/**
 * A single recorded episode of event-loop congestion.
 *
 * Either `lagMs` (heartbeat late firing) or `taskDurationMs` (long task
 * from PerformanceObserver) will be set — never both at the same time,
 * because they come from different detection mechanisms.
 */
export interface IEventLoopCongestionEpisode {
  /** ISO 8601 timestamp of when the episode was detected. */
  timestamp: string;
  /** How late the heartbeat interval fired (ms). Only for heartbeat episodes. */
  lagMs?: number;
  /** Expected heartbeat interval (ms). Only for heartbeat episodes. */
  intervalMs?: number;
  /** Long task duration (ms). Only for PerformanceObserver episodes. */
  taskDurationMs?: number;
  /** Source of detection: 'heartbeat' or 'longtask'. */
  source: 'heartbeat' | 'longtask';
}

/**
 * Summary of all congestion episodes for a session.
 * Included in the final call report payload.
 */
export interface IEventLoopCongestionSummary {
  /** Total number of congestion episodes detected. */
  totalEpisodes: number;
  /** Maximum lag/task duration observed (ms). */
  maxLagMs: number;
  /** All recorded episodes (capped to prevent unbounded growth). */
  episodes: IEventLoopCongestionEpisode[];
}

/**
 * Detection thresholds.
 *
 * - `HEARTBEAT_INTERVAL_MS`: How often to fire the heartbeat. 2000ms is a
 *   good balance — granular enough to catch multi-second congestion, light
 *   enough to never itself cause load.
 *
 * - `HEARTBEAT_LAG_THRESHOLD_MS`: Minimum late-firing to count as
 *   congestion. 1000ms means the main thread was blocked for at least
 *   ~1s. This avoids false positives from normal scheduling jitter.
 *
 * - `LONGTASK_THRESHOLD_MS`: PerformanceObserver 'longtask' entries above
 *   this are recorded. The W3C definition is 50ms, but we use 500ms to avoid
 *   recording every long task — only the ones severe enough to affect
 *   real-time signaling.
 *
 * - `MAX_EPISODES`: Cap on recorded episodes to prevent unbounded memory
 *   growth in pathological cases.
 */
const HEARTBEAT_INTERVAL_MS = 2000;
const HEARTBEAT_LAG_THRESHOLD_MS = 1000;
const LONGTASK_THRESHOLD_MS = 500;
const MAX_EPISODES = 50;

/**
 * Detects event-loop congestion (main-thread blocking) in the browser.
 *
 * A production incident (ch1, 2026-06-29) showed that a 9s delay between
 * WebSocket `onopen` and the login send was caused by the main thread being
 * blocked during a session transition. The SDK had zero visibility into
 * this — signaling health monitoring catches *silent* sockets, but not a
 * blocked main thread that still processes events eventually.
 *
 * This monitor uses two complementary detection mechanisms:
 *
 * 1. **Heartbeat (setInterval)** — Universally available. Fires every
 *    `HEARTBEAT_INTERVAL_MS` and measures how late the callback runs. If the
 *    main thread is blocked, the timer fires late. The lag is the difference
 *    between actual and expected fire time. This catches all blocking,
 *    including sync JS, GC pauses, and layout thrashing.
 *
 * 2. **PerformanceObserver('longtask')** — Available in Chrome/Edge. Fires
 *    a callback whenever a task exceeds 50ms of main-thread time. We filter
 *    to only record tasks ≥ `LONGTASK_THRESHOLD_MS` to avoid noise. This
 *    provides precise task duration that the heartbeat can only infer.
 *
 * The heartbeat is the primary mechanism — it works everywhere and catches
 * all blocking. The PerformanceObserver is supplementary, providing exact
 * task durations when available.
 *
 * Lifecycle:
 * - `start()` when the session connects (WebSocket open).
 * - `stop()` when the session disconnects.
 * - `getSummary()` called by CallReportCollector when building the final
 *   call report to include congestion data server-side.
 * - The `onCongestion` callback fires on each episode for real-time
 *   warning emission.
 *
 * Design notes:
 * - No `performance.now()` dependency — uses `Date.now()` for the heartbeat
 *   to avoid issues with clock changes. `performance.now()` is used only
 *   where the PerformanceObserver provides it.
 * - The monitor is intentionally lightweight: one setInterval, one
 *   PerformanceObserver, and a small array. Memory and CPU overhead are
 *   negligible.
 * - Episodes are capped at `MAX_EPISODES` to prevent unbounded growth.
 *   When the cap is reached, the oldest episodes are discarded (FIFO).
 */
export default class EventLoopMonitor {
  /** The heartbeat interval id, or null when stopped. */
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  /** Timestamp (Date.now) of the last heartbeat tick. */
  private _lastTick = 0;
  /** Recorded congestion episodes. */
  private _episodes: IEventLoopCongestionEpisode[] = [];
  /** Maximum lag observed across all episodes. */
  private _maxLagMs = 0;
  /** PerformanceObserver for longtask entries, or null if unsupported. */
  private _observer: PerformanceObserver | null = null;
  /** Callback invoked on each congestion episode. */
  private _onCongestion:
    | ((episode: IEventLoopCongestionEpisode) => void)
    | null = null;

  /**
   * Start monitoring.
   *
   * @param onCongestion Optional callback fired on each congestion episode.
   *   Used to emit warnings in real-time. The callback is called
   *   synchronously from the heartbeat/observer callback — keep it cheap.
   */
  start(onCongestion?: (episode: IEventLoopCongestionEpisode) => void): void {
    if (this._intervalId) {
      return; // already running
    }

    this._onCongestion = onCongestion ?? null;
    this._lastTick = Date.now();
    this._episodes = [];
    this._maxLagMs = 0;

    // ── Heartbeat: primary detection mechanism ──────────────────────
    // setInterval fires on the main thread. If the main thread is blocked,
    // the callback runs late. The lag = actual - expected fire time.
    this._intervalId = setInterval(() => {
      this._heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // ── PerformanceObserver: supplementary detection ─────────────────
    // 'longtask' is available in Chrome 51+ and Edge. Not in Firefox/Safari.
    // We wrap in try/catch because some browsers throw on unsupported entry
    // types even with a PerformanceObserver guard.
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          this._onLongTasks(list);
        });
        observer.observe({ entryTypes: ['longtask'] });
        this._observer = observer;
      }
    } catch {
      // 'longtask' not supported — heartbeat is the sole mechanism.
      logger.debug(
        'EventLoopMonitor: PerformanceObserver longtask not supported, using heartbeat only'
      );
    }

    logger.debug('EventLoopMonitor: started');
  }

  /**
   * Stop monitoring and release all resources.
   * Recorded episodes are retained for `getSummary()`.
   */
  stop(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    if (this._observer) {
      try {
        this._observer.disconnect();
      } catch {
        // ignore
      }
      this._observer = null;
    }
    this._onCongestion = null;
    logger.debug('EventLoopMonitor: stopped', {
      totalEpisodes: this._episodes.length,
      maxLagMs: this._maxLagMs,
    });
  }

  /**
   * Returns true if the monitor is currently running.
   */
  get isRunning(): boolean {
    return this._intervalId !== null;
  }

  /**
   * Get a summary of all congestion episodes for inclusion in the call
   * report. Returns null if no episodes were recorded.
   */
  getSummary(): IEventLoopCongestionSummary | null {
    if (this._episodes.length === 0) {
      return null;
    }
    return {
      totalEpisodes: this._episodes.length,
      maxLagMs: this._maxLagMs,
      episodes: [...this._episodes],
    };
  }

  // ── Private ─────────────────────────────────────────────────────────

  /**
   * Heartbeat tick — measure how late this callback fired.
   * If the main thread was blocked, `now` will be significantly past
   * `expected`, and the difference is the lag.
   */
  private _heartbeat(): void {
    const now = Date.now();
    const expected = this._lastTick + HEARTBEAT_INTERVAL_MS;
    const lag = now - expected;

    // Update _lastTick even on lag so the next interval's expected time
    // is based on when this tick actually fired, not the ideal schedule.
    // This prevents compounding: if one tick is 5s late, the next tick's
    // lag should measure new blocking, not the accumulated drift.
    this._lastTick = now;

    if (lag >= HEARTBEAT_LAG_THRESHOLD_MS) {
      const episode: IEventLoopCongestionEpisode = {
        timestamp: new Date(now).toISOString(),
        lagMs: Math.round(lag),
        intervalMs: HEARTBEAT_INTERVAL_MS,
        source: 'heartbeat',
      };
      this._recordEpisode(episode);
    }
  }

  /**
   * PerformanceObserver callback — filter long tasks to only record
   * severe ones (≥ LONGTASK_THRESHOLD_MS).
   */
  private _onLongTasks(list: PerformanceObserverEntryList): void {
    for (const entry of list.getEntries()) {
      const duration = entry.duration;
      if (duration >= LONGTASK_THRESHOLD_MS) {
        const episode: IEventLoopCongestionEpisode = {
          timestamp: new Date(
            entry.startTime + (performance.timeOrigin || 0)
          ).toISOString(),
          taskDurationMs: Math.round(duration),
          source: 'longtask',
        };
        this._recordEpisode(episode);
      }
    }
  }

  /**
   * Record an episode, update max lag, invoke the callback, and enforce
   * the episode cap.
   */
  private _recordEpisode(episode: IEventLoopCongestionEpisode): void {
    // Enforce the cap (FIFO — discard oldest)
    if (this._episodes.length >= MAX_EPISODES) {
      this._episodes.shift();
    }

    this._episodes.push(episode);

    const lagValue = episode.lagMs ?? episode.taskDurationMs ?? 0;
    if (lagValue > this._maxLagMs) {
      this._maxLagMs = lagValue;
    }

    logger.warn(
      `EventLoopMonitor: congestion detected ` +
        `(source=${episode.source}, ` +
        `${episode.lagMs !== undefined ? `lagMs=${episode.lagMs}` : `taskDurationMs=${episode.taskDurationMs}`})`,
      episode
    );

    this._onCongestion?.(episode);
  }
}
