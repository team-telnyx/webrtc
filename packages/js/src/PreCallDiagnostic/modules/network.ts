/**
 * Network quality report module — T4 (VSDK-301).
 *
 * This module normalizes raw WebRTC stats into a compact network-quality
 * section of the PreCallDiagnosticReport. It extracts RTT, jitter,
 * packet loss, byte counters, and bitrate, classifies overall quality,
 * and provides reason inputs for the verdict module.
 *
 * Design principles:
 * - All values are normalized to documented units (ms for RTT/jitter, bps for bitrate).
 * - No NaN values are ever emitted — missing/invalid stats are omitted.
 * - Browser-specific assumptions are avoided; partial stats are supported.
 * - Raw stats remain under `raw` in the report — this module does not duplicate them.
 */

import type {
  PreCallNetworkReport,
  PreCallDiagnosticReason,
  NetworkMinMaxAverage,
  NetworkPacketCounters,
  NetworkByteCounters,
  NetworkBitrate,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

// --- Quality classification thresholds (in ms and fraction) ---

/** RTT above this is considered degraded (ms). */
const RTT_DEGRADED_MS = 300;
/** RTT above this is considered poor (ms). */
const RTT_POOR_MS = 500;
/** Jitter above this is considered degraded (ms). */
const JITTER_DEGRADED_MS = 30;
/** Jitter above this is considered poor (ms). */
const JITTER_POOR_MS = 100;
/** Packet loss fraction above this is considered degraded (0–1). */
const PACKET_LOSS_DEGRADED_FRACTION = 0.02;
/** Packet loss fraction above this is considered poor (0–1). */
const PACKET_LOSS_POOR_FRACTION = 0.05;

/**
 * Audio bitrate below this is considered "low" (bits per second).
 *
 * The VSDK-301 spec lists `network_low_bitrate` as a required reason code
 * but does not define an explicit numeric threshold. This constant uses a
 * conservative audio-only floor of 8 kbps (8000 bps): below this, an audio
 * diagnostic call is effectively starved of media. The deviation from an
 * unspecified threshold is documented in the PR review.
 */
const LOW_BITRATE_BPS = 8000;

// --- Internal stat-entry types ---

/**
 * Shape of a single inbound audio stats entry as produced by the SDK
 * stats collector. Uses `any` because the exact shape depends on the
 * browser and SDK version — we read only known fields defensively.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InboundAudioEntry = any;

/**
 * Shape of a single outbound audio stats entry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OutboundAudioEntry = any;

/**
 * Shape of a single stats sample frame from the diagnostic context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StatsFrame = any;

// --- Helpers ---

/**
 * Safely read a number from a stats entry, returning `undefined` if
 * the value is missing, not a number, or NaN.
 */
function safeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value)) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

/**
 * Compute min/max/average from an array of numeric samples.
 * Returns `undefined` if there are no valid samples.
 */
function computeMinMaxAverage(samples: number[]): NetworkMinMaxAverage | undefined {
  const valid = samples.filter((v) => v !== undefined && !Number.isNaN(v) && Number.isFinite(v));
  if (valid.length === 0) return undefined;

  let min = Infinity;
  let max = -Infinity;
  let total = 0;
  for (const v of valid) {
    if (v < min) min = v;
    if (v > max) max = v;
    total += v;
  }

  return {
    min,
    max,
    average: total / valid.length,
  };
}

/**
 * Extract inbound RTT samples from stats frames.
 * RTT comes from `remote.audio.inbound[].roundTripTime` (in seconds from
 * standard WebRTC stats) — we convert to milliseconds.
 */
