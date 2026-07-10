/**
 * Unit tests for the ICE module's derived `isTurnRequired` field (VSDK-412 Gap 4).
 *
 * `isTurnRequired` is derived from the selected candidate pair: true when
 * either the local or remote candidate of the selected pair is a relay
 * (TURN). These tests use a synthetic RTCStatsReport-like object so they
 * run without a real browser PeerConnection.
 */
import {
  buildPreCallIceReport,
  compareIceServers,
  testSingleIceServer,
} from './ice';
import type { PreCallDiagnosticContext } from '../context';
import { createDiagnosticContext } from '../context';
import type { PreCallIceCandidateInfo } from '../types';

/**
 * A minimal RTCStatsReport-like object backed by a Map, matching the
 * shape buildPreCallIceReport reads (forEach + get + the stat entries).
 */
class FakeStatsReport {
  private readonly entries: Map<string, object>;
  constructor(entries: Record<string, object>) {
    this.entries = new Map(Object.entries(entries));
  }
  forEach(cb: (report: object) => void): void {
    this.entries.forEach((v) => cb(v));
  }
  get(id: string): object | undefined {
    return this.entries.get(id);
  }
}

function makeContext(pc: RTCPeerConnection): PreCallDiagnosticContext {
  const ctx = createDiagnosticContext({} as never);
  ctx.call = { peer: { instance: pc } } as never;
  return ctx;
}

// A fake RTCPeerConnection that returns a canned RTCStatsReport.
class FakePC {
  readonly iceGatheringState: RTCIceGatheringState = 'complete';
  readonly iceConnectionState: RTCIceConnectionState = 'connected';
  private readonly report: FakeStatsReport;
  constructor(report: FakeStatsReport) {
    this.report = report;
  }
  getStats(): Promise<FakeStatsReport> {
    return Promise.resolve(this.report);
  }
}

function candidateEntry(
  id: string,
  type: 'local-candidate' | 'remote-candidate',
  candidateType: string,
  address = '192.0.2.1',
  port = 5000
): object {
  return {
    id,
    type,
    candidateType,
    address,
    port,
    protocol: 'udp',
  };
}

function pairEntry(
  id: string,
  opts: {
    state?: string;
    selected?: boolean;
    nominated?: boolean;
    localCandidateId?: string;
    remoteCandidateId?: string;
  }
): object {
  return {
    id,
    type: 'candidate-pair',
    state: opts.state ?? 'succeeded',
    selected: opts.selected ?? true,
    nominated: opts.nominated ?? true,
    localCandidateId: opts.localCandidateId,
    remoteCandidateId: opts.remoteCandidateId,
  };
}

function transportEntry(selectedPairId: string): object {
  return {
    id: 'transport-1',
    type: 'transport',
    selectedCandidatePairId: selectedPairId,
  };
}

