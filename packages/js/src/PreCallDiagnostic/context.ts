/**
 * PreCallDiagnostic context — passed to module builders during a diagnostic run.
 *
 * Contains the runtime state needed by module report builders: options,
 * the temporary diagnostic call, stats/raw samples, and lifecycle timing data.
 *
 * Module builders receive this context so they can access the call's
 * PeerConnection, stats samples, and configuration without depending
 * on PreCallDiagnostic internals.
 *
 * Timing collection is owned by the dedicated `TimingsCollector` (see
 * `modules/timings.ts`); the context no longer carries timing marks. The
 * collector is passed explicitly to the methods that need it.
 */

import type {
  PreCallDiagnosticOptions,
} from './types';
import type Call from '../Modules/Verto/webrtc/Call';

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
  call?: Call;
  /** Collected stats samples from the diagnostic call. */
  statsSamples: unknown[];
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
  };
}
