import * as log from 'loglevel';
import { v4 as uuidv4 } from 'uuid';
import BaseMessage from './messages/BaseMessage';
import Connection from './services/Connection';
import {
  deRegister,
  deRegisterAll,
  register,
  trigger,
} from './services/Handler';
import { RegisterAgent } from './services/RegisterAgent';
import { SwEvent } from './util/constants';
import { isFunction, isValidOptions, randomInt } from './util/helpers';
import { BroadcastParams, IVertoOptions } from './util/interfaces';
import logger from './util/logger';

const KEEPALIVE_INTERVAL = 30 * 1000;

export default abstract class BaseSession {
  public uuid: string = uuidv4();
  public sessionid: string = '';
  public subscriptions: { [channel: string]: any } = {};
  public nodeid: string;
  public master_nodeid: string;
  public signature: string = null;
  public relayProtocol: string = null;
  public contexts: string[] = [];
  public timeoutErrorCode = -32000;

  public connection: Connection = null;
  protected _jwtAuth: boolean = false;
  protected _doKeepAlive: boolean = false;
  protected _keepAliveTimeout: any;
  protected _reconnectTimeout: any;
  protected _autoReconnect: boolean = true;
  protected _idle: boolean = false;

  private _executeQueue: { resolve?: Function; msg: any }[] = [];
  private _pong: boolean;
  private registerAgent: RegisterAgent;

  constructor(public options: IVertoOptions) {
    if (!this.validateOptions()) {
      throw new Error('Invalid init options');
    }
    this._onSocketOpen = this._onSocketOpen.bind(this);
    this.onNetworkClose = this.onNetworkClose.bind(this);
    this._onSocketMessage = this._onSocketMessage.bind(this);
    this._handleLoginError = this._handleLoginError.bind(this);

    this._attachListeners();
    this.connection = new Connection(this);
    this.registerAgent = new RegisterAgent(this);
  }

  get __logger(): log.Logger {
    return logger;
  }

  /**
   * `true` if the client is connected to the Telnyx RTC server
   *
   * @example
   *
   * ```js
   * const client = new TelnyxRTC(options);
   * console.log(client.connected); // => false
   * ```
   */
  get connected() {
    return this.connection && this.connection.connected;
  }

  get reconnectDelay() {
    return randomInt(2, 6) * 1000;
  }

  /**
   * Send a JSON object to the server.
   * @return Promise that will resolve/reject depending on the server response
   * @ignore
   */
  execute(msg: BaseMessage): any {
    if (this._idle) {
      return new Promise((resolve) =>
        this._executeQueue.push({ resolve, msg })
      );
    }
    if (!this.connected) {
      return new Promise((resolve) => {
        this._executeQueue.push({ resolve, msg });
        this.connect();
      });
    }
    return this.connection.send(msg);
  }

  /**
   * Send raw text to the server.
   * @return void
   * @ignore
   */
  executeRaw(text: string): void {
    if (this._idle) {
      this._executeQueue.push({ msg: text });
      return;
    }
    this.connection.sendRawText(text);
  }

  /**
   * Validates the options passed in.
   * TelnyxRTC requires (login and password) OR login_token
   * Verto requires host, login, passwd OR password
   * @return boolean
   * @ignore
   */
  validateOptions() {
    return isValidOptions(this.options);
  }

  /**
   * Broadcast a message in a protocol - channel
   * @todo Implement it
   * @return void
   * @ignore
   */
  broadcast(params: BroadcastParams) {} // TODO: to be implemented

  /**
   * Remove subscriptions and calls, close WS connection and remove all session listeners.
   * @return void
   */
  async disconnect() {
    clearTimeout(this._reconnectTimeout);
    this.subscriptions = {};
    this._autoReconnect = false;
    this.relayProtocol = null;
    this._closeConnection();
    await sessionStorage.removeItem(this.signature);
    this._executeQueue = [];
    this._detachListeners();
  }

  /**
   * Attaches an event handler for a specific type of event.
   *
   * ### Events
   * |   |   |
   * |---|---|
   * | `telnyx.ready` | The client is authenticated and available to use |
   * | `telnyx.error` | An error occurred at the session level |
   * | `telnyx.notification` | An update to the call or session |
   * | `telnyx.socket.open` | The WebSocket connection has been made |
   * | `telnyx.socket.close` | The WebSocket connection is set to close |
   * | `telnyx.socket.error` | An error occurred at the WebSocket level |
   * | `telnyx.socket.message` | The client has received a message through WebSockets |
   *
   * @param eventName Event name.
   * @param callback Function to call when the event comes.
   * @return The client object itself.
   *
   * @examples
   *
   * Subscribe to the `telnyx.ready` and `telnyx.error` events.
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.on('telnyx.ready', (client) => {
   *   // Your client is ready!
   * }).on('telnyx.error', (error) => {
   *   // Got an error...
   * })
   * ```
   */
  on(eventName: string, callback: Function) {
    register(eventName, callback, this.uuid);
    return this;
  }

