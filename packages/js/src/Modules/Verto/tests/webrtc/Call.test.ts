Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn().mockReturnValue({ duration: 0 }),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    now: jest.fn().mockReturnValue(Date.now()),
  },
});

import { isQueued, register, deRegister } from '../../services/Handler';
import {
  PeerType,
  State,
  Direction,
  VertoMethod,
} from '../../webrtc/constants';
import {
  ANSWER_WHILE_PEER_ACTIVE,
  DUPLICATE_INBOUND_ANSWER,
  ONLY_HOST_ICE_CANDIDATES,
  SwEvent,
} from '../../util/constants';
import { LOW_BYTES_RECEIVED } from '../../util/constants/errorCodes';
import logger from '../../util/logger';
import Call from '../../webrtc/Call';
import Peer from '../../webrtc/Peer';
import Verto from '../..';

function getBitrate(call: Call, trackKind: string) {
  if (!call || !call.peer) {
    return 0;
  }

  const { instance } = call.peer;
  const senders = instance.getSenders();
  if (!senders) {
    return 0;
  }

  const sender = senders.find(
    ({ track: { kind } }: RTCRtpSender) => kind === trackKind
  );

  if (sender) {
    const p = sender.getParameters();
    const parameters = p as RTCRtpSendParameters;
    if (!parameters.encodings) {
      return 0;
    }

    return parameters.encodings[0].maxBitrate;
  }
}

