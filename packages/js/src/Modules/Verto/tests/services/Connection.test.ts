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
import { Region } from '../../../../index';
import logger from '../../util/logger';
import {
  getReconnectToken,
  getReconnectTokenCanaryRtcServer,
  setReconnectToken,
} from '../../util/reconnect';

jest.mock('../../services/Handler');
jest.mock('../../util/logger');
jest.mock('../../util/reconnect', () => ({
  getReconnectToken: jest.fn(() => null),
  getReconnectTokenCanaryRtcServer: jest.fn(() => undefined),
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

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

describe('Connection - region selection', () => {
  const hostFor = (options: Record<string, unknown> = {}): string => {
    const connection = new Connection({
      uuid: 'region-test-uuid',
      sessionid: 'region-test-session',
      callReportVoiceSdkId: null,
      options: {
        login: 'test-login',
        password: 'test-password',
        ...options,
      },
    } as any);

    return (connection as any)._host;
  };

  beforeAll(() => setWebSocket(MockWebSocket as any));

  it('exports the supported region values', () => {
    expect(Region).toEqual({
      EU: 'eu',
      US_CENTRAL: 'us-central',
      US_EAST: 'us-east',
      US_WEST: 'us-west',
      CA_CENTRAL: 'ca-central',
      APAC: 'apac',
      SOUTH_ASIA: 'south-asia',
    });
  });

  it.each(Object.values(Region))('builds hosts for %s', (region) => {
    expect(hostFor({ region })).toBe(`wss://${region}.rtc.telnyx.com`);
    expect(hostFor({ env: 'development', region })).toBe(
      `wss://${region}.rtcdev.telnyx.com`
    );
  });

  it('preserves default, custom-host, and unknown-region behavior', () => {
    expect(hostFor()).toBe('wss://rtc.telnyx.com');
    expect(hostFor({ host: 'wss://rtc.example.com', region: Region.EU })).toBe(
      'wss://eu.rtc.example.com'
    );
    expect(hostFor({ region: 'future-region' })).toBe(
      'wss://future-region.rtc.telnyx.com'
    );
  });
});

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
      callReportVoiceSdkId: null,
      options: {
        host: 'wss://test.telnyx.com',
        login: 'test-login',
        password: 'test-password',
      },
    };

    connection = new Connection(mockSession);
    mockSession.connection = connection;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('connect() method', () => {
    it('logs socket generation and reconnect count for the client', () => {
      (getReconnectToken as jest.Mock).mockReturnValue('voice-sdk-id');

      connection.connect();
      connection.connect();

      expect(logger.debug).toHaveBeenCalledWith(
        'WebSocket connection created',
        {
          sessionId: mockSession.sessionid,
          voiceSdkId: 'voice-sdk-id',
          socketGeneration: 1,
          reconnectCount: 0,
        }
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'WebSocket connection created',
        {
          sessionId: mockSession.sessionid,
          voiceSdkId: 'voice-sdk-id',
          socketGeneration: 2,
          reconnectCount: 1,
        }
      );
    });

    it('includes skip_last_voice_sdk_id=true in WebSocket URL when skipLastVoiceSdkId is set and voice_sdk_id exists', () => {
      (getReconnectToken as jest.Mock).mockReturnValue('stored-voice-sdk-id');
      mockSession.options.skipLastVoiceSdkId = true;

      connection.connect();

      const ws = (connection as any)._wsClient;
      expect(ws).not.toBeNull();
      const wsUrl = new URL(ws.url);
      expect(wsUrl.searchParams.get('voice_sdk_id')).toBe(
        'stored-voice-sdk-id'
      );
      expect(wsUrl.searchParams.get('skip_last_voice_sdk_id')).toBe('true');
    });

    it('does not include skip_last_voice_sdk_id when skipLastVoiceSdkId is set but no voice_sdk_id exists', () => {
      (getReconnectToken as jest.Mock).mockReturnValue(null);
      mockSession.options.skipLastVoiceSdkId = true;

      connection.connect();

      const ws = (connection as any)._wsClient;
      expect(ws).not.toBeNull();
      const wsUrl = new URL(ws.url);
      expect(wsUrl.searchParams.has('voice_sdk_id')).toBe(false);
      expect(wsUrl.searchParams.has('skip_last_voice_sdk_id')).toBe(false);
    });

    it('does not include skip_last_voice_sdk_id when voice_sdk_id exists but skipLastVoiceSdkId is not set', () => {
      (getReconnectToken as jest.Mock).mockReturnValue('stored-voice-sdk-id');

      connection.connect();

      const ws = (connection as any)._wsClient;
      expect(ws).not.toBeNull();
      const wsUrl = new URL(ws.url);
      expect(wsUrl.searchParams.get('voice_sdk_id')).toBe(
        'stored-voice-sdk-id'
      );
      expect(wsUrl.searchParams.has('skip_last_voice_sdk_id')).toBe(false);
    });

    describe('canary routing toggle', () => {
      const currentWebSocketUrl = (): URL => {
        const ws = (connection as any)._wsClient as MockWebSocket;
        expect(ws).not.toBeNull();
        return new URL(ws.url);
      };

      beforeEach(() => {
        (getReconnectToken as jest.Mock).mockReturnValue('stored-voice-sdk-id');
        (getReconnectTokenCanaryRtcServer as jest.Mock).mockReturnValue(
          undefined
        );
      });

      it.each([
        { value: true, expected: 'true' },
        { value: false, expected: 'false' },
      ])(
        'sends canary=$expected for explicit $value',
        ({ value, expected }) => {
          mockSession.options.useCanaryRtcServer = value;

          connection.connect();

          expect(currentWebSocketUrl().searchParams.get('canary')).toBe(
            expected
          );
        }
      );

      it('omits canary when useCanaryRtcServer is omitted', () => {
        connection.connect();

        expect(currentWebSocketUrl().searchParams.has('canary')).toBe(false);
      });

      it('treats a token received without an override as default-routed', () => {
        mockSession.options.useCanaryRtcServer = true;
        connection.connect();
        let ws = (connection as any)._wsClient as MockWebSocket;
        ws.simulateMessage({ voice_sdk_id: 'canary-voice-sdk-id' });
        (getReconnectToken as jest.Mock).mockReturnValue('canary-voice-sdk-id');

        delete mockSession.options.useCanaryRtcServer;
        connection.connect();
        let url = currentWebSocketUrl();
        expect(url.searchParams.has('canary')).toBe(false);
        expect(url.searchParams.get('voice_sdk_id')).toBe(
          'canary-voice-sdk-id'
        );
        ws = (connection as any)._wsClient as MockWebSocket;
        ws.simulateMessage({ voice_sdk_id: 'default-voice-sdk-id' });
        (getReconnectToken as jest.Mock).mockReturnValue(
          'default-voice-sdk-id'
        );

        mockSession.options.useCanaryRtcServer = true;
        connection.connect();
        url = currentWebSocketUrl();
        expect(url.searchParams.has('voice_sdk_id')).toBe(false);
      });

      it.each([true, false])(
        'omits a stored voice_sdk_id on the first explicit %s connection, then reuses the replacement while unchanged',
        (value) => {
          mockSession.options.useCanaryRtcServer = value;

          connection.connect();
          expect(currentWebSocketUrl().searchParams.has('voice_sdk_id')).toBe(
            false
          );

          const ws = (connection as any)._wsClient as MockWebSocket;
          ws.simulateMessage({ voice_sdk_id: 'replacement-voice-sdk-id' });
          (getReconnectToken as jest.Mock).mockReturnValue(
            'replacement-voice-sdk-id'
          );

          connection.connect();
          expect(currentWebSocketUrl().searchParams.get('voice_sdk_id')).toBe(
            'replacement-voice-sdk-id'
          );
        }
      );

      it('uses the persisted canary association for the current stored voice_sdk_id instead of stale session state', () => {
        mockSession.reconnectTokenCanaryRtcServer = true;
        mockSession.options.useCanaryRtcServer = false;
        (getReconnectTokenCanaryRtcServer as jest.Mock).mockReturnValue(false);

        connection.connect();

        expect(currentWebSocketUrl().searchParams.get('voice_sdk_id')).toBe(
          'stored-voice-sdk-id'
        );
      });

      it('keeps the replacement voice_sdk_id when Connection is recreated within the same session', () => {
        mockSession.options.useCanaryRtcServer = true;
        connection.connect();
        const ws = (connection as any)._wsClient as MockWebSocket;
        ws.simulateMessage({ voice_sdk_id: 'replacement-voice-sdk-id' });
        (getReconnectToken as jest.Mock).mockReturnValue(
          'replacement-voice-sdk-id'
        );

        connection = new Connection(mockSession);
        mockSession.connection = connection;
        connection.connect();

        expect(currentWebSocketUrl().searchParams.get('voice_sdk_id')).toBe(
          'replacement-voice-sdk-id'
        );
      });

      it('stores the canary routing association on the session with the replacement voice_sdk_id', () => {
        mockSession.options.useCanaryRtcServer = false;
        connection.connect();
        const ws = (connection as any)._wsClient as MockWebSocket;

        ws.simulateMessage({ voice_sdk_id: 'replacement-voice-sdk-id' });

        expect(mockSession.reconnectTokenCanaryRtcServer).toBe(false);
        expect(setReconnectToken).toHaveBeenCalledWith(
          'replacement-voice-sdk-id',
          false
        );
      });

      it('ignores a late voice_sdk_id response from a superseded socket route', () => {
        mockSession.options.useCanaryRtcServer = true;
        connection.connect();
        const oldWs = (connection as any)._wsClient as MockWebSocket;

        mockSession.options.useCanaryRtcServer = false;
        connection.connect();
        const currentWs = (connection as any)._wsClient as MockWebSocket;
        currentWs.simulateMessage({ voice_sdk_id: 'current-voice-sdk-id' });
        (setReconnectToken as jest.Mock).mockClear();

        oldWs.simulateMessage({ voice_sdk_id: 'stale-voice-sdk-id' });

        expect(mockSession.reconnectTokenCanaryRtcServer).toBe(false);
        expect(setReconnectToken).not.toHaveBeenCalledWith(
          'stale-voice-sdk-id',
          true
        );
      });

      it('ignores a late voice_sdk_id response from a replaced Connection', () => {
        mockSession.options.useCanaryRtcServer = true;
        connection.connect();
        const replacedConnectionWs = (connection as any)
          ._wsClient as MockWebSocket;

        mockSession.options.useCanaryRtcServer = false;
        connection = new Connection(mockSession);
        mockSession.connection = connection;
        connection.connect();
        const currentWs = (connection as any)._wsClient as MockWebSocket;
        currentWs.simulateMessage({ voice_sdk_id: 'current-voice-sdk-id' });
        (setReconnectToken as jest.Mock).mockClear();

        replacedConnectionWs.simulateMessage({
          voice_sdk_id: 'stale-voice-sdk-id',
        });

        expect(mockSession.reconnectTokenCanaryRtcServer).toBe(false);
        expect(setReconnectToken).not.toHaveBeenCalledWith(
          'stale-voice-sdk-id',
          true
        );
      });

      it('keeps omitting the old voice_sdk_id after a canary switch until the new route returns a replacement', () => {
        mockSession.options.useCanaryRtcServer = true;
        connection.connect();
        const initialWs = (connection as any)._wsClient as MockWebSocket;
        initialWs.simulateMessage({ voice_sdk_id: 'canary-voice-sdk-id' });
        (getReconnectToken as jest.Mock).mockReturnValue('canary-voice-sdk-id');

        mockSession.options.useCanaryRtcServer = false;
        connection.connect();
        const switchedWs = (connection as any)._wsClient as MockWebSocket;
        expect(currentWebSocketUrl().searchParams.has('voice_sdk_id')).toBe(
          false
        );

        switchedWs.simulateError({ type: 'error' });
        connection.connect();

        expect(currentWebSocketUrl().searchParams.get('canary')).toBe('false');
        expect(currentWebSocketUrl().searchParams.has('voice_sdk_id')).toBe(
          false
        );
      });

      it.each([
        { previous: true, next: false },
        { previous: false, next: true },
      ])(
        'omits a stored voice_sdk_id when canary changes from $previous to $next',
        ({ previous, next }) => {
          mockSession.options.useCanaryRtcServer = previous;
          connection.connect();
          const ws = (connection as any)._wsClient as MockWebSocket;
          ws.simulateMessage({ voice_sdk_id: 'previous-voice-sdk-id' });
          (getReconnectToken as jest.Mock).mockReturnValue(
            'previous-voice-sdk-id'
          );

          mockSession.options.useCanaryRtcServer = next;
          connection.connect();

          const url = currentWebSocketUrl();
          expect(url.searchParams.get('canary')).toBe(String(next));
          expect(url.searchParams.has('voice_sdk_id')).toBe(false);
        }
      );

      it('does not add skip_last_voice_sdk_id when a canary change removes voice_sdk_id', () => {
        mockSession.options.skipLastVoiceSdkId = true;
        mockSession.options.useCanaryRtcServer = true;
        connection.connect();

        mockSession.options.useCanaryRtcServer = false;
        connection.connect();

        const url = currentWebSocketUrl();
        expect(url.searchParams.has('voice_sdk_id')).toBe(false);
        expect(url.searchParams.has('skip_last_voice_sdk_id')).toBe(false);
      });

      it('preserves skip_last_voice_sdk_id when canary is unchanged and voice_sdk_id is reused', () => {
        mockSession.options.skipLastVoiceSdkId = true;
        mockSession.options.useCanaryRtcServer = true;
        connection.connect();
        const ws = (connection as any)._wsClient as MockWebSocket;
        ws.simulateMessage({ voice_sdk_id: 'stored-voice-sdk-id' });
        connection.connect();

        const url = currentWebSocketUrl();
        expect(url.searchParams.get('voice_sdk_id')).toBe(
          'stored-voice-sdk-id'
        );
        expect(url.searchParams.get('skip_last_voice_sdk_id')).toBe('true');
      });
    });
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
          socketGeneration: expect.any(Number),
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
        expect.objectContaining({
          event: closeEvent,
          socketGeneration: expect.any(Number),
        }),
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
        expect.objectContaining({
          error: errorEvent,
          sessionId: mockSession.sessionid,
          socketGeneration: expect.any(Number),
        }),
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

  describe('onmessage event', () => {
    it('stores call report voice_sdk_id on the owning session when received', async () => {
      connection.connect();
      await Promise.resolve();

      const ws = (connection as any)._wsClient;
      ws.simulateMessage({ id: 'message-id', voice_sdk_id: 'voice-sdk-id' });

      expect(mockSession.callReportVoiceSdkId).toBe('voice-sdk-id');
      expect(setReconnectToken).toHaveBeenCalledWith('voice-sdk-id', undefined);
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

    it('should carry registration-time generation in SocketClose even after reconnect increments socketGeneration', async () => {
      // This is the race: Connection registers handlers for socket gen N.
      // A reconnect creates gen N+1. The old socket's delayed onclose
      // fires, but the SocketClose event must carry gen N (not N+1),
      // so onNetworkClose dedupes correctly.
      connection.connect();
      await Promise.resolve();

      const oldWs = (connection as any)._wsClient;
      const oldGeneration = connection.socketGeneration; // 1

      // Simulate reconnect: connect() increments socketGeneration
      connection.connect();
      await Promise.resolve();

      const newGeneration = connection.socketGeneration; // 2
      expect(newGeneration).toBeGreaterThan(oldGeneration);

      // Old socket's onclose fires late (stale event)
      oldWs.simulateClose(1000, 'stale close');

      // SocketClose event must carry the old generation, not the new one
      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketClose,
        expect.objectContaining({
          socketGeneration: oldGeneration,
        }),
        mockSession.uuid
      );
    });

    it('should carry registration-time generation in SocketError even after reconnect increments socketGeneration', async () => {
      // Same race as above, but for onerror
      connection.connect();
      await Promise.resolve();

      const oldWs = (connection as any)._wsClient;
      const oldGeneration = connection.socketGeneration; // 1

      // Simulate reconnect
      connection.connect();
      await Promise.resolve();

      const newGeneration = connection.socketGeneration; // 2
      expect(newGeneration).toBeGreaterThan(oldGeneration);

      // Old socket's onerror fires late
      oldWs.simulateError({ type: 'error', message: 'stale error' });

      // SocketError event must carry the old generation, not the new one
      expect(trigger).toHaveBeenCalledWith(
        SwEvent.SocketError,
        expect.objectContaining({
          socketGeneration: oldGeneration,
        }),
        mockSession.uuid
      );
    });
  });

  describe('skip_trailing query parameter', () => {
    it('should append skip_trailing=true when skipTrailing option is set', () => {
      mockSession.options.skipTrailing = true;

      connection.connect();

      const ws = (connection as any)._wsClient as MockWebSocket;
      expect(ws).not.toBeNull();
      const url = new URL(ws.url);
      expect(url.searchParams.get('skip_trailing')).toBe('true');
    });

    it('should NOT append skip_trailing when skipTrailing is false', () => {
      mockSession.options.skipTrailing = false;

      connection.connect();

      const ws = (connection as any)._wsClient as MockWebSocket;
      const url = new URL(ws.url);
      expect(url.searchParams.has('skip_trailing')).toBe(false);
    });

    it('should NOT append skip_trailing when skipTrailing is not set', () => {
      connection.connect();

      const ws = (connection as any)._wsClient as MockWebSocket;
      const url = new URL(ws.url);
      expect(url.searchParams.has('skip_trailing')).toBe(false);
    });

    it('should include skip_trailing alongside other query parameters', () => {
      mockSession.options.skipTrailing = true;
      mockSession.options.useCanaryRtcServer = true;

      connection.connect();

      const ws = (connection as any)._wsClient as MockWebSocket;
      const url = new URL(ws.url);
      expect(url.searchParams.get('skip_trailing')).toBe('true');
      expect(url.searchParams.get('canary')).toBe('true');
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

// ── VSDK-318 Step 4.e — WEBSOCKET_CONNECTION_FAILED local teardown ──
describe('Connection - VSDK-318 WEBSOCKET_CONNECTION_FAILED teardown', () => {
  let connection: Connection;
  let mockSession: any;

  // A WebSocket class whose constructor always throws — simulates
  // `new WebSocket(...)` failing synchronously (e.g. invalid URL, blocked port).
  class ThrowingWebSocket {
    constructor(public url: string) {
      throw new Error('WebSocket construction failed (VSDK-318 test)');
    }
  }

  beforeAll(() => {
    setWebSocket(ThrowingWebSocket as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSession = {
      uuid: 'vsdk318-uuid',
      sessionid: 'vsdk318-session',
      callReportVoiceSdkId: null,
      options: {
        host: 'wss://test.telnyx.com',
        login: 'test-login',
        password: 'test-password',
      },
      // Spy for the local-only teardown added in Step 4.e.
      _terminateActiveCallsLocally: jest.fn(),
    };

    connection = new Connection(mockSession);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits WEBSOCKET_CONNECTION_FAILED with fatal: true when WebSocket construction throws', () => {
    (trigger as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();

    connection.connect();

    // Find the SwEvent.Error emission for WEBSOCKET_CONNECTION_FAILED (45001).
    const errorCalls = (trigger as jest.Mock).mock.calls.filter(
      (c: any[]) => c[0] === SwEvent.Error
    );
    expect(errorCalls.length).toBe(1);
    const payload = errorCalls[0][1];
    expect(payload.error.code).toBe(45001);
    expect(payload.error.name).toBe('WEBSOCKET_CONNECTION_FAILED');
    expect(payload.error.fatal).toBe(true);
    expect(payload.sessionId).toBe('vsdk318-session');
  });

  it('tears down active calls locally (no BYE) after the construction failure', () => {
    (trigger as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();

    connection.connect();

    // The session's local-only teardown must have been invoked exactly once.
    expect(mockSession._terminateActiveCallsLocally).toHaveBeenCalledTimes(1);
  });
});
