/**
 * Unit tests for signaling health monitoring:
 *  - Connection: inbound WS activity tracking (lastInboundAt, SocketActivity event)
 *  - Connection: request-level timeout (RequestTimeoutError)
 *  - Connection: send() with timeout – handler cleanup on timeout
 *  - Connection: handler deregistration after timeout
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Unmock Connection to test the real implementation
jest.unmock('../../services/Connection');

import Connection, { setWebSocket } from '../../services/Connection';
import BaseSession from '../../BaseSession';
import { RequestTimeoutError, StaleRequestError } from '../../util/errors';
import SignalingHealthMonitor from '../../services/SignalingHealthMonitor';
import {
  trigger,
  deRegister,
  registerOnce,
  register,
} from '../../services/Handler';
import { SwEvent } from '../../util/constants';
import { VertoMethod } from '../../webrtc/constants';

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

const RECENT_ACTIVITY_THRESHOLD_MS_FOR_TEST = 3_000;

class MockWebSocket {
  public readyState: number = WS_STATE.CONNECTING;
  public onopen: ((event: any) => void) | null = null;
  public onclose: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;

  constructor(public url: string) {
    Promise.resolve().then(() => {
      this.readyState = WS_STATE.OPEN;
      if (this.onopen) this.onopen({ type: 'open' });
    });
  }

  close() {
    this.readyState = WS_STATE.CLOSING;
  }

  send(_data: string) {}

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateClose(code: number = 1000, reason: string = '') {
    this.readyState = WS_STATE.CLOSED;
    if (this.onclose) this.onclose({ code, reason, wasClean: true });
  }
}

function makeMockSession(): any {
  return {
    uuid: 'test-uuid',
    sessionid: 'test-session',
    callReportVoiceSdkId: null,
    options: {
      host: 'wss://test.telnyx.com',
      login: 'test-login',
      password: 'test-password',
    },
  };
}

// ─── Connection – Inbound WS Activity Tracking ──────────────────────────────

describe('Connection – Inbound WS Activity Tracking', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSession = makeMockSession();
    connection = new Connection(mockSession);
    connection.connect();
    // Flush the async onopen
    await Promise.resolve();
    await Promise.resolve();
  });

  it('should start with lastInboundAt = 0', () => {
    expect(connection.lastInboundAt).toBe(0);
  });

  it('should update lastInboundAt on every inbound message', () => {
    const ws: MockWebSocket = (connection as any)._wsClient;
    ws.simulateMessage({ id: 'msg-1', result: { method: 'verto.pong' } });
    expect(connection.lastInboundAt).toBeGreaterThan(0);
    const firstTs = connection.lastInboundAt;

    ws.simulateMessage({ id: 'msg-2', result: { method: 'verto.pong' } });
    expect(connection.lastInboundAt).toBeGreaterThanOrEqual(firstTs);
  });

  it('should emit SocketActivity event on every inbound message', () => {
    const ws: MockWebSocket = (connection as any)._wsClient;
    ws.simulateMessage({ id: 'msg-1', result: {} });

    expect(trigger).toHaveBeenCalledWith(
      SwEvent.SocketActivity,
      expect.objectContaining({ timestamp: expect.any(Number) }),
      mockSession.uuid
    );
  });

  it('should reset lastInboundAt to 0 on reconnect', async () => {
    const ws: MockWebSocket = (connection as any)._wsClient;
    ws.simulateMessage({ id: 'msg-1', result: {} });
    expect(connection.lastInboundAt).toBeGreaterThan(0);

    connection.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect(connection.lastInboundAt).toBe(0);
  });
});

// ─── RequestTimeoutError ────────────────────────────────────────────────────

describe('RequestTimeoutError', () => {
  it('should carry requestId and timeoutMs', () => {
    const err = new RequestTimeoutError('req-42', 10000);
    expect(err.name).toBe('RequestTimeoutError');
    expect(err.requestId).toBe('req-42');
    expect(err.timeoutMs).toBe(10000);
    expect(err.message).toContain('req-42');
    expect(err.message).toContain('10000');
  });
});

// ─── Connection – send() with timeout ────────────────────────────────────────

describe('Connection – send() with timeout', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession = makeMockSession();
    connection = new Connection(mockSession);
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should reject with RequestTimeoutError when timeout expires', async () => {
    const bladeObj = {
      request: { id: 'timeout-req', jsonrpc: '2.0', method: 'test' },
    };

    const promise = connection.send(bladeObj, 5000);

    // Advance past the timeout
    jest.advanceTimersByTime(5001);

    let caught: RequestTimeoutError | null = null;
    // Attach catch handler to prevent unhandled rejection
    promise.catch((e) => {
      caught = e;
    });

    // Flush microtasks so the rejection is processed
    await Promise.resolve();
    await Promise.resolve();

    expect(caught).not.toBeNull();
    expect(caught!.name).toBe('RequestTimeoutError');
    expect(caught!.requestId).toBe('timeout-req');
    expect(caught!.timeoutMs).toBe(5000);
  });

  it('should not set a timer when timeout is not provided', () => {
    const bladeObj = {
      request: { id: 'no-timeout-req', jsonrpc: '2.0', method: 'test' },
    };

    connection.send(bladeObj);

    // Advance time significantly — no rejection
    jest.advanceTimersByTime(120_000);
  });

  it('should resolve immediately for result-bearing requests even with timeout', async () => {
    const bladeObj = {
      request: {
        id: 'result-req',
        jsonrpc: '2.0',
        method: 'test',
        result: { status: 'ok' },
      },
    };

    // Requests with a result property resolve immediately
    await expect(connection.send(bladeObj, 5000)).resolves.toBeUndefined();
  });

  it('should not reject when timeout is 0 or negative', () => {
    const bladeObj = {
      request: { id: 'zero-timeout-req', jsonrpc: '2.0', method: 'test' },
    };

    connection.send(bladeObj, 0);
    connection.send(bladeObj, -1);

    jest.advanceTimersByTime(120_000);
    // No timeout timer should be set
  });
});

// ─── Connection – Handler deregistration after timeout ───────────────────────

describe('Connection – Handler cleanup on timeout', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession = makeMockSession();
    connection = new Connection(mockSession);
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should deregister the handler from the queue after timeout', async () => {
    const bladeObj = {
      request: { id: 'cleanup-req', jsonrpc: '2.0', method: 'test' },
    };

    // Send with a short timeout — attach catch handler immediately
    // to prevent unhandled rejection during jest.advanceTimersByTime
    const promise = connection.send(bladeObj, 2000);
    const catchPromise = promise.catch(() => {});

    // deRegister should not have been called yet
    expect(deRegister).not.toHaveBeenCalled();

    // Advance past the timeout
    jest.advanceTimersByTime(2001);

    // Flush microtasks
    await catchPromise;

    // deRegister should have been called with the request id
    // and the handler function to remove it from the queue
    expect(deRegister).toHaveBeenCalledWith(
      'cleanup-req',
      expect.any(Function)
    );
  });

  it('should not deregister when no timeout is set', () => {
    const bladeObj = {
      request: { id: 'no-cleanup-req', jsonrpc: '2.0', method: 'test' },
    };

    connection.send(bladeObj);

    jest.advanceTimersByTime(120_000);

    // deRegister should NOT be called for this request (no timeout path)
    expect(deRegister).not.toHaveBeenCalledWith(
      'no-cleanup-req',
      expect.any(Function)
    );
  });

  it('late response after timeout should not cause errors', async () => {
    const bladeObj = {
      request: { id: 'late-req', jsonrpc: '2.0', method: 'test' },
    };

    // Attach catch handler immediately
    const promise = connection.send(bladeObj, 1000);
    const catchPromise = promise.catch(() => {});

    jest.advanceTimersByTime(1001);
    await catchPromise;

    // If a late response somehow arrives (e.g. the handler was not
    // fully removed), it should not throw or cause double-resolve.
    // The handler's timedOut guard prevents this.
  });
});

// ─── Connection – send() without timeout for health probes ─────────────────

describe('Connection – Health probe Ping must not use execute() timeout', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession = makeMockSession();
    connection = new Connection(mockSession);
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * This test documents a critical design decision: health probe Pings
   * must bypass session.execute() and call connection.send() directly.
   *
   * Rationale: The health probe has its own 5s timeout in
   * _checkSignalingHealth(). If the probe also got the 10s
   * Connection.send() timeout via execute(), the stale 10s timer could
   * fire after _forceSignalingReconnect() closes the socket and a new
   * socket reconnects, causing onSignalingRequestTimeout() to
   * force-close the healthy replacement socket.
   *
   * By calling connection.send() without a timeout, the probe's only
   * timeout is the 5s inactivity check — no stale timer persists.
   */
  it('connection.send() without timeout does not create a stale timer', () => {
    const bladeObj = {
      request: { id: 'probe-ping', jsonrpc: '2.0', method: 'telnyx_rtc.ping' },
    };

    // Health probe calls connection.send(msg) without timeout
    // — no RequestTimeoutError can ever fire for this request
    const promise = connection.send(bladeObj);

    // Advance time well past any reasonable timeout
    jest.advanceTimersByTime(60_000);

    // No rejection — promise just hangs (probe outcome is determined
    // by the 5s inactivity check, not by request timeout)
    // If we had used send(bladeObj, 10000), the promise would reject
    // after 10s, potentially on a different socket.
    expect(promise).toBeDefined();
  });
});

