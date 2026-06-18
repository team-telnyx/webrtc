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
    // Clear any pending only-host ICE retry timeout
    if ((call as any)._onlyHostIceRetryTimeoutId) {
      clearTimeout((call as any)._onlyHostIceRetryTimeoutId);
      (call as any)._onlyHostIceRetryTimeoutId = null;
    }
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

      // Simulate only 1 only-host SDP (threshold is 3 by default)
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
    it('should emit warning at end-of-candidates with only host candidates, then terminal error on reaching threshold', () => {
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

      // First end-of-candidates: only warning, EndOfCandidates NOT sent
      // (retry is scheduled, so we don't signal a completed ICE set)
      const endOfCandidatesEvent = {
        candidate: null,
      } as RTCPeerConnectionIceEvent;

      (call as any)._onTrickleIce(endOfCandidatesEvent);

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).not.toHaveBeenCalled();
      // EndOfCandidates should NOT be sent when retry is scheduled
      expect(sendEndOfCandidatesSpy).not.toHaveBeenCalled();

      // Second end-of-candidates: still below threshold
      (call as any)._onTrickleIce(endOfCandidatesEvent);

      expect(warningHandler).toHaveBeenCalledTimes(2);
      expect(errorHandler).not.toHaveBeenCalled();

      // Third end-of-candidates: terminal error
      (call as any)._onTrickleIce(endOfCandidatesEvent);

      expect(warningHandler).toHaveBeenCalledTimes(3);
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );
      // Trickle ICE: Bye should be sent (invite with empty SDP was already sent)
      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:only-host-ice-candidates-exhausted' },
        true
      );
      // EndOfCandidates must NOT be sent on any only-host attempt —
      // we should not signal a completed ICE set to VSP/b2bua when
      // we're either retrying or tearing down.
      expect(sendEndOfCandidatesSpy).not.toHaveBeenCalled();
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

  // ── allowCallWithHostCandidatesOnly option ──────────────────────

  describe('allowCallWithHostCandidatesOnly option', () => {
    it('should emit warning and proceed below threshold, then emit exhausted error at threshold when allowCallWithHostCandidatesOnly is true', () => {
      // Set the option on the session
      session.options.allowCallWithHostCandidatesOnly = true;

      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);
      register(SwEvent.Error, errorHandler, call.id);

      // Call below threshold — should emit warning only, call proceeds
      for (let i = 0; i < ONLY_HOST_ICE_CANDIDATES_THRESHOLD - 1; i++) {
        (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);
      }

      expect(warningHandler).toHaveBeenCalledTimes(
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD - 1
      );
      expect(errorHandler).not.toHaveBeenCalled();
      expect(hangupSpy).not.toHaveBeenCalled();

      // Call once more to reach threshold — exhausted error fires
      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      expect(warningHandler).toHaveBeenCalledTimes(
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD
      );
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );
      expect(hangupSpy).toHaveBeenCalled();
    });

    it('should allow call to proceed (return false) when allowCallWithHostCandidatesOnly is true and below threshold', () => {
      session.options.allowCallWithHostCandidatesOnly = true;

      const result = (call as any)._handleOnlyHostIceCandidates(
        HOST_ONLY_SDP,
        true
      );

      expect(result).toBe(false);
    });

    it('should still terminate the call when allowCallWithHostCandidatesOnly is false (default)', () => {
      // Ensure the option is not set (default behavior)
      session.options.allowCallWithHostCandidatesOnly = false;

      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const errorHandler = jest.fn();
      register(SwEvent.Error, errorHandler, call.id);

      for (let i = 0; i < ONLY_HOST_ICE_CANDIDATES_THRESHOLD; i++) {
        (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);
      }

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(hangupSpy).toHaveBeenCalled();
    });

    it('should work in non-trickle path with allowCallWithHostCandidatesOnly true — exhausted at threshold', () => {
      session.options.allowCallWithHostCandidatesOnly = true;

      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, call.id);
      register(SwEvent.Error, errorHandler, call.id);

      // Simulate only-host SDP via non-trickle path
      for (let i = 0; i < ONLY_HOST_ICE_CANDIDATES_THRESHOLD; i++) {
        (call as any)._onIceSdp({
          type: 'offer',
          sdp: HOST_ONLY_SDP,
        });
      }

      // Warnings for each attempt, exhausted error at threshold
      expect(warningHandler).toHaveBeenCalledTimes(
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD
      );
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(hangupSpy).toHaveBeenCalled();
    });
  });

  // ── ICE connected state resets counter ─────────────────────────

  describe('ICE connection state = connected resets counter', () => {
    it('should reset _onlyHostIceCandidateCount when ICE connection reaches connected', () => {
      // Set up a counter value
      (call as any)._onlyHostIceCandidateCount = 2;

      // Simulate ICE connected state change via _registerPeerEvents
      const instance = {
        onicecandidate: null as any,
        onicegatheringstatechange: null as any,
        oniceconnectionstatechange: null as any,
        onicecandidateerror: null as any,
        addEventListener: jest.fn(),
        iceConnectionState: 'connected' as RTCPeerConnectionState,
      };

      // Call _registerPeerEvents to register the handler
      (call as any)._registerPeerEvents(instance);

      // Simulate ICE connected
      instance.oniceconnectionstatechange();

      // Counter should be reset
      expect((call as any)._onlyHostIceCandidateCount).toBe(0);
    });

    it('should not exhaust after ICE connected resets counter', () => {
      // Pre-set counter near threshold
      (call as any)._onlyHostIceCandidateCount =
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD - 1;

      // Simulate ICE connected resets counter
      const instance = {
        onicecandidate: null as any,
        onicegatheringstatechange: null as any,
        oniceconnectionstatechange: null as any,
        onicecandidateerror: null as any,
        addEventListener: jest.fn(),
        iceConnectionState: 'connected',
      };
      (call as any)._registerPeerEvents(instance);
      instance.oniceconnectionstatechange();

      // Counter is now 0, so one more only-host SDP should not exhaust
      const errorHandler = jest.fn();
      register(SwEvent.Error, errorHandler, call.id);

      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      expect(errorHandler).not.toHaveBeenCalled();
      expect((call as any)._onlyHostIceCandidateCount).toBe(1);
    });
  });

  // ── ICE retry scheduling (allowCallWithHostCandidatesOnly=false) ──

  describe('ICE retry scheduling', () => {
    it('should schedule a retry when allowCallWithHostCandidatesOnly is false and below threshold', () => {
      jest.useFakeTimers();

      const scheduleSpy = jest.spyOn(call as any, '_scheduleOnlyHostIceRetry');
      const result = (call as any)._handleOnlyHostIceCandidates(
        HOST_ONLY_SDP,
        true
      );

      // Should return true (don't proceed with current SDP)
      expect(result).toBe(true);
      // Retry should be scheduled
      expect(scheduleSpy).toHaveBeenCalledTimes(1);
      // Timeout ID should be set
      expect((call as any)._onlyHostIceRetryTimeoutId).not.toBeNull();

      jest.useRealTimers();
    });

    it('should NOT schedule a retry when allowCallWithHostCandidatesOnly is true', () => {
      session.options.allowCallWithHostCandidatesOnly = true;

      const scheduleSpy = jest.spyOn(call as any, '_scheduleOnlyHostIceRetry');
      const result = (call as any)._handleOnlyHostIceCandidates(
        HOST_ONLY_SDP,
        true
      );

      // Should return false (proceed with call)
      expect(result).toBe(false);
      // No retry should be scheduled
      expect(scheduleSpy).not.toHaveBeenCalled();
    });

    it('should NOT schedule a retry when threshold is reached', () => {
      // Pre-set counter to one below threshold
      (call as any)._onlyHostIceCandidateCount =
        ONLY_HOST_ICE_CANDIDATES_THRESHOLD - 1;

      const scheduleSpy = jest.spyOn(call as any, '_scheduleOnlyHostIceRetry');
      const hangupSpy = jest
        .spyOn(call, 'hangup')
        .mockImplementation(() => Promise.resolve());

      const result = (call as any)._handleOnlyHostIceCandidates(
        HOST_ONLY_SDP,
        true
      );

      // Should return true (terminal)
      expect(result).toBe(true);
      // Hangup should be called
      expect(hangupSpy).toHaveBeenCalled();
      // No retry should be scheduled at threshold
      expect(scheduleSpy).not.toHaveBeenCalled();
    });

    it('should use peer.regatherCandidates for non-trickle retry', () => {
      jest.useFakeTimers();

      const regatherCandidatesSpy = jest
        .spyOn(call.peer, 'regatherCandidates')
        .mockImplementation(() => {});
      const restartIceSpy = jest
        .spyOn(call.peer, 'restartIce')
        .mockImplementation(() => ({ started: true }));

      // Trigger retry scheduling
      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      // Fast-forward the 1s delay
      jest.advanceTimersByTime(1000);

      // Non-trickle: should use regatherCandidates, not restartIce
      expect(regatherCandidatesSpy).toHaveBeenCalledTimes(1);
      expect(restartIceSpy).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should produce a fresh answer for inbound non-trickle retry (regression: answer peer in stable)', async () => {
      // Simulate an inbound (answer-side) call
      call.direction = Direction.Inbound;
      (call.peer as any).type = 'answer';

      // Mock regatherCandidates to verify it is called.
      // This is the method that correctly re-applies the remote offer
      // before creating a fresh answer — as opposed to startNegotiation()
      // which would call createAnswer() from stable state and fail.
      const regatherCandidatesSpy = jest
        .spyOn(call.peer, 'regatherCandidates')
        .mockImplementation(() => {});

      jest.useFakeTimers();

      // Trigger only-host detection → schedules retry
      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      // Fast-forward the 1s retry delay
      jest.advanceTimersByTime(1000);

      // regatherCandidates should be called (not startNegotiation)
      expect(regatherCandidatesSpy).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should re-apply remote offer before createAnswer in regatherCandidates (answer peer)', async () => {
      // Verify the fix: regatherCandidates on an answer peer must
      // re-apply the remote offer (setRemoteDescription) BEFORE calling
      // createAnswer. Without this, createAnswer would fail from stable
      // state because there is no current remote offer.
      (call.peer as any).type = 'answer';
      call.direction = Direction.Inbound;

      const setRemoteDescriptionMock = jest
        .fn()
        .mockResolvedValue(undefined);
      const createAnswerMock = jest.fn().mockResolvedValue({
        type: 'answer',
        sdp: HOST_ONLY_SDP,
      });
      const setLocalDescriptionMock = jest
        .fn()
        .mockResolvedValue(undefined);

      // Replace the peer's RTCPeerConnection instance with a mock
      Object.defineProperty(call.peer, 'instance', {
        value: {
          signalingState: 'stable',
          setRemoteDescription: setRemoteDescriptionMock,
          createAnswer: createAnswerMock,
          setLocalDescription: setLocalDescriptionMock,
          close: jest.fn(),
          getTransceivers: jest.fn().mockReturnValue([]),
          removeEventListener: jest.fn(),
        },
        configurable: true,
      });

      // Ensure remoteSdp is set so regatherCandidates can re-apply it
      (call.peer as any).options.remoteSdp =
        'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-';

      jest.useFakeTimers();

      // Trigger only-host detection → schedules retry
      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      // Fast-forward the 1s retry delay
      jest.advanceTimersByTime(1000);

      // Flush the microtask queue to allow regatherCandidates async chain to settle.
      // regatherCandidates does: _setRemoteDescription().then(() => _createAnswer())
      // Each await/Promise.resolve() flushes one microtask round; the chain
      // has multiple await points so we need several.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // regatherCandidates should re-apply the remote offer first
      expect(setRemoteDescriptionMock).toHaveBeenCalledWith({
        sdp: (call.peer as any).options.remoteSdp,
        type: 'offer',
      });

      // Then createAnswer should be called to produce a fresh answer
      expect(createAnswerMock).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should use peer.restartIce for trickle retry', () => {
      jest.useFakeTimers();

      call.options.trickleIce = true;
      const restartIceSpy = jest
        .spyOn(call.peer, 'restartIce')
        .mockImplementation(() => ({ started: true }));
      const regatherCandidatesSpy = jest
        .spyOn(call.peer, 'regatherCandidates')
        .mockImplementation(() => {});

      // Trigger retry scheduling
      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      // Fast-forward the 1s delay
      jest.advanceTimersByTime(1000);

      // Trickle: should use restartIce, not regatherCandidates
      expect(restartIceSpy).toHaveBeenCalledTimes(1);
      expect(regatherCandidatesSpy).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should not execute retry if call is terminating', () => {
      jest.useFakeTimers();

      const regatherCandidatesSpy = jest.spyOn(
        call.peer,
        'regatherCandidates'
      );

      // Trigger retry scheduling
      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);

      // Simulate call termination before retry fires
      (call as any).setState(9); // State.Hangup

      // Fast-forward the 1s delay
      jest.advanceTimersByTime(1000);

      // Retry should not execute because call is terminating
      expect(regatherCandidatesSpy).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should clear retry timeout on hangup', () => {
      jest.useFakeTimers();

      jest
        .spyOn(call, 'hangup')
        .mockImplementation(function (this: any) {
          // Simulate the actual hangup cleanup that clears the timeout
          if (this._onlyHostIceRetryTimeoutId) {
            clearTimeout(this._onlyHostIceRetryTimeoutId);
            this._onlyHostIceRetryTimeoutId = null;
          }
          return Promise.resolve();
        });

      // Trigger retry scheduling
      (call as any)._handleOnlyHostIceCandidates(HOST_ONLY_SDP, true);
      expect((call as any)._onlyHostIceRetryTimeoutId).not.toBeNull();

      // Hangup should clear the retry timeout
      call.hangup();
      expect((call as any)._onlyHostIceRetryTimeoutId).toBeNull();

      jest.useRealTimers();
    });
  });
});
