import type {
  PreCallIceReport,
  PreCallIceCandidateCounts,
  PreCallIceCandidateInfo,
  PreCallIceSelectedPairReport,
  PreCallIceServerComparison,
  PreCallIceServerComparisonEntry,
  PreCallIceServerResult,
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

  const report = parseIceReport(stats, peerConnection);

  // ICE server comparison: compare configured ICE servers against
  // gathered candidates. Available when rtcConfig.iceServers is set.
  const iceServers = context.options.rtcConfig?.iceServers;
  if (report.candidates.length > 0 && iceServers) {
    report.serverCandidateComparison = compareIceServers(
      iceServers,
      report.candidates
    );
  }

  return report;
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
  // Phase 1: Collect local candidates (counts, types, full info)
  const { candidates, candidateCounts, candidateTypes } =
    collectLocalCandidates(stats);

  // Phase 2: Collect candidate pairs, transport stats, and remote candidates
  const candidatePairs: CandidatePairStats[] = [];
  let transportStats: TransportStats | null = null;
  const remoteCandidates = new Map<string, PreCallIceCandidateInfo>();
  const localCandidates = new Map<string, PreCallIceCandidateInfo>();
  for (const c of candidates) {
    if (c.id) {
      localCandidates.set(c.id, c);
    }
  }

  stats.forEach((report) => {
    switch (report.type) {
      case 'remote-candidate': {
        const candidate = report as CandidateStats;
        const info = extractCandidateInfo(candidate);
        if (info.id) {
          remoteCandidates.set(info.id, info);
        }
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
    candidatePairs,
    transportStats,
    localCandidates,
    remoteCandidates
  );

  // Phase 4: Build flags
  const hasRelayCandidate = candidateCounts.relay > 0;
  // Only-host candidates: no server-derived candidates at all. Host candidates
  // can become prflx (peer reflexive) without server interaction, so we check
  // srflx and relay counts instead of host === total (VSDK-412 review).
  const onlyHostCandidates =
    candidateCounts.total > 0 &&
    candidateCounts.srflx === 0 &&
    candidateCounts.relay === 0;

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

  // isTurnRequired (VSDK-412 Gap 4): true when the selected pair's local or
  // remote candidate is a relay (TURN). Undefined when there is no selected
  // pair — the report cannot make a claim about TURN usage without one.
  let isTurnRequired: boolean | undefined;
  if (selectedPairResult) {
    const localType = selectedPairResult.local?.candidateType;
    const remoteType = selectedPairResult.remote?.candidateType;
    isTurnRequired = localType === 'relay' || remoteType === 'relay';
  }

  // Detect host network topology from gathered candidates:
  // - multiple network interfaces (distinct host candidate addresses)
  // - VPN active (browser-reported networkType)
  const { hasMultipleNetworkInterfaces, vpnDetected } =
    detectHostNetworkTopology(candidates);

  return {
    candidateGatheringCompleted,
    gatheringComplete: candidateGatheringCompleted,
    candidateCounts,
    candidateTypes,
    candidates,
    hasRelayCandidate,
    onlyHostCandidates,
    isTurnRequired,
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
  candidatePairs: CandidatePairStats[],
  transportStats: TransportStats | null,
  localCandidates: Map<string, PreCallIceCandidateInfo>,
  remoteCandidates: Map<string, PreCallIceCandidateInfo>
): PreCallIceSelectedPairReport | null {
  let selectedPair: CandidatePairStats | null = null;

  // Try transport.selectedCandidatePairId first
  if (transportStats?.selectedCandidatePairId) {
    const pairId = transportStats.selectedCandidatePairId;
    selectedPair = candidatePairs.find((p) => p.id === pairId) ?? null;
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

  // Resolve local candidate metadata from the pre-parsed map
  if (selectedPair.localCandidateId) {
    result.local = localCandidates.get(selectedPair.localCandidateId);
  }

  // Resolve remote candidate metadata from the pre-parsed map
  if (selectedPair.remoteCandidateId) {
    result.remote = remoteCandidates.get(selectedPair.remoteCandidateId);
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
 * Detect host network topology signals from the gathered candidates.
 *
 * - `hasMultipleNetworkInterfaces`: two or more distinct host-candidate
 *   addresses are observed.
 * - `vpnDetected`: browser-reported `networkType === 'vpn'` (Chromium).
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

  // Multiple network interfaces: count distinct host-candidate addresses.
  const hostAddresses = candidates
    .filter((c) => c.candidateType === 'host')
    .map((c) => c.address)
    .filter((a): a is string => typeof a === 'string' && a.length > 0);
  const distinctHostAddresses = new Set(hostAddresses);

  const hasMultipleNetworkInterfaces =
    distinctHostAddresses.size > 0
      ? distinctHostAddresses.size >= 2
      : undefined;

  const vpnDetected = candidates.some((c) => c.networkType === 'vpn');

  return { hasMultipleNetworkInterfaces, vpnDetected };
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
  candidateProtocol?: string
): boolean {
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
  candidates: PreCallIceCandidateInfo[]
): PreCallIceServerComparison | undefined {
  if (!iceServers || iceServers.length === 0) {
    return undefined;
  }

  const entries: PreCallIceServerComparisonEntry[] = [];
  let hasServerWithNoCandidates = false;

  for (const server of iceServers) {
    const urls = Array.isArray(server.urls)
      ? server.urls
      : server.urls
        ? [server.urls]
        : [];
    const serverCandidates = candidates.filter(
      (c) =>
        c.url !== undefined &&
        urls.some((serverUrl) => iceUrlMatches(c.url!, serverUrl, c.protocol))
    );

    const candidateTypes = [
      ...new Set(
        serverCandidates
          .map((c) => c.candidateType)
          .filter((t): t is string => t !== undefined)
      ),
    ].sort();
    const protocols = [
      ...new Set(
        serverCandidates
          .map((c) => c.protocol)
          .filter((p): p is string => p !== undefined)
      ),
    ].sort();

    const hasCandidates = serverCandidates.length > 0;
    if (!hasCandidates) {
      hasServerWithNoCandidates = true;
    }

    entries.push({
      urls: server.urls,
      hasCandidates,
      candidateTypes,
      protocols,
      candidateCount: serverCandidates.length,
    });
  }

  // Detect strict network: configured STUN/TURN UDP servers but only
  // TCP candidates gathered (UDP blocked by firewall).
  const configuredUdp = iceServers.some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some(
      (u) =>
        u.includes('stun:') ||
        (u.includes('turn:') && !u.includes('transport=tcp'))
    );
  });
  const onlyTcpCandidates =
    candidates.length > 0 && candidates.every((c) => c.protocol === 'tcp');
  const appearsStrictNetwork = configuredUdp && onlyTcpCandidates;

  return {
    servers: entries,
    hasServerWithNoCandidates,
    appearsStrictNetwork,
  };
}

// --- Per-server ICE testing ---

/**
 * Count candidates by type and collect their full info from an RTCStatsReport.
 *
 * Shared by `parseIceReport` (full call) and `parseSingleServerCandidates`
 * (per-server test) to avoid duplicating the count/extract logic.
 */
function collectLocalCandidates(stats: RTCStatsReport): {
  candidates: PreCallIceCandidateInfo[];
  candidateCounts: PreCallIceCandidateCounts;
  candidateTypes: string[];
} {
  const candidateCounts: PreCallIceCandidateCounts = {
    total: 0,
    host: 0,
    srflx: 0,
    prflx: 0,
    relay: 0,
    unknown: 0,
  };
  const candidateTypeSet = new Set<string>();
  const candidates: PreCallIceCandidateInfo[] = [];

  stats.forEach((report) => {
    if (report.type !== 'local-candidate') return;
    const candidate = report as CandidateStats;
    const info = extractCandidateInfo(candidate);
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
    candidates.push(info);
  });

  return {
    candidates,
    candidateCounts,
    candidateTypes: Array.from(candidateTypeSet).sort(),
  };
}

/**
 * Parse an RTCStatsReport into candidate info + counts for a single server.
 *
 * Parses all local candidates, then filters by the server's URLs so only
 * candidates produced by this specific ICE server are included. Host
 * candidates (no `url`) are excluded from per-server results.
 */
function parseSingleServerCandidates(
  stats: RTCStatsReport,
  peerConnection: RTCPeerConnection,
  serverUrls?: string[]
): {
  candidates: PreCallIceCandidateInfo[];
  candidateCounts: PreCallIceCandidateCounts;
  candidateTypes: string[];
  gatheringComplete: boolean;
} {
  const parsed = collectLocalCandidates(stats);

  // When testing a specific server, include only candidates whose `url`
  // matches that server. Host candidates (no `url`) come from the local
  // interface, not from the ICE server being tested, so they are excluded
  // from per-server results.
  if (serverUrls && serverUrls.length > 0) {
    const filtered = parsed.candidates.filter(
      (c) =>
        c.url !== undefined &&
        serverUrls.some((su) => iceUrlMatches(c.url!, su, c.protocol))
    );
    // Recompute counts for the filtered set.
    const candidateCounts: PreCallIceCandidateCounts = {
      total: filtered.length,
      host: 0,
      srflx: 0,
      prflx: 0,
      relay: 0,
      unknown: 0,
    };
    const candidateTypeSet = new Set<string>();
    for (const c of filtered) {
      const type = c.candidateType || 'unknown';
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
    }
    return {
      candidates: filtered,
      candidateCounts,
      candidateTypes: Array.from(candidateTypeSet).sort(),
      gatheringComplete: peerConnection.iceGatheringState === 'complete',
    };
  }

  return {
    ...parsed,
    gatheringComplete: peerConnection.iceGatheringState === 'complete',
  };
}

/**
 * Test a single ICE server by creating a throwaway RTCPeerConnection with
 * only that server, gathering candidates, and returning the results.
 *
 * This is the core of `runNetworkCheck()`'s per-server testing: it lets
 * the caller see exactly which candidates each ICE server produces, how
 * long gathering takes, and whether the server is working at all.
 *
 * For TURN servers (`turn:` / `turns:` URLs), `iceTransportPolicy` is set to
 * `'relay'` to force relay candidates — this proves the TURN server can
 * allocate a relay and produce usable candidates (VSDK-412 Review 18,
 * point 1: "when we test each TURN server we need to force relay
 * candidates"). STUN servers use the default `'all'` policy.
 *
 * Only candidates whose `url` matches the tested server are included in
 * the result (host candidates, which have no `url` and come from the local
 * interface, are excluded) — so each per-server entry contains ONLY that
 * server's candidates (VSDK-412 Review 18, point 1).
 *
 * @param server - The ICE server to test
 * @param durationMs - Maximum gathering wait time
 * @returns Per-server result with candidates, counts, timing
 */
export async function testSingleIceServer(
  server: RTCIceServer,
  durationMs: number
): Promise<PreCallIceServerResult> {
  let pc: RTCPeerConnection | undefined;
  const startTime = Date.now();

  // Normalize the server's URLs into a string array for candidate filtering.
  const serverUrls = Array.isArray(server.urls)
    ? server.urls
    : server.urls
      ? [server.urls]
      : [];

  // Detect TURN servers to force relay candidates. A TURN server proves it
  // can allocate a relay only when a relay candidate is actually gathered —
  // with the default 'all' policy, host/srflx candidates may be gathered
  // even if TURN allocation fails, masking a broken TURN server.
  const isTurnServer = serverUrls.some(
    (u) => u.startsWith('turn:') || u.startsWith('turns:')
  );
  const iceTransportPolicy: RTCIceTransportPolicy = isTurnServer
    ? 'relay'
    : 'all';

  try {
    pc = new RTCPeerConnection({
      iceServers: [server],
      iceTransportPolicy,
    });
    pc.createDataChannel('precall-diagnostic');

    // Track first server-derived candidate time.
    //
    // The first `icecandidate` event is normally a local host candidate
    // (gathered from the local interface, not from the tested ICE server).
    // Recording timing on it reports local gathering latency rather than
    // the tested endpoint's response time (VSDK-412 round-7 review:
    // "per-server timing starts on an unrelated host candidate").
    //
    // Apply the same exclusion the stats parser uses: only record timing
    // for server-derived candidate types (srflx, prflx, relay). Host
    // candidates are skipped. For TURN servers this is moot —
    // `iceTransportPolicy: 'relay'` already suppresses host candidates —
    // but for STUN servers (`iceTransportPolicy: 'all'`) the host
    // candidate arrives first and would otherwise pollute the timing.
    let firstCandidateTime: number | undefined;
    pc.addEventListener('icecandidate', (event) => {
      if (firstCandidateTime !== undefined || !event.candidate) {
        return;
      }
      const candidateStr = event.candidate.candidate || '';
      const typeMatch = candidateStr.match(/\btyp\s+(\S+)/);
      const candidateType = typeMatch ? typeMatch[1] : '';
      // Skip host candidates — they come from the local interface, not
      // from the ICE server being tested. srflx/prflx/relay are the
      // server-derived candidate types.
      if (candidateType && candidateType !== 'host') {
        firstCandidateTime = Date.now();
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for gathering to complete or timeout
    await waitForGathering(pc, durationMs);

    const gatheringMs = Date.now() - startTime;
    const firstCandidateMs =
      firstCandidateTime !== undefined
        ? firstCandidateTime - startTime
        : undefined;

    let stats: RTCStatsReport;
    try {
      stats = await pc.getStats();
    } catch {
      return {
        server,
        gatheredAny: false,
        candidates: [],
        candidateCounts: {
          total: 0,
          host: 0,
          srflx: 0,
          prflx: 0,
          relay: 0,
          unknown: 0,
        },
        candidateTypes: [],
        gatheringComplete: pc.iceGatheringState === 'complete',
        gatheringMs,
        firstCandidateMs,
        hasRelayCandidate: false,
        error: 'getStats() failed after gathering',
      };
    }

    const parsed = parseSingleServerCandidates(stats, pc, serverUrls);

    return {
      server,
      gatheredAny: parsed.candidates.length > 0,
      candidates: parsed.candidates,
      candidateCounts: parsed.candidateCounts,
      candidateTypes: parsed.candidateTypes,
      gatheringComplete: parsed.gatheringComplete,
      gatheringMs,
      firstCandidateMs,
      hasRelayCandidate: parsed.candidateCounts.relay > 0,
    };
  } catch (error) {
    return {
      server,
      gatheredAny: false,
      candidates: [],
      candidateCounts: {
        total: 0,
        host: 0,
        srflx: 0,
        prflx: 0,
        relay: 0,
        unknown: 0,
      },
      candidateTypes: [],
      gatheringComplete: false,
      hasRelayCandidate: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    try {
      pc?.close();
    } catch {
      // ignore close errors
    }
  }
}

/**
 * Wait for ICE gathering to complete or until maxWaitMs elapses.
 * Polls pc.iceGatheringState for 'complete'. Returns early when
 * gathering is complete.
 */
function waitForGathering(
  pc: RTCPeerConnection,
  maxWaitMs: number
): Promise<void> {
  if ((pc.iceGatheringState as string) === 'complete') return Promise.resolve();
  const deadline = Date.now() + maxWaitMs;
  const pollIntervalMs = 50;

  return new Promise<void>((resolve) => {
    const check = () => {
      if (
        (pc.iceGatheringState as string) === 'complete' ||
        Date.now() >= deadline
      ) {
        resolve();
        return;
      }
      setTimeout(check, pollIntervalMs);
    };
    check();
  });
}
