/**
 * Unit tests for dead call cleanup (VSDK-194)
 *
 * Tests idempotent cleanup behavior: calls reaching terminal states
 * should be properly cleaned up from the session registry, and
 * multiple terminal events should not cause double cleanup or errors.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import Verto from '..';
import Call from '../webrtc/Call';
import { State } from '../webrtc/constants';

// Mock dependencies
jest.mock('../services/Connection');
jest.mock('../services/Handler', () => ({
  register: jest.fn(),
  deRegister: jest.fn(),
  trigger: jest.fn(),
  registerOnce: jest.fn(),
  isQueued: jest.fn(),
  deRegisterAll: jest.fn(),
}));
jest.mock('../util/logger');
jest.mock('../util/reconnect', () => ({
  getReconnectToken: jest.fn(() => null),
  setReconnectToken: jest.fn(),
  clearReconnectToken: jest.fn(),
}));

// Mock Peer class
jest.mock('../webrtc/Peer', () => {
  return class MockPeer {
    close = jest.fn();
    instance = {};
    isConnectionHealthy = jest.fn(() => true);
    isIceRestarting = false;
    incrementGatheredCandidates = jest.fn();
    tryCollectTimings = jest.fn();
    statsReporter = null;
  };
});

// Mock webrtc utils
jest.mock('../util/webrtc', () => ({
  stopStream: jest.fn(),
  getUserMedia: jest.fn(),
  attachMediaStream: jest.fn(),
  setMediaElementSinkId: jest.fn(),
  getDisplayMedia: jest.fn(),
}));

// Mock CallReportCollector
jest.mock('../webrtc/CallReportCollector', () => ({
  CallReportCollector: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn(),
    flush: jest.fn(() => null),
    postReport: jest.fn(() => Promise.resolve()),
    sendPayload: jest.fn(() => Promise.resolve()),
    onFlushNeeded: null,
    onWarning: null,
  })),
}));

// Mock WebRTCStats
jest.mock('@peermetrics/webrtc-stats', () => {
  return class MockWebRTCStats {
    addConnection = jest.fn();
    removeConnection = jest.fn();
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock package.json
jest.mock('../../../../package.json', () => ({
  version: '1.0.0-test',
}));

import { deRegister as mockDeRegister, trigger as mockTrigger } from '../services/Handler';

describe('BaseCall - Dead Call Cleanup (VSDK-194)', () => {
  let session: any;
  let call: any;
  // Track trigger calls for notification assertions
  const getTriggerCalls = () => (mockTrigger as jest.Mock).mock.calls;

  const createSession = (): any => {
    const s: any = new Verto({
      host: 'example.telnyx.com',
      login: 'testuser',
      password: 'testpass',
    });
    s.connection = {
      close: jest.fn(),
      connect: jest.fn(),
      send: jest.fn().mockResolvedValue({ node_id: 'test' }),
      sendRawText: jest.fn(),
      isAlive: true,
      connected: true,
      previousGatewayState: '',
      host: 'wss://rtc.telnyx.com',
    };
    s._idle = false;
    s.sessionid = 'test-session-id';
    s.callReportId = null;
    return s;
  };

  beforeEach(() => {
    session = createSession();
  });

  describe('_finalize() idempotency', () => {
    beforeEach(() => {
      call = new Call(session, {
        destinationNumber: '1234',
        callerNumber: '5678',
        audio: true,
        video: false,
      });
      call.peer = {
        close: jest.fn(),
        instance: {
          close: jest.fn(),
          getStats: jest.fn(),
        },
      };
      call.options.remoteStream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
      call.options.localStream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
    });

    it('should mark call as finalized after _finalize()', () => {
      expect(call.isFinalized).toBe(false);
      call._finalize();
      expect(call.isFinalized).toBe(true);
    });

    it('should remove call from session.calls after _finalize()', () => {
      const callId = call.id;
      expect(session.calls[callId]).toBeDefined();

      call._finalize();
      expect(session.calls[callId]).toBeUndefined();
    });

    it('should close peer only once when _finalize() is called multiple times', () => {
      call._finalize();
      call._finalize();
      call._finalize();

      expect(call.peer.close).toHaveBeenCalledTimes(1);
    });

    it('should not throw when _finalize() is called multiple times', () => {
      expect(() => {
        call._finalize();
        call._finalize();
        call._finalize();
      }).not.toThrow();
    });

    it('should only deRegister handlers once when _finalize() is called multiple times', () => {
      call._finalize();
      const deRegisterCountAfterFirst = (mockDeRegister as jest.Mock).mock.calls.length;

      call._finalize();
      const deRegisterCountAfterSecond = (mockDeRegister as jest.Mock).mock.calls.length;

      expect(deRegisterCountAfterSecond).toBe(deRegisterCountAfterFirst);
    });
  });

  describe('hangup() idempotency', () => {
    beforeEach(() => {
      call = new Call(session, {
        destinationNumber: '1234',
        callerNumber: '5678',
        audio: true,
        video: false,
      });
      call.peer = {
        close: jest.fn(),
        instance: {
          close: jest.fn(),
          getStats: jest.fn(),
        },
      };
      call.options.remoteStream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
      call.options.localStream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
    });

    it('should skip hangup when call is already in Hangup state', async () => {
      call._state = State.Hangup;
      call.state = 'hangup';

      await call.hangup();

      expect(call.peer.close).not.toHaveBeenCalled();
    });

    it('should skip hangup when call is already in Destroy state', async () => {
      call._state = State.Destroy;
      call.state = 'destroy';

      await call.hangup();

      expect(call.peer.close).not.toHaveBeenCalled();
    });

    it('should allow hangup when call is in Purge state (forced disconnect)', async () => {
      call._state = State.Purge;
      call.state = 'purge';

      await call.hangup({}, false);

      expect(call.peer.close).toHaveBeenCalled();
    });

    it('should skip hangup when call is already finalized', async () => {
      call._finalized = true;

      await call.hangup();

      expect(call.peer.close).not.toHaveBeenCalled();
    });
  });

  describe('setState() and cleanup interaction', () => {
    beforeEach(() => {
      call = new Call(session, {
        destinationNumber: '1234',
        callerNumber: '5678',
        audio: true,
        video: false,
      });
      call.peer = {
        close: jest.fn(),
        instance: {
          close: jest.fn(),
          getStats: jest.fn(),
        },
      };
      call.options.remoteStream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
      call.options.localStream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
    });

    it('should not double-finalize when setState(Destroy) is called twice', () => {
      call.setState(State.Destroy);
      call.setState(State.Destroy);

      // Peer should only be closed once due to _finalize() idempotency
      expect(call.peer.close).toHaveBeenCalledTimes(1);
      expect(call.isFinalized).toBe(true);
    });

    it('should allow setState(Purge) after Destroy (forced disconnect flow)', () => {
      call.setState(State.Destroy);
      call.setState(State.Purge);

      // Should not throw — Purge is always allowed for forced disconnect
      expect(call._state).toBe(State.Purge);
    });
  });

  describe('BrowserSession.disconnect() cleanup', () => {
    it('should clear all calls from session.calls', async () => {
      // Create two calls with distinct IDs by overriding uuid mock
      const { v4: uuidV4 } = jest.requireMock('uuid');
      let callCount = 0;
      (uuidV4 as jest.Mock).mockImplementation(() => `test-uuid-${++callCount}`);

      const call1 = new Call(session, {
        destinationNumber: '1111',
        audio: true,
        video: false,
      });
      const call2 = new Call(session, {
        destinationNumber: '2222',
        audio: true,
        video: false,
      });

      expect(Object.keys(session.calls).length).toBe(2);

      await session.disconnect();

      expect(Object.keys(session.calls).length).toBe(0);
    });
  });
});
