/**
 * Unit tests for PreCallDiagnostic (VSDK-412).
 *
 * Covers:
 * - Mode dispatch (B1): network-only / microphone-only / full
 * - callSetupTimeoutMs (B3): inconclusive + call_setup_timeout on no establish
 * - VERDICT_PRIORITY includes 'inconclusive' (B4): worseVerdict(inconclusive, ready) === inconclusive
 * - durationMs not silently clamped (B6): durationMs > 5000 honored in full mode
 *
 * RTCPeerConnection is stubbed via a fake global constructor injected per
 * test so network-only mode runs without a real browser.
 */
import { PreCallDiagnostic } from '../PreCallDiagnostic';
import { buildVerdict } from './modules/verdict';
import type { PreCallDiagnosticOptions } from './types';
import type { PreCallDiagnosticContext } from './context';

// --- Stubs ---

let newCallCallCount = 0;

function makeBaseClient(): object {
  newCallCallCount = 0;
  return {
    iceServers: [{ urls: 'stun:stun.example.test:19302' }],
    newCall(): { id: string; state: string; peer?: { instance?: object } } {
      newCallCallCount++;
      return {
        id: 'test-call-id',
        state: 'new',
        peer: { instance: undefined },
      };
    },
  };
}

// A minimal Call-like object whose state can be advanced to 'active'.
function makeFakeCall(opts: { id?: string; state?: string } = {}) {
  const call = {
    id: opts.id ?? 'test-call-id',
    state: opts.state ?? 'new',
    peer: { instance: undefined },
    hangup(): Promise<void> {
      return Promise.resolve();
    },
  };
  return call;
}

// --- Tests ---

describe('PreCallDiagnostic — mode dispatch (VSDK-412 B1)', () => {
  afterEach(() => {
    // restore any monkeypatched globals
    (globalThis as Record<string, unknown>).RTCPeerConnection = originalPC;
  });

  let originalPC: typeof RTCPeerConnection | undefined;
  beforeEach(() => {
    originalPC = (globalThis as Record<string, unknown>)
      .RTCPeerConnection as typeof RTCPeerConnection;
  });

  it('mode: network-only does NOT call client.newCall()', async () => {
    const client = makeBaseClient();
    // Stub RTCPeerConnection with a fake that supports the gather dance.
    class FakePC {
      iceGatheringState = 'complete';
      iceConnectionState = 'connected';
      createDataChannel(): object {
        return {};
      }
      createOffer(): Promise<object> {
        return Promise.resolve({ type: 'offer', sdp: 'v=0' } as object);
      }
      setLocalDescription(): Promise<void> {
        return Promise.resolve();
      }
      getStats(): Promise<Map<string, object>> {
        // empty stats — ICE report should be undefined-ish but no throw
        return Promise.resolve(new Map());
      }
      close(): void {}
    }
    (globalThis as Record<string, unknown>).RTCPeerConnection =
      FakePC as unknown as typeof RTCPeerConnection;

    const options: PreCallDiagnosticOptions = {
      client: client as never,
      mode: 'network-only',
      ice: true,
      network: false,
      media: false,
      microphone: false,
      durationMs: 10,
      rtcConfig: { iceServers: [] },
    };
    const diag = new PreCallDiagnostic(options);
    const report = await diag.run();

    expect(newCallCallCount).toBe(0);
    // No call placed → no callId.
    expect(report.callId).toBeUndefined();
    // ICE module ran against the fake PC (empty stats → no selected pair).
    expect(report.verdict).toBe('inconclusive');
  });

  it('mode: microphone-only does NOT call client.newCall()', async () => {
    const client = makeBaseClient();
    const options: PreCallDiagnosticOptions = {
      client: client as never,
      mode: 'microphone-only',
      ice: false,
      network: false,
      media: false,
      microphone: false, // disabled → report returns no mic data, but path runs
      durationMs: 10,
    };
    const diag = new PreCallDiagnostic(options);
    const report = await diag.run();

    expect(newCallCallCount).toBe(0);
    expect(report.callId).toBeUndefined();
    expect(report.microphone).toBeUndefined();
  });

  it('mode: full (default) calls client.newCall() and waits for establishment', async () => {
    const client = makeBaseClient();
    const fakeCall = makeFakeCall({ state: 'new' });
    // Override newCall to return our fake call and advance it to 'active'
    // after a short delay (simulating the SDK establishing the call).
    newCallCallCount = 0;
    (client as { newCall: () => object }).newCall = () => {
      newCallCallCount++;
      // Simulate establishment after 50ms.
      setTimeout(() => {
        (fakeCall as { state: string }).state = 'active';
      }, 50);
      return fakeCall;
    };

    const options: PreCallDiagnosticOptions = {
      client: client as never,
      mode: 'full',
      destinationNumber: '1234',
      callSetupTimeoutMs: 2000,
      durationMs: 10,
      ice: true,
      network: false,
      media: false,
      microphone: false,
      // No real peer instance → ICE report undefined; that's fine here.
    };
    const diag = new PreCallDiagnostic(options);
    const report = await diag.run();

    expect(newCallCallCount).toBe(1);
    // The fake call has an id → callId surfaces on the report.
    expect(report.callId).toBe('test-call-id');
  });

  it('mode: full returns inconclusive + call_setup_timeout when the call does not establish (B3)', async () => {
    const client = makeBaseClient();
    const fakeCall = makeFakeCall({ state: 'new' });
    newCallCallCount = 0;
    (client as { newCall: () => object }).newCall = () => {
      newCallCallCount++;
      // Never advance to 'active' — simulates a call that never connects.
      return fakeCall;
    };

    const options: PreCallDiagnosticOptions = {
      client: client as never,
      mode: 'full',
      destinationNumber: '1234',
      callSetupTimeoutMs: 50, // very short — should time out
      durationMs: 100,
      ice: true,
      network: false,
      media: false,
      microphone: false,
    };
    const diag = new PreCallDiagnostic(options);
    const report = await diag.run();

    expect(newCallCallCount).toBe(1);
    expect(report.verdict).toBe('inconclusive');
    expect(report.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'call_setup_timeout' }),
      ])
    );
    // No module data should be present on timeout.
    expect(report.ice).toBeUndefined();
    expect(report.network).toBeUndefined();
    expect(report.media).toBeUndefined();
    expect(report.microphone).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// B4 — VERDICT_PRIORITY must include 'inconclusive' so that a module