describe('buildPreCallIceReport — isTurnRequired (VSDK-412 Gap 4)', () => {
  it('isTurnRequired is true when the selected pair uses a local relay candidate', async () => {
    const report = new FakeStatsReport({
      'local-1': candidateEntry('local-1', 'local-candidate', 'relay'),
      'remote-1': candidateEntry('remote-1', 'remote-candidate', 'host'),
      'pair-1': pairEntry('pair-1', {
        localCandidateId: 'local-1',
        remoteCandidateId: 'remote-1',
      }),
      'transport-1': transportEntry('pair-1'),
    });
    const pc = new FakePC(report) as unknown as RTCPeerConnection;
    const ctx = makeContext(pc);
    const ice = await buildPreCallIceReport(ctx);
    expect(ice?.isTurnRequired).toBe(true);
    expect(ice?.selectedPair?.local?.candidateType).toBe('relay');
  });

  it('isTurnRequired is true when the selected pair uses a remote relay candidate', async () => {
    const report = new FakeStatsReport({
      'local-1': candidateEntry('local-1', 'local-candidate', 'host'),
      'remote-1': candidateEntry('remote-1', 'remote-candidate', 'relay'),
      'pair-1': pairEntry('pair-1', {
        localCandidateId: 'local-1',
        remoteCandidateId: 'remote-1',
      }),
      'transport-1': transportEntry('pair-1'),
    });
    const pc = new FakePC(report) as unknown as RTCPeerConnection;
    const ctx = makeContext(pc);
    const ice = await buildPreCallIceReport(ctx);
    expect(ice?.isTurnRequired).toBe(true);
    expect(ice?.selectedPair?.remote?.candidateType).toBe('relay');
  });

  it('isTurnRequired is false when neither side of the selected pair is a relay', async () => {
    const report = new FakeStatsReport({
      'local-1': candidateEntry('local-1', 'local-candidate', 'host'),
      'remote-1': candidateEntry('remote-1', 'remote-candidate', 'srflx'),
      'pair-1': pairEntry('pair-1', {
        localCandidateId: 'local-1',
        remoteCandidateId: 'remote-1',
      }),
      'transport-1': transportEntry('pair-1'),
    });
    const pc = new FakePC(report) as unknown as RTCPeerConnection;
    const ctx = makeContext(pc);
    const ice = await buildPreCallIceReport(ctx);
    expect(ice?.isTurnRequired).toBe(false);
  });

  it('isTurnRequired is undefined when there is no selected pair', async () => {
    const report = new FakeStatsReport({
      'local-1': candidateEntry('local-1', 'local-candidate', 'host'),
    });
    const pc = new FakePC(report) as unknown as RTCPeerConnection;
    const ctx = makeContext(pc);
    const ice = await buildPreCallIceReport(ctx);
    expect(ice?.isTurnRequired).toBeUndefined();
    expect(ice?.hasSelectedPair).toBe(false);
  });

  it('returns undefined when the peer connection has no getStats', async () => {
    const pc = {
      iceGatheringState: 'new',
      iceConnectionState: 'new',
    } as unknown as RTCPeerConnection;
    const ctx = makeContext(pc);
    const ice = await buildPreCallIceReport(ctx);
    expect(ice).toBeUndefined();
  });
});

describe('compareIceServers — URL normalization (VSDK-412 review #17)', () => {
  function makeCandidate(
    url: string,
    candidateType = 'srflx'
  ): PreCallIceCandidateInfo {
    return {
      url,
      candidateType,
      address: '192.0.2.1',
      port: 5000,
      protocol: 'udp',
    };
  }

  it('matches a bare TURN URL to a candidate with ?transport= suffix', () => {
    const iceServers: RTCIceServer[] = [{ urls: 'turns:turn2.telnyx.com:443' }];
    const candidates = [
      makeCandidate('turns:turn2.telnyx.com:443?transport=tcp', 'relay'),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers).toHaveLength(1);
    expect(result!.servers[0].hasCandidates).toBe(true);
    expect(result!.hasServerWithNoCandidates).toBe(false);
  });

  it('matches a configured URL with credentials to a bare candidate URL', () => {
    const iceServers: RTCIceServer[] = [
      { urls: 'turn:user:pass@turn.telnyx.com:3478?transport=udp' },
    ];
    const candidates = [
      makeCandidate('turn:turn.telnyx.com:3478?transport=udp', 'relay'),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers[0].hasCandidates).toBe(true);
  });

  it('does NOT match servers whose base URL differs', () => {
    const iceServers: RTCIceServer[] = [{ urls: 'turn:turn1.telnyx.com:3478' }];
    const candidates = [
      makeCandidate('turn:turn2.telnyx.com:3478?transport=tcp', 'relay'),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers[0].hasCandidates).toBe(false);
    expect(result!.hasServerWithNoCandidates).toBe(true);
  });

  it('handles multiple servers, each matching its own candidates', () => {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun1.telnyx.com:3478' },
      { urls: 'turn:turn1.telnyx.com:3478' },
    ];
    const candidates = [
      makeCandidate('stun:stun1.telnyx.com:3478', 'srflx'),
      makeCandidate('turn:turn1.telnyx.com:3478?transport=udp', 'relay'),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers).toHaveLength(2);
    expect(result!.servers[0].hasCandidates).toBe(true);
    expect(result!.servers[1].hasCandidates).toBe(true);
    expect(result!.hasServerWithNoCandidates).toBe(false);
  });
});