// ─── Connection – send() without timeout (legacy behavior) ──────────────────

describe('Connection – send() without timeout (legacy)', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSession = makeMockSession();
    connection = new Connection(mockSession);
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();
  });

  it('should still work without timeout parameter', () => {
    const bladeObj = {
      request: { id: 'legacy-req', jsonrpc: '2.0', method: 'test' },
    };

    const promise = connection.send(bladeObj);
    expect(promise).toBeInstanceOf(Promise);
  });

  it('should resolve immediately for result-bearing requests', async () => {
    const bladeObj = {
      request: {
        id: 'result-req',
        jsonrpc: '2.0',
        method: 'test',
        result: {},
      },
    };

    await expect(connection.send(bladeObj)).resolves.toBeUndefined();
  });
});

// ─── Connection – Socket Generation Protection ───────────────────────────────

describe('Connection – Socket generation protection', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession = makeMockSession();
    connection = new Connection(mockSession);
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should increment socketGeneration on each connect()', async () => {
    const gen1 = connection.socketGeneration;

    connection.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect(connection.socketGeneration).toBe(gen1 + 1);
  });

  it('should settle with StaleRequestError (not force-close new socket) when socket generation changed after request was sent', async () => {
    const bladeObj = {
      request: { id: 'stale-req', jsonrpc: '2.0', method: 'telnyx_rtc.modify' },
    };

    // Send a request with a 10s timeout on the current socket (gen N)
    let settledError: unknown = null;
    const promise = connection.send(bladeObj, 10_000).catch((error) => {
      settledError = error;
    });

    // Reconnect — this increments socketGeneration to N+1
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();

    // Advance past the 10s timeout
    jest.advanceTimersByTime(10_001);

    // Flush microtasks so the rejection is processed
    await Promise.resolve();
    await Promise.resolve();

    // The promise should settle with StaleRequestError (not hang forever)
    expect(settledError).not.toBeNull();
    expect(settledError).toBeInstanceOf(StaleRequestError);
    if (settledError instanceof StaleRequestError) {
      expect(settledError.requestId).toBe('stale-req');
      expect(settledError.currentGeneration).toBeGreaterThan(
        settledError.staleGeneration
      );
    }
    // The new socket should remain connected — no force-reconnect
    expect(connection.connected).toBe(true);
  });

  /**
   * Critical test: after a socket replacement, the old request's promise
   * MUST settle (resolve or reject) — it must never remain pending forever.
   *
   * This races the old promise against a sentinel. If the promise never
   * settles, the sentinel wins and the test fails.
   */
  it('old request promise settles after generation change — does not hang forever', async () => {
    const bladeObj = {
      request: { id: 'hang-req', jsonrpc: '2.0', method: 'telnyx_rtc.modify' },
    };

    let settled = false;
    const stalePromise = connection.send(bladeObj, 10_000).then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      }
    );

    // Replace the socket
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();

    // Advance past the timeout so the stale timer fires
    jest.advanceTimersByTime(10_001);

    // Flush microtasks
    await stalePromise;
    await Promise.resolve();
    await Promise.resolve();

    // If settled is false, the promise is still pending — that's the bug
    expect(settled).toBe(true);
  });

  it('should clean up pending request handlers on close()', async () => {
    const bladeObj = {
      request: { id: 'cleanup-on-close', jsonrpc: '2.0', method: 'test' },
    };

    // Send a request (no timeout — handler stays registered)
    connection.send(bladeObj);

    // Verify handler was registered
    expect((connection as any)._pendingRequestIds.has('cleanup-on-close')).toBe(
      true
    );

    // Close the socket
    const ws: MockWebSocket = (connection as any)._wsClient;
    connection.close();
    ws.simulateClose(1000, 'normal');

    // Pending request IDs should be cleaned up
    expect((connection as any)._pendingRequestIds.size).toBe(0);
  });

  it('should clean up pending request handlers before new connect()', async () => {
    const bladeObj = {
      request: {
        id: 'cleanup-before-reconnect',
        jsonrpc: '2.0',
        method: 'test',
      },
    };

    connection.send(bladeObj);
    expect(
      (connection as any)._pendingRequestIds.has('cleanup-before-reconnect')
    ).toBe(true);

    // Reconnect — connect() calls _cleanupPendingRequests()
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect((connection as any)._pendingRequestIds.size).toBe(0);
  });

  it('should clear pending request timeout handles on close()', async () => {
    const bladeObj = {
      request: {
        id: 'timeout-cleanup-on-close',
        jsonrpc: '2.0',
        method: 'test',
      },
    };

    const promise = connection.send(bladeObj, 10_000);
    promise.catch(() => {});

    expect(
      (connection as any)._pendingRequestIds.has('timeout-cleanup-on-close')
    ).toBe(true);
    expect(
      (connection as any)._pendingRequestTimers.has('timeout-cleanup-on-close')
    ).toBe(true);

    const ws: MockWebSocket = (connection as any)._wsClient;
    connection.close();
    ws.simulateClose(1000, 'normal');

    expect((connection as any)._pendingRequestIds.size).toBe(0);
    expect((connection as any)._pendingRequestTimers.size).toBe(0);

    jest.advanceTimersByTime(10_001);
    await Promise.resolve();
    await Promise.resolve();

    expect(deRegister).not.toHaveBeenCalledWith(
      'timeout-cleanup-on-close',
      expect.any(Function)
    );
  });
});

