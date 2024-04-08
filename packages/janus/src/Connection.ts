import EventEmitter from "eventemitter3";
import { transactionManager } from "./TransactionManager";
import { ConnectionEvents, PROD_HOST, SwEvent, WS_PROTOCOL } from "./constants";
import { AttachSipPluginTransaction } from "./transactions/AttachSIPPlugin";
import { CreateSessionTransaction } from "./transactions/CreateSession";
import { DeferredPromise, deferredPromise } from "./util/promise";
import { trigger } from "./Handler";

export class Connection extends EventEmitter {
  private _socket: WebSocket | null = null;
  public gatewaySessionId: number | null;
  public gatewayHandleId: number | null;
  private _isReady: DeferredPromise<boolean>;

  constructor() {
    super();
    this.gatewayHandleId = null;
    this.gatewaySessionId = null;
    this._isReady = deferredPromise<boolean>();
  }

  private _onOpen = async () => {
    transactionManager.setConnection(this);
    const { sessionId } = await transactionManager.execute(
      new CreateSessionTransaction()
    );

    this.gatewaySessionId = sessionId;

    const { handleId } = await transactionManager.execute(
      new AttachSipPluginTransaction({
        sessionId: this.gatewaySessionId,
      })
    );
    this.gatewayHandleId = handleId;

    this.emit(ConnectionEvents.StateChange, this);
    trigger(SwEvent.SocketOpen, this);
    this._isReady.resolve(true);
  };

  private _onClose = () => {
    this.emit(ConnectionEvents.StateChange, this);
    trigger(SwEvent.SocketClose, this);
  };

  private _onMessage = (msg: MessageEvent) => {
    this.emit(ConnectionEvents.Message, msg.data);
    trigger(SwEvent.SocketMessage, msg.data);
  };

  public connect(): Promise<boolean> {
    this._isReady = deferredPromise<boolean>();
    this._socket = new WebSocket(PROD_HOST, WS_PROTOCOL);
    this._socket.addEventListener("message", this._onMessage);
    this._socket.addEventListener("open", this._onOpen);
    this._socket.addEventListener("close", this._onClose);

    return this._isReady.promise;
  }

  public sendRaw = (msg: string) => {
    if (!this.connected) {
      throw new Error("Connection is not open");
    }
    return this._socket?.send(msg);
  };

  public disconnect() {
    this._socket?.close();
    this.removeAllListeners();
    this._socket = null;
  }

  public get connected() {
    return this._socket != null && this._socket.readyState === WebSocket.OPEN;
  }
}

export const connection = new Connection();
