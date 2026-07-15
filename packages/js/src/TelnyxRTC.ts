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
import logger from './Modules/Verto/util/logger';
import { PreCallDiagnostic } from './PreCallDiagnostic';
import type {
  PreCallDiagnosticOptions,
  PreCallDiagnosticReport,
} from './PreCallDiagnostic/types';

import * as pkg from '../package.json';

/**
 * Default destination number for `runPreCall()` when the caller omits
 * `destinationNumber`. Mirrors Twilio's `Device.runPreflight(token, options?)`
 * zero-arg shape — callers can run a pre-call diagnostic without knowing
 * a specific test number.
 */
const DEFAULT_PRECALL_DESTINATION = '+1-872-231-5806';

/**
 * Options for the `TelnyxRTC.runPreCall()` public method.
 *
 * Per the VSDK-412 spec, the public surface is intentionally narrow: only
 * the four call-setup fields that a caller legitimately needs to tune are
 * exposed. All three diagnostic modules (ICE, network, microphone)
 * always run inside `runPreCall()` — callers cannot opt out of individual
 * modules from the public API. Module-specific configuration lives on the
 * dedicated `runNetworkCheck()` / `runMicrophoneCheck()` methods instead.
 *
 * `runPreCall` maps these into the internal `PreCallDiagnosticOptions`
 * internally, reusing the client's existing configuration where
 * appropriate (e.g. caller name/number, audio constraints, ICE servers).
 *
 * `destinationNumber` is optional — when omitted, the diagnostic call
 * dials a sensible default (`'+1-872-231-5806'`). This mirrors the
 * zero-arg shape of Twilio's `Device.runPreflight(token, options?)`.
 *
 * Timer semantics: the total budget is `callSetupTimeoutMs + durationMs`.
 * `callSetupTimeoutMs` is the hard upper bound for the call to reach
 * ICE + DTLS + media ready. `durationMs` is the post-establishment
 * sampling window — its timer starts **only** after establishment
 * completes, so call setup time does not eat into the diagnostic
 * sampling budget.
 */
export interface RunPreCallOptions {
  /**
   * The destination number to dial for the diagnostic call.
   * Optional; defaults to `'+1-872-231-5806'` when omitted.
   */
  destinationNumber?: string;
  /**
   * Hard upper bound in ms for the call to reach ICE + DTLS + media ready.
   * On expiry: hangup, return report with `verdict: 'inconclusive'` +
   * `reasons: [{code: 'call_setup_timeout'}]`, omit module sections.
   * Default: ~30000.
   */
  callSetupTimeoutMs?: number;
  /**
   * Post-establishment sampling window in ms. The timer starts **only**
   * after the call reaches the established state. If establishment
   * never completes, this timer is never started. Default: ~5000.
   */
  durationMs?: number;
  /**
   * Custom ICE servers for the diagnostic call only (folded VSDK-308).
   *
   * When provided, these ICE servers are used for the temporary
   * diagnostic call and do not mutate or override the client's
   * configured ICE servers. When omitted, the diagnostic call uses
   * the client's existing ICE server configuration, matching normal
   * call behavior. Takes precedence over the client's ICE servers but
   * not over an explicit `rtcConfig` override.
   */
  iceServers?: RTCIceServer[];
}

/**
 * Options for the `TelnyxRTC.runNetworkCheck()` public method.
 *
 * This is a narrow version of `RunPreCallOptions` that only exposes
 * the ICE/network-relevant fields. Per-call network quality is included in
 * each ICE server result; the microphone module is disabled.
 *
 * The ICE module always runs inside `runNetworkCheck()` — callers cannot
 * opt out of it from the public API (VSDK-412 Gap 3).
 */
export type RunNetworkCheckOptions = Pick<
  RunPreCallOptions,
  'destinationNumber' | 'callSetupTimeoutMs' | 'iceServers'
>;

/**
 * Options for the `TelnyxRTC.runMicrophoneCheck()` public method.
 *
 * This is a narrow version of `RunPreCallOptions` that only exposes
 * the microphone-relevant fields. When `runMicrophoneCheck` is called,
 * the other modules (ICE and network) are disabled.
 *
 * The microphone module always runs inside `runMicrophoneCheck()` —
 * callers cannot opt out of it from the public API (VSDK-412 Gap 3).
 *
 * Recording is opt-in and defaults to `false` so the zero-argument path
 * does not silently record the user without consent. Playback defaults to
 * `true`, but only runs when recording was explicitly enabled and succeeded
 * (VSDK-412 review: "the zero-argument path still records before any
 * warning/consent"). Callers who want the "record and listen" flow must
 * explicitly set `record: true` and should pass `onRecordingConsent`
 * so a pre-recording warning is displayed before capture begins.
 */