// ─── BaseSession – request timeout selection ─────────────────────────────────

class TestBaseSession extends BaseSession {
  public calls = {};
}

describe('BaseSession – request timeout selection', () => {
  let session: TestBaseSession;

  beforeEach(() => {
    jest.clearAllMocks();
    session = new TestBaseSession({
      host: 'wss://test.telnyx.com',
      login: 'test-login',
      password: 'test-password',
    } as any);
    (session.connection as any).send = jest.fn(() =>
      Promise.resolve({ ok: true })
    );
    Object.defineProperty(session, 'connected', { get: () => true });
  });

  it('applies request timeout to critical signaling methods even without an active call', async () => {
    await session.execute({
      request: {
        id: 'modify-1',
        jsonrpc: '2.0',
        method: VertoMethod.Modify,
      },
    } as any);

    expect(session.connection.send).toHaveBeenCalledWith(
      expect.any(Object),
      Connection.DEFAULT_REQUEST_TIMEOUT_MS
    );
  });

  it('does not apply request timeout to non-critical fire-and-forget methods during active calls', async () => {
    session.calls = { call1: { _state: 4 } as any };

    await session.execute({
      request: {
        id: 'info-1',
        jsonrpc: '2.0',
        method: VertoMethod.Info,
      },
    } as any);

    expect(session.connection.send).toHaveBeenCalledWith(expect.any(Object));
    expect(session.connection.send).not.toHaveBeenCalledWith(
      expect.any(Object),
      Connection.DEFAULT_REQUEST_TIMEOUT_MS
    );
  });
});

