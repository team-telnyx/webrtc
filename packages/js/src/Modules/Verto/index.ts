import BrowserSession from './BrowserSession';
import {
  SubscribeParams,
  BroadcastParams,
  IVertoOptions,
  ILoginParams,
} from './util/interfaces';
import { IVertoCallOptions } from './webrtc/interfaces';
import Call from './webrtc/Call';
import VertoHandler from './webrtc/VertoHandler';
import {
  isValidAnonymousLoginOptions,
  isValidLoginOptions,
} from './util/helpers';
import logger from './util/logger';

export const VERTO_PROTOCOL = 'verto-protocol';

export default class Verto extends BrowserSession {
  public relayProtocol: string = VERTO_PROTOCOL;

  public timeoutErrorCode = -329990; // fake verto timeout error code.

  constructor(options: IVertoOptions) {
    super(options);
    // hang up current call when browser closes or refreshes.
    window.addEventListener('beforeunload', (e) => {
      if (this.calls) {
        Object.keys(this.calls).forEach((callId) => {
          if (this.calls[callId]) {
            logger.info(`Hanging up call due to window unload: ${callId}`);
            this.calls[callId].hangup({}, true);
          }
        });
      }
    });
  }

  validateOptions() {
    return (
      isValidLoginOptions(this.options) ||
      isValidAnonymousLoginOptions(this.options)
    );
  }

  newCall(options: IVertoCallOptions) {
    if (!this.validateCallOptions(options)) {
      throw new Error('Verto.newCall() error: destinationNumber is required.');
    }
    performance.mark('new-call-start');
    const call = new Call(this, options);
    call.invite();
    performance.mark('new-call-end');
    return call;
  }

  broadcast(params: BroadcastParams) {
    return this.vertoBroadcast(params);
  }

  subscribe(params: SubscribeParams) {
    return this.vertoSubscribe(params);
  }

  unsubscribe(params: SubscribeParams) {
    return this.vertoUnsubscribe(params);
  }

  /**
   * Re-authenticate with new credentials within an active connection.
   * Updates session options and re-authenticates immediately.
   *
   * @param params - New login credentials (login/password OR login_token)
   * @returns Promise that resolves when authentication succeeds
   *
   * @example
   * ```js
   * // Refresh JWT token
   * const newToken = await fetchNewJWT();
   * await client.login({ login_token: newToken });
   *
   * // Update login/password
   * await client.login({
   *   login: 'newuser@example.com',
   *   password: 'newpassword'
   * });
   * ```
   */
  async login(params: ILoginParams): Promise<void> {
    // Validate connection state
    if (!this.connection || !this.connection.isAlive) {
      throw new Error(
        'Cannot login: socket connection is not active. Call connect() first.'
      );
    }

    // Update session options with new credentials
    if (params.login !== undefined) {
      this.options.login = params.login;
    }
    if (params.password !== undefined) {
      this.options.password = params.password;
    }
    if (params.passwd !== undefined) {
      this.options.passwd = params.passwd;
    }
    if (params.login_token !== undefined) {
      this.options.login_token = params.login_token;
    }
    if (params.userVariables !== undefined) {
      this.options.userVariables = params.userVariables;
    }

    // Validate that we have valid credentials
    if (!this.validateOptions()) {
      throw new Error(
        'Invalid login parameters. Provide (login and password) OR login_token.'
      );
    }

    // Re-authenticate using the inherited shared methods
    if (isValidLoginOptions(this.options)) {
      return this._performLogin();
    } else if (isValidAnonymousLoginOptions(this.options)) {
      return this._performAnonymousLogin();
    }
  }

  private handleLoginOnSocketOpen = async () => {
    this._idle = false;
    const { autoReconnect = true } = this.options;

    await this._performLogin(); // Inherited from BaseSession
    this._autoReconnect = autoReconnect;
  };

  private handleAnonymousLoginOnSocketOpen = async () => {
    this._idle = false;
    await this._performAnonymousLogin(); // Inherited from BaseSession
  };

  private validateCallOptions(options: IVertoCallOptions) {
    if (isValidAnonymousLoginOptions(this.options)) {
      return true;
    }
    return Boolean(options.destinationNumber);
  }

  protected async _onSocketOpen() {
    if (isValidLoginOptions(this.options)) {
      return this.handleLoginOnSocketOpen();
    }
    if (isValidAnonymousLoginOptions(this.options)) {
      return this.handleAnonymousLoginOnSocketOpen();
    }
  }

  protected _onSocketMessage(msg: any) {
    const handler = new VertoHandler(this);
    handler.handleMessage(msg);
  }
}