export interface RunMicrophoneCheckOptions extends RunPreCallOptions {
  /**
   * Whether to record the microphone audio during the check so the
   * user can listen to it afterwards. Defaults to `false` — the
   * zero-argument path must not silently record without consent.
   * When set to `true`, pass `onRecordingConsent` so a warning is
   * displayed before `MediaRecorder.start()`.
   */
  record?: boolean;

  /**
   * Whether to play back the recorded audio after capture. Only
   * applies when `record: true`. Defaults to `true`.
   */
  playback?: boolean;

  /**
   * Optional consent callback invoked BEFORE recording starts (when
   * `record: true`). The module awaits this callback before calling
   * `MediaRecorder.start()`. It receives the recommended notice text.
   * Rejecting the promise aborts recording
   * (but not the rest of the microphone check). See
   * `MICROPHONE_RECORDING_NOTICE` for the recommended notice string.
   */
  onRecordingConsent?: (notice: string) => void | Promise<void>;
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
   * Runs a pre-call diagnostic using the new `PreCallDiagnostic` framework.
   *
   * This method creates a temporary diagnostic call to probe network, ICE,
   * audio flow, and microphone conditions before placing a real call. The
   * diagnostic call is automatically cleaned up (hung up) on completion
   * unless `autoHangup` is set to `false`.
   *
   * The client's existing ICE servers and audio constraints are reused
   * unless explicitly overridden via `options`.
   *
   * `destinationNumber` is optional — when omitted, the diagnostic call
   * dials a sensible default (`'+1-872-231-5806'`).
   *
   * Timer semantics: the total budget is `callSetupTimeoutMs + durationMs`.
   * `callSetupTimeoutMs` bounds call establishment; `durationMs` is the
   * post-establishment sampling window (starts only after establishment).
   *
   * @param options Options for the pre-call diagnostic. All fields are
   *   optional; `destinationNumber` defaults to `'+1-872-231-5806'`.
   * @returns A promise that resolves with the `PreCallDiagnosticReport`.
   *
   * @examples
   *
   * Zero-arg form — run with all defaults:
   *
   * ```js
   * const report = await client.runPreCall();
   * console.log(report.verdict); // => 'ready' | 'degraded' | 'blocked' | 'inconclusive'
   * ```
   *
   * With an explicit destination:
   *
   * ```js
   * const report = await client.runPreCall({
   *   destinationNumber: '+155****4567',
   * });
   * ```
   *
   * Override duration and setup timeout:
   *
   * ```js
   * const report = await client.runPreCall({
   *   durationMs: 3000,
   *   callSetupTimeoutMs: 20000,
   * });
   * ```
   *
   * Custom ICE servers (diagnostic-only, does not mutate client config):
   *
   * ```js
   * const report = await client.runPreCall({
   *   iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
   * });
   * ```
   */
  async runPreCall(
    options: RunPreCallOptions = {}
  ): Promise<PreCallDiagnosticReport> {
    const diagnosticOptions: PreCallDiagnosticOptions = {
      client: this,
      destinationNumber:
        options.destinationNumber ?? DEFAULT_PRECALL_DESTINATION,
      callSetupTimeoutMs: options.callSetupTimeoutMs,
      durationMs: options.durationMs,
      // All diagnostic modules always run inside runPreCall() (VSDK-412 spec).
      // Module toggles are not part of the public surface for runPreCall.
      ice: true,
      network: true,
      // Enable active microphone capture in full mode so the report
      // includes audio-level data (audioLevel, audioLevelStats, audioDetected)
      // — not just passive permission/device checks. Recording and playback
      // are NOT enabled by default in full mode (no consent flow); callers
      // who want recording should use runMicrophoneCheck() with an explicit
      // opt-in.
      // (VSDK-412 review: "full runPreCall() still does not collect the
      // requested microphone audio-level data" — passing `true` resolved
      // to `activeCapture: false` in resolveMicrophoneOptions().)
      microphone: {
        activeCapture: true,
      },
      mode: 'full',
      // Reuse client's ICE servers unless overridden via iceServers.
      // options.iceServers is diagnostic-only and must not mutate client config.
      rtcConfig: {
        iceServers: options.iceServers ?? this.iceServers,
      },
    };

    const diagnostic = new PreCallDiagnostic(diagnosticOptions);
    return diagnostic.run();
  }

