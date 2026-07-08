/**
 * Diagnostic timing module for the PreCallDiagnostic framework (VSDK-307).
 *
 * Owns ALL timing logic for the diagnostic run: mark collection, mapping of
 * SDK call-establishment steps into named `PreCallTimingsReport` fields, and
 * duration computation for the diagnostic-only phases (stats sampling,
 * cleanup, total). `PreCallDiagnostic.ts` calls only one-line mark methods
 * here — no parsing, duration math, or `performance.now()` calls live there.
 *
 * Decoupling: this module does NOT import `CallEstablishmentTimings` (or any
 * other Verto module) directly. It consumes the structured establishment
 * timings through the `call.getEstablishmentTimings?.()` seam implemented on
 * `BaseCall`. Only `BaseCall.getEstablishmentTimings()` reaches into the
 * Verto-layer timing module.
 */

import type { ICallEstablishmentTimings } from '../../Modules/Verto/webrtc/CallEstablishmentTimings';
import type { PreCallTimingsReport } from '../types';

/**
 * Map of SDK call-establishment step labels (the human-readable strings
 * produced by `CallEstablishmentTimings.collectCallEstablishmentTimings()`)
 * to the `PreCallTimingsReport` field they populate.
 *
 * A step is matched by its `label` string (the `MARK_LABELS` value from
 * `CallEstablishmentTimings`). The `fromStart` value (ms from the call start
 * mark) is placed directly on the report field — these are durations measured
 * from the start of the call, which matches the documented semantics of the
 * `PreCallTimingsReport` lifecycle fields.
 */
const ESTABLISHMENT_LABEL_TO_FIELD: Record<string, keyof PreCallTimingsReport> = {
  'Call Start': 'callCreateMs',
  'SDP negotiation started': 'callSetupMs',
  'Call is active': 'callSetupMs',
  'Remote side ringing': 'ringingMs',
  'Call answered by remote side': 'callAnsweredMs',
  'ICE connection established': 'iceConnectedMs',
  'Secure media channel established (DTLS)': 'dtlsConnectedMs',
  'First remote audio/video track received': 'firstMediaStatsMs',
};

/**
 * Narrow shape of a Call as consumed by the timings builder.
 *
 * Only `getEstablishmentTimings()` and `id` are accessed. Kept local so the
 * module is decoupled from Verto-layer imports and easy to mock in tests.
 * The `Call` type already provides this method (implemented on `BaseCall`),
 * so this interface exists only for clarity and test ergonomics.
 */
export interface TimingsCallLike {
  id: string;
  getEstablishmentTimings?(): ICallEstablishmentTimings | undefined;
}

/** Optional arguments for `TimingsCollector.build()`. */
export interface TimingsBuildOptions {
  /** The diagnostic call, if one was established. */
  call?: TimingsCallLike;
  /** The call id, used as a fallback when `call` is unavailable. */
  callId?: string;
}

/**
 * Guard a candidate duration value. Returns the value if it is a finite,
 * non-negative number; otherwise `undefined` (omit-over-fake).
 *
 * `fromStart`/`delta` from `CallEstablishmentTimings` are ms offsets from the
 * `new-call-start` mark computed via `performance.now()` — they should be
 * finite and non-negative, but defensive guards keep the report robust
 * against mark-clock drift and any future source of NaN/Infinity.
 */
function safeDurationMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

/**
 * Read a value from the `stats` object only if it passes the duration guard.
 */
function withGuard(stats: PreCallTimingsReport, field: keyof PreCallTimingsReport, value: unknown): void {
  const guarded = safeDurationMs(value);
  if (guarded !== undefined) {
    (stats[field] as number | undefined) = guarded;
  }
}

/**
 * Collector of monotonic timestamps for the diagnostic-only lifecycle phases
 * that the SDK call path does not already mark (stats sampling, cleanup).
 *
 * Internal mark state is held in private fields; the collector itself is
 * opaque to callers. `PreCallDiagnostic.run()` records marks via the
 * one-line methods, then `build()` merges them with the SDK establishment
 * timings to produce the final `PreCallTimingsReport`.
 */
export class TimingsCollector {
  /** Epoch timestamp (Date.now()) when the collector was created. */
  private readonly startedAtEpochMs: number;
  /** Monotonic timestamp (performance.now()) when the collector was created. */
  private readonly startedAtMonoMs: number;

  /** Monotonic mark: stats sampling started. */
  private statsSamplingStartedMonoMs?: number;
  /** Monotonic mark: first stats sample received. */
  private firstStatsMonoMs?: number;
  /** Monotonic mark: stats sampling completed. */
  private statsSamplingCompletedMonoMs?: number;
  /** Monotonic mark: cleanup started. */
  private cleanupStartedMonoMs?: number;
  /** Monotonic mark: cleanup completed. */
  private cleanupCompletedMonoMs?: number;

  /** Epoch timestamp (Date.now()) when the diagnostic completed. */
  private completedAtEpochMs?: number;

  constructor() {
    this.startedAtEpochMs = Date.now();
    this.startedAtMonoMs = nowMonoMs();
  }

  /** Record the start of the stats sampling phase. Idempotent. */
  markStatsSamplingStarted(): void {
    if (this.statsSamplingStartedMonoMs === undefined) {
      this.statsSamplingStartedMonoMs = nowMonoMs();
    }
  }

