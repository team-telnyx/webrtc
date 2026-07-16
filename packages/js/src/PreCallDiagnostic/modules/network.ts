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
  NetworkAudioDirection,
} from '../types';
import type { PreCallDiagnosticContext } from '../context';

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

/** Browser WebRTC stats are intentionally extensible and differ slightly
 * between implementations. Keep reads defensive while consuming the native
 * RTCStatsReport shape stored by the diagnostic context.
 */
type StatsEntry = RTCStats & Record<string, unknown>;

type AudioDirection = 'inbound' | 'outbound';

interface AudioCounters {
  packets?: number;
  bytes?: number;
}

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
function computeMinMaxAverage(
  samples: number[]
): NetworkMinMaxAverage | undefined {
  const valid = samples.filter((v) => safeNumber(v) !== undefined);
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
 * Extract inbound RTT samples from raw RTC stats reports.
 * RTT comes from audio `remote-inbound-rtp` entries (in seconds from standard
 * WebRTC stats) — we convert to milliseconds.
 *
 * Also reads `currentRoundTripTime` from the selected candidate pair as a
 * fallback. Note: `currentRoundTripTime` is the latest STUN
 * response RTT for the selected pair; it can vary between samples if the
 * call is long enough. With very short calls (1-2 samples), min/max/avg
 * may appear identical because there is only one data point.
 */
function isAudioRtpStat(entry: StatsEntry): boolean {
  const mediaKind = entry.kind ?? entry.mediaType;
  return mediaKind === undefined || mediaKind === 'audio';
}

/** Return the candidate pair selected by a transport, or the best legacy
 * selected/nominated fallback when transport linkage is unavailable.
 */
function getSelectedCandidatePair(
  report: RTCStatsReport
): StatsEntry | undefined {
  const entries: StatsEntry[] = [];
  const selectedPairIds = new Set<string>();

  report.forEach((rawEntry) => {
    const entry = rawEntry as StatsEntry;
    entries.push(entry);
    if (
      entry.type === 'transport' &&
      typeof entry.selectedCandidatePairId === 'string'
    ) {
      selectedPairIds.add(entry.selectedCandidatePairId);
    }
  });

  const candidatePairs = entries.filter(
    (entry) => entry.type === 'candidate-pair'
  );

  return (
    candidatePairs.find((entry) => selectedPairIds.has(entry.id)) ??
    candidatePairs.find(
      (entry) =>
        entry.selected === true ||
        (entry.nominated === true && entry.state === 'succeeded')
    ) ??
    candidatePairs.find((entry) => entry.state === 'succeeded')
  );
}

/** Add all finite numeric values for a field, preserving `undefined` when no
 * entry exposes that counter.
 */
function sumField(entries: StatsEntry[], field: string): number | undefined {
  let total = 0;
  let found = false;

  for (const entry of entries) {
    const value = safeNumber(entry[field]);
    if (value !== undefined) {
      total += value;
      found = true;
    }
  }

  return found ? total : undefined;
}

function getEntries(
  report: RTCStatsReport,
  type: string,
  audioOnly = false
): StatsEntry[] {
  const entries: StatsEntry[] = [];
  report.forEach((rawEntry) => {
    const entry = rawEntry as StatsEntry;
    if (entry.type === type && (!audioOnly || isAudioRtpStat(entry))) {
      entries.push(entry);
    }
  });
  return entries;
}

function extractAudioCounters(
  report: RTCStatsReport,
  direction: AudioDirection
): AudioCounters {
  const entries = getEntries(report, `${direction}-rtp`, true);
  return direction === 'outbound'
    ? {
        packets: sumField(entries, 'packetsSent'),
        bytes: sumField(entries, 'bytesSent'),
      }
    : {
        packets: sumField(entries, 'packetsReceived'),
        bytes: sumField(entries, 'bytesReceived'),
      };
}

function didIncrease(first: AudioCounters, last: AudioCounters): boolean {
  const packetsIncreased =
    first.packets === undefined
      ? last.packets !== undefined
      : last.packets !== undefined && last.packets > first.packets;
  const bytesIncreased =
    first.bytes === undefined
      ? last.bytes !== undefined
      : last.bytes !== undefined && last.bytes > first.bytes;

  return packetsIncreased || bytesIncreased;
}

function computeDelta(
  first: number | undefined,
  last: number | undefined
): number | undefined {
  if (first === undefined || last === undefined) return undefined;
  return safeNumber(last - first);
}

/** Build a per-direction audio RTP summary for the network report. */
function extractAudioDirection(
  reports: RTCStatsReport[],
  direction: AudioDirection
): NetworkAudioDirection | undefined {
  const hasAudio = reports.some(
    (report) => getEntries(report, `${direction}-rtp`, true).length > 0
  );
  if (!hasAudio) return undefined;

  const counterSamples = reports
    .map((report) => extractAudioCounters(report, direction))
    .filter(
      ({ packets, bytes }) => packets !== undefined || bytes !== undefined
    );

  // RTP stats may not exist in the first snapshots immediately after a call
  // becomes active. Use the earliest and latest snapshots that actually carry
  // counters for this direction so late-created inbound/outbound entries still
  // produce meaningful deltas.
  const first = counterSamples[0] ?? {};
  const last = counterSamples[counterSamples.length - 1] ?? {};
  const packetsDelta = computeDelta(first.packets, last.packets);
  const bytesDelta = computeDelta(first.bytes, last.bytes);

  return {
    flowing: counterSamples.length > 1 && didIncrease(first, last),
    ...(last.packets !== undefined ? { packets: last.packets } : {}),
    ...(last.bytes !== undefined ? { bytes: last.bytes } : {}),
    ...(packetsDelta !== undefined ? { packetsDelta } : {}),
    ...(bytesDelta !== undefined ? { bytesDelta } : {}),
  };
}

function extractRttSamples(reports: RTCStatsReport[]): number[] {
  const samples: number[] = [];
  for (const report of reports) {
    let reportProducedRtt = false;
    const remoteInbound = getEntries(report, 'remote-inbound-rtp', true);
    for (const entry of remoteInbound) {
      // roundTripTime: latest RTT measured (seconds → ms).
      // This is the instantaneous RTT of the most recent STUN response.
      const rttSec = safeNumber(entry.roundTripTime);
      if (rttSec !== undefined) {
        const rttMs = rttSec * 1000;
        if (rttMs >= 0) {
          samples.push(rttMs);
          reportProducedRtt = true;
        }
      }

      // totalRoundTripTime / roundTripTimeMeasurements: cumulative average.
      // Always collect this when available — even when roundTripTime was
      // present — because the cumulative average varies across frames as
      // more STUN responses accumulate, giving min/max/average real spread.
      // Without this, a short call where roundTripTime stays constant across
      // frames (no new STUN response) produces {min==max==average} — the
      // bug reported in VSDK-412 review (Review 18, point 3).
      const totalRtt = safeNumber(entry.totalRoundTripTime);
      const measurements = safeNumber(entry.roundTripTimeMeasurements);
      if (
        totalRtt !== undefined &&
        measurements !== undefined &&
        measurements > 0
      ) {
        const avgRttMs = (totalRtt / measurements) * 1000;
        if (avgRttMs >= 0) {
          samples.push(avgRttMs);
          reportProducedRtt = true;
        }
      }
    }

    // Fall back to the selected candidate pair for this report.
    if (!reportProducedRtt) {
      const currentRtt = safeNumber(
        getSelectedCandidatePair(report)?.currentRoundTripTime
      );
      if (currentRtt !== undefined) {
        const rttMs = currentRtt * 1000;
        if (rttMs >= 0) samples.push(rttMs);
      }
    }
  }
  return samples;
}

/**
 * Extract jitter samples from raw RTC stats reports.
 * Jitter comes from inbound audio RTP entries (in seconds from standard
 * WebRTC stats) — we convert to milliseconds.
 */
function extractJitterSamples(reports: RTCStatsReport[]): number[] {
  const samples: number[] = [];
  for (const report of reports) {
    let reportProducedJitter = false;
    const remoteInbound = getEntries(report, 'remote-inbound-rtp', true);
    for (const entry of remoteInbound) {
      const jitterSec = safeNumber(entry.jitter);
      if (jitterSec !== undefined) {
        const jitterMs = jitterSec * 1000;
        if (jitterMs >= 0) {
          samples.push(jitterMs);
          reportProducedJitter = true;
        }
      }
    }

    // Fallback: local inbound audio jitter
    if (!reportProducedJitter) {
      const localInbound = getEntries(report, 'inbound-rtp', true);
      for (const entry of localInbound) {
        const jitterSec = safeNumber(entry.jitter);
        if (jitterSec !== undefined) {
          const jitterMs = jitterSec * 1000;
          if (jitterMs >= 0) {
            samples.push(jitterMs);
            reportProducedJitter = true;
          }
        }
      }
    }
  }
  return samples;
}

/**
 * Extract packet counters from the last stats report.
 * Uses the last report for cumulative counters (packets sent/received/lost).
 */
function extractPacketCounters(
  reports: RTCStatsReport[],
  inbound: NetworkAudioDirection | undefined,
  outbound: NetworkAudioDirection | undefined
): NetworkPacketCounters | undefined {
  if (reports.length === 0) return undefined;

  const lastReport = reports[reports.length - 1];
  const remoteInbound = getEntries(lastReport, 'remote-inbound-rtp', true);

  let packetsSent = outbound?.packets;
  let packetsReceived = inbound?.packets;
  let packetsLost = sumField(
    getEntries(lastReport, 'inbound-rtp', true),
    'packetsLost'
  );

  if (packetsReceived === undefined) {
    packetsReceived = sumField(remoteInbound, 'packetsReceived');
    packetsLost = sumField(remoteInbound, 'packetsLost');
  }

  const candidatePair = getSelectedCandidatePair(lastReport);
  if (packetsSent === undefined) {
    packetsSent = safeNumber(candidatePair?.packetsSent);
  }
  if (packetsReceived === undefined) {
    packetsReceived = safeNumber(candidatePair?.packetsReceived);
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
 * Extract byte counters from the last stats report.
 */
function extractByteCounters(
  reports: RTCStatsReport[],
  inbound: NetworkAudioDirection | undefined,
  outbound: NetworkAudioDirection | undefined
): NetworkByteCounters | undefined {
  if (reports.length === 0) return undefined;

  const lastReport = reports[reports.length - 1];
  let bytesSent = outbound?.bytes;
  let bytesReceived = inbound?.bytes;

  const candidatePair = getSelectedCandidatePair(lastReport);
  if (bytesSent === undefined) {
    bytesSent = safeNumber(candidatePair?.bytesSent);
  }
  if (bytesReceived === undefined) {
    bytesReceived = safeNumber(candidatePair?.bytesReceived);
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
function getReportTimestamp(report: RTCStatsReport): number | undefined {
  let timestamp: number | undefined;
  report.forEach((rawEntry) => {
    if (timestamp === undefined) {
      timestamp = safeNumber((rawEntry as StatsEntry).timestamp);
    }
  });
  return timestamp;
}

function extractBitrate(
  reports: RTCStatsReport[],
  inbound: NetworkAudioDirection | undefined,
  outbound: NetworkAudioDirection | undefined
): NetworkBitrate | undefined {
  if (reports.length < 2) return undefined;

  const first = reports[0];
  const last = reports[reports.length - 1];

  const firstTimestamp = getReportTimestamp(first);
  const lastTimestamp = getReportTimestamp(last);
  if (firstTimestamp === undefined || lastTimestamp === undefined)
    return undefined;
  const dtSec = (lastTimestamp - firstTimestamp) / 1000;
  if (dtSec <= 0) return undefined;

  const outboundBitrate =
    outbound?.bytesDelta !== undefined && outbound.bytesDelta >= 0
      ? (outbound.bytesDelta * 8) / dtSec
      : undefined;
  const inboundBitrate =
    inbound?.bytesDelta !== undefined && inbound.bytesDelta >= 0
      ? (inbound.bytesDelta * 8) / dtSec
      : undefined;

  if (outboundBitrate === undefined && inboundBitrate === undefined) {
    return undefined;
  }

  return { outbound: outboundBitrate, inbound: inboundBitrate };
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
  packets: NetworkPacketCounters | undefined
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
  bitrate: NetworkBitrate | undefined
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
 * Returns an unknown-quality report if no stats samples are available.
 */
export function buildPreCallNetworkReport(
  context: PreCallDiagnosticContext
): PreCallNetworkReport | undefined {
  if (context.statsSamples.length === 0) {
    return {
      quality: 'unknown',
      reasons: [],
    };
  }

  const reports = context.statsSamples;
  const inbound = extractAudioDirection(reports, 'inbound');
  const outbound = extractAudioDirection(reports, 'outbound');
  const rtt = computeMinMaxAverage(extractRttSamples(reports));
  const jitter = computeMinMaxAverage(extractJitterSamples(reports));
  const packets = extractPacketCounters(reports, inbound, outbound);
  const bytes = extractByteCounters(reports, inbound, outbound);
  const bitrate = extractBitrate(reports, inbound, outbound);
  const quality = classifyQuality(rtt, jitter, packets);

  // Network-only uses fixed three-second calls to verify each ICE URL. Keep the
  // measured bitrate in the per-server report, but do not classify it against
  // the normal-call bitrate floor: startup and teardown commonly occupy most
  // of this short sampling window.
  const assessedBitrate =
    context.options.mode === 'network-only' ? undefined : bitrate;
  const reasons = buildReasons(rtt, jitter, packets, assessedBitrate);

  return {
    quality,
    rtt,
    jitter,
    packets,
    bytes,
    bitrate,
    inbound,
    outbound,
    reasons: reasons.length > 0 ? reasons : undefined,
  };
}