  /**
   * Removes an event handler that were attached with .on().
   * If no handler parameter is passed, all listeners for that event will be removed.
   *
   * @param eventName Event name.
   * @param callback Function handler to be removed.
   *
   * @return The client object itself.
   *
   * Note: a handler will be removed from the stack by reference
   * so make sure to use the same reference in both `.on()` and `.off()` methods.
   *
   * @examples
   *
   * Subscribe to the `telnyx.error` and then, remove the event handler.
   *
   * ```js
   * const errorHandler = (error) => {
   *  // Log the error..
   * }
   *
   * const client = new TelnyxRTC(options);
   *
   * client.on('telnyx.error', errorHandler)
   *
   *  // .. later
   * client.off('telnyx.error', errorHandler)
   * ```
   */
  off(eventName: string, callback?: Function) {
    deRegister(eventName, callback, this.uuid);
    return this;
  }

  /**
   * Define the method to connect the session
   * @abstract
   * @async
   * @return void
   */
  async connect(): Promise<void> {
    if (!this.connection) {
      this.connection = new Connection(this);
    }

    this._attachListeners();
    if (!this.connection.isAlive) {
      this.connection.connect();
    }
  }

  /**
   * Handle login error
   * @return void
   */
  protected _handleLoginError(error: any) {
    trigger(SwEvent.Error, { error, sessionId: this.sessionid }, this.uuid);
  }

  /**
   * Callback when the ws connection is open
   * @return void
   */
  protected async _onSocketOpen() {}

  /**
   * Callback when the ws connection is going to close or get an error
   * @return void
   */
  public onNetworkClose(): void {
    if (this.relayProtocol) {
      deRegisterAll(this.relayProtocol);
    }
    for (const sub in this.subscriptions) {
      deRegisterAll(sub);
    }
    this.subscriptions = {};
    this.contexts = [];

    if (this._autoReconnect) {
      this._reconnectTimeout = setTimeout(
        () => this.connect(),
        this.reconnectDelay
      );
    }
  }

  /**
   * Callback to handle inbound messages from the ws
   * @return void
   */
  protected _onSocketMessage(response: any) {}

  /**
   * Remove subscription by key and deregister the related callback
   * @return void
   */
  protected _removeSubscription(protocol: string, channel?: string) {
    if (!this._existsSubscription(protocol, channel)) {
      return;
    }
    if (channel) {
      delete this.subscriptions[protocol][channel];
      deRegister(protocol, null, channel);
    } else {
      delete this.subscriptions[protocol];
      deRegisterAll(protocol);
    }
  }

  /**
   * Add a subscription by key and register a callback if its passed in
   * @return void
   */
  protected _addSubscription(
    protocol: string,
    handler: Function = null,
    channel: string
  ) {
    if (this._existsSubscription(protocol, channel)) {
      return;
    }
    if (!this._existsSubscription(protocol)) {
      this.subscriptions[protocol] = {};
    }
    this.subscriptions[protocol][channel] = {};
    if (isFunction(handler)) {
      register(protocol, handler, channel);
    }
  }

  /**
   * Check if a subscription for this protocol-channel already exists
   * @return boolean
   * @ignore
   */
  public _existsSubscription(protocol: string, channel?: string) {
    if (this.subscriptions.hasOwnProperty(protocol)) {
      if (
        !channel ||
        (channel && this.subscriptions[protocol].hasOwnProperty(channel))
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Attach listeners for Socket events and disconnect
   * @return void
   */
  private _attachListeners() {
    this._detachListeners();
    this.on(SwEvent.SocketOpen, this._onSocketOpen);
    this.on(SwEvent.SocketClose, this.onNetworkClose);
    this.on(SwEvent.SocketError, this.onNetworkClose);
    this.on(SwEvent.SocketMessage, this._onSocketMessage);
  }

  /**
   * Detach listeners for Socket events and disconnect
   * @return void
   */
  private _detachListeners() {
    this.off(SwEvent.SocketOpen, this._onSocketOpen);
    this.off(SwEvent.SocketClose, this.onNetworkClose);
    this.off(SwEvent.SocketError, this.onNetworkClose);
    this.off(SwEvent.SocketMessage, this._onSocketMessage);
  }

  /**
   * Execute all the queued messages during the idle period.
   * @return void
   */
  private _emptyExecuteQueues() {
    this._executeQueue.forEach(({ resolve, msg }) => {
      if (typeof msg === 'string') {
        this.executeRaw(msg);
      } else {
        resolve(this.execute(msg));
      }
    });
  }

  /**
   * Close and remove the current connection.
   * @return void
   */
  private _closeConnection() {
    this._idle = true;
    clearTimeout(this._keepAliveTimeout);
    if (this.connection) {
      this.connection.close();
    }
  }

  private _keepAlive() {
    if (this._doKeepAlive !== true) {
      return;
    }

    this._pong = false;
    this._keepAliveTimeout = setTimeout(
      () => this._keepAlive(),
      KEEPALIVE_INTERVAL
    );
  }

  static on(eventName: string, callback: any) {
    register(eventName, callback);
  }

  static off(eventName: string) {
    deRegister(eventName);
  }

  static uuid(): string {
    return uuidv4();
  }

  public clearConnection() {
    this.connection = null;
  }

  public hasAutoReconnect() {
    return this._autoReconnect;
  }

  /**
   * Get the registration state of the client
   * @return Promise<boolean>
   */
  public getIsRegistered() {
    return this.registerAgent.getIsRegistered();
  }
}
