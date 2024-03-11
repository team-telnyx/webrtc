import EventEmitter from 'eventemitter3';
import {
  ConnectionEvents,
  DEV_HOST,
  Environment,
  PROD_HOST,
  WS_PROTOCOL,
} from './constants';
import { transactionManager } from './TransactionManager';

type ConnectionOptions = {
  environment: Environment;
};
export class Connection extends EventEmitter {
  private _socket: WebSocket | null = null;
  
  private _host: string = PROD_HOST;

  constructor(options: ConnectionOptions) {
    super();
    if (options.environment === Environment.development) {
      this._host = DEV_HOST;
    }
    transactionManager.setConnection(this);
  }

  public connect() {
    this._socket = new WebSocket(this._host, WS_PROTOCOL);
    this._socket.addEventListener('open', this._onOpen);
    this._socket.addEventListener('close', this._onClose);
    this._socket.addEventListener('error', this._onError);
    this._socket.addEventListener('message', this._onMessage);
  }

  private _onOpen = () => {
    this.emit(ConnectionEvents.StateChange);
  };
  private _onClose = () => {
    this.emit(ConnectionEvents.StateChange);
  };
  private _onMessage = (ev: MessageEvent) => {
    this.emit(ConnectionEvents.Message, ev.data);
  };
  private _onError = () => {
    this.emit(ConnectionEvents.error);
  };

  public sendRaw(data: string) {
    if (this.connected) {
      this._socket.send(data);
    }
  }

  get connected(): boolean {
    return this._socket && this._socket.readyState === WebSocket.OPEN;
  }

  get connecting(): boolean {
    return this._socket && this._socket.readyState === WebSocket.CONNECTING;
  }

  get closing(): boolean {
    return this._socket && this._socket.readyState === WebSocket.CLOSING;
  }

  get closed(): boolean {
    return this._socket && this._socket.readyState === WebSocket.CLOSED;
  }

  get isAlive(): boolean {
    return this.connecting || this.connected;
  }

  get isDead(): boolean {
    return this.closing || this.closed;
  }
}
