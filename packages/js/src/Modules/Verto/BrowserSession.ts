import BaseSession from './BaseSession';
import {
  IAudioSettings,
  BroadcastParams,
  SubscribeParams,
  IVertoOptions,
} from './util/interfaces';
import { registerOnce, trigger } from './services/Handler';
import {
  classifyMediaErrorCode,
  createTelnyxError,
  createTelnyxWarning,
} from './util/errors';
import {
  SwEvent,
  DEFAULT_PROD_ICE_SERVERS,
  DEFAULT_DEV_ICE_SERVERS,
  MULTIPLE_ACTIVE_CALLS_DETECTED,
} from './util/constants';
import { State, DeviceType } from './webrtc/constants';
import {
  getDevices,
  scanResolutions,
  removeUnsupportedConstraints,
  checkDeviceIdConstraints,
  destructSubscribeResponse,
  getUserMedia,
  assureDeviceId,
} from './webrtc/helpers';
import { findElementByType } from './util/helpers';
import logger from './util/logger';
import {
  PeerConnectionPrewarmer,
  PrewarmConfig,
} from './webrtc/PeerConnectionPrewarmer';
import { Unsubscribe, Subscribe, Broadcast } from './messages/Verto';
import { stopStream } from './util/webrtc';
import { IWebRTCCall } from './webrtc/interfaces';
import Call from './webrtc/Call';

export default abstract class BrowserSession extends BaseSession {
  public calls: { [callId: string]: IWebRTCCall } = {};

  /**
   * Call states considered "active" (non-terminal) for the purpose of
   * detecting multiple active calls in the same session.
   * These are the lowercase string names matching `State[State.X]` values
   * as stored on `call.state`.
   * Calls in hangup/destroy/purge are excluded because they are
   * transitioning to cleanup.
   */
  private static readonly ACTIVE_CALL_STATE_NAMES: ReadonlySet<string> =
    new Set([
      'new',
      'requesting',
      'trying',
      'recovering',
      'ringing',
      'answering',
      'early',
      'active',
      'held',
    ]);

  /**
   * Returns an array of calls currently in a non-terminal state.
   * Used by the multi-call detector to decide whether to emit a
   * `MULTIPLE_ACTIVE_CALLS_DETECTED` warning.
   */
  public getActiveCalls(): IWebRTCCall[] {
    return Object.values(this.calls).filter((call) =>
      BrowserSession.ACTIVE_CALL_STATE_NAMES.has(call.state)
    );
  }

  /**
   * Emits a `MULTIPLE_ACTIVE_CALLS_DETECTED` warning through the
   * `telnyx.warning` event when a new call is created or received
   * while other calls are still active in the session.
   *
   * This is diagnostic-only — it does NOT block or reject the new call.
   *
   * @param newCallId - The callId of the newly created/received call
   */
  /**
   * Extract safe (non-PII) correlation identifiers from a call object
   * for inclusion in warning payloads. Returns only Telnyx/SIP IDs
   * that help correlate across call reports, VSP, and b2bua logs.
   * Phone numbers, credentials, SDP, and custom headers are excluded.
   */
  private _extractSafeCallIdentifiers(call: IWebRTCCall): {
    callId: string;
    state: string;
    direction: string;
    telnyxSessionId?: string;
    telnyxLegId?: string;
    sipCallId?: string;
  } {
    const ids: {
      callId: string;
      state: string;
      direction: string;
      telnyxSessionId?: string;
      telnyxLegId?: string;
      sipCallId?: string;
    } = {
      callId: call.id,
      state: call.state,
      direction: call.direction,
    };

    // telnyxSessionId and telnyxLegId are on call.options (IVertoCallOptions)
    if (call.options?.telnyxSessionId) {
      ids.telnyxSessionId = call.options.telnyxSessionId;
    }
    if (call.options?.telnyxLegId) {
      ids.telnyxLegId = call.options.telnyxLegId;
    }

    // sipCallId is a public property on BaseCall but not on IWebRTCCall.
    // Access it safely at runtime — it may be undefined for new calls
    // that haven't received a dialog response yet.
    const sipCallId = (call as unknown as Record<string, unknown>).sipCallId;
    if (typeof sipCallId === 'string' && sipCallId) {
      ids.sipCallId = sipCallId;
    }

    return ids;
  }

