import { Connection } from './Connection';
import { transactionManager } from './TransactionManager';
import { ConnectionEvents } from './constants';
import { KeepAliveTransaction } from './transactions/KeepAlive';

type ConstructorParams = {
  connection: Connection;
  gatewaySessionId: number;
};

const KEEP_ALIVE_INTERVAL = 10 * 1000;
export default class KeepAliveAgent {
  private _gatewaySessionId: number;
  private _failedAttempts: number;
  private _interval: number;
  private _connection: Connection;

  constructor({ connection, gatewaySessionId }: ConstructorParams) {
    this._failedAttempts = 0;
    this._gatewaySessionId = gatewaySessionId;
    this._connection = connection;
    this._connection.addListener(
      ConnectionEvents.StateChange,
      this._onConnectionStateChange
    );
  }

  private _onTick = async () => {
    try {
      await transactionManager.execute(
        new KeepAliveTransaction(this._gatewaySessionId)
      );
      this._failedAttempts = 0;
    } catch (error) {
      this._failedAttempts += 1;
      if (this._failedAttempts > 3) {
        this.stop();
      }
    }
  };

  public start = () => {
    this.stop();
    this._interval = window.setInterval(this._onTick, KEEP_ALIVE_INTERVAL);
  };

  public stop = () => {
    if (this._interval != null) {
      window.clearInterval(this._interval);
      this._interval = null;
    }
  };

  private _onConnectionStateChange = () => {
    if (this._connection.isDead) {
      return this.stop();
    }
    this.start();
  };
}