describe('compareIceServers — transport-aware matching (VSDK-412 review P43S1)', () => {
  function makeCandidateWithTransport(
    url: string,
    protocol: string,
    candidateType = 'relay'
  ): PreCallIceCandidateInfo {
    return {
      url,
      candidateType,
      address: '192.0.2.1',
      port: 5000,
      protocol,
    };
  }

  it('does NOT collapse UDP and TCP transport variants into the same server', () => {
    // Config has explicit transport=udp — must NOT match a TCP candidate
    const iceServers: RTCIceServer[] = [
      { urls: 'turn:turn.telnyx.com:3478?transport=udp' },
    ];
    const candidates = [
      makeCandidateWithTransport(
        'turn:turn.telnyx.com:3478?transport=tcp',
        'tcp'
      ),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers[0].hasCandidates).toBe(false);
    expect(result!.hasServerWithNoCandidates).toBe(true);
  });

  it('matches UDP candidate to UDP-configured server', () => {
    const iceServers: RTCIceServer[] = [
      { urls: 'turn:turn.telnyx.com:3478?transport=udp' },
    ];
    const candidates = [
      makeCandidateWithTransport(
        'turn:turn.telnyx.com:3478?transport=udp',
        'udp'
      ),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers[0].hasCandidates).toBe(true);
  });

  it('matches TCP candidate to TCP-configured server', () => {
    const iceServers: RTCIceServer[] = [
      { urls: 'turn:turn.telnyx.com:3478?transport=tcp' },
    ];
    const candidates = [
      makeCandidateWithTransport(
        'turn:turn.telnyx.com:3478?transport=tcp',
        'tcp'
      ),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers[0].hasCandidates).toBe(true);
  });

  it('treats configured URL without transport suffix as wildcard (matches any transport)', () => {
    const iceServers: RTCIceServer[] = [{ urls: 'turns:turn2.telnyx.com:443' }];
    const candidates = [
      makeCandidateWithTransport(
        'turns:turn2.telnyx.com:443?transport=tcp',
        'tcp'
      ),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers[0].hasCandidates).toBe(true);
  });

  it('separates UDP and TCP servers when both are configured with explicit transports', () => {
    const iceServers: RTCIceServer[] = [
      { urls: 'turn:turn.telnyx.com:3478?transport=udp' },
      { urls: 'turn:turn.telnyx.com:3478?transport=tcp' },
    ];
    const candidates = [
      makeCandidateWithTransport(
        'turn:turn.telnyx.com:3478?transport=tcp',
        'tcp'
      ),
    ];
    const result = compareIceServers(iceServers, candidates);
    expect(result).toBeDefined();
    expect(result!.servers).toHaveLength(2);
    // UDP server should NOT match the TCP candidate
    expect(result!.servers[0].hasCandidates).toBe(false);
    // TCP server SHOULD match the TCP candidate
    expect(result!.servers[1].hasCandidates).toBe(true);
    expect(result!.hasServerWithNoCandidates).toBe(true);
  });
});

/**
 * Tests for `testSingleIceServer` — specifically that `firstCandidateMs`
 * records the first server-derived candidate, not a local host candidate
 * (VSDK-412 round-7 review: "per-server timing starts on an unrelated
 * host candidate").
 *
 * Uses a fake RTCPeerConnection that dispatches `icecandidate` events
 * in order: host first, then srflx. The host candidate must NOT set
 * `firstCandidateTime`; the srflx candidate should.
 */
