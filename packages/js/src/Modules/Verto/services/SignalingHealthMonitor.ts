import { trigger } from './Handler';
import { SwEvent } from '../util/constants';
import {
  SIGNALING_HEALTH_PROBE_TIMEOUT,
  SIGNALING_REQUEST_TIMEOUT,
} from '../util/constants/errorCodes';
import { createTelnyxWarning } from '../util/errors';
import logger from '../util/logger';
import { getReconnectToken } from '../util/reconnect';
import type { ISignalingHealthSession } from '../util/interfaces/SignalingHealth';
import { Ping } from '../messages/verto/Ping';

/**
 * Threshold (ms) of WS silence during an active call before a health
 * probe (Ping) is sent.
 */
const PROBE_THRESHOLD_MS = 12 * 1000; // 12s silence → probe

/**
 * After sending a health probe, if no inbound WS activity of any kind
 * is received within this window, the signaling is declared unhealthy.
 */
const PROBE_TIMEOUT_MS = 5 * 1000; // 5s after probe → give up

/**
 * How often (ms) the periodic liveness check runs.
 */
const CHECK_INTERVAL_MS = 3 * 1000;

/**
 * Signaling health monitor for active calls.
 *
 * Detects half-dead WebSocket connections where the browser reports the
 * socket as OPEN but no inbound messages arrive (e.g. TCP connection bound
 * to a removed network interface). When detected, force-closes the socket
 * so the existing `onNetworkClose` reconnect path can establish a fresh
 * connection.
 *
 * Lifecycle:
 * - `start()` when a call becomes active or on reconnect with active calls.
 * - `stop()` when no active calls remain or on disconnect.
 * - `onSocketActivity()` called on every inbound WS message to track liveness.
 * - `triggerProbe()` called by Peer on ICE/connection degradation.
 * - `onRequestTimeout()` called by BaseSession when a signaling request times out.
 */
export default class SignalingHealthMonitor {
  /** Timestamp of the last inbound WS message. */
  private _lastInboundAt: number = 0;
  /** Timestamp of the last health probe (Ping) sent. Reset to 0 on activity. */
  private _lastProbeSentAt: number = 0;
  /** True when a probe has been sent and we're waiting for a response. */
  private _probeInFlight: boolean = false;
  /** The periodic check interval. */
  private _intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Verto method names that are critical for call control.
   * Timeouts on these methods indicate the signaling path may be broken
   * and warrant force-reconnecting the socket.
   */
  private static readonly CRITICAL_METHODS = new Set([
    'telnyx_rtc.modify',
    'telnyx_rtc.bye',
  ]);

  constructor(private readonly _session: ISignalingHealthSession) {}

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Start the monitor. Resets all state and begins periodic checks.
   */
  start(): void {
    if (this._intervalId) {
      return; // already running
    }
    logger.debug('Signaling health: monitor started');
    this._lastInboundAt = Date.now();
    this._probeInFlight = false;
    this._lastProbeSentAt = 0;

    this._intervalId = setInterval(() => this._check(), CHECK_INTERVAL_MS);
  }

