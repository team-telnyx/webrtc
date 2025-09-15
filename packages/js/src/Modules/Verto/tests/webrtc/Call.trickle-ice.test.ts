import { VertoMethod } from '../../webrtc/constants';
import Call from '../../webrtc/Call';
import Verto from '../..';

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
  const defaultParams = {
    destinationNumber: 'x3599',
    remoteCallerName: 'Js Client Test',
    remoteCallerNumber: '1234',
    callerName: 'Jest Client',
    callerNumber: '5678',
  };

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
    it('should call _addIceCandidate when receiving Candidate message with valid candidate', () => {
      const candidate = {
        candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54400 typ srflx',
        sdpMLineIndex: 0,
        sdpMid: '0',
        usernameFragment: 'test',
      };

      const addCandidateSpy = jest.spyOn(call.peer.instance, 'addIceCandidate');

      call.handleMessage({
        method: VertoMethod.Candidate,
        params: candidate,
      });

      expect(addCandidateSpy).toHaveBeenCalledWith(candidate);
    });

    it('should handle candidate addition errors gracefully', async () => {
      const candidate = {
        candidate: 'invalid-candidate',
        sdpMLineIndex: 0,
        sdpMid: '0',
        usernameFragment: 'test',
      };

      if (!call.peer || !call.peer.instance) {
        fail('Peer instance should be initialized');
        return;
      }

      jest
        .spyOn(call.peer.instance, 'addIceCandidate')
        .mockRejectedValue(new Error('Invalid candidate'));

      // Should not throw
      expect(() => {
        call.handleMessage({
          method: VertoMethod.Candidate,
          params: candidate,
        });
      }).not.toThrow();
    });

    it('should call addIceCandidate even for invalid candidates (validation moved to _addIceCandidate)', () => {
      const invalidCandidates = [
        {
          candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54400 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        {
          candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54400 typ srflx',
          sdpMLineIndex: 0,
        },
        {
        },
      ];

      const addCandidateSpy = jest.spyOn(call.peer.instance, 'addIceCandidate');

      invalidCandidates.forEach((candidate) => {
        call.handleMessage({
          method: VertoMethod.Candidate,
          params: candidate,
        });
      });

      expect(addCandidateSpy).toHaveBeenCalledTimes(3);
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
    it('should send SDP immediately per RFC 8838 Trickle ICE requirements', () => {
      // Mock session execute to prevent actual WebSocket message sending
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ node_id: 'test-node' });

      const mockSdp = {
        type: 'offer' as RTCSdpType,
        sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-', // SDP without candidates
      };

      // Override localDescription getter
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => mockSdp,
        configurable: true,
      });

      // Simulate the actual flow: ICE candidate event triggers SDP sending when _initialSdpSent is false
      // This is the Trickle ICE behavior where SDP is sent immediately
      const candidateEvent = {
        type: 'icecandidate',
        candidate: {
          candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54400 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        target: call.peer.instance,
      } as unknown as RTCPeerConnectionIceEvent;

      call.peer.instance.onicecandidate(candidateEvent);

      // Should send SDP immediately without waiting for candidates (RFC 8838)
      expect(sessionExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.Invite,
            params: expect.objectContaining({
              sdp: mockSdp.sdp,
            }),
          }),
        })
      );
    });

    it('should send SDP with candidates immediately', () => {
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ node_id: 'test-node' });

      const mockSdpWithCandidates = {
        type: 'offer' as RTCSdpType,
        sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-',
      };

      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => mockSdpWithCandidates,
        configurable: true,
      });

      // Simulate ICE candidate event that triggers SDP sending with candidates already in SDP
      const candidateEventWithExistingCandidates = {
        type: 'icecandidate',
        candidate: {
          candidate: 'candidate:2 1 UDP 1694498814 192.168.1.2 54401 typ host',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        target: call.peer.instance,
      } as unknown as RTCPeerConnectionIceEvent;

      call.peer.instance.onicecandidate(candidateEventWithExistingCandidates);

      // Should send SDP immediately regardless of candidate presence
      expect(sessionExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.Invite,
            params: expect.objectContaining({
              sdp: mockSdpWithCandidates.sdp,
            }),
          }),
        })
      );
    });
  });

  describe('Trickle ICE parameter validation', () => {
    it('should send Invite with trickle: true when onicecandidate fires', () => {
      const sessionExecuteSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ node_id: 'test-node' });

      const mockSdp = {
        type: 'offer' as RTCSdpType,
        sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-',
      };

      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => mockSdp,
        configurable: true,
      });

      // Trigger onicecandidate event which should send Invite with trickle: true
      const candidateEvent = {
        candidate: {
          candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54400 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
        }
      } as RTCPeerConnectionIceEvent;

      call.peer.instance.onicecandidate(candidateEvent);

      // Verify that the Invite message was sent with trickle: true
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
        usernameFragment: 'test',
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
        (call as any)._onIce(event);
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
              usernameFragment: mockCandidate.usernameFragment,
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
          usernameFragment: 'test1',
        },
        {
          candidate: 'candidate:2 1 UDP 1694498815 203.0.113.1 54401 typ srflx',
          sdpMLineIndex: 0,
          sdpMid: '0',
          usernameFragment: 'test2',
        },
        {
          candidate: 'candidate:3 1 TCP 1006632447 198.51.100.1 9 typ relay',
          sdpMLineIndex: 0,
          sdpMid: '0',
          usernameFragment: 'test3',
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
        (call as any)._onIce(event);
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
                usernameFragment: expectedCandidate.usernameFragment,
              }),
            }),
          })
        );
      });
    });

    it('should handle ICE gathering completion', () => {
      // Mock session execute to capture messages
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

      // First simulate that initial SDP has been sent by triggering ICE candidate
      const initialCandidate = {
        type: 'icecandidate',
        candidate: {
          candidate:
            'candidate:setup 1 UDP 1694498810 192.168.1.4 54403 typ host',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
        target: call.peer.instance,
      } as unknown as RTCPeerConnectionIceEvent;

      call.peer.instance.onicecandidate(initialCandidate);

      sessionExecuteSpy.mockClear();

      // Set _initialSdpSent to true to simulate that SDP was sent
      (call as any)._initialSdpSent = true;

      // Mock ICE gathering state as complete
      Object.defineProperty(call.peer.instance, 'iceGatheringState', {
        value: 'complete',
        writable: true,
        configurable: true,
      });

      // Simulate ICE gathering state change event
      const stateChangeEvent = new Event('icegatheringstatechange');

      call.peer.instance.onicegatheringstatechange(stateChangeEvent);

      // Should mark performance and send end-of-candidates
      expect(global.performance.mark).toHaveBeenCalledWith('ice-gathering-end');
      expect(sessionExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.EndOfCandidates,
            params: expect.objectContaining({
              endOfCandidates: true,
            }),
          }),
        })
      );
    });
  });
});
