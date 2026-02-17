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
import {
  isFunction,
  isValidAnonymousLoginOptions,
  isValidLoginOptions,
  randomInt,
} from './util/helpers';
import {
  BroadcastParams,
  ILoginParams,
  IVertoOptions,
} from './util/interfaces';
import logger from './util/logger';
import { getReconnectToken } from './util/reconnect';
import { Ping } from './messages/verto/Ping';
import { Login } from './messages/Verto';
import { AnonymousLogin } from './messages/verto/AnonymousLogin';
import { ERROR_TYPE } from './webrtc/constants';

/**
 * b2bua-rtc ping interval is 30 seconds, timeout in VSP is 60 seconds.
 * Using intervals here that are in between both to make sure we don't let the session expire without acting first.
 */
const KEEPALIVE_INTERVAL = 35 * 1000;

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
  public invalidMethodErrorCode = -32601;
  public authenticationRequiredErrorCode = -32000;

  public connection: Connection = null;
  protected _jwtAuth: boolean = false;
  protected _keepAliveTimeout: any;
  protected _reconnectTimeout: any;
  protected _autoReconnect: boolean = true;
  protected _immediateReconnect: boolean = false;
  protected _idle: boolean = false;

  private _executeQueue: { resolve?: Function; msg: any }[] = [];
  private _pong: boolean;
  private registerAgent: RegisterAgent;

  constructor(public options: IVertoOptions) {
    if (!this.validateOptions()) {
      throw new Error('Invalid init options');
    }

    logger.setLevel(options.debug ? 'debug' : 'info');

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

  public async getIsRegistered(): Promise<boolean> {
    return this.registerAgent.getIsRegistered();
  }

  get reconnectDelay() {
    return randomInt(2, 6) * 1000;
  }

  /**
   * Send a JSON object to the server.
   * @return Promise that will resolve/reject depending on the server response
   * @ignore
   */
  execute(msg: BaseMessage): Promise<any> {
    if (this._idle) {
      return new Promise((resolve) =>
        this._executeQueue.push({ resolve, msg })
      );
    }
    if (!this.connected) {
      return new Promise((resolve) => {
        this._executeQueue.push({ resolve, msg });
        logger.debug(
          'Calling connect from execute since not currently connected.'
        );
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
    return (
      isValidLoginOptions(this.options) ||
      isValidAnonymousLoginOptions(this.options)
    );
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
    logger.debug(
      'Session disconnected. Cleaned up all listeners and subscriptions, closed connection, disabled auto-reconnect.'
    );
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
      logger.debug('No existing connection found, creating a new one.');
      this.connection = new Connection(this);
    }

    this._attachListeners();
    this._autoReconnect = true;
    if (!this.connection.isAlive) {
      logger.debug('Initiating connection to the server...');
      this.connection.connect();
    }
    logger.debug('Connect method called. Connection initiated.');
  }

  /**
   * Handle login error
   * @return void
   */
  protected _handleLoginError(error: any) {
    trigger(SwEvent.Error, { error, sessionId: this.sessionid }, this.uuid);
  }

  /**
   * Re-authenticate with the Telnyx RTC server using existing or new credentials within an active WebSocket connection.
   *
   * This method allows updating session authentication credentials (login/password, JWT token, or anonymous login)
   * and immediately re-authenticates without requiring a full socket reconnection. This is particularly useful for:
   * - Refreshing expired JWT tokens during an active session
   * - Switching to different user credentials
   * - Re-authenticating after token expiration errors
   *
   * @param options - Configuration object for the login operation
   * @param options.creds - Optional credential parameters to update before authentication
   * @param options.onSuccess - Callback function invoked when authentication succeeds
   * @param options.onError - Callback function invoked when authentication fails, receives the error object
   *
   * @returns Promise<void>
   *
   * @example
   * **Re-authenticate with existing credentials:**
   * ```js
   * // Uses the credentials already stored in session options
   * await client.login();
   * ```
   *
   * @example
   * **Refresh an expired JWT token:**
   * ```js
   * const newToken = await fetchNewJwtToken();
   * await client.login({
   *   creds: { login_token: newToken }
   * });
   * ```
   *
   * @example
   * **Update login credentials with callbacks:**
   * ```js
   * await client.login({
   *   creds: {
   *     login: 'newuser@example.com',
   *     password: 'newpassword'
   *   },
   *   onSuccess: () => {
   *     console.log('Successfully re-authenticated!');
   *   },
   *   onError: (error) => {
   *     console.error('Authentication failed:', error);
   *   }
   * });
   * ```
   *
   * @example
   * **Switch to anonymous login:**
   * ```js
   * await client.login({
   *   creds: {
   *     anonymous_login: {
   *       target_type: 'ai_assistant',
   *       target_id: 'asst_12345',
   *       target_version_id: 'v1'
   *     }
   *   }
   * });
   * ```
   */
  async login({
    creds,
    onSuccess,
    onError,
  }: {
    creds?: ILoginParams;
    onSuccess?: () => void;
    onError?: (error: any) => void;
  } = {}): Promise<void> {
    // Validate connection state
    if (!this.connection || !this.connection.isAlive) {
      return;
    }

    // Update session options with new credentials
    if (creds) {
      if (creds.login !== undefined) {
        this.options.login = creds.login;
      }
      if (creds.password !== undefined) {
        this.options.password = creds.password;
      }
      if (creds.passwd !== undefined) {
        this.options.passwd = creds.passwd;
      }
      if (creds.login_token !== undefined) {
        this.options.login_token = creds.login_token;
      }
      if (creds.userVariables !== undefined) {
        this.options.userVariables = creds.userVariables;
      }
      if (creds.anonymous_login !== undefined) {
        this.options.anonymous_login = creds.anonymous_login;
      }
    }

    if (isValidLoginOptions(this.options)) {
      return this._login({ type: 'login', onSuccess, onError });
    } else if (isValidAnonymousLoginOptions(this.options)) {
      return this._login({ type: 'anonymous_login', onSuccess, onError });
    } else {
      const msg = 'Invalid login options provided for authentication.';
      logger.error(msg);
      trigger(
        SwEvent.Error,
        {
          error: new Error(msg),
          type: ERROR_TYPE.invalidCredentialsOptions,
          sessionId: this.sessionid,
        },
        this.uuid
      );
      return;
    }
  }

  private async _login({
    type,
    onSuccess,
    onError,
  }: {
    type: 'login' | 'anonymous_login';
    onSuccess?: () => void;
    onError?: (error: any) => void;
  }): Promise<void> {
    let msg: Login | AnonymousLogin;
    if (type === 'login') {
      msg = new Login(
        this.options.login,
        this.options.password || this.options.passwd,
        this.options.login_token,
        this.sessionid,
        this.options.userVariables,
        !!getReconnectToken()
      );
    } else {
      msg = new AnonymousLogin({
        target_id: this.options.anonymous_login.target_id,
        target_type: this.options.anonymous_login.target_type,
        target_version_id: this.options.anonymous_login.target_version_id,
        sessionId: this.sessionid,
        userVariables: this.options.userVariables,
        reconnection: !!getReconnectToken(),
      });
    }

    const response = await this.execute(msg).catch((error) => {
      this._handleLoginError(error);
      if (onError) onError(error);
    });

    if (response) {
      this.sessionid = response.sessid;
      if (onSuccess) onSuccess();
    }
  }

  /**
   * Callback when the ws connection is open
   * @return void
   */
  protected async _onSocketOpen() {}

  /**
   * Callback when the ws connection is going to close or get an error
   * @return void
   * @private
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
    clearTimeout(this._keepAliveTimeout);

    clearTimeout(this._reconnectTimeout);

    if (this._autoReconnect) {
      if (this._immediateReconnect) {
        this._immediateReconnect = false;
        this.connect();
      } else {
        this._reconnectTimeout = setTimeout(() => {
          logger.debug(
            'Calling connect due to network close and auto-reconnect enabled.'
          );
          this.connect();
        }, this.reconnectDelay);
      }
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
   * @private
   * Close and remove the current connection.
   * @return void
   */
  public _closeConnection() {
    this._idle = true;
    clearTimeout(this._keepAliveTimeout);
    if (this.connection) {
      this.connection.close();
    }
  }

  private _resetKeepAlive() {
    if (this._pong === false) {
      logger.warn('No ping/pong received, forcing PING ACK to keep alive');
      this.execute(new Ping(getReconnectToken()));
    }

    clearTimeout(this._keepAliveTimeout);
    this._triggerKeepAliveTimeoutCheck();
  }

  /**
   * @private
   */
  public _triggerKeepAliveTimeoutCheck() {
    this._pong = false;
    this._keepAliveTimeout = setTimeout(
      () => this._resetKeepAlive(),
      KEEPALIVE_INTERVAL
    );
  }

  public setPingReceived() {
    logger.debug('Ping received');
    this._pong = true;
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
}
