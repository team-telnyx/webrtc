/* eslint-disable @typescript-eslint/no-explicit-any */
import { register, deRegister } from '../../services/Handler';
import {
  SwEvent,
  ONLY_HOST_ICE_CANDIDATES,
  ONLY_HOST_ICE_CANDIDATES_EXHAUSTED,
  ONLY_HOST_ICE_CANDIDATES_THRESHOLD,
} from '../../util/constants';
import Call from '../../webrtc/Call';
import Verto from '../..';
import type { IVertoCallOptions } from '../../webrtc/interfaces';

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

// SDP with only host candidates
const HOST_ONLY_SDP = [
  'v=0',
  'o=- 1 2 IN IP4 127.0.0.1',
  's=-',
  'a=candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host',
  'a=candidate:2 1 UDP 2113667327 192.168.1.2 54401 typ host',
].join('\r\n');

// SDP with non-host candidates
const SDP_WITH_SRFLX = [
  'v=0',
  'o=- 1 2 IN IP4 127.0.0.1',
  's=-',
  'a=candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host',
  'a=candidate:2 1 UDP 1694498815 203.0.113.1 54401 typ srflx',
].join('\r\n');

describe('Only-host ICE candidates exhaustion', () => {
  let session: any;
  let call: Call;
  const defaultParams: IVertoCallOptions = {
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
    call.invite();
    jest.clearAllMocks();
    done();
  });

  afterEach(() => {
    deRegister(SwEvent.Warning);
    deRegister(SwEvent.Error);
  });

  // ── Non-trickle path ──────────────────────────────────────────────

  describe('Non-trickle ICE (_onIceSdp)', () => {
    it('should emit ONLY_HOST_ICE_CANDIDATES warning but NOT the terminal error on the first only-host SDP', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);
      register(SwEvent.Error, errorHandler, call.id);

      // Simulate first only-host SDP
      (call as any)._onIceSdp({
        type: 'offer',
        sdp: HOST_ONLY_SDP,
      });

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler.mock.calls[0][0].warning.code).toBe(
        ONLY_HOST_ICE_CANDIDATES
      );

      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should emit terminal error and hangup when only-host SDP is seen ONLY_HOST_ICE_CANDIDATES_THRESHOLD times', () => {
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);
      register(SwEvent.Error, errorHandler, call.id);

      // Simulate only-host SDP up to the threshold
      for (let i = 0; i < ONLY_HOST_ICE_CANDIDATES_THRESHOLD; i++) {
        (call as any)._onIceSdp({
          type: 'offer',
          sdp: HOST_ONLY_SDP,
        });
      }

      // Warning should have been emitted for each attempt
      expect(warningHandler).toHaveBeenCalledTimes(
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD
      );

      // Terminal error should have been emitted once
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );

      // Hangup should have been called with the SDK initiator
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        false
      );
    });

    it('should not emit terminal error if only-host count is below threshold', () => {
      const errorHandler = jest.fn();
      register(SwEvent.Error, errorHandler, call.id);

      // Simulate only 1 only-host SDP (threshold is 2 by default)
      (call as any)._onIceSdp({
        type: 'offer',
        sdp: HOST_ONLY_SDP,
      });

      expect(errorHandler).not.toHaveBeenCalled();
      expect((call as any)._onlyHostIceCandidateCount).toBe(1);
    });

    it('should reset the only-host counter when a non-host candidate SDP is seen', () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);

      // First: only-host SDP
      (call as any)._onIceSdp({
        type: 'offer',
        sdp: HOST_ONLY_SDP,
      });

      expect((call as any)._onlyHostIceCandidateCount).toBe(1);

      // Second: SDP with srflx — should reset counter
      (call as any)._onIceSdp({
        type: 'offer',
        sdp: SDP_WITH_SRFLX,
      });

      expect((call as any)._onlyHostIceCandidateCount).toBe(0);

      // Third: only-host again — counter should be 1, not 2
      (call as any)._onIceSdp({
        type: 'offer',
        sdp: HOST_ONLY_SDP,
      });

      expect((call as any)._onlyHostIceCandidateCount).toBe(1);
      // Only 2 warnings (not terminal error)
      expect(warningHandler).toHaveBeenCalledTimes(2);
    });
  });

  // ── Trickle path ─────────────────────────────────────────────────

  describe('Trickle ICE (_checkOnlyHostIceCandidatesTrickle)', () => {
    it('should emit warning at end-of-candidates when only host candidates were gathered', () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);

      // Set up localDescription with only host candidates
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: HOST_ONLY_SDP }),
        configurable: true,
      });

      (call as any)._checkOnlyHostIceCandidatesTrickle();

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler.mock.calls[0][0].warning.code).toBe(
        ONLY_HOST_ICE_CANDIDATES
      );
    });

    it('should emit terminal error and hangup when only-host trickle candidates reach threshold', () => {
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const errorHandler = jest.fn();
      register(SwEvent.Error, errorHandler, call.id);

      // Set up localDescription with only host candidates
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: HOST_ONLY_SDP }),
        configurable: true,
      });

      // Simulate reaching the threshold
      for (let i = 0; i < ONLY_HOST_ICE_CANDIDATES_THRESHOLD; i++) {
        (call as any)._checkOnlyHostIceCandidatesTrickle();
      }

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        false
      );
    });

    it('should not emit warning or error when local SDP has non-host candidates', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);
      register(SwEvent.Error, errorHandler, call.id);

      // Set up localDescription with srflx candidate
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: SDP_WITH_SRFLX }),
        configurable: true,
      });

      (call as any)._checkOnlyHostIceCandidatesTrickle();

      expect(warningHandler).not.toHaveBeenCalled();
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should not emit warning or error when localDescription is null', () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);

      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => null,
        configurable: true,
      });

      (call as any)._checkOnlyHostIceCandidatesTrickle();

      expect(warningHandler).not.toHaveBeenCalled();
    });
  });

  // ── _trackCandidateMarks resets counter ──────────────────────────

  describe('_trackCandidateMarks counter reset', () => {
    it('should reset the only-host counter when a non-host candidate is tracked', () => {
      (call as any)._onlyHostIceCandidateCount = 1;

      const srflxCandidate = {
        candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54401 typ srflx',
        sdpMLineIndex: 0,
        sdpMid: '0',
      } as RTCIceCandidate;

      (call as any)._trackCandidateMarks(srflxCandidate);

      expect((call as any)._onlyHostIceCandidateCount).toBe(0);
    });

    it('should NOT reset the only-host counter when a host candidate is tracked', () => {
      (call as any)._onlyHostIceCandidateCount = 1;

      const hostCandidate = {
        candidate: 'candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0',
      } as RTCIceCandidate;

      (call as any)._trackCandidateMarks(hostCandidate);

      expect((call as any)._onlyHostIceCandidateCount).toBe(1);
    });

    it('should reset the only-host counter for relay candidates', () => {
      (call as any)._onlyHostIceCandidateCount = 1;

      const relayCandidate = {
        candidate: 'candidate:1 1 TCP 1006632447 198.51.100.1 9 typ relay',
        sdpMLineIndex: 0,
        sdpMid: '0',
      } as RTCIceCandidate;

      (call as any)._trackCandidateMarks(relayCandidate);

      expect((call as any)._onlyHostIceCandidateCount).toBe(0);
    });

    it('should reset the only-host counter for prflx candidates', () => {
      (call as any)._onlyHostIceCandidateCount = 1;

      const prflxCandidate = {
        candidate: 'candidate:1 1 UDP 12345 10.0.0.1 54400 typ prflx',
        sdpMLineIndex: 0,
        sdpMid: '0',
      } as RTCIceCandidate;

      (call as any)._trackCandidateMarks(prflxCandidate);

      expect((call as any)._onlyHostIceCandidateCount).toBe(0);
    });
  });

  // ── End-to-end trickle flow ──────────────────────────────────────

  describe('Trickle ICE end-of-candidates flow', () => {
    it('should emit warning at end-of-candidates with only host candidates, then terminal error on second gathering', () => {
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);
      register(SwEvent.Error, errorHandler, call.id);

      // Set up localDescription with only host candidates
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: HOST_ONLY_SDP }),
        configurable: true,
      });

      // First end-of-candidates: only warning
      const endOfCandidatesEvent = {
        candidate: null,
      } as RTCPeerConnectionIceEvent;

      (call as any)._onTrickleIce(endOfCandidatesEvent);

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).not.toHaveBeenCalled();

      // Second end-of-candidates: terminal error
      (call as any)._onTrickleIce(endOfCandidatesEvent);

      expect(warningHandler).toHaveBeenCalledTimes(2);
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        false
      );
    });

    it('should reset counter when a non-host candidate arrives after host candidates in trickle', () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);

      // Set up so only-host count is 1 (from a previous gathering)
      (call as any)._onlyHostIceCandidateCount = 1;

      // A non-host candidate arrives
      const srflxCandidate = {
        candidate: 'candidate:1 1 UDP 1694498815 203.0.113.1 54401 typ srflx',
        sdpMLineIndex: 0,
        sdpMid: '0',
      } as RTCIceCandidate;

      (call as any)._trackCandidateMarks(srflxCandidate);

      // Counter should be reset
      expect((call as any)._onlyHostIceCandidateCount).toBe(0);
    });
  });
});
