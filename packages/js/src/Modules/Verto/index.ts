import BrowserSession from './BrowserSession';
import {
  SubscribeParams,
  BroadcastParams,
  IVertoOptions,
} from './util/interfaces';
import { IVertoCallOptions } from './webrtc/interfaces';
import { Login } from './messages/Verto';
import Call from './webrtc/Call';
import { TIME_CALL_INVITE } from './util/constants';
import VertoHandler from './webrtc/VertoHandler';
import {
  isValidAnonymousLoginOptions,
  isValidLoginOptions,
} from './util/helpers';
import { getReconnectToken } from './util/reconnect';
import { AnonymousLogin } from './messages/verto/AnonymousLogin';

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

    console.time(TIME_CALL_INVITE);
    const call = new Call(this, options);
    call.invite();
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

  private handleLoginOnSocketOpen = async () => {
    this._idle = false;
    const {
      login,
      password,
      passwd,
      login_token,
      userVariables,
      autoReconnect = true,
    } = this.options;

    const msg = new Login(
      login,
      password || passwd,
      login_token,
      this.sessionid,
      userVariables,
      !!getReconnectToken()
    );
    const response = await this.execute(msg).catch(this._handleLoginError);
    if (response) {
      this._autoReconnect = autoReconnect;
      this.sessionid = response.sessid;
    }
  };

  private handleAnonymousLoginOnSocketOpen = async () => {
    this._idle = false;
    const { anonymous_login } = this.options;
    const { target_type, target_id } = anonymous_login;
    const msg = new AnonymousLogin(
      target_type,
      target_id,
      this.sessionid,
      this.options.userVariables,
      !!getReconnectToken()
    );
    const response = await this.execute(msg).catch(this._handleLoginError);
    if (response) {
      this.sessionid = response.sessid;
    }
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
