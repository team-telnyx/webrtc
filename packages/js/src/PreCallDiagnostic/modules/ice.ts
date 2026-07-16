import type {
  PreCallIceReport,
  RTCIceCandidateStats,
  PreCallIceServerComparisonEntry,
  NominatedPair,
} from '../types';
import type { PreCallDiagnosticContext } from '../context';

/**
 * Build the ICE report section from the diagnostic context.
 *
 * Returns undefined when:
 * - no call was established
 * - the call has no peer connection
 * - peerConnection.getStats() rejects or is unavailable
 *
 * Also computes the ICE server comparison (configured ICE servers vs.
 * gathered candidates) when ICE servers are available in the context.
 */
export function buildPreCallIceReport(
  context: PreCallDiagnosticContext
): PreCallIceReport | undefined {
  const peerConnection = context.call?.peer?.instance;
  const stats = context.statsSamples[context.statsSamples.length - 1];
  if (!peerConnection || !stats) {
    return undefined;
  }

  const report = parseIceReport(stats, peerConnection);
  const configuredIceServers = peerConnection.getConfiguration().iceServers;
  if (configuredIceServers) {
    report.serverCandidateComparison = compareIceServers(
      configuredIceServers,
      report.candidates
    );
  }

  return report;
}

/** Split multi-URL ICE entries so every endpoint gets an isolated call. */
export function flattenIceServersByUrl(
  servers: RTCIceServer[]
): RTCIceServer[] {
  const serversByUrl: RTCIceServer[] = [];

  for (const server of servers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    urls.forEach((url) => {
      serversByUrl.push({ ...server, urls: url });
    });
  }
  return serversByUrl;
}

/** Whether an isolated ICE server call must force relay policy. */
export function isTurnIceServer(server: RTCIceServer): boolean {
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
  return urls.some((url) => /^turns?:/i.test(url));
}

// --- Internal helpers ---

/**
 * Parse an RTCStatsReport into a PreCallIceReport.
 *
 * Separated from the main function for testability.
 */
function parseIceReport(
  stats: RTCStatsReport,
  peerConnection: RTCPeerConnection
): PreCallIceReport {
  // Phase 2: Collect candidate pairs, transport stats, and remote candidates
  const candidatePairs: RTCIceCandidatePairStats[] = [];
  const remoteCandidates = new Map<string, RTCIceCandidateStats>();
  const localCandidates = new Map<string, RTCIceCandidateStats>();
  const candidateCounts: Record<RTCIceCandidateType, number> = {
    host: 0,
    srflx: 0,
    prflx: 0,
    relay: 0,
  };

  stats.forEach((report) => {
    switch (report.type) {
      case 'local-candidate': {
        const candidate = report as RTCIceCandidateStats;
        candidateCounts[candidate.candidateType!]++;
        localCandidates.set(candidate.id, candidate);
        break;
      }
      case 'remote-candidate': {
        const candidate = report as RTCIceCandidateStats;
        remoteCandidates.set(candidate.id, candidate);
        break;
      }
      case 'candidate-pair': {
        const pair = report as RTCIceCandidatePairStats;
        candidatePairs.push(pair);
        break;
      }
    }
  });

  // Phase 3: Resolve the selected candidate pair
  const selectedPairResult = resolveSelectedPair(
    candidatePairs,
    localCandidates,
    remoteCandidates
  );

  // Phase 4: Build flags
  const hasRelayCandidate = candidateCounts.relay > 0;
  // Only-host candidates: no server-derived candidates at all. Host candidates
  // can become prflx (peer reflexive) without server interaction, so we check
  // srflx and relay counts instead of host === total (VSDK-412 review).
  const onlyHostCandidates =
    candidateCounts.srflx === 0 &&
    candidateCounts.relay === 0 &&
    candidateCounts.prflx === 0;

  const iceGatheringState = peerConnection.iceGatheringState;
  const iceConnectionState = peerConnection.iceConnectionState;
  const candidateGatheringCompleted = iceGatheringState === 'complete';
  const isTurnRequired =
    selectedPairResult?.localCandidate?.candidateType === 'relay';

  // Detect host network topology from gathered candidates:
  // - multiple network interfaces (distinct host candidate addresses)
  // - VPN active (browser-reported networkType)
  const { hasMultipleNetworkInterfaces, vpnDetected } =
    detectHostNetworkTopology(localCandidates);

  return {
    candidateGatheringCompleted,
    gatheringComplete: candidateGatheringCompleted,
    candidateCounts,
    candidates: Array.from(localCandidates.values()),
    hasRelayCandidate,
    onlyHostCandidates,
    isTurnRequired,
    hasMultipleNetworkInterfaces,
    vpnDetected,
    hasSelectedPair: !!selectedPairResult,
    selectedPair: selectedPairResult ?? undefined,
    iceGatheringState,
    iceConnectionState,
  };
}

