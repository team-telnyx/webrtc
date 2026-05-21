import type Connection from '../../services/Connection';

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
}