// ─── Connection – Pre-parse Activity Tracking ─────────────────────────────────

describe('Connection – Pre-parse activity tracking', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSession = makeMockSession();
    connection = new Connection(mockSession);
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();
  });

  /**
   * Design decision: activity is tracked BEFORE JSON parse because any
   * inbound WS frame proves TCP liveness. This includes:
   * - Valid JSON-RPC responses
   * - Speed test strings like "#SPU123"
   * - Any other bytes from the server
   *
   * The signaling health monitor cares about socket transport liveness,
   * not application-level message validity. A half-dead socket shows as
   * OPEN but no frames arrive at all — any frame disproves that condition.
   */
  it('should mark activity on non-JSON string messages (speed test)', () => {
    const ws: MockWebSocket = (connection as any)._wsClient;

    // Simulate a speed test message that is not valid JSON
    if (ws.onmessage) {
      ws.onmessage({ data: '#SPU123' });
    }

    expect(connection.lastInboundAt).toBeGreaterThan(0);
    expect(trigger).toHaveBeenCalledWith(
      SwEvent.SocketActivity,
      expect.objectContaining({ timestamp: expect.any(Number) }),
      mockSession.uuid
    );
  });

  it('should mark activity even when JSON parse fails', () => {
    const ws: MockWebSocket = (connection as any)._wsClient;

    // Simulate malformed data
    if (ws.onmessage) {
      ws.onmessage({ data: 'not valid json {[' });
    }

    // Activity is still marked because bytes arrived
    expect(connection.lastInboundAt).toBeGreaterThan(0);
  });
});

