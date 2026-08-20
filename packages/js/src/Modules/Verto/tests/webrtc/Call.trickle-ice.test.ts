import { VertoMethod, VertoModifyAction } from '../../webrtc/constants';
import Call from '../../webrtc/Call';
import Verto from '../..';
import type { IVertoCallOptions } from '../../webrtc/interfaces';
import {
  ONLY_HOST_ICE_CANDIDATES,
  SDP_CREATE_OFFER_FAILED,
  SwEvent,
} from '../../util/constants';
import { createTelnyxError } from '../../util/errors';
import { deRegister, register } from '../../services/Handler';

const originalConsoleDebug = console.debug;
const originalConsoleLog = console.log;
const originalConsoleGroup = console.group;

beforeAll(() => {
  console.debug = jest.fn();
  console.log = jest.fn();
  console.group = jest.fn();
});

afterAll(() => {
  console.debug = originalConsoleDebug;
  console.log = originalConsoleLog;
  console.group = originalConsoleGroup;
});

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

describe('Call Trickle ICE', () => {
  let session: any;
  let call: Call;
  const defaultParams: IVertoCallOptions = {
    destinationNumber: 'x3599',
    remoteCallerName: 'Js Client Test',
    remoteCallerNumber: '1234',
    callerName: 'Jest Client',
    callerNumber: '5678',
    trickleIce: true,
  };
  const remoteSdp = 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-';

  beforeEach(async (done) => {
    session = new Verto({
      host: 'example.fs.telnyx',
      login: 'login',
      passwd: 'passwd',
    });
    await session.connect().catch(console.error);
    call = new Call(session, defaultParams);
    // Initialize the peer by calling invite() so peer.instance is available
    call.invite();
    // Clear mocks after setup
    jest.clearAllMocks();
    done();
  });

  describe('ICE candidate message handling', () => {
    it('should queue ICE candidates until the remote description is set', async () => {
      const candidates = [
        {
          candidate:
            'candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        {
          candidate:
            'candidate:2 1 UDP 1694498815 198.51.100.2 54400 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        {
          candidate:
            'candidate:3 1 UDP 1694498815 198.51.100.3 54400 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
      ];

      const addCandidateSpy = jest.spyOn(call.peer.instance, 'addIceCandidate');

      candidates.forEach((candidate) => {
        call.handleMessage({
          method: VertoMethod.Candidate,
          params: candidate,
        });
      });

      expect(addCandidateSpy).not.toHaveBeenCalled();
      expect((call as any)._pendingIceCandidates).toHaveLength(
        candidates.length
      );

      await (call as any)._onRemoteSdp(remoteSdp);

      const calledCandidates = addCandidateSpy.mock.calls.map(
        ([candidate]) => candidate
      );
      expect(calledCandidates).toEqual(candidates);
      expect(addCandidateSpy).toHaveBeenCalledTimes(candidates.length);
      expect((call as any)._pendingIceCandidates).toHaveLength(0);
    });

    it('should handle candidate addition errors gracefully', async () => {
      const candidate = {
        candidate: 'invalid-candidate',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };

      if (!call.peer || !call.peer.instance) {
        fail('Peer instance should be initialized');
        return;
      }

      jest
        .spyOn(call.peer.instance, 'addIceCandidate')
        .mockRejectedValue(new Error('Invalid candidate'));

      await (call as any)._onRemoteSdp(remoteSdp);

      // Should not throw
      expect(() => {
        call.handleMessage({
          method: VertoMethod.Candidate,
          params: candidate,
        });
      }).not.toThrow();
    });
  });

  describe('ICE gathering state behavior', () => {
    it('should have ice gathering state change handler after invite', () => {
      expect(call.peer.instance).toHaveProperty('onicegatheringstatechange');
      expect(typeof call.peer.instance.onicegatheringstatechange).toBe(
        'function'
      );
    });

    it('should have ice candidate error handler after invite', () => {
      expect(call.peer.instance).toHaveProperty('onicecandidateerror');
      expect(typeof call.peer.instance.onicecandidateerror).toBe('function');
    });
  });

  describe('SDP handling behavior', () => {
    it('should send SDP immediately per RFC 8838 Trickle ICE requirements', async () => {
      // Mock session execute to prevent actual WebSocket message sending
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ node_id: 'test-node' });

      const mockSdp = {
        type: 'offer' as RTCSdpType,
        sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-', // SDP without candidates
      };

      await call.peer.startTrickleIceNegotiation();

      // Should send SDP immediately without waiting for candidates (RFC 8838)
      expect(sessionExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.Invite,
            params: expect.objectContaining({
              trickle: true,
              sdp: mockSdp.sdp,
            }),
          }),
        })
      );
    });
  });

  describe('Trickle ICE message behavior', () => {
    const sdpPrefix = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';

    const finishIceGathering = (sdp: string) => {
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp }),
        configurable: true,
      });
      call.peer.instance.onicecandidate({
        type: 'icecandidate',
        candidate: null,
        target: call.peer.instance,
      } as unknown as RTCPeerConnectionIceEvent);
    };

    afterEach(() => {
      deRegister(SwEvent.Warning, undefined, session.uuid);
      jest.restoreAllMocks();
    });

    it('warns for host-only local SDP at end-of-candidates and still sends EndOfCandidates', () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);
      const executeSpy = jest.spyOn(session, 'execute').mockResolvedValue({});
      const restartIceSpy = jest.spyOn(call.peer, 'restartIce');
      const startNegotiationSpy = jest.spyOn(call.peer, 'startNegotiation');
      const hangupSpy = jest.spyOn(call, 'hangup').mockResolvedValue();

      finishIceGathering(
        sdpPrefix +
          'a=candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host\r\n'
      );

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
          request: expect.objectContaining({
            method: VertoMethod.EndOfCandidates,
          }),
        })
      );
      expect(restartIceSpy).not.toHaveBeenCalled();
      expect(startNegotiationSpy).not.toHaveBeenCalled();
      expect(hangupSpy).not.toHaveBeenCalled();
    });

    it('waits for the null candidate before warning about host-only SDP', () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);
      const executeSpy = jest.spyOn(session, 'execute').mockResolvedValue({});
      const hostOnlySdp =
        sdpPrefix +
        'a=candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host\r\n';

      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: hostOnlySdp }),
        configurable: true,
      });
      call.peer.instance.onicecandidate({
        candidate: { candidate: '' } as RTCIceCandidate,
      } as RTCPeerConnectionIceEvent);

      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.EndOfCandidates,
          }),
        })
      );
      expect(warningHandler).not.toHaveBeenCalled();

      finishIceGathering(hostOnlySdp);

      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({ code: ONLY_HOST_ICE_CANDIDATES }),
        })
      );
    });

    it.each([
      ['zero-candidate', sdpPrefix],
      [
        'srflx',
        sdpPrefix +
          'a=candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx\r\n',
      ],
      [
        'prflx',
        sdpPrefix +
          'a=candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ prflx\r\n',
      ],
      [
        'relay',
        sdpPrefix +
          'a=candidate:1 1 UDP 1006632447 198.51.100.1 54400 typ relay\r\n',
      ],
    ])(
      'does not warn for %s SDP and still sends EndOfCandidates',
      (_description, sdp) => {
        const warningHandler = jest.fn();
        register(SwEvent.Warning, warningHandler, session.uuid);
        const executeSpy = jest.spyOn(session, 'execute').mockResolvedValue({});

        finishIceGathering(sdp);

        expect(warningHandler).not.toHaveBeenCalled();
        expect(executeSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({
              method: VertoMethod.EndOfCandidates,
            }),
          })
        );
      }
    );

    it('should handle ICE candidate events from peer connection', () => {
      // Mock session execute to capture outgoing messages
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({});

      // Create a mock ICE candidate event that matches the expected structure
      const mockCandidate = {
        candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54400 typ srflx',
        sdpMLineIndex: 0,
        sdpMid: '0',
      } as RTCIceCandidate;

      // Create a proper RTCPeerConnectionIceEvent mock
      const candidateEvent = {
        type: 'icecandidate',
        candidate: mockCandidate,
        target: call.peer.instance,
      } as unknown as RTCPeerConnectionIceEvent;

      // Mock the localDescription to indicate SDP was already sent
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({
          type: 'offer',
          sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-',
        }),
        configurable: true,
      });

      // First trigger SDP sending by simulating ICE candidate when _initialSdpSent is false
      const initialCandidateEvent = {
        type: 'icecandidate',
        candidate: {
          candidate:
            'candidate:initial 1 UDP 1694498813 192.168.1.3 54402 typ host',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        target: call.peer.instance,
      } as unknown as RTCPeerConnectionIceEvent;

      call.peer.instance.onicecandidate(initialCandidateEvent);

      sessionExecuteSpy.mockClear();

      // Now simulate another ICE candidate event after SDP was sent (_initialSdpSent should be true)
      // We need to manually set _initialSdpSent to true and update the onicecandidate handler
      (call as any)._initialSdpSent = true;

      // Update the event handler to allow candidates through
      call.peer.instance.onicecandidate = (event) => {
        (call as any)._onTrickleIce(event);
      };

      call.peer.instance.onicecandidate(candidateEvent);

      // Should send the candidate via Candidate message with flattened structure
      expect(sessionExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.Candidate,
            params: expect.objectContaining({
              candidate: mockCandidate.candidate,
              sdpMLineIndex: mockCandidate.sdpMLineIndex,
              sdpMid: mockCandidate.sdpMid,
            }),
          }),
        })
      );
    });

    it('should handle multiple onicecandidate events sequentially', () => {
      // Mock session execute to capture outgoing messages
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({});

      // Mock the localDescription to indicate SDP was sent
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({
          type: 'offer',
          sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-',
        }),
        configurable: true,
      });

      // Create multiple mock ICE candidates
      const candidates = [
        {
          candidate: 'candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        {
          candidate: 'candidate:2 1 UDP 1694498815 203.0.113.1 54401 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        {
          candidate: 'candidate:3 1 TCP 1006632447 198.51.100.1 9 typ relay',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
      ] as RTCIceCandidate[];

      // First trigger SDP sending with initial candidate
      const initialCandidateEvent = {
        type: 'icecandidate',
        candidate: candidates[0],
        target: call.peer.instance,
      } as unknown as RTCPeerConnectionIceEvent;

      call.peer.instance.onicecandidate(initialCandidateEvent);

      // Clear the spy to focus on subsequent candidates
      sessionExecuteSpy.mockClear();

      // Set _initialSdpSent to true to simulate that SDP was sent
      (call as any)._initialSdpSent = true;

      // Update the event handler to allow candidates through
      call.peer.instance.onicecandidate = (event) => {
        (call as any)._onTrickleIce(event);
      };

      // Trigger multiple ICE candidate events
      candidates.slice(1).forEach((candidate) => {
        const candidateEvent = {
          type: 'icecandidate',
          candidate,
          target: call.peer.instance,
        } as unknown as RTCPeerConnectionIceEvent;

        call.peer.instance.onicecandidate(candidateEvent);
      });

      // Should have sent all remaining candidates (2 in this case)
      expect(sessionExecuteSpy).toHaveBeenCalledTimes(2);

      // Verify each candidate was sent with correct structure
      candidates.slice(1).forEach((expectedCandidate, index) => {
        expect(sessionExecuteSpy).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            request: expect.objectContaining({
              method: VertoMethod.Candidate,
              params: expect.objectContaining({
                candidate: expectedCandidate.candidate,
                sdpMLineIndex: expectedCandidate.sdpMLineIndex,
                sdpMid: expectedCandidate.sdpMid,
              }),
            }),
          })
        );
      });
    });
  });

  describe('Trickle ICE error propagation', () => {
    it('should emit telnyx.error when startTrickleIceNegotiation rejects (no unhandled rejection)', async () => {
      // Regression test for the fire-and-forget trickle path: init() and
      // handleNegotiationNeededEvent() call startTrickleIceNegotiation()
      // WITHOUT await, with a .catch(_emitNegotiationError) handler. If
      // createOffer fails, the rejection must be caught and emitted as
      // telnyx.error — NOT become an unhandled promise rejection.
      const telnyxError = createTelnyxError(SDP_CREATE_OFFER_FAILED);

      jest
        .spyOn(call.peer.instance, 'createOffer')
        .mockRejectedValue(telnyxError);

      // Spy on _emitNegotiationError to verify it receives the error.
      // This is what init()'s .catch() handler invokes.
      const emitSpy = jest
        .spyOn(call.peer as any, '_emitNegotiationError')
        .mockImplementation(jest.fn());

      // Simulate init()'s fire-and-forget pattern:
      //   this.startTrickleIceNegotiation().catch(e => this._emitNegotiationError(e))
      await call.peer
        .startTrickleIceNegotiation()
        .catch((error) => (call.peer as any)._emitNegotiationError(error));

      // The TelnyxError must reach _emitNegotiationError (which emits
      // SwEvent.Error) — not become an unhandled rejection.
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ code: SDP_CREATE_OFFER_FAILED })
      );

      emitSpy.mockRestore();
    });
  });
  describe('ICE restart Modify', () => {
    const restartSdp =
      'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\na=candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx';

    it('trickle-enabled restart sends a trickle Modify with the new offer SDP', () => {
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ sdp: remoteSdp });

      call.peer.isIceRestarting = true;

      (call as any)._onTrickleIceSdp({
        type: 'offer' as RTCSdpType,
        sdp: restartSdp,
      });

      expect(sessionExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.Modify,
            params: expect.objectContaining({
              action: VertoModifyAction.UpdateMedia,
              callID: call.id,
              sdp: restartSdp,
              trickle: true,
            }),
          }),
        })
      );
    });

    it('routes restart candidates through the trickle Candidate/EndOfCandidates path', () => {
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({});

      call.peer.isIceRestarting = true;

      const candidateEvent = {
        type: 'icecandidate',
        candidate: {
          candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54400 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
      } as unknown as RTCPeerConnectionIceEvent;

      const endEvent = {
        type: 'icecandidate',
        candidate: null,
      } as unknown as RTCPeerConnectionIceEvent;

      // Use the real onicecandidate handler registered by _registerPeerEvents.
      call.peer.instance.onicecandidate(candidateEvent);
      call.peer.instance.onicecandidate(endEvent);

      const methods = sessionExecuteSpy.mock.calls.map(
        (c) => (c[0] as any)?.request?.method
      );
      expect(methods).toContain(VertoMethod.Candidate);
      expect(methods).toContain(VertoMethod.EndOfCandidates);
    });

    it('non-trickle restart sends a complete-SDP Modify without trickle', () => {
      const nonTrickleCall = new Call(session, {
        ...defaultParams,
        trickleIce: false,
      });
      nonTrickleCall.invite();

      const sessionExecuteSpy = jest
        .spyOn((nonTrickleCall as any).session, 'execute')
        .mockResolvedValue({ sdp: remoteSdp });

      nonTrickleCall.peer.isIceRestarting = true;

      (nonTrickleCall as any)._onIceSdp({
        type: 'offer' as RTCSdpType,
        sdp: restartSdp,
      });

      expect(sessionExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.Modify,
            params: expect.objectContaining({
              action: VertoModifyAction.UpdateMedia,
              callID: nonTrickleCall.id,
              sdp: restartSdp,
            }),
          }),
        })
      );

      // trickle must NOT be present on a non-trickle restart Modify
      const modifyCall = sessionExecuteSpy.mock.calls.find(
        (c) => (c[0] as any)?.request?.method === VertoMethod.Modify
      );
      expect(
        (modifyCall?.[0] as any)?.request?.params?.trickle
      ).toBeUndefined();
    });

    it('does not emit a second Invite for an established callID when the restart Modify succeeds', async () => {
      // Regression test for VSDK-525.
      //
      // Applying the Modify answer triggers renegotiation, which fires
      // onLocalSdpReady again with the post-restart (gen-1) offer. If
      // isIceRestarting has already been cleared at that point, that offer
      // takes the PeerType.Offer branch and the SDK sends a second Invite
      // reusing this call's ID. The server answers an Invite for an existing
      // dialog with DESTINATION_OUT_OF_ORDER and the call is torn down.
      // Let the initial invite() from beforeEach settle first, so its Invite
      // cannot land inside this test's await window and be mistaken for the
      // duplicate one we are asserting against.
      await new Promise((resolve) => setImmediate(resolve));

      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ sdp: remoteSdp });

      // Applying the remote answer re-enters the local-SDP-ready path once,
      // exactly as a real renegotiation does.
      let renegotiated = false;
      jest.spyOn(call as any, '_onRemoteSdp').mockImplementation(async () => {
        if (renegotiated) {
          return;
        }
        renegotiated = true;
        (call as any)._onTrickleIceSdp({
          type: 'offer' as RTCSdpType,
          sdp: restartSdp,
        });
      });

      call.peer.isIceRestarting = true;

      (call as any)._onTrickleIceSdp({
        type: 'offer' as RTCSdpType,
        sdp: restartSdp,
      });

      // Let the Modify promise chain settle.
      await new Promise((resolve) => setImmediate(resolve));

      const methods = sessionExecuteSpy.mock.calls.map(
        (c) => (c[0] as any)?.request?.method
      );
      expect(methods).toContain(VertoMethod.Modify);
      expect(methods).not.toContain(VertoMethod.Invite);
    });

    it('clears isIceRestarting only after the remote answer has been applied', async () => {
      jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ sdp: remoteSdp });

      let restartingWhileApplyingAnswer: boolean | undefined;
      jest.spyOn(call as any, '_onRemoteSdp').mockImplementation(async () => {
        restartingWhileApplyingAnswer = call.peer.isIceRestarting;
      });

      call.peer.isIceRestarting = true;

      (call as any)._onTrickleIceSdp({
        type: 'offer' as RTCSdpType,
        sdp: restartSdp,
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(restartingWhileApplyingAnswer).toBe(true);
      expect(call.peer.isIceRestarting).toBe(false);
    });

    it('clears isIceRestarting even when applying the remote answer throws', async () => {
      jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ sdp: remoteSdp });

      jest
        .spyOn(call as any, '_onRemoteSdp')
        .mockRejectedValue(new Error('setRemoteDescription failed'));

      call.peer.isIceRestarting = true;

      (call as any)._onTrickleIceSdp({
        type: 'offer' as RTCSdpType,
        sdp: restartSdp,
      });

      await new Promise((resolve) => setImmediate(resolve));

      // Otherwise the call could never restart ICE again.
      expect(call.peer.isIceRestarting).toBe(false);
    });

    it('reattached/recovered trickle call follows the trickle restart Modify flow', () => {
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ sdp: remoteSdp });

      // Simulate a call recovered via attach — recoveredCallId is set.
      (call as any).recoveredCallId = 'previous-call-id';
      call.peer.isIceRestarting = true;

      (call as any)._onTrickleIceSdp({
        type: 'offer' as RTCSdpType,
        sdp: restartSdp,
      });

      expect(sessionExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.Modify,
            params: expect.objectContaining({
              action: VertoModifyAction.UpdateMedia,
              callID: call.id,
              sdp: restartSdp,
              trickle: true,
            }),
          }),
        })
      );
    });
  });
});
