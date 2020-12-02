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
   * @param destinationNumber Extension to dial.
   * @param callerNumber Number to use as the caller ID when dialling out to a phone number.
   * @param id The identifier of the Call.
   * @param localStream If sets, the Call will use this stream instead of retrieving a new one.
   * @param localElement Overrides client's default `localElement`.
   * @param remoteElement Overrides client's default `remoteElement`.
   * @param iceServers Overrides client's default `iceServers`.
   * @param audio Overrides client's default audio constraints.
   * @param video Overrides client's default video constraints.
   * @param useStereo Uses stereo audio instead of mono.
   * @param micId `deviceId` to use as microphone. Overrides the client's default one.
   * @param camId `deviceId` to use as webcam. Overrides the client's default one.
   * @param speakerId deviceId to use as speaker. Overrides the client's default one.
   * @param onNotification Overrides client's default `telnyx.notification` handler for this Call.
   *
   * @return `Promise<Call>` A promise fulfilled with the new outbound Call object or rejected with the error.
   *
   * ## Examples
   *
   * Making an outbound call to `+1 856-444-0362` using default values from the Client:
   *
   * Using async/await:
   *
   * ```js
   * const options = { destinationNumber: '+18564440362' }
   * const call = await client.newCall(options).catch(console.error)
   * ```
   */
  newCall(options: CallOptions) {
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
    }
  }

  protected _onSocketMessage(msg: any) {
    const handler = new VertoHandler(this);
    handler.handleMessage(msg);
  }
}
