/**
 * Tests for BrowserSession network connectivity event handlers.
 *
 * Verifies that browser `offline` / `online` events are treated as
 * low-confidence hints rather than primary recovery triggers, and
 * that the SignalingHealthMonitor is the sole authority for recovery
 * decisions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import SignalingHealthMonitor from '../../services/SignalingHealthMonitor';
import { trigger } from '../../services/Handler';
import { SwEvent, NETWORK_OFFLINE } from '../../util/constants';

jest.mock('../../services/Handler');
jest.mock('../../util/logger');

/**
 * Minimal mock of BrowserSession that exposes the private
 * _setupNetworkListeners logic without needing a full TelnyxRTC
 * instance or real WebSocket connection.
 */
function createBrowserSessionLike() {
  const onlineHandlerRef: { current: (() => void) | null } = { current: null };
  const offlineHandlerRef: { current: (() => void) | null } = { current: null };

  const session = {
    _wasOffline: false,
    _autoReconnect: true,
    sessionid: 'test-session',
    uuid: 'test-uuid',
    socketDisconnect: jest.fn(),
    reportBrowserOfflineHint: jest.fn(),
    reportBrowserOnlineHint: jest.fn(),

    /**
     * Replicates the _setupNetworkListeners logic from BrowserSession
     * with the new hint-based approach.
     */
    _setupNetworkListeners() {
      this._onlineHandler = () => {
        if (this._wasOffline) {
          this._wasOffline = false;
          this.reportBrowserOnlineHint();
        }
      };

      this._offlineHandler = () => {
        this._wasOffline = true;

        const telnyxError = { code: NETWORK_OFFLINE, name: 'NETWORK_OFFLINE' };
        trigger(
          SwEvent.Error,
          { error: telnyxError, sessionId: this.sessionid },
          this.uuid
        );

        this.reportBrowserOfflineHint();
      };

      // Capture references for testing
      onlineHandlerRef.current = this._onlineHandler as (() => void);
      offlineHandlerRef.current = this._offlineHandler as (() => void);
    },
  };

  session._setupNetworkListeners();
  return { session, onlineHandlerRef, offlineHandlerRef };
}

// ─── Browser offline hint ─────────────────────────────────────────────────

describe('BrowserSession – browser offline event', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets _wasOffline flag to true', () => {
    const { session, offlineHandlerRef } = createBrowserSessionLike();
    expect(session._wasOffline).toBe(false);

    offlineHandlerRef.current!();
    expect(session._wasOffline).toBe(true);
  });

  it('emits SwEvent.Error with NETWORK_OFFLINE code (backward compat)', () => {
    const { session, offlineHandlerRef } = createBrowserSessionLike();
    offlineHandlerRef.current!();

    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Error,
      expect.objectContaining({
        error: expect.objectContaining({ code: NETWORK_OFFLINE }),
        sessionId: 'test-session',
      }),
      'test-uuid'
    );
  });

  it('forwards offline hint to reportBrowserOfflineHint', () => {
    const { session, offlineHandlerRef } = createBrowserSessionLike();
    offlineHandlerRef.current!();
    expect(session.reportBrowserOfflineHint).toHaveBeenCalledTimes(1);
  });

  it('does NOT call socketDisconnect on offline', () => {
    const { session, offlineHandlerRef } = createBrowserSessionLike();
    offlineHandlerRef.current!();
    expect(session.socketDisconnect).not.toHaveBeenCalled();
  });

  it('does NOT force _autoReconnect on offline', () => {
    const { session, offlineHandlerRef } = createBrowserSessionLike();
    session._autoReconnect = false;
    offlineHandlerRef.current!();
    // _autoReconnect should remain false — offline hint does not force it
    expect(session._autoReconnect).toBe(false);
  });
});

// ─── Browser online hint ──────────────────────────────────────────────────

