/**
 * RTP/media flow report module — T5 (folded into VSDK-301).
 *
 * This module consumes the shared stats sample timeline
 * (`context.statsSamples`) and determines whether audio RTP is flowing in
 * each direction during the diagnostic call. It does NOT poll the peer
 * connection, own timers, or perform network-quality classification —
 * that belongs to the network module. It reads only `context.statsSamples`.
 *
 * Design principles:
 * - Distinguish: no stats, no audio RTP, one-way (inbound or outbound only),
 *   and two-way (both directions increasing).
 * - Direction decisions require at least two samples (to detect whether
 *   counters increased). With a single sample, flowing is false because
 *   we cannot prove an increase.
 * - Reason codes are namespaced with `media_*` (disjoint from `network_*`).
 * - No NaN/Infinity/credentials/raw RTCStatsReport objects are emitted.
 */

import type {
  PreCallMediaReport,
  PreCallDiagnosticReason,
  MediaAudioDirection,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

// --- Internal stat-entry types ---

/**
 * Shape of a single stats entry as produced by the diagnostic collector.
 * Uses `any` because the exact shape depends on the browser and SDK version —
 * we read only known fields defensively.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AudioEntry = any;

/**
 * Shape of a single stats sample frame from the diagnostic context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StatsFrame = any;

// --- Helpers ---

/**
 * Safely read a number from a stats entry, returning `undefined` if
 * the value is missing, not a number, NaN, or Infinity.
 */
function safeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value)) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

/**
 * Extract the outbound audio entry array from a stats frame.
 *
 * Handles two shapes:
 * 1. Standard parsed frame: `frame.audio.outbound` is an array.
 * 2. IStatsInterval shape: `frame.audio.outbound` is an object with
 *    `packetsSent` / `bytesSent` (not an array) — we wrap it in an array
 *    so the rest of the logic is shape-agnostic.
 */
function getOutboundEntries(frame: StatsFrame): AudioEntry[] {
  const outbound = frame?.audio?.outbound;
  if (Array.isArray(outbound)) return outbound;
  // IStatsInterval shape: outbound is a single object
  if (outbound && typeof outbound === 'object') return [outbound];
  return [];
}

/**
 * Extract the inbound audio entry array from a stats frame.
 *
 * Handles two shapes:
 * 1. Standard parsed frame: `frame.audio.inbound` is an array.
 * 2. IStatsInterval shape: `frame.audio.inbound` is an object with
 *    `packetsReceived` / `bytesReceived` (not an array) — we wrap it in
 *    an array so the rest of the logic is shape-agnostic.
 */
function getInboundEntries(frame: StatsFrame): AudioEntry[] {
  const inbound = frame?.audio?.inbound;
  if (Array.isArray(inbound)) return inbound;
  // IStatsInterval shape: inbound is a single object
  if (inbound && typeof inbound === 'object') return [inbound];
  return [];
}

/**
 * Read outbound packet/byte counters from a frame, returning the first
 * valid entry's values. Outbound uses `packetsSent` / `bytesSent`.
 */
function readOutboundCounters(frame: StatsFrame): {
  packets?: number;
  bytes?: number;
} {
  const entries = getOutboundEntries(frame);
  for (const entry of entries) {
    const packets = safeNumber(entry?.packetsSent);
    const bytes = safeNumber(entry?.bytesSent);
    if (packets !== undefined || bytes !== undefined) {
      return { packets, bytes };
    }
  }
  return {};
}

/**
 * Read inbound packet/byte counters from a frame, returning the first
 * valid entry's values. Inbound uses `packetsReceived` / `bytesReceived`.
 */
function readInboundCounters(frame: StatsFrame): {
  packets?: number;
  bytes?: number;
} {
  const entries = getInboundEntries(frame);
  for (const entry of entries) {
    const packets = safeNumber(entry?.packetsReceived);
    const bytes = safeNumber(entry?.bytesReceived);
    if (packets !== undefined || bytes !== undefined) {
      return { packets, bytes };
    }
  }
  return {};
}

