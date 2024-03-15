import { connection } from './Connection';
import { transactionManager } from './TransactionManager';
import { ConnectionEvents } from './constants';
import { KeepAliveTransaction } from './transactions/KeepAlive';

const KEEP_ALIVE_INTERVAL = 10 * 1000;
export default class KeepAliveAgent {
  private _interval: number | null;
  private _failedAttempts: number;

  constructor() {
    this._interval = null;
    this._failedAttempts = 0;
    connection.addListener(
      ConnectionEvents.StateChange,
      this._onConnectionStateChange
    );
  }

  private _onConnectionStateChange = () => {
    if (connection.connected) {
      this.start();
    } else {
      this.stop();
    }
  };
  private _tick = async () => {
    try {
      const ok = await transactionManager.execute(
        new KeepAliveTransaction(connection.gatewaySessionId)
      );
      this._failedAttempts = 0;
    } catch (error) {
      this._failedAttempts += 1;
      if (this._failedAttempts > 3) {
        this.stop();
      }
      console.error(error);
    }
  };

  public start() {
    if (this._interval != null) {
      return;
    }
    this._interval = window.setInterval(this._tick, KEEP_ALIVE_INTERVAL);
  }

  public stop() {
    if (this._interval != null) {
      window.clearInterval(this._interval);
    }
  }
}
