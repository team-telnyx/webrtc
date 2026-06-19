import type Connection from '../../services/Connection';

/**
 * The type of media/peer failure evidence reported to the health monitor.
 */
export type PeerFailureEvidence = 'ice_failed' | 'connection_failed';

export type TriggerIceRestartResult = {
  started: boolean;
  reason?: string;
  recoverSignaling?: boolean;
};

/**
 * Narrow call shape that SignalingHealthMonitor reads from session.calls.
 * Avoids importing the full Call type (which would create circular dependencies)
 * while eliminating `any` — the monitor only accesses `_state` to enumerate
 * active calls for recovery tracking and timeout notifications.
 */
export interface ISignalingHealthCall {
  _state?: number;
}

/**
 * Interface that SignalingHealthMonitor uses to interact with its owning session.
 * Decouples the monitor from BaseSession so it can be extracted into its own file
 * without circular dependencies.
 */
export interface ISignalingHealthSession {
  uuid: string;
  sessionid: string;
  connection: Connection | null;
  hasActiveCall(): boolean;
  socketDisconnect(): void;
  /**
   * Trigger ICE restart on the call identified by callId.
   * Called by the health monitor when media/peer is unhealthy but
   * signaling is healthy.
   */
  triggerIceRestart(callId: string): TriggerIceRestartResult;
  /**
   * Normalized maxTimeoutForReconnectionMs option.
   * Null means unlimited (no reconnection timeout).
   * A non-negative number means the reconnection must complete within
   * that many milliseconds or a timeout notification is emitted to
   * the application.
   */
  readonly maxTimeoutForReconnectionMs: number | null;
  /**
   * Map of active calls (callId → call object with at least `_state`).
   * Used by the monitor to enumerate active calls for per-call
   * recovery tracking and timeout notifications.
   */
  readonly calls: Record<string, ISignalingHealthCall>;
}
