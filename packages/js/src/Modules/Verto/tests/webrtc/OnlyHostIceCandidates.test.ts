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
import { Direction } from '../../webrtc/constants';

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

    it('should emit terminal error and hangup WITHOUT sending Bye when outbound non-trickle only-host SDP reaches threshold', () => {
      // Outbound + non-trickle + no ICE restart → sendBye = false
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

      // Outbound non-trickle: Bye should NOT be sent (invite wasn't sent yet)
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        false
      );
    });

    it('should emit terminal error and hangup WITH sending Bye when inbound only-host SDP reaches threshold', () => {
      // Inbound → sendBye = true
      call.direction = Direction.Inbound;
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const errorHandler = jest.fn();
      register(SwEvent.Error, errorHandler, call.id);

      for (let i = 0; i < ONLY_HOST_ICE_CANDIDATES_THRESHOLD; i++) {
        (call as any)._onIceSdp({
          type: 'answer',
          sdp: HOST_ONLY_SDP,
        });
      }

      expect(errorHandler).toHaveBeenCalledTimes(1);
      // Inbound: Bye SHOULD be sent (backend knows about the call)
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        true
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

  describe('Trickle ICE (_handleOnlyHostIceCandidates via _onTrickleIce)', () => {
    it('should emit warning at end-of-candidates when only host candidates were gathered', () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);

      // Set up localDescription with only host candidates
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: HOST_ONLY_SDP }),
        configurable: true,
      });

      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler.mock.calls[0][0].warning.code).toBe(
        ONLY_HOST_ICE_CANDIDATES
      );
    });

    it('should emit terminal error and hangup WITH sending Bye when only-host trickle candidates reach threshold', () => {
      // Trickle ICE always sends Bye because invite with empty SDP was already sent
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const errorHandler = jest.fn();
      register(SwEvent.Error, errorHandler, call.id);

      // Simulate reaching the threshold
      for (let i = 0; i < ONLY_HOST_ICE_CANDIDATES_THRESHOLD; i++) {
        (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);
      }

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );
      // Trickle: Bye SHOULD be sent (invite with empty SDP was already sent)
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        true
      );
    });

    it('should not emit warning or error when SDP has non-host candidates', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);
      register(SwEvent.Error, errorHandler, call.id);

      (call as any)._handleOnlyHostIceCandidates(SDP_WITH_SRFLX, true);

      expect(warningHandler).not.toHaveBeenCalled();
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should not emit warning or error when SDP has no candidates', () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);

      const NO_CANDIDATE_SDP = ['v=0', 'o=- 1 2 IN IP4 127.0.0.1', 's=-'].join(
        '\r\n'
      );

      // _handleOnlyHostIceCandidates with no-candidate SDP:
      // HAS_NON_HOST_ICE_CANDIDATE_REGEX will NOT match (no srflx/prflx/relay),
      // so it will be treated as only-host. This is correct behavior —
      // the empty-candidate check is done by the caller before invoking
      // this method.
      (call as any)._handleOnlyHostIceCandidates(NO_CANDIDATE_SDP, true);

      // Empty SDP is treated as only-host (warning emitted)
      expect(warningHandler).toHaveBeenCalledTimes(1);
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
      const sendEndOfCandidatesSpy = jest.spyOn(
        call as any,
        '_sendEndOfCandidates'
      );
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);
      register(SwEvent.Error, errorHandler, call.id);

      // Set up localDescription with only host candidates
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: HOST_ONLY_SDP }),
        configurable: true,
      });

      // First end-of-candidates: only warning, EndOfCandidates IS sent
      const endOfCandidatesEvent = {
        candidate: null,
      } as RTCPeerConnectionIceEvent;

      (call as any)._onTrickleIce(endOfCandidatesEvent);

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).not.toHaveBeenCalled();
      // EndOfCandidates should be sent for the non-terminal first attempt
      expect(sendEndOfCandidatesSpy).toHaveBeenCalledTimes(1);

      // Second end-of-candidates: terminal error
      (call as any)._onTrickleIce(endOfCandidatesEvent);

      expect(warningHandler).toHaveBeenCalledTimes(2);
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );
      // Trickle ICE: Bye should be sent (invite with empty SDP was already sent)
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        true
      );
      // EndOfCandidates must NOT be sent on the terminal attempt —
      // we should not signal a completed ICE set to VSP/b2bua right
      // before SDK teardown.
      expect(sendEndOfCandidatesSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT send EndOfCandidates when terminal only-host threshold is reached', () => {
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const sendEndOfCandidatesSpy = jest.spyOn(
        call as any,
        '_sendEndOfCandidates'
      );

      // Set up localDescription with only host candidates
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: HOST_ONLY_SDP }),
        configurable: true,
      });

      // Pre-set the counter to one below threshold
      (call as any)._onlyHostIceCandidateCount =
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD - 1;

      // End-of-candidates triggers the terminal hangup
      const endOfCandidatesEvent = {
        candidate: null,
      } as RTCPeerConnectionIceEvent;

      (call as any)._onTrickleIce(endOfCandidatesEvent);

      // hangup should have been called with sendBye=true for trickle
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        true
      );
      // EndOfCandidates must NOT have been sent
      expect(sendEndOfCandidatesSpy).not.toHaveBeenCalled();
    });

    it('should send EndOfCandidates when non-host candidates are present', () => {
      const sendEndOfCandidatesSpy = jest.spyOn(
        call as any,
        '_sendEndOfCandidates'
      );

      // Set up localDescription with srflx candidate
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: SDP_WITH_SRFLX }),
        configurable: true,
      });

      const endOfCandidatesEvent = {
        candidate: null,
      } as RTCPeerConnectionIceEvent;

      (call as any)._onTrickleIce(endOfCandidatesEvent);

      // EndOfCandidates should be sent when non-host candidates exist
      expect(sendEndOfCandidatesSpy).toHaveBeenCalledTimes(1);
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

    it('should send EndOfCandidates when localDescription has no candidates', () => {
      const sendEndOfCandidatesSpy = jest.spyOn(
        call as any,
        '_sendEndOfCandidates'
      );

      // Set up localDescription with SDP that has no candidates
      const NO_CANDIDATE_SDP = ['v=0', 'o=- 1 2 IN IP4 127.0.0.1', 's=-'].join(
        '\r\n'
      );
      Object.defineProperty(call.peer.instance, 'localDescription', {
        get: () => ({ type: 'offer', sdp: NO_CANDIDATE_SDP }),
        configurable: true,
      });

      const endOfCandidatesEvent = {
        candidate: null,
      } as RTCPeerConnectionIceEvent;

      (call as any)._onTrickleIce(endOfCandidatesEvent);

      // EndOfCandidates should be sent when there are no candidates in the SDP
      expect(sendEndOfCandidatesSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── _handleOnlyHostIceCandidates shared method ───────────────────

  describe('_handleOnlyHostIceCandidates sendBye logic', () => {
    it('should pass sendBye=false for outbound non-trickle (invite not sent yet)', () => {
      // Default test setup: outbound + non-trickle (no trickleIce option)
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());

      // Pre-set counter so one call triggers exhaustion
      (call as any)._onlyHostIceCandidateCount =
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD - 1;

      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, false);

      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        false
      );
    });

    it('should pass sendBye=true for inbound calls (backend knows about call)', () => {
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());

      // Pre-set counter so one call triggers exhaustion
      (call as any)._onlyHostIceCandidateCount =
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD - 1;

      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        true
      );
    });

    it('should pass sendBye=true for trickle ICE (invite with empty SDP already sent)', () => {
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());

      // Pre-set counter so one call triggers exhaustion
      (call as any)._onlyHostIceCandidateCount =
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD - 1;

      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        true
      );
    });
  });
});
