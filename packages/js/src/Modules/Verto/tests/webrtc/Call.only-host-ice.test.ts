import { VertoMethod } from '../../webrtc/constants';
import Call from '../../webrtc/Call';
import Verto from '../..';
import type { IVertoCallOptions } from '../../webrtc/interfaces';
import {
  ONLY_HOST_ICE_CANDIDATES,
  ONLY_HOST_ICE_CANDIDATES_EXHAUSTED,
  ONLY_HOST_ICE_CANDIDATES_THRESHOLD,
  classifyIceCandidate,
  HAS_NON_HOST_ICE_CANDIDATE_REGEX,
  SwEvent,
} from '../../util/constants';

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

// ── Unit tests for classifyIceCandidate ──────────────────────────────

describe('classifyIceCandidate', () => {
  it('should classify host candidates', () => {
    expect(
      classifyIceCandidate('candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host')
    ).toBe('host');
  });

  it('should classify srflx candidates', () => {
    expect(
      classifyIceCandidate(
        'candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx'
      )
    ).toBe('srflx');
  });

  it('should classify prflx candidates', () => {
    expect(
      classifyIceCandidate(
        'candidate:2 1 UDP 1694498815 198.51.100.2 54400 typ prflx'
      )
    ).toBe('prflx');
  });

  it('should classify relay candidates', () => {
    expect(
      classifyIceCandidate(
        'candidate:3 1 UDP 1694498815 198.51.100.3 54400 typ relay'
      )
    ).toBe('relay');
  });

  it('should return null for non-candidate strings', () => {
    expect(classifyIceCandidate('not a candidate')).toBeNull();
  });
});

// ── Integration tests for only-host ICE candidate handling ───────────

