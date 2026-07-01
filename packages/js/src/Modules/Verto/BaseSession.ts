import type { Logger } from 'loglevel';
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
import SignalingHealthMonitor from './services/SignalingHealthMonitor';
import type {
  ISignalingHealthSession,
  PeerFailureEvidence,
  TriggerIceRestartResult,
} from './util/interfaces/SignalingHealth';
import { State } from './webrtc/constants';
import {
  SwEvent,
  AUTHENTICATION_REQUIRED,
  LOGIN_FAILED,
  INVALID_CREDENTIALS,
  TOKEN_EXPIRING_SOON,
  RECONNECTION_EXHAUSTED,
  RECONNECTION_FAILED_WITH_NO_AUTO_RECONNECT,
  WS_CLOSE_CODES,
} from './util/constants';
import {
  createTelnyxError,
  createTelnyxWarning,
  StaleRequestError,
} from './util/errors';
import type { ITelnyxErrorEvent } from './util/errors';
import {
  isFunction,
  isValidAnonymousLoginOptions,
  isValidLoginOptions,
} from './util/helpers';
import {
  BroadcastParams,
  ILoginParams,
  IVertoOptions,
} from './util/interfaces';
import type { INotification } from '../../utils/interfaces';
import logger, { setConsoleLoggerMinLevel } from './util/logger';
import {
  getReconnectSessionId,
  getReconnectToken,
  clearReconnectToken,
  isReconnectSessionIdFresh,
  setReconnectSessionId,
} from './util/reconnect';
import { Ping } from './messages/verto/Ping';
import { Login } from './messages/Verto';
import { AnonymousLogin } from './messages/verto/AnonymousLogin';
import { ERROR_TYPE } from './webrtc/constants';
import type { ICallReportFlushReason } from './webrtc/CallReportCollector';
import type { ITelnyxWarningEvent } from './util/constants/warnings';
import type { RestartIceResult } from './webrtc/Peer';
import pkg from '../../../package.json';

const SDK_VERSION = pkg.version;

/**
 * b2bua-rtc ping interval is 30 seconds, timeout in VSP is 60 seconds.
 * Using intervals here that are in between both to make sure we don't let the session expire without acting first.
 */
const KEEPALIVE_INTERVAL = 35 * 1000;

export default abstract class BaseSession {
  public uuid: string = uuidv4();
  public sessionid: string = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public subscriptions: { [channel: string]: any } = {};
  public nodeid: string;
  public master_nodeid: string;
  public signature: string = null;
  public relayProtocol: string = null;
  public contexts: string[] = [];
  public timeoutErrorCode = -32000;
  public invalidMethodErrorCode = -32601;
  public authenticationRequiredErrorCode = -32000;
  public callReportId: string | null = null;
  /** voice_sdk_id used when posting call report payloads for this session. */
  public callReportVoiceSdkId: string | null = null;
  public dc: string | null = null;
  public region: string | null = null;

  public connection: Connection = null;
  protected _jwtAuth: boolean = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _keepAliveTimeout: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _reconnectTimeout: any;
  protected _autoReconnect: boolean = true;
  protected _idle: boolean = false;
  protected _reconnectAttempts: number = 0;
  /**
   * Socket generation that has already been handled by onNetworkClose.
   * Used to dedupe SocketError + SocketClose for the same socket failure —
   * browsers commonly emit both events for one physical disconnect.
   *
   * The dedupe guard runs BEFORE destructive cleanup, so a duplicate
   * SocketClose cannot clear the reconnect timer already scheduled by the
   * first SocketError for the same generation.
   */
  private _reconnectCountedGeneration: number = -1;
  /** True while an intentional disconnect/cleanup is in progress.
   *  Prevents RECONNECTION_FAILED_WITH_NO_AUTO_RECONNECT from firing
   *  on normal app teardown or token refresh. */
  protected _intentionalClose: boolean = false;

  private _tokenExpiryTimeout: ReturnType<typeof setTimeout> | null = null;
  private static readonly TOKEN_EXPIRY_WARNING_SECONDS = 120;
  private static readonly CALL_REPORT_UPLOAD_DRAIN_TIMEOUT_MS = 10000;
  private _pendingCallReportUploads = new Set<Promise<void>>();

  /**
   * One-shot fallback timer that fires when the socket has been closed for
   * {@link SOCKET_CLOSE_REPORT_TIMEOUT_MS}. The SDK requires an active socket
   * connection — if it's still down after 15s, generate a synthetic
   * call_report_id (when the server never assigned one) and submit a
   * session-level report so voice-sdk-debug has visibility into the outage.
   */
  private _socketCloseReportWatcher: ReturnType<typeof setTimeout> | null =
    null;
  private static readonly SOCKET_CLOSE_REPORT_TIMEOUT_MS = 15_000;

