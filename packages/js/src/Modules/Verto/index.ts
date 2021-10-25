import BrowserSession from './BrowserSession';
import { SubscribeParams, BroadcastParams } from './util/interfaces';
import { IVertoCallOptions } from './webrtc/interfaces';
import { Login } from './messages/Verto';
import Call from './webrtc/Call';
import { SwEvent, SESSION_ID } from './util/constants';
import { trigger } from './services/Handler';
import { sessionStorage } from './util/storage';
import VertoHandler from './webrtc/VertoHandler';
import { isValidOptions } from './util/helpers';
import logger from './util/logger';

export const VERTO_PROTOCOL = 'verto-protocol';

export default class Verto extends BrowserSession {
  public relayProtocol: string = VERTO_PROTOCOL;

  public timeoutErrorCode = -329990; // fake verto timeout error code.

  validateOptions() {
    return isValidOptions(this.options);
  }

  newCall(options: IVertoCallOptions) {
    if (!options || !options.destinationNumber) {
      throw new Error('Verto.newCall() error: destinationNumber is required.');
    }

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

  protected async _onSocketOpen() {
    this._idle = false;
    const {
      login,
      password,
      passwd,
      login_token,
      userVariables,
    } = this.options;
    const msg = new Login(
      login,
      password || passwd,
      login_token,
      this.sessionid,
      userVariables
    );
    const response = await this.execute(msg).catch(this._handleLoginError);
    if (response) {
      this._autoReconnect = true;
      this.sessionid = response.sessid;
      sessionStorage.setItem(SESSION_ID, this.sessionid);
      // trigger(SwEvent.Ready, this, this.uuid);
      // logger.info('Session Ready!');
    }
  }

  protected _onSocketMessage(msg: any) {
    const handler = new VertoHandler(this);
    handler.handleMessage(msg);
  }
}
