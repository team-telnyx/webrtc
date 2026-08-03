/**
 * Unit tests for outbound-liveness detection in SignalingHealthMonitor
 * (VSUP-171).
 *
 * The monitor used to decide health from inbound WS activity alone. On a
 * socket where b2bua-rtc keeps pinging every ~15s but nothing the SDK
 * sends is ever answered, that clock stays fresh forever and the session
 * looks healthy while being useless. These tests cover the second clock:
 * the last outbound request that came back answered.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import SignalingHealthMonitor from '../../services/SignalingHealthMonitor';

jest.mock('../../services/Handler');
jest.mock('../../util/logger');
jest.mock('../../util/reconnect', () => ({
  getReconnectToken: jest.fn(() => null),
  setReconnectToken: jest.fn(),
}));

const CHECK_INTERVAL_MS = 3_000;
const PROBE_TIMEOUT_MS = 5_000;
const OUTBOUND_CONFIRM_THRESHOLD_MS = 45_000;
/** b2bua-rtc pings at this cadence; the SDK answers each one. */
const SERVER_PING_INTERVAL_MS = 15_000;

describe('SignalingHealthMonitor – outbound liveness', () => {
  let mockSession: any;
  let monitor: SignalingHealthMonitor;
  /** Resolvers for probes sent via connection.send(), newest last. */
  let pendingProbes: Array<(value?: unknown) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    // 'modern' so advanceTimersByTime also moves Date.now() — the monitor
    // compares wall-clock timestamps, not timer ticks.
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2026-07-27T19:00:00.000Z'));

    pendingProbes = [];
    mockSession = {
      uuid: 'test-uuid',
      sessionid: 'test-session',
      hasActiveCall: jest.fn(() => true),
      triggerIceRestart: jest.fn(() => ({ started: true })),
      socketDisconnect: jest.fn(),
      connection: {
        connected: true,
        lastInboundAt: 0,
        socketGeneration: 0,
        send: jest.fn(
          () => new Promise((resolve) => pendingProbes.push(resolve))
        ),
      },
    };
    monitor = new SignalingHealthMonitor(mockSession);
    monitor.start();
  });

  afterEach(() => {
    monitor.stop();
    jest.useRealTimers();
  });

  /**
   * Advance time in check-interval steps, keeping inbound activity fresh
   * at the server ping cadence — i.e. exactly what a half-open socket
   * looks like from the inbound side.
   */
  const advanceWithInboundPings = (totalMs: number) => {
    for (let elapsed = 0; elapsed < totalMs; elapsed += CHECK_INTERVAL_MS) {
      if (elapsed % SERVER_PING_INTERVAL_MS === 0) {
        monitor.onSocketActivity();
      }
      jest.advanceTimersByTime(CHECK_INTERVAL_MS);
    }
  };

  describe('a socket that only receives', () => {
    it('stays quiet while outbound requests are still being answered', () => {
      for (let elapsed = 0; elapsed < 120_000; elapsed += CHECK_INTERVAL_MS) {
        if (elapsed % SERVER_PING_INTERVAL_MS === 0) {
          monitor.onSocketActivity();
          monitor.onOutboundConfirmed();
        }
        jest.advanceTimersByTime(CHECK_INTERVAL_MS);
      }

      expect(mockSession.connection.send).not.toHaveBeenCalled();
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });

    it('probes once inbound is flowing but nothing outbound is answered', () => {
      advanceWithInboundPings(
        OUTBOUND_CONFIRM_THRESHOLD_MS - CHECK_INTERVAL_MS
      );
      expect(mockSession.connection.send).not.toHaveBeenCalled();

      advanceWithInboundPings(CHECK_INTERVAL_MS * 2);

      expect(mockSession.connection.send).toHaveBeenCalledTimes(1);
      expect(monitor.isProbeInFlight).toBe(true);
    });

    it('declares signaling unhealthy when that probe goes unanswered', () => {
      advanceWithInboundPings(
        OUTBOUND_CONFIRM_THRESHOLD_MS + CHECK_INTERVAL_MS
      );
      expect(mockSession.connection.send).toHaveBeenCalledTimes(1);
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();

      advanceWithInboundPings(PROBE_TIMEOUT_MS + CHECK_INTERVAL_MS);

      expect(mockSession.socketDisconnect).toHaveBeenCalledTimes(1);
    });

    it('clears the alarm when the probe comes back', async () => {
      advanceWithInboundPings(
        OUTBOUND_CONFIRM_THRESHOLD_MS + CHECK_INTERVAL_MS
      );
      expect(pendingProbes).toHaveLength(1);

      pendingProbes[0]();
      await Promise.resolve();
      expect(monitor.isProbeInFlight).toBe(false);

      // The resolved probe counts as a fresh outbound round trip, so the
      // monitor should go quiet again rather than immediately re-probing.
      advanceWithInboundPings(
        OUTBOUND_CONFIRM_THRESHOLD_MS - CHECK_INTERVAL_MS
      );
      expect(mockSession.connection.send).toHaveBeenCalledTimes(1);
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('interaction with the existing inbound check', () => {
    it('still probes on inbound silence well before the outbound threshold', () => {
      // No onSocketActivity at all — inbound silence trips first, at 20s.
      jest.advanceTimersByTime(21_000);

      expect(mockSession.connection.send).toHaveBeenCalledTimes(1);
    });

    it('does nothing while the socket is disconnected', () => {
      mockSession.connection.connected = false;

      advanceWithInboundPings(OUTBOUND_CONFIRM_THRESHOLD_MS * 2);

      expect(mockSession.connection.send).not.toHaveBeenCalled();
      expect(mockSession.socketDisconnect).not.toHaveBeenCalled();
    });

    it('starts both clocks fresh on start()', () => {
      monitor.stop();
      jest.advanceTimersByTime(OUTBOUND_CONFIRM_THRESHOLD_MS * 2);
      monitor.start();

      // A stale pre-start timestamp must not cause an immediate probe.
      jest.advanceTimersByTime(CHECK_INTERVAL_MS);
      expect(mockSession.connection.send).not.toHaveBeenCalled();
    });
  });
});