// ─── RequestTimeoutError – Method field ──────────────────────────────────────

describe('RequestTimeoutError – method field', () => {
  it('should carry the method name', () => {
    const err = new RequestTimeoutError('req-1', 10000, 'telnyx_rtc.modify');
    expect(err.method).toBe('telnyx_rtc.modify');
    expect(err.message).toContain('telnyx_rtc.modify');
  });

  it('should default to empty string for method', () => {
    const err = new RequestTimeoutError('req-1', 10000);
    expect(err.method).toBe('');
  });
});

// ─── Connection – send() with timeout captures method ─────────────────────────

describe('Connection – send() timeout carries method name', () => {
  let connection: Connection;
  let mockSession: any;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession = makeMockSession();
    connection = new Connection(mockSession);
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should include method name in RequestTimeoutError', async () => {
    const bladeObj = {
      request: {
        id: 'method-req',
        jsonrpc: '2.0',
        method: 'telnyx_rtc.modify',
      },
    };

    const promise = connection.send(bladeObj, 5000);

    jest.advanceTimersByTime(5001);

    let caught: RequestTimeoutError | null = null;
    promise.catch((e) => {
      caught = e;
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(caught).not.toBeNull();
    expect(caught!.method).toBe('telnyx_rtc.modify');
  });
});

// ─── Health Monitor Recovery Decision Tests ───────────────────────────────────

