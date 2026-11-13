/**
 * Measures the cadence of our own outbound RTP — whether packets leave on the
 * encoder's schedule, or stall and then flush in a burst.
 *
 * ## The gap this fills
 *
 * Nothing in the call report can currently see an outbound send-path stall.
 * Measured against a packet capture of a 645 s production call that stalled
 * 367 times (11.2% of wall-clock, gaps of 100–513 ms):
 *
 * | report field              | correlation with stalled-ms |
 * |---------------------------|-----------------------------|
 * | `totalPacketSendDelay`    | n/a — **0 for all 634 intervals** |
 * | `packetsSent` rate (1 s)  | −0.17 (49.80/s stalled vs 49.85/s clean) |
 * | `audio.inbound.jitterAvg` | +0.01 — and it is the wrong direction |
 * | `concealedSamples`        | −0.03 — correctly nothing: no audio was lost |
 * | `audioLevelAvg`           | +0.02 |
 *
 * `totalPacketSendDelay` is the field that would carry this, and Chrome never
 * populates it for audio: it is a pacer statistic and audio bypasses the
 * pacer. The 1 s `packetsSent` rate is blind for a structural reason — a stall
 * and the catch-up burst that follows it land in the same one-second bin and
 * cancel out. Sampling the same counter at 250 ms separates them.
 *
 * ## Why the burst peak is the number worth having
 *
 * In that call the stalls did not merely coincide with the latency the user
 * experienced, they set it. Each time the client produced a burst larger than
 * any before it, the server's answering latency stepped to a new plateau equal
 * to 20 ms × the burst size:
 *
 * | record burst | before   | after    | 20 ms × burst |
 * |--------------|----------|----------|---------------|
 * | 8 packets    | 44.9 ms  | 184.0 ms | 160 ms        |
 * | 21 packets   | 159.6 ms | 420.7 ms | 420 ms        |
 * | 43 packets   | 442.4 ms | 817.9 ms | 860 ms        |
 *
 * The healthy control call on the same build and same fleet never exceeded a
 * 5-packet burst and sat flat at 31 ms. Both calls offered an identical mean
 * rate (51.69 vs 51.67 datagrams/s), so mean rate is not the discriminator and
 * `bitrateAvg` cannot stand in for this. **Burstiness is the discriminator**,
 * which is why {@link ISendCadenceMetrics.maxBurstPackets} is the headline
 * field rather than any average.
 *
 * ## Normalise by the WebRTC clock, never by the nominal period
 *
 * Every rate here divides by the delta of `RTCStats.timestamp`, not by the
 * period we asked `setTimeout` for. Dividing by the nominal period manufactures
 * phantom bursts: if our own timer is late, the same packets arrive in a window
 * we believe to be shorter than it was, and the computed rate spikes. During
 * the investigation this produced a confident and completely wrong finding, so
 * it is worth being explicit about.
 *
 * Normalising on the WebRTC clock also turns the two failure modes into
 * separate, simultaneously observable signals:
 *
 * - **Our JavaScript was late.** `timestamp` advanced further than the period
 *   we asked for, and the packet count advanced in proportion. The rate is
 *   normal, no stall is reported, and {@link ISendCadenceMetrics.lateSamples}
 *   records it. This is event-loop congestion, which belongs to the event-loop
 *   monitor, not here.
 * - **The send path stalled.** `timestamp` advanced by about the period we
 *   asked for and the packet count did not. A stall is reported with no
 *   lateness. This is the condition above, and nothing else in the report sees
 *   it.
 *
 * A main-thread stall broad enough to hold up both shows as a stall *and* as
 * lateness, which is itself the useful distinction — in the measured call the
 * network thread stayed responsive through 86% of the stalls, so the two
 * signals are genuinely independent.
 *
 * ## The baseline is the call's own rate
 *
 * Expected packet count comes from a running median of the call's observed
 * rate, not from a hardcoded 50 packets/s. A negotiated `ptime` of 40 or 60 ms
 * halves or thirds the rate, and a constant would read the whole call as one
 * long stall. The median is taken over rates from samples that actually
 * carried packets, so pre-media intervals cannot drag the baseline to zero,
 * and it tolerates the bursts themselves: in the measured call they affect a
 * minority of samples and leave the median at the true rate.
 *
 * @internal
 */

