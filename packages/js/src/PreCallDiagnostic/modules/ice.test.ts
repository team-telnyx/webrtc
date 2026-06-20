/**
 * Tests for the ICE candidate gathering and connectivity report module (T2/T3 — VSDK-299).
 *
 * Covers:
 * - Candidate counting by type (host, srflx, prflx, relay, unknown)
 * - Gathering flags: hasRelayCandidate, onlyHostCandidates, candidateGatheringCompleted
 * - Selected candidate pair resolution via transport, selected, nominated/succeeded
 * - Local/remote candidate metadata extraction
 * - No selected pair
 * - Failed pair
 * - Missing stats (undefined return)
 * - getStats() rejection (undefined return)
 * - No peer connection (undefined return)
 * - NaN / undefined guards
 */

import { buildPreCallIceReport } from './ice';
import type {
  PreCallDiagnosticContext,
} from '../context';
import type {
  CallLike,
} from '../types';

// --- Mock helpers ---

/**
 * Create a Map-based RTCStatsReport from an array of stat entries.
 * Each entry must have `id` and `type` fields.
 */
function makeStatsReport(
  entries: Array<Record<string, unknown>>
): RTCStatsReport {
  const map = new Map<string, Record<string, unknown>>();
  for (const entry of entries) {
    if (entry.id && entry.type) {
      map.set(entry.id as string, entry);
    }
  }
  return {
    forEach: (callback: (report: RTCStats, id: string, collection: RTCStatsReport) => void) => {
      map.forEach((value, key) => {
        callback(value as unknown as RTCStats, key, map as unknown as RTCStatsReport);
      });
    },
    get: (id: string) => map.get(id) as unknown as RTCStats | undefined,
    keys: () => map.keys(),
    values: () => map.values(),
    entries: () => map.entries(),
    [Symbol.iterator]: () => map[Symbol.iterator](),
    size: map.size,
  } as RTCStatsReport;
}

/**
 * Create a mock RTCPeerConnection with configurable getStats and ICE states.
 */
function createMockPeerConnection(overrides: {
  getStatsResult?: RTCStatsReport | (() => Promise<RTCStatsReport>);
  getStatsReject?: Error;
  iceGatheringState?: RTCIceGatheringState;
  iceConnectionState?: RTCIceConnectionState;
}): RTCPeerConnection {
  const pc = {
    getStats: overrides.getStatsReject
      ? jest.fn().mockRejectedValue(overrides.getStatsReject)
      : jest.fn().mockResolvedValue(
          overrides.getStatsResult instanceof Function
            ? overrides.getStatsResult()
            : overrides.getStatsResult ?? makeStatsReport([])
        ),
    iceGatheringState: overrides.iceGatheringState ?? 'complete',
    iceConnectionState: overrides.iceConnectionState ?? 'connected',
  } as unknown as RTCPeerConnection;
  return pc;
}

/**
 * Create a mock CallLike with a peer connection.
 */
function createMockCall(
  peerConnection?: RTCPeerConnection
): CallLike {
  return {
    id: 'test-call-id',
    hangup: jest.fn(),
    peerConnection,
  };
}

/**
 * Create a minimal diagnostic context.
 */
function createContext(overrides: {
  call?: CallLike;
  [key: string]: unknown;
}): PreCallDiagnosticContext {
  return {
    options: {
      client: { newCall: jest.fn() },
      destinationNumber: '1234',
    },
    statsSamples: [],
    timings: {
      startedAt: Date.now(),
    },
    ...overrides,
  } as PreCallDiagnosticContext;
}

// --- Test data ---

