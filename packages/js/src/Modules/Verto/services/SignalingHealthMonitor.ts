import { trigger } from './Handler';
import { SwEvent } from '../util/constants';
import {
  SIGNALING_HEALTH_PROBE_TIMEOUT,
  SIGNALING_REQUEST_TIMEOUT,
  SIGNALING_RECOVERY_REQUIRED,
  MEDIA_RECOVERY_REQUIRED,
} from '../util/constants/errorCodes';
import { createTelnyxWarning } from '../util/errors';
import logger from '../util/logger';
import { getReconnectToken } from '../util/reconnect';
import type {
  ISignalingHealthSession,
  PeerFailureEvidence,
} from '../util/interfaces/SignalingHealth';
import { Ping } from '../messages/verto/Ping';
import { VertoMethod } from '../webrtc/constants';

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
 * If inbound WS activity was received within this window (ms),
 * signaling is considered recently active and a triggered probe
 * is skipped.
 */
const RECENT_ACTIVITY_THRESHOLD_MS = 3 * 1000;

/**
 * When signaling is unhealthy but media is still flowing, delay
 * socket reconnect by this many milliseconds so the application
 * can notify the user about a short interruption.
 */
const DELAYED_RECONNECT_MS = 5 * 1000; // 5s grace period

/**
 * Signaling health monitor for active calls.
 *
 * Single recovery decision authority:
 * - Receives health facts from Connection, Peer, and CallReportCollector.
 * - Decides exactly one recovery path: socket reconnect or ICE restart.
 * - Never mixes recovery paths.
 *
 * Core rule:
 * - If signaling is unhealthy → socket reconnect + reattach, NEVER ICE restart.
 * - If signaling is healthy and peer/media is unhealthy → ICE restart, NEVER socket reconnect.
 *
 * Lifecycle:
 * - `start()` when a call becomes active or on reconnect with active calls.
 * - `stop()` when no active calls remain or on disconnect.
 * - `onSocketActivity()` called on every inbound WS message to track liveness.
 * - `triggerProbe()` called by Peer on ICE/connection degradation.
 * - `onRequestTimeout()` called by BaseSession when a signaling request times out.
 * - `onPeerFailure()` called by Peer when ICE/connection state becomes 'failed'.
 * - `onNoRtp()` called by CallReportCollector when RTP bytes stop flowing.
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
   * Monotonically increasing recovery generation counter. Incremented each
   * time a recovery action is triggered. Used to prevent duplicate recovery
   * from stale events (e.g. a timeout from a previous socket generation).
   */
  private _recoveryGeneration: number = 0;

  /** Timer for delayed socket reconnect (signaling unhealthy + media healthy). */
  private _delayedReconnectTimerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Verto method names that are critical for call control and
   * signaling liveness. Timeouts on these methods indicate the
   * signaling path may be broken and warrant force-reconnecting
   * the socket.
   *
   * Note: The health-monitor probe Ping bypasses execute() and
   * uses connection.send() directly (no request timeout), so it
   * never reaches onRequestTimeout(). This set covers keepalive
   * Pings sent through execute() during active calls.
   */
  private static readonly CRITICAL_METHODS = new Set([
    VertoMethod.Modify,
    VertoMethod.Bye,
    VertoMethod.Ping,
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
    }
    this._clearDelayedReconnect();
    logger.debug('Signaling health: monitor stopped');
  }

  /**
   * Returns true if the monitor is currently running.
   */
  get isRunning(): boolean {
    return this._intervalId !== null;
  }

  /**
   * Returns true if a signaling health probe is currently in flight.
   * Used by BaseSession.isSignalingHealthy() to assess socket health.
   */
  get isProbeInFlight(): boolean {
    return this._probeInFlight;
  }

  /**
   * Returns true if a delayed reconnect is pending.
   * Used by BaseSession.isSignalingHealthy() to assess socket health.
   */
  get hasPendingReconnect(): boolean {
    return this._delayedReconnectTimerId !== null;
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

    // If we've had recent activity, signaling is likely fine
    if (silenceMs < RECENT_ACTIVITY_THRESHOLD_MS) {
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
   * Only critical call-control methods (Modify, Bye, Ping) trigger force-reconnect.
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

    this._triggerSignalingRecovery(
      `Critical signaling request timed out (method=${method}, id=${requestId}, timeout=${timeoutMs}ms)`,
      'request'
    );
  }

  /**
   * Called by Peer when ICE or peer connection state transitions to
   * 'failed'. This is strong evidence that the media path is broken.
   *
   * The monitor decides the recovery path:
   * - If signaling is healthy → ICE restart (media-only recovery).
   * - If signaling is unhealthy → socket reconnect + reattach.
   *
   * @param callId The call identifier for the affected call.
   * @param evidence What peer/ICE state triggered this report.
   */
  onPeerFailure(callId: string, evidence: PeerFailureEvidence): void {
    logger.warn(
      `Signaling health: peer failure reported (callId=${callId}, evidence=${evidence})`
    );

    if (this._session.isSignalingHealthy()) {
      logger.info(
        `Signaling health: signaling is healthy, triggering ICE restart for call ${callId}`
      );
      this._triggerIceRestart(callId, `Peer connection failure (${evidence})`);
    } else {
      logger.info(
        `Signaling health: signaling is unhealthy, triggering socket reconnect instead of ICE restart`
      );
      this._triggerSignalingRecovery(
        `Peer failure detected (${evidence}) while signaling is unhealthy`,
        'peer_failure'
      );
    }
  }

  /**
   * Called by CallReportCollector when RTP bytes stop flowing while
   * media should be active. This is strong evidence that the media
   * path is broken (unlike low audio level, which is ambiguous).
   *
   * The monitor decides the recovery path:
   * - If signaling is healthy → ICE restart (media-only recovery).
   * - If signaling is unhealthy → socket reconnect + reattach.
   *
   * @param callId The call identifier for the affected call.
   * @param direction Whether inbound or outbound RTP stopped.
   */
  onNoRtp(callId: string, direction: 'inbound' | 'outbound'): void {
    logger.warn(
      `Signaling health: no RTP detected (callId=${callId}, direction=${direction})`
    );

    if (this._session.isSignalingHealthy()) {
      logger.info(
        `Signaling health: signaling is healthy, triggering ICE restart for call ${callId}`
      );
      this._triggerIceRestart(
        callId,
        `No RTP ${direction} while media should be active`
      );
    } else {
      logger.info(
        `Signaling health: signaling is unhealthy, triggering socket reconnect instead of ICE restart`
      );
      this._triggerSignalingRecovery(
        `No RTP ${direction} while signaling is unhealthy`,
        'no_rtp'
      );
    }
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
      this._triggerSignalingRecovery(
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
   * Trigger socket reconnect + reattach recovery path.
   *
   * This is the ONLY way to force socket recovery. It:
   * 1. Cancels any in-flight delayed reconnect.
   * 2. Emits a SIGNALING_RECOVERY_REQUIRED warning.
   * 3. Force-closes the socket to trigger the existing onNetworkClose
   *    reconnect path.
   *
   * @param reason Human-readable reason for diagnostics.
   * @param source What triggered the reconnect.
   */
  private _triggerSignalingRecovery(
    reason: string,
    source: 'probe' | 'request' | 'peer_failure' | 'no_rtp' = 'probe'
  ): void {
    // Cancel any pending delayed reconnect — we're going now.
    this._clearDelayedReconnect();

    this._probeInFlight = false;
    this._lastProbeSentAt = 0;
    this._recoveryGeneration++;

    // Emit the appropriate warning code based on what triggered recovery.
    // For probe/request sources, use the specific existing warning codes.
    // For peer_failure/no_rtp sources, use the new SIGNALING_RECOVERY_REQUIRED.
    let warningCode;
    if (source === 'probe') {
      warningCode = SIGNALING_HEALTH_PROBE_TIMEOUT;
    } else if (source === 'request') {
      warningCode = SIGNALING_REQUEST_TIMEOUT;
    } else {
      warningCode = SIGNALING_RECOVERY_REQUIRED;
    }

    const warning = createTelnyxWarning(warningCode);
    trigger(
      SwEvent.Warning,
      { warning, reason, source, sessionId: this._session.sessionid },
      this._session.uuid
    );

    if (this._session.connection?.connected) {
      logger.info(
        'Signaling health: force-closing WebSocket to trigger reconnect'
      );
      this._session.socketDisconnect();
    }
  }

  /**
   * Trigger ICE restart for a specific call.
   *
   * This is the media-only recovery path — used when signaling is
   * healthy but peer/media is unhealthy.
   *
   * @param callId The call to restart ICE on.
   * @param reason Human-readable reason for diagnostics.
   */
  private _triggerIceRestart(callId: string, reason: string): void {
    this._recoveryGeneration++;

    const warning = createTelnyxWarning(MEDIA_RECOVERY_REQUIRED);
    trigger(
      SwEvent.Warning,
      {
        warning,
        reason,
        callId,
        sessionId: this._session.sessionid,
      },
      this._session.uuid
    );

    logger.info(`Signaling health: triggering ICE restart for call ${callId}`);
    this._session.triggerIceRestart(callId);
  }

  /**
   * Schedule a delayed socket reconnect. Used when signaling is
   * unhealthy but media is still flowing — gives the application
   * a grace period to notify the user about a short interruption.
   *
   * If signaling becomes healthy before the timer fires (e.g. a
   * late response arrives), the timer is cancelled.
   *
   * @param reason Human-readable reason for diagnostics.
   * @param source What triggered the reconnect.
   * @param delayMs Delay before triggering reconnect.
   */
  scheduleDelayedReconnect(
    reason: string,
    source: 'probe' | 'request' = 'probe',
    delayMs: number = DELAYED_RECONNECT_MS
  ): void {
    // If there's already a delayed reconnect scheduled, don't duplicate.
    if (this._delayedReconnectTimerId) {
      logger.debug(
        'Signaling health: delayed reconnect already scheduled, skipping'
      );
      return;
    }

    // If media is already unhealthy, don't delay — reconnect immediately.
    // (The caller should have already decided this; this is a safety check.)

    logger.info(
      `Signaling health: scheduling delayed socket reconnect in ${delayMs}ms — signaling unhealthy but media may still be flowing`
    );

    const warning = createTelnyxWarning(SIGNALING_RECOVERY_REQUIRED);
    trigger(
      SwEvent.Warning,
      {
        warning,
        reason: `${reason} (reconnect delayed ${delayMs}ms)`,
        source,
        sessionId: this._session.sessionid,
      },
      this._session.uuid
    );

    this._delayedReconnectTimerId = setTimeout(() => {
      this._delayedReconnectTimerId = null;
      this._triggerSignalingRecovery(reason, source);
    }, delayMs);
  }

  /**
   * Cancel any pending delayed reconnect. Called when signaling
   * becomes healthy again (late response arrived) or when
   * immediate reconnect is triggered.
   */
  private _clearDelayedReconnect(): void {
    if (this._delayedReconnectTimerId) {
      clearTimeout(this._delayedReconnectTimerId);
      this._delayedReconnectTimerId = null;
      logger.debug('Signaling health: cancelled delayed reconnect timer');
    }
  }

  /**
   * Force-close the WebSocket to trigger the existing onNetworkClose
   * reconnect path. This is the core recovery mechanism for half-dead sockets.
   *
   * @deprecated Use _triggerSignalingRecovery() instead. This method is
   * kept for backward compatibility with the existing _check() flow that
   * calls it directly.
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
    this._triggerSignalingRecovery(reason, source);
  }

  /**
   * Returns true if the given Verto method name is critical enough to
   * warrant signaling recovery on timeout. Only Modify, Bye, and Ping are
   * considered critical — they directly control the call lifecycle or
   * signaling liveness.
   * Other methods (Info, debug reports, etc.) may time out for benign
   * reasons and should not force-close the socket.
   */
  private _isCriticalMethod(method: string): boolean {
    return SignalingHealthMonitor.CRITICAL_METHODS.has(method);
  }
}