function extractRttSamples(frames: StatsFrame[]): number[] {
  const samples: number[] = [];
  for (const frame of frames) {
    // Try remote inbound audio first (standard WebRTC stats path)
    let frameProducedRtt = false;
    const remoteInbound: InboundAudioEntry[] | undefined =
      frame?.remote?.audio?.inbound;
    if (Array.isArray(remoteInbound)) {
      for (const entry of remoteInbound) {
        const rttSec = safeNumber(entry?.roundTripTime);
        if (rttSec !== undefined) {
          // roundTripTime is in seconds in standard stats; convert to ms
          const rttMs = rttSec * 1000;
          if (rttMs >= 0) {
            samples.push(rttMs);
            frameProducedRtt = true;
          }
        }
      }
    }

    // Fallback: try connection-level RTT (older SDK stats format).
    // Decision is per-frame so that mixed/partial stats streams are handled
    // correctly — if this frame had no remote inbound RTT, we still want to
    // include connection.currentRoundTripTime in min/max/average.
    if (!frameProducedRtt) {
      const currentRtt = safeNumber(frame?.connection?.currentRoundTripTime);
      if (currentRtt !== undefined) {
        const rttMs = currentRtt * 1000;
        if (rttMs >= 0) {
          samples.push(rttMs);
        }
      }
    }
  }
  return samples;
}

/**
 * Extract jitter samples from stats frames.
 * Jitter comes from inbound audio `jitter` (in seconds from standard
 * WebRTC stats) — we convert to milliseconds.
 */
function extractJitterSamples(frames: StatsFrame[]): number[] {
  const samples: number[] = [];
  for (const frame of frames) {
    let frameProducedJitter = false;
    const remoteInbound: InboundAudioEntry[] | undefined =
      frame?.remote?.audio?.inbound;
    if (Array.isArray(remoteInbound)) {
      for (const entry of remoteInbound) {
        const jitterSec = safeNumber(entry?.jitter);
        if (jitterSec !== undefined) {
          const jitterMs = jitterSec * 1000;
          if (jitterMs >= 0) {
            samples.push(jitterMs);
            frameProducedJitter = true;
          }
        }
      }
    }

    // Fallback: local inbound audio jitter
    if (!frameProducedJitter) {
      const localInbound: InboundAudioEntry[] | undefined =
        frame?.audio?.inbound;
      if (Array.isArray(localInbound)) {
        for (const entry of localInbound) {
          const jitterSec = safeNumber(entry?.jitter);
          if (jitterSec !== undefined) {
            const jitterMs = jitterSec * 1000;
            if (jitterMs >= 0) {
              samples.push(jitterMs);
              frameProducedJitter = true;
            }
          }
        }
      }
    }

    // Fallback: IStatsInterval shape — audio.inbound is an object (not array)
    // with jitterAvg already in milliseconds (no *1000 conversion needed).
    // This supports the existing CallReportCollector stats shape so that
    // jitter degradation is not missed when wired to that collector.
    if (!frameProducedJitter) {
      const inboundObj = frame?.audio?.inbound;
      if (inboundObj && typeof inboundObj === 'object' && !Array.isArray(inboundObj)) {
        const jitterAvgMs = safeNumber(inboundObj.jitterAvg);
        if (jitterAvgMs !== undefined && jitterAvgMs >= 0) {
          samples.push(jitterAvgMs);
        }
      }
    }
  }
  return samples;
}

/**
 * Extract packet counters from the last stats frame.
 * Uses the last frame for cumulative counters (packets sent/received/lost).
 */
