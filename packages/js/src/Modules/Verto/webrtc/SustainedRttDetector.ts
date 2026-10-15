/**
 * Detects a sustained step in round-trip time relative to the call's own
 * floor, rather than against a fixed absolute threshold.
 *
 * ## Why a relative detector
 *
 * The existing HIGH_RTT (31001) warning fires when `roundTripTimeAvg` exceeds
 * a fixed 400 ms. That threshold answers a different question from the one we
 * need:
 *
 * - It **misses** the failure we care about. A Paris client whose RTT steps
 *   from 59 ms to 276 ms and holds there for the rest of the call has a 4.7x
 *   degradation and never crosses 400 ms. Nothing fires.
 * - It **fires constantly** on calls that are merely distant. A client in the
 *   Philippines sitting at a flat 460 ms floor is working exactly as well as
 *   the network allows; 31001 repeats every 15 s for the whole call and tells
 *   nobody anything.
 *
 * Measured across 74 production call reports, the discriminator between "this
 * call degraded" and "this call is far away" is the **lift above the call's
 * own floor**, not the absolute value.
 *
 * ## The floor is a running minimum, not a leading average
 *
 * An average of the first few intervals is not the floor. One production call
 * stepped from 151 ms to 211 ms at t=7 s, seven seconds after media started,
 * so a five-interval leading window already straddles the step and returns
 * 211 ms — the detector would then be measuring the degradation against
 * itself. Instead the floor is the running minimum of a 3-interval median,
 * which ratchets downward only: the median rejects a single anomalous dip,
 * and the minimum keeps an early step from raising the reference. If a call
 * genuinely improves, the floor follows it down, which is what should happen.
 *
 * ## Two things the floor must avoid
 *
 * **Pre-media intervals.** Stats collection starts before media does. Those
 * first intervals carry a `candidate-pair.currentRoundTripTime` from ICE
 * connectivity checks while `audio.outbound.packetsSent` is still zero, and
 * that value is routinely far from the steady state — one call measured 442 ms
 * before media against a real floor of 755 ms. Anchoring on it inverts the
 * sign of the lift. Only intervals where outbound packets are advancing count
 * toward the floor.
 *
 * **Stale RTT.** `currentRoundTripTime` holds its last value when STUN
 * responses stop arriving: `requestsSent` keeps advancing, `responsesReceived`
 * does not, and the RTT reading freezes. One call reported 857 ms for four
 * consecutive intervals with STUN frozen at 41 requests / 40 responses. That
 * is a dead path, which the no-RTP logic already owns — it is not a latency
 * measurement and must not reach this detector.
 *
 * ## Candidate pair changes reset everything
 *
 * The condition this detector exists to find is a server-side output backlog
 * specific to one candidate pair. When the pair changes the queue is gone: one
 * call dropped from 301 ms to 154 ms in a single interval on a pair change.
 * Carrying the old floor across that boundary would measure the new path
 * against the old one, so the detector starts over.
 *
 * @internal
 */

/** One stats interval, reduced to the fields this detector reads. */
export interface ISustainedRttSample {
  /** `connection.roundTripTimeAvg`, in **seconds** (as the WebRTC API reports it). */
  rttSeconds?: number;
  /** `audio.outbound.packetsSent` — cumulative. Tells media apart from STUN-only. */
  packetsSent?: number;
  /** `ice.requestsSent` — cumulative STUN binding requests on the selected pair. */
  iceRequestsSent?: number;
  /** `ice.responsesReceived` — cumulative STUN binding responses on the selected pair. */
  iceResponsesReceived?: number;
  /** `ice.state` — `succeeded` once the pair is usable. */
  icePairState?: string;
  /** `transport.selectedCandidatePairChanges` — cumulative. An increase resets the detector. */
  selectedCandidatePairChanges?: number;
}

export interface ISustainedRttState {
  /** True while the elevation has persisted for `consecutiveSamples` usable intervals. */
  elevated: boolean;
  /** The call's RTT floor (ms): running minimum of the smoothing median. */
  floorMs?: number;
  /** RTT (ms) of the most recent usable interval. */
  currentMs?: number;
  /** `currentMs - floorMs`. */
  liftMs?: number;
  /** `currentMs / floorMs`. */
  ramp?: number;
  /**
   * True when the selected pair is `succeeded` **and** STUN responses advanced
   * recently.
   *
   * This is the safety gate for any remediation built on top of the detector:
   * it separates a path that is slow but alive — worth acting on — from one
   * that is failing, where the existing no-RTP recovery owns the decision and
   * an extra ICE restart has been measured to cost 25 s.
   */
  pathAliveAndResponsive: boolean;
}

