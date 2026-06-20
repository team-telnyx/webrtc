/**
 * RTP/media flow report module — T5 (VSDK-302).
 *
 * This module checks whether audio/media RTP is flowing in both
 * directions during the diagnostic call and produces a PreCallMediaReport
 * section with inbound/outbound RTP counters, audio stats, and reason
 * inputs for the verdict module.
 *
 * Design principles:
 * - Distinguishes "no stats available" from "stats present but no RTP"
 *   from "RTP observed" — three distinct states, not two.
 * - All values are defensively read from stats entries; missing or invalid
 *   values are omitted rather than set to 0 or NaN.
 * - Browser-specific assumptions are avoided; partial stats are supported.
 * - Does not duplicate the network module's quality classification — this
 *   module reports media *flow* (presence/absence of RTP), not quality.
 */

import type {
  PreCallMediaReport,
  PreCallMediaOptions,
  MediaAudioDirection,
  PreCallDiagnosticReason,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

// --- Internal stat-entry types ---

/**
 * Shape of a single outbound audio stats entry.
 * Uses `any` because the exact shape depends on the browser and SDK version
 * — we read only known fields defensively.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OutboundAudioEntry = any;

/**
 * Shape of a single inbound audio stats entry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InboundAudioEntry = any;

/**
 * Shape of a single stats sample frame from the diagnostic context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StatsFrame = any;

// --- Helpers ---

/**
 * Safely read a number from a stats entry, returning `undefined` if
 * the value is missing, not a number, NaN, or not finite.
 */
function safeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value)) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

/**
 * Resolve whether the media module is enabled based on options.
 * Matches the gating pattern used by PreCallDiagnostic.getMediaReport():
 * `options.media !== false` means enabled by default.
 */
function isMediaEnabled(options: PreCallDiagnosticContext['options']): boolean {
  return options.media !== false;
}

/**
 * Resolve PreCallMediaOptions from the `media` field.
 * If `media` is `true` or `undefined`, use defaults.
 * If `media` is an object, use it directly.
 */
function resolveMediaOptions(options: PreCallDiagnosticContext['options']): PreCallMediaOptions | undefined {
  const { media } = options;
  if (media === false) return undefined;
  if (media === true || media === undefined) return { enabled: true };
  return media;
}

/**
 * Extract outbound audio stats from the last stats frame.
 *
 * Looks for `audio.outbound[]` with `kind === 'audio'` or `mediaType === 'audio'`,
 * falling back to connection-level counters.
 *
 * Returns a MediaAudioDirection indicating whether outbound RTP was observed,
 * with packet/byte counters if available.
 */
function extractOutboundAudio(frames: StatsFrame[]): MediaAudioDirection | undefined {
  if (frames.length === 0) return undefined;

  // Use the last frame for cumulative counters
  const lastFrame = frames[frames.length - 1];

  let packetsSent: number | undefined;
  let bytesSent: number | undefined;

  // Try audio.outbound[] (standard SDK stats shape)
  const outbound: OutboundAudioEntry[] | undefined =
    lastFrame?.audio?.outbound;
  if (Array.isArray(outbound) && outbound.length > 0) {
    // Filter for audio entries if there are multiple
    const audioEntry = outbound.find(
      (e: OutboundAudioEntry) => e?.kind === 'audio' || e?.mediaType === 'audio'
    ) ?? outbound[0];
    packetsSent = safeNumber(audioEntry?.packetsSent);
    bytesSent = safeNumber(audioEntry?.bytesSent);
  }

  // Fallback: connection-level counters
  if (packetsSent === undefined) {
    packetsSent = safeNumber(lastFrame?.connection?.packetsSent);
  }
  if (bytesSent === undefined) {
    bytesSent = safeNumber(lastFrame?.connection?.bytesSent);
  }

  // Determine if outbound RTP was observed
  const rtpObserved = packetsSent !== undefined && packetsSent > 0;

  return {
    rtpObserved,
    rtp: packetsSent !== undefined || bytesSent !== undefined
      ? { packets: packetsSent, bytes: bytesSent }
      : undefined,
  };
}

/**
 * Extract inbound audio stats from the last stats frame.
 *
 * Looks for `audio.inbound[]` (or `remote.audio.inbound[]`), falling
 * back to connection-level counters. Includes packetsLost and jitter
 * when available.
 */