function extractPacketCounters(frames: StatsFrame[]): NetworkPacketCounters | undefined {
  if (frames.length === 0) return undefined;

  const lastFrame = frames[frames.length - 1];
  let packetsSent: number | undefined;
  let packetsReceived: number | undefined;
  let packetsLost: number | undefined;

  // Outbound audio
  const outbound: OutboundAudioEntry[] | undefined =
    lastFrame?.audio?.outbound;
  if (Array.isArray(outbound) && outbound.length > 0) {
    packetsSent = safeNumber(outbound[0]?.packetsSent);
  }

  // Inbound audio
  const inbound: InboundAudioEntry[] | undefined =
    lastFrame?.audio?.inbound;
  if (Array.isArray(inbound) && inbound.length > 0) {
    packetsReceived = safeNumber(inbound[0]?.packetsReceived);
    packetsLost = safeNumber(inbound[0]?.packetsLost);
  }

  // Fallback: remote inbound
  const remoteInbound: InboundAudioEntry[] | undefined =
    lastFrame?.remote?.audio?.inbound;
  if (packetsReceived === undefined && Array.isArray(remoteInbound) && remoteInbound.length > 0) {
    packetsReceived = safeNumber(remoteInbound[0]?.packetsReceived);
    packetsLost = safeNumber(remoteInbound[0]?.packetsLost);
  }

  // Fallback: connection-level packet counters
  if (packetsSent === undefined) {
    packetsSent = safeNumber(lastFrame?.connection?.packetsSent);
  }
  if (packetsReceived === undefined) {
    packetsReceived = safeNumber(lastFrame?.connection?.packetsReceived);
  }

  // Compute packet loss fraction
  const totalPackets = (packetsReceived ?? 0) + (packetsLost ?? 0);
  let packetLossFraction: number | undefined;
  if (packetsLost !== undefined && totalPackets > 0) {
    packetLossFraction = packetsLost / totalPackets;
  }

  // Only return if we have at least one value
  if (
    packetsSent === undefined &&
    packetsReceived === undefined &&
    packetsLost === undefined
  ) {
    return undefined;
  }

  return {
    packetsSent,
    packetsReceived,
    packetsLost,
    packetLossFraction,
  };
}

/**
 * Extract byte counters from the last stats frame.
 */
function extractByteCounters(frames: StatsFrame[]): NetworkByteCounters | undefined {
  if (frames.length === 0) return undefined;

  const lastFrame = frames[frames.length - 1];
  let bytesSent: number | undefined;
  let bytesReceived: number | undefined;

  // Outbound audio bytes
  const outbound: OutboundAudioEntry[] | undefined =
    lastFrame?.audio?.outbound;
  if (Array.isArray(outbound) && outbound.length > 0) {
    bytesSent = safeNumber(outbound[0]?.bytesSent);
  }

  // Inbound audio bytes
  const inbound: InboundAudioEntry[] | undefined =
    lastFrame?.audio?.inbound;
  if (Array.isArray(inbound) && inbound.length > 0) {
    bytesReceived = safeNumber(inbound[0]?.bytesReceived);
  }

  // Fallback: connection-level byte counters
  if (bytesSent === undefined) {
    bytesSent = safeNumber(lastFrame?.connection?.bytesSent);
  }
  if (bytesReceived === undefined) {
    bytesReceived = safeNumber(lastFrame?.connection?.bytesReceived);
  }

  if (bytesSent === undefined && bytesReceived === undefined) {
    return undefined;
  }

  return { bytesSent, bytesReceived };
}

/**
 * Estimate audio bitrate from consecutive stats samples.
 * Bitrate = delta(bytes) / delta(time) * 8 (bytes to bits).
 * Returns values in bps.
 */
function extractBitrate(frames: StatsFrame[]): NetworkBitrate | undefined {
  if (frames.length < 2) return undefined;

  // Use the first and last frames for bitrate estimation
  const first = frames[0];
  const last = frames[frames.length - 1];

  const firstTimestamp = safeNumber(first?.timestamp);
  const lastTimestamp = safeNumber(last?.timestamp);
  if (firstTimestamp === undefined || lastTimestamp === undefined) return undefined;
  const dtSec = (lastTimestamp - firstTimestamp) / 1000;
  if (dtSec <= 0) return undefined;

  // Outbound bitrate
  let outbound: number | undefined;
  const firstOutBytes = safeNumber(first?.audio?.outbound?.[0]?.bytesSent) ??
    safeNumber(first?.connection?.bytesSent);
  const lastOutBytes = safeNumber(last?.audio?.outbound?.[0]?.bytesSent) ??
    safeNumber(last?.connection?.bytesSent);
  if (firstOutBytes !== undefined && lastOutBytes !== undefined) {
    const delta = lastOutBytes - firstOutBytes;
    if (delta >= 0) {
      outbound = (delta * 8) / dtSec;
    }
  }

  // Inbound bitrate
  let inbound: number | undefined;
  const firstInBytes = safeNumber(first?.audio?.inbound?.[0]?.bytesReceived) ??
    safeNumber(first?.connection?.bytesReceived);
  const lastInBytes = safeNumber(last?.audio?.inbound?.[0]?.bytesReceived) ??
    safeNumber(last?.connection?.bytesReceived);
  if (firstInBytes !== undefined && lastInBytes !== undefined) {
    const delta = lastInBytes - firstInBytes;
    if (delta >= 0) {
      inbound = (delta * 8) / dtSec;
    }
  }

  if (outbound === undefined && inbound === undefined) return undefined;

  return { outbound, inbound };
}