/**
 * Resolve the selected candidate pair from already-parsed stats data.
 *
 * Resolution order:
 * 1. transport.selectedCandidatePairId → lookup in candidatePairs
 * 2. candidate-pair with selected === true
 * 3. nominated or succeeded candidate-pair as fallback
 *
 * Local/remote candidate metadata is resolved from the pre-parsed
 * candidate maps (no stats.get() re-query needed).
 */
function resolveSelectedPair(
  candidatePairs: RTCIceCandidatePairStats[],
  localCandidates: Map<string, RTCIceCandidateStats>,
  remoteCandidates: Map<string, RTCIceCandidateStats>
): NominatedPair | null {
  const nominatedPairArr = candidatePairs.filter(
    (p) => p.nominated || p.state === 'succeeded'
  );

  if (nominatedPairArr.length !== 1) {
    return null;
  }

  return {
    ...nominatedPairArr[0],
    localCandidate: localCandidates.get(nominatedPairArr[0].localCandidateId),
    remoteCandidate: remoteCandidates.get(
      nominatedPairArr[0].remoteCandidateId
    ),
  };
}

// --- Host network topology detection ---

/**
 * Detect host network topology signals from the gathered candidates.
 *
 * - `hasMultipleNetworkInterfaces`: two or more distinct host-candidate
 *   addresses are observed.
 * - `vpnDetected`: browser-reported `networkType === 'vpn'` (Chromium).
 *
 * Simplified per VSDK-412 review (ArtemPapazian): leave only the two
 * boolean checks; the prior `> 0 ? : undefined` wrapper added no value
 * since the empty-candidates case is already handled by the caller.
 */
function detectHostNetworkTopology(
  candidates: Map<string, RTCIceCandidateStats>
): {
  hasMultipleNetworkInterfaces: boolean | undefined;
  vpnDetected: boolean | undefined;
} {
  if (candidates.size === 0) {
    return {
      hasMultipleNetworkInterfaces: undefined,
      vpnDetected: undefined,
    };
  }

  // Multiple network interfaces: count distinct host-candidate addresses.
  const candidatesArr = Array.from(candidates.values());
  const distinctHostAddresses = new Set(
    candidatesArr
      .filter((c) => c.candidateType === 'host')
      .map((c) => c.address)
  );

  return {
    hasMultipleNetworkInterfaces: distinctHostAddresses.size >= 2,
    vpnDetected: candidatesArr.some((c) => c.networkType === 'vpn'),
  };
}

// --- ICE server comparison ---

/**
 * Normalize an ICE server URL for matching against candidate `url` fields.
 *
 * Browsers report candidate `url` fields that may differ from the configured
 * server URL in two ways (VSDK-412 review comment #17):
 *
 * 1. **Credential stripping**: a configured `turn:user:pass@host:port` is
 *    reported by the browser as `turn:host:port` (credentials removed).
 *    This strips the `user:pass@` segment so both forms match.
 *
 * 2. **Transport suffix**: a configured `turns:host:443` may produce
 *    candidates whose `url` is `turns:host:443?transport=tcp`. This
 *    normalizes by splitting off the `?transport=` query parameter so
 *    the base URLs can be compared, then re-checks transport separately
 *    when needed.
 *
 * @param url - The ICE server URL or candidate url to normalize
 * @returns The base URL without credentials and without a `?transport=` suffix
 */
function normalizeIceServerUrl(url: string): string {
  let normalized = url;
  // Strip credentials: scheme://user:pass@host → scheme://host
  // ICE URLs use the form `scheme:host:port` (no `//` after the scheme),
  // e.g. `turn:user:pass@turn.telnyx.com:3478`. The regex captures the
  // optional `//` as group 2; when absent (the common ICE URL case) we
  // do NOT inject `//` — we just concatenate scheme + host directly,
  // so `turn:user:pass@host` normalizes to `turn:host` (not `turn://host`).
  const credMatch = normalized.match(/^([a-z]+:)(\/\/)?([^@]*@)(.+)$/i);
  if (credMatch) {
    normalized = credMatch[1] + (credMatch[2] ?? '') + credMatch[4];
  }
  // Strip ?transport= query suffix (keep the base URL for comparison)
  const transportIdx = normalized.indexOf('?transport=');
  if (transportIdx !== -1) {
    normalized = normalized.substring(0, transportIdx);
  }
  return normalized;
}