/**
 * Determine if counters increased across two samples.
 * Flowing = packets OR bytes increased by at least 1.
 * If both are undefined in both samples, flowing is false.
 *
 * Handles mixed-shape counters where a browser may drop one counter
 * between samples (e.g. `packetsReceived` disappears but `bytesReceived`
 * still updates). When a counter appears in one sample but not the
 * other, single-side presence is treated as an increase (a value that
 * newly appeared implies progression).
 */
function didIncrease(
  first: { packets?: number; bytes?: number },
  last: { packets?: number; bytes?: number }
): boolean {
  // Flowing = packets increased OR bytes increased.
  // Check both indicators independently — packets may stay flat while
  // bytes increase (e.g. larger payload, padding) and vice versa.
  let packetsIncreased = false;
  if (first.packets !== undefined && last.packets !== undefined) {
    packetsIncreased = last.packets > first.packets;
  } else if (first.packets === undefined && last.packets !== undefined) {
    // Single-side presence: counter newly appeared => progression
    packetsIncreased = true;
  }
  let bytesIncreased = false;
  if (first.bytes !== undefined && last.bytes !== undefined) {
    bytesIncreased = last.bytes > first.bytes;
  } else if (first.bytes === undefined && last.bytes !== undefined) {
    // Single-side presence: counter newly appeared => progression
    bytesIncreased = true;
  }
  return packetsIncreased || bytesIncreased;
}

/**
 * Compute the delta between first and last counter values.
 */
function computeDelta(
  first: number | undefined,
  last: number | undefined
): number | undefined {
  if (first === undefined || last === undefined) return undefined;
  const delta = last - first;
  if (Number.isNaN(delta) || !Number.isFinite(delta)) return undefined;
  return delta;
}

// --- Public API ---

/**
 * Build the media report section from the diagnostic context.
 *
 * Reads stats samples from `context.statsSamples` and determines whether
 * audio RTP is flowing in each direction. Requires at least two samples
 * to detect counter increases (flowing). With zero samples, returns a
 * safe `audioFlowing: false` report with a `media_no_stats` reason.
 *
 * Returns `undefined` if the media module is explicitly disabled.
 */
