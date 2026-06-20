/**
 * PreCallDiagnostic context — passed to module builders during a diagnostic run.
 *
 * Contains the runtime state needed by module report builders: options,
 * the temporary diagnostic call, stats/raw samples, and lifecycle timing data.
 *
 * Module builders receive this context so they can access the call's
 * PeerConnection, stats samples, and configuration without depending
 * on PreCallDiagnostic internals.
 */

import type {
  PreCallDiagnosticOptions,
  CallLike,
} from './types';

/**
 * Internal timing marks for the diagnostic run.
 * Used to compute the PreCallTimingsReport.
 *
 * Epoch timestamps (Date.now()) are used for absolute timestamps in the report.
 * Monotonic timestamps (performance.now() or Date.now() fallback) are used
 * for duration calculations to avoid clock skew from NTP adjustments.
 *
 * All timestamps are in milliseconds.
 */
export interface DiagnosticTimings {
  /** Epoch timestamp (Date.now()) when run() was called. */
  startedAtEpochMs: number;
  /** Monotonic timestamp (performance.now() or Date.now()) when run() was called. */
  startedAtMonoMs: number;
  /** Epoch timestamp when the diagnostic completed. */
  completedAtEpochMs?: number;
  /** Monotonic timestamp when the diagnostic completed. */
  completedAtMonoMs?: number;
  /** Monotonic timestamp when the diagnostic call was created. */
  callCreatedAtMonoMs?: number;
  /** Monotonic timestamp when the diagnostic call became active. */
  callActiveAtMonoMs?: number;
  /** Monotonic timestamp when the call was answered (if observable). */
  callAnsweredAtMonoMs?: number;
  /** Monotonic timestamp when ICE connected (if observable). */
  iceConnectedAtMonoMs?: number;
  /** Monotonic timestamp when the first stats report was received (if observable). */
  firstStatsAtMonoMs?: number;
  /** Monotonic timestamp when the first media stats were received (if observable). */
  firstMediaStatsAtMonoMs?: number;
  /** Monotonic timestamp when stats sampling started. */
  statsSamplingStartedAtMonoMs?: number;
  /** Monotonic timestamp when stats sampling completed. */
  statsSamplingCompletedAtMonoMs?: number;
  /** Monotonic timestamp when cleanup started. */
  cleanupStartedAtMonoMs?: number;
  /** Monotonic timestamp when cleanup completed. */
  cleanupCompletedAtMonoMs?: number;
}

/**
 * The context object passed to each module builder during a diagnostic run.
 *
 * This is the primary extension point for future modules: each module
 * builder receives this context and can read from it to produce its
 * section of the report.
 */
export interface PreCallDiagnosticContext {
  /** The options used for this diagnostic run. */
  options: PreCallDiagnosticOptions;
  /** The temporary diagnostic call, if one was established. */
  call?: CallLike;
  /** Collected stats samples from the diagnostic call. */
  statsSamples: unknown[];
  /** Internal timing marks for computing the timings report. */
  timings: DiagnosticTimings;
  /** Any error that occurred during the diagnostic run. */
  error?: Error;
}

/**
 * Create an initial diagnostic context from options.
 */
export function createDiagnosticContext(
  options: PreCallDiagnosticOptions
): PreCallDiagnosticContext {
  return {
    options,
    statsSamples: [],
    timings: {
      startedAtEpochMs: Date.now(),
      startedAtMonoMs: nowMonoMs(),
    },
  };
}

/**
 * Safe monotonic clock for duration measurements.
 *
 * Uses performance.now() when available (browser, some Node.js environments)
 * for sub-millisecond precision and monotonic guarantees. Falls back to
 * Date.now() when performance is not available.
 *
 * All values are in milliseconds. Monotonic values should NOT be used
 * as absolute timestamps — only for computing durations via subtraction.
 */
export function nowMonoMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}