  // ── Signaling health monitor ──────────────────────────────────────────
  /** Handles liveness detection, health probing, and force-reconnect. */
  private _signalingHealthMonitor: SignalingHealthMonitor =
    new SignalingHealthMonitor(this as unknown as ISignalingHealthSession);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-explicit-any
  private _executeQueue: { resolve?: Function; msg: any }[] = [];
  private _pong: boolean;
  private registerAgent: RegisterAgent;

  constructor(public options: IVertoOptions) {
    if (!this.validateOptions()) {
      throw new Error('Invalid init options');
    }

    setConsoleLoggerMinLevel(options.debug ? 'debug' : 'info');

    this._onSocketOpen = this._onSocketOpen.bind(this);
    this.onNetworkClose = this.onNetworkClose.bind(this);
    this._onSocketMessage = this._onSocketMessage.bind(this);
    this._handleLoginError = this._handleLoginError.bind(this);
    this._onSocketActivity = this._onSocketActivity.bind(this);

    this._attachListeners();
    this.connection = new Connection(this);
    this.registerAgent = new RegisterAgent(this);
  }

  get __logger(): Logger {
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

  /**
   * Reconnect delay with exponential backoff and jitter.
   *
   * Uses the current `_reconnectAttempts` counter to compute the delay:
   * - Attempt 1: base 1s + jitter
   * - Attempt 2: ~2s + jitter
   * - Attempt 3: ~4s + jitter
   * - ... capped at 30s
   *
   * The backoff is reset only on confirmed healthy registration (REGED),
   * not merely on socket open.
   */
  get reconnectDelay() {
    const BASE_DELAY_MS = 1000;
    const MAX_DELAY_MS = 30000;
    const attempt = this._reconnectAttempts;
    const delayMs = Math.min(
      BASE_DELAY_MS * Math.pow(2, attempt - 1),
      MAX_DELAY_MS
    );
    // Add ±25% jitter to avoid thundering herd
    const jitterMs = Math.floor(delayMs * 0.25 * (Math.random() * 2 - 1));
    const totalDelay = delayMs + jitterMs;
    logger.debug('Reconnect delay computed', {
      attempt,
      baseDelayMs: BASE_DELAY_MS,
      maxDelayMs: MAX_DELAY_MS,
      delayMs,
      jitterMs,
      totalDelay,
      sessionId: this.sessionid,
    });
    return totalDelay;
  }

  /**
   * Send a JSON object to the server.
   * @return Promise that will resolve/reject depending on the server response
   * @ignore
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Apply a request-level timeout only to signaling-critical requests
    // so socket health is monitored even without an active call while
    // fire-and-forget/non-critical requests cannot create unhandled
    // timeout rejections.
    const timeoutMs = SignalingHealthMonitor.isCriticalMethod(
      msg.request?.method || ''
    )
      ? Connection.DEFAULT_REQUEST_TIMEOUT_MS
      : undefined;

    const sendPromise =
      timeoutMs != null
        ? this.connection.send(msg, timeoutMs)
        : this.connection.send(msg);

    return sendPromise.catch(async (error) => {
      // Stale request — a request was sent on an old socket generation,
      // then reconnect created a replacement socket before the old request
      // timeout/cleanup settled. Surface the stale cancellation to the
      // caller, but do NOT trigger signaling recovery; otherwise an old
      // Modify/Ping timeout could force-close the new healthy socket.
      if (error instanceof StaleRequestError) {
        logger.debug(
          `Stale request settled (id=${error.requestId}, gen=${error.staleGeneration}) — not triggering recovery`
        );
        throw error;
      }
      // Handle request-level timeout from Connection.send()
      if (error?.name === 'RequestTimeoutError') {
        // Only force reconnect for critical signaling methods.
        // Non-critical request timeouts (e.g. Info, debug reports)
        // should not trigger signaling recovery.
        this.onSignalingRequestTimeout(
          error.requestId,
          error.timeoutMs,
          error.method
        );
        throw error;
      }
      if (error?.code === this.authenticationRequiredErrorCode) {
        if (!this._autoReconnect) {
          const telnyxError = createTelnyxError(
            AUTHENTICATION_REQUIRED,
            error,
            undefined,
            true // fatal: true (no recovery path — autoReconnect is disabled)
          );
          trigger(
            SwEvent.Error,
            { error: telnyxError, sessionId: this.sessionid },
            this.uuid
          );
        }
        await this.login();
      }
      throw error;
    });
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

  trackCallReportUpload(upload: Promise<void>): void {
    this._pendingCallReportUploads.add(upload);
    upload.then(
      () => this._pendingCallReportUploads.delete(upload),
      () => this._pendingCallReportUploads.delete(upload)
    );
  }

  private async _drainCallReportUploads(): Promise<void> {
    if (this._pendingCallReportUploads.size === 0) {
      return;
    }

    const pendingUploads = Array.from(this._pendingCallReportUploads);
    let timedOut = false;

    await Promise.race([
      Promise.all(
        pendingUploads.map((upload) => upload.catch(() => undefined))
      ),
      new Promise<void>((resolve) =>
        setTimeout(() => {
          timedOut = true;
          resolve();
        }, BaseSession.CALL_REPORT_UPLOAD_DRAIN_TIMEOUT_MS)
      ),
    ]);

    if (timedOut) {
      logger.warn('Timed out waiting for pending call report uploads', {
        pendingCount: this._pendingCallReportUploads.size,
      });
    }
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  broadcast(_params: BroadcastParams) {} // TODO: to be implemented

  /**
   * Remove subscriptions and calls, close WS connection and remove all session listeners.
   * @return void
   */
  async disconnect() {
    clearTimeout(this._reconnectTimeout);
    this._clearTokenExpiryTimeout();
    this._cancelSocketCloseReportWatcher();
    this.subscriptions = {};
    this._autoReconnect = false;
    this._intentionalClose = true;
    this._reconnectAttempts = 0;
    this.relayProtocol = null;
    await this._drainCallReportUploads();
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
  on(
    eventName: SwEvent.Error | 'telnyx.error',
    callback: (event: ITelnyxErrorEvent) => void
  ): this;
  on(
    eventName: SwEvent.Warning | 'telnyx.warning',
    callback: (event: ITelnyxWarningEvent) => void
  ): this;
  on(
    eventName: SwEvent.Notification | 'telnyx.notification',
    callback: (event: INotification) => void
  ): this;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  on(eventName: string, callback: Function): this;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
  off(
    eventName: SwEvent.Error | 'telnyx.error',
    callback?: (event: ITelnyxErrorEvent) => void
  ): this;
  off(
    eventName: SwEvent.Warning | 'telnyx.warning',
    callback?: (event: ITelnyxWarningEvent) => void
  ): this;
  off(
    eventName: SwEvent.Notification | 'telnyx.notification',
    callback?: (event: INotification) => void
  ): this;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  off(eventName: string, callback?: Function): this;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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

    // If auto-reconnect was disabled (e.g. after exhaustion or disconnect),
    // reset the counter so a fresh retry sequence starts.
    if (!this._autoReconnect) {
      logger.debug('autoReconnect was disabled, resetting reconnect attempts');
      this._reconnectAttempts = 0;
    }

    this._autoReconnect = true;
    if (!this.connection.isAlive) {
      logger.debug(
        "Connection wasn't alive, initiating connection to the server..."
      );
      this.connection.connect();
    }
    logger.debug('Connect method called. Connection initiated.');

    // Schedule the socket-close watcher for the "never opened" case: if the
    // socket doesn't open within SOCKET_CLOSE_REPORT_TIMEOUT_MS, the watcher
    // fires and submits a session-level report. _onSocketOpen cancels it on
    // success, and onNetworkClose reschedules with the close-event reason.
    // Only schedule when there's no existing watcher — onNetworkClose may
    // have already scheduled one during auto-reconnect, and we must not
    // reset its 15s countdown.
    if (!this._socketCloseReportWatcher) {
      this._scheduleSocketCloseReportWatcher({ type: 'socket-never-opened' });
    }
  }

  /**
   * Reset the automatic reconnection attempt counter.
   * Call this when the connection is fully established (e.g. on REGED)
   * or when the user manually initiates a reconnect after exhaustion.
   */
  public resetReconnectAttempts(): void {
    this._reconnectAttempts = 0;
    this._reconnectCountedGeneration = -1;
  }

  /**
   * Handle login error
   * @return void
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _handleLoginError(error: any) {
    const telnyxError = createTelnyxError(LOGIN_FAILED, error);
    trigger(
      SwEvent.Error,
      { error: telnyxError, sessionId: this.sessionid },
      this.uuid
    );
  }

  /**
   * Clears the reconnect token from sessionStorage.
   * This forces the next connection to pick a new b2bua-rtc instance
   * via weighted round-robin instead of sticking to the same one.
   */
  public clearReconnectToken(): void {
    clearReconnectToken();
  }

  /**
   * Check if the login_token is a JWT and schedule a warning
   * if it's expiring within TOKEN_EXPIRY_WARNING_SECONDS.
   */
  private _checkTokenExpiry(): void {
    this._clearTokenExpiryTimeout();
    const token = this.options.login_token;
    if (!token || typeof token !== 'string') return;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      if (typeof exp !== 'number') return;

      const nowSec = Math.floor(Date.now() / 1000);
      const secondsUntilExpiry = exp - nowSec;

      if (secondsUntilExpiry <= 0) {
        // Already expired — login will fail and _handleLoginError will handle it
        return;
      } else if (
        secondsUntilExpiry <= BaseSession.TOKEN_EXPIRY_WARNING_SECONDS
      ) {
        // Expiring very soon — emit immediately
        this._emitTokenExpiryWarning();
      } else {
        // Schedule warning for TOKEN_EXPIRY_WARNING_SECONDS before expiry
        const delayMs =
          (secondsUntilExpiry - BaseSession.TOKEN_EXPIRY_WARNING_SECONDS) *
          1000;
        this._tokenExpiryTimeout = setTimeout(() => {
          this._emitTokenExpiryWarning();
        }, delayMs);
      }
    } catch {
      // Not a valid JWT — skip silently
      logger.debug('login_token is not a decodable JWT, skipping expiry check');
    }
  }

