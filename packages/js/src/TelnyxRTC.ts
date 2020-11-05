import BrowserSession from './Modules/Verto/BrowserSession';
import {
  SubscribeParams,
  BroadcastParams,
  ITelnyxRTCOptions,
} from './Modules/Verto/util/interfaces';
import { CallOptions } from './Modules/Verto/webrtc/interfaces';
import { Login } from './Modules/Verto/messages/Verto';
import Call from './Modules/Verto/webrtc/Call';
import { SwEvent, SESSION_ID } from './Modules/Verto/util/constants';
import { trigger } from './Modules/Verto/services/Handler';
import { sessionStorage } from './Modules/Verto/util/storage';
import VertoHandler from './Modules/Verto/webrtc/VertoHandler';
import { isValidOptions } from './Modules/Verto/util/helpers';

export const VERTO_PROTOCOL = 'verto-protocol';

export default class TelnyxRTC extends BrowserSession {
  public relayProtocol: string = VERTO_PROTOCOL;

  public timeoutErrorCode = -329990; // fake verto timeout error code.

  /**
   * Creates a new `TelnyxRTC` instance with the provided options.
   *
   * @param options An object with options.
   * @param options.login_token The JSON Web Token (JWT) to authenticate with your SIP Connection. This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).
   * @param options.login The `username` to authenticate with your SIP Connection.
   * @param options.password The `password` to authenticate with your SIP Connection.
   * @param options.ringtoneFile A URL to a wav/mp3 ringtone file.
   * @param options.ringbackFile A URL to a wav/mp3 ringback file that will be used when you disable "Generate Ringback Tone" in you SIP Connection.
   *
   * ## Examples:
   *
   * Authenticating with a JSON Web Token:
   *
   * ```javascript
   * const client = new TelnyxRTC({
   *   login_token: login_token,
   * });
   * ```
   *
   * Authenticating with username and password credentials:
   *
   * ```js
   * const client = new TelnyxRTC({
   *   login: username,
   *   password: password,
   * });
   * ```
   *
   * Setting `ringtoneFile` and `ringbackFile`:
   *
   * ```js
   * const client = new TelnyxRTC({
   *   login_token: login_token,
   *   ringtoneFile: './sounds/incoming_call.mp3',
   *   ringbackFile: './sounds/ringback_tone.mp3',
   * });
   * ```
   */
  constructor(options: ITelnyxRTCOptions) {
    super(options);
  }
  validateOptions() {
    return isValidOptions(this.options);
  }

  newCall(options: CallOptions) {
    const { destinationNumber = null } = options;
    if (!destinationNumber) {
      throw new Error(
        'TelnyxRTC.newCall() error: destinationNumber is required.'
      );
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