/** Stats with one host, one srflx, one relay candidate and a selected pair */
function makeMixedCandidateStats() {
  return makeStatsReport([
    // Local candidates
    {
      id: 'lc-host-1',
      type: 'local-candidate',
      candidateType: 'host',
      protocol: 'udp',
      networkType: 'wifi',
    },
    {
      id: 'lc-srflx-1',
      type: 'local-candidate',
      candidateType: 'srflx',
      protocol: 'udp',
    },
    {
      id: 'lc-relay-1',
      type: 'local-candidate',
      candidateType: 'relay',
      protocol: 'udp',
      relayProtocol: 'turn',
      url: 'turn:turn.example.com:3478?transport=udp',
    },
    // Remote candidates
    {
      id: 'rc-host-1',
      type: 'remote-candidate',
      candidateType: 'host',
      protocol: 'udp',
    },
    // Candidate pair (selected)
    {
      id: 'cp-1',
      type: 'candidate-pair',
      state: 'succeeded',
      nominated: true,
      writable: true,
      currentRoundTripTime: 0.025,
      localCandidateId: 'lc-relay-1',
      remoteCandidateId: 'rc-host-1',
    },
    // Transport
    {
      id: 'tp-1',
      type: 'transport',
      selectedCandidatePairId: 'cp-1',
    },
  ]);
}

/** Stats with only host candidates */
function makeHostOnlyStats() {
  return makeStatsReport([
    {
      id: 'lc-host-1',
      type: 'local-candidate',
      candidateType: 'host',
      protocol: 'udp',
    },
    {
      id: 'lc-host-2',
      type: 'local-candidate',
      candidateType: 'host',
      protocol: 'udp',
    },
  ]);
}

/** Stats with a failed candidate pair */
function makeFailedPairStats() {
  return makeStatsReport([
    {
      id: 'lc-host-1',
      type: 'local-candidate',
      candidateType: 'host',
      protocol: 'udp',
    },
    {
      id: 'cp-1',
      type: 'candidate-pair',
      state: 'failed',
      nominated: false,
      writable: false,
      localCandidateId: 'lc-host-1',
    },
    {
      id: 'tp-1',
      type: 'transport',
      selectedCandidatePairId: 'cp-1',
    },
  ]);
}

/** Stats with candidates but no selected pair */
function makeNoSelectedPairStats() {
  return makeStatsReport([
    {
      id: 'lc-host-1',
      type: 'local-candidate',
      candidateType: 'host',
      protocol: 'udp',
    },
    // No candidate-pair or transport entries
  ]);
}

/** Stats with a candidate pair found via selected=true instead of transport */
function makeSelectedViaFlagStats() {
  return makeStatsReport([
    {
      id: 'lc-host-1',
      type: 'local-candidate',
      candidateType: 'host',
      protocol: 'udp',
    },
    {
      id: 'rc-host-1',
      type: 'remote-candidate',
      candidateType: 'host',
      protocol: 'udp',
    },
    {
      id: 'cp-1',
      type: 'candidate-pair',
      state: 'succeeded',
      nominated: true,
      writable: true,
      selected: true,
      currentRoundTripTime: 0.012,
      localCandidateId: 'lc-host-1',
      remoteCandidateId: 'rc-host-1',
    },
    // No transport entry — pair found via selected=true
  ]);
}

/** Stats with an unrecognized candidateType */
function makeUnknownCandidateTypeStats() {
  return makeStatsReport([
    {
      id: 'lc-host-1',
      type: 'local-candidate',
      candidateType: 'host',
      protocol: 'udp',
    },
    {
      id: 'lc-weird-1',
      type: 'local-candidate',
      candidateType: 'custom-type',
      protocol: 'tcp',
    },
  ]);
}

// --- Tests ---

