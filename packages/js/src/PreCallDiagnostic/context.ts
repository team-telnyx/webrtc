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
 */
export interface DiagnosticTimings {
  /** Timestamp (epoch ms) when PreCallDiagnostic.run() was called. */
  startedAt: number;
  /** Timestamp (epoch ms) when the diagnostic call was created. */
  callCreatedAt?: number;
  /** Timestamp (epoch ms) when the diagnostic call became active. */
  callActiveAt?: number;
  /** Timestamp (epoch ms) when the diagnostic run completed. */
  completedAt?: number;
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
      startedAt: Date.now(),
    },
  };
}
