import BrowserSession from './BrowserSession';
import { SubscribeParams, BroadcastParams } from './util/interfaces';
import { CallOptions } from './webrtc/interfaces';
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

  /**
   * Makes a new outbound call.
   *
   * This method receives an object `options` with the following properties:
   *
   * @param options Options object for a new call.
   * @param options.destinationNumber Phone number or SIP URI to dial.
   * @param options.callerNumber Number to use as the caller ID when dialing out to a destination.
   * @param options.callerName Name to use as the caller ID name when dialing out to a destination.
   * @param options.id The identifier of the call.
   * @param options.localStream If set, the call will use this stream instead of retrieving a new one.
   * @param options.localElement Overrides client's default `localElement`.
   * @param options.remoteElement Overrides client's default `remoteElement`.
   * @param options.iceServers Overrides client's default `iceServers`.
   * @param options.audio Overrides client's default audio constraints.
   * @param options.video Overrides client's default video constraints.
   * @param options.useStereo Uses stereo audio instead of mono.
   * @param options.micId `deviceId` to use as microphone. Overrides the client's default one.
   * @param options.camId `deviceId` to use as webcam. Overrides the client's default one.
   * @param options.speakerId `deviceId` to use as speaker. Overrides the client's default one.
   * @param options.onNotification Overrides client's default `telnyx.notification` handler for this Call.
   *
   * @return `Promise<Call>` A promise fulfilled with the new outbound Call object
   * or rejected with the error.
   *
   * @examples
   *
   * Making an outbound call to `+1 856-444-0362` using default values from the Client:
   *
   * if `options` is `null`.
   * it will return the message error `You need to provide the options<CallOptions> object.`
   *
   * Using async/await:
   *
   * ```js
   * const call = await client.newCall().catch(console.error)
   * ```
   *
   * if `destinationNumber` is `null`.
   * it will return the message error `destinationNumber is required.`
   *
   * Using async/await:
   *
   * ```js
   * const options = {}
   * const call = await client.newCall(options).catch(console.error)
   * ```
   *
   * if `destinationNumber` is **not** `null`.
   * it will make a call.
   *
   * Using async/await:
   *
   * ```js
   * const options = { destinationNumber: '+18564440362' }
   * const call = await client.newCall(options).catch(console.error)
   * ```
   */
  newCall(options: CallOptions) {
    if (!options) {
      throw new Error('You need to provide the options<CallOptions> object');
    }
    const { destinationNumber = null } = options;
    if (!destinationNumber) {
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
      trigger(SwEvent.Ready, this, this.uuid);
      logger.info('Session Ready!');
    }
  }

  protected _onSocketMessage(msg: any) {
    const handler = new VertoHandler(this);
    handler.handleMessage(msg);
  }
}