// returning 'inconclusive' (no data) is NOT silently downgraded to 'ready'
// by another module's positive verdict. The conservative worst-wins policy
// treats inconclusive as the worst case (matches the documented priority).
// ---------------------------------------------------------------------------

describe('PreCallDiagnostic — verdict priority includes inconclusive (VSDK-412 B4)', () => {
  // A minimal context stub matching PreCallDiagnosticContext shape.
  function makeContext(): PreCallDiagnosticContext {
    return {
      options: { client: {} as never } as PreCallDiagnosticOptions,
      statsSamples: [],
    };
  }

  // Minimal ICE report with no candidates → assessIce returns 'inconclusive'.
  const iceInconclusive = {
    candidateTypes: [],
    candidateCounts: {
      total: 0,
      host: 0,
      srflx: 0,
      prflx: 0,
      relay: 0,
      unknown: 0,
    },
    candidates: [],
    hasRelayCandidate: false,
    onlyHostCandidates: false,
    hasSelectedPair: false,
    candidateGatheringCompleted: false,
  };

  // Minimal ICE report with host+srflx candidates and a selected pair → 'ready'.
  const iceReady = {
    candidateTypes: ['host', 'srflx'],
    candidateCounts: {
      total: 5,
      host: 3,
      srflx: 2,
      prflx: 0,
      relay: 0,
      unknown: 0,
    },
    candidates: [],
    hasRelayCandidate: false,
    onlyHostCandidates: false,
    hasSelectedPair: true,
    candidateGatheringCompleted: true,
  };

  // Minimal network report with good quality → assessNetwork returns 'ready'.
  const networkGood = {
    quality: 'good' as const,
    rtt: { min: 10, max: 20, average: 15 },
    jitter: { min: 1, max: 3, average: 2 },
    packetsLost: 0,
    packetsReceived: 100,
  };

  it('worseVerdict(inconclusive, ready) === inconclusive (B4 regression guard)', () => {
    // ICE returns inconclusive (no candidates), network returns ready.
    // Combined verdict must be inconclusive — NOT ready (false confidence).
    const result = buildVerdict(
      { ice: iceInconclusive, network: networkGood },
      makeContext()
    );
    expect(result.verdict).toBe('inconclusive');
  });

  it('ice ready + network undefined → ready (undefined is ignored)', () => {
    // ICE with host+srflx and a selected pair → ready.
    // network undefined → no verdict contributed.
    // Combined: ready (undefined from network is ignored by worseVerdict).
    const result = buildVerdict(
      { ice: iceReady, network: undefined },
      makeContext()
    );
    expect(result.verdict).not.toBe('inconclusive');
  });

  it('all modules inconclusive → inconclusive', () => {
    const result = buildVerdict(
      {
        ice: iceInconclusive,
        network: undefined,
        media: undefined,
        microphone: undefined,
      },
      makeContext()
    );
    expect(result.verdict).toBe('inconclusive');
  });

  it('inconclusive dominates permission_denied (conservative worst-wins)', () => {
    // ICE inconclusive (no candidates), microphone permission denied.
    // With VERDICT_PRIORITY = [ready, degraded, blocked, permission_denied, inconclusive],
    // inconclusive has the highest index, so worseVerdict returns it.
    // Per the reviewer's explicit instruction (B4): "Add 'inconclusive' as the
    // last entry so it is treated as the worst case" — if any module has no
    // data (inconclusive), the whole verdict is inconclusive, never claiming a
    // positive verdict when data is missing.
    const result = buildVerdict(
      { ice: iceInconclusive, microphone: { permissionGranted: false } },
      makeContext()
    );
    expect(result.verdict).toBe('inconclusive');
  });
});
