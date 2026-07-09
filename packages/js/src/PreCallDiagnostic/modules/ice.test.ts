/**
 * Unit tests for the ICE module's derived `isTurnRequired` field (VSDK-412 Gap 4).
 *
 * `isTurnRequired` is derived from the selected candidate pair: true when
 * either the local or remote candidate of the selected pair is a relay
 * (TURN). These tests use a synthetic RTCStatsReport-like object so they
 * run without a real browser PeerConnection.
 */
import { buildPreCallIceReport } from './ice';
import type { PreCallDiagnosticContext } from '../context';
import { createDiagnosticContext } from '../context';

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
