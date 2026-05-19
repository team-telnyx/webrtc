/**
 * Unit tests for socket reconnection attempt limit (VSDK-197)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import BaseSession from '../BaseSession';
import { trigger } from '../services/Handler';
import {
  SwEvent,
  RECONNECTION_EXHAUSTED,
  WEBSOCKET_UNEXPECTED_CLOSE,
} from '../util/constants';

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
      expect(session._autoReconnect).toBe(true);
      expect(session._reconnectAttempts).toBe(0);
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

    it('should reset attempt window and keep reconnecting after maxReconnectAttempts is reached', () => {
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
      expect(session._autoReconnect).toBe(true);
      expect(session._reconnectAttempts).toBe(0);
    });

    it('should emit RECONNECTION_EXHAUSTED warning when limit is reached', () => {
      session.options.maxReconnectAttempts = 2;

      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();

      expect(mockTrigger).toHaveBeenCalledWith(
        SwEvent.Warning,
        expect.objectContaining({
          warning: expect.objectContaining({ code: RECONNECTION_EXHAUSTED }),
          reconnecting: true,
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
      expect(session._autoReconnect).toBe(true);
    });

    it('should schedule a fresh reconnect timeout after exhaustion', () => {
      session.options.maxReconnectAttempts = 1;

      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();

      expect(session._autoReconnect).toBe(true);

      // Advance timers and verify connect continues after the warning cycle
      const callCountBefore = mockConnection.connect.mock.calls.length;
      jest.runAllTimers();
      expect(mockConnection.connect.mock.calls.length).toBe(callCountBefore + 1);
    });

    it('should allow manual connect() after exhaustion', () => {
      session.options.maxReconnectAttempts = 1;

      // Exhaust reconnection
      session.onNetworkClose();
      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._autoReconnect).toBe(true);

      // Manual connect during auto-reconnect preserves the current reconnect state
      session.connect();
      expect(session._autoReconnect).toBe(true);
      expect(session._reconnectAttempts).toBe(0);
    });
  });

  describe('unexpected socket closure detection', () => {
    it('should emit WEBSOCKET_UNEXPECTED_CLOSE with socket close metadata', () => {
      session.onNetworkClose({
        code: 1006,
        reason: 'proxy timeout',
        wasClean: false,
      });

      expect(mockTrigger).toHaveBeenCalledWith(
        SwEvent.Error,
        expect.objectContaining({
          error: expect.objectContaining({ code: WEBSOCKET_UNEXPECTED_CLOSE }),
          socketClose: expect.objectContaining({
            code: 1006,
            codeName: 'ABNORMAL_CLOSURE',
            reason: 'proxy timeout',
            wasClean: false,
          }),
          reconnecting: true,
        }),
        session.uuid
      );
    });

    it('should not emit WEBSOCKET_UNEXPECTED_CLOSE for expected socket closes', () => {
      session._markNextSocketCloseExpected();

      session.onNetworkClose({
        code: 1000,
        reason: 'intentional reconnect',
        wasClean: true,
      });

      expect(mockTrigger).not.toHaveBeenCalledWith(
        SwEvent.Error,
        expect.objectContaining({
          error: expect.objectContaining({ code: WEBSOCKET_UNEXPECTED_CLOSE }),
        }),
        session.uuid
      );
    });

    it('should detect an active client with no open WebSocket during keepalive', () => {
      session._pong = false;
      mockConnection.isAlive = false;
      session._idle = false;

      session._resetKeepAlive();

      expect(mockTrigger).toHaveBeenCalledWith(
        SwEvent.Error,
        expect.objectContaining({
          error: expect.objectContaining({ code: WEBSOCKET_UNEXPECTED_CLOSE }),
          socketClose: expect.objectContaining({
            code: 1006,
            codeName: 'ABNORMAL_CLOSURE',
            reason: 'NO_SOCKET_OPEN: client is active but no WebSocket is open',
            wasClean: false,
          }),
          reconnecting: true,
        }),
        session.uuid
      );
      expect(session._reconnectAttempts).toBe(1);

      jest.runOnlyPendingTimers();
      expect(mockConnection.connect).toHaveBeenCalledTimes(1);
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

      // Attempt 4 exceeds limit → warning cycle resets and reconnect continues
      jest.runAllTimers();
      session.onNetworkClose();
      expect(session._autoReconnect).toBe(true);
      expect(session._reconnectAttempts).toBe(0);
      expect(mockTrigger).toHaveBeenCalledWith(
        SwEvent.Warning,
        expect.objectContaining({
          warning: expect.objectContaining({ code: RECONNECTION_EXHAUSTED }),
          reconnecting: true,
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
      expect(session._autoReconnect).toBe(true);
      expect(session._reconnectAttempts).toBe(0);
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
      expect(session._socketCloseExpected).toBe(true);
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
