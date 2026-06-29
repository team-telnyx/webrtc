import { VertoMethod, VertoModifyAction } from '../../webrtc/constants';
import Call from '../../webrtc/Call';
import Verto from '../..';
import type { IVertoCallOptions } from '../../webrtc/interfaces';
import { SDP_CREATE_OFFER_FAILED } from '../../util/constants';
import { createTelnyxError } from '../../util/errors';

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
      expect((modifyCall?.[0] as any)?.request?.params?.trickle).toBeUndefined();
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
