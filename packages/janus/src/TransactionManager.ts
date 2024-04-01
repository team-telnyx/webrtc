import type { Connection } from "./Connection";
import { ConnectionEvents } from "./constants";
import { JanusResponse } from "./messages/response";
import { BaseTransaction } from "./transactions/BaseTransaction";

class TransactionManager {
  private _transactions: Map<string, BaseTransaction<unknown>>;
  private _queue: BaseTransaction<unknown>[];
  private _connection: Connection | null;

  constructor() {
    this._queue = [];
    this._transactions = new Map();
    this._connection = null;
  }

  public setConnection(connection: Connection) {
    this._connection = connection;
    this._connection.addListener(ConnectionEvents.Message, this._onMessage);
    this._connection.addListener(
      ConnectionEvents.StateChange,
      this._onConnectionStateChange
    );
  }
  private _onMessage = (message: string) => {
    const data = JSON.parse(message) as JanusResponse;

    if (!data.transaction) {
      return;
    }
    const transaction = this._transactions.get(data.transaction);
    if (!transaction) {
      return;
    }
    transaction.onMessage(data);
  };

  private _onConnectionStateChange = () => {
    if (this._connection?.connected) {
      this._queue.forEach((transaction) => {
        this._executeTransaction(transaction);
      });
      this._queue = [];
    }
  };

  public execute<T>(transaction: BaseTransaction<T>): Promise<T> {
    if (!this._connection?.connected) {
      this._queue.push(transaction as any);
    } else {
      this._executeTransaction(transaction as any);
    }
    return transaction.promise;
  }

  private _executeTransaction(transaction: BaseTransaction<unknown>) {
    this._connection?.sendRaw(transaction.request);
    this._transactions.set(transaction.id, transaction);
  }
}

export const transactionManager = new TransactionManager();
