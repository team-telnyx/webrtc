import type Connection from '../../services/Connection';

/**
 * The type of media/peer failure evidence reported to the health monitor.
 */
export type PeerFailureEvidence = 'ice_failed' | 'connection_failed';

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
   * Returns true if signaling (WebSocket) is currently considered healthy.
   * Used by the health monitor to decide between socket recovery and
   * media-only recovery (ICE restart).
   */
  isSignalingHealthy(): boolean;
  /**
   * Trigger ICE restart on the call identified by callId.
   * Called by the health monitor when media/peer is unhealthy but
   * signaling is healthy.
   */
  triggerIceRestart(callId: string): void;
}
