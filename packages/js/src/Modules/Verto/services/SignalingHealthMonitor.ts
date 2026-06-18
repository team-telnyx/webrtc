import { trigger } from './Handler';
import { SwEvent } from '../util/constants';
import {
  SIGNALING_HEALTH_PROBE_TIMEOUT,
  SIGNALING_REQUEST_TIMEOUT,
  SIGNALING_RECOVERY_REQUIRED,
  MEDIA_RECOVERY_REQUIRED,
  ACTIVE_CALL_RECONNECTION_TIMEOUT,
} from '../util/constants/errorCodes';
import { createTelnyxWarning, createTelnyxError } from '../util/errors';
import logger from '../util/logger';
import { getReconnectToken } from '../util/reconnect';
import type {
  ISignalingHealthSession,
  PeerFailureEvidence,
} from '../util/interfaces/SignalingHealth';
import { Ping } from '../messages/verto/Ping';
import { VertoMethod, State } from '../webrtc/constants';

/**
 * Threshold (ms) of WS silence during an active call before a health
 * probe (Ping) is sent.
 */
const PROBE_THRESHOLD_MS = 20 * 1000; // 20s silence → probe

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

type PendingMediaRecovery = {
  callId: string;
  reason: string;
  source: 'peer_failure' | 'no_rtp';
};

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

  /** Media recovery to execute only after a probe proves signaling is healthy. */
  private _pendingMediaRecovery: PendingMediaRecovery | null = null;

  /** Reconnection timeout handle, set when signaling recovery starts and
   *  maxTimeoutForReconnectionMs is configured. Cleared on successful
   *  reconnection, full disconnect, or timeout expiry.
   *  IMPORTANT: This timer survives stop() during reconnect — it must outlive
   *  the expected socket-close lifecycle that stop() is called from. */
  private _reconnectionTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** True when signaling recovery (socket reconnect + reattach) is in progress.
   *  Prevents stop() from clearing the reconnection timeout. */
  private _isReconnecting: boolean = false;

  /** Call IDs that are pending media recovery confirmation.
   *  When a call confirms media recovery (RTCPeerConnection reaches 'connected'),
   *  it is removed from this set. The session-level reconnection timeout is only
   *  cleared when this set becomes empty (all recovering calls have confirmed
   *  media). This prevents a single call's recovery from prematurely clearing
   *  the timeout while other calls are still recovering. */
  private _pendingRecoveryCallIds: Set<string> = new Set();

  /**
   * Verto method names that are critical for call control and
   * signaling liveness. Timeouts on these methods indicate the
   * signaling path may be broken and warrant force-reconnecting
   * the socket.
   */
  private static readonly CRITICAL_METHODS = new Set<string>([
    VertoMethod.Modify,
    VertoMethod.Bye,
    VertoMethod.Ping,
  ]);

  static isCriticalMethod(method: string): boolean {
    return SignalingHealthMonitor.CRITICAL_METHODS.has(method);
  }

  constructor(private readonly _session: ISignalingHealthSession) {}

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Start the monitor. Resets all state and begins periodic checks.
   *
   * If the monitor was in a reconnecting state when start() is called
   * (i.e. the socket just reconnected), clears the reconnection timeout
   * and pending recovery state — the socket is back, calls will be
   * reattached separately by the server.
   */
  start(): void {
    if (this._intervalId) {
      return; // already running
    }
    logger.debug('Signaling health: monitor started');
    this._lastInboundAt = Date.now();
    this._probeInFlight = false;
    this._lastProbeSentAt = 0;

    // If we were reconnecting, the socket is now back. Clear the
    // reconnection timeout and pending recovery state — the calls
    // will be reattached separately by the server (or not, in which
    // case there is a different event for missing reattached sessions).
    if (this._isReconnecting) {
      logger.debug('Signaling health: socket reconnected, clearing reconnection timeout');
      this._isReconnecting = false;
      this._pendingRecoveryCallIds.clear();
      this._clearReconnectionTimeout();
    }

    this._intervalId = setInterval(() => this._check(), CHECK_INTERVAL_MS);
  }

  /**
   * Stop the monitor. Clears periodic check timers and resets probe state.
   *
   * The reconnection timeout is intentionally NOT cleared here when a
   * reconnection is in progress. In the real recovery flow, `stop()` is
   * called from `onNetworkClose()` after `socketDisconnect()` — the very
   * close event that recovery triggered. Clearing the timeout at that point
   * would make it impossible for the timeout to ever fire.
   *
   * The reconnection timeout is cleared by:
   * - `onReconnectionSucceeded()` (recovery completed)
   * - `forceStop()` (full disconnect / teardown)
   * - `_onReconnectionTimeout()` (timeout expired)
   */
  stop(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._probeInFlight = false;
      this._lastProbeSentAt = 0;
    }
    this._pendingMediaRecovery = null;
    // Do NOT clear reconnection timeout during reconnect — it must survive
    // the expected socket-close lifecycle. Only clear if not reconnecting.
    if (!this._isReconnecting) {
      this._clearReconnectionTimeout();
    }
    logger.debug('Signaling health: monitor stopped');
  }

  /**
   * Force-stop the monitor including the reconnection timeout.
   * Called on full session disconnect or teardown (not during reconnect).
   */
  forceStop(): void {
    this._isReconnecting = false;
    this._pendingRecoveryCallIds.clear();
    this.stop();
    // Ensure reconnection timeout is cleared even if we were reconnecting
    this._clearReconnectionTimeout();
  }

  /**
   * Returns true if the monitor is currently running.
   */
  get isRunning(): boolean {
    return this._intervalId !== null;
  }

  /**
   * Returns true if a signaling health probe is currently in flight.
   * Exposed for tests/diagnostics to see whether a probe is pending.
   */
  get isProbeInFlight(): boolean {
    return this._probeInFlight;
  }

  /**
   * Called when recovery is confirmed — either per-call (ICE restart path)
   * or session-level (socket reconnect path).
   *
   * Per-call recovery (ICE restart): callId is provided and matches a
   * tracked pending call. The call is removed from the pending set, and
   * if all tracked calls have confirmed, the session-level reconnection
   * timeout is cleared.
   *
   * Session-level recovery (socket reconnect): callId is omitted. This
   * clears the reconnection timeout and all pending recovery state
   * without emitting additional events. Used when the socket reconnects
   * successfully — calls will be reattached separately (or not, in which
   * case there is a different event for missing reattached sessions).
   */
  onCallRecoverySucceeded(callId?: string): void {
    if (callId) {
      // Per-call recovery (ICE restart path)
      if (!this._pendingRecoveryCallIds.has(callId)) {
        return; // Not a tracked recovery call — ignore
      }

      this._pendingRecoveryCallIds.delete(callId);
      logger.debug(
        `Signaling health: call ${callId} confirmed media recovery, ${this._pendingRecoveryCallIds.size} calls still pending`
      );

      if (this._pendingRecoveryCallIds.size === 0) {
        this._isReconnecting = false;
        this._clearReconnectionTimeout();
      }
    } else {
      // Session-level recovery (socket reconnect path)
      this._isReconnecting = false;
      this._pendingRecoveryCallIds.clear();
      this._clearReconnectionTimeout();
    }
  }

  /**
   * Called when a recovering call is finalized/hungup/destroyed before
   * media recovery is confirmed. Removes the call from the pending
   * recovery set so the reconnection timeout does not fire for a call
   * that has already been cleaned up.
   *
   * If the removed call was the last pending call, also clears the
   * session-level reconnection timeout (there is nothing left to time
   * out).
   */
  onCallFinalized(callId: string): void {
    if (!this._pendingRecoveryCallIds.has(callId)) {
      return; // not a tracked recovery call — ignore
    }

    this._pendingRecoveryCallIds.delete(callId);
    logger.debug(
      `Signaling health: call ${callId} finalized during recovery, ${this._pendingRecoveryCallIds.size} calls still pending`
    );

    if (this._pendingRecoveryCallIds.size === 0) {
      this._isReconnecting = false;
      this._clearReconnectionTimeout();
    }
  }

  /**
   * Called on every inbound WS message (via SocketActivity event).
   * Updates the passive liveness timestamp only.
   *
   * Health probes are resolved by the matching Ping response promise in
   * _sendProbe(). Unrelated inbound frames prove that bytes are flowing, but
   * they must not release pending media recovery that was gated on a probe.
   */
  onSocketActivity(): void {
    this._lastInboundAt = Date.now();
  }

  private _resolveProbe(): void {
    if (!this._probeInFlight) {
      return;
    }

    this._probeInFlight = false;
    this._lastProbeSentAt = 0;
    this._lastInboundAt = Date.now();
    logger.debug('Signaling health: probe resolved by matching Ping response');

    if (!this._pendingMediaRecovery) {
      return;
    }

    const pending = this._pendingMediaRecovery;
    this._pendingMediaRecovery = null;

    if (this._getSignalingHealthState() === 'healthy') {
      logger.info(
        `Signaling health: signaling probe resolved, triggering pending ICE restart for call ${pending.callId}`
      );
      this._triggerIceRestart(pending.callId, pending.reason, pending.source);
    }
  }

  /**
   * Send a probe if socket health is unknown. Callers should not check socket
   * health themselves; this keeps all signaling-health decisions centralized.
   */
  private _probeIfNeeded(reason: string): void {
    if (!this._session.connection?.connected) {
      return;
    }

    if (this._probeInFlight) {
      logger.debug(
        `Signaling health: probe already in flight, skipping duplicate probe (${reason})`
      );
      return;
    }

    logger.info(`Signaling health: ${reason}, sending signaling probe`);
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
    const isCritical = SignalingHealthMonitor.isCriticalMethod(method);

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

    this._recoverMediaOrSignaling(
      callId,
      `Peer connection failure (${evidence})`,
      `Peer failure detected (${evidence}) while signaling is unhealthy`,
      'peer_failure'
    );
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

    this._recoverMediaOrSignaling(
      callId,
      `No RTP ${direction} while media should be active`,
      `No RTP ${direction} while signaling is unhealthy`,
      'no_rtp'
    );
  }

  // ── Private ─────────────────────────────────────────────────────────

  /**
   * Periodic check: if no inbound WS activity during an active call for
   * PROBE_THRESHOLD_MS, send a probe. If a probe is in-flight and
   * PROBE_TIMEOUT_MS has elapsed, declare signaling unhealthy.
   */
  private _check(): void {
    if (!this._session.connection?.connected) {
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
    // active-call request timeout. If _triggerSignalingRecovery() closes the socket
    // and reconnect succeeds before that stale 10s timer fires, the old
    // Ping promise would reject, onRequestTimeout() would see the *new*
    // socket as connected, and force-close the healthy replacement.
    // Bypassing execute() avoids this race entirely.
    const probe = new Ping(getReconnectToken());

    // The probe resolves only when Connection.send() receives the JSON-RPC
    // response for this exact Ping request id. Passive SocketActivity from
    // unrelated messages updates lastInboundAt but intentionally does not
    // resolve the probe or release pending media recovery.
    this._session.connection
      ?.send(probe)
      .then(() => this._resolveProbe())
      .catch((error) => {
        logger.warn('Signaling health: probe Ping failed to send', error);
      });
  }

  /**
   * Decide whether a media/peer failure should recover media with ICE restart
   * or recover signaling with socket reconnect. A probe in flight means socket
   * health is unknown, not unhealthy, so defer media recovery until inbound
   * activity proves the socket path is alive or the probe times out.
   */
  private _recoverMediaOrSignaling(
    callId: string,
    mediaReason: string,
    signalingReason: string,
    signalingSource: 'peer_failure' | 'no_rtp'
  ): void {
    if (!this._session.hasActiveCall()) {
      logger.debug(
        `Signaling health: ignoring ${signalingSource} recovery without an active call`
      );
      return;
    }

    const healthState = this._getSignalingHealthState();

    if (healthState === 'healthy') {
      logger.info(
        `Signaling health: signaling is healthy, triggering ICE restart for call ${callId}`
      );
      this._triggerIceRestart(callId, mediaReason, signalingSource);
      return;
    }

    if (healthState === 'unknown') {
      logger.info(
        `Signaling health: signaling health is unknown, deferring ICE restart decision for call ${callId}`
      );
      this._pendingMediaRecovery = {
        callId,
        reason: mediaReason,
        source: signalingSource,
      };
      this._probeIfNeeded(
        `${signalingSource} detected with stale/unknown signaling`
      );
      return;
    }

    logger.info(
      'Signaling health: signaling is unhealthy, triggering socket reconnect instead of ICE restart'
    );
    this._triggerSignalingRecovery(signalingReason, signalingSource);
  }

  private _getSignalingHealthState(): 'healthy' | 'unknown' | 'unhealthy' {
    if (!this._session.connection?.connected) {
      return 'unhealthy';
    }

    if (this._probeInFlight) {
      return 'unknown';
    }

    const now = Date.now();
    const lastInboundAt =
      this._lastInboundAt || this._session.connection.lastInboundAt || 0;

    if (lastInboundAt === 0) {
      return 'unknown';
    }

    return now - lastInboundAt < RECENT_ACTIVITY_THRESHOLD_MS
      ? 'healthy'
      : 'unknown';
  }

  /**
   * Trigger socket reconnect + reattach recovery path.
   *
   * This is the ONLY way to force socket recovery. It:
   * 1. Cancels any in-flight delayed reconnect.
   * 2. Emits a SIGNALING_RECOVERY_REQUIRED warning.
   * 3. Force-closes the socket to trigger the existing onNetworkClose
   *    reconnect path.
   * 4. Starts the reconnection timeout if maxTimeoutForReconnectionMs is set.
   *
   * @param reason Human-readable reason for diagnostics.
   * @param source What triggered the reconnect.
   */
  private _triggerSignalingRecovery(
    reason: string,
    source: 'probe' | 'request' | 'peer_failure' | 'no_rtp' = 'probe'
  ): void {
    this._pendingMediaRecovery = null;
    this._probeInFlight = false;
    this._lastProbeSentAt = 0;
    this._isReconnecting = true;

    // Track all active calls for per-call recovery confirmation.
    // The session-level timeout is only cleared when every tracked
    // call has confirmed media recovery.
    const activeCallIds = this._findActiveCallIds();
    this._pendingRecoveryCallIds = new Set(activeCallIds);

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

    // Start reconnection timeout if configured
    this._startReconnectionTimeout();
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
  private _triggerIceRestart(
    callId: string,
    reason: string,
    signalingSource: 'peer_failure' | 'no_rtp'
  ): void {
    logger.info(`Signaling health: triggering ICE restart for call ${callId}`);
    const result = this._session.triggerIceRestart(callId);

    if (!result.started) {
      logger.info(
        `Signaling health: ICE restart not started for call ${callId}: ${result.reason}`
      );

      if (result.recoverSignaling) {
        this._triggerSignalingRecovery(
          `${reason}; ICE restart disabled for reattached call, forcing socket reconnect`,
          signalingSource
        );
      }

      return;
    }

    // ICE restart started — also start the reconnection timeout if configured.
    // The timeout bounds the ICE restart recovery just like it bounds socket
    // reconnect recovery. If the PeerConnection never reaches 'connected'
    // before the timeout, the application is notified so it can decide
    // whether to hang up or keep waiting.
    this._isReconnecting = true;
    // Track only the specific call that triggered ICE restart (not all
    // active calls — socket is healthy, only this call's media is recovering).
    this._pendingRecoveryCallIds = new Set([callId]);
    this._startReconnectionTimeout();

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
  }

  // ── Reconnection timeout ──────────────────────────────────────────

  /**
   * Start the reconnection timeout if maxTimeoutForReconnectionMs is
   * configured. If the option is null (unlimited), this is a no-op.
   *
   * The timeout starts when signaling recovery is triggered. If
   * reconnection does not succeed (confirmed by media path recovery)
   * before the timeout expires, an ACTIVE_CALL_RECONNECTION_TIMEOUT
   * error is emitted for all active calls. The SDK does NOT
   * automatically hang up the calls — the application decides.
   */
  private _startReconnectionTimeout(): void {
    const timeoutMs = this._session.maxTimeoutForReconnectionMs;

    if (timeoutMs === null) {
      return; // unlimited
    }

    this._clearReconnectionTimeout();

    const callIds = this._findActiveCallIds();

    logger.info(
      `Signaling health: starting reconnection timeout of ${timeoutMs}ms${callIds.length > 0 ? ` for calls [${callIds.join(', ')}]` : ''}`
    );

    this._reconnectionTimeoutId = setTimeout(() => {
      this._onReconnectionTimeout(timeoutMs);
    }, timeoutMs);
  }

  /**
   * Clear the reconnection timeout. Called when reconnection succeeds,
   * force-stop, or the timeout fires (to prevent double-fire).
   */
  private _clearReconnectionTimeout(): void {
    if (this._reconnectionTimeoutId !== null) {
      clearTimeout(this._reconnectionTimeoutId);
      this._reconnectionTimeoutId = null;
    }
  }

  /**
   * Called when the reconnection timeout expires. Emits an error event
   * for each active call with diagnostic context, but does NOT
   * automatically hang up the calls. The application decides whether
   * to hang up, retry, or keep waiting.
   *
   * A timeout means the SDK could not confirm recovery (including
   * media path) within the configured window — it is not strong proof
   * that the call is unrecoverable. Media may still be alive or
   * signaling may recover late, so auto-hangup is risky for false
   * positives.
   */
  private _onReconnectionTimeout(timeoutMs: number): void {
    this._reconnectionTimeoutId = null;
    this._isReconnecting = false;

    // Use the tracked pending recovery call IDs rather than re-querying
    // all active calls. This ensures the timeout notification only
    // includes calls that never confirmed media recovery, not calls
    // that were added after the timeout started or that already recovered.
    const callIds = Array.from(this._pendingRecoveryCallIds);
    this._pendingRecoveryCallIds.clear();

    logger.warn(
      `Signaling health: reconnection timeout of ${timeoutMs}ms expired${callIds.length > 0 ? ` for calls [${callIds.join(', ')}]` : ''} — notifying application`
    );

    const telnyxError = createTelnyxError(ACTIVE_CALL_RECONNECTION_TIMEOUT);

    // Emit a single error event with all affected call IDs and
    // diagnostic context so the application can decide what to do.
    trigger(
      SwEvent.Error,
      {
        error: telnyxError,
        callIds,
        timeoutMs,
        sessionId: this._session.sessionid,
      },
      this._session.uuid
    );
  }

  /**
   * Find all active call IDs using the same state criteria as
   * hasActiveCall() (State.Early, State.Active, State.Held).
   * Returns an empty array if no active calls exist.
   *
   * This ensures the reconnection timeout terminates the correct set
   * of calls rather than an arbitrary first entry from the calls map.
   */
  private _findActiveCallIds(): string[] {
    const calls = this._session.calls;
    if (!calls || typeof calls !== 'object') {
      return [];
    }
    const activeStates = new Set<number>([
      State.Early,
      State.Active,
      State.Held,
    ]);
    const result: string[] = [];
    for (const [id, call] of Object.entries(calls)) {
      if (call && call._state != null && activeStates.has(call._state)) {
        result.push(id);
      }
    }
    return result;
  }
}