describe('Call', () => {
  let session: Verto;
  let call: Call;
  const defaultParams = {
    destinationNumber: 'x3599',
    remoteCallerName: 'Js Client Test',
    remoteCallerNumber: '1234',
    callerName: 'Jest Client',
    callerNumber: '5678',
  };
  const noop = (): void => {};

  beforeEach(async (done) => {
    session = new Verto({
      host: 'example.fs.telnyx',
      login: 'login',
      passwd: 'passwd',
    });
    await session.connect().catch(console.error);
    call = new Call(session, defaultParams);
    done();
  });

  describe('with required parameters', () => {
    it('should instantiate the default listeners', () => {
      expect(isQueued('telnyx.rtc.mediaError', call.id)).toEqual(true);
      expect(call.state).toEqual('new');
      expect(session.calls).toHaveProperty(call.id);
    });
  });

  describe('non-trickle host-only ICE diagnostics', () => {
    const sdpPrefix = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';

    const configurePeer = () => {
      const startNegotiation = jest.fn();
      const restartIce = jest.fn();
      call.peer = {
        iceDone: false,
        isIceRestarting: false,
        startNegotiation,
        restartIce,
        instance: { removeEventListener: jest.fn() },
      } as unknown as Peer;
      return { startNegotiation, restartIce };
    };

    afterEach(() => {
      deRegister(SwEvent.Warning, undefined, session.uuid);
      jest.restoreAllMocks();
    });

    it('warns for host-only SDP while Invite signaling continues without recovery or hangup', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);
      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockResolvedValue({ node_id: null });
      const hangupSpy = jest.spyOn(call, 'hangup').mockResolvedValue();
      const { startNegotiation, restartIce } = configurePeer();
      const hostOnlySdp =
        sdpPrefix +
        'a=candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host\r\n' +
        'a=candidate:2 1 TCP 2113667326 192.168.1.1 9 typ host tcptype active\r\n';

      (
        call as unknown as {
          _onIceSdp: (data: { type: PeerType; sdp: string }) => void;
        }
      )._onIceSdp({
        type: PeerType.Offer,
        sdp: hostOnlySdp,
      });
      await new Promise((resolve) => setImmediate(resolve));

      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({
            code: ONLY_HOST_ICE_CANDIDATES,
            name: 'ONLY_HOST_ICE_CANDIDATES',
          }),
          callId: call.id,
        })
      );
      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({ method: VertoMethod.Invite }),
        })
      );
      expect(startNegotiation).not.toHaveBeenCalled();
      expect(restartIce).not.toHaveBeenCalled();
      expect(hangupSpy).not.toHaveBeenCalled();
    });

    it.each(['srflx', 'prflx', 'relay'])(
      'does not warn when SDP contains a %s candidate',
      async (candidateType) => {
        const warningHandler = jest.fn();
        register(SwEvent.Warning, warningHandler, session.uuid);
        const executeSpy = jest
          .spyOn(session, 'execute')
          .mockResolvedValue({ node_id: null });
        configurePeer();

        (
          call as unknown as {
            _onIceSdp: (data: { type: PeerType; sdp: string }) => void;
          }
        )._onIceSdp({
          type: PeerType.Offer,
          sdp:
            sdpPrefix +
            'a=candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host\r\n' +
            `a=candidate:2 1 UDP 1694498815 198.51.100.1 54401 typ ${candidateType}\r\n`,
        });
        await new Promise((resolve) => setImmediate(resolve));

        expect(warningHandler).not.toHaveBeenCalled();
        expect(executeSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({ method: VertoMethod.Invite }),
          })
        );
      }
    );

    it('does not classify zero-candidate SDP as host-only and still signals it', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);
      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockResolvedValue({ node_id: null });
      const { startNegotiation } = configurePeer();

      (
        call as unknown as {
          _onIceSdp: (data: { type: PeerType; sdp: string }) => void;
        }
      )._onIceSdp({ type: PeerType.Offer, sdp: sdpPrefix });
      await new Promise((resolve) => setImmediate(resolve));

      expect(warningHandler).not.toHaveBeenCalled();
      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({ method: VertoMethod.Invite }),
        })
      );
      expect(startNegotiation).not.toHaveBeenCalled();
    });
  });

  describe('non-trickle ICE lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    it.each([
      ['hangup', State.Hangup],
      ['destroy', State.Destroy],
      ['purge', State.Purge],
    ])(
      'does not schedule an ICE completion timeout for a queued event in %s state',
      (_stateName, terminalState) => {
        call.setState(terminalState);
        call.peer = {
          instance: {
            localDescription: null,
          },
          incrementGatheredCandidates: jest.fn(),
        } as unknown as Peer;
        const privateCall = call as unknown as {
          _iceTimeout: ReturnType<typeof setTimeout> | null;
          _onIce: (event: RTCPeerConnectionIceEvent) => void;
        };
        const candidate = {
          candidate:
            'candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        } as RTCIceCandidate;

        privateCall._onIce({ candidate } as RTCPeerConnectionIceEvent);

        expect(privateCall._iceTimeout).toBeNull();
      }
    );

    it('clears an existing ICE completion timeout before ignoring terminal SDP', () => {
      const privateCall = call as unknown as {
        _iceTimeout: ReturnType<typeof setTimeout> | null;
        _onIceSdp: (data: RTCSessionDescriptionInit) => void;
      };
      const iceTimeout = setTimeout(noop, 1000);
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      privateCall._iceTimeout = iceTimeout;
      call.setState(State.Hangup);

      privateCall._onIceSdp({
        type: PeerType.Offer,
        sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-',
      });

      expect(clearTimeoutSpy).toHaveBeenCalledWith(iceTimeout);
      expect(privateCall._iceTimeout).toBeNull();
    });
  });

  describe('specifying an ID', () => {
    it('should use the ID as callId', () => {
      call = new Call(session, { ...defaultParams, id: 'test-id-example' });
      expect(call.id).toEqual('test-id-example');
      expect(session.calls).toHaveProperty('test-id-example');
    });
  });

  describe('specifying onNotification callback', () => {
    it('should set a listener for the notifications', () => {
      call = new Call(session, { ...defaultParams, onNotification: noop });
      expect(isQueued('telnyx.notification', call.id)).toEqual(true);
    });
  });

  describe('call recording default option', () => {
    it('does not construct CallRecorder by default (opt-in)', () => {
      expect(call['_callRecorder']).toBeNull();
    });

    it('does not construct CallRecorder when enableCallRecording is false', () => {
      session.options.enableCallRecording = false;

      call = new Call(session, defaultParams);

      expect(call['_callRecorder']).toBeNull();
    });

    it('constructs CallRecorder when enableCallRecording is true', () => {
      session.options.enableCallRecording = true;

      call = new Call(session, defaultParams);

      expect(call['_callRecorder']).toBeTruthy();
    });
  });

  describe('.setState()', () => {
    beforeEach(() => {
      call = new Call(session, { ...defaultParams, onNotification: noop });
      expect(call.prevState).toEqual(call.state);
    });

    it('set state to Requesting', () => {
      call.setState(State.Requesting);
      expect(call.state).toEqual('requesting');
    });

    it('set state to Trying', () => {
      call.setState(State.Trying);
      expect(call.state).toEqual('trying');
    });

    it('set state to Recovering', () => {
      call.setState(State.Recovering);
      expect(call.state).toEqual('recovering');
    });

    it('set state to Ringing', () => {
      call.setState(State.Ringing);
      expect(call.state).toEqual('ringing');
    });

    it('set state to Answering', () => {
      call.setState(State.Answering);
      expect(call.state).toEqual('answering');
    });

    it('set state to Early', () => {
      call.setState(State.Early);
      expect(call.state).toEqual('early');
    });

    it('set state to Active', () => {
      call.setState(State.Active);
      expect(call.state).toEqual('active');
    });

    it('set state to Held', () => {
      call.setState(State.Held);
      expect(call.state).toEqual('held');
    });

    it('set state to Hangup', () => {
      call.setState(State.Hangup);
      expect(call.state).toEqual('hangup');
    });

    it('set state to Destroy', () => {
      call.setState(State.Destroy);
      expect(call.state).toEqual('destroy');
      expect(session.calls).not.toHaveProperty(call.id);
      expect(isQueued('telnyx.rtc.mediaError', call.id)).toEqual(false);
    });

    it('set state to Purge', () => {
      call.setState(State.Purge);
      expect(call.state).toEqual('purge');
    });

    it('set prevState', () => {
      call.setState(State.Ringing);
      expect(call.prevState).toEqual('new');
      call.setState(State.Active);
      expect(call.prevState).toEqual('ringing');
      call.setState(State.Hangup);
      expect(call.prevState).toEqual('active');
    });
  });

  // ── BaseCall state transitions drive CallReportCollector.setHeld ──
  // Integration test proving that the public hold/unhold state transitions
  // actually drive the call-report collector's hold flag — not just that
  // setHeld() works in isolation (which the CallReportCollector tests cover).
  describe('setState drives CallReportCollector.setHeld', () => {
    it('transitions to Held call setHeld(true) on the collector', () => {
      call = new Call(session, { ...defaultParams, onNotification: noop });
      const setHeld = jest.fn();
      (
        call as unknown as {
          _callReportCollector: { setHeld: jest.Mock };
        }
      )._callReportCollector = { setHeld };

      call.setState(State.Held);
      expect(call.state).toEqual('held');
      expect(setHeld).toHaveBeenCalledWith(true);
    });

    it('transitions to Active call setHeld(false) on the collector', () => {
      call = new Call(session, { ...defaultParams, onNotification: noop });
      const setHeld = jest.fn();
      (
        call as unknown as {
          _callReportCollector: { setHeld: jest.Mock };
        }
      )._callReportCollector = { setHeld };

      // Held first so setHeld(true) is the baseline.
      call.setState(State.Held);
      expect(setHeld).toHaveBeenCalledWith(true);

      // Unhold → Active must clear the held flag.
      setHeld.mockClear();
      call.setState(State.Active);
      expect(call.state).toEqual('active');
      expect(setHeld).toHaveBeenCalledWith(false);
    });

    it('initial Active transition calls setHeld(false) (safe default)', () => {
      call = new Call(session, { ...defaultParams, onNotification: noop });
      const setHeld = jest.fn();
      (
        call as unknown as {
          _callReportCollector: { setHeld: jest.Mock };
        }
      )._callReportCollector = { setHeld };

      // The very first Active transition (no prior Held) must still clear the
      // flag safely — the collector defaults to not-held, so this is a no-op
      // in practice but proves the Active path always re-enables detection.
      call.setState(State.Active);
      expect(setHeld).toHaveBeenCalledWith(false);
    });
  });

  // ── Attach-recovery answer-success preserves Held ──
  // The attach-recovery path does NOT use _onRemoteSdp: the attach SDP is
  // applied as a remote offer in Peer.createPeerConnection and the local
  // answer is sent via _onIceSdp (non-trickle) / _onTrickleIceSdp (trickle).
  // Both answer-success callbacks must honor _wasHeldBeforeRecovery so a
  // held call undergoing reattachment transitions Recovering -> Held (not
  // Recovering -> Active, which would clear the held intent and expose the
  // customer-visible bug). These tests invoke the REAL _onIceSdp /
  // _onTrickleIceSdp handlers (the same pattern used by Call.trickle-ice
  // .test.ts): a call is constructed with attach + recoveredCallId +
  // wasHeldBeforeRecovery, invite() initializes the peer, session.execute
  // is mocked to resolve, then the private SDP callback is invoked with a
  // candidate-bearing answer SDP. They fail if the production guards at
  // BaseCall._onIceSdp / _onTrickleIceSdp are removed or moved incorrectly.
  describe('attach-recovery answer-success preserves Held', () => {
    // SDP carrying at least one candidate so _onIceSdp does not retry.
    const answerSdp =
      'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' +
      'a=candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx\r\n';

    // Helper: construct an attach-recovery replacement call (the kind
    // VertoHandler._buildCall creates) carrying held-before-recovery intent.
    // invite() initializes peer.instance so the real SDP path can run.
    async function makeAttachRecoveryCall(trickle: boolean): Promise<Call> {
      const c = new Call(session, {
        ...defaultParams,
        id: 'attach-recovery-call-id',
        onNotification: noop,
        // Attach-recovery: recoveredCallId drives _isRecovering=true in
        // _init(); wasHeldBeforeRecovery drives _wasHeldBeforeRecovery=true.
        attach: true,
        recoveredCallId: 'previous-held-call-id',
        wasHeldBeforeRecovery: true,
        trickleIce: trickle,
      });
      // invite() constructs peer.instance (a mocked RTCPeerConnection in the
      // test environment). It may attempt media; swallow any rejection.
      await c.invite().catch(() => {});
      if (!c.peer || !c.peer.instance) {
        throw new Error('peer.instance not initialized after invite()');
      }
      // invite() may kick off an async offer-send whose .then() calls
      // setState(State.Trying/Requesting). Flush pending microtasks and clear
      // mocks so that promise settles BEFORE we drive the answer callback,
      // otherwise its .then() could overwrite the answer's Held transition.
      await new Promise((r) => setImmediate(r));
      jest.clearAllMocks();
      // Re-assert the recovery state after flushing invite()'s offer path.
      // If invite()'s offer settled and set state to trying/requesting, the
      // _isRecovering guard kept it from reaching Answering, but the state
      // may no longer be 'recovering' — that is fine, we only need the
      // recovery + held flags to be in place for the answer callback.
      expect((c as unknown as { _isRecovering: boolean })._isRecovering).toBe(
        true
      );
      expect(
        (c as unknown as { _wasHeldBeforeRecovery: boolean })
          ._wasHeldBeforeRecovery
      ).toBe(true);
      return c;
    }

    it('non-trickle: _onIceSdp answer-success transitions Recovering -> Held (not Active)', async () => {
      const c = await makeAttachRecoveryCall(false);

      // Mock session.execute so _execute(Attach) resolves — this is the
      // path the real _onIceSdp takes for PeerType.Answer with attach=true.
      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockResolvedValue({ node_id: null });

      // Invoke the REAL _onIceSdp handler with a candidate-bearing answer.
      (
        c as unknown as {
          _onIceSdp: (data: { sdp: string; type: string }) => void;
        }
      )._onIceSdp({ sdp: answerSdp, type: 'answer' as RTCSdpType });

      // Flush the microtask queue so the .then() callback (which calls
      // setState) runs before we assert.
      await new Promise((r) => setImmediate(r));

      // The Attach message was sent (proving we exercised the real answer
      // path for an attach-recovery call, not a test-local copy).
      expect(executeSpy).toHaveBeenCalled();

      // The recovering held-before-recovery call must transition to Held,
      // NOT Active. This is the customer-visible requirement: a held call
      // undergoing reattachment stays held until explicit unhold.
      expect(c.state).toEqual('held');
      // Recovery intent is consumed by the Held transition; _isRecovering
      // is NOT cleared by Held (only Active clears it), so a subsequent
      // genuine recovery is still possible.
      expect((c as unknown as { _isRecovering: boolean })._isRecovering).toBe(
        true
      );

      executeSpy.mockRestore();
    });

    it('trickle: _onTrickleIceSdp answer-success transitions Recovering -> Held (not Active)', async () => {
      const c = await makeAttachRecoveryCall(true);

      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockResolvedValue({ node_id: null });

      // Invoke the REAL _onTrickleIceSdp handler with a candidate-bearing answer.
      (
        c as unknown as {
          _onTrickleIceSdp: (data: { sdp: string; type: string }) => void;
        }
      )._onTrickleIceSdp({ sdp: answerSdp, type: 'answer' as RTCSdpType });

      await new Promise((r) => setImmediate(r));

      expect(executeSpy).toHaveBeenCalled();
      expect(c.state).toEqual('held');
      expect((c as unknown as { _isRecovering: boolean })._isRecovering).toBe(
        true
      );

      executeSpy.mockRestore();
    });

    it('non-trickle: a recovering call WITHOUT held intent still goes Active (backward compat)', async () => {
      // An active call that recovers must NOT be forced to held. This is the
      // backward-compat case: wasHeldBeforeRecovery is absent/false.
      const c = new Call(session, {
        ...defaultParams,
        id: 'attach-recovery-active-call-id',
        onNotification: noop,
        attach: true,
        recoveredCallId: 'previous-active-call-id',
        // wasHeldBeforeRecovery intentionally omitted — active call recovery.
      });
      await c.invite().catch(() => {});
      // Flush invite()'s pending offer-send so it doesn't overwrite the
      // answer callback's state transition.
      await new Promise((r) => setImmediate(r));
      jest.clearAllMocks();
      expect(
        (c as unknown as { _wasHeldBeforeRecovery: boolean })
          ._wasHeldBeforeRecovery
      ).toBe(false);

      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockResolvedValue({ node_id: null });

      (
        c as unknown as {
          _onIceSdp: (data: { sdp: string; type: string }) => void;
        }
      )._onIceSdp({ sdp: answerSdp, type: 'answer' as RTCSdpType });

      await new Promise((r) => setImmediate(r));

      expect(executeSpy).toHaveBeenCalled();
      // Active call recovery reaches Active (the default), NOT Held.
      expect(c.state).toEqual('active');
      // _isRecovering is cleared by the Active transition.
      expect((c as unknown as { _isRecovering: boolean })._isRecovering).toBe(
        false
      );

      executeSpy.mockRestore();
    });

    it('clears _wasHeldBeforeRecovery on explicit unhold to Active after attach-recovery', async () => {
      // Build a recovering held-before-recovery call (the attach-recovery
      // replacement) and drive it to Held via _onIceSdp. Then explicit-unhold
      // to Active must clear _wasHeldBeforeRecovery so a later recovery does
      // not wrongly restore Held on a call the customer intentionally made
      // active. Uses the REAL _onIceSdp attach-recovery path (not _onRemoteSdp,
      // which the reviewer confirmed is NOT used by recovery).
      const c = await makeAttachRecoveryCall(false);

      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockResolvedValue({ node_id: null });

      (
        c as unknown as {
          _onIceSdp: (data: { sdp: string; type: string }) => void;
        }
      )._onIceSdp({ sdp: answerSdp, type: 'answer' as RTCSdpType });

      await new Promise((r) => setImmediate(r));
      expect(c.state).toEqual('held');

      // Explicit unhold → setState(State.Active) must clear the held intent.
      c.setState(State.Active);
      expect(c.state).toEqual('active');
      expect(
        (c as unknown as { _wasHeldBeforeRecovery: boolean })
          ._wasHeldBeforeRecovery
      ).toBe(false);

      executeSpy.mockRestore();
    });
  });

  // ── Mixed-call isolation ──
  // Stage acceptance: "With one held and one active call, health decisions
  // are isolated by affected call: the held call's silence is ignored while a
  // genuine no-RTP condition on the active call remains actionable."
  // This test creates two calls in the SAME session, drives one to Held and
  // one to Active, and asserts that a LOW_BYTES_RECEIVED warning on each call
  // reaches session.reportNoRtp ONLY for the active call — proving the
  // hold-suppression and the no-RTP defense-in-depth guard are call-scoped
  // and do not leak across calls sharing a session.
  describe('mixed held + active call isolation', () => {
    it('suppresses reportNoRtp for the held call but not the active call', async () => {
      // Build two calls on the same session with ready peers.
      const heldCall = new Call(session, {
        ...defaultParams,
        id: 'held-call-id',
        onNotification: noop,
      });
      const activeCall = new Call(session, {
        ...defaultParams,
        id: 'active-call-id',
        onNotification: noop,
      });
      await heldCall.invite().catch(() => {});
      await activeCall.invite().catch(() => {});

      // Mock setRemoteDescription on both peers so _onRemoteSdp / recovery
      // paths never hit a real browser API.
      if (heldCall.peer?.instance) {
        jest
          .spyOn(heldCall.peer.instance, 'setRemoteDescription')
          .mockResolvedValue(undefined as unknown as void);
      }
      if (activeCall.peer?.instance) {
        jest
          .spyOn(activeCall.peer.instance, 'setRemoteDescription')
          .mockResolvedValue(undefined as unknown as void);
      }

      // Drive each call to its target state.
      heldCall.setState(State.Active);
      heldCall.setState(State.Held);
      activeCall.setState(State.Active);
      expect(heldCall.state).toEqual('held');
      expect(activeCall.state).toEqual('active');

      // Spy on session.reportNoRtp — this is the no-RTP → ICE-restart
      // recovery handoff. We assert it is called per-call-id.
      const reportNoRtpSpy = jest
        .spyOn(session, 'reportNoRtp')
        .mockImplementation(() => {});

      // Reach into each call's CallReportCollector and drive a
      // LOW_BYTES_RECEIVED warning through the REAL onWarning callback that
      // BaseCall wires (the same callback that calls session.reportNoRtp).
      // This proves the BaseCall → collector → reportNoRtp wiring is
      // call-scoped and respects the State.Held guard.
      const fireLowBytesReceived = (c: Call) => {
        const collector = (
          c as unknown as {
            _callReportCollector: {
              onWarning: ((w: { code: number; name: string }) => void) | null;
            };
          }
        )._callReportCollector;
        expect(collector).toBeTruthy();
        expect(typeof collector.onWarning).toBe('function');
        // The warning shape matches ITelnyxWarning as used by the collector.
        collector.onWarning!({
          code: LOW_BYTES_RECEIVED,
          name: 'LOW_BYTES_RECEIVED',
        });
      };

      // Held call: LOW_BYTES_RECEIVED must NOT reach reportNoRtp.
      fireLowBytesReceived(heldCall);
      expect(reportNoRtpSpy).not.toHaveBeenCalled();

      // Active call: LOW_BYTES_RECEIVED MUST reach reportNoRtp for that call.
      fireLowBytesReceived(activeCall);
      expect(reportNoRtpSpy).toHaveBeenCalledTimes(1);
      expect(reportNoRtpSpy).toHaveBeenCalledWith(activeCall.id, 'inbound');

      // Defense-in-depth: a second fire on the held call still does not leak.
      fireLowBytesReceived(heldCall);
      expect(reportNoRtpSpy).toHaveBeenCalledTimes(1);

      // And a second fire on the active call reports again for that call only.
      fireLowBytesReceived(activeCall);
      expect(reportNoRtpSpy).toHaveBeenCalledTimes(2);
      expect(reportNoRtpSpy).toHaveBeenLastCalledWith(activeCall.id, 'inbound');
      // Never once reported for the held call's id.
      expect(reportNoRtpSpy).not.toHaveBeenCalledWith(
        heldCall.id,
        expect.anything()
      );
    });
  });

  describe('hangup caller instrumentation', () => {
    it('should log caller stack and state metadata when hangup is invoked', async () => {
      const debugSpy = jest
        .spyOn(logger, 'debug')
        .mockImplementation(jest.fn());

      call.setState(State.Active);
      await call.hangup({ cause: 'NORMAL_CLEARING', causeCode: 16 }, false);

      expect(debugSpy).toHaveBeenCalledWith(
        `[${call.id}] hangup() invoked`,
        expect.objectContaining({
          callId: call.id,
          execute: false,
          state: 'active',
          prevState: 'new',
          cause: 'NORMAL_CLEARING',
          causeCode: 16,
          initiator: 'app:call.hangup',
          isRecovering: false,
          hasDialogCustomHeaders: false,
          callerStack: expect.any(Array),
        })
      );

      const hangupLog = debugSpy.mock.calls.find(
        ([message]) => message === `[${call.id}] hangup() invoked`
      );
      const hangupLogContext = hangupLog?.[1] as { callerStack: string[] };
      expect(hangupLogContext.callerStack.length).toBeGreaterThan(0);
      expect(hangupLogContext.callerStack.join('\n')).toContain('hangup');

      debugSpy.mockRestore();
    });

    it('should log explicit hangup initiator metadata', async () => {
      const debugSpy = jest
        .spyOn(logger, 'debug')
        .mockImplementation(jest.fn());

      await call.hangup({ initiator: 'sdk:sdp-send-failure' }, false);

      expect(debugSpy).toHaveBeenCalledWith(
        `[${call.id}] hangup() invoked`,
        expect.objectContaining({
          initiator: 'sdk:sdp-send-failure',
        })
      );

      debugSpy.mockRestore();
    });
  });

  describe('call report uploads', () => {
    it('uses the owning session voice_sdk_id when posting the report', async () => {
      (session.connection as unknown as { host?: string }).host =
        'wss://rtc.telnyx.com';
      session.callReportId = 'call-report-id';
      session.callReportVoiceSdkId = 'owning-session-voice-sdk-id';
      (
        call as unknown as {
          options: {
            audio: unknown;
            iceServers: RTCIceServer[];
          };
        }
      ).options.audio = {
        deviceId: 'microphone-device-id',
        password: 'media-secret',
        nested: { token: 'nested-token', kept: true },
      };
      (
        call as unknown as {
          options: {
            audio: unknown;
            iceServers: RTCIceServer[];
          };
        }
      ).options.iceServers = [
        {
          urls: ['turn:example.com'],
          username: 'turn-user',
          credential: 'turn-password',
        },
      ];

      const collector = {
        stop: jest.fn().mockResolvedValue(undefined),
        postReport: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn(),
      };
      (
        call as unknown as { _callReportCollector: typeof collector }
      )._callReportCollector = collector;

      await (
        call as unknown as { _postCallReport: () => Promise<void> }
      )._postCallReport();

      expect(collector.postReport).toHaveBeenCalledWith(
        expect.objectContaining({ callId: call.id }),
        'call-report-id',
        'wss://rtc.telnyx.com',
        'owning-session-voice-sdk-id'
      );
      const submittedSummary = collector.postReport.mock.calls[0][0];
      expect(submittedSummary.clientSummary).toEqual(
        expect.objectContaining({
          authentication: expect.objectContaining({
            type: 'login_password',
          }),
          callReports: expect.objectContaining({
            enabled: true,
            intervalMs: 5000,
            flushIntervalMs: 180000,
          }),
          media: expect.objectContaining({
            audio: {
              deviceId: 'microphone-device-id',
              nested: { kept: true },
            },
            iceServers: [
              {
                urls: ['turn:example.com'],
                hasUsername: true,
                hasCredential: true,
              },
            ],
          }),
        })
      );
      const serializedClientSummary = JSON.stringify(
        submittedSummary.clientSummary
      );
      expect(serializedClientSummary).not.toContain('passwd');
      expect(serializedClientSummary).not.toContain('media-secret');
      expect(serializedClientSummary).not.toContain('nested-token');
      expect(serializedClientSummary).not.toContain('turn-password');
      expect(collector.cleanup).toHaveBeenCalled();
    });

    it('submits and tracks intermediate reports with the owning session voice_sdk_id', () => {
      (session.connection as unknown as { host?: string }).host =
        'wss://rtc.telnyx.com';
      session.callReportId = 'call-report-id';
      session.callReportVoiceSdkId = 'owning-session-voice-sdk-id';
      const payload = {
        summary: { callId: call.id },
        stats: [
          {
            intervalStartUtc: '2026-05-18T14:00:00.000Z',
            intervalEndUtc: '2026-05-18T14:00:05.000Z',
          },
        ],
        segment: 0,
      };
      const collector = {
        flush: jest.fn().mockReturnValue(payload),
        sendPayload: jest.fn().mockResolvedValue(undefined),
      };
      const trackSpy = jest.spyOn(session, 'trackCallReportUpload');
      (
        call as unknown as { _callReportCollector: typeof collector }
      )._callReportCollector = collector;

      (
        call as unknown as { _flushIntermediateReport: () => void }
      )._flushIntermediateReport();

      expect(collector.flush).toHaveBeenCalledWith(
        expect.objectContaining({
          callId: call.id,
          clientSummary: expect.objectContaining({
            authentication: expect.objectContaining({
              type: 'login_password',
            }),
          }),
        }),
        expect.any(Object)
      );
      expect(collector.sendPayload).toHaveBeenCalledWith(
        payload,
        'call-report-id',
        'wss://rtc.telnyx.com',
        'owning-session-voice-sdk-id',
        false // forceKeepalive — normal (non-page-unload) intermediate flush
      );
      expect(trackSpy).toHaveBeenCalledTimes(1);
      expect(trackSpy.mock.calls[0][0]).toHaveProperty(
        'then',
        expect.any(Function)
      );
    });
  });

  describe('hangup cause codes', () => {
    it('should use USER_BUSY/17 when rejecting a ringing call', async () => {
      call.setState(State.Ringing);
      await call.hangup({}, false);
      expect(call.cause).toEqual('USER_BUSY');
      expect(call.causeCode).toEqual(17);
    });

    it('should use USER_BUSY/17 for a new (pre-answer) call', async () => {
      // call starts in State.New
      await call.hangup({}, false);
      expect(call.cause).toEqual('USER_BUSY');
      expect(call.causeCode).toEqual(17);
    });

    it('should use NORMAL_CLEARING/16 when hanging up an active call', async () => {
      call.setState(State.Active);
      await call.hangup({}, false);
      expect(call.cause).toEqual('NORMAL_CLEARING');
      expect(call.causeCode).toEqual(16);
    });

    it('should use NORMAL_CLEARING/16 when hanging up a held call', async () => {
      call.setState(State.Active);
      call.setState(State.Held);
      await call.hangup({}, false);
      expect(call.cause).toEqual('NORMAL_CLEARING');
      expect(call.causeCode).toEqual(16);
    });

    it('should respect explicit cause params regardless of state', async () => {
      call.setState(State.Active);
      await call.hangup({ cause: 'CUSTOM_CAUSE', causeCode: 99 }, false);
      expect(call.cause).toEqual('CUSTOM_CAUSE');
      expect(call.causeCode).toEqual(99);
    });
  });

  describe('outbound invite response races', () => {
    const localOffer: RTCSessionDescriptionInit = {
      type: PeerType.Offer,
      sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-',
    };

    it('should not move a hung up outbound call back to trying when invite ACK arrives late', async () => {
      let resolveInvite: (response: { node_id: string }) => void;
      const inviteResponse = new Promise<{ node_id: string }>((resolve) => {
        resolveInvite = resolve;
      });
      jest.spyOn(session, 'execute').mockReturnValue(inviteResponse);
      const onTrickleIceSdp = (
        Reflect.get(call, '_onTrickleIceSdp') as (
          this: Call,
          data: RTCSessionDescriptionInit
        ) => void
      ).bind(call);

      onTrickleIceSdp(localOffer);
      expect(call.state).toEqual('requesting');

      call.setState(State.Hangup);
      resolveInvite({ node_id: 'late-node' });
      await inviteResponse;
      await Promise.resolve();

      expect(call.state).toEqual('hangup');
    });

    it('does not send deferred non-trickle local SDP after destroy', () => {
      const onIceSdp = (
        Reflect.get(call, '_onIceSdp') as (
          this: Call,
          data: RTCSessionDescriptionInit
        ) => void
      ).bind(call);

      call.setState(State.Destroy);
      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockImplementation(() => new Promise(() => {}));

      onIceSdp(localOffer);

      expect(call.state).toEqual('destroy');
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('does not send deferred trickle local SDP after destroy', () => {
      const onTrickleIceSdp = (
        Reflect.get(call, '_onTrickleIceSdp') as (
          this: Call,
          data: RTCSessionDescriptionInit
        ) => void
      ).bind(call);

      call.setState(State.Destroy);
      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockImplementation(() => new Promise(() => {}));

      onTrickleIceSdp(localOffer);

      expect(call.state).toEqual('destroy');
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('does not signal queued trickle candidate or end-of-candidates events after destroy', () => {
      const onTrickleIce = (
        Reflect.get(call, '_onTrickleIce') as (
          this: Call,
          event: RTCPeerConnectionIceEvent
        ) => void
      ).bind(call);
      const candidate = {
        candidate: 'candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx',
        sdpMLineIndex: 0,
        sdpMid: '0',
      } as RTCIceCandidate;

      call.setState(State.Destroy);
      const executeSpy = jest
        .spyOn(session, 'execute')
        .mockImplementation(() => new Promise(() => {}));

      onTrickleIce({ candidate } as RTCPeerConnectionIceEvent);
      onTrickleIce({ candidate: null } as RTCPeerConnectionIceEvent);

      expect(call.state).toEqual('destroy');
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe('setStateTelnyx', () => {
    it('should return null if call is null', () => {
      const localCall = Call.setStateTelnyx(undefined);
      expect(localCall).toEqual(undefined);
    });

    it('should return call without change', () => {
      const localCall = Call.setStateTelnyx(call);
      expect(localCall).toEqual(call);
    });
    it('set telnyx state call', () => {
      call.setState(State.Recovering);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('recovering');

      call.setState(State.Trying);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('connecting');

      call.setState(State.Early);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('connecting');

      call.setState(State.Hangup);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('done');

      call.setState(State.Destroy);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('done');

      call.setState(State.Answering);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('ringing');
    });
  });

  describe('.setAudioBandwidthEncodingsMaxBps()', () => {
    it('if audio is used it should set audio max bitrate to 200 kbits/s', () => {
      const maxBitsPerSecond = 200000;
      if (call.options.audio && call.peer) {
        call.setAudioBandwidthEncodingsMaxBps(maxBitsPerSecond);
        expect(getBitrate(call, 'audio')).toEqual(maxBitsPerSecond);
      }
    });
  });

  describe('media failure handling', () => {
    const mediaError = new DOMException('Permission denied', 'NotAllowedError');

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('invite() should call hangup and not proceed with negotiation when media fails', async () => {
      jest
        .spyOn(
          Peer.prototype as unknown as {
            _retrieveLocalStream: () => Promise<MediaStream>;
          },
          '_retrieveLocalStream'
        )
        .mockRejectedValue(mediaError);
      const startNegotiationSpy = jest
        .spyOn(Peer.prototype, 'startNegotiation')
        .mockImplementation(() => {});
      const hangupSpy = jest.spyOn(call, 'hangup').mockResolvedValue(undefined);

      await call.invite();

      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:peer-init-failed' },
        false
      );
      expect(startNegotiationSpy).not.toHaveBeenCalled();
    });

    it('answer() should call hangup and not proceed with negotiation when media fails', async () => {
      jest
        .spyOn(
          Peer.prototype as unknown as {
            _retrieveLocalStream: () => Promise<MediaStream>;
          },
          '_retrieveLocalStream'
        )
        .mockRejectedValue(mediaError);
      const startNegotiationSpy = jest
        .spyOn(Peer.prototype, 'startNegotiation')
        .mockImplementation(() => {});

      const answerCall = new Call(session, {
        ...defaultParams,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      const hangupSpy = jest
        .spyOn(answerCall, 'hangup')
        .mockResolvedValue(undefined);

      await answerCall.answer();

      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:peer-init-failed' },
        true
      );
      expect(startNegotiationSpy).not.toHaveBeenCalled();
    });

    it('invite() should not abort early when media succeeds', async () => {
      // Default getUserMedia mock returns a valid stream — no override needed.
      // Verify invite() does not throw and _creatingPeer is reset (media-failure
      // try/catch path was not hit).
      await expect(call.invite()).resolves.toBeUndefined();
      expect(call['_creatingPeer']).toBe(false);
    });

    it('answer() with receiveOnlyAudio should not throw on getUserMedia failure', async () => {
      // For receive-only peers (no local audio), media failure is expected and
      // should NOT cause createPeerConnection to throw. We verify this by
      // asserting answer() resolves without throwing, and that _creatingPeer
      // is reset (i.e., the media-abort branch was not hit).
      jest
        .spyOn(
          Peer.prototype as unknown as {
            _retrieveLocalStream: () => Promise<MediaStream>;
          },
          '_retrieveLocalStream'
        )
        .mockRejectedValue(mediaError);

      const receiveOnlyCall = new Call(session, {
        ...defaultParams,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
        receiveOnlyAudio: true,
        audio: false,
      });

      await expect(receiveOnlyCall.answer()).resolves.toBeUndefined();
      // _creatingPeer false means we reached the end of answer() normally,
      // not via the media-error early-return path
      expect(receiveOnlyCall['_creatingPeer']).toBe(false);
      await receiveOnlyCall.hangup({}, false);
    });
  });

  describe('double answer prevention', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should ignore second answer() when peer connection already exists', async () => {
      const answerCall = new Call(session, {
        ...defaultParams,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      // Mock a peer with an active (non-closed) RTCPeerConnection
      answerCall.peer = {
        instance: {
          signalingState: 'stable',
        },
      } as unknown as Peer;

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await answerCall.answer();

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({
            code: ANSWER_WHILE_PEER_ACTIVE,
            name: 'ANSWER_WHILE_PEER_ACTIVE',
          }),
          callId: answerCall.id,
        })
      );

      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should allow answer() when peer connection is closed', async () => {
      const answerCall = new Call(session, {
        ...defaultParams,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      // Mock a peer with a closed RTCPeerConnection
      answerCall.peer = {
        instance: {
          signalingState: 'closed',
          connectionState: 'closed',
          iceConnectionState: 'closed',
        },
      } as unknown as Peer;

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await answerCall.answer();

      // Warning should NOT fire — a closed peer is allowed to be replaced
      expect(warningHandler).not.toHaveBeenCalled();

      await answerCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should ignore a duplicate inbound answer for the SAME callID (VSUP-54 regression guard)', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'same-callid-answer-guard',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      // A second Call object with the SAME id. Its constructor overwrites
      // session.calls[id] to point at itself; restore the map so the guard
      // sees the first call as the existing entry for this callID.
      const duplicateCall = new Call(session, {
        ...defaultParams,
        id: 'same-callid-answer-guard',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      session.calls['same-callid-answer-guard'] = firstCall;
      duplicateCall.direction = Direction.Inbound;

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await firstCall.answer();
      firstCall.setState(State.Answering);
      firstCall.peer = {
        close: jest.fn(),
        instance: {
          signalingState: 'stable',
          connectionState: 'connecting',
          iceConnectionState: 'checking',
        },
      } as unknown as Peer;
      await duplicateCall.answer();

      // Only the first call's peer.init() should run; the duplicate is blocked.
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({
            code: DUPLICATE_INBOUND_ANSWER,
            name: 'DUPLICATE_INBOUND_ANSWER',
          }),
          callId: duplicateCall.id,
          activeCallId: firstCall.id,
        })
      );

      await firstCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should ignore a duplicate inbound answer for the SAME callID even when the existing call has a failed peer connection', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'same-callid-failed-peer',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const duplicateCall = new Call(session, {
        ...defaultParams,
        id: 'same-callid-failed-peer',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      session.calls['same-callid-failed-peer'] = firstCall;
      duplicateCall.direction = Direction.Inbound;

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await firstCall.answer();
      firstCall.setState(State.Active);
      firstCall.peer = {
        close: jest.fn(),
        instance: {
          signalingState: 'stable',
          connectionState: 'failed',
          iceConnectionState: 'failed',
        },
      } as unknown as Peer;

      await duplicateCall.answer();

      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({
            code: DUPLICATE_INBOUND_ANSWER,
            name: 'DUPLICATE_INBOUND_ANSWER',
          }),
          callId: duplicateCall.id,
          activeCallId: firstCall.id,
        })
      );

      await firstCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should release the duplicate answer guard for a callID after the active call is destroyed', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'released-same-callid',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      await firstCall.answer();
      firstCall.setState(State.Active);
      firstCall.peer = {
        close: jest.fn(),
        instance: {
          signalingState: 'stable',
          connectionState: 'connected',
          iceConnectionState: 'connected',
        },
      } as unknown as Peer;

      // A second Call object with the SAME id. Its constructor overwrites
      // session.calls[id] to point at itself; restore the map so the guard
      // sees the first call as the existing entry for this callID.
      const secondCall = new Call(session, {
        ...defaultParams,
        id: 'released-same-callid',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      session.calls['released-same-callid'] = firstCall;
      secondCall.direction = Direction.Inbound;

      // While firstCall is active, the same-callID duplicate is blocked.
      await secondCall.answer();
      expect(initSpy).toHaveBeenCalledTimes(1);

      // After firstCall is destroyed, session.calls[id] is cleared. Restore
      // the second call's registration so a subsequent answer proceeds.
      await firstCall.hangup({}, false);
      session.calls['released-same-callid'] = secondCall;

      await secondCall.answer();
      expect(initSpy).toHaveBeenCalledTimes(2);

      await secondCall.hangup({}, false);
    });

    it('should allow answer() for a DIFFERENT callID while another inbound call is active', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'active-distinct-A',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      const secondCall = new Call(session, {
        ...defaultParams,
        id: 'active-distinct-B',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await firstCall.answer();
      firstCall.setState(State.Active);
      firstCall.peer = {
        close: jest.fn(),
        instance: {
          signalingState: 'stable',
          connectionState: 'connecting',
          iceConnectionState: 'checking',
        },
      } as unknown as Peer;

      await secondCall.answer();

      // Both calls proceed — distinct callIDs are unblocked.
      expect(initSpy).toHaveBeenCalledTimes(2);
      // No DUPLICATE_INBOUND_ANSWER warning for a distinct callID.
      const dupWarning = warningHandler.mock.calls.find(
        (args: Array<{ warning?: { code?: number } }>) =>
          args[0]?.warning?.code === DUPLICATE_INBOUND_ANSWER
      );
      expect(dupWarning).toBeUndefined();

      await firstCall.hangup({}, false);
      await secondCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should allow answer() for a DIFFERENT callID while another inbound call is held', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'held-distinct-A',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      const secondCall = new Call(session, {
        ...defaultParams,
        id: 'held-distinct-B',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await firstCall.answer();
      firstCall.setState(State.Held);
      firstCall.peer = {
        close: jest.fn(),
        instance: {
          signalingState: 'stable',
          connectionState: 'connected',
          iceConnectionState: 'connected',
        },
      } as unknown as Peer;

      await secondCall.answer();

      expect(initSpy).toHaveBeenCalledTimes(2);
      const dupWarning = warningHandler.mock.calls.find(
        (args) => args[0]?.warning?.code === DUPLICATE_INBOUND_ANSWER
      );
      expect(dupWarning).toBeUndefined();

      await firstCall.hangup({}, false);
      await secondCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should NOT hangup or close the peer when blocking a same-callID duplicate answer', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'no-side-effects-callid',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      const duplicateCall = new Call(session, {
        ...defaultParams,
        id: 'no-side-effects-callid',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      session.calls['no-side-effects-callid'] = firstCall;
      duplicateCall.direction = Direction.Inbound;

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await firstCall.answer();
      firstCall.setState(State.Active);
      const peerCloseSpy = jest.fn();
      firstCall.peer = {
        close: peerCloseSpy,
        instance: {
          signalingState: 'stable',
          connectionState: 'connected',
          iceConnectionState: 'connected',
        },
      } as unknown as Peer;

      const hangupSpy = jest
        .spyOn(firstCall, 'hangup')
        .mockResolvedValue(undefined);

      await duplicateCall.answer();

      // Blocked path must not call hangup() or close the peer connection.
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(hangupSpy).not.toHaveBeenCalled();
      expect(peerCloseSpy).not.toHaveBeenCalled();
      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({
            code: DUPLICATE_INBOUND_ANSWER,
            name: 'DUPLICATE_INBOUND_ANSWER',
          }),
        })
      );

      hangupSpy.mockRestore();
      await firstCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, session.uuid);
    });
  });

  describe('answer() multi-call debug log', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should NOT log a multi-call diagnostic when answering a single inbound call', async () => {
      // Clean up the default call from beforeEach so only the inbound call exists
      call.setState(State.Purge);
      delete session.calls[call.id];

      const answerCall = new Call(session, {
        ...defaultParams,
        id: 'single-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      answerCall.direction = Direction.Inbound;
      answerCall.setState(State.Ringing);

      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

      await answerCall.answer();

      // The debug log for "answering inbound call while N other active call(s) exist"
      // should NOT fire when the only active call is the one being answered.
      const multiCallLog = debugSpy.mock.calls.find((args: string[]) =>
        /answer\(\): answering inbound call while \d+ other active call/.test(
          args[0]
        )
      );
      expect(multiCallLog).toBeUndefined();

      await answerCall.hangup({}, false);
    });

    it('should log a multi-call diagnostic when answering while another call is active', async () => {
      // The default call from beforeEach is in 'new' state (counts as active),
      // so the debug log should fire because at least one other active call exists.
      const answerCall = new Call(session, {
        ...defaultParams,
        id: 'second-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      answerCall.direction = Direction.Inbound;
      answerCall.setState(State.Ringing);

      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

      await answerCall.answer();

      // The debug log should fire because at least one other active call exists.
      const multiCallLog = debugSpy.mock.calls.find((args: string[]) =>
        /answer\(\): answering inbound call while \d+ other active call/.test(
          args[0]
        )
      );
      expect(multiCallLog).toBeDefined();
      // The log should NOT count the call being answered itself
      expect(multiCallLog![0]).not.toContain('0 other active call');

      await answerCall.hangup({}, false);
    });
  });

  describe('answer() per-call element override (VSUP-121)', () => {
    let initSpy: jest.SpyInstance;

    beforeEach(() => {
      // Prevent real RTCPeerConnection setup so answer() completes in tests.
      initSpy = jest.spyOn(Peer.prototype, 'init').mockResolvedValue(undefined);
    });

    afterEach(() => {
      initSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should override remoteElement from answer() params', async () => {
      // Purge the default call so only the inbound call exists (avoids the
      // duplicate-answer guard from VSUP-122, which is out of scope here).
      call.setState(State.Purge);
      delete session.calls[call.id];

      const remoteElementA = document.createElement('audio');
      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-override-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      await inbound.answer({ remoteElement: remoteElementA });

      // The per-call remoteElement passed to answer() must land on this.options
      expect(inbound.options.remoteElement).toBe(remoteElementA);

      await inbound.hangup({}, false);
    });

    it('should override localElement from answer() params', async () => {
      call.setState(State.Purge);
      delete session.calls[call.id];

      const localElementA = document.createElement('audio');
      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-override-local-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      await inbound.answer({ localElement: localElementA });

      expect(inbound.options.localElement).toBe(localElementA);

      await inbound.hangup({}, false);
    });

    it('should override both remoteElement and localElement from answer() params', async () => {
      call.setState(State.Purge);
      delete session.calls[call.id];

      const remoteElementB = document.createElement('video');
      const localElementB = document.createElement('video');
      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-override-both-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      await inbound.answer({
        remoteElement: remoteElementB,
        localElement: localElementB,
      });

      expect(inbound.options.remoteElement).toBe(remoteElementB);
      expect(inbound.options.localElement).toBe(localElementB);

      await inbound.hangup({}, false);
    });

    it('should fall back to existing options.remoteElement when answer() omits it (backward compat)', async () => {
      call.setState(State.Purge);
      delete session.calls[call.id];

      // Pre-set a remoteElement on the call (simulating session-level default
      // applied at construction via newCall).
      const sessionDefaultElement = document.createElement('audio');
      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-no-override-call',
        remoteElement: sessionDefaultElement,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      // answer() with no element params — must keep the pre-existing element
      await inbound.answer({});

      expect(inbound.options.remoteElement).toBe(sessionDefaultElement);

      await inbound.hangup({}, false);
    });

    it('should not mutate options when answer() params omit both elements', async () => {
      call.setState(State.Purge);
      delete session.calls[call.id];

      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-omits-elements-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      const optionsBefore = { ...inbound.options };

      await inbound.answer({ customHeaders: [{ name: 'X-Test', value: '1' }] });

      // Elements unchanged (undefined stays undefined — no spurious override)
      expect(inbound.options.remoteElement).toBe(optionsBefore.remoteElement);
      expect(inbound.options.localElement).toBe(optionsBefore.localElement);
      // customHeaders still applied (proves the merge block before ours ran)
      expect(inbound.options.customHeaders).toEqual([
        { name: 'X-Test', value: '1' },
      ]);

      await inbound.hangup({}, false);
    });
  });

  describe('newCall per-call element (VSUP-121)', () => {
    it('should set remoteElement per-call from new Call() options', () => {
      const remoteElement = document.createElement('audio');
      const perCall = new Call(session, {
        ...defaultParams,
        id: 'newcall-remote-element',
        remoteElement,
      });
      // BaseCall constructor spreads options at construction, so the per-call
      // remoteElement is honored without any answer()-time override.
      expect(perCall.options.remoteElement).toBe(remoteElement);
    });

    it('should set localElement per-call from new Call() options', () => {
      const localElement = document.createElement('video');
      const perCall = new Call(session, {
        ...defaultParams,
        id: 'newcall-local-element',
        localElement,
      });
      expect(perCall.options.localElement).toBe(localElement);
    });

    it('should default to the session-level element (null when none set) when not provided per-call (backward compat)', () => {
      const perCall = new Call(session, {
        ...defaultParams,
        id: 'newcall-no-element',
      });
      // BaseCall merges the session-level localElement/remoteElement (which
      // default to null in BrowserSession when no element is set). The per-call
      // default is the session default, not undefined.
      expect(perCall.options.remoteElement).toBeNull();
      expect(perCall.options.localElement).toBeNull();
    });
  });

  describe('multi-call independent remoteElement (VSUP-121 AC)', () => {
    it('two concurrent calls keep distinct remoteElements and hangup detaches only the hung-up call', () => {
      // Construct two calls, each with its own remoteElement.
      const remoteElementA = document.createElement('audio');
      const remoteElementB = document.createElement('audio');
      const streamA = new MediaStream();
      const streamB = new MediaStream();

      const callA = new Call(session, {
        ...defaultParams,
        id: 'multi-call-A',
        remoteElement: remoteElementA,
      });
      const callB = new Call(session, {
        ...defaultParams,
        id: 'multi-call-B',
        remoteElement: remoteElementB,
      });

      // Simulate both calls having attached their streams to their own elements.
      callA.options.remoteStream = streamA;
      callB.options.remoteStream = streamB;
      remoteElementA.srcObject = streamA;
      remoteElementB.srcObject = streamB;

      // AC: each call has its own element with independent playout
      expect(remoteElementA.srcObject).toBe(streamA);
      expect(remoteElementB.srcObject).toBe(streamB);
      expect(callA.options.remoteElement).toBe(remoteElementA);
      expect(callB.options.remoteElement).toBe(remoteElementB);

      // Hang up call A — only call A's element should be detached. Because each
      // call owns a distinct element, detaching call A's element does not touch
      // call B's element or stream.
      callA['_finalize']();
      expect(remoteElementA.srcObject).toBeNull();
      // AC: call B's remote media continues uninterrupted
      expect(remoteElementB.srcObject).toBe(streamB);

      // Cleanup call B
      callB['_finalize']();
      expect(remoteElementB.srcObject).toBeNull();
    });

    it('connecting a second call does NOT overwrite the first call remoteElement', () => {
      const remoteElementA = document.createElement('audio');
      const remoteElementB = document.createElement('audio');
      const streamA = new MediaStream();

      const callA = new Call(session, {
        ...defaultParams,
        id: 'multi-call-no-overwrite-A',
        remoteElement: remoteElementA,
      });
      callA.options.remoteStream = streamA;
      remoteElementA.srcObject = streamA;

      // A second call constructed with a *different* remoteElement must not
      // touch call A's element or stream.
      const callB = new Call(session, {
        ...defaultParams,
        id: 'multi-call-no-overwrite-B',
        remoteElement: remoteElementB,
      });

      expect(callA.options.remoteElement).toBe(remoteElementA);
      expect(callB.options.remoteElement).toBe(remoteElementB);
      // call A's attachment is intact
      expect(remoteElementA.srcObject).toBe(streamA);
    });
  });

  describe('_finalize() conditional detach', () => {
    it('should detach media elements when srcObject matches the call stream', () => {
      const remoteStream = new MediaStream();
      const localStream = new MediaStream();
      const remoteElement = document.createElement('audio');
      const localElement = document.createElement('audio');
      remoteElement.srcObject = remoteStream;
      localElement.srcObject = localStream;

      call.options.remoteStream = remoteStream;
      call.options.localStream = localStream;
      call.options.remoteElement = remoteElement;
      call.options.localElement = localElement;

      call['_finalize']();

      expect(remoteElement.srcObject).toBeNull();
      expect(localElement.srcObject).toBeNull();
    });

    it('should NOT detach media elements when srcObject has been reattached to a different stream', () => {
      const callStream = new MediaStream();
      const otherStream = new MediaStream();
      const remoteElement = document.createElement('audio');
      const localElement = document.createElement('audio');
      // Element now points to a different stream (e.g., a new active call)
      remoteElement.srcObject = otherStream;
      localElement.srcObject = otherStream;

      call.options.remoteStream = callStream;
      call.options.localStream = callStream;
      call.options.remoteElement = remoteElement;
      call.options.localElement = localElement;

      call['_finalize']();

      // The element should NOT have been cleared — it belongs to a different call
      expect(remoteElement.srcObject).toBe(otherStream);
      expect(localElement.srcObject).toBe(otherStream);
    });
  });

  // Regression test for the VSDK-279 reviewer finding: _finalize() previously
  // called _callRecorder.cleanup() before _postCallReport() ran, which nulled
  // the packet buffer so postFinalReport() had nothing to upload on every
  // normal teardown. _finalize() must call stop() (release readers + flush
  // timer) but PRESERVE the buffer; _postCallReport owns the final cleanup.
  describe('_finalize() recorder lifecycle (VSDK-279)', () => {
    it('_finalize calls stop() (not cleanup()) so postFinalReport can still drain the buffer', async () => {
      // Stand up a fake recorder that records call order and buffers data.
      const calls: string[] = [];
      const fakeRecorder = {
        _bufferedPackets: 7, // simulate packets sitting in the buffer
        stop: jest.fn(() => {
          calls.push('stop');
        }),
        postFinalReport: jest.fn(async () => {
          // postFinalReport must still see the buffered packets.
          calls.push('postFinalReport');
          // If cleanup() ran before us, the buffer would already be empty.
          expect(fakeRecorder._bufferedPackets).toBe(7);
          // Drain the buffer (as the real _drain() does).
          fakeRecorder._bufferedPackets = 0;
        }),
        cleanup: jest.fn(() => {
          calls.push('cleanup');
          fakeRecorder._bufferedPackets = 0;
        }),
        _setHost: jest.fn(),
        _setCallReportId: jest.fn(),
      };

      // _finalize must NOT call cleanup() (which nulls the buffer) — only stop().
      (
        call as unknown as { _callRecorder: typeof fakeRecorder }
      )._callRecorder = fakeRecorder;

      // Stub the call-report collector so _postCallReport can run without a
      // real collector / host / callReportId setup.
      const collector = {
        stop: jest.fn().mockResolvedValue(undefined),
        postReport: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn(),
      };
      (
        call as unknown as { _callReportCollector: typeof collector }
      )._callReportCollector = collector;
      (session.connection as unknown as { host?: string }).host =
        'wss://rtc.telnyx.com';
      session.callReportId = 'call-report-id';
      const trackSpy = jest.spyOn(session, 'trackCallReportUpload');

      call['_finalize']();

      // stop() must be called, cleanup() must NOT be called from _finalize.
      expect(fakeRecorder.stop).toHaveBeenCalledTimes(1);
      expect(fakeRecorder.cleanup).not.toHaveBeenCalled();

      // _finalize kicks off _postCallReport in the background and tracks it.
      expect(trackSpy).toHaveBeenCalled();
      // Wait for the background _postCallReport promise to settle.
      await Promise.all(trackSpy.mock.calls.map((p) => p[0]));

      // postFinalReport must have run (it drains the preserved buffer) and
      // cleanup must have run AFTER it (from the .finally in _postCallReport).
      expect(fakeRecorder.postFinalReport).toHaveBeenCalledTimes(1);
      expect(fakeRecorder.cleanup).toHaveBeenCalled();

      // Ordering: stop() (from _finalize) before postFinalReport (from
      // _postCallReport), and cleanup() AFTER postFinalReport. This proves
      // _finalize preserved the buffer for postFinalReport to drain.
      expect(calls.indexOf('stop')).toBeLessThan(
        calls.indexOf('postFinalReport')
      );
      expect(calls.indexOf('postFinalReport')).toBeLessThan(
        calls.indexOf('cleanup')
      );
    });
  });
});