  /**
   * Stop the monitor. Clears all timers and resets state.
   */
  stop(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._probeInFlight = false;
      this._lastProbeSentAt = 0;
      logger.debug('Signaling health: monitor stopped');
    }
  }

  /**
   * Returns true if the monitor is currently running.
   */
  get isRunning(): boolean {
    return this._intervalId !== null;
  }

  /**
   * Called on every inbound WS message (via SocketActivity event).
   * Updates the liveness timestamp and resolves any in-flight probe.
   */
  onSocketActivity(): void {
    this._lastInboundAt = Date.now();
    if (this._probeInFlight) {
      this._probeInFlight = false;
      this._lastProbeSentAt = 0;
      logger.debug('Signaling health: probe resolved by inbound activity');
    }
  }

  /**
   * Called by Peer when ICE/connection state degrades during an active call.
   * Sends an immediate probe rather than waiting for the periodic check.
   */
  triggerProbe(): void {
    if (
      !this._session.connection?.connected ||
      !this._session.hasActiveCall()
    ) {
      return;
    }

    if (this._probeInFlight) {
      logger.debug(
        'Signaling health: probe already in flight, skipping triggered probe'
      );
      return;
    }

    const now = Date.now();
    const silenceMs = now - this._lastInboundAt;

    // If we've had recent activity (< 3s), signaling is likely fine
    if (silenceMs < 3000) {
      logger.debug(
        'Signaling health: recent activity detected, skipping triggered probe'
      );
      return;
    }

    logger.info(
      'Signaling health: media/ICE degradation detected, sending immediate signaling probe'
    );
    this._sendProbe();
  }

  /**
   * Called when a signaling request times out (via Connection.RequestTimeoutError).
   *
   * Only critical call-control methods (Modify, Bye) trigger force-reconnect.
   * Non-critical request timeouts are logged but do not close the socket,
   * because a slow/non-answering non-critical request should not disrupt
   * otherwise healthy signaling and media.
   *
   * Note: Connection.send() already filters out stale timeouts from previous
   * socket generations (via socketGeneration check), so this method only
   * receives timeouts that belong to the current connection.
   */
  onRequestTimeout(
    requestId: string,
    timeoutMs: number,
    method: string = ''
  ): void {
    if (!this._session.connection?.connected) {
      return; // already reconnecting or disconnected
    }

    // Only critical call-control methods should trigger signaling recovery.
    // Non-critical methods (Info, debug reports, etc.) may time out for
    // benign reasons and should not force-close the socket.
    const isCritical = this._isCriticalMethod(method);

    if (!isCritical) {
      logger.warn(
        `Non-critical signaling request timed out ` +
          `(id=${requestId}, method=${method || 'unknown'}, timeout=${timeoutMs}ms) — ` +
          `logging but not triggering signaling recovery`
      );
      return;
    }

    logger.warn(
      `Critical signaling request timed out ` +
        `(id=${requestId}, method=${method}, timeout=${timeoutMs}ms) — ` +
        `declaring signaling unhealthy`
    );

    this._forceReconnect(
      `Critical signaling request timed out (method=${method}, id=${requestId}, timeout=${timeoutMs}ms)`,
      'request'
    );
  }

  // ── Private ─────────────────────────────────────────────────────────

  /**
   * Periodic check: if no inbound WS activity during an active call for
   * PROBE_THRESHOLD_MS, send a probe. If a probe is in-flight and
   * PROBE_TIMEOUT_MS has elapsed, declare signaling unhealthy.
   */
  private _check(): void {
    if (
      !this._session.hasActiveCall() ||
      !this._session.connection?.connected
    ) {
      return;
    }

    const now = Date.now();
    const silenceMs = now - this._lastInboundAt;

    // If we have recent activity, nothing to do
    if (silenceMs < PROBE_THRESHOLD_MS) {
      return;
    }

    // If no probe is in flight, send one
    if (!this._probeInFlight) {
      logger.info(
        `Signaling health: no inbound WS activity for ${Math.round(silenceMs / 1000)}s during active call, sending health probe`
      );
      this._sendProbe();
      return;
    }

    // Probe is in flight — check if it has timed out
    const probeElapsedMs = now - this._lastProbeSentAt;
    if (probeElapsedMs >= PROBE_TIMEOUT_MS) {
      logger.warn(
        `Signaling health: probe timed out after ${probeElapsedMs}ms with no inbound activity — declaring signaling unhealthy`
      );
      this._forceReconnect(
        'Signaling health probe timed out: no inbound WS activity after probe',
        'probe'
      );
    }
  }

  /**
   * Send a health probe Ping. Bypasses session.execute() to avoid the
   * active-call 10s request timeout — the probe has its own 5s timeout
   * in _check(). See the comment in _check() for why this matters.
   */
  private _sendProbe(): void {
    this._probeInFlight = true;
    this._lastProbeSentAt = Date.now();

    // IMPORTANT: We call connection.send() directly (not session.execute())
    // because the health probe has its own 5s timeout mechanism in _check().
    // Using execute() would add a 10s Connection.send() timeout via the
    // active-call request timeout. If _forceReconnect() closes the socket
    // and reconnect succeeds before that stale 10s timer fires, the old
    // Ping promise would reject, onRequestTimeout() would see the *new*
    // socket as connected, and force-close the healthy replacement.
    // Bypassing execute() avoids this race entirely.
    this._session.connection
      ?.send(new Ping(getReconnectToken()))
      .catch((error) => {
        logger.warn('Signaling health: probe Ping failed to send', error);
      });
  }

  /**
   * Force-close the WebSocket to trigger the existing onNetworkClose
   * reconnect path. This is the core recovery mechanism for half-dead sockets.
   *
   * @param reason Human-readable reason for diagnostics.
   * @param source What triggered the reconnect: 'probe' (health probe timeout)
   *        or 'request' (signaling request timeout). Determines which warning
   *        code is emitted so customer telemetry is not misleading.
   */
  private _forceReconnect(
    reason: string,
    source: 'probe' | 'request' = 'probe'
  ): void {
    this._probeInFlight = false;
    this._lastProbeSentAt = 0;

    // Emit a source-specific warning so telemetry accurately reflects
    // what triggered the reconnect — probe timeout vs request timeout.
    const warningCode =
      source === 'probe'
        ? SIGNALING_HEALTH_PROBE_TIMEOUT
        : SIGNALING_REQUEST_TIMEOUT;
    const warning = createTelnyxWarning(warningCode);
    trigger(
      SwEvent.Warning,
      { warning, reason, source, sessionId: this._session.sessionid },
      this._session.uuid
    );

    // Use socketDisconnect() instead of this.connection.close() — it's
    // safer: also clears keepalive, marks idle, and ensures the
    // onNetworkClose reconnect path is triggered properly.
    if (this._session.connection?.connected) {
      logger.info(
        'Signaling health: force-closing WebSocket to trigger reconnect'
      );
      this._session.socketDisconnect();
    }
  }

  /**
   * Returns true if the given Verto method name is critical enough to
   * warrant signaling recovery on timeout. Only Modify and Bye are
   * considered critical — they directly control the call lifecycle.
   * Other methods (Info, debug reports, etc.) may time out for benign
   * reasons and should not force-close the socket.
   */
  private _isCriticalMethod(method: string): boolean {
    return SignalingHealthMonitor.CRITICAL_METHODS.has(method);
  }
}