describe('buildPreCallIceReport', () => {
  describe('candidate counting', () => {
    it('counts host, srflx, and relay candidates correctly', async () => {
      const stats = makeMixedCandidateStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeDefined();
      expect(report!.candidateCounts).toEqual({
        total: 3,
        host: 1,
        srflx: 1,
        prflx: 0,
        relay: 1,
        unknown: 0,
      });
    });

    it('counts only host candidates correctly', async () => {
      const stats = makeHostOnlyStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeDefined();
      expect(report!.candidateCounts).toEqual({
        total: 2,
        host: 2,
        srflx: 0,
        prflx: 0,
        relay: 0,
        unknown: 0,
      });
    });

    it('counts unknown candidate types', async () => {
      const stats = makeUnknownCandidateTypeStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeDefined();
      expect(report!.candidateCounts).toEqual({
        total: 2,
        host: 1,
        srflx: 0,
        prflx: 0,
        relay: 0,
        unknown: 1,
      });
    });

    it('handles empty stats with zero counts', async () => {
      const stats = makeStatsReport([]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeDefined();
      expect(report!.candidateCounts).toEqual({
        total: 0,
        host: 0,
        srflx: 0,
        prflx: 0,
        relay: 0,
        unknown: 0,
      });
    });
  });

  describe('gathering flags', () => {
    it('sets hasRelayCandidate=true when relay candidates exist', async () => {
      const stats = makeMixedCandidateStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.hasRelayCandidate).toBe(true);
    });

    it('sets hasRelayCandidate=false when no relay candidates', async () => {
      const stats = makeHostOnlyStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.hasRelayCandidate).toBe(false);
    });

    it('sets onlyHostCandidates=true when all candidates are host', async () => {
      const stats = makeHostOnlyStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.onlyHostCandidates).toBe(true);
    });

    it('sets onlyHostCandidates=false when mixed candidates exist', async () => {
      const stats = makeMixedCandidateStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.onlyHostCandidates).toBe(false);
    });

    it('sets onlyHostCandidates=false when no candidates exist', async () => {
      const stats = makeStatsReport([]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.onlyHostCandidates).toBe(false);
    });

    it('sets candidateGatheringCompleted=true when iceGatheringState is complete', async () => {
      const stats = makeStatsReport([]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
        iceGatheringState: 'complete',
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.candidateGatheringCompleted).toBe(true);
      expect(report!.gatheringComplete).toBe(true);
    });

    it('sets candidateGatheringCompleted=false when iceGatheringState is gathering', async () => {
      const stats = makeStatsReport([]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
        iceGatheringState: 'gathering',
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.candidateGatheringCompleted).toBe(false);
      expect(report!.gatheringComplete).toBe(false);
    });

    it('reports sorted unique candidateTypes', async () => {
      const stats = makeMixedCandidateStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.candidateTypes).toEqual(['host', 'relay', 'srflx']);
    });
  });

  describe('selected pair', () => {
    it('finds selected pair via transport.selectedCandidatePairId', async () => {
      const stats = makeMixedCandidateStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.hasSelectedPair).toBe(true);
      expect(report!.selectedPair).toBeDefined();
      expect(report!.selectedPair!.id).toBe('cp-1');
      expect(report!.selectedPair!.state).toBe('succeeded');
      expect(report!.selectedPair!.nominated).toBe(true);
      expect(report!.selectedPair!.writable).toBe(true);
      expect(report!.selectedPair!.currentRoundTripTime).toBe(0.025);
    });

    it('resolves local and remote candidate metadata', async () => {
      const stats = makeMixedCandidateStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.selectedPair!.local).toBeDefined();
      expect(report!.selectedPair!.local!.candidateType).toBe('relay');
      expect(report!.selectedPair!.local!.relayProtocol).toBe('turn');
      expect(report!.selectedPair!.local!.url).toBe(
        'turn:turn.example.com:3478?transport=udp'
      );

      expect(report!.selectedPair!.remote).toBeDefined();
      expect(report!.selectedPair!.remote!.candidateType).toBe('host');
    });

    it('finds selected pair via selected=true flag', async () => {
      const stats = makeSelectedViaFlagStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.hasSelectedPair).toBe(true);
      expect(report!.selectedPair!.id).toBe('cp-1');
    });

    it('handles no selected pair', async () => {
      const stats = makeNoSelectedPairStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.hasSelectedPair).toBe(false);
      expect(report!.selectedPair).toBeUndefined();
    });

    it('detects failed pair', async () => {
      const stats = makeFailedPairStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
        iceConnectionState: 'failed',
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.selectedPairFailed).toBe(true);
      expect(report!.selectedPair!.state).toBe('failed');
    });

    it('sets selectedPairFailed=true when ICE connection is failed with no selected pair', async () => {
      const stats = makeNoSelectedPairStats();
      const pc = createMockPeerConnection({
        getStatsResult: stats,
        iceConnectionState: 'failed',
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.hasSelectedPair).toBe(false);
      expect(report!.selectedPairFailed).toBe(true);
    });
  });

  describe('ICE connection/gathering state', () => {
    it('includes iceGatheringState from peer connection', async () => {
      const stats = makeStatsReport([]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
        iceGatheringState: 'complete',
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.iceGatheringState).toBe('complete');
    });

    it('includes iceConnectionState from peer connection', async () => {
      const stats = makeStatsReport([]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
        iceConnectionState: 'connected',
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.iceConnectionState).toBe('connected');
    });
  });

  describe('missing / unavailable stats', () => {
    it('returns undefined when no call is in context', async () => {
      const context = createContext({ call: undefined });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeUndefined();
    });

    it('returns undefined when call has no peer connection', async () => {
      const context = createContext({ call: createMockCall(undefined) });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeUndefined();
    });

    it('returns undefined when peerConnection.getStats is not a function', async () => {
      const pc = { iceGatheringState: 'new', iceConnectionState: 'new' } as unknown as RTCPeerConnection;
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeUndefined();
    });

    it('returns undefined when getStats rejects', async () => {
      const pc = createMockPeerConnection({
        getStatsReject: new Error('Peer connection closed'),
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeUndefined();
    });

    it('handles missing optional fields in candidate stats without NaN', async () => {
      const stats = makeStatsReport([
        {
          id: 'lc-1',
          type: 'local-candidate',
          // candidateType is missing — should count as 'unknown'
        },
      ]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
        iceGatheringState: 'new',
        iceConnectionState: 'new',
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report).toBeDefined();
      expect(report!.candidateCounts.unknown).toBe(1);
      // No NaN in currentRoundTripTime
      expect(report!.selectedPair?.currentRoundTripTime).not.toBeNaN();
    });

    it('handles missing local/remote candidate lookups for selected pair', async () => {
      // Candidate pair references IDs that don't exist in the stats
      const stats = makeStatsReport([
        {
          id: 'cp-1',
          type: 'candidate-pair',
          state: 'succeeded',
          nominated: true,
          localCandidateId: 'lc-nonexistent',
          remoteCandidateId: 'rc-nonexistent',
        },
        {
          id: 'tp-1',
          type: 'transport',
          selectedCandidatePairId: 'cp-1',
        },
      ]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      expect(report!.hasSelectedPair).toBe(true);
      expect(report!.selectedPair!.local).toBeUndefined();
      expect(report!.selectedPair!.remote).toBeUndefined();
    });
  });

  describe('remote candidates not counted in local totals', () => {
    it('does not count remote-candidate entries in candidateCounts', async () => {
      const stats = makeStatsReport([
        {
          id: 'lc-host-1',
          type: 'local-candidate',
          candidateType: 'host',
          protocol: 'udp',
        },
        {
          id: 'rc-host-1',
          type: 'remote-candidate',
          candidateType: 'host',
          protocol: 'udp',
        },
      ]);
      const pc = createMockPeerConnection({
        getStatsResult: stats,
      });
      const context = createContext({ call: createMockCall(pc) });

      const report = await buildPreCallIceReport(context);

      // Only the local candidate should be counted
      expect(report!.candidateCounts.total).toBe(1);
      expect(report!.candidateCounts.host).toBe(1);
    });
  });
});
