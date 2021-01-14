import TelnyxRTCClient from './Modules/Verto';
import { ITelnyxRTCOptions } from './Modules/Verto/util/interfaces';

/**
 * The `TelnyxRTC` client connects your application to the Telnyx backend,
 * enabling you to make outgoing calls and handle incoming calls.
 *
 * @examples
 *
 * ```js
 * // Initialize the client
 * const client = new TelnyxRTC({
 *   // Use a JWT to authenticate (recommended)
 *   login_token: login_token,
 *   // or use your Connection credentials
 *   //  login: username,
 *   //  password: password,
 * });
 *
 * // Attach event listeners
 * client
 *   .on('telnyx.ready', () => console.log('ready to call'))
 *   .on('telnyx.notification', (notification) => {
 *     console.log('notification:', notification)
 *   });
 *
 * // Connect and login
 * client.connect();
 *
 * // You can disconnect when you're done
 * //  client.disconnect();
 * ```
 *
 * @category Client
 */
export default class TelnyxRTC extends TelnyxRTCClient {
  /**
   * Creates a new `TelnyxRTC` instance with the provided options.
   *
   * |   |   |   |   |
   * |---|---|---|---|
   * | `login_token` | string | **required** | The JSON Web Token (JWT) to authenticate with your SIP Connection. This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart). |
   * | `login` | string | optional | The `username` to authenticate with your SIP Connection. `login` and `password` will take precedence over `login_token` for authentication. |
   * | `password` | string | optional | The `password` to authenticate with your SIP Connection. |
   * | `ringtoneFile` | string | optional | A URL to a wav/mp3 ringtone file. |
   * | `ringbackFile` | string | optional | A URL to a wav/mp3 ringback file that will be used when you disable "Generate Ringback Tone" in you SIP Connection. |
   *
   * @param options Options for initializing a client
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
   * #### Custom ringtone and ringback
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