  private _emitTokenExpiryWarning(): void {
    const warning = createTelnyxWarning(TOKEN_EXPIRING_SOON);
    trigger(SwEvent.Warning, { warning, sessionId: this.sessionid }, this.uuid);
  }

  private _clearTokenExpiryTimeout(): void {
    if (this._tokenExpiryTimeout !== null) {
      clearTimeout(this._tokenExpiryTimeout);
      this._tokenExpiryTimeout = null;
    }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const telnyxError = createTelnyxError(
        INVALID_CREDENTIALS,
        undefined,
        msg
      );
      trigger(
        SwEvent.Error,
        {
          error: telnyxError,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError?: (error: any) => void;
  }): Promise<void> {
    let msg: Login | AnonymousLogin;
    const reconnectToken = getReconnectToken();
    const isReconnection = !!reconnectToken;
    const reconnectSessionId = isReconnection
      ? (this.sessionid && isReconnectSessionIdFresh()
          ? this.sessionid
          : getReconnectSessionId()) || ''
      : '';

    if (type === 'login') {
      msg = new Login(
        this.options.login,
        this.options.password || this.options.passwd,
        this.options.login_token,
        reconnectSessionId,
        this.options.userVariables,
        isReconnection
      );
    } else {
      msg = new AnonymousLogin({
        target_id: this.options.anonymous_login.target_id,
        target_type: this.options.anonymous_login.target_type,
        target_version_id: this.options.anonymous_login.target_version_id,
        target_params: this.options.anonymous_login.target_params,
        sessionId: reconnectSessionId,
        userVariables: this.options.userVariables,
        reconnection: isReconnection,
      });
    }

    const response = await this.execute(msg).catch((error) => {
      this._handleLoginError(error);
      if (onError) onError(error);
    });

    if (response) {
      this.sessionid = response.sessid;
      if (this.sessionid) {
        setReconnectSessionId(this.sessionid);
      }
      this._checkTokenExpiry();
      if (onSuccess) onSuccess();
    }
  }

  /**
   * Callback when the ws connection is open
   * @return void
   */
  protected async _onSocketOpen() {
    // Socket reconnected — cancel the socket-close report watcher.
    this._cancelSocketCloseReportWatcher();

    // Socket liveness is monitored for the session lifetime. Media/peer
    // recovery decisions remain scoped to active calls inside the monitor.
    this.startSignalingHealthMonitor();
  }

  private _flushIntermediateCallReports(
    flushReason: ICallReportFlushReason
  ): void {
    const calls = (
      this as unknown as {
        calls?: Record<
          string,
          {
            id?: string;
            flushIntermediateCallReport?: (
              flushReason?: ICallReportFlushReason
            ) => void;
          }
        >;
      }
    ).calls;

    if (!calls) return;

    Object.values(calls).forEach((call) => {
      if (!call?.flushIntermediateCallReport) return;

      try {
        call.flushIntermediateCallReport(flushReason);
      } catch (error) {
        logger.error('Failed to flush intermediate call report', {
          callId: call.id,
          flushReason,
          error,
        });
      }
    });
  }

  /**
   * Submit a session-level call report when the socket has been down for
   * {@link SOCKET_CLOSE_REPORT_TIMEOUT_MS}. This is used when there are no
   * active calls — the report has empty stats but carries the flush reason
   * and generated call_report_id so voice-sdk-debug can see the outage.
   *
   * When there *are* active calls, their reports are flushed via
   * {@link _flushIntermediateCallReports} (which uses the per-call
   * CallReportCollector). This method handles the no-call case.
   */
  private _submitSocketDownReport(
    flushReason: ICallReportFlushReason
  ): void {
    const host = this.connection?.host ?? this.options.host;
    if (!host) {
      logger.debug(
        'Cannot submit socket-down report: no host available (connection or options)'
      );
      return;
    }

    if (!this.callReportId) {
      this.callReportId = `gen-${uuidv4()}`;
      logger.info(
        'Generated synthetic call_report_id for socket-down report',
        { callReportId: this.callReportId }
      );
    }

    const wsUrl = new URL(host);
    const endpoint = `${wsUrl.protocol.replace(/^ws/, 'http')}//${wsUrl.host}/call_report`;

    const payload = {
      summary: {
        callId: this.callReportId,
        sdkVersion: SDK_VERSION,
        voiceSdkSessionId: this.sessionid || undefined,
        startTimestamp: new Date().toISOString(),
      },
      stats: [],
      flushReason,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-call-report-id': this.callReportId,
      'x-call-id': this.callReportId,
    };
    if (this.callReportVoiceSdkId) {
      headers['x-voice-sdk-id'] = this.callReportVoiceSdkId;
    }

    logger.info(
      `Socket still closed after ${BaseSession.SOCKET_CLOSE_REPORT_TIMEOUT_MS}ms — submitting session-level report`,
      { callReportId: this.callReportId, endpoint, flushReason }
    );

    const upload = fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
          logger.error(
            `Socket-down report POST failed with status ${response.status}`,
            { callReportId: this.callReportId }
          );
        }
      })
      .catch((error) => {
        logger.error('Failed to post socket-down report', {
          callReportId: this.callReportId,
          error,
        });
      });

    this._pendingCallReportUploads.add(upload);
    upload.finally(() => this._pendingCallReportUploads.delete(upload));
  }

  /**
   * Schedule a one-shot fallback timer that fires when the socket has been
   * closed for {@link SOCKET_CLOSE_REPORT_TIMEOUT_MS}. When the timer fires:
   *
   * 1. If the socket reconnected, do nothing (the watcher was already
   *    cancelled in `_onSocketOpen`).
   * 2. If `callReportId` is still null (server never assigned one), generate
   *    a synthetic `gen-{uuid}` ID so the report can be submitted.
   * 3. Flush any active call reports via `_flushIntermediateCallReports`.
   * 4. Submit a session-level report via `_submitSocketDownReport` so
   *    voice-sdk-debug has visibility into the outage even without an
   *    active call.
   *
   * The SDK requires an active socket connection for its entire lifetime —
   * if the socket is still down after 15s, that's a problem worth reporting.
   */
  private _scheduleSocketCloseReportWatcher(
    flushReason: ICallReportFlushReason
  ): void {
    if (this._socketCloseReportWatcher) {
      clearTimeout(this._socketCloseReportWatcher);
    }

    this._socketCloseReportWatcher = setTimeout(() => {
      this._socketCloseReportWatcher = null;

      // Socket reconnected before the timer fired — nothing to report.
      if (this.connection?.connected) return;

      // Generate callReportId if the server never assigned one.
      if (!this.callReportId) {
        this.callReportId = `gen-${uuidv4()}`;
        logger.info(
          'Generated synthetic call_report_id for socket-close fallback',
          { callReportId: this.callReportId }
        );
      }

      // Flush any active call reports (uses per-call CallReportCollector).
      this._flushIntermediateCallReports(flushReason);

      // Submit a session-level report so voice-sdk-debug sees the outage
      // even when there are no active calls.
      this._submitSocketDownReport(flushReason);
    }, BaseSession.SOCKET_CLOSE_REPORT_TIMEOUT_MS);
  }

  /**
   * Cancel the socket-close report watcher. Called when the socket
   * reconnects or the session is intentionally disconnected.
   */
  private _cancelSocketCloseReportWatcher(): void {
    if (this._socketCloseReportWatcher) {
      clearTimeout(this._socketCloseReportWatcher);
      this._socketCloseReportWatcher = null;
    }
  }

  /**
   * Callback when the ws connection is going to close or get an error
   * @return void
   * @private
   */
  private _getSocketCloseCodeName(code?: number): string | undefined {
    if (code === undefined) return undefined;

    const match = Object.entries(WS_CLOSE_CODES).find(
      ([, value]) => value === code
    );
    return match?.[0];
  }

  private _getSocketCloseError(error?: unknown): string | undefined {
    if (!error) return undefined;
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private _createSocketCloseFlushReason(event?: {
    code?: number;
    reason?: string;
    wasClean?: boolean;
    error?: unknown;
  }): ICallReportFlushReason {
    return {
      type: event?.error ? 'socket-error' : 'socket-close',
      socketClose: {
        code: event?.code,
        codeName: this._getSocketCloseCodeName(event?.code),
        reason: event?.reason,
        wasClean: event?.wasClean,
        error: this._getSocketCloseError(event?.error),
      },
    };
  }

  public onNetworkClose(event?: {
    code?: number;
    reason?: string;
    wasClean?: boolean;
    error?: unknown;
    socketGeneration?: number;
  }): void {
    // ── Stale event guard ───────────────────────────────────────────────
    // If a newer socket generation exists, this close/error event belongs
    // to an old socket that has already been replaced. Running cleanup
    // here would tear down the replacement socket's state (flush its call
    // reports, deregister its subscriptions, stop its health monitor,
    // clear its timers, and schedule a redundant reconnect). Return early
    // to protect the current generation.
    //
    // Race scenario this prevents:
    //   1. Gen-N SocketError fires → onNetworkClose runs cleanup, schedules reconnect
    //   2. Reconnect creates gen-N+1, health monitor starts
    //   3. Gen-N SocketClose arrives late → without this guard, cleanup would
    //      tear down gen-N+1's state before the generation check runs
    const currentGeneration = this.connection?.socketGeneration ?? 0;
    const eventGeneration = event?.socketGeneration ?? currentGeneration;
    if (eventGeneration < currentGeneration) {
      logger.debug(
        `Skipping stale onNetworkClose for socket generation ${eventGeneration} ` +
          `(current generation is ${currentGeneration})`
      );
      return;
    }

    // ── Same-generation dedupe guard ────────────────────────────────────
    // When a socket fails, browsers commonly emit both SocketError and
    // SocketClose for the same physical disconnect. Both events carry the
    // same socketGeneration. The first event runs the full cleanup and
    // schedules a reconnect timer. The second (duplicate) event must not
    // re-run cleanup — in particular, it must not clear the already-
    // scheduled reconnect timer (which would delay active-call recovery)
    // or schedule a redundant reconnect.
    if (eventGeneration === this._reconnectCountedGeneration) {
      logger.debug(
        `Skipping duplicate onNetworkClose for socket generation ${eventGeneration} ` +
          `(already handled, reconnect attempt ${this._reconnectAttempts})`
      );
      return;
    }

    this._flushIntermediateCallReports(
      this._createSocketCloseFlushReason(event)
    );

    // Schedule a delayed fallback: if the socket is still closed after
    // SOCKET_CLOSE_REPORT_TIMEOUT_MS, generate a synthetic call_report_id
    // (when the server never assigned one) and submit a session-level
    // report so voice-sdk-debug has visibility into the outage. The SDK
    // requires an active socket — if it's still down after 15s, report it.
    this._scheduleSocketCloseReportWatcher(
      this._createSocketCloseFlushReason(event)
    );

    // ── Debug: WebSocket close event ──
    // Note: reconnectDelay is NOT logged here because it is a random getter
    // (randomInt(2,6)*1000). The actual delay used for setTimeout is computed
    // once after incrementing the attempt counter and logged there.
    logger.debug('onNetworkClose called', {
      closeCode: event?.code,
      closeReason: event?.reason,
      wasClean: event?.wasClean,
      voiceSdkId: this.callReportVoiceSdkId,
      sessid: this.sessionid || undefined,
      autoReconnect: this._autoReconnect,
      reconnectAttempts: this._reconnectAttempts,
    });

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
    this.stopSignalingHealthMonitor();

    if (this.sessionid && this._autoReconnect) {
      setReconnectSessionId(this.sessionid);
    }

    // Reset gateway state on socket close so telnyx.ready fires again on reconnection
    if (this.connection) {
      this.connection.previousGatewayState = '';
    }

    if (this._autoReconnect) {
      const maxAttempts = this.options.maxReconnectAttempts ?? 10;

      // Mark this generation as handled and increment the attempt counter.
      // The early same-generation dedupe guard above ensures we only reach
      // here for the first event of each generation, so no inline dedupe
      // is needed.
      this._reconnectCountedGeneration = eventGeneration;
      this._reconnectAttempts += 1;

      if (maxAttempts > 0 && this._reconnectAttempts > maxAttempts) {
        logger.info(
          `Reconnection exhausted after ${maxAttempts} attempts. Stopping automatic reconnect.`
        );
        this._reconnectAttempts = 0;
        this._autoReconnect = false;

        // Tear down any active calls LOCALLY before declaring reconnection
        // exhausted. The socket is already dead, so sending BYE would only
        // generate BYE_SEND_FAILED noise. (VSDK-318 Step 4.d)
        this._terminateActiveCallsLocally();

        const telnyxError = createTelnyxError(RECONNECTION_EXHAUSTED);
        trigger(
          SwEvent.Error,
          { error: telnyxError, sessionId: this.sessionid },
          this.uuid
        );
        return;
      }

      // Compute the reconnect delay once so the logged value matches the
      // actual setTimeout delay. reconnectDelay is a random getter
      // (randomInt(2,6)*1000) — reading it twice yields different values.
      const delayMs = this.reconnectDelay;

      logger.debug(
        `Reconnect attempt ${this._reconnectAttempts}${maxAttempts > 0 ? ` of ${maxAttempts}` : ''} (delay=${delayMs}ms)`
      );

      this._reconnectTimeout = setTimeout(() => {
        logger.debug(
          'Calling connect due to network close and auto-reconnect enabled.'
        );
        this.connect();
      }, delayMs);
    } else {
      // Auto-reconnect is disabled — emit warning only for unexpected
      // socket closes (e.g. network failure with auto-reconnect off).
      // Intentional disconnect/cleanup should NOT surface a public
      // telnyx.warning since no reconnection failure occurred.
      logger.debug('auto_reconnect disabled, not reconnecting', {
        voiceSdkId: this.callReportVoiceSdkId,
        sessid: this.sessionid || undefined,
        intentionalClose: this._intentionalClose,
      });

      if (!this._intentionalClose) {
        const warning = createTelnyxWarning(
          RECONNECTION_FAILED_WITH_NO_AUTO_RECONNECT
        );
        trigger(
          SwEvent.Warning,
          {
            warning,
            reason: 'auto_reconnect_disabled',
            sessionId: this.sessionid,
          },
          this.uuid
        );
      }
    }
    // Reset intentionalClose flag — it only applies to this
    // onNetworkClose invocation.
    this._intentionalClose = false;
  }

  /**
   * Callback to handle inbound messages from the ws
   * @return void
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  protected _onSocketMessage(_response: any) {}

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
    logger.debug('Attaching socket event listeners');
    this.on(SwEvent.SocketOpen, this._onSocketOpen);
    this.on(SwEvent.SocketClose, this.onNetworkClose);
    this.on(SwEvent.SocketError, this.onNetworkClose);
    this.on(SwEvent.SocketMessage, this._onSocketMessage);
    this.on(SwEvent.SocketActivity, this._onSocketActivity);
  }

  /**
   * Detach listeners for Socket events and disconnect
   * @return void
   */
  private _detachListeners() {
    logger.debug('Detaching socket event listeners');
    this.off(SwEvent.SocketOpen, this._onSocketOpen);
    this.off(SwEvent.SocketClose, this.onNetworkClose);
    this.off(SwEvent.SocketError, this.onNetworkClose);
    this.off(SwEvent.SocketMessage, this._onSocketMessage);
    this.off(SwEvent.SocketActivity, this._onSocketActivity);
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
    this.stopSignalingHealthMonitor();

    logger.debug('_closeConnection called', {
      connected: this.connection?.connected,
      socketGeneration: this.connection?.socketGeneration,
      voiceSdkId: this.callReportVoiceSdkId,
      sessid: this.sessionid || undefined,
    });

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

  // ── Signaling health monitor ──────────────────────────────────────

  /**
   * Called from the SocketActivity listener (fired by Connection.onmessage).
   * Updates the timestamp used by the signaling health monitor.
   */
  private _onSocketActivity(): void {
    this._signalingHealthMonitor.onSocketActivity();
  }

  /**
   * Returns true if there is at least one active (non-terminated) call.
   * Public so that BaseCall can check if the monitor should stop.
   */
  public hasActiveCall(): boolean {
    const calls = (
      this as unknown as { calls?: Record<string, { _state?: number }> }
    ).calls;
    if (!calls) return false;
    // Active call states: Early, Active, Held — the states where media
    // should be flowing and signaling liveness matters.
    const activeStates = new Set<number>([
      State.Early,
      State.Active,
      State.Held,
    ]);
    return Object.values(calls).some(
      (call) => call && call._state != null && activeStates.has(call._state)
    );
  }

  /**
   * Tear down every active call LOCALLY without sending BYE on the wire.
   *
   * Used before emitting `RECONNECTION_EXHAUSTED` (and any other path where
   * the signaling socket is already dead). Sending BYE over a dead socket
   * would only generate `BYE_SEND_FAILED` noise, so each call is finalized
   * via `hangup({}, false)` — which closes the RTCPeerConnection, stops
   * media, fires the local hangup notification, and removes the call from
   * `session.calls`, but skips the outbound BYE. (VSDK-318 Step 4.d)
   */
  public _terminateActiveCallsLocally(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = (this as any).calls;
    if (!calls) return;
    const callIds = Object.keys(calls);
    if (callIds.length === 0) return;
    logger.debug(
      `Reconnection exhausted — locally terminating ${callIds.length} active call(s) (no BYE): ${callIds.join(', ')}`
    );
    for (const callId of callIds) {
      const call = calls[callId];
      // Local-only teardown: execute=false skips the outbound BYE.
      void call?.hangup({}, false);
    }
  }

  /**
   * Start the signaling health monitor. Called when a call becomes active
   * or on reconnect if calls exist.
   */
  startSignalingHealthMonitor(): void {
    this._signalingHealthMonitor.start();
  }

  /**
   * Stop the signaling health monitor. Called when no active calls remain
   * or on disconnect.
   */
  stopSignalingHealthMonitor(): void {
    this._signalingHealthMonitor.stop();
  }

  /**
   * Trigger ICE restart on the call identified by callId.
   * Called by the health monitor when media/peer is unhealthy but
   * signaling is healthy.
   */
  triggerIceRestart(callId: string): TriggerIceRestartResult {
    const calls = (
      this as unknown as {
        calls?: Record<
          string,
          {
            options?: { attach?: boolean };
            recoveredCallId?: string;
            peer?: { restartIce?: () => RestartIceResult };
          }
        >;
      }
    ).calls;
    const call = calls?.[callId];
    if (!call) {
      logger.warn(
        `Signaling health: cannot trigger ICE restart — call ${callId} not found`
      );
      return { started: false, reason: 'call not found' };
    }

    // Reattached/recovered calls use the same ICE restart path as normal
    // active calls now that b2bua-rtc supports Modify after attach recovery.
    // Socket reconnect + attach remains the owner only when signaling itself
    // is unhealthy (handled by the signaling health monitor).

    const peer = call.peer;
    if (!peer?.restartIce) {
      logger.warn(
        `Signaling health: cannot trigger ICE restart — no peer for call ${callId}`
      );
      return { started: false, reason: 'no peer' };
    }
    const result = peer.restartIce();
    if (!result.started) {
      logger.debug(
        `Signaling health: ICE restart skipped for call ${callId}: ${result.reason}`
      );
    }
    return result;
  }

  /**
   * Called when a signaling request times out (via Connection.RequestTimeoutError).
   * Delegates to the signaling health monitor for recovery.
   * Only critical methods (Modify, Bye, Ping) trigger force-reconnect;
   * non-critical timeouts are just logged.
   */
  onSignalingRequestTimeout(
    requestId: string,
    timeoutMs: number,
    method: string = ''
  ): void {
    this._signalingHealthMonitor.onRequestTimeout(requestId, timeoutMs, method);
  }

  /**
   * Report a peer/ICE failure to the health monitor.
   * Called by Peer when iceConnectionState or connectionState
   * transitions to 'failed'.
   *
   * The health monitor decides whether to trigger ICE restart
   * (if signaling is healthy) or socket reconnect (if signaling
   * is also unhealthy).
   */
  reportPeerFailure(callId: string, evidence: PeerFailureEvidence): void {
    this._signalingHealthMonitor.onPeerFailure(callId, evidence);
  }

  /**
   * Report no-RTP condition to the health monitor.
   * Called by CallReportCollector when RTP bytes stop flowing
   * while media should be active.
   *
   * The health monitor decides whether to trigger ICE restart
   * (if signaling is healthy) or socket reconnect (if signaling
   * is also unhealthy).
   */
  reportNoRtp(callId: string, direction: 'inbound' | 'outbound'): void {
    this._signalingHealthMonitor.onNoRtp(callId, direction);
  }

  /**
   * Report that an ICE restart attempt failed for the given call.
   * Called by BaseCall when the ICE restart Modify request could not be
   * sent or the server returned an error.
   *
   * The health monitor owns the recovery decision (whether to reconnect
   * the socket, when, etc.). BaseCall does NOT trigger recovery itself —
   * this handoff keeps recovery logic in one place.
   */
  reportIceRestartFailed(callId: string): void {
    this._signalingHealthMonitor.onIceRestartFailed(callId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