  public emitMultipleActiveCallsWarning(newCallId: string): void {
    // Get existing active calls, excluding the new call itself
    // (the new call may or may not be in session.calls yet)
    const existingActiveCalls = this.getActiveCalls().filter(
      (call) => call.id !== newCallId
    );

    // If no existing active calls, nothing to warn about
    if (existingActiveCalls.length === 0) {
      return;
    }

    const warning = createTelnyxWarning(MULTIPLE_ACTIVE_CALLS_DETECTED);

    // Include safe correlation IDs for the new call if it's already in session.calls
    const newCall = this.calls[newCallId];
    const newCallIdentifiers = newCall
      ? this._extractSafeCallIdentifiers(newCall)
      : { callId: newCallId };

    trigger(
      SwEvent.Warning,
      {
        warning,
        callId: newCallId,
        sessionId: this.sessionid,
        newCall: newCallIdentifiers,
        activeCalls: existingActiveCalls.map((call) =>
          this._extractSafeCallIdentifiers(call)
        ),
      },
      this.uuid
    );

    logger.warn(
      `MULTIPLE_ACTIVE_CALLS_DETECTED: new call ${newCallId} created while ${existingActiveCalls.length} other call(s) are active in session ${this.sessionid}`
    );
  }

  public micId: string;

  public micLabel: string;

  public camId: string;

  public camLabel: string;

  public autoRecoverCalls: boolean = true;

  public ringtoneFile?: string;

  public ringbackFile?: string;

  private _iceServers: RTCIceServer[] = [];

  /**
   * Holds one idle peer connection so its ICE candidate pool can gather before a
   * call needs it. Only active when the client opts in via prewarmPeerConnection.
   */
  private _peerConnectionPrewarmer = new PeerConnectionPrewarmer();

  private _localElement: HTMLMediaElement = null;

  /**
   * Original string id supplied via the session-level `localElement` setter
   * (e.g. `client.localElement = 'localMediaId'`), preserved so the
   * active-calls recovery marker can persist it even though the setter
   * resolves the string to an `HTMLMediaElement` immediately. `null` when the
   * caller supplied a DOM element, a Function resolver, or nothing.
   * (VSDK-408: previously the resolved HTML element replaced the string and
   * the marker's `typeof === 'string'` check silently dropped session-level
   * element ids, breaking page-reload recovery for calls that relied on the
   * session-level default.)
   */
  private _localElementId: string | null = null;

  private _remoteElement: HTMLMediaElement = null;

  /**
   * Original string id supplied via the session-level `remoteElement` setter
   * (e.g. `client.remoteElement = 'remoteMediaId'`). Mirrors
   * {@link _localElementId}: preserved for the recovery marker while the
   * resolved element is stored in {@link _remoteElement}.
   */
  private _remoteElementId: string | null = null;

  protected _jwtAuth: boolean = true;

  protected _audioConstraints: boolean | MediaTrackConstraints = true;
  private _previousAudioConstraints: boolean | MediaTrackConstraints = true;

  protected _videoConstraints: boolean | MediaTrackConstraints = false;

  protected _speaker: string = null;

  constructor(options: IVertoOptions) {
    super(options);
    this._videoConstraints = options.video || false;
    this.iceServers = options.iceServers;
    this.ringtoneFile = options.ringtoneFile;
    this.ringbackFile = options.ringbackFile;
  }

  async getIsRegistered(): Promise<boolean> {
    return super.getIsRegistered();
  }

  /**
   * Creates a new connection for exchanging data with the WebRTC server
   *
   * @examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.connect();
   * ```
   */
  async connect(): Promise<void> {
    logger.debug('BrowserSession.connect() called');
    super.connect();
  }

