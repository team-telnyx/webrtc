/**
 * Unit tests for socket reconnection attempt limit (VSDK-197)
 * and reconnect attempt deduplication (VSDK-214).
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

/**
 * Helper: simulate a socket failure cycle.
 * Passes the socketGeneration in the event payload (matching how
 * Connection.ts dispatches SocketClose/SocketError events) so that
 * onNetworkClose uses the generation of the socket that actually
 * closed, not the current connection state.
 */
function simulateSocketFailure(session: any, generation?: number) {
  if (generation !== undefined) {
    session.onNetworkClose({ socketGeneration: generation });
  } else {
    // Auto-increment generation to simulate a new socket cycle
    const gen = (session.connection.socketGeneration || 0) + 1;
    session.connection.socketGeneration = gen;
    session.onNetworkClose({ socketGeneration: gen });
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
      socketGeneration: 0,
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
        simulateSocketFailure(session);
        jest.runAllTimers();
      }

      // 10 attempts should still be within the limit
      expect(session._reconnectAttempts).toBe(10);
      expect(session._autoReconnect).toBe(true);

      // The 11th failure should exceed the default limit of 10
      simulateSocketFailure(session);
      expect(session._autoReconnect).toBe(false);
    });

    it('should allow unlimited reconnection attempts when maxReconnectAttempts is explicitly 0', () => {
      session.options.maxReconnectAttempts = 0;

      for (let i = 0; i < 20; i++) {
        simulateSocketFailure(session);
        jest.runAllTimers();
      }

      expect(session._reconnectAttempts).toBe(20);
      expect(session._autoReconnect).toBe(true);
    });
  });

  describe('with maxReconnectAttempts set', () => {
    it('should increment _reconnectAttempts on each socket failure with a new generation', () => {
      session.options.maxReconnectAttempts = 5;

      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(1);

      jest.runAllTimers();
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(2);
    });

    it('should stop reconnecting after maxReconnectAttempts is reached', () => {
      session.options.maxReconnectAttempts = 3;

      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(1);
      expect(session._autoReconnect).toBe(true);

      jest.runAllTimers();
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(2);
      expect(session._autoReconnect).toBe(true);

      jest.runAllTimers();
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(3);
      expect(session._autoReconnect).toBe(true);

      jest.runAllTimers();
      simulateSocketFailure(session);
      expect(session._autoReconnect).toBe(false);
    });

    it('should emit RECONNECTION_EXHAUSTED error when limit is reached', () => {
      session.options.maxReconnectAttempts = 2;

      simulateSocketFailure(session);
      jest.runAllTimers();
      simulateSocketFailure(session);
      jest.runAllTimers();
      simulateSocketFailure(session);

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

      simulateSocketFailure(session);
      jest.runAllTimers();
      simulateSocketFailure(session);

      expect(session._reconnectAttempts).toBe(0);
      expect(session._autoReconnect).toBe(false);
    });

    it('should not schedule a reconnect timeout after exhaustion', () => {
      session.options.maxReconnectAttempts = 1;

      simulateSocketFailure(session);
      jest.runAllTimers();
      simulateSocketFailure(session);

      expect(session._autoReconnect).toBe(false);

      // Advance timers and verify connect is NOT called again
      const callCountBefore = mockConnection.connect.mock.calls.length;
      jest.runAllTimers();
      expect(mockConnection.connect.mock.calls.length).toBe(callCountBefore);
    });

    it('should allow manual connect() after exhaustion', () => {
      session.options.maxReconnectAttempts = 1;

      // Exhaust reconnection
      simulateSocketFailure(session);
      jest.runAllTimers();
      simulateSocketFailure(session);
      expect(session._autoReconnect).toBe(false);

      // Manual connect should reset the counter and re-enable autoReconnect
      session.connect();
      expect(session._autoReconnect).toBe(true);
      expect(session._reconnectAttempts).toBe(0);
    });
  });

  describe('SocketError + SocketClose deduplication', () => {
    it('should count only one attempt when SocketError and SocketClose fire for the same socket', () => {
      session.options.maxReconnectAttempts = 5;

      // Simulate SocketError for socket generation 1
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1);

      // SocketClose for the same socket generation — should be deduped
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1); // still 1, not 2
    });

    it('should count a new attempt when a different socket generation closes', () => {
      session.options.maxReconnectAttempts = 5;

      // First socket (generation 1) closes
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1);

      // Same socket, SocketClose — deduped
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1);

      // New socket (generation 2) created and also closes
      session.onNetworkClose({ socketGeneration: 2 });
      expect(session._reconnectAttempts).toBe(2);
    });

    it('should not exhaust attempts prematurely due to double-counting', () => {
      session.options.maxReconnectAttempts = 3;

      // Each real reconnect attempt has SocketError + SocketClose
      // Generation 1: two events, counted as 1
      session.onNetworkClose({ socketGeneration: 1 });
      session.onNetworkClose({ socketGeneration: 1 }); // deduped
      expect(session._reconnectAttempts).toBe(1);

      // Generation 2: two events, counted as 1
      jest.runAllTimers();
      session.onNetworkClose({ socketGeneration: 2 });
      session.onNetworkClose({ socketGeneration: 2 }); // deduped
      expect(session._reconnectAttempts).toBe(2);

      // Generation 3: two events, counted as 1
      jest.runAllTimers();
      session.onNetworkClose({ socketGeneration: 3 });
      session.onNetworkClose({ socketGeneration: 3 }); // deduped
      expect(session._reconnectAttempts).toBe(3);
      expect(session._autoReconnect).toBe(true); // still within limit

      // Generation 4 exceeds limit
      jest.runAllTimers();
      session.onNetworkClose({ socketGeneration: 4 });
      expect(session._autoReconnect).toBe(false);
    });

    it('should not double-count when stale close from generation N arrives after reconnect creates generation N+1', () => {
      // This is the race condition: Connection.ts captures socketGeneration
      // at event-dispatch time and passes it in the event payload, so
      // onNetworkClose uses the generation of the socket that actually
      // closed — not the current connection.socketGeneration (which may
      // have already been incremented by a reconnect).
      session.options.maxReconnectAttempts = 5;

      // Socket of generation 1 has an error (SocketError)
      // Connection.ts captures socketGeneration=1 at dispatch time
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1);

      // Reconnect creates generation 2 — connection.socketGeneration is now 2
      session.connection.socketGeneration = 2;

      // Old socket's onclose fires late (SocketClose for generation 1).
      // The event carries socketGeneration=1 because Connection.ts captured
      // it at dispatch time, even though this.connection.socketGeneration
      // is now 2. This should be deduped, not counted as attempt 2.
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1); // deduped, not 2

      // Now generation 2 actually fails — should be counted
      session.onNetworkClose({ socketGeneration: 2 });
      expect(session._reconnectAttempts).toBe(2);

      // Reconnect creates generation 3
      session.connection.socketGeneration = 3;

      // Stale close from generation 2 arrives — should be deduped
      session.onNetworkClose({ socketGeneration: 2 });
      expect(session._reconnectAttempts).toBe(2); // still 2, not 3
    });

    it('should skip cleanup entirely when stale close from generation N arrives after reconnect creates generation N+1', () => {
      // Regression test: before the stale event guard, onNetworkClose would
      // run all destructive cleanup (flush reports, deregister subscriptions,
      // clear timers, stop health monitor) BEFORE checking the event
      // generation. A stale close from gen N arriving after gen N+1 was
      // established would tear down the replacement's state.
      session.options.maxReconnectAttempts = 5;

      // Gen 1 socket error — runs cleanup normally
      const stopMonitorSpy = jest.spyOn(session, 'stopSignalingHealthMonitor');
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1);
      expect(stopMonitorSpy).toHaveBeenCalledTimes(1);
      stopMonitorSpy.mockClear();

      // Reconnect creates gen 2 — simulate the replacement session
      session.connection.socketGeneration = 2;
      // Simulate the new session having active state that must not be cleared
      session.subscriptions = { test: { channel: 'events' } };

      // Stale close from gen 1 arrives — should be completely skipped
      session.onNetworkClose({ socketGeneration: 1 });
      // Cleanup must NOT have run: monitor not stopped, subscriptions intact
      expect(stopMonitorSpy).not.toHaveBeenCalled();
      expect(session.subscriptions).toEqual({ test: { channel: 'events' } });
      // Reconnect attempts should remain unchanged (not counted, not reset)
      expect(session._reconnectAttempts).toBe(1);

      // Fresh gen 2 close should still work normally
      session.onNetworkClose({ socketGeneration: 2 });
      expect(stopMonitorSpy).toHaveBeenCalledTimes(1);
      expect(session._reconnectAttempts).toBe(2);
    });

    it('should allow same-generation duplicate events to pass through for cleanup', () => {
      // When SocketError (gen 1) and SocketClose (gen 1) both arrive
      // before any reconnect happens, both events have the same generation
      // as the current connection. The stale guard should NOT block them
      // — both should run cleanup. The dedupe counter prevents double-
      // counting the reconnect attempt.
      session.options.maxReconnectAttempts = 5;

      // First event for gen 1 — runs cleanup
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1);

      // Second event for gen 1 (same generation, still current) —
      // should also run cleanup (idempotent), but not double-count
      session.onNetworkClose({ socketGeneration: 1 });
      expect(session._reconnectAttempts).toBe(1); // deduped
    });
  });

  describe('reconnect backoff', () => {
    it('should use exponential backoff for reconnect delay', () => {
      // Mock Math.random to return 0.5 for deterministic jitter
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      // Attempt 0 (before any failure): base * 2^(-1) = 0.5s → but minimum 1s
      // Actually: attempt = _reconnectAttempts, so:
      // Attempt 1: base * 2^0 = 1s, jitter = ±0.25s
      // Attempt 2: base * 2^1 = 2s, jitter = ±0.5s
      // Attempt 3: base * 2^2 = 4s, jitter = ±1s

      session._reconnectAttempts = 1;
      const delay1 = session.reconnectDelay;
      // With random=0.5: jitter = floor(1000 * 0.25 * (0.5 * 2 - 1)) = floor(0) = 0
      expect(delay1).toBe(1000);

      session._reconnectAttempts = 2;
      const delay2 = session.reconnectDelay;
      expect(delay2).toBe(2000);

      session._reconnectAttempts = 3;
      const delay3 = session.reconnectDelay;
      expect(delay3).toBe(4000);

      session._reconnectAttempts = 5;
      const delay5 = session.reconnectDelay;
      expect(delay5).toBe(16000);

      // Cap at 30s
      session._reconnectAttempts = 10;
      const delay10 = session.reconnectDelay;
      expect(delay10).toBe(30000);

      mockRandom.mockRestore();
    });

    it('should add jitter to avoid thundering herd', () => {
      const delays = new Set();
      session._reconnectAttempts = 2;

      for (let i = 0; i < 100; i++) {
        delays.add(session.reconnectDelay);
      }

      // With jitter, we should see more than 1 unique delay value
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  describe('unhealthy reconnect (socket opens but closes before REGED)', () => {
    it('should not reset attempts when socket opens during auto-reconnect without REGED', () => {
      session.options.maxReconnectAttempts = 3;

      // Attempt 1: network closes, auto-reconnect timer fires connect()
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(1);

      // Auto-reconnect calls connect() — socket opens, but _autoReconnect
      // is still true so connect() does NOT reset the counter
      jest.runAllTimers();
      session.connect(); // simulate reconnect connect() call
      expect(session._reconnectAttempts).toBe(1); // unchanged

      // Socket closes before REGED — new generation, counts as attempt 2
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(2);

      // Attempt 3: another connect() without REGED
      jest.runAllTimers();
      session.connect();
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(3);

      // Attempt 4 exceeds limit → exhaustion
      jest.runAllTimers();
      simulateSocketFailure(session);
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
      simulateSocketFailure(session);
      jest.runAllTimers();
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(2);

      // Socket opens, REGED received → resetReconnectAttempts() is called
      // (in production this is called by VertoHandler on REGED)
      session.resetReconnectAttempts();
      expect(session._reconnectAttempts).toBe(0);

      // Next network close starts a fresh bounded sequence
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(1);
      expect(session._autoReconnect).toBe(true);

      // Can go through the full limit again
      jest.runAllTimers();
      simulateSocketFailure(session);
      jest.runAllTimers();
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(3);
      expect(session._autoReconnect).toBe(true);

      jest.runAllTimers();
      simulateSocketFailure(session);
      expect(session._autoReconnect).toBe(false);
    });
  });

  describe('resetReconnectAttempts()', () => {
    it('should reset the reconnection attempt counter', () => {
      session.options.maxReconnectAttempts = 5;
      simulateSocketFailure(session);
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(2);

      session.resetReconnectAttempts();
      expect(session._reconnectAttempts).toBe(0);
    });

    it('should reset the dedup generation tracker', () => {
      session.onNetworkClose({ socketGeneration: 5 }); // counted
      expect(session._reconnectAttempts).toBe(1);

      session.resetReconnectAttempts();
      expect(session._reconnectAttempts).toBe(0);
      // Generation tracker is reset, so same generation can be counted again
      session.onNetworkClose({ socketGeneration: 5 }); // now counted because tracker was reset
      expect(session._reconnectAttempts).toBe(1);
    });
  });

  describe('disconnect()', () => {
    it('should reset _reconnectAttempts and disable autoReconnect', async () => {
      session.options.maxReconnectAttempts = 5;
      simulateSocketFailure(session);
      simulateSocketFailure(session);
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
      simulateSocketFailure(session);
      expect(session._reconnectAttempts).toBe(1);

      // connect() is called by auto-reconnect, _autoReconnect is still true
      session.connect();
      expect(session._reconnectAttempts).toBe(1);
    });
  });
});