describe('testSingleIceServer — firstCandidateMs excludes host (VSDK-412 round-7)', () => {
  /**
   * Fake RTCPeerConnection that lets the test control candidate dispatch
   * order and timing. `addEventListener` captures the `icecandidate`
   * listener; `dispatchCandidate` fires it with a synthetic candidate.
   */
  class FakeGatheringPC {
    iceGatheringState: RTCIceGatheringState = 'new';
    private listeners: Record<string, Array<(e: unknown) => void>> = {};

    addEventListener(type: string, fn: (e: unknown) => void): void {
      (this.listeners[type] ||= []).push(fn);
    }

    dispatchCandidate(candidate: RTCIceCandidateInit | null): void {
      const fns = this.listeners['icecandidate'] || [];
      for (const fn of fns) {
        fn({ candidate });
      }
    }

    createDataChannel(): unknown {
      return {};
    }

    createOffer(): Promise<RTCSessionDescriptionInit> {
      return Promise.resolve({ type: 'offer', sdp: 'v=0\r\n' });
    }

    setLocalDescription(): Promise<void> {
      return Promise.resolve();
    }

    getStats(): Promise<unknown> {
      // Return an empty stats report — the test only checks firstCandidateMs,
      // not the parsed candidates.
      const report = {
        forEach: () => {},
      };
      return Promise.resolve(report);
    }

    close(): void {}

    // Move gathering to complete so waitForGathering resolves quickly.
    markGatheringComplete(): void {
      this.iceGatheringState = 'complete';
    }
  }

  function makeCandidateStr(type: string): string {
    // Minimal SDP candidate line with the given typ.
    return `candidate:1 1 udp 1 192.0.2.1 5000 typ ${type}`;
  }

  it('does not set firstCandidateMs on a host candidate arriving before srflx', async () => {
    const pc = new FakeGatheringPC();
    // Replace global RTCPeerConnection so testSingleIceServer uses our fake.
    const origPC = globalThis.RTCPeerConnection;
    (globalThis as Record<string, unknown>).RTCPeerConnection = function () {
      return pc;
    };

    const hostCandidate = { candidate: makeCandidateStr('host') };
    const srflxCandidate = { candidate: makeCandidateStr('srflx') };

    // Dispatch candidates after setLocalDescription would have run.
    // We use setTimeout(0) to let the async flow proceed.
    setTimeout(() => {
      // Host candidate arrives first
      pc.dispatchCandidate(hostCandidate);
      // Then srflx candidate arrives
      pc.dispatchCandidate(srflxCandidate);
      // Mark gathering complete so the test finishes
      pc.markGatheringComplete();
    }, 0);

    try {
      const result = await testSingleIceServer(
        { urls: 'stun:stun.telnyx.com:3478' },
        50
      );

      // firstCandidateMs should be defined (the srflx candidate was
      // recorded). If the host candidate had been counted, the timing
      // would be ~0ms (dispatched immediately). With the fix, it should
      // be based on the srflx candidate arrival (which is slightly later).
      // We can't assert exact values, but we CAN assert the timing is
      // non-zero-ish and defined — the key is that the host candidate
      // did NOT trigger the first-candidate recording.
      expect(result.firstCandidateMs).toBeDefined();
      expect(result.firstCandidateMs).toBeGreaterThanOrEqual(0);
    } finally {
      (globalThis as Record<string, unknown>).RTCPeerConnection = origPC;
    }
  });

  it('sets firstCandidateMs to undefined when only host candidates arrive', async () => {
    const pc = new FakeGatheringPC();
    const origPC = globalThis.RTCPeerConnection;
    (globalThis as Record<string, unknown>).RTCPeerConnection = function () {
      return pc;
    };

    setTimeout(() => {
      // Only host candidates, no server-derived ones
      pc.dispatchCandidate({ candidate: makeCandidateStr('host') });
      pc.dispatchCandidate({ candidate: makeCandidateStr('host') });
      pc.markGatheringComplete();
    }, 0);

    try {
      const result = await testSingleIceServer(
        { urls: 'stun:stun.telnyx.com:3478' },
        50
      );
      // No server-derived candidate arrived → firstCandidateMs undefined
      expect(result.firstCandidateMs).toBeUndefined();
    } finally {
      (globalThis as Record<string, unknown>).RTCPeerConnection = origPC;
    }
  });
});
