/**
 * Unit tests for signaling health monitoring:
 *  - Connection: inbound WS activity tracking (lastInboundAt, SocketActivity event)
 *  - Connection: request-level timeout (RequestTimeoutError)
 *  - Connection: send() with timeout – handler cleanup on timeout
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Unmock Connection to test the real implementation
jest.unmock('../../services/Connection');

import Connection, {
  RequestTimeoutError,
  setWebSocket,
} from '../../services/Connection';
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