/** One reading of the outbound packet counter. */
export interface ISendCadenceSample {
  /** `outbound-rtp.packetsSent` — cumulative. */
  packetsSent: number;
  /**
   * `RTCStats.timestamp`, in milliseconds, as reported by the WebRTC stack.
   * Deliberately not `Date.now()`: see the note on normalisation above.
   */
  timestampMs: number;
}

/** Cadence of the outbound stream over one reporting interval. */
export interface ISendCadenceMetrics {
  /** Sub-interval readings that contributed. Zero means nothing is reported. */
  samples: number;
  /** Self-calibrated packet rate for this call, packets/s. */
  baselinePacketRate?: number;
  /** Packetisation time implied by the baseline, ms. ~20 for default Opus. */
  ptimeMs?: number;
  /**
   * Largest surplus over expectation in a single sub-interval, in packets —
   * the size of the biggest flush. Multiply by `ptimeMs` for the queueing
   * delay it imposes on a receiver draining one packet per packet-time.
   */
  maxBurstPackets?: number;
  /** `maxBurstPackets * ptimeMs` — the delay that burst is predicted to cost. */
  maxBurstMs?: number;
  /** Largest single shortfall, in ms of un-sent media. */
  maxStallMs?: number;
  /** Total shortfall across the interval, in ms. */
  stalledMs?: number;
  /** `stalledMs` as a fraction of the interval's measured duration, 0..1. */
  stalledRatio?: number;
  /**
   * Shortfalls immediately followed by a surplus. This pairing is the
   * stall-and-flush signature; a shortfall with no matching flush is lost
   * media, which the loss counters already own.
   */
  stallFlushPairs?: number;
  /** Sub-intervals where our own timer ran at least 1.5x the period asked. */
  lateSamples?: number;
  /** Worst overshoot of our own timer, ms beyond the period asked. */
  maxSamplerLatenessMs?: number;
}

export interface ISendCadenceSamplerConfig {
  /**
   * Period the caller is driving us at, ms. Used only to judge our own
   * lateness — never to normalise a rate.
   */
  periodMs: number;
  /** Rates kept for the running median baseline. */
  baselineWindow: number;
  /** Samples carrying packets before any stall or burst is reported. */
  minBaselineSamples: number;
  /**
   * Fraction of expectation a sub-interval must fall below to count as a
   * stall, and rise above to count as a burst. 0.5 means "half the packets
   * we expected" / "half again as many".
   */
  deviationRatio: number;
  /** Multiple of `periodMs` at which our own timer counts as late. */
  latenessRatio: number;
}