  /** Record the moment the first stats sample was received. Idempotent. */
  markFirstStats(): void {
    if (this.firstStatsMonoMs === undefined) {
      this.firstStatsMonoMs = nowMonoMs();
    }
  }

  /** Record the end of the stats sampling phase. Idempotent. */
  markStatsSamplingCompleted(): void {
    if (this.statsSamplingCompletedMonoMs === undefined) {
      this.statsSamplingCompletedMonoMs = nowMonoMs();
    }
  }

  /** Record the start of the cleanup phase. Idempotent. */
  markCleanupStarted(): void {
    if (this.cleanupStartedMonoMs === undefined) {
      this.cleanupStartedMonoMs = nowMonoMs();
    }
  }

  /** Record the end of the cleanup phase. Idempotent. */
  markCleanupCompleted(): void {
    if (this.cleanupCompletedMonoMs === undefined) {
      this.cleanupCompletedMonoMs = nowMonoMs();
    }
  }

  /**
   * Record diagnostic completion. Also records the epoch completion timestamp.
   * Idempotent.
   */
  markCompleted(): void {
    if (this.completedAtEpochMs === undefined) {
      this.completedAtEpochMs = Date.now();
    }
  }

  /**
   * Build the final `PreCallTimingsReport`.
   *
   * Merges:
   *  1. Diagnostic-only phase durations from this collector's internal marks
   *     (firstStatsMs, statsSamplingMs, cleanupMs, totalMs).
   *  2. SDK call-establishment timings from `call.getEstablishmentTimings?.()`,
   *     mapped into named report fields via `ESTABLISHMENT_LABEL_TO_FIELD`.
   *
   * Call this BEFORE the cleanup `finally` block runs `call.hangup()` and
   * `clearCallMarks()` — establishment timings are read from the call's
   * performance marks, which are cleared during `_finalize()`.
   *
   * Never throws: every read is guarded. Missing sources result in omitted
   * fields, not zero placeholders.
   */
  build(options: TimingsBuildOptions = {}): PreCallTimingsReport {
    const report: PreCallTimingsReport = {
      startedAt: this.startedAtEpochMs,
      completedAt: this.completedAtEpochMs,
    };

    // 1. Diagnostic-only phase durations (measured from this collector's start).
    withGuard(report, 'firstStatsMs', this.firstStatsMonoMs !== undefined
      ? this.firstStatsMonoMs - this.startedAtMonoMs
      : undefined);
    withGuard(report, 'statsSamplingMs',
      this.statsSamplingStartedMonoMs !== undefined && this.statsSamplingCompletedMonoMs !== undefined
        ? this.statsSamplingCompletedMonoMs - this.statsSamplingStartedMonoMs
        : undefined);
    withGuard(report, 'cleanupMs',
      this.cleanupStartedMonoMs !== undefined && this.cleanupCompletedMonoMs !== undefined
        ? this.cleanupCompletedMonoMs - this.cleanupStartedMonoMs
        : undefined);

    // totalMs: from start to completion (mono). Falls back to cleanupCompleted
    // when markCompleted() was never called (e.g. an early-return path).
    const endMonoMs = nowMonoMs();
    const endMark = this.completedAtEpochMs !== undefined
      ? endMonoMs // completion was reached; use current mono time as the endpoint
      : this.cleanupCompletedMonoMs;
    if (this.completedAtEpochMs !== undefined) {
      // Prefer the monotonic delta recorded at markCompleted() time if we can
      // reconstruct it; since we only store the epoch, use the current mono
      // reading — this is the elapsed monotonic time, which is correct as long
      // as build() is called immediately after markCompleted().
      withGuard(report, 'totalMs', endMonoMs - this.startedAtMonoMs);
    } else if (endMark !== undefined) {
      withGuard(report, 'totalMs', endMark - this.startedAtMonoMs);
    }

    // 2. SDK call-establishment timings (read from the call's performance marks).
    // Wrapped in try/catch so a throwing getEstablishmentTimings() (e.g. a
    // buggy override or a cleared-marks race) never aborts report generation.
    let establishment: ICallEstablishmentTimings | undefined;
    try {
      establishment = options.call?.getEstablishmentTimings?.();
    } catch {
      establishment = undefined;
    }
    if (establishment && establishment.steps.length > 0) {
      for (const step of establishment.steps) {
        const field = ESTABLISHMENT_LABEL_TO_FIELD[step.label];
        if (field !== undefined) {
          // Lifecycle fields are durations from the call start (fromStart),
          // matching the documented semantics of PreCallTimingsReport.
          withGuard(report, field, step.fromStart);
        }
      }
    }

    // clientReadyMs is not observable in the current SDK timing path; omit.
    return report;
  }
}

/**
 * Return a monotonic timestamp in milliseconds. Uses `performance.now()` when
 * available; falls back to `Date.now()` (which is wall-clock, not monotonic,
 * but acceptable when performance is undefined — e.g. some test environments).
 */
function nowMonoMs(): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch {
    // fall through
  }
  return Date.now();
}

/**
 * Factory: create a `TimingsCollector` and immediately record the start
 * timestamps (epoch + monotonic). Pass the returned collector to the methods
 * that record marks; call `build()` once at the end of the diagnostic run.
 */
export function createTimingsCollector(): TimingsCollector {
  return new TimingsCollector();
}