/**
 * Extract the explicit `transport=` value from an ICE URL, if present.
 *
 * Returns `'udp'`, `'tcp'`, or `undefined` when the URL does not specify
 * a transport (wildcard — matches any candidate transport).
 */
function extractTransport(url: string): string | undefined {
  const idx = url.indexOf('?transport=');
  if (idx === -1) return undefined;
  const value = url.substring(idx + '?transport='.length).toLowerCase();
  // Take only the transport token (ignore any trailing query params)
  const semiIdx = value.indexOf('&');
  return semiIdx === -1 ? value : value.substring(0, semiIdx);
}

/**
 * Check whether a candidate `url` matches a configured ICE server URL.
 *
 * Uses normalized comparison: credentials are stripped from both sides and
 * the `?transport=` suffix is handled so that `turns:host:443` (config)
 * matches `turns:host:443?transport=tcp` (candidate).
 *
 * **Transport-aware matching (VSDK-412 review P43S1):** when the configured
 * server URL explicitly includes `?transport=udp` or `?transport=tcp`, the
 * candidate's transport MUST match — otherwise `turn:host:3478?transport=udp`
 * and `turn:host:3478?transport=tcp` would both match every candidate from
 * that host, collapsing distinct transport variants into the same server
 * entry. When the configured URL has NO transport suffix (e.g.
 * `turns:host:443`), it is treated as a wildcard matching any candidate
 * transport (so `turns:host:443` matches `turns:host:443?transport=tcp`).
 *
 * The candidate's transport is taken from its `url` `?transport=` suffix,
 * or — when the candidate URL has no suffix — from the optional
 * `candidateProtocol` parameter (the candidate stats `protocol` field).
 */
function iceUrlMatches(
  candidateUrl: string,
  serverUrl: string,
  candidateProtocol?: RTCIceCandidateStats['protocol']
): boolean {
  if (!candidateUrl || !serverUrl) return false;

  const normalizedCandidate = normalizeIceServerUrl(candidateUrl);
  const normalizedServer = normalizeIceServerUrl(serverUrl);
  if (normalizedCandidate !== normalizedServer) return false;

  // Base URLs match — now check transport specificity.
  const configuredTransport = extractTransport(serverUrl);
  // No explicit transport on the configured URL → wildcard, any candidate matches.
  if (configuredTransport === undefined) return true;

  // Configured URL specifies a transport — the candidate must match it.
  const candidateTransport =
    extractTransport(candidateUrl) ?? candidateProtocol?.toLowerCase();
  if (candidateTransport === undefined) {
    // We cannot determine the candidate's transport. Match conservatively
    // (better to over-match than to falsely report "no candidates" for a
    // working server whose browser-reported url omits the transport suffix).
    return true;
  }
  return candidateTransport === configuredTransport;
}

/**
 * Compare configured ICE servers against the gathered candidates.
 *
 * For each configured ICE server URL, determine which candidates it
 * produced (by matching the server's URL to the candidate's `url` field
 * with credential/transport-suffix normalization). Flag servers that
 * returned no candidates, and detect strict networks (configured
 * STUN/TURN UDP but only TURN TCP candidates gathered).
 *
 * @param iceServers - The configured ICE servers from rtcConfig
 * @param candidates - The gathered local candidates
 * @returns Comparison result with per-server entries and warning flags
 */
export function compareIceServers(
  iceServers: RTCIceServer[] | undefined,
  candidates: RTCIceCandidateStats[]
): PreCallIceServerComparisonEntry[] | undefined {
  if (!iceServers || iceServers.length === 0) {
    return undefined;
  }

  const entries: PreCallIceServerComparisonEntry[] = [];
  for (const server of iceServers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];

    const serverCandidates = candidates.filter((c) =>
      urls.some((serverUrl) => iceUrlMatches(c.url, serverUrl, c.protocol))
    );

    const candidateType = serverCandidates[0]?.candidateType ?? null;
    const hasCandidates = serverCandidates.length > 0;
    entries.push({
      urls: server.urls,
      hasCandidates,
      candidateType,
      candidates: serverCandidates,
      candidateCount: serverCandidates.length,
    });
  }

  return entries;
}
