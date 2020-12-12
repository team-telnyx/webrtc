import TelnyxRTCClient from './Modules/Verto';
import { ITelnyxRTCOptions } from './Modules/Verto/util/interfaces';

/**
 * @apidoc Include in API docs
 */
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
   * @examples
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
   * ### Custom ringtone and ringback
   *
   * Custom ringback and ringtone files can be a wav/mp3 in your local public folder
   * or a file hosted on a CDN, ex: https://cdn.company.com/sounds/call.mp3.
   *
   * To use the `ringbackFile`, make sure the "Generate Ringback Tone" option is **disabled**
   * in your [Telnyx Portal connection](https://portaldev.telnyx.com/#/app/connections)
   * configuration (Inbound tab.)
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