  /**
   * Runs a network/ICE check using the `PreCallDiagnostic` framework.
   *
   * This method tests each configured ICE server URL independently using a
   * real, short diagnostic call. Each call stays active for three seconds and
   * all calls run concurrently to keep the total check duration bounded.
   * TURN URLs force relay policy to verify that the relay is actually usable.
   *
   * Results from every call are combined under `serverTests` so a
   * failed server does not hide successful servers (and vice versa).
   *
   * @param options Options for the network check. All fields are optional.
   * @returns A promise that resolves with the `PreCallDiagnosticReport`.
   *
   * @examples
   *
   * Zero-arg form — run with the client's default ICE servers:
   *
   * ```js
   * const report = await client.runNetworkCheck();
   * console.log(report.serverTests);
   * ```
   *
   * With custom ICE servers:
   *
   * ```js
   * const report = await client.runNetworkCheck({
   *   iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
   * });
   * ```
   */
  async runNetworkCheck(
    options: RunNetworkCheckOptions = {}
  ): Promise<PreCallDiagnosticReport> {
    const diagnosticOptions: PreCallDiagnosticOptions = {
      client: this,
      destinationNumber:
        options.destinationNumber ?? DEFAULT_PRECALL_DESTINATION,
      // ICE and per-server network measurements run for every short call.
      // Callers cannot opt out from the public API.
      ice: true,
      network: true,
      microphone: false,
      // Network-only mode places one fixed three-second call per ICE URL.
      mode: 'network-only',
      // Reuse client's ICE servers unless overridden via iceServers.
      // options.iceServers is diagnostic-only and must not mutate client config.
      rtcConfig: {
        iceServers: options.iceServers ?? this.iceServers,
      },
    };

    const diagnostic = new PreCallDiagnostic(diagnosticOptions);
    return diagnostic.run();
  }

  /**
   * Runs a microphone check using the `PreCallDiagnostic` framework.
   *
   * This method performs an active microphone check: it calls
   * `getUserMedia({ audio: true })` to verify capture works, measures
   * the audio level using Web Audio APIs, enumerates all available
   * audio input devices, and optionally records the audio so the user
   * can listen to it afterwards.
   *
   * This method does **not** dial (`client.newCall()` is not called) —
   * it calls `getUserMedia({ audio: true })` for permission + device
   * check, then runs a Web Audio `AnalyserNode` for level measurement.
   * No SIP signaling or `destinationNumber` is required.
   *
   * @param options Options for the microphone check. All fields are optional.
   * @returns A promise that resolves with the `PreCallDiagnosticReport`.
   *
   * @examples
   *
   * Zero-arg form — run with defaults (active capture enabled):
   *
   * ```js
   * const report = await client.runMicrophoneCheck();
   * console.log(report.microphone?.permissionGranted);
   * console.log(report.microphone?.devices);
   * console.log(report.microphone?.audioLevelStats);
   * ```
   *
   * With recording enabled (user can listen to it afterwards):
   *
   * ```js
   * const report = await client.runMicrophoneCheck({
   *   durationMs: 5000,
   *   record: true,
   *   playback: true,
   *   onRecordingConsent: async (notice) => {
   *     await showConsentDialog(notice);
   *   },
   * });
   * ```
   */
  async runMicrophoneCheck(
    options: RunMicrophoneCheckOptions = {}
  ): Promise<PreCallDiagnosticReport> {
    const diagnosticOptions: PreCallDiagnosticOptions = {
      client: this,
      // Module gating: only microphone enabled, others disabled.
      // Microphone always runs in runMicrophoneCheck() — callers cannot
      // opt out from the public API (VSDK-412 Gap 3).
      ice: false,
      network: false,
      // Active capture enabled by default so the microphone check actually
      // measures audio level and verifies capture works (not just passive
      // permission/device checks). The user gets a real result.
      //
      // Recording is NOT enabled by default. The zero-argument
      // path must not silently record the user without consent/warning
      // (VSDK-412 review: "the zero-argument path still records before any
      // warning/consent"). Callers who want the "record and listen" flow
      // must explicitly opt in via the `record` option on
      // `RunMicrophoneCheckOptions`, AND should pass `onRecordingConsent`
      // so a pre-recording warning is displayed before capture begins.
      // Playback defaults to true so the user can hear their recording
      // when recording is enabled (VSDK-412 review: "Should be true by
      // default!").
      // Map the public `durationMs` (inherited from RunPreCallOptions) to
      // the microphone module's `sampleDurationMs` so the user's chosen
      // sampling window is honored in microphone-only mode. Without this
      // the module always falls back to its hardcoded default (2000ms)
      // regardless of what the caller passes (VSDK-412 round-6 review:
      // "durationMs is ignored in microphone-only mode").
      microphone: {
        activeCapture: true,
        sampleDurationMs: options.durationMs,
        record: options.record ?? false,
        playback: options.playback ?? true,
        // Pass through the pre-recording consent callback so the caller
        // can display a warning/consent dialog BEFORE MediaRecorder.start()
        // (VSDK-412 review P43WG).
        onRecordingConsent: options.onRecordingConsent,
      },
      // microphone-only mode: skip client.newCall() — run getUserMedia +
      // Web Audio level analysis directly without dialing.
      mode: 'microphone-only',
      // ICE servers are irrelevant for microphone-only (no peer connection),
      // but kept for option-shape compatibility. Not mutated on the client.
      rtcConfig: {
        iceServers: options.iceServers ?? this.iceServers,
      },
    };

    const diagnostic = new PreCallDiagnostic(diagnosticOptions);
    return diagnostic.run();
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