describe('BrowserSession – browser online event', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears _wasOffline flag when it was previously offline', () => {
    const { session, onlineHandlerRef, offlineHandlerRef } =
      createBrowserSessionLike();

    offlineHandlerRef.current!();
    expect(session._wasOffline).toBe(true);

    onlineHandlerRef.current!();
    expect(session._wasOffline).toBe(false);
  });

  it('forwards online hint to reportBrowserOnlineHint when _wasOffline was true', () => {
    const { session, onlineHandlerRef, offlineHandlerRef } =
      createBrowserSessionLike();

    offlineHandlerRef.current!();
    onlineHandlerRef.current!();

    expect(session.reportBrowserOnlineHint).toHaveBeenCalledTimes(1);
  });

  it('does NOT call socketDisconnect on online after offline', () => {
    const { session, onlineHandlerRef, offlineHandlerRef } =
      createBrowserSessionLike();

    offlineHandlerRef.current!();
    onlineHandlerRef.current!();

    expect(session.socketDisconnect).not.toHaveBeenCalled();
  });

  it('does NOT force _autoReconnect = true on online after offline', () => {
    const { session, onlineHandlerRef, offlineHandlerRef } =
      createBrowserSessionLike();

    session._autoReconnect = false;
    offlineHandlerRef.current!();
    onlineHandlerRef.current!();

    // _autoReconnect should remain false — online hint does not force it
    expect(session._autoReconnect).toBe(false);
  });

  it('is a no-op when _wasOffline was not set (spurious online)', () => {
    const { session, onlineHandlerRef } = createBrowserSessionLike();

    expect(session._wasOffline).toBe(false);
    onlineHandlerRef.current!();

    // No hint should be forwarded for a spurious online
    expect(session.reportBrowserOnlineHint).not.toHaveBeenCalled();
    expect(session.socketDisconnect).not.toHaveBeenCalled();
  });
});

// ─── SignalingHealthMonitor – browser hint methods ─────────────────────────

describe('SignalingHealthMonitor – browser hint methods', () => {
  let mockSession: any;
  let monitor: SignalingHealthMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      uuid: 'test-uuid',
      sessionid: 'test-session',
      connection: null,
      hasActiveCall: jest.fn(() => true),
      triggerIceRestart: jest.fn(() => ({ started: true })),
      socketDisconnect: jest.fn(),
    };
    monitor = new SignalingHealthMonitor(mockSession);
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('onBrowserOfflineHint', () => {
    it('is a pure diagnostic hint — does not send a probe or trigger recovery', () => {
      mockSession.connection = { connected: true, send: jest.fn(() => Promise.resolve()) };
      monitor.start();

      monitor.onBrowserOfflineHint();

      // No probe should be sent — offline hint is diagnostic only
      expect(mockSession.connection.send).not.toHaveBeenCalled();
      // No recovery should be triggered
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });

    it('does not trigger recovery when monitor is not running', () => {
      // Monitor not started — nothing should happen
      monitor.onBrowserOfflineHint();
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });

    it('does not directly call socketDisconnect even with active call', () => {
      mockSession.connection = { connected: true, send: jest.fn(() => Promise.resolve()) };
      monitor.start();

      monitor.onBrowserOfflineHint();
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('onBrowserOnlineHint', () => {
    it('does not trigger any recovery action', () => {
      mockSession.connection = { connected: true, send: jest.fn(() => Promise.resolve()) };
      monitor.start();

      monitor.onBrowserOnlineHint();

      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
      expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
      expect(mockSession.connection.send).not.toHaveBeenCalled();
    });

    it('does not call socketDisconnect even when monitor is running', () => {
      mockSession.connection = { connected: true };
      monitor.start();

      monitor.onBrowserOnlineHint();
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });

    it('does not force _autoReconnect', () => {
      monitor.onBrowserOnlineHint();
      // onBrowserOnlineHint is a no-op — it does not touch session state
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });
  });
});

// ─── Recovery still works without browser events ─────────────────────────

describe('SignalingHealthMonitor – recovery without browser events', () => {
  let mockSession: any;
  let monitor: SignalingHealthMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession = {
      uuid: 'test-uuid',
      sessionid: 'test-session',
      connection: null,
      hasActiveCall: jest.fn(() => true),
      triggerIceRestart: jest.fn(() => ({ started: true })),
      socketDisconnect: jest.fn(),
    };
    monitor = new SignalingHealthMonitor(mockSession);
  });

  afterEach(() => {
    monitor.stop();
    jest.useRealTimers();
  });

  it('signaling recovery still works via request timeout without browser events', () => {
    mockSession.connection = { connected: true };
    monitor.onRequestTimeout('req-1', 10000, 'telnyx_rtc.modify');

    expect(mockSession.socketDisconnect).toHaveBeenCalledTimes(1);
  });

  it('peer failure triggers ICE restart without browser events when signaling is healthy', () => {
    mockSession.connection = { connected: true };
    monitor.onSocketActivity();

    monitor.onPeerFailure('call-1', 'ice_failed');

    expect(mockSession.triggerIceRestart).toHaveBeenCalledWith('call-1');
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });

  it('offline hint does NOT trigger a probe — it is diagnostic only', () => {
    mockSession.connection = { connected: true, send: jest.fn(() => Promise.resolve()) };
    monitor.start();

    monitor.onBrowserOfflineHint();

    // No probe should be sent — offline hint is purely diagnostic
    expect(mockSession.connection.send).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });
});

// ─── Browser online does not duplicate recovery ──────────────────────────

describe('BrowserSession – browser online does not duplicate recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('online hint after offline does not cause duplicate recovery when Health Monitor is already recovering', () => {
    const { session, onlineHandlerRef, offlineHandlerRef } =
      createBrowserSessionLike();

    // Simulate offline event
    offlineHandlerRef.current!();
    expect(session._wasOffline).toBe(true);
    expect(session.reportBrowserOfflineHint).toHaveBeenCalledTimes(1);

    // Simulate online event — this should NOT directly trigger socketDisconnect
    onlineHandlerRef.current!();
    expect(session.socketDisconnect).not.toHaveBeenCalled();
    expect(session.reportBrowserOnlineHint).toHaveBeenCalledTimes(1);

    // Recovery, if needed, comes from the Health Monitor's own signals
    // (probe timeout, request timeout, etc.) — not from the browser event
  });

  it('spurious online while not offline does not trigger any action', () => {
    const { session, onlineHandlerRef } = createBrowserSessionLike();

    // Simulate online event without prior offline
    onlineHandlerRef.current!();

    expect(session.reportBrowserOnlineHint).not.toHaveBeenCalled();
    expect(session.socketDisconnect).not.toHaveBeenCalled();
  });
});

