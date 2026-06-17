/**
 * Unit tests for socket reconnection attempt limit (VSDK-197)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import BaseSession from '../BaseSession';
import { trigger } from '../services/Handler';
import { SwEvent, RECONNECTION_EXHAUSTED } from '../util/constants';
import { State } from '../webrtc/constants';

// Mock dependencies
jest.mock('../services/Connection');
jest.mock('../services/Handler');
jest.mock('../util/logger');
jest.mock('../util/reconnect', () => ({
  getReconnectToken: jest.fn(() => null),
  setReconnectToken: jest.fn(),
  clearReconnectToken: jest.fn(),
}));

const mockTrigger = trigger as jest.MockedFunction<typeof trigger>;
const PENDING_SESSION_CALL_REPORTS_STORAGE_KEY =
  'telnyx-voice-sdk-pending-session-call-reports';

/**
 * Concrete subclass for testing the abstract BaseSession
 */
class TestSession extends BaseSession {
  validateOptions() {
    return true;
  }
}

describe('BaseSession - Reconnection Attempt Limit', () => {
  let session: any;
  let mockConnection: any;
  let originalFetch: typeof fetch | undefined;

  const createSession = (options: any = {}) => {
    return new TestSession({
      login: 'testuser',
      password: 'testpass',
      ...options,
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockTrigger.mockClear();
    sessionStorage.removeItem(PENDING_SESSION_CALL_REPORTS_STORAGE_KEY);
    originalFetch = global.fetch;

    session = createSession();
    mockConnection = {
      close: jest.fn(),
      connect: jest.fn(),
      isAlive: false,
      connected: false,
      previousGatewayState: '',
    };
    session.connection = mockConnection;
    session._autoReconnect = true;
    session._idle = false;
  });

  afterEach(() => {
    sessionStorage.removeItem(PENDING_SESSION_CALL_REPORTS_STORAGE_KEY);
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as unknown as { fetch?: typeof fetch }).fetch;
    }
    jest.useRealTimers();
  });

  describe('default behavior', () => {
    it('should default to 10 reconnection attempts when maxReconnectAttempts is omitted', () => {
      delete session.options.maxReconnectAttempts;

      // Omitted option defaults to 10 via ?? operator
      for (let i = 0; i < 10; i++) {
        session.onNetworkClose();
        jest.runAllTimers();
      }

      // 10 attempts should still be within the limit
      expect(session._reconnectAttempts).toBe(10);
      expect(session._autoReconnect).toBe(true);

      // The 11th onNetworkClose should exceed the default limit of 10
      session.onNetworkClose();
      expect(session._autoReconnect).toBe(false);
    });

    it('should allow unlimited reconnection attempts when maxReconnectAttempts is explicitly 0', () => {
      session.options.maxReconnectAttempts = 0;

      for (let i = 0; i < 20; i++) {
        session.onNetworkClose();
        jest.runAllTimers();
      }

      expect(session._reconnectAttempts).toBe(20);
      expect(session._autoReconnect).toBe(true);
    });
  });

  describe('with maxReconnectAttempts set', () => {
    it('should increment _reconnectAttempts on each onNetworkClose call', () => {
      session.options.maxReconnectAttempts = 5;

      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(1);

      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(2);
    });

    it('should stop reconnecting after maxReconnectAttempts is reached', () => {
      session.options.maxReconnectAttempts = 3;

      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(1);
      expect(session._autoReconnect).toBe(true);

      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(2);
      expect(session._autoReconnect).toBe(true);

      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(3);
      expect(session._autoReconnect).toBe(true);

      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._autoReconnect).toBe(false);
    });

    it('should emit RECONNECTION_EXHAUSTED error when limit is reached', () => {
      session.options.maxReconnectAttempts = 2;

      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();

      expect(mockTrigger).toHaveBeenCalledWith(
        SwEvent.Error,
        expect.objectContaining({
          error: expect.objectContaining({ code: RECONNECTION_EXHAUSTED }),
        }),
        session.uuid
      );
    });

    it('should reset _reconnectAttempts to 0 after exhaustion', () => {
      session.options.maxReconnectAttempts = 1;

      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();

      expect(session._reconnectAttempts).toBe(0);
      expect(session._autoReconnect).toBe(false);
    });

    it('should not schedule a reconnect timeout after exhaustion', () => {
      session.options.maxReconnectAttempts = 1;

      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();

      expect(session._autoReconnect).toBe(false);

      // Advance timers and verify connect is NOT called again
      const callCountBefore = mockConnection.connect.mock.calls.length;
      jest.runAllTimers();
      expect(mockConnection.connect.mock.calls.length).toBe(callCountBefore);
    });

    it('should allow manual connect() after exhaustion', () => {
      session.options.maxReconnectAttempts = 1;

      // Exhaust reconnection
      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._autoReconnect).toBe(false);

      // Manual connect should reset the counter and re-enable autoReconnect
      session.connect();
      expect(session._autoReconnect).toBe(true);
      expect(session._reconnectAttempts).toBe(0);
    });

    it('stores socket-close logs without an active call and uploads them after the next successful SDK init', async () => {
      session.callReportId = null;
      session.sessionid = 'old-session-id';
      session.callReportVoiceSdkId = 'old-voice-sdk-id';

      session.onNetworkClose({
        code: 1006,
        reason: 'network changed',
        wasClean: false,
      });

      expect(session.callReportId).toBeNull();

      const pending = JSON.parse(
        sessionStorage.getItem(PENDING_SESSION_CALL_REPORTS_STORAGE_KEY) || '[]'
      );
      expect(pending).toHaveLength(1);
      expect(pending[0].sourceSessionId).toBe('old-session-id');
      expect(pending[0].sourceVoiceSdkId).toBe('old-voice-sdk-id');
      expect(pending[0].payload).toMatchObject({
        summary: {
          callId: 'gen-mocked-uuid',
          state: 'session',
          voiceSdkSessionId: 'old-session-id',
          lastSocketClose: {
            type: 'socket-close',
            code: 1006,
            codeName: 'ABNORMAL_CLOSURE',
            reason: 'network changed',
            wasClean: false,
          },
        },
        stats: [],
        segment: 0,
        flushReason: {
          type: 'socket-close',
          socketClose: {
            code: 1006,
            codeName: 'ABNORMAL_CLOSURE',
            reason: 'network changed',
            wasClean: false,
          },
        },
      });
      expect(pending[0].payload.logs[0]).toMatchObject({
        level: 'warn',
        context: {
          generatedCallId: 'gen-mocked-uuid',
          sourceSessionId: 'old-session-id',
          sourceVoiceSdkId: 'old-voice-sdk-id',
        },
      });

      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: () => Promise.resolve(''),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      session.callReportId = 'new-call-report-id';
      session.sessionid = 'new-session-id';
      session.callReportVoiceSdkId = 'new-voice-sdk-id';
      mockConnection.host = 'wss://rtc.telnyx.com';
      session.flushPendingSessionCallReports();
      await session._drainCallReportUploads();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://rtc.telnyx.com/call_report'
      );
      expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
        'x-call-report-id': 'new-call-report-id',
        'x-call-id': 'gen-mocked-uuid',
        'x-voice-sdk-id': 'new-voice-sdk-id',
      });

      const uploadedBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(uploadedBody.logs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message:
              'Uploading deferred session call report after successful SDK init',
            context: expect.objectContaining({
              sourceSessionId: 'old-session-id',
              sourceVoiceSdkId: 'old-voice-sdk-id',
              currentSessionId: 'new-session-id',
              currentVoiceSdkId: 'new-voice-sdk-id',
            }),
          }),
        ])
      );

      expect(
        sessionStorage.getItem(PENDING_SESSION_CALL_REPORTS_STORAGE_KEY)
      ).toBeNull();
    });

    it('does not store deferred session reports when an active call owns the socket-close report', () => {
      const flushIntermediateCallReport = jest.fn();
      session.callReportId = null;
      session.calls = {
        'active-call': {
          id: 'active-call',
          _state: State.Active,
          flushIntermediateCallReport,
        },
      };

      session.onNetworkClose({ code: 1006 });

      expect(flushIntermediateCallReport).toHaveBeenCalledTimes(1);
      expect(session.callReportId).toBeNull();
      expect(
        sessionStorage.getItem(PENDING_SESSION_CALL_REPORTS_STORAGE_KEY)
      ).toBeNull();
    });
  });

  describe('unhealthy reconnect (socket opens but closes before REGED)', () => {
    it('should not reset attempts when socket opens during auto-reconnect without REGED', () => {
      session.options.maxReconnectAttempts = 3;

      // Attempt 1: network closes, auto-reconnect timer fires connect()
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(1);

      // Auto-reconnect calls connect() — socket opens, but _autoReconnect
      // is still true so connect() does NOT reset the counter
      jest.runAllTimers();
      session.connect(); // simulate reconnect connect() call
      expect(session._reconnectAttempts).toBe(1); // unchanged

      // Socket closes before REGED — this is NOT a reset, attempts continue
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(2);

      // Attempt 3: another connect() without REGED
      jest.runAllTimers();
      session.connect();
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(3);

      // Attempt 4 exceeds limit → exhaustion
      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._autoReconnect).toBe(false);
      expect(mockTrigger).toHaveBeenCalledWith(
        SwEvent.Error,
        expect.objectContaining({
          error: expect.objectContaining({ code: RECONNECTION_EXHAUSTED }),
        }),
        session.uuid
      );
    });

    it('should reset attempts after confirmed REGED and start a fresh bounded sequence', () => {
      session.options.maxReconnectAttempts = 3;

      // Attempt 1-2: network closes trigger reconnects
      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(2);

      // Socket opens, REGED received → resetReconnectAttempts() is called
      // (in production this is called by VertoHandler on REGED)
      session.resetReconnectAttempts();
      expect(session._reconnectAttempts).toBe(0);

      // Next network close starts a fresh bounded sequence
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(1);
      expect(session._autoReconnect).toBe(true);

      // Can go through the full limit again
      jest.runAllTimers();
      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(3);
      expect(session._autoReconnect).toBe(true);

      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._autoReconnect).toBe(false);
    });
  });

  describe('resetReconnectAttempts()', () => {
    it('should reset the reconnection attempt counter', () => {
      session.options.maxReconnectAttempts = 5;
      session.onNetworkClose();
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(2);

      session.resetReconnectAttempts();
      expect(session._reconnectAttempts).toBe(0);
    });
  });

  describe('disconnect()', () => {
    it('should reset _reconnectAttempts and disable autoReconnect', async () => {
      session.options.maxReconnectAttempts = 5;
      session.onNetworkClose();
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(2);

      await session.disconnect();
      expect(session._reconnectAttempts).toBe(0);
      expect(session._autoReconnect).toBe(false);
    });
  });

  describe('connect()', () => {
    it('should reset _reconnectAttempts when _autoReconnect was false', () => {
      session._autoReconnect = false;
      session._reconnectAttempts = 5;

      session.connect();

      expect(session._reconnectAttempts).toBe(0);
      expect(session._autoReconnect).toBe(true);
    });

    it('should NOT reset _reconnectAttempts during auto-reconnect', () => {
      session.options.maxReconnectAttempts = 5;
      session.onNetworkClose();
      expect(session._reconnectAttempts).toBe(1);

      // connect() is called by auto-reconnect, _autoReconnect is still true
      session.connect();
      expect(session._reconnectAttempts).toBe(1);
    });
  });
});
