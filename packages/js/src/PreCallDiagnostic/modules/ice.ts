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
import type { PreCallDiagnosticContext } from '../context';

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
 *
 * Note: Chromium exposes the candidate address as `address`, while Firefox
 * exposes it as `ip`. Both are read and normalized into `address`.
 */
interface CandidateStats extends RTCStats {
  candidateType?: string;
  protocol?: string;
  networkType?: string;
  relayProtocol?: string;
  url?: string;
  /** Chromium: candidate address. */
  address?: string;
  /** Firefox: candidate address (mapped to `address`). */
  ip?: string;
  /** Candidate port. */
  port?: number;
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
  // Phase 1: Count local candidates by type and collect their full info
  const candidateCounts: PreCallIceCandidateCounts = {
    total: 0,
    host: 0,
    srflx: 0,
    prflx: 0,
    relay: 0,
    unknown: 0,
  };
  const candidateTypeSet = new Set<string>();
  // Full information for every gathered local candidate (review feedback:
  // report each candidate, not only aggregate counts).
  const candidates: PreCallIceCandidateInfo[] = [];

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
        candidates.push(extractCandidateInfo(candidate));
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

  // Detect host network topology from gathered candidates:
  // - multiple network interfaces (distinct host candidate addresses)
  // - VPN active (browser-reported networkType or heuristic)
  const { hasMultipleNetworkInterfaces, vpnDetected } =
    detectHostNetworkTopology(candidates);

  return {
    candidateGatheringCompleted,
    gatheringComplete: candidateGatheringCompleted,
    candidateCounts,
    candidateTypes: Array.from(candidateTypeSet).sort(),
    candidates,
    hasRelayCandidate,
    onlyHostCandidates,
    hasMultipleNetworkInterfaces,
    vpnDetected,
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
      selectedPair = candidatePairs.find((p) => p.id === pairId) ?? null;
    }
  }

  // Try selected === true
  if (!selectedPair) {
    selectedPair = candidatePairs.find((p) => p.selected === true) ?? null;
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
 *
 * Normalizes the browser-specific address field: Chromium exposes
 * `address`, Firefox exposes `ip`. Both are read and reported as `address`.
 */
function extractCandidateInfo(stats: CandidateStats): PreCallIceCandidateInfo {
  // Chromium reports `address`, Firefox reports `ip` for the same field.
  // Prefer `address` when present, fall back to `ip`, then to undefined.
  const address = stats.address ?? stats.ip;

  return {
    id: stats.id,
    address,
    port: typeof stats.port === 'number' ? stats.port : undefined,
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

// --- Host network topology detection ---

/**
 * RFC 1918 and related private/link-local address ranges used for
 * multi-interface and VPN heuristics. We only classify an address as
 * "private" if it parses as IPv4/IPv6 and matches one of these prefixes.
 */
const PRIVATE_IP_PREFIXES = [
  '10.', // RFC 1918
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.', // RFC 1918
  '169.254.', // link-local
  'fc',
  'fd', // IPv6 unique local addresses (fc00::/7)
  'fe80', // IPv6 link-local
];

/**
 * Best-effort check whether an IP address is in a private range.
 * Returns false for undefined/empty/non-IP strings so callers can treat
 * absence of address information safely.
 */
function isPrivateIp(address: string | undefined): boolean {
  if (!address) {
    return false;
  }
  const normalized = address.toLowerCase();
  return PRIVATE_IP_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Extract the /24 (IPv4) or first hextet (IPv6) subnet prefix of an address,
 * used to tell whether two host candidates live on the same subnet.
 * Returns undefined when the address is not a recognizable IP.
 */
function subnetPrefix(address: string | undefined): string | undefined {
  if (!address) {
    return undefined;
  }
  // IPv4: keep the first three octets.
  if (address.includes('.')) {
    const parts = address.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return address;
  }
  // IPv6: keep the first hextet (e.g. "fd00" from "fd00:...").
  if (address.includes(':')) {
    return address.split(':')[0];
  }
  return address;
}

/**
 * Detect host network topology signals from the gathered local candidates.
 *
 * - `hasMultipleNetworkInterfaces`: two or more distinct host-candidate
 *   addresses are observed. This is the browser-visible evidence that more
 *   than one local interface produced an ICE candidate (e.g. Wi-Fi + Ethernet,
 *   or a physical interface + a VPN tunnel adapter). Undefined when host
 *   candidate addresses are not exposed by the browser.
 *
 * - `vpnDetected`: a VPN appears to be active. Primary signal is the
 *   browser-reported `networkType === 'vpn'` (Chromium). As a heuristic
 *   fallback (Firefox does not report networkType), we flag VPN when host
 *   candidates span multiple distinct private subnets (e.g. a 192.168.x
 *   physical interface and a 10.x VPN tunnel adapter) — a single private
 *   subnet with srflx/relay candidates is ordinary NAT traversal, not a
 *   VPN. The heuristic is intentionally conservative to avoid false
 *   positives. Undefined when there is not enough information to decide.
 */
function detectHostNetworkTopology(candidates: PreCallIceCandidateInfo[]): {
  hasMultipleNetworkInterfaces: boolean | undefined;
  vpnDetected: boolean | undefined;
} {
  if (candidates.length === 0) {
    return {
      hasMultipleNetworkInterfaces: undefined,
      vpnDetected: undefined,
    };
  }

  const hostCandidates = candidates.filter((c) => c.candidateType === 'host');

  // Multiple network interfaces: count distinct host-candidate addresses.
  // Only compute when at least one host candidate exposes an address.
  const hostAddresses = hostCandidates
    .map((c) => c.address)
    .filter((a): a is string => typeof a === 'string' && a.length > 0);
  const distinctHostAddresses = new Set(hostAddresses);

  let hasMultipleNetworkInterfaces: boolean | undefined;
  if (distinctHostAddresses.size > 0) {
    hasMultipleNetworkInterfaces = distinctHostAddresses.size >= 2;
  } else {
    // Browser did not expose host addresses — cannot determine reliably.
    hasMultipleNetworkInterfaces = undefined;
  }

  // VPN detection.
  let vpnDetected: boolean | undefined;

  // Primary signal: browser-reported networkType === 'vpn' (Chromium).
  const browserReportsVpn = candidates.some((c) => c.networkType === 'vpn');
  if (browserReportsVpn) {
    vpnDetected = true;
  } else {
    // Heuristic fallback (e.g. Firefox does not report networkType).
    // VPN tunnel adapters typically present as an additional private subnet
    // alongside the physical interface's private subnet. A single private
    // subnet with srflx/relay candidates is ordinary NAT traversal, not VPN.
    const hasPrivateHostCandidate = hostCandidates.some((c) =>
      isPrivateIp(c.address)
    );
    if (hasPrivateHostCandidate && hostAddresses.length > 0) {
      const privateSubnets = new Set(
        hostCandidates
          .filter((c) => isPrivateIp(c.address))
          .map((c) => subnetPrefix(c.address))
          .filter((p): p is string => typeof p === 'string')
      );
      vpnDetected = privateSubnets.size >= 2;
    } else {
      // No private host candidate info to apply the heuristic — leave
      // vpnDetected undefined rather than guessing.
      vpnDetected = undefined;
    }
  }

  return { hasMultipleNetworkInterfaces, vpnDetected };
}