  /**
   * Checks if the browser has the permission to access mic and/or webcam
   *
   * @param audio Whether to check for microphone permissions.
   * @param video Whether to check for webcam permissions.
   *
   * @examples
   *
   * Checking for audio and video permissions:
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.checkPermissions();
   * ```
   *
   * Checking only for audio permissions:
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.checkPermissions(true, false);
   * ```
   *
   * Checking only for video permissions:
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.checkPermissions(false, true);
   * ```
   */
  async checkPermissions(
    audio: boolean = true,
    video: boolean = true
  ): Promise<boolean> {
    try {
      const stream = await getUserMedia({ audio, video });
      stopStream(stream);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Alias for .disconnect()
   * @deprecated
   */
  logout() {
    this.disconnect();
  }

  /**
   * Disconnect all active calls
   *
   * @examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.disconnect();
   * ```
   */
  async disconnect() {
    logger.info(
      '[disconnect] Client-initiated disconnect — setting Purge with BYE on all active calls.'
    );

    for (const key in this.calls) {
      const call = this.calls[key];

      call.setState(State.Purge);
      logger.info('Start hangup for ', call);
      await call.hangup({ initiator: 'app:client.disconnect' }, true);
    }

    this.calls = {};
    this._peerConnectionPrewarmer.dispose();

    await super.disconnect();
  }

  /**
   * Server-initiated disconnect (e.g. PUNT message).
   * Purges all calls locally without sending BYE — server side may already be gone.
   */
  async serverDisconnect() {
    logger.info(
      '[serverDisconnect] Server-initiated disconnect — setting Purge without BYE on all active calls.'
    );

    for (const key in this.calls) {
      const call = this.calls[key];

      call.setState(State.Purge);
      void call.hangup({ initiator: 'sdk:server-disconnect' }, false);
    }

    this.calls = {};
    this._peerConnectionPrewarmer.dispose();

    await super.disconnect();
  }

  socketDisconnect() {
    this._closeConnection();
  }

  /**
   * Handle login error
   * @return void
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleLoginError(error: any) {
    super._handleLoginError(error);
  }

  speedTest(bytes: number) {
    return new Promise((resolve, reject) => {
      registerOnce(
        SwEvent.SpeedTest,
        (speedTestResult) => {
          const { upDur, downDur } = speedTestResult;
          const upKps = upDur ? (bytes * 8) / (upDur / 1000) / 1024 : 0;
          const downKps = downDur ? (bytes * 8) / (downDur / 1000) / 1024 : 0;
          resolve({
            upDur,
            downDur,
            upKps: upKps.toFixed(0),
            downKps: downKps.toFixed(0),
          });
        },
        this.uuid
      );

      bytes = Number(bytes);
      if (!bytes) {
        return reject(`Invalid parameter 'bytes': ${bytes}`);
      }

      this.executeRaw(`#SPU ${bytes}`);
      let loops = bytes / 1024;
      if (bytes % 1024) {
        loops++;
      }
      const dots = '.'.repeat(1024);
      for (let i = 0; i < loops; i++) {
        this.executeRaw(`#SPB ${dots}`);
      }
      this.executeRaw('#SPE');
    });
  }

  /**
   * Returns a list of devices supported by the browser
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * async function() {
   *   const client = new TelnyxRTC(options);
   *   let result = await client.getDevices();
   *   console.log(result);
   * }
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * client.getDevices().then((result) => {
   *   console.log(result);
   * });
   * ```
   */
  getDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices().catch((error) => {
      const telnyxError = createTelnyxError(
        classifyMediaErrorCode(error),
        error
      );
      trigger(SwEvent.MediaError, telnyxError, this.uuid);
      return [];
    });
  }

  /**
   * Returns a list of video devices supported by the browser (i.e. webcam).
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * async function() {
   *   const client = new TelnyxRTC(options);
   *   let result = await client.getVideoDevices();
   *   console.log(result);
   * }
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * client.getVideoDevices().then((result) => {
   *   console.log(result);
   * });
   * ```
   *
   * @returns Promise with an array of MediaDeviceInfo
   * @deprecated
   */
  getVideoDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.Video).catch((error) => {
      trigger(SwEvent.MediaError, error, this.uuid);
      return [];
    });
  }

  /**
   * Returns the audio input devices supported by the browser.
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * async function() {
   *   const client = new TelnyxRTC(options);
   *
   *   let result = await client.getAudioInDevices();
   *
   *   console.log(result);
   * }
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * client.getAudioInDevices().then((result) => {
   *   console.log(result);
   * });
   * ```
   *
   * @returns Promise with an array of MediaDeviceInfo
   */
  getAudioInDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.AudioIn).catch((error) => {
      const telnyxError = createTelnyxError(
        classifyMediaErrorCode(error),
        error
      );
      trigger(SwEvent.MediaError, telnyxError, this.uuid);
      return [];
    });
  }

  /**
   * Returns the audio output devices supported by the browser.
   *
   * Browser Compatibility Note: Firefox has yet to fully implement
   * audio output devices. As of v63, this feature is behind the
   * user preference `media.setsinkid.enabled`.
   * See: https://bugzilla.mozilla.org/show_bug.cgi?id=1152401#c98
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * async function() {
   *   const client = new TelnyxRTC(options);
   *
   *   let result = await client.getAudioOutDevices();
   *
   *   console.log(result);
   * }
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * client.getAudioOutDevices().then((result) => {
   *   console.log(result);
   * });
   * ```
   *
   * @returns Promise with an array of MediaDeviceInfo
   */
  getAudioOutDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.AudioOut).catch((error) => {
      logger.error('getAudioOutDevices', error);
      trigger(SwEvent.MediaError, error, this.uuid);
      return [];
    });
  }

  validateDeviceId(
    id: string,
    label: string,
    kind: MediaDeviceInfo['kind']
  ): Promise<string> {
    return assureDeviceId(id, label, kind);
  }

  /**
   * Returns supported resolution for the given webcam.
   *
   * @param deviceId the `deviceId` from your webcam.
   *
   * @examples
   *
   * If `deviceId` is `null`
   *
   * 1. if `deviceId` is `null` and you don't have a webcam connected to your computer,
   * it will throw an error with the message `"Requested device not found"`.
   *
   * 2. if `deviceId` is `null` and you have one or more webcam connected to your computer,
   * it will return a list of resolutions from the default device set up in your operating system.
   *
   * Using async/await:
   *
   * ```js
   * async function() {
   *   const client = new TelnyxRTC(options);
   *   let result = await client.getDeviceResolutions();
   *   console.log(result);
   * }
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * client.getDeviceResolutions().then((result) => {
   *   console.log(result);
   * });
   * ```
   *
   * If `deviceId` is **not** `null`
   *
   * it will return a list of resolutions from the `deviceId` sent.
   *
   * Using async/await:
   *
   * ```js
   * async function() {
   *   const client = new TelnyxRTC(options);
   *   let result = await client.getDeviceResolutions(deviceId);
   *   console.log(result);
   * }
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * client.getDeviceResolutions(deviceId).then((result) => {
   *   console.log(result);
   * });
   * ```
   * @deprecated
   */
  async getDeviceResolutions(deviceId: string) {
    try {
      return await scanResolutions(deviceId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Audio and video constraints currently used by the client.
   *
   * @examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * console.log(client.mediaConstraints);
   * // => { audio: true, video: false }
   * ```
   *
   * @readonly
   */
  get mediaConstraints(): {
    audio: boolean | MediaTrackConstraints;
    video: boolean | MediaTrackConstraints;
  } {
    return { audio: this._audioConstraints, video: this._videoConstraints };
  }

  /**
   * Sets the default `audio` constraints for your client. [See here](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#Properties_of_audio_tracks) for further details.
   *
   * Note: It's a common behaviour, in WebRTC applications,
   * to persist devices user's selection to then reuse them across visits.
   * Due to a Webkit’s security protocols, Safari generates random `deviceId` on each page load.
   * To avoid this issue you can specify two additional properties
   * `micId` and `micLabel` in the constraints input parameter.
   * The client will use these values to assure the microphone you want to use is available
   * by matching both id and label with the device list retrieved from the browser.
   *
   * @param settings [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `micId` and `micLabel`.
   *
   * @return `Promise<MediaTrackConstraints>` Audio constraints applied to the client.
   *
   * @examples
   *
   * Set microphone by `id` and `label` with the `echoCancellation` flag turned off:
   *
   * ```js
   * // within an async function
   * const constraints = await client.setAudioSettings({
   *  micId: '772e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
   *  micLabel: 'Internal Microphone (Built-in)',
   *  echoCancellation: false
   * })
   * ```
   */
  async setAudioSettings(settings: IAudioSettings) {
    if (!settings) {
      throw new Error('You need to provide the settings object');
    }
    const { micId, micLabel, ...constraints } = settings;

    removeUnsupportedConstraints(constraints);
    this._audioConstraints = await checkDeviceIdConstraints(
      micId,
      micLabel,
      'audioinput',
      constraints
    );
    this.micId = micId;
    this.micLabel = micLabel;
    return this._audioConstraints;
  }

  /**
   * Disables use of the microphone in subsequent calls.
   *
   * Note: This setting will be ignored if `audio: true` is
   * specified when creating a new call.
   *
   * @examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.disableMicrophone();
   * ```
   *
   * Keep in mind that new calls will fail if both the
   * microphone and webcam is disabled. Make sure that the
   * webcam is manually enabled, or `video: true` is
   * specified before disabling the microphone.
   *
   * ```js
   * const client = new TelnyxRTC({
   *   ...options,
   *   video: true
   * });
   *
   * client.disableMicrophone();
   * ```
   */
  disableMicrophone() {
    this._previousAudioConstraints = this._audioConstraints;
    this._audioConstraints = false;
  }

  /**
   * Enables use of the microphone in subsequent calls.
   *
   * Note: This setting will be ignored if `audio: false` is
   * specified when creating a new call.
   *
   * @examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.enableMicrophone();
   * ```
   */
  enableMicrophone() {
    this._audioConstraints = this._previousAudioConstraints || true;
  }

  set iceServers(servers: RTCIceServer[]) {
    if (servers && Array.isArray(servers)) {
      this._iceServers = servers;
    } else {
      const isDev = this.options.env === 'development';
      this._iceServers = isDev
        ? DEFAULT_DEV_ICE_SERVERS
        : DEFAULT_PROD_ICE_SERVERS;
    }
  }

  get iceServers() {
    return this._iceServers;
  }

  /**
   * Build the idle peer connection whose ICE pool a subsequent call can adopt.
   *
   * Called once the client is ready, which is the whole point: the pool needs
   * wall-clock time to gather, and the gap between newCall() and the offer is
   * only about 40ms. Warmed with the session-level ICE configuration, so a call
   * that overrides iceServers or forces relay simply will not match and gathers
   * fresh.
   */
  warmPeerConnection(prefetchIceCandidates = true) {
    if (!this.options.prewarmPeerConnection) return;

    this._peerConnectionPrewarmer.prewarm({
      bundlePolicy: 'balanced',
      iceCandidatePoolSize: prefetchIceCandidates ? 10 : 0,
      iceServers: this.iceServers,
      iceTransportPolicy: this.options.forceRelayCandidate ? 'relay' : 'all',
    });
  }

  /**
   * Hand a call the warmed peer connection when its configuration matches,
   * otherwise null. Ownership transfers to the caller.
   */
  takePrewarmedPeerConnection(
    config: PrewarmConfig
  ): RTCPeerConnection | null {
    if (!this.options.prewarmPeerConnection) return null;
    return this._peerConnectionPrewarmer.take(config);
  }

  /**
   * Sets the default audio output device for subsequent calls.
   *
   * @example
   *
   * ```js
   * let result = await client.getAudioOutDevices();
   *
   * if (result.length) {
   *   client.speaker = result[1].deviceId;
   * }
   * ```
   *
   * @type {(string | null)}
   */
  set speaker(deviceId: string) {
    this._speaker = deviceId;
  }

  /**
   * Default audio output device, if set by client.
   *
   * @example
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * console.log(client.speaker);
   * // => "abc123xyz"
   * ```
   */
  get speaker(): string {
    return this._speaker;
  }

  /**
   * Sets the local html element that will receive the local stream.
   *
   * @example
   *
   * ```js
   * const client = new TelnyxRTC(options);
   * client.localElement = 'localElementMediaId';
   * ```
   *
   * @type {(HTMLMediaElement | string | Function)}
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  set localElement(tag: HTMLMediaElement | string | Function) {
    // Preserve the original string id (VSDK-408) so the active-calls recovery
    // marker can persist it — the setter resolves the string to a DOM element
    // immediately, but the marker needs the id to re-resolve the element after
    // a page reload. DOM elements and Function resolvers have no stable id and
    // are not persisted (VSDK-316).
    this._localElementId = typeof tag === 'string' ? tag : null;
    this._localElement = findElementByType(tag);
  }

  /**
   * Gets the local html element.
   *
   * @example
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * console.log(client.localElement);
   * // => HTMLMediaElement
   * ```
   */
  get localElement() {
    return this._localElement;
  }

  /**
   * The original string id supplied via the session-level `localElement`
   * setter (e.g. `client.localElement = 'localMediaId'`), or `null` when the
   * caller supplied a DOM element, a Function resolver, or nothing. Exposed
   * so the active-calls recovery marker can persist the session-level
   * element id for calls that rely on the session-level default (VSDK-408).
   */
  get localElementId() {
    return this._localElementId;
  }

  /**
   * Sets the remote html element that will receive the remote stream.
   *
   * This is the session-level default: any call that does not specify its own
   * `remoteElement` falls back to this element. Note that the session-level
   * element is shared across calls (last-writer-wins), so for concurrent calls
   * in one client session you should assign a distinct `remoteElement` per call
   * via `client.newCall({ remoteElement })` (outbound) or
   * `call.answer({ remoteElement })` (inbound). See the README "Per-call
   * remoteElement" section.
   *
   * @example
   *
   * ```js
   * const client = new TelnyxRTC(options);
   * client.remoteElement = 'remoteElementMediaId';
   * ```
   *
   * @type {(HTMLMediaElement | string | Function)}
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  set remoteElement(tag: HTMLMediaElement | string | Function) {
    // Preserve the original string id (VSDK-408). See `set localElement` for
    // the rationale — the recovery marker persists the id, not the resolved
    // DOM element, so a page-reload recovery can re-resolve the session-level
    // element by id.
    this._remoteElementId = typeof tag === 'string' ? tag : null;
    this._remoteElement = findElementByType(tag);
  }

  /**
   * Gets the remote html element.
   *
   * @example
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * console.log(client.remoteElement);
   * // => HTMLMediaElement
   * ```
   */
  get remoteElement() {
    return this._remoteElement;
  }

  /**
   * The original string id supplied via the session-level `remoteElement`
   * setter (e.g. `client.remoteElement = 'remoteMediaId'`), or `null` when
   * the caller supplied a DOM element, a Function resolver, or nothing.
   * Mirrors {@link localElementId}: exposed for the recovery marker so a
   * call relying on the session-level default can be restored by id after a
   * page reload (VSDK-408).
   */
  get remoteElementId() {
    return this._remoteElementId;
  }

  vertoBroadcast({
    nodeId,
    channel: eventChannel = '',
    data,
  }: BroadcastParams) {
    if (!eventChannel) {
      throw new Error(`Invalid channel for broadcast: ${eventChannel}`);
    }
    const msg = new Broadcast({ sessid: this.sessionid, eventChannel, data });
    if (nodeId) {
      msg.targetNodeId = nodeId;
    }
    this.execute(msg).catch((error) => error);
  }

  async vertoSubscribe({
    nodeId,
    channels: eventChannel = [],
    handler,
  }: SubscribeParams) {
    eventChannel = eventChannel.filter(
      (channel) =>
        channel && !this._existsSubscription(this.relayProtocol, channel)
    );
    if (!eventChannel.length) {
      return {};
    }
    const msg = new Subscribe({ sessid: this.sessionid, eventChannel });
    if (nodeId) {
      msg.targetNodeId = nodeId;
    }
    const response = await this.execute(msg);
    const { unauthorized = [], subscribed = [] } =
      destructSubscribeResponse(response);
    if (unauthorized.length) {
      unauthorized.forEach((channel) =>
        this._removeSubscription(this.relayProtocol, channel)
      );
    }
    subscribed.forEach((channel) =>
      this._addSubscription(this.relayProtocol, handler, channel)
    );
    return response;
  }

  async vertoUnsubscribe({
    nodeId,
    channels: eventChannel = [],
  }: SubscribeParams) {
    eventChannel = eventChannel.filter(
      (channel) =>
        channel && this._existsSubscription(this.relayProtocol, channel)
    );
    if (!eventChannel.length) {
      return {};
    }
    const msg = new Unsubscribe({ sessid: this.sessionid, eventChannel });
    if (nodeId) {
      msg.targetNodeId = nodeId;
    }
    const response = await this.execute(msg);
    const { unsubscribed = [], notSubscribed = [] } =
      destructSubscribeResponse(response);
    unsubscribed.forEach((channel) =>
      this._removeSubscription(this.relayProtocol, channel)
    );
    notSubscribed.forEach((channel) =>
      this._removeSubscription(this.relayProtocol, channel)
    );
    return response;
  }

  static telnyxStateCall(call: Call) {
    return Call.setStateTelnyx(call);
  }
}
