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
   * Record a reconnection lifecycle diagnostic on all active calls'
   * call report collectors and emit as a warning event.
   * Called by SignalingHealthMonitor when it decides to trigger
   * signaling recovery, so the recovery request is visible in
   * call reports before the socket is closed.
   */
  _recordReconnectDiagnostic(
    code: number,
    name: string,
    message: string,
    extras?: Record<string, unknown>
  ): void;
}
