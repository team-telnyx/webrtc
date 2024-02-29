/**
 * Establishes a connection to the Janus server
 * through a WebSocket connection.
 */
import EventEmitter from 'eventemitter3';
import { DEV_HOST } from './util/constants';

export default class JanusConnection extends EventEmitter {
  public static PROTOCOL = 'janus-protocol';
  private _socket: WebSocket | null = null;

  public connect = () => {
    // TODO - use PROD_HOST in production.
    this._socket = new WebSocket(DEV_HOST, JanusConnection.PROTOCOL);
    this._socket.addEventListener('open', this._onStateChange);
    this._socket.addEventListener('close', this._onStateChange);
    this._socket.addEventListener('message', this._onMessage);
    this._socket.addEventListener('error', this._onError);
  };

  private _onError = (error: Event) => {
    this.emit('error', error);
  };
  private _onMessage = (ev: MessageEvent) => {
    this.emit('message', ev.data);
  };

  private _onStateChange = () => {
    this.emit('stateChange', this._socket.readyState);
  };

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

  public sendRaw(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    {
      this._socket.send(data);
    }
  }

  public close() {
    this._socket.close();
    this._socket.removeEventListener('open', this._onStateChange);
    this._socket.removeEventListener('message', this._onMessage);
    this._socket.removeEventListener('close', this._onStateChange);
    this._socket.removeEventListener('error', this._onError);
  }
}