export interface ISustainedRttDetectorConfig {
  /**
   * Smoothed values the floor must be drawn from before detection starts.
   * Each smoothed value is the median of `smoothingWindow` intervals, so the
   * floor needs `minFloorSamples + smoothingWindow - 1` media-flowing
   * intervals before the first comparison.
   *
   * @default 3
   */
  minFloorSamples?: number;
  /**
   * Intervals per smoothing median. Odd values only, so the median is one of
   * the observed samples.
   *
   * @default 3
   */
  smoothingWindow?: number;
  /**
   * Minimum absolute rise above the floor, in ms.
   *
   * @default 100
   */
  minLiftMs?: number;
  /**
   * Minimum ratio of current RTT to the floor. Required alongside `minLiftMs`
   * so a high floor that wobbles does not qualify: a 460 ms floor drifting to
   * 570 ms clears the 100 ms lift but is only 1.24x, which is ordinary
   * variation on a long path.
   *
   * @default 1.5
   */
  minRamp?: number;
  /**
   * Usable intervals the condition must hold for before `elevated` is set.
   *
   * @default 3
   */
  consecutiveSamples?: number;
  /**
   * How many recent intervals a STUN response must have advanced within for
   * the path to count as responsive.
   *
   * @default 4
   */
  stunResponseWindow?: number;
}

const DEFAULTS: Required<ISustainedRttDetectorConfig> = {
  minFloorSamples: 3,
  smoothingWindow: 3,
  minLiftMs: 100,
  minRamp: 1.5,
  consecutiveSamples: 3,
  stunResponseWindow: 4,
};

export default class SustainedRttDetector {
  private readonly _config: Required<ISustainedRttDetectorConfig>;

  /** The last `smoothingWindow` usable RTT values (ms), for the smoothing median. */
  private _smoothing: number[] = [];
  /** Running minimum of the smoothed values — the call's floor. */
  private _floorMs: number | null = null;
  /** How many smoothed values have contributed to the floor. */
  private _floorSamples = 0;

  private _previous: ISustainedRttSample | null = null;
  private _consecutiveBreaches = 0;
  private _elevated = false;

  private _currentMs: number | null = null;

  /** Monotonic count of observed intervals, used for the STUN response window. */
  private _sampleIndex = 0;
  private _lastStunResponseIndex: number | null = null;
  private _lastPairSucceededIndex: number | null = null;

  constructor(config: ISustainedRttDetectorConfig = {}) {
    this._config = { ...DEFAULTS, ...config };
  }

  /**
   * Feed one stats interval. Returns the state after this interval.
   *
   * Safe to call on every interval; intervals the detector cannot use are
   * skipped without disturbing the breach count, so a burst of stale readings
   * neither raises nor clears the condition.
   */
  observe(sample: ISustainedRttSample): ISustainedRttState {
    this._sampleIndex += 1;

    if (this._isNewCandidatePair(sample)) {
      this._reset();
      // Keep the pair-change sample itself as the delta origin: its cumulative
      // counters belong to the new pair and must not be differenced against
      // the old pair's.
      this._previous = sample;
      if (sample.icePairState === 'succeeded') {
        this._lastPairSucceededIndex = this._sampleIndex;
      }
      return this.state;
    }

    const previous = this._previous;
    this._previous = sample;

    if (sample.icePairState === 'succeeded') {
      this._lastPairSucceededIndex = this._sampleIndex;
    }

    // The first interval has no predecessor to difference against, but its
    // cumulative counters still answer both questions: packets already sent
    // means media has flowed, and requests equal to responses means no STUN
    // request is outstanding, so the RTT reading is current.
    //
    // This is not a technicality. One production call sat at its 151 ms floor
    // for exactly two intervals before stepping to 211 ms. Spending the first
    // on the delta origin leaves a single sample at the true floor, too few
    // for any smoothing median to recover, and the detector ends up measuring
    // the step against the step. Qualifying the first interval directly is
    // what makes that call detectable.
    let mediaFlowing: boolean;
    let rttIsStale: boolean;

    if (!previous) {
      mediaFlowing = (sample.packetsSent ?? 0) > 0;
      rttIsStale =
        sample.iceRequestsSent !== undefined &&
        sample.iceResponsesReceived !== undefined &&
        sample.iceRequestsSent > sample.iceResponsesReceived;
      if (!rttIsStale && sample.iceResponsesReceived !== undefined) {
        this._lastStunResponseIndex = this._sampleIndex;
      }
    } else {
      const packetsSentDelta = positiveDelta(
        sample.packetsSent,
        previous.packetsSent
      );
      const requestsSentDelta = positiveDelta(
        sample.iceRequestsSent,
        previous.iceRequestsSent
      );
      const responsesReceivedDelta = positiveDelta(
        sample.iceResponsesReceived,
        previous.iceResponsesReceived
      );

      if (responsesReceivedDelta > 0) {
        this._lastStunResponseIndex = this._sampleIndex;
      }

      // Requests advancing with no responses means the RTT reading is a frozen
      // leftover, not a measurement. Drop the interval.
      rttIsStale = requestsSentDelta > 0 && responsesReceivedDelta === 0;
      mediaFlowing = packetsSentDelta > 0;
    }

    const rttMs =
      sample.rttSeconds === undefined ? undefined : sample.rttSeconds * 1000;

    if (rttMs === undefined || rttIsStale || !mediaFlowing) {
      return this.state;
    }

    this._currentMs = rttMs;
    this._updateFloor(rttMs);

    if (
      this._floorMs === null ||
      this._floorSamples < this._config.minFloorSamples
    ) {
      return this.state;
    }

    const isBreach =
      rttMs - this._floorMs >= this._config.minLiftMs &&
      rttMs >= this._floorMs * this._config.minRamp;

    if (isBreach) {
      this._consecutiveBreaches += 1;
      if (this._consecutiveBreaches >= this._config.consecutiveSamples) {
        this._elevated = true;
      }
    } else {
      this._consecutiveBreaches = 0;
      this._elevated = false;
    }

    return this.state;
  }

