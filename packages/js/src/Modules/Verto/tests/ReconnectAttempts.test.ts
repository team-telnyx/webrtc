/**
 * Unit tests for socket reconnection attempt limit (VSDK-197)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import BaseSession from '../BaseSession';
import { trigger } from '../services/Handler';
import { SwEvent, RECONNECTION_EXHAUSTED } from '../util/constants';

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

  describe('default behavior (maxReconnectAttempts = 0, unlimited)', () => {
    it('should allow unlimited reconnection attempts when maxReconnectAttempts is 0', () => {
      session.options.maxReconnectAttempts = 0;

      for (let i = 0; i < 20; i++) {
        session.onNetworkClose();
        jest.runAllTimers();
      }

      expect(session._reconnectAttempts).toBe(20);
      expect(session._autoReconnect).toBe(true);
    });

    it('should allow unlimited reconnection attempts when maxReconnectAttempts is not set', () => {
      delete session.options.maxReconnectAttempts;

      for (let i = 0; i < 15; i++) {
        session.onNetworkClose();
        jest.runAllTimers();
      }

      expect(session._reconnectAttempts).toBe(15);
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
