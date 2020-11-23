import TelnyxRTCClient from './Modules/Verto';
import { ITelnyxRTCOptions } from './Modules/Verto/util/interfaces';

export default class TelnyxRTC extends TelnyxRTCClient {
  /**
   * Creates a new `TelnyxRTC` instance with the provided options.
   *
   * @param options An object with options.
   * @param options.login_token The JSON Web Token (JWT) to authenticate with your SIP Connection. This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).
   * @param options.login The `username` to authenticate with your SIP Connection. `login` and `password` will take precedence over `login_token` for authentication.
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
}
