/* eslint-disable no-useless-constructor */
import TelnyxRTCClient from './Modules/Verto';
import { ICallOptions, IClientOptions } from './utils/interfaces';
import {
  getWebRTCInfo,
  getWebRTCSupportedBrowserList,
} from './Modules/Verto/webrtc/helpers';
interface IWebRTCInfo {
  browserInfo: any;
  browserName: string;
  browserVersion: string;
  supportWebRTC: boolean;
  supportWebRTCAudio: boolean;
  supportWebRTCVideo: boolean;
  supportRTCPeerConnection: boolean;
  supportSessionDescription: boolean;
  supportIceCandidate: boolean;
  supportMediaDevices: boolean;
  supportGetUserMedia: boolean;
}

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
  constructor(options: IClientOptions) {
    super(options);
  }

  /**
   * Makes a new outbound call.
   *
   * @param options Options object for a new call.
   *
   * @return The new outbound `Call` object.
   *
   * @examples
   *
   * Making an outbound call to `+1 856-444-0362` using default values from the client:
   *
   * ```js
   * const call = client.newCall({
   *   destinationNumber: '+18564440362',
   *   callerNumber: '+15551231234'
   * });
   * ```
   *
   * You can omit `callerNumber` when dialing a SIP address:
   *
   * ```js
   * const call = client.newCall({
   *  destinationNumber: 'sip:example-sip-username@voip-provider.example.net'
   * });
   * ```
   *
   * If you are making calls from one Telnyx connection to another, you may specify just the SIP username:
   *
   * ```js
   * const call = client.newCall({
   *  destinationNumber: 'telnyx-sip-username' // This is equivalent to 'sip:telnyx-sip-username@sip.telnyx.com'
   * });
   * ```
   *
   * ### Error handling
   *
   * An error will be thrown if `destinationNumber` is not specified.
   *
   * ```js
   * const call = client.newCall().catch(console.error);
   * // => `destinationNumber is required`
   * ```
   */
  newCall(options: ICallOptions) {
    return super.newCall(options);
  }

  /**
   * Checks if the running browser has support for TelnyRTC
   *
   * @return An object with WebRTC browser support information or a string error message.
   *
   * @examples
   *
   * Check if your browser supports TelnyxRTC
   *
   * ```js
   * const info = TelnyxRTC.webRTCInfo();
   * const isWebRTCSupported = info.supportWebRTC;
   * console.log(isWebRTCSupported); // => true
   * ```
   *
   * #### Error handling
   *
   * An error will be thrown if your browser doesn't supported TelnyxRTC
   *
   * ```js
   * const info = TelnyxRTC.webRTCInfo();
   * if (!info.supportWebRTC) {
   *   console.error(info) // => 'This browser does not support @telnyx/webrtc. \nPlease, use Chrome|Firefox|Safari.'
   * }
   * ```
   */
  public static webRTCInfo(): IWebRTCInfo | string {
    return getWebRTCInfo();
  }

  /**
   * Returns the WebRTC supported browser list.
   *
   * The following table indicates the browsers supported by TelnyxRTC.
   * We support the most recent (N) and the two previous (N-2) versions of these browsers unless otherwise indicated.
   *
   * |  | Chrome | Firefox | Safari | Edge |
   * |---|---|---|---|---|
   * | Android | [x] | [x] | [ ] | [ ] |
   * | iOS | [x] | [x] | [x] | [ ] |
   * | Linux | [x] | [x] | [ ] | [ ] |
   * | MacOS | [x] | [x] | [x] | [x] |
   * | Windows | [x] | [x] | [ ] | [x] |
   *
   * @return an array with supported operational systems and browsers.
   *
   * @examples
   * 
   * ```js
   * const browserList = TelnyxRTC.webRTCSupportedBrowserList();
   * console.log(browserList) // => [{"operationSystem": "Android", "supported": [{"browserName": "Chrome", "features": ["video", "audio"], "supported": "full"},{...}]
   * ```
   */
  public static webRTCSupportedBrowserList() {
    return getWebRTCSupportedBrowserList();
  }
}