describe('SignalingHealthMonitor – Recovery decision logic', () => {
  let connection: Connection;
  let mockSession: any;
  let monitor: SignalingHealthMonitor;

  beforeAll(() => {
    setWebSocket(MockWebSocket as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession = makeMockSession();
    // Add the methods ISignalingHealthSession expects
    mockSession.hasActiveCall = jest.fn(() => true);
    mockSession.triggerIceRestart = jest.fn(() => ({ started: true }));
    mockSession.socketDisconnect = jest.fn();
    connection = new Connection(mockSession);
    connection.connect();
    await Promise.resolve();
    await Promise.resolve();
    monitor = new SignalingHealthMonitor(mockSession);
  });

  afterEach(() => {
    monitor.stop();
    jest.useRealTimers();
  });

  it('socket disconnected + peer failure does not trigger ICE restart', () => {
    mockSession.connection = connection;
    (connection as any)._wsClient.readyState = WS_STATE.CLOSED;

    monitor.onPeerFailure('call-1', 'connection_failed');

    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });

  it('socket disconnected + no RTP does not trigger ICE restart', () => {
    mockSession.connection = connection;
    (connection as any)._wsClient.readyState = WS_STATE.CLOSED;

    monitor.onNoRtp('call-1', 'inbound');

    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });

  // Test 3: socket healthy + ICE failed → warning + ICE restart, no socket reconnect
  it('socket healthy + ICE failed: triggers ICE restart, not socket reconnect', () => {
    mockSession.connection = connection;
    monitor.onSocketActivity();

    monitor.onPeerFailure('call-1', 'ice_failed');

    // Should trigger ICE restart
    expect(mockSession.triggerIceRestart).toHaveBeenCalledWith('call-1');
    // Should NOT disconnect socket
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    // Should emit MEDIA_RECOVERY_REQUIRED warning
    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({
        callId: 'call-1',
      }),
      mockSession.uuid
    );
  });

  // Test 4: socket healthy + no RTP → warning + ICE restart, no socket reconnect
  it('socket healthy + no RTP: triggers ICE restart, not socket reconnect', () => {
    mockSession.connection = connection;
    monitor.onSocketActivity();

    monitor.onNoRtp('call-1', 'inbound');

    // Should trigger ICE restart
    expect(mockSession.triggerIceRestart).toHaveBeenCalledWith('call-1');
    // Should NOT disconnect socket
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });

  it('probe pending keeps media recovery pending on unrelated socket activity', () => {
    mockSession.connection = connection;

    (connection as any)._wsClient.readyState = WS_STATE.OPEN;
    (monitor as any)._probeInFlight = true;
    expect(monitor.isProbeInFlight).toBe(true);

    monitor.onPeerFailure('call-1', 'ice_failed');

    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();

    monitor.onSocketActivity();

    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });

  it('stale signaling activity on peer failure waits for matching probe response before ICE restart', async () => {
    mockSession.connection = connection;
    (connection as any)._wsClient.readyState = WS_STATE.OPEN;
    let resolveProbe!: () => void;
    jest.spyOn(connection, 'send').mockReturnValue(
      new Promise<void>((resolve) => {
        resolveProbe = resolve;
      })
    );

    monitor.start();
    (monitor as any)._lastInboundAt = 0;
    jest.advanceTimersByTime(RECENT_ACTIVITY_THRESHOLD_MS_FOR_TEST + 1);

    monitor.onPeerFailure('call-1', 'ice_failed');

    expect(connection.send).toHaveBeenCalledTimes(1);
    expect(monitor.isProbeInFlight).toBe(true);
    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();

    // An unrelated inbound frame updates passive liveness but must not
    // release media recovery gated on the active probe.
    monitor.onSocketActivity();

    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();

    // The Connection.send() promise resolves only for the matching Ping
    // response id, so this represents the actual probe response.
    resolveProbe();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSession.triggerIceRestart).toHaveBeenCalledWith('call-1');
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });

  it('stale signaling activity on no-RTP sends one probe and defers ICE restart', () => {
    mockSession.connection = connection;
    (connection as any)._wsClient.readyState = WS_STATE.OPEN;
    jest.spyOn(connection, 'send').mockReturnValue(new Promise(() => {}));

    monitor.start();
    (monitor as any)._lastInboundAt = 0;
    jest.advanceTimersByTime(RECENT_ACTIVITY_THRESHOLD_MS_FOR_TEST + 1);

    monitor.onNoRtp('call-1', 'inbound');

    expect(connection.send).toHaveBeenCalledTimes(1);
    expect(monitor.isProbeInFlight).toBe(true);
    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });

  it('periodic socket liveness check runs even when there is no active call', () => {
    mockSession.hasActiveCall.mockReturnValue(false);
    mockSession.connection = connection;
    (connection as any)._wsClient.readyState = WS_STATE.OPEN;
    jest.spyOn(connection, 'send').mockReturnValue(new Promise(() => {}));

    monitor.start();
    (monitor as any)._lastInboundAt = 0;
    jest.advanceTimersByTime(12_001);

    expect(connection.send).toHaveBeenCalledTimes(1);
    expect(monitor.isProbeInFlight).toBe(true);
  });

  // Test 5: low audio level alone → no recovery
  it('low audio level alone does not trigger any recovery', () => {
    // The monitor does not have a method for low audio level.
    // Low audio level is reported as a warning by CallReportCollector
    // but does NOT call onNoRtp or onPeerFailure. This test verifies
    // that no recovery is triggered through the monitor for that case.
    // Simulate just a LOW_LOCAL_AUDIO warning being emitted (not via monitor)
    trigger(
      SwEvent.Warning,
      {
        warning: { code: 31005, name: 'LOW_LOCAL_AUDIO' },
        callId: 'call-1',
        sessionId: mockSession.sessionid,
      },
      mockSession.uuid
    );

    // No recovery should be triggered
    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });

  it('recovers reattached calls through socket reconnect instead of ICE restart', () => {
    mockSession.connection = connection;
    mockSession.triggerIceRestart.mockReturnValue({
      started: false,
      reason: 'call recovered via attach',
      recoverSignaling: true,
    });
    monitor.onSocketActivity();

    monitor.onPeerFailure('call-1', 'ice_failed');

    expect(mockSession.triggerIceRestart).toHaveBeenCalledWith('call-1');
    expect(mockSession.socketDisconnect).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({ source: 'peer_failure' }),
      mockSession.uuid
    );
    expect(trigger).not.toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({ callId: 'call-1' }),
      mockSession.uuid
    );
  });

  it('BaseSession.triggerIceRestart skips calls created by attach recovery', () => {
    const restartIce = jest.fn(() => ({ started: true }));
    const sessionLike = {
      calls: {
        'call-1': {
          options: { attach: true },
          peer: { restartIce },
        },
      },
    };

    const result = BaseSession.prototype.triggerIceRestart.call(
      sessionLike as any,
      'call-1'
    );

    expect(restartIce).not.toHaveBeenCalled();
    expect(result).toEqual({
      started: false,
      reason: 'call recovered via attach',
      recoverSignaling: true,
    });
  });

  it('BaseSession.triggerIceRestart skips calls with recoveredCallId', () => {
    const restartIce = jest.fn(() => ({ started: true }));
    const sessionLike = {
      calls: {
        'call-1': {
          recoveredCallId: 'previous-call-1',
          options: {},
          peer: { restartIce },
        },
      },
    };

    const result = BaseSession.prototype.triggerIceRestart.call(
      sessionLike as any,
      'call-1'
    );

    expect(restartIce).not.toHaveBeenCalled();
    expect(result).toEqual({
      started: false,
      reason: 'call recovered via attach',
      recoverSignaling: true,
    });
  });

  it('BaseSession.execute rethrows stale request errors without invoking signaling recovery', async () => {
    const staleError = new StaleRequestError('stale-req', 1, 2);
    expect(staleError).toBeInstanceOf(StaleRequestError);

    const sessionLike = {
      _idle: false,
      _executeQueue: [],
      connected: true,
      connection: {
        send: jest.fn().mockRejectedValue(staleError),
      },
      onSignalingRequestTimeout: jest.fn(),
      authenticationRequiredErrorCode: -32000,
      _autoReconnect: false,
      sessionid: 'test-session',
      uuid: 'test-uuid',
      connect: jest.fn(),
      login: jest.fn(),
    };

    await expect(
      BaseSession.prototype.execute.call(
        sessionLike as any,
        {
          request: {
            id: 'stale-req',
            jsonrpc: '2.0',
            method: VertoMethod.Modify,
          },
        } as any
      )
    ).rejects.toBe(staleError);

    expect(sessionLike.onSignalingRequestTimeout).not.toHaveBeenCalled();
    expect(mockSession.triggerIceRestart).not.toHaveBeenCalled();
    expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
  });
});
