/**
 * ICE candidate gathering and connectivity report module.
 *
 * Implements T2/T3 (VSDK-299) — ICE candidate gathering diagnostics
 * and selected-pair/connectivity diagnostics combined.
 *
 * This module inspects the ICE candidates gathered during the diagnostic
 * call and the selected candidate pair state, producing a PreCallIceReport.
 *
 * Safety: missing/partial RTCStatsReport entries, missing peer connection,
 * and getStats() rejections are all handled without throwing. The module
 * returns undefined when no stats are available.
 */

import type {
  PreCallIceReport,
  PreCallIceCandidateCounts,
  PreCallIceCandidateInfo,
  PreCallIceSelectedPairReport,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

/**
 * Build the ICE report section from the diagnostic context.
 *
 * Returns undefined when:
 * - no call was established
 * - the call has no peer connection
 * - peerConnection.getStats() rejects or is unavailable
 */
export async function buildPreCallIceReport(
  context: PreCallDiagnosticContext
): Promise<PreCallIceReport | undefined> {
  const peerConnection = context.call?.peer?.instance;
  if (!peerConnection) {
    return undefined;
  }

  if (typeof peerConnection.getStats !== 'function') {
    return undefined;
  }

  let stats: RTCStatsReport;
  try {
    stats = await peerConnection.getStats();
  } catch {
    // getStats() may reject if the peer connection is closed or in a bad state.
    // Return undefined rather than failing the entire diagnostic.
    return undefined;
  }

  return parseIceReport(stats, peerConnection);
}

// --- Internal helpers ---

/**
 * Extended RTCStatsReport entry shape for local/remote candidate stats.
 * Only the fields we actually read; everything else is optional.
 */
interface CandidateStats extends RTCStats {
  candidateType?: string;
  protocol?: string;
  networkType?: string;
  relayProtocol?: string;
  url?: string;
}

/**
 * Extended RTCStatsReport entry shape for candidate-pair stats.
 */
interface CandidatePairStats extends RTCStats {
  state?: string;
  nominated?: boolean;
  writable?: boolean;
  currentRoundTripTime?: number;
  localCandidateId?: string;
  remoteCandidateId?: string;
  selected?: boolean;
}

/**
 * Extended RTCStatsReport entry shape for transport stats.
 */
interface TransportStats extends RTCStats {
  selectedCandidatePairId?: string;
}

/**
 * Parse an RTCStatsReport into a PreCallIceReport.
 *
 * Separated from the main function for testability.
 */
function parseIceReport(
  stats: RTCStatsReport,
  peerConnection: RTCPeerConnection
): PreCallIceReport {
  // Phase 1: Count local candidates by type
  const candidateCounts: PreCallIceCandidateCounts = {
    total: 0,
    host: 0,
    srflx: 0,
    prflx: 0,
    relay: 0,
    unknown: 0,
  };
  const candidateTypeSet = new Set<string>();

  // Phase 2: Collect candidate pairs and transport stats for selected-pair resolution
  const candidatePairs: CandidatePairStats[] = [];
  let transportStats: TransportStats | null = null;

  stats.forEach((report) => {
    switch (report.type) {
      case 'local-candidate': {
        const candidate = report as CandidateStats;
        const type = candidate.candidateType || 'unknown';
        candidateCounts.total++;
        switch (type) {
          case 'host':
            candidateCounts.host++;
            break;
          case 'srflx':
            candidateCounts.srflx++;
            break;
          case 'prflx':
            candidateCounts.prflx++;
            break;
          case 'relay':
            candidateCounts.relay++;
            break;
          default:
            candidateCounts.unknown++;
            break;
        }
        candidateTypeSet.add(type);
        break;
      }
      case 'candidate-pair': {
        const pair = report as CandidatePairStats;
        candidatePairs.push(pair);
        break;
      }
      case 'transport': {
        transportStats = report as unknown as TransportStats;
        break;
      }
    }
  });

  // Phase 3: Resolve the selected candidate pair
  const selectedPairResult = resolveSelectedPair(
    stats,
    candidatePairs,
    transportStats
  );

  // Phase 4: Build flags
  const hasRelayCandidate = candidateCounts.relay > 0;
  const onlyHostCandidates =
    candidateCounts.total > 0 && candidateCounts.host === candidateCounts.total;

  const iceGatheringState = peerConnection.iceGatheringState;
  const candidateGatheringCompleted = iceGatheringState === 'complete';

  // Determine selectedPairFailed
  let selectedPairFailed: boolean | undefined;
  if (selectedPairResult) {
    selectedPairFailed = selectedPairResult.state === 'failed';
  } else {
    // No selected pair — check ICE connection state
    const iceConnectionState = peerConnection.iceConnectionState;
    if (iceConnectionState === 'failed') {
      selectedPairFailed = true;
    }
  }

  return {
    candidateGatheringCompleted,
    gatheringComplete: candidateGatheringCompleted,
    candidateCounts,
    candidateTypes: Array.from(candidateTypeSet).sort(),
    hasRelayCandidate,
    onlyHostCandidates,
    hasSelectedPair: !!selectedPairResult,
    selectedPair: selectedPairResult ?? undefined,
    selectedPairFailed,
    iceGatheringState,
    iceConnectionState: peerConnection.iceConnectionState,
  };
}

/**
 * Resolve the selected candidate pair from RTCStatsReport data.
 *
 * Resolution order:
 * 1. transport.selectedCandidatePairId → stats.get(id)
 * 2. candidate-pair with selected === true
 * 3. nominated or succeeded candidate-pair as fallback
 */
function resolveSelectedPair(
  stats: RTCStatsReport,
  candidatePairs: CandidatePairStats[],
  transportStats: TransportStats | null
): PreCallIceSelectedPairReport | null {
  let selectedPair: CandidatePairStats | null = null;

  // Try transport.selectedCandidatePairId first
  if (transportStats?.selectedCandidatePairId) {
    const pairId = transportStats.selectedCandidatePairId;
    const lookup = (
      stats as unknown as { get?: (id: string) => RTCStats | undefined }
    ).get?.(pairId) as CandidatePairStats | undefined;

    if (lookup?.type === 'candidate-pair') {
      selectedPair = lookup;
    } else {
      // Fallback: find by ID in our collected pairs
      selectedPair =
        candidatePairs.find((p) => p.id === pairId) ?? null;
    }
  }

  // Try selected === true
  if (!selectedPair) {
    selectedPair =
      candidatePairs.find((p) => p.selected === true) ?? null;
  }

  // Try nominated or succeeded
  if (!selectedPair) {
    selectedPair =
      candidatePairs.find(
        (p) => p.nominated === true || p.state === 'succeeded'
      ) ?? null;
  }

  if (!selectedPair) {
    return null;
  }

  // Build the selected pair report with local/remote candidate metadata
  const result: PreCallIceSelectedPairReport = {
    id: selectedPair.id,
    state: selectedPair.state,
    nominated: selectedPair.nominated,
    writable: selectedPair.writable,
    currentRoundTripTime: selectedPair.currentRoundTripTime,
    localCandidateId: selectedPair.localCandidateId,
    remoteCandidateId: selectedPair.remoteCandidateId,
  };

  // Resolve local candidate metadata
  if (selectedPair.localCandidateId) {
    const localStats = (
      stats as unknown as { get?: (id: string) => RTCStats | undefined }
    ).get?.(selectedPair.localCandidateId) as CandidateStats | undefined;
    if (localStats?.type === 'local-candidate') {
      result.local = extractCandidateInfo(localStats);
    }
  }

  // Resolve remote candidate metadata
  if (selectedPair.remoteCandidateId) {
    const remoteStats = (
      stats as unknown as { get?: (id: string) => RTCStats | undefined }
    ).get?.(selectedPair.remoteCandidateId) as CandidateStats | undefined;
    if (remoteStats?.type === 'remote-candidate') {
      result.remote = extractCandidateInfo(remoteStats);
    }
  }

  return result;
}

/**
 * Extract candidate metadata from a local-candidate or remote-candidate stats entry.
 */
function extractCandidateInfo(
  stats: CandidateStats
): PreCallIceCandidateInfo {
  return {
    id: stats.id,
    candidateType: stats.candidateType as
      | 'host'
      | 'srflx'
      | 'prflx'
      | 'relay'
      | string
      | undefined,
    protocol: stats.protocol,
    networkType: stats.networkType,
    relayProtocol: stats.relayProtocol,
    url: stats.url,
  };
}
