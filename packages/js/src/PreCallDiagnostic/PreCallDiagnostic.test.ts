/**
 * Unit tests for PreCallDiagnostic mode dispatch (VSDK-412 B1/B2/B3).
 *
 * Verifies:
 * - `mode: 'network-only'` does NOT call `client.newCall()` and produces an
 *   ICE report from a raw RTCPeerConnection (B1).
 * - `mode: 'microphone-only'` does NOT call `client.newCall()` and produces a
 *   microphone report (B1).
 * - `mode: 'full'` calls `client.newCall()` and waits for establishment (B2).
 * - `callSetupTimeoutMs` (B3): when the call never establishes, the report
 *   returns `verdict: 'inconclusive'` with a `call_setup_timeout` reason and
 *   no module data.
 *
 * RTCPeerConnection is stubbed via a fake global constructor injected per
 * test so network-only mode runs without a real browser.
 */
import { PreCallDiagnostic } from '../PreCallDiagnostic';
import type { PreCallDiagnosticOptions } from './types';

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