/**
 * Classify overall network quality based on RTT, jitter, and packet loss.
 *
 * Quality is determined by the worst metric:
 * - If any metric is "poor" → quality = "poor"
 * - If any metric is "degraded" (but none poor) → quality = "fair"
 * - Otherwise → quality = "good"
 *
 * If insufficient data is available, returns "unknown".
 */
function classifyQuality(
  rtt: NetworkMinMaxAverage | undefined,
  jitter: NetworkMinMaxAverage | undefined,
  packets: NetworkPacketCounters | undefined,
): 'good' | 'fair' | 'poor' | 'unknown' {
  let hasData = false;
  let worstLevel: 'good' | 'fair' | 'poor' = 'good';

  // Check RTT (use average for classification)
  if (rtt?.average !== undefined) {
    hasData = true;
    if (rtt.average >= RTT_POOR_MS) {
      worstLevel = 'poor';
    } else if (rtt.average >= RTT_DEGRADED_MS) {
      if (worstLevel === 'good') worstLevel = 'fair';
    }
  }

  // Check jitter (use average for classification)
  if (jitter?.average !== undefined) {
    hasData = true;
    if (jitter.average >= JITTER_POOR_MS) {
      worstLevel = 'poor';
    } else if (jitter.average >= JITTER_DEGRADED_MS) {
      if (worstLevel === 'good') worstLevel = 'fair';
    }
  }

  // Check packet loss
  if (packets?.packetLossFraction !== undefined) {
    hasData = true;
    if (packets.packetLossFraction >= PACKET_LOSS_POOR_FRACTION) {
      worstLevel = 'poor';
    } else if (packets.packetLossFraction >= PACKET_LOSS_DEGRADED_FRACTION) {
      if (worstLevel === 'good') worstLevel = 'fair';
    }
  }

  return hasData ? worstLevel : 'unknown';
}

/**
 * Build reason entries for the verdict module based on detected degradations.
 *
 * Reason codes are aligned with the VSDK-301 ticket spec, which uses singular
 * degradation codes (e.g. `network_high_rtt`) rather than `_degraded`/`_poor`
 * suffixes. Each degradation emits a single code; the human-readable message
 * conveys the severity and the crossed threshold.
 */