export function buildPreCallMediaReport(
  context: PreCallDiagnosticContext
): PreCallMediaReport | undefined {
  // If the media module is explicitly disabled, return undefined
  if (context.options.media === false) {
    return undefined;
  }

  const frames: StatsFrame[] = context.statsSamples;
  const reasons: PreCallDiagnosticReason[] = [];

  // No stats available — safe report with media_no_stats reason
  if (!Array.isArray(frames) || frames.length === 0) {
    return {
      audioFlowing: false,
      outboundAudioFlowing: false,
      inboundAudioFlowing: false,
      sampleCount: 0,
      reasons: [
        {
          code: 'media_no_stats',
          message: 'No stats samples available for media flow analysis',
          source: 'media',
        },
      ],
    };
  }

  // Check whether any audio RTP entries exist across all frames
  let hasOutboundAudio = false;
  let hasInboundAudio = false;
  for (const frame of frames) {
    if (getOutboundEntries(frame).length > 0) hasOutboundAudio = true;
    if (getInboundEntries(frame).length > 0) hasInboundAudio = true;
  }

  // No audio RTP entries at all — media_no_audio_rtp reason
  if (!hasOutboundAudio && !hasInboundAudio) {
    return {
      audioFlowing: false,
      outboundAudioFlowing: false,
      inboundAudioFlowing: false,
      sampleCount: frames.length,
      reasons: [
        {
          code: 'media_no_audio_rtp',
          message: 'Stats samples available but no audio RTP entries found',
          source: 'media',
        },
      ],
    };
  }

  // With a single sample, we cannot prove flowing (no delta) —
  // report presence but flowing: false with appropriate reason
  if (frames.length === 1) {
    const firstOut = readOutboundCounters(frames[0]);
    const firstIn = readInboundCounters(frames[0]);

    const outboundFlowing = false;
    const inboundFlowing = false;

    if (!hasOutboundAudio) {
      reasons.push({
        code: 'media_no_outbound_audio',
        message: 'No outbound audio RTP entries found in stats samples',
        source: 'media',
      });
    } else if (!outboundFlowing) {
      reasons.push({
        code: 'media_outbound_not_flowing',
        message: 'Outbound audio RTP present but not confirmed flowing (insufficient samples for delta)',
        source: 'media',
      });
    }

    if (!hasInboundAudio) {
      reasons.push({
        code: 'media_no_inbound_audio',
        message: 'No inbound audio RTP entries found in stats samples',
        source: 'media',
      });
    } else if (!inboundFlowing) {
      reasons.push({
        code: 'media_inbound_not_flowing',
        message: 'Inbound audio RTP present but not confirmed flowing (insufficient samples for delta)',
        source: 'media',
      });
    }

    return {
      audioFlowing: outboundFlowing && inboundFlowing,
      outboundAudioFlowing: outboundFlowing,
      inboundAudioFlowing: inboundFlowing,
      rtp: {
        outbound: {
          flowing: outboundFlowing,
          packets: firstOut.packets,
          bytes: firstOut.bytes,
        },
        inbound: {
          flowing: inboundFlowing,
          packets: firstIn.packets,
          bytes: firstIn.bytes,
        },
      },
      sampleCount: frames.length,
      reasons: reasons.length > 0 ? reasons : undefined,
    };
  }

  // Two or more samples — compare first and last for deltas
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];

  const firstOut = readOutboundCounters(firstFrame);
  const lastOut = readOutboundCounters(lastFrame);
  const firstIn = readInboundCounters(firstFrame);
  const lastIn = readInboundCounters(lastFrame);

  // Determine flowing (counters increased)
  let outboundFlowing = false;
  if (hasOutboundAudio) {
    outboundFlowing = didIncrease(firstOut, lastOut);
  }

  let inboundFlowing = false;
  if (hasInboundAudio) {
    inboundFlowing = didIncrease(firstIn, lastIn);
  }

  // Build reasons
  if (!hasOutboundAudio) {
    reasons.push({
      code: 'media_no_outbound_audio',
      message: 'No outbound audio RTP entries found in stats samples',
      source: 'media',
    });
  } else if (!outboundFlowing) {
    reasons.push({
      code: 'media_outbound_not_flowing',
      message: 'Outbound audio RTP present but packet/byte counters did not increase',
      source: 'media',
    });
  }

  if (!hasInboundAudio) {
    reasons.push({
      code: 'media_no_inbound_audio',
      message: 'No inbound audio RTP entries found in stats samples',
      source: 'media',
    });
  } else if (!inboundFlowing) {
    reasons.push({
      code: 'media_inbound_not_flowing',
      message: 'Inbound audio RTP present but packet/byte counters did not increase',
      source: 'media',
    });
  }

  const audioFlowing = outboundFlowing && inboundFlowing;

  const outboundDirection: MediaAudioDirection = {
    flowing: outboundFlowing,
    ...(lastOut.packets !== undefined ? { packets: lastOut.packets } : {}),
    ...(lastOut.bytes !== undefined ? { bytes: lastOut.bytes } : {}),
    ...(computeDelta(firstOut.packets, lastOut.packets) !== undefined
      ? { packetsDelta: computeDelta(firstOut.packets, lastOut.packets) }
      : {}),
    ...(computeDelta(firstOut.bytes, lastOut.bytes) !== undefined
      ? { bytesDelta: computeDelta(firstOut.bytes, lastOut.bytes) }
      : {}),
  };

  const inboundDirection: MediaAudioDirection = {
    flowing: inboundFlowing,
    ...(lastIn.packets !== undefined ? { packets: lastIn.packets } : {}),
    ...(lastIn.bytes !== undefined ? { bytes: lastIn.bytes } : {}),
    ...(computeDelta(firstIn.packets, lastIn.packets) !== undefined
      ? { packetsDelta: computeDelta(firstIn.packets, lastIn.packets) }
      : {}),
    ...(computeDelta(firstIn.bytes, lastIn.bytes) !== undefined
      ? { bytesDelta: computeDelta(firstIn.bytes, lastIn.bytes) }
      : {}),
  };

  return {
    audioFlowing,
    outboundAudioFlowing: outboundFlowing,
    inboundAudioFlowing: inboundFlowing,
    rtp: {
      outbound: outboundDirection,
      inbound: inboundDirection,
    },
    sampleCount: frames.length,
    reasons: reasons.length > 0 ? reasons : undefined,
  };
}
