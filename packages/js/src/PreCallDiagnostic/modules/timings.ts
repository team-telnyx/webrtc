/**
 * Timing support for a pre-call diagnostic run.
 *
 * The SDK call is the single source of truth for call-establishment timings.
 * This collector only copies that structured timeline into the diagnostic
 * report and measures the total duration of the diagnostic itself.
 */

import type {
  PreCallEstablishmentTimings,
  PreCallEstablishmentStep,
  PreCallTimingsReport,
} from '../types';

const ICE_GATHERING_STARTED_LABEL = 'ICE candidate gathering started';
const ICE_GATHERING_COMPLETED_LABEL = 'All ICE candidates gathered';
const FIRST_SERVER_CANDIDATE_LABEL =
  'First server-reflexive/relay candidate found';

/** Return a valid non-negative timing value, otherwise omit it. */
function safeDurationMs(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

/** Find a call-establishment step by its SDK-owned label. */
function findStep(
  steps: PreCallEstablishmentStep[],
  label: string
): PreCallEstablishmentStep | undefined {
  return steps.find((step) => step.label === label);
}

/** Narrow shape of a call used to read the SDK-owned establishment timeline. */
export interface TimingsCallLike {
  getEstablishmentTimings?(): PreCallEstablishmentTimings | undefined;
}

/** Optional arguments for `TimingsCollector.build()`. */
export interface TimingsBuildOptions {
  /** The diagnostic call, if the test created one. */
  call?: TimingsCallLike;
}

/**
 * Collects the SDK call-establishment timeline, its requested ICE summaries,
 * and the total diagnostic duration.
 */
export class TimingsCollector {
  private readonly startedAtMonoMs = nowMonoMs();

  /**
   * Build a report and snapshot the SDK establishment timeline.
   *
   * For call-based tests this must run before hangup, because call cleanup may
   * release the peer and its retained timing data. Missing or throwing SDK
   * timing data is omitted rather than failing the diagnostic.
   */
  build(options: TimingsBuildOptions = {}): PreCallTimingsReport {
    const report: PreCallTimingsReport = {};

    try {
      const establishment = options.call?.getEstablishmentTimings?.();
      if (establishment) {
        report.callEstablishment = {
          mode: establishment.mode,
          direction: establishment.direction,
          steps: establishment.steps.map((step) => ({ ...step })),
        };

        const gatheringStarted = findStep(
          establishment.steps,
          ICE_GATHERING_STARTED_LABEL
        );
        const gatheringCompleted = findStep(
          establishment.steps,
          ICE_GATHERING_COMPLETED_LABEL
        );
        const iceGatheringMs = safeDurationMs(
          gatheringStarted && gatheringCompleted
            ? gatheringCompleted.fromStart - gatheringStarted.fromStart
            : undefined
        );
        if (iceGatheringMs !== undefined) {
          report.iceGatheringMs = iceGatheringMs;
        }

        const firstServerCandidate = findStep(
          establishment.steps,
          FIRST_SERVER_CANDIDATE_LABEL
        );
        const firstNonHostCandidateMs = safeDurationMs(
          gatheringStarted && firstServerCandidate
            ? firstServerCandidate.fromStart - gatheringStarted.fromStart
            : undefined
        );
        if (firstNonHostCandidateMs !== undefined) {
          report.firstNonHostCandidateMs = firstNonHostCandidateMs;
        }
      }
    } catch {
      // SDK timing data is optional and must never fail the diagnostic.
    }

    return report;
  }

  /** Set totalMs after all test work, including cleanup, has finished. */
  complete(report: PreCallTimingsReport): void {
    const totalMs = nowMonoMs() - this.startedAtMonoMs;
    if (Number.isFinite(totalMs) && totalMs >= 0) {
      report.totalMs = totalMs;
    }
  }
}

/** Return a monotonic timestamp, with a wall-clock fallback. */
function nowMonoMs(): number {
  try {
    if (
      typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
    ) {
      return performance.now();
    }
  } catch {
    // Fall through to Date.now().
  }
  return Date.now();
}

/** Create a timing collector and start measuring total diagnostic duration. */
export function createTimingsCollector(): TimingsCollector {
  return new TimingsCollector();
}