function buildReasons(
  rtt: NetworkMinMaxAverage | undefined,
  jitter: NetworkMinMaxAverage | undefined,
  packets: NetworkPacketCounters | undefined,
  bitrate: NetworkBitrate | undefined,
): PreCallDiagnosticReason[] {
  const reasons: PreCallDiagnosticReason[] = [];

  if (rtt?.average !== undefined) {
    if (rtt.average >= RTT_POOR_MS) {
      reasons.push({
        code: 'network_high_rtt',
        message: `Average RTT is ${Math.round(rtt.average)}ms (poor: ≥${RTT_POOR_MS}ms threshold)`,
        source: 'network',
      });
    } else if (rtt.average >= RTT_DEGRADED_MS) {
      reasons.push({
        code: 'network_high_rtt',
        message: `Average RTT is ${Math.round(rtt.average)}ms (degraded: ≥${RTT_DEGRADED_MS}ms threshold)`,
        source: 'network',
      });
    }
  }

  if (jitter?.average !== undefined) {
    if (jitter.average >= JITTER_POOR_MS) {
      reasons.push({
        code: 'network_high_jitter',
        message: `Average jitter is ${Math.round(jitter.average)}ms (poor: ≥${JITTER_POOR_MS}ms threshold)`,
        source: 'network',
      });
    } else if (jitter.average >= JITTER_DEGRADED_MS) {
      reasons.push({
        code: 'network_high_jitter',
        message: `Average jitter is ${Math.round(jitter.average)}ms (degraded: ≥${JITTER_DEGRADED_MS}ms threshold)`,
        source: 'network',
      });
    }
  }

  if (packets?.packetLossFraction !== undefined) {
    if (packets.packetLossFraction >= PACKET_LOSS_POOR_FRACTION) {
      reasons.push({
        code: 'network_packet_loss',
        message: `Packet loss is ${(packets.packetLossFraction * 100).toFixed(1)}% (poor: ≥${PACKET_LOSS_POOR_FRACTION * 100}% threshold)`,
        source: 'network',
      });
    } else if (packets.packetLossFraction >= PACKET_LOSS_DEGRADED_FRACTION) {
      reasons.push({
        code: 'network_packet_loss',
        message: `Packet loss is ${(packets.packetLossFraction * 100).toFixed(1)}% (degraded: ≥${PACKET_LOSS_DEGRADED_FRACTION * 100}% threshold)`,
        source: 'network',
      });
    }
  }

  // Low-bitrate detection: fires when a measured audio bitrate falls below the
  // configured floor. Only considers directions with a defined bitrate value so
  // that a missing counter (e.g. no inbound audio) does not trigger a false low.
  if (bitrate) {
    if (bitrate.outbound !== undefined && bitrate.outbound < LOW_BITRATE_BPS) {
      reasons.push({
        code: 'network_low_bitrate',
        message: `Outbound audio bitrate is ${Math.round(bitrate.outbound)} bps (<${LOW_BITRATE_BPS} bps threshold)`,
        source: 'network',
      });
    }
    if (bitrate.inbound !== undefined && bitrate.inbound < LOW_BITRATE_BPS) {
      reasons.push({
        code: 'network_low_bitrate',
        message: `Inbound audio bitrate is ${Math.round(bitrate.inbound)} bps (<${LOW_BITRATE_BPS} bps threshold)`,
        source: 'network',
      });
    }
  }

  return reasons;
}

// --- Public API ---

/**
 * Build the network report section from the diagnostic context.
 *
 * Reads stats samples from the context, normalizes RTT/jitter/packet-loss/bytes/bitrate,
 * classifies quality, and provides reason inputs for the verdict module.
 *
 * Returns `undefined` if no stats samples are available (module disabled or
 * stats collection not yet implemented).
 */
export function buildPreCallNetworkReport(
  context: PreCallDiagnosticContext
): PreCallNetworkReport | undefined {
  // If the network module is explicitly disabled, return undefined.
  // Honors both `network: false` and `network: { enabled: false }`.
  // (The runner also normalizes this, but the module defends independently
  // so it can be unit-tested directly with a disabled-options context.)
  const networkOpt = context.options.network;
  const networkDisabled =
    networkOpt === false ||
    (typeof networkOpt === 'object' && networkOpt !== null && networkOpt.enabled === false);
  if (networkDisabled) {
    return undefined;
  }

  // Read stats samples from context
  const frames: StatsFrame[] = context.statsSamples;
  if (!Array.isArray(frames) || frames.length === 0) {
    // No stats available — return a report with quality: 'unknown'
    return {
      quality: 'unknown',
      reasons: [],
    };
  }

  // Extract normalized metrics
  const rttSamples = extractRttSamples(frames);
  const jitterSamples = extractJitterSamples(frames);
  const rtt = computeMinMaxAverage(rttSamples);
  const jitter = computeMinMaxAverage(jitterSamples);
  const packets = extractPacketCounters(frames);
  const bytes = extractByteCounters(frames);
  const bitrate = extractBitrate(frames);

  // Classify quality
  const quality = classifyQuality(rtt, jitter, packets);

  // Build reason inputs
  const reasons = buildReasons(rtt, jitter, packets, bitrate);

  return {
    quality,
    rtt,
    jitter,
    packets,
    bytes,
    bitrate,
    reasons: reasons.length > 0 ? reasons : undefined,
  };
}
