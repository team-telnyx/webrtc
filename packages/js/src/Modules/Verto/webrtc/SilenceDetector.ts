/**
 * SilenceDetector
 *
 * Monitors audio levels during an active call and fires a callback when
 * both inbound and outbound audio remain below a threshold for a sustained
 * period. Designed to catch the "silence on the line" pattern where both
 * parties hear nothing — typically caused by mic issues, wrong device
 * selection, or media path failures.
 *
 * Usage:
 *   Instantiated by BaseCall when the call becomes active. The
 *   CallReportCollector feeds audio levels on every stats collection
 *   cycle via `onAudioLevels()`.
 */

import logger from '../util/logger';

export interface SilenceDetectorOptions {
  /**
   * Audio level threshold below which audio is considered "silent".
   * Range 0.0–1.0 (RMS). Default: 0.01 (~-40 dBFS).
   * Typical speech is 0.05–0.5; background noise is 0.005–0.02.
   */
  threshold?: number;

  /**
   * Duration in milliseconds of sustained silence before firing.
   * Default: 10000 (10 seconds).
   */
  durationMs?: number;

  /**
   * Stats polling interval in milliseconds (must match CallReportCollector).
   * Used to convert sample count → elapsed time. Default: 1000.
   */
  pollingIntervalMs?: number;
}

export type SilenceDirection = 'both' | 'inbound' | 'outbound';

export interface SilenceEvent {
  /** Which direction(s) are silent */
  direction: SilenceDirection;
  /** How long the silence has lasted (ms) */
  durationMs: number;
  /** Audio level on inbound (remote → local) */
  inboundLevel: number;
  /** Audio level on outbound (local → remote) */
  outboundLevel: number;
}

export class SilenceDetector {
  private threshold: number;
  private durationMs: number;
  private pollingIntervalMs: number;

  /** Number of consecutive silent polls */
  private consecutiveSilentPolls = 0;

  /** Number of polls required to trigger (durationMs / pollingIntervalMs) */
  private readonly pollsToTrigger: number;

  /** Whether we already fired for the current silence window */
  private firedForCurrentWindow = false;

  /** Callback invoked when sustained silence is detected */
  public onSilenceDetected: ((event: SilenceEvent) => void) | null = null;

  constructor(options: SilenceDetectorOptions = {}) {
    this.threshold = options.threshold ?? 0.01;
    this.durationMs = options.durationMs ?? 10_000;
    this.pollingIntervalMs = options.pollingIntervalMs ?? 1000;
    this.pollsToTrigger = Math.ceil(this.durationMs / this.pollingIntervalMs);
  }

  /**
   * Called by CallReportCollector on each stats cycle with the current
   * audio levels. Values are 0.0–1.0 RMS, or null if unavailable.
   */
  public onAudioLevels(
    inboundLevel: number | null,
    outboundLevel: number | null
  ): void {
    const inbound = inboundLevel ?? 0;
    const outbound = outboundLevel ?? 0;

    const inboundSilent = inbound < this.threshold;
    const outboundSilent = outbound < this.threshold;

    if (inboundSilent && outboundSilent) {
      this.consecutiveSilentPolls++;

      if (this.consecutiveSilentPolls === 1) {
        logger.debug(
          `SilenceDetector: silence started (in=${inbound.toFixed(4)}, out=${outbound.toFixed(4)})`
        );
      }

      if (
        this.consecutiveSilentPolls >= this.pollsToTrigger &&
        !this.firedForCurrentWindow
      ) {
        this.firedForCurrentWindow = true;

        const elapsedMs = this.consecutiveSilentPolls * this.pollingIntervalMs;

        const event: SilenceEvent = {
          direction: 'both',
          durationMs: elapsedMs,
          inboundLevel: inbound,
          outboundLevel: outbound,
        };

        logger.warn(
          `SilenceDetector: sustained silence detected (${elapsedMs}ms, direction=both)`
        );

        this.onSilenceDetected?.(event);
      }
    } else {
      // Audio resumed — reset tracking
      if (this.consecutiveSilentPolls > 0) {
        logger.debug(
          `SilenceDetector: audio resumed after ${this.consecutiveSilentPolls} silent polls ` +
            `(in=${inbound.toFixed(4)}, out=${outbound.toFixed(4)})`
        );
      }
      this.consecutiveSilentPolls = 0;
      this.firedForCurrentWindow = false;
    }
  }

  /**
   * Reset state. Called on call teardown.
   */
  public destroy(): void {
    this.consecutiveSilentPolls = 0;
    this.firedForCurrentWindow = false;
    this.onSilenceDetected = null;
  }
}