const DEFAULTS: ISendCadenceSamplerConfig = {
  periodMs: 250,
  baselineWindow: 20,
  minBaselineSamples: 4,
  deviationRatio: 0.5,
  latenessRatio: 1.5,
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export class SendCadenceSampler {
  private readonly _config: ISendCadenceSamplerConfig;

  private _previous: ISendCadenceSample | null = null;
  private _rates: number[] = [];

  /** Accumulators for the interval currently being measured. */
  private _samples = 0;
  private _measuredMs = 0;
  private _maxBurstPackets = 0;
  private _maxStallMs = 0;
  private _stalledMs = 0;
  private _stallFlushPairs = 0;
  private _lateSamples = 0;
  private _maxLatenessMs = 0;
  private _previousWasStall = false;

  constructor(config: Partial<ISendCadenceSamplerConfig> = {}) {
    this._config = { ...DEFAULTS, ...config };
  }

  /**
   * Feed one reading of the outbound packet counter.
   *
   * Safe to call with a stale or duplicate reading: a non-advancing timestamp
   * is ignored rather than producing a divide-by-zero rate.
   */
  public addSample(sample: ISendCadenceSample): void {
    const previous = this._previous;
    this._previous = sample;

    if (!previous) {
      return;
    }

    const deltaMs = sample.timestampMs - previous.timestampMs;
    const deltaPackets = sample.packetsSent - previous.packetsSent;

    // The counter went backwards: the sender was replaced and this is a new
    // SSRC. Nothing about the old stream's cadence carries over.
    if (deltaPackets < 0) {
      this.reset();
      this._previous = sample;
      return;
    }

    // Duplicate or non-monotonic reading — no interval to measure.
    if (deltaMs <= 0) {
      return;
    }

    this._samples += 1;
    this._measuredMs += deltaMs;

    const lateness = deltaMs - this._config.periodMs;
    if (deltaMs >= this._config.periodMs * this._config.latenessRatio) {
      this._lateSamples += 1;
    }
    if (lateness > this._maxLatenessMs) {
      this._maxLatenessMs = lateness;
    }

    // Only samples that carried media calibrate the baseline. A pre-media
    // sample reads zero packets and would drag the baseline toward zero,
    // after which every later interval looks like a burst.
    if (deltaPackets > 0) {
      this._rates.push((deltaPackets / deltaMs) * 1000);
      if (this._rates.length > this._config.baselineWindow) {
        this._rates.shift();
      }
    }

    if (this._rates.length < this._config.minBaselineSamples) {
      return;
    }

    const baseline = median(this._rates);
    if (baseline <= 0) {
      return;
    }

    const ptimeMs = 1000 / baseline;
    const expected = (baseline * deltaMs) / 1000;
    const surplus = deltaPackets - expected;

    if (deltaPackets < expected * (1 - this._config.deviationRatio)) {
      const stallMs = -surplus * ptimeMs;
      this._stalledMs += stallMs;
      if (stallMs > this._maxStallMs) {
        this._maxStallMs = stallMs;
      }
      this._previousWasStall = true;
      return;
    }

    if (deltaPackets > expected * (1 + this._config.deviationRatio)) {
      if (surplus > this._maxBurstPackets) {
        this._maxBurstPackets = surplus;
      }
      if (this._previousWasStall) {
        this._stallFlushPairs += 1;
      }
    }

    this._previousWasStall = false;
  }

  /**
   * Metrics for the interval just measured, clearing the accumulators for the
   * next one. The baseline and the last reading survive, so cadence is judged
   * against the whole call rather than re-learned every second.
   *
   * Returns `null` when no sub-interval was measured, so that a report from a
   * browser where this never ran carries no `sendCadence` block at all rather
   * than a block of zeroes that reads like a healthy measurement.
   */
  public drain(): ISendCadenceMetrics | null {
    if (this._samples === 0) {
      return null;
    }

    // Gated on the same condition as addSample(). Reporting a baseline while
    // still calibrating would also report stalledMs: 0 and maxBurstPackets: 0,
    // which reads as a healthy measurement rather than as no measurement.
    const calibrated = this._rates.length >= this._config.minBaselineSamples;
    const baseline = calibrated ? median(this._rates) : undefined;
    const ptimeMs = baseline && baseline > 0 ? 1000 / baseline : undefined;
    const round = (value: number, places = 2): number => {
      const factor = 10 ** places;
      return Math.round(value * factor) / factor;
    };

    const metrics: ISendCadenceMetrics = { samples: this._samples };

    if (baseline !== undefined && ptimeMs !== undefined) {
      metrics.baselinePacketRate = round(baseline);
      metrics.ptimeMs = round(ptimeMs);
      metrics.maxBurstPackets = round(this._maxBurstPackets);
      metrics.maxBurstMs = round(this._maxBurstPackets * ptimeMs);
      metrics.maxStallMs = round(this._maxStallMs);
      metrics.stalledMs = round(this._stalledMs);
      metrics.stalledRatio =
        this._measuredMs > 0 ? round(this._stalledMs / this._measuredMs, 4) : 0;
      metrics.stallFlushPairs = this._stallFlushPairs;
    }

    metrics.lateSamples = this._lateSamples;
    metrics.maxSamplerLatenessMs = round(Math.max(0, this._maxLatenessMs));

    this._samples = 0;
    this._measuredMs = 0;
    this._maxBurstPackets = 0;
    this._maxStallMs = 0;
    this._stalledMs = 0;
    this._stallFlushPairs = 0;
    this._lateSamples = 0;
    this._maxLatenessMs = 0;

    return metrics;
  }

  /** Forget the baseline and all accumulators. */
  public reset(): void {
    this._previous = null;
    this._rates = [];
    this._samples = 0;
    this._measuredMs = 0;
    this._maxBurstPackets = 0;
    this._maxStallMs = 0;
    this._stalledMs = 0;
    this._stallFlushPairs = 0;
    this._lateSamples = 0;
    this._maxLatenessMs = 0;
    this._previousWasStall = false;
  }
}