  get state(): ISustainedRttState {
    const floorMs = this._floorMs ?? undefined;
    const currentMs = this._currentMs ?? undefined;

    return {
      elevated: this._elevated,
      floorMs,
      currentMs,
      liftMs:
        floorMs !== undefined && currentMs !== undefined
          ? currentMs - floorMs
          : undefined,
      ramp:
        floorMs !== undefined && currentMs !== undefined && floorMs > 0
          ? currentMs / floorMs
          : undefined,
      pathAliveAndResponsive: this._isPathAliveAndResponsive(),
    };
  }

  /** Human-readable state, for the log line that accompanies the warning. */
  describe(): string {
    const { floorMs, currentMs, liftMs, ramp } = this.state;
    if (floorMs === undefined || currentMs === undefined) {
      return 'floor not established';
    }
    return (
      `floor=${Math.round(floorMs)}ms current=${Math.round(currentMs)}ms ` +
      `lift=${Math.round(liftMs ?? 0)}ms ramp=${(ramp ?? 0).toFixed(2)}x`
    );
  }

  private _updateFloor(rttMs: number): void {
    this._smoothing.push(rttMs);
    if (this._smoothing.length > this._config.smoothingWindow) {
      this._smoothing.shift();
    }
    if (this._smoothing.length < this._config.smoothingWindow) {
      return;
    }

    const smoothed = median(this._smoothing);
    this._floorMs =
      this._floorMs === null ? smoothed : Math.min(this._floorMs, smoothed);
    this._floorSamples += 1;
  }

  /**
   * Both conditions are windowed rather than read off the latest interval.
   *
   * A healthy pair reads `in-progress` for one interval on every consent
   * refresh whose response has not landed yet — four times in 40 s on one
   * production call — and a response naturally fails to advance in any
   * interval shorter than the refresh cycle. Judging either instantaneously
   * would call a perfectly live path dead roughly one interval in three.
   */
  private _isPathAliveAndResponsive(): boolean {
    if (
      this._lastStunResponseIndex === null ||
      this._lastPairSucceededIndex === null
    ) {
      return false;
    }
    const window = this._config.stunResponseWindow;
    return (
      this._sampleIndex - this._lastStunResponseIndex <= window &&
      this._sampleIndex - this._lastPairSucceededIndex <= window
    );
  }

  private _isNewCandidatePair(sample: ISustainedRttSample): boolean {
    const previousChanges = this._previous?.selectedCandidatePairChanges;
    const changes = sample.selectedCandidatePairChanges;
    if (previousChanges === undefined || changes === undefined) {
      return false;
    }
    return changes > previousChanges;
  }

  private _reset(): void {
    this._smoothing = [];
    this._floorMs = null;
    this._floorSamples = 0;
    this._consecutiveBreaches = 0;
    this._elevated = false;
    this._currentMs = null;
    this._lastStunResponseIndex = null;
    this._lastPairSucceededIndex = null;
  }
}

function positiveDelta(
  latest: number | undefined,
  previous: number | undefined
): number {
  if (latest === undefined || previous === undefined) {
    return 0;
  }
  return Math.max(0, latest - previous);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
