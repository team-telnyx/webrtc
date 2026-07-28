import TelnyxRTCClient from './Modules/Verto';
import { ICallOptions, IClientOptions } from './utils/interfaces';
import {
  getWebRTCInfo,
  getWebRTCSupportedBrowserList,
} from './Modules/Verto/webrtc/helpers';
import {
  IWebRTCInfo,
  IWebRTCSupportedBrowser,
} from './Modules/Verto/webrtc/interfaces';
import type { SupportedRegion } from './Modules/Verto/util/constants';
import logger from './Modules/Verto/util/logger';

import * as pkg from '../package.json';

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
 *     console.log('notification:', notification);
 *   });
 *
 * // Connect and login
 * client.connect();
 *
 * // You can call client.disconnect() when you're done.
 * // Note: When you call `client.disconnect()` you need to remove all ON event methods you've had attached before.
 *
 * // Disconnecting and Removing listeners.
 * client.disconnect();
 * client.off('telnyx.ready');
 * client.off('telnyx.notification');
 * ```
 *
 * @category Client
 */
export class TelnyxRTC extends TelnyxRTCClient {
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
   *
   * #### To hear/view calls in the browser, you'll need to specify an HTML media element:
   *
   *```js
   * client.remoteElement = 'remoteMedia';
   *```
   *
   * The corresponding HTML:
   *
   *```html
   * <audio id="remoteMedia" autoplay="true" />
   * <!-- or for video: -->
   * <!-- <video id="remoteMedia" autoplay="true" playsinline="true" /> -->
   *```
   */
  constructor(options: IClientOptions) {
    super(options);
    logger.info(`SDK version: ${pkg.version}`);
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
   * 
   * ### Setting Custom Headers
   * 
   * ```js
   * 
   * client.newCall({
   *  destinationNumber: '18004377950',
   * 
   *  callerNumber: '155531234567',
   * 
   *  customHeaders: [ {name: "X-Header", value: "value" } ] 
   * });
   * ```

   * ### Setting Preferred Codec
   *
   * You can pass `preferred_codecs` to the `newCall` method to set codec preference during the call.
   *
   * `preferred_codecs` is a sub-array of the codecs returned by [RTCRtpReceiver.getCapabilities('audio')](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/getCapabilities_static#codecs)
   *
   * ```js
   * const allCodecs = RTCRtpReceiver.getCapabilities('audio').codecs;
   *
   * const PCMACodec = allCodecs.find((c) => c.mimeType.toLowerCase().includes('pcma'));
   *
   * client.newCall({
   *  destinationNumber: 'xxx',
   *  preferred_codecs: [PCMACodec],
   * });
   * ```
   * 
   * ### ICE Candidate Prefetching
   * 
   * ICE candidate prefetching is enabled by default. This pre-gathers ICE candidates when the
   * `RTCPeerConnection` is created, before `setLocalDescription` is called, improving call setup
   * performance and reducing DTLS handshake issues caused by late-arriving candidates.
   * 
   * To disable prefetching, pass `prefetchIceCandidates: false` to the `newCall` method:
   * ```js
   * client.newCall({
   *  destinationNumber: 'xxx',
   *  prefetchIceCandidates: false,
   * });
   * ```
   * 
   * ### Trickle ICE
   * 
   * Trickle ICE can be enabled by passing `trickleIce` to the `newCall` method.
   * example:
   * ```js
   * client.newCall({
   *  destinationNumber: 'xxx',
   *  trickleIce: true,
   * });
   * ```
   * 
   * ### Call Recovery and `recoveredCallId`
   *
   * When a call is recovered after a network reconnection (reattach), the SDK
   * creates a new call object and sets `recoveredCallId` to the ID of the ended call.
   * Use this to correlate the new call with the old one and avoid duplicate UI elements:
   *
   * ```js
   * client.on('telnyx.notification', (notification) => {
   *   if (notification.type === 'callUpdate') {
   *     const call = notification.call;
   *     if (call.recoveredCallId) {
   *       // This call replaced a previous call after recovery.
   *       // Remove the old dialer/UI for call.recoveredCallId
   *       removeDialer(call.recoveredCallId);
   *     }
   *   }
   * });
   * ```
   *
   * ### Voice Isolation
   *
   * Voice isolation options can be set by passing an `audio` object to the `newCall` method. This property controls the settings of a MediaStreamTrack object. For reference on available audio constraints, see [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
   * example:
   * ```js
   * client.newCall({
   *  destinationNumber: 'xxx',
   *  audio: {
   *    echoCancellation: true,
   *    noiseSuppression: true,
   *    autoGainControl: true
   *  },
   * });
   * ```
   */
  newCall(options: ICallOptions) {
    return super.newCall(options);
  }

  /**
   * Switch the signaling connection to a different regional endpoint.
   *
   * This closes the current WebSocket and reconnects to the specified
   * regional `rtc.telnyx.com` subdomain. Useful when anycast DNS routes
   * the initial connection to a suboptimal datacenter, or when the
   * application needs to pin to a specific region for compliance or
   * latency reasons.
   *
   * Active calls are **not** automatically terminated — the caller should
   * hang up active calls before switching if graceful teardown is desired.
   * If active calls exist, a `telnyx.warning` event (code `36008`) is
   * emitted but the switch proceeds.
   *
   * @param region - One of: `'us-east'`, `'us-central'`, `'us-west'`,
   *   `'ca-central'`, `'eu'`, `'apac'`.
   *   Pass `null` to revert to the default anycast endpoint.
   *
   * @throws {Error} if `region` is not a supported region.
   *
   * @examples
   *
   * Pin the connection to Europe after initial connect:
   *
   * ```js
   * const client = new TelnyxRTC({ login_token });
   * client.connect();
   *
   * client.on('telnyx.ready', () => {
   *   // Once connected, switch to EU region
   *   client.switchRegion('eu');
   * });
   * ```
   *
   * Revert to default anycast routing:
   *
   * ```js
   * client.switchRegion(null);
   * ```
   *
   * Available regions and their datacenters:
   *
   * | Region        | Endpoint                  | Datacenters                    |
   * |--------------|---------------------------|--------------------------------|
   * | `us-east`    | `us-east.rtc.telnyx.com`  | AT1 (Atlanta), NJ1 (New Jersey)|
   * | `us-central` | `us-central.rtc.telnyx.com`| CH1 (Chicago)               |
   * | `us-west`    | `us-west.rtc.telnyx.com`  | LV1 (Las Vegas)                |
   * | `ca-central` | `ca-central.rtc.telnyx.com`| MT1 (Montreal), TR1 (Toronto) |
   * | `eu`         | `eu.rtc.telnyx.com`       | AMS3, FR5, LD6                 |
   * | `apac`       | `apac.rtc.telnyx.com`     | CN1 (Chennai), SY1 (Sydney)   |
   */
  switchRegion(region: SupportedRegion | null): void {
    super.switchRegion(region);
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
   * An error message will be returned if your browser doesn't support TelnyxRTC
   *
   * ```js
   * const info = TelnyxRTC.webRTCInfo();
   * if (!info.supportWebRTC) {
   *   console.error(info) // => 'This browser does not support @telnyx/webrtc. To see browser support list: `TelnyxRTC.webRTCSupportedBrowserList()'
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
   * We support the most recent (N) versions of these browsers unless otherwise indicated.
   *
   * |         | Chrome | Firefox | Safari | Edge |
   * |---------|--------|---------|--------|------|
   * | Android |  [-]   |   [-]   |  [ ]   | [ ]  |
   * | iOS     |  [ ]   |   [ ]   |  [x]   | [ ]  |
   * | Linux   |  [x]   |   [-]   |  [ ]   | [ ]  |
   * | MacOS   |  [x]   |   [-]   |  [x]   | [-]  |
   * | Windows |  [x]   |   [-]   |  [ ]   | [-]  |
   *
   * #### Legend
   * [x] supports audio and video
   * [-] supports only audio
   * [ ] not supported
   *
   * @return An array with supported operational systems and browsers.
   *
   * @examples
   *
   * ```js
   * const browserList = TelnyxRTC.webRTCSupportedBrowserList();
   * console.log(browserList) // => [{"operationSystem": "Android", "supported": [{"browserName": "Chrome", "features": ["video", "audio"], "supported": "full"},{...}]
   * ```
   */
  public static webRTCSupportedBrowserList(): Array<IWebRTCSupportedBrowser> {
    return getWebRTCSupportedBrowserList();
  }
}
export default TelnyxRTC;