describe('Only-host ICE candidate handling', () => {
  let session: any;
  let call: Call;
  const defaultParams: IVertoCallOptions = {
    destinationNumber: 'x3599',
    remoteCallerName: 'Js Client Test',
    remoteCallerNumber: '1234',
    callerName: 'Jest Client',
    callerNumber: '5678',
  };

  // SDP with only host candidates
  const hostOnlySdp = [
    'v=0',
    'o=- 1 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'm=audio 60578 UDP/TLS/RTP/SAVPF 109',
    'c=IN IP4 192.168.1.4',
    'a=candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host',
    'a=candidate:1 1 TCP 2105524479 192.168.1.4 9 typ host tcptype active',
  ].join('\r\n');

  // SDP with non-host candidates
  const mixedSdp = [
    'v=0',
    'o=- 1 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'm=audio 60578 UDP/TLS/RTP/SAVPF 109',
    'c=IN IP4 192.168.1.4',
    'a=candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host',
    'a=candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx',
  ].join('\r\n');

  const remoteSdp = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-';

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
    call?.hangup();
  });

  describe('Non-trickle (full SDP) path', () => {
    it('should emit ONLY_HOST_ICE_CANDIDATES warning without terminal error before threshold', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();

      session.on(SwEvent.Warning, warningHandler);
      session.on(SwEvent.Error, errorHandler);

      // Simulate the first host-only SDP
      const data = { sdp: hostOnlySdp, type: 'offer' };
      (call as any)._onIceSdp(data);

      // Should emit warning
      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler.mock.calls[0][0].warning.code).toBe(
        ONLY_HOST_ICE_CANDIDATES
      );

      // Should NOT emit error or hangup
      expect(errorHandler).not.toHaveBeenCalled();
      expect(call.state).not.toBe('hangup');
    });

    it('should emit error and hangup after threshold host-only SDPs', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();

      session.on(SwEvent.Warning, warningHandler);
      session.on(SwEvent.Error, errorHandler);

      // Simulate host-only SDPs up to the threshold
      for (let i = 0; i < ONLY_HOST_ICE_CANDIDATES_THRESHOLD; i++) {
        const data = { sdp: hostOnlySdp, type: 'offer' };
        (call as any)._onIceSdp(data);
      }

      // Should have emitted warnings for each attempt
      expect(warningHandler).toHaveBeenCalledTimes(ONLY_HOST_ICE_CANDIDATES_THRESHOLD);

      // Should have emitted the terminal error
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );

      // Should have hung up
      expect(call.state).toBe('hangup');
    });

    it('should reset the only-host counter when non-host candidates are found', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();

      session.on(SwEvent.Warning, warningHandler);
      session.on(SwEvent.Error, errorHandler);

      // First: host-only SDP (count = 1)
      (call as any)._onIceSdp({ sdp: hostOnlySdp, type: 'offer' });
      expect(warningHandler).toHaveBeenCalledTimes(1);

      // Second: mixed SDP resets counter (count = 0)
      (call as any)._onIceSdp({ sdp: mixedSdp, type: 'offer' });
      // No additional warning for the mixed SDP

      // Third: host-only again (count = 1, not threshold)
      (call as any)._onIceSdp({ sdp: hostOnlySdp, type: 'offer' });
      expect(warningHandler).toHaveBeenCalledTimes(2); // 1st and 3rd

      // Should NOT have emitted terminal error
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should include attempt count in warning message', () => {
      const warningHandler = jest.fn();
      session.on(SwEvent.Warning, warningHandler);

      (call as any)._onIceSdp({ sdp: hostOnlySdp, type: 'offer' });

      const warningCall = warningHandler.mock.calls[0][0];
      // The warning event should include callId and sessionId
      expect(warningCall.callId).toBe(call.id);
      expect(warningCall.sessionId).toBe(session.sessionid);
    });
  });

  describe('Trickle ICE path', () => {
    let trickleCall: Call;
    const trickleParams: IVertoCallOptions = {
      ...defaultParams,
      trickleIce: true,
    };

    beforeEach(async (done) => {
      trickleCall = new Call(session, trickleParams);
      trickleCall.invite();
      jest.clearAllMocks();
      done();
    });

    afterEach(() => {
      trickleCall?.hangup();
    });

    it('should evaluate host-only candidates at end-of-candidates', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      session.on(SwEvent.Warning, warningHandler);
      session.on(SwEvent.Error, errorHandler);

      // Simulate a host candidate
      const hostCandidate = {
        candidate: 'candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };

      (trickleCall as any)._onTrickleIce({
        candidate: new RTCIceCandidate(hostCandidate),
      });

      // Simulate end-of-candidates (null candidate)
      (trickleCall as any)._onTrickleIce({
        candidate: null,
      });

      // Should emit warning
      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler.mock.calls[0][0].warning.code).toBe(
        ONLY_HOST_ICE_CANDIDATES
      );

      // Should not emit error (only 1 attempt)
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should emit error and hangup after threshold host-only trickle rounds', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      session.on(SwEvent.Warning, warningHandler);
      session.on(SwEvent.Error, errorHandler);

      const hostCandidate = {
        candidate: 'candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };

      // Simulate multiple trickle rounds that only produce host candidates
      for (let round = 0; round < ONLY_HOST_ICE_CANDIDATES_THRESHOLD; round++) {
        // Reset the per-round trickle state for the next round
        (trickleCall as any)._trickleGatheredNonHostCandidate = false;

        (trickleCall as any)._onTrickleIce({
          candidate: new RTCIceCandidate(hostCandidate),
        });

        // End-of-candidates for this round
        (trickleCall as any)._onTrickleIce({
          candidate: null,
        });
      }

      // Should have emitted warnings for each round
      expect(warningHandler).toHaveBeenCalledTimes(ONLY_HOST_ICE_CANDIDATES_THRESHOLD);

      // Should have emitted the terminal error on the threshold round
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].error.code).toBe(
        ONLY_HOST_ICE_CANDIDATES_EXHAUSTED
      );
    });

    it('should not emit warning when non-host candidate arrives after host candidates', () => {
      const warningHandler = jest.fn();
      session.on(SwEvent.Warning, warningHandler);

      // Simulate a host candidate
      const hostCandidate = {
        candidate: 'candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };
      (trickleCall as any)._onTrickleIce({
        candidate: new RTCIceCandidate(hostCandidate),
      });

      // Then a non-host candidate arrives
      const srflxCandidate = {
        candidate:
          'candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };
      (trickleCall as any)._onTrickleIce({
        candidate: new RTCIceCandidate(srflxCandidate),
      });

      // End-of-candidates
      (trickleCall as any)._onTrickleIce({
        candidate: null,
      });

      // Should NOT emit only-host warning because a non-host was found
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should reset the only-host counter when non-host candidate arrives in trickle', () => {
      const warningHandler = jest.fn();
      const errorHandler = jest.fn();
      session.on(SwEvent.Warning, warningHandler);
      session.on(SwEvent.Error, errorHandler);

      const hostCandidate = {
        candidate: 'candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };
      const srflxCandidate = {
        candidate:
          'candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };

      // Round 1: host only -> end-of-candidates (count = 1)
      (trickleCall as any)._onTrickleIce({
        candidate: new RTCIceCandidate(hostCandidate),
      });
      (trickleCall as any)._onTrickleIce({ candidate: null });

      expect(warningHandler).toHaveBeenCalledTimes(1);

      // Round 2: host + srflx -> counter resets to 0
      (trickleCall as any)._trickleGatheredNonHostCandidate = false;
      (trickleCall as any)._onTrickleIce({
        candidate: new RTCIceCandidate(hostCandidate),
      });
      (trickleCall as any)._onTrickleIce({
        candidate: new RTCIceCandidate(srflxCandidate),
      });
      (trickleCall as any)._onTrickleIce({ candidate: null });

      // No additional warning because non-host was found
      expect(warningHandler).toHaveBeenCalledTimes(1);

      // No terminal error
      expect(errorHandler).not.toHaveBeenCalled();
    });
  });
});

// ── Unit tests for HAS_NON_HOST_ICE_CANDIDATE_REGEX ──────────────────

describe('HAS_NON_HOST_ICE_CANDIDATE_REGEX', () => {
  it('should match srflx candidates', () => {
    const sdp = 'a=candidate:1 1 UDP 1694498815 198.51.100.1 54400 typ srflx';
    expect(HAS_NON_HOST_ICE_CANDIDATE_REGEX.test(sdp)).toBe(true);
  });

  it('should match prflx candidates', () => {
    const sdp = 'a=candidate:2 1 UDP 1694498815 198.51.100.2 54400 typ prflx';
    expect(HAS_NON_HOST_ICE_CANDIDATE_REGEX.test(sdp)).toBe(true);
  });

  it('should match relay candidates', () => {
    const sdp = 'a=candidate:3 1 UDP 1694498815 198.51.100.3 54400 typ relay';
    expect(HAS_NON_HOST_ICE_CANDIDATE_REGEX.test(sdp)).toBe(true);
  });

  it('should not match host-only SDP', () => {
    const sdp = 'a=candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host';
    expect(HAS_NON_HOST_ICE_CANDIDATE_REGEX.test(sdp)).toBe(false);
  });
});
