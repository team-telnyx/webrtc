/**
 * Unit tests for Connection.ts - Safety timeout and socket lifecycle management
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Unmock Connection to test the real implementation
jest.unmock('../../services/Connection');

import Connection, { setWebSocket } from '../../services/Connection';
import { trigger } from '../../services/Handler';
import { SwEvent } from '../../util/constants';

jest.mock('../../services/Handler');
jest.mock('../../util/logger');
jest.mock('../../util/reconnect', () => ({
  getReconnectToken: jest.fn(() => null),
  setReconnectToken: jest.fn(),
}));

const WS_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

const CLOSE_SAFETY_TIMEOUT_MS = 5000;

// Mock WebSocket class
class MockWebSocket {
  public readyState: number = WS_STATE.CONNECTING;
  public onopen: ((event: any) => void) | null = null;
  public onclose: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;

  constructor(public url: string) {
    // Fire onopen after handlers are registered (nextTick)
    Promise.resolve().then(() => {
      this.readyState = WS_STATE.OPEN;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    });
  }

  close() {
    this.readyState = WS_STATE.CLOSING;
  }

  send(data: string) {}

  // Helper for tests
  simulateClose(code: number = 1000, reason: string = '') {
    this.readyState = WS_STATE.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: true });
    }
  }

  simulateError(error: any = { type: 'error' }) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

describe('Connection - Safety Timeout', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    // Set the mock WebSocket globally for Connection to use
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSession = {
      uuid: 'test-uuid',
      sessionid: 'test-session',
      options: {
        host: 'wss://test.telnyx.com',
        login: 'test-login',
        password: 'test-password',
      },
    };

    connection = new Connection(mockSession);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('close() method', () => {
    it('should call WebSocket close() and set safety timeout', async () => {
      connection.connect();
      await Promise.resolve();

      // Wait for WebSocket to open

      const ws = (connection as any)._wsClient;
      expect(ws).not.toBeNull();
      expect(ws.readyState).toBe(WS_STATE.OPEN);

      connection.close();

      expect(ws.readyState).toBe(WS_STATE.CLOSING);
      expect((connection as any)._safetyTimeoutId).not.toBeNull();
    });

    it('should not call close() if already closing', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;
      const closeSpy = jest.spyOn(ws, 'close');

      // First close
      connection.close();
      expect(closeSpy).toHaveBeenCalledTimes(1);

      // Second close (should be blocked)
      connection.close();
      expect(closeSpy).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should not set duplicate timeout on multiple close() calls', async () => {
      connection.connect();
      await Promise.resolve();

      connection.close();
      const firstTimeoutId = (connection as any)._safetyTimeoutId;

      // Try to close again (should return early due to closing state or timeout guard)
      connection.close();
      const secondTimeoutId = (connection as any)._safetyTimeoutId;

      expect(firstTimeoutId).toBe(secondTimeoutId);
      expect(firstTimeoutId).not.toBeNull();
    });

    it('should not proceed if _wsClient is null', () => {
      (connection as any)._wsClient = null;

      connection.close();

      expect((connection as any)._safetyTimeoutId).toBeNull();
    });
  });

  describe('Safety timeout handler', () => {
    it('should forcefully cleanup socket stuck in CLOSING state', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      connection.close();
      expect(ws.readyState).toBe(WS_STATE.CLOSING);

      // Fast-forward timeout
      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      expect((connection as any)._wsClient).toBeNull();
      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketClose,
        {
          code: 1006,
          reason:
            'STUCK_WS_TIMEOUT: Socket got stuck in CLOSING state and was forcefully cleaned up by safety timeout',
          wasClean: false,
        },
        mockSession.uuid
      );
    });

    it('should skip trigger close if socket is not the same', async () => {
      connection.connect();
      await Promise.resolve();

      connection.close();

      const newWs = new MockWebSocket('wss://test.telnyx.com');
      (connection as any)._wsClient = newWs;

      // Fast-forward timeout
      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);
      expect(trigger).not.toHaveBeenCalledWith(
        SwEvent.SocketClose,
        {
          code: 1006,
          reason:
            'STUCK_WS_TIMEOUT: Socket got stuck in CLOSING state and was forcefully cleaned up by safety timeout',
          wasClean: false,
        },
        mockSession.uuid
      );
    });

    it('should skip cleanup if socket is CONNECTING (reconnection happened)', async () => {
      connection.connect();
      await Promise.resolve();

      connection.close();

      // Simulate reconnection before timeout
      const newWs = new MockWebSocket('wss://test.telnyx.com');
      newWs.readyState = WS_STATE.CONNECTING;
      (connection as any)._wsClient = newWs;

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Socket should NOT be nulled
      expect((connection as any)._wsClient).toBe(newWs);
    });

    it('should skip cleanup if socket is OPEN (reconnection succeeded)', async () => {
      connection.connect();
      await Promise.resolve();

      connection.close();

      const newWs = new MockWebSocket('wss://test.telnyx.com');
      newWs.readyState = WS_STATE.OPEN;
      (connection as any)._wsClient = newWs;

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Socket should NOT be nulled
      expect((connection as any)._wsClient).toBe(newWs);
    });

    it('should skip cleanup if socket is CLOSED (onclose already fired)', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      connection.close();

      // Simulate onclose firing before timeout
      ws.readyState = WS_STATE.CLOSED;

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Should not emit duplicate SocketClose with timeout reason
      const timeoutCalls = (trigger as jest.Mock).mock.calls.filter(
        (call) =>
          call[0] === SwEvent.SocketClose &&
          call[1].reason ===
            'STUCK_WS_TIMEOUT: Socket got stuck in CLOSING state and was forcefully cleaned up by safety timeout'
      );
      expect(timeoutCalls).toHaveLength(0);
    });

    it('should deregister all socket events on timeout', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      connection.close();

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      expect(ws.onopen).toBeNull();
      expect(ws.onclose).toBeNull();
      expect(ws.onerror).toBeNull();
      expect(ws.onmessage).toBeNull();
    });
  });

  describe('onclose event', () => {
    it('should clear safety timeout and null socket', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      connection.close();
      expect((connection as any)._safetyTimeoutId).not.toBeNull();

      // Simulate onclose firing
      ws.simulateClose(1000, 'normal');

      expect((connection as any)._safetyTimeoutId).toBeNull();
      expect((connection as any)._wsClient).toBeNull();
    });

    it('should emit SocketClose event', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;
      const closeEvent = { code: 1000, reason: 'normal', wasClean: true };

      ws.simulateClose(closeEvent.code, closeEvent.reason);

      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketClose,
        closeEvent,
        mockSession.uuid
      );
    });
  });

  describe('onerror event', () => {
    it('should clear safety timeout and null socket', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      connection.close();
      expect((connection as any)._safetyTimeoutId).not.toBeNull();

      // Simulate onerror firing
      ws.simulateError({ type: 'error', message: 'Connection failed' });

      expect((connection as any)._safetyTimeoutId).toBeNull();
      expect((connection as any)._wsClient).toBeNull();
    });

    it('should emit SocketError event', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;
      const errorEvent = { type: 'error', message: 'Connection failed' };

      ws.simulateError(errorEvent);

      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketError,
        {
          error: errorEvent,
          sessionId: mockSession.sessionid,
        },
        mockSession.uuid
      );
    });
  });

  describe('onopen event', () => {
    it('should emit SocketOpen event', async () => {
      connection.connect();
      await Promise.resolve();

      // Wait for promise to resolve
      await Promise.resolve();

      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketOpen,
        { type: 'open' },
        mockSession.uuid
      );
    });
  });

  describe('Edge cases and race conditions', () => {
    it('should handle close() → onclose before timeout', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      connection.close();

      // onclose fires immediately
      ws.simulateClose(1000, 'normal');

      expect((connection as any)._wsClient).toBeNull();
      expect((connection as any)._safetyTimeoutId).toBeNull();

      // Timeout should be cleared
      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // No duplicate SocketClose from timeout
      const closeCallsCount = (trigger as jest.Mock).mock.calls.filter(
        (call) => call[0] === SwEvent.SocketClose
      ).length;
      expect(closeCallsCount).toBe(1); // Only the onclose call
    });

    it('should handle close() → onerror before timeout', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      connection.close();

      // onerror fires
      ws.simulateError({ type: 'error' });

      expect((connection as any)._wsClient).toBeNull();
      expect((connection as any)._safetyTimeoutId).toBeNull();

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Only SocketError, no SocketClose from timeout
      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketError,
        expect.any(Object),
        mockSession.uuid
      );

      const timeoutCloseCalls = (trigger as jest.Mock).mock.calls.filter(
        (call) =>
          call[0] === SwEvent.SocketClose &&
          call[1].reason ===
            'STUCK_WS_TIMEOUT: Socket got stuck in CLOSING state and was forcefully cleaned up by safety timeout'
      );
      expect(timeoutCloseCalls).toHaveLength(0);
    });

    it('should handle rapid close() calls (duplicate guard)', async () => {
      connection.connect();
      await Promise.resolve();

      connection.close();
      connection.close();
      connection.close();

      // Only one timeout should exist
      expect((connection as any)._safetyTimeoutId).not.toBeNull();

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Only one timeout should fire
      expect((connection as any)._wsClient).toBeNull();
    });

    it('should handle close() → reconnect() before timeout', async () => {
      connection.connect();
      await Promise.resolve();

      connection.close();

      // Simulate immediate reconnection (new socket created)
      const newWs = new MockWebSocket('wss://test.telnyx.com');
      newWs.readyState = WS_STATE.CONNECTING;
      (connection as any)._wsClient = newWs;

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Should NOT null the new socket
      expect((connection as any)._wsClient).toBe(newWs);
    });

    it('should prevent old socket onclose from nulling new socket (race condition)', async () => {
      connection.connect();
      await Promise.resolve();

      const oldWs = (connection as any)._wsClient;

      connection.close();

      // Simulate reconnection (new socket created)
      const newWs = new MockWebSocket('wss://test.telnyx.com');
      await Promise.resolve();
      (connection as any)._wsClient = newWs;

      // Old socket's onclose fires
      oldWs.simulateClose(1000, 'normal');

      // New socket should NOT be nulled
      expect((connection as any)._wsClient).toBe(newWs);
      expect((connection as any)._wsClient).not.toBeNull();
    });

    it('should prevent old socket onerror from nulling new socket (race condition)', async () => {
      connection.connect();
      await Promise.resolve();

      const oldWs = (connection as any)._wsClient;

      connection.close();

      // Simulate reconnection (new socket created)
      const newWs = new MockWebSocket('wss://test.telnyx.com');
      await Promise.resolve();
      (connection as any)._wsClient = newWs;

      // Old socket's onerror fires
      oldWs.simulateError({ type: 'error', message: 'Old socket error' });

      // New socket should NOT be nulled
      expect((connection as any)._wsClient).toBe(newWs);
      expect((connection as any)._wsClient).not.toBeNull();
    });
  });

  describe('State getters', () => {
    it('should correctly report connected state', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      ws.readyState = WS_STATE.OPEN;
      expect(connection.connected).toBe(true);

      ws.readyState = WS_STATE.CLOSING;
      expect(connection.connected).toBe(false);
    });

    it('should correctly report connecting state', async () => {
      connection.connect();
      await Promise.resolve();

      // Before open
      const ws = (connection as any)._wsClient;
      ws.readyState = WS_STATE.CONNECTING;
      expect(connection.connecting).toBe(true);

      ws.readyState = WS_STATE.OPEN;
      expect(connection.connecting).toBe(false);
    });

    it('should correctly report closing state', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      ws.readyState = WS_STATE.CLOSING;
      expect(connection.closing).toBe(true);

      ws.readyState = WS_STATE.OPEN;
      expect(connection.closing).toBe(false);
    });

    it('should correctly report closed state', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;

      ws.readyState = WS_STATE.CLOSED;
      expect(connection.closed).toBe(true);

      ws.readyState = WS_STATE.OPEN;
      expect(connection.closed).toBe(false);
    });

    it('should handle null _wsClient in state getters', () => {
      (connection as any)._wsClient = null;

      expect(connection.connected).toBe(false);
      expect(connection.connecting).toBe(false);
      expect(connection.closing).toBe(false);
      expect(connection.closed).toBe(false);
    });
  });
});
