/**
 * Unit tests for Connection.ts - Safety timeout and socket lifecycle management
 */

import Connection from '../../services/Connection';
import { trigger } from '../../services/Handler';
import { SwEvent } from '../../util/constants';

jest.mock('../../services/Handler');
jest.mock('../../util/logger');

// Mock WebSocket
class MockWebSocket {
  public readyState: number = 0; // CONNECTING
  public onopen: ((event: any) => void) | null = null;
  public onclose: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;

  constructor(public url: string) {}

  close() {
    this.readyState = 2; // CLOSING
  }

  send(data: string) {}
}

// @ts-ignore
global.WebSocket = MockWebSocket;

const WS_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

const CLOSE_SAFETY_TIMEOUT_MS = 5000;

describe('Connection - Safety Timeout', () => {
  let connection: Connection;
  let mockSession: any;
  let mockWebSocket: MockWebSocket;

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
    connection.connect();

    // Get reference to the created WebSocket
    mockWebSocket = (connection as any)._wsClient;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('close() method', () => {
    it('should call WebSocket close() and set safety timeout', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();

      expect(mockWebSocket.readyState).toBe(WS_STATE.CLOSING);
      expect((connection as any)._safetyTimeoutId).not.toBeNull();
    });

    it('should not call close() if already closing', () => {
      mockWebSocket.readyState = WS_STATE.CLOSING;
      const closeSpy = jest.spyOn(mockWebSocket, 'close');

      connection.close();

      expect(closeSpy).not.toHaveBeenCalled();
      expect((connection as any)._safetyTimeoutId).toBeNull();
    });

    it('should not set duplicate timeout on multiple close() calls', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      const firstTimeoutId = (connection as any)._safetyTimeoutId;

      // Second close call
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
    it('should forcefully cleanup socket stuck in CLOSING state', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      mockWebSocket.readyState = WS_STATE.CLOSING; // Socket stuck

      // Fast-forward timeout
      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      expect((connection as any)._wsClient).toBeNull();
      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketClose,
        {
          code: 1006,
          reason: 'timeout',
          wasClean: false,
        },
        mockSession.uuid
      );
    });

    it('should skip cleanup if socket is CONNECTING (reconnection happened)', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      mockWebSocket.readyState = WS_STATE.CONNECTING; // Reconnection started

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Socket should NOT be nulled
      expect((connection as any)._wsClient).not.toBeNull();
      expect(trigger).not.toHaveBeenCalledWith(
        SwEvent.SocketClose,
        expect.any(Object),
        mockSession.uuid
      );
    });

    it('should skip cleanup if socket is OPEN (reconnection succeeded)', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      // Simulate socket reconnecting before timeout
      mockWebSocket.readyState = WS_STATE.OPEN;

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      expect((connection as any)._wsClient).not.toBeNull();
    });

    it('should skip cleanup if socket is CLOSED (onclose already fired)', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      mockWebSocket.readyState = WS_STATE.CLOSED;

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Should not emit duplicate SocketClose
      expect(trigger).not.toHaveBeenCalledWith(
        SwEvent.SocketClose,
        expect.objectContaining({ reason: 'timeout' }),
        mockSession.uuid
      );
    });

    it('should deregister all socket events on timeout', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      mockWebSocket.readyState = WS_STATE.CLOSING;

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      expect(mockWebSocket.onopen).toBeNull();
      expect(mockWebSocket.onclose).toBeNull();
      expect(mockWebSocket.onerror).toBeNull();
      expect(mockWebSocket.onmessage).toBeNull();
    });
  });

  describe('onclose event', () => {
    it('should clear safety timeout and null socket', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      expect((connection as any)._safetyTimeoutId).not.toBeNull();

      // Simulate onclose firing
      mockWebSocket.onclose!({ code: 1000, reason: 'normal', wasClean: true });

      expect((connection as any)._safetyTimeoutId).toBeNull();
      expect((connection as any)._wsClient).toBeNull();
    });

    it('should emit SocketClose event', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      const closeEvent = { code: 1000, reason: 'normal', wasClean: true };
      mockWebSocket.onclose!(closeEvent);

      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketClose,
        closeEvent,
        mockSession.uuid
      );
    });
  });

  describe('onerror event', () => {
    it('should clear safety timeout and null socket', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      expect((connection as any)._safetyTimeoutId).not.toBeNull();

      // Simulate onerror firing
      const errorEvent = { type: 'error', message: 'Connection failed' };
      mockWebSocket.onerror!(errorEvent);

      expect((connection as any)._safetyTimeoutId).toBeNull();
      expect((connection as any)._wsClient).toBeNull();
    });

    it('should emit SocketError event', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      const errorEvent = { type: 'error', message: 'Connection failed' };
      mockWebSocket.onerror!(errorEvent);

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
    it('should emit SocketOpen event', () => {
      const openEvent = { type: 'open' };
      mockWebSocket.onopen!(openEvent);

      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketOpen,
        openEvent,
        mockSession.uuid
      );
    });
  });

  describe('Edge cases and race conditions', () => {
    it('should handle close() → onclose before timeout', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();
      mockWebSocket.readyState = WS_STATE.CLOSING;

      // onclose fires immediately (fast network)
      mockWebSocket.onclose!({ code: 1000, reason: 'normal', wasClean: true });

      expect((connection as any)._wsClient).toBeNull();
      expect((connection as any)._safetyTimeoutId).toBeNull();

      // Timeout should be cleared, so advancing time does nothing
      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // No duplicate SocketClose
      expect(trigger).toHaveBeenCalledTimes(1);
    });

    it('should handle close() → onerror before timeout', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();

      // onerror fires (network error during close)
      mockWebSocket.onerror!({ type: 'error' });

      expect((connection as any)._wsClient).toBeNull();
      expect((connection as any)._safetyTimeoutId).toBeNull();

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Only SocketError, no SocketClose from timeout
      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketError,
        expect.any(Object),
        mockSession.uuid
      );
    });

    it('should handle rapid close() calls (duplicate guard)', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;
      const closeSpy = jest.spyOn(mockWebSocket, 'close');

      connection.close();
      connection.close();
      connection.close();

      // close() may be called once before guard kicks in
      // But only ONE timeout should exist
      expect((connection as any)._safetyTimeoutId).not.toBeNull();

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Only one timeout should fire
      expect((connection as any)._wsClient).toBeNull();
    });

    it('should handle close() → reconnect() before timeout', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;

      connection.close();

      // Simulate immediate reconnection (new socket created)
      const newMockWebSocket = new MockWebSocket('wss://test.telnyx.com');
      (connection as any)._wsClient = newMockWebSocket;
      newMockWebSocket.readyState = WS_STATE.CONNECTING;

      jest.advanceTimersByTime(CLOSE_SAFETY_TIMEOUT_MS);

      // Should NOT null the new socket
      expect((connection as any)._wsClient).toBe(newMockWebSocket);
    });
  });

  describe('State getters', () => {
    it('should correctly report connected state', () => {
      mockWebSocket.readyState = WS_STATE.OPEN;
      expect(connection.connected).toBe(true);

      mockWebSocket.readyState = WS_STATE.CLOSING;
      expect(connection.connected).toBe(false);
    });

    it('should correctly report connecting state', () => {
      mockWebSocket.readyState = WS_STATE.CONNECTING;
      expect(connection.connecting).toBe(true);

      mockWebSocket.readyState = WS_STATE.OPEN;
      expect(connection.connecting).toBe(false);
    });

    it('should correctly report closing state', () => {
      mockWebSocket.readyState = WS_STATE.CLOSING;
      expect(connection.closing).toBe(true);

      mockWebSocket.readyState = WS_STATE.OPEN;
      expect(connection.closing).toBe(false);
    });

    it('should correctly report closed state', () => {
      mockWebSocket.readyState = WS_STATE.CLOSED;
      expect(connection.closed).toBe(true);

      mockWebSocket.readyState = WS_STATE.OPEN;
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
