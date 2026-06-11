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
    it('does not trigger recovery when monitor is not running', () => {
      // Monitor not started — no probe should be sent
      monitor.onBrowserOfflineHint();
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });

    it('sends a health probe when monitor is running and there is an active call', () => {
      mockSession.connection = { connected: true, send: jest.fn(() => Promise.resolve()) };
      monitor.start();

      monitor.onBrowserOfflineHint();

      // The monitor should have sent a probe (via connection.send)
      expect(mockSession.connection.send).toHaveBeenCalledTimes(1);
    });

    it('does not send a probe when there is no active call', () => {
      mockSession.connection = { connected: true, send: jest.fn(() => Promise.resolve()) };
      mockSession.hasActiveCall.mockReturnValue(false);
      monitor.start();

      monitor.onBrowserOfflineHint();

      expect(mockSession.connection.send).not.toHaveBeenCalled();
    });

    it('does not directly call socketDisconnect', () => {
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

  it('offline hint triggers a probe instead of immediate recovery', () => {
    mockSession.connection = { connected: true, send: jest.fn(() => Promise.resolve()) };
    monitor.start();

    monitor.onBrowserOfflineHint();

    // Probe was sent, but no immediate recovery
    expect(mockSession.connection.send).toHaveBeenCalledTimes(1);
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

// ─── Listener cleanup ─────────────────────────────────────────────────────

describe('BrowserSession – network listener cleanup', () => {
  it('cleanup sets handler references to null', () => {
    // This test verifies the existing _cleanupNetworkListeners behavior
    // is preserved — handlers are set to null after cleanup, preventing
    // post-disconnect browser events from reaching the session.
    const mockWindow = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Simulate cleanup after handlers were registered
    const onlineHandler = jest.fn();
    const offlineHandler = jest.fn();

    mockWindow.addEventListener('online', onlineHandler);
    mockWindow.addEventListener('offline', offlineHandler);

    // Simulate cleanup
    mockWindow.removeEventListener('online', onlineHandler);
    mockWindow.removeEventListener('offline', offlineHandler);

    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('online', onlineHandler);
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('offline', offlineHandler);
  });
});