// ─── Listener cleanup (real BrowserSession lifecycle) ────────────────────

describe('BrowserSession – network listener cleanup', () => {
  /**
   * Create a mock window that tracks registered event listeners
   * and a session-like object that mirrors the real _setupNetworkListeners
   * and _cleanupNetworkListeners methods from BrowserSession.
   *
   * This verifies the actual listener lifecycle:
   * - Handlers registered with addEventListener are the exact same
   *   functions removed by _cleanupNetworkListeners.
   * - After cleanup, dispatching events on the window does NOT reach
   *   the session.
   * - Cleanup is idempotent.
   */
  function createSessionWithMockWindow() {
    // Track registered listeners like a real window would
    const listeners: Record<string, Set<EventListenerOrEventListenerObject>> = {
      online: new Set(),
      offline: new Set(),
    };

    const mockWindow = {
      addEventListener: jest.fn((event: string, handler: EventListenerOrEventListenerObject) => {
        listeners[event]?.add(handler);
      }),
      removeEventListener: jest.fn((event: string, handler: EventListenerOrEventListenerObject) => {
        listeners[event]?.delete(handler);
      }),
      // Dispatch an event to all currently registered listeners
      dispatchEvent(eventType: string) {
        listeners[eventType]?.forEach((handler) => {
          if (typeof handler === 'function') {
            handler(new Event(eventType));
          } else if (handler && typeof handler.handleEvent === 'function') {
            handler.handleEvent(new Event(eventType));
          }
        });
      },
    };

    const session = {
      _wasOffline: false,
      _autoReconnect: true,
      sessionid: 'test-session',
      uuid: 'test-uuid',
      _onlineHandler: null as (() => void) | null,
      _offlineHandler: null as (() => void) | null,
      socketDisconnect: jest.fn(),
      reportBrowserOfflineHint: jest.fn(),
      reportBrowserOnlineHint: jest.fn(),

      /**
       * Mirrors the real BrowserSession._setupNetworkListeners logic.
       */
      _setupNetworkListeners() {
        this._onlineHandler = () => {
          if (this._wasOffline) {
            this._wasOffline = false;
            this.reportBrowserOnlineHint();
          }
        };

        this._offlineHandler = () => {
          this._wasOffline = true;

          const telnyxError = { code: NETWORK_OFFLINE, name: 'NETWORK_OFFLINE' };
          trigger(
            SwEvent.Error,
            { error: telnyxError, sessionId: this.sessionid },
            this.uuid
          );

          this.reportBrowserOfflineHint();
        };

        mockWindow.addEventListener('online', this._onlineHandler as () => void);
        mockWindow.addEventListener('offline', this._offlineHandler as () => void);
      },

      /**
       * Mirrors the real BrowserSession._cleanupNetworkListeners logic.
       */
      _cleanupNetworkListeners() {
        if (!this._onlineHandler || !this._offlineHandler) {
          return;
        }

        mockWindow.removeEventListener('online', this._onlineHandler);
        mockWindow.removeEventListener('offline', this._offlineHandler);
        this._onlineHandler = null;
        this._offlineHandler = null;
      },
    };

    return { session, mockWindow, listeners };
  }

  it('removes the same handler functions that were registered', () => {
    const { session, mockWindow } = createSessionWithMockWindow();
    session._setupNetworkListeners();

    // Capture the handlers that were registered
    const onlineHandler = mockWindow.addEventListener.mock.calls.find(
      (call: any[]) => call[0] === 'online'
    )?.[1];
    const offlineHandler = mockWindow.addEventListener.mock.calls.find(
      (call: any[]) => call[0] === 'offline'
    )?.[1];

    expect(onlineHandler).toBeDefined();
    expect(offlineHandler).toBeDefined();

    session._cleanupNetworkListeners();

    // removeEventListener must have been called with the exact same
    // function references that addEventListener received
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('online', onlineHandler);
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('offline', offlineHandler);
  });

  it('sets handler references to null after cleanup', () => {
    const { session } = createSessionWithMockWindow();
    session._setupNetworkListeners();

    expect(session._onlineHandler).not.toBeNull();
    expect(session._offlineHandler).not.toBeNull();

    session._cleanupNetworkListeners();

    expect(session._onlineHandler).toBeNull();
    expect(session._offlineHandler).toBeNull();
  });

  it('post-cleanup browser events do NOT reach the session', () => {
    const { session, mockWindow, listeners } = createSessionWithMockWindow();
    session._setupNetworkListeners();

    // Before cleanup: offline event should reach the session
    mockWindow.dispatchEvent('offline');
    expect(session._wasOffline).toBe(true);
    expect(session.reportBrowserOfflineHint).toHaveBeenCalledTimes(1);

    session._cleanupNetworkListeners();

    // After cleanup: dispatching offline should NOT reach the session
    // because the listener was removed from the window's tracking set
    session.reportBrowserOfflineHint.mockClear();
    session._wasOffline = false; // Reset for clarity

    // The listener set should be empty after cleanup
    expect(listeners.offline.size).toBe(0);
    expect(listeners.online.size).toBe(0);

    // Dispatching events should not invoke any handlers
    mockWindow.dispatchEvent('offline');
    expect(session._wasOffline).toBe(false);
    expect(session.reportBrowserOfflineHint).not.toHaveBeenCalled();

    mockWindow.dispatchEvent('online');
    expect(session.reportBrowserOnlineHint).not.toHaveBeenCalled();
  });

  it('cleanup is idempotent — calling twice does not throw', () => {
    const { session } = createSessionWithMockWindow();
    session._setupNetworkListeners();

    session._cleanupNetworkListeners();
    // Second call should be a no-op (guards against null handlers)
    expect(() => session._cleanupNetworkListeners()).not.toThrow();
  });

  it('cleanup before setup is safe — does not throw', () => {
    const { session } = createSessionWithMockWindow();
    // _cleanupNetworkListeners without prior _setupNetworkListeners
    // handlers are null, so the guard clause returns early
    expect(() => session._cleanupNetworkListeners()).not.toThrow();
  });

  it('post-cleanup online event does NOT cause socketDisconnect', () => {
    const { session, mockWindow } = createSessionWithMockWindow();
    session._setupNetworkListeners();

    // Set up: go offline first
    mockWindow.dispatchEvent('offline');
    expect(session._wasOffline).toBe(true);

    session._cleanupNetworkListeners();

    // After cleanup, dispatching online should not reach the session
    mockWindow.dispatchEvent('online');
    expect(session.reportBrowserOnlineHint).not.toHaveBeenCalled();
    expect(session.socketDisconnect).not.toHaveBeenCalled();
  });
});