function extractInboundAudio(frames: StatsFrame[]): MediaAudioDirection | undefined {
  if (frames.length === 0) return undefined;

  const lastFrame = frames[frames.length - 1];

  let packetsReceived: number | undefined;
  let bytesReceived: number | undefined;
  let packetsLost: number | undefined;
  let jitterMs: number | undefined;

  // Try local audio.inbound[] first
  const inbound: InboundAudioEntry[] | undefined =
    lastFrame?.audio?.inbound;
  if (Array.isArray(inbound) && inbound.length > 0) {
    const audioEntry = inbound.find(
      (e: InboundAudioEntry) => e?.kind === 'audio' || e?.mediaType === 'audio'
    ) ?? inbound[0];
    packetsReceived = safeNumber(audioEntry?.packetsReceived);
    bytesReceived = safeNumber(audioEntry?.bytesReceived);
    packetsLost = safeNumber(audioEntry?.packetsLost);

    // Jitter is in seconds in standard WebRTC stats; convert to ms
    const jitterSec = safeNumber(audioEntry?.jitter);
    if (jitterSec !== undefined) {
      jitterMs = jitterSec * 1000;
    }
  }

  // Fallback: remote.audio.inbound[]
  const remoteInbound: InboundAudioEntry[] | undefined =
    lastFrame?.remote?.audio?.inbound;
  if (Array.isArray(remoteInbound) && remoteInbound.length > 0) {
    if (packetsReceived === undefined) {
      packetsReceived = safeNumber(remoteInbound[0]?.packetsReceived);
    }
    if (bytesReceived === undefined) {
      bytesReceived = safeNumber(remoteInbound[0]?.bytesReceived);
    }
    if (packetsLost === undefined) {
      packetsLost = safeNumber(remoteInbound[0]?.packetsLost);
    }
    if (jitterMs === undefined) {
      const jitterSec = safeNumber(remoteInbound[0]?.jitter);
      if (jitterSec !== undefined) {
        jitterMs = jitterSec * 1000;
      }
    }
  }

  // Fallback: connection-level counters
  if (packetsReceived === undefined) {
    packetsReceived = safeNumber(lastFrame?.connection?.packetsReceived);
  }
  if (bytesReceived === undefined) {
    bytesReceived = safeNumber(lastFrame?.connection?.bytesReceived);
  }

  // Determine if inbound RTP was observed
  const rtpObserved = packetsReceived !== undefined && packetsReceived > 0;

  return {
    rtpObserved,
    rtp: packetsReceived !== undefined || bytesReceived !== undefined
      ? { packets: packetsReceived, bytes: bytesReceived }
      : undefined,
    packetsLost,
    jitterMs,
  };
}

/**
 * Build reason entries for the verdict module based on detected media issues.
 */
function buildReasons(
  outboundAudio: MediaAudioDirection | undefined,
  inboundAudio: MediaAudioDirection | undefined,
  hasStats: boolean,
): PreCallDiagnosticReason[] {
  const reasons: PreCallDiagnosticReason[] = [];

  // No stats at all
  if (!hasStats) {
    reasons.push({
      code: 'media_no_stats',
      message: 'No WebRTC stats available to determine media flow',
      source: 'media',
    });
    return reasons;
  }

  // No outbound RTP observed
  if (outboundAudio && !outboundAudio.rtpObserved) {
    reasons.push({
      code: 'media_no_outbound_rtp',
      message: 'No outbound audio RTP observed — local audio may not be reaching the remote side',
      source: 'media',
    });
  }

  // No inbound RTP observed
  if (inboundAudio && !inboundAudio.rtpObserved) {
    reasons.push({
      code: 'media_no_inbound_rtp',
      message: 'No inbound audio RTP observed — remote audio may not be reaching the local side',
      source: 'media',
    });
  }

  return reasons;
}

// --- Public API ---

/**
 * Build the media report section from the diagnostic context.
 *
 * Reads stats samples from the context, extracts inbound/outbound RTP
 * counters, determines whether audio is flowing in each direction, and
 * provides reason inputs for the verdict module.
 *
 * Returns `undefined` if the media module is explicitly disabled.
 * Returns a report with `audioFlowing: undefined` and reason
 * `media_no_stats` if no stats samples are available.
 */
export function buildPreCallMediaReport(
  context: PreCallDiagnosticContext
): PreCallMediaReport | undefined {
  // If the media module is explicitly disabled, return undefined
  if (!isMediaEnabled(context.options)) {
    return undefined;
  }

  // Resolve options (for future use — e.g., threshold configuration)
  void resolveMediaOptions(context.options);

  // Read stats samples from context
  const frames: StatsFrame[] = context.statsSamples;
  const hasStats = Array.isArray(frames) && frames.length > 0;

  // Extract directional audio stats
  const outboundAudio = extractOutboundAudio(frames);
  const inboundAudio = extractInboundAudio(frames);

  // Determine overall audio flow
  let audioFlowing: boolean | undefined;
  if (hasStats) {
    const outboundObserved = outboundAudio?.rtpObserved ?? false;
    const inboundObserved = inboundAudio?.rtpObserved ?? false;
    audioFlowing = outboundObserved && inboundObserved;
  }
  // If no stats, audioFlowing remains undefined (not false — we can't confirm)

  // Build reason inputs
  const reasons = buildReasons(outboundAudio, inboundAudio, hasStats);

  return {
    audioFlowing,
    outboundAudio,
    inboundAudio,
    reasons: reasons.length > 0 ? reasons : undefined,
  };
}
