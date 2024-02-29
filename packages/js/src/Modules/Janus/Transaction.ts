import { v4 as uuidV4 } from 'uuid';
import JanusConnection from './Connection';
import { Janus, JanusRequest } from './Request';
import { JanusResponse, JanusResponseMap } from './Response';

type ResolveCheckFunction = (msg: JanusResponse) => boolean;
export class TransactionManager {
  private connection: JanusConnection;
  private _transactions: Map<string, Transaction<JanusResponse>> = new Map();
  private queue: Transaction<JanusResponse>[] = [];

  constructor(socket: JanusConnection) {
    this.connection = socket;
    this.connection.addListener('message', this._onSocketMessage);
    this.connection.addListener('stateChange', this._onConnectionStateChange);
  }

  private _onConnectionStateChange = () => {
    if (this.connection.connected) {
      this.queue.forEach((transaction) => {
        this._executeTransaction(transaction);
      });
      this.queue = [];
    }
  };

  private _onSocketMessage = (ev: string) => {
    const json = JSON.parse(ev) as JanusResponse;
    const transactionId = json.transaction;
    if (!transactionId) {
      return;
    }
    const transaction = this._transactions.get(transactionId);
    debugger
    if (!transaction) {
      return
    }

    if (json.janus === Janus.error) {
      return transaction.onReject(new Error(json.error.reason));
    }

    // A transaction can be resolved by the user
    if (!transaction.shouldResolve(json)) {
      return;
    }

    transaction.onResolve(json);
    return;
  };

  execute<P extends JanusRequest>(
    request: P,
    shouldResolve?: ResolveCheckFunction
  ) {
    const transaction = new Transaction<JanusResponseMap[P['janus']]>(
      request,
      shouldResolve
    );

    if (!this.connection.connected) {
      this.queue.push(transaction);
      return transaction.promise;
    }

    this._executeTransaction(transaction);
    return transaction.promise;
  }

  private _executeTransaction(transaction: Transaction<JanusResponse>) {
    this._transactions.set(transaction.id, transaction);
    this.connection.sendRaw(JSON.stringify(transaction.request));
  }
  destroy() {
    this.connection.removeListener('message', this._onSocketMessage);
  }
}

export class Transaction<T extends JanusResponse> {
  public id: string = uuidV4();
  public promise: Promise<T>;
  public onResolve: (value: T | PromiseLike<T>) => void;
  public onReject: (reason?: Error) => void;
  public shouldResolve: ResolveCheckFunction = (_: JanusResponse) => true;

  public request: JanusRequest;

  constructor(request: JanusRequest, shouldResolve?: ResolveCheckFunction) {
    if (!request.transaction) {
      request.transaction = uuidV4();
    }
    if (shouldResolve) {
      this.shouldResolve = shouldResolve;
    }
    this.request = request;
    this.id = request.transaction;
    this.promise = new Promise<T>((resolve, reject) => {
      this.onResolve = resolve;
      this.onReject = reject;
    });
  }
}
