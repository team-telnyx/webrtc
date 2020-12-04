import logger from './util/logger';
import BaseSession from './BaseSession';
import {
  IAudioSettings,
  IVideoSettings,
  BroadcastParams,
  SubscribeParams,
  ITelnyxRTCOptions,
} from './util/interfaces';
import { registerOnce, trigger } from './services/Handler';
import {
  SwEvent,
  SESSION_ID,
  TURN_SERVER,
  STUN_SERVER,
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
import { Unsubscribe, Subscribe, Broadcast } from './messages/Verto';
import { sessionStorage } from './util/storage';
import { stopStream } from './util/webrtc';
import { IWebRTCCall } from './webrtc/interfaces';
import Call from './webrtc/Call';

export default abstract class BrowserSession extends BaseSession {
  public calls: { [callId: string]: IWebRTCCall } = {};

  public micId: string;

  public micLabel: string;

  public camId: string;

  public camLabel: string;

  public autoRecoverCalls: boolean = true;

  public ringtoneFile?: string;

  public ringbackFile?: string;

  private _iceServers: RTCIceServer[] = [];

  private _localElement: HTMLMediaElement = null;

  private _remoteElement: HTMLMediaElement = null;

  protected _jwtAuth: boolean = true;

  protected _audioConstraints: boolean | MediaTrackConstraints = true;

  protected _videoConstraints: boolean | MediaTrackConstraints = false;

  protected _speaker: string = null;

  constructor(options: ITelnyxRTCOptions) {
    super(options);
    this.iceServers = options.iceServers;
    this.ringtoneFile = options.ringtoneFile;
    this.ringbackFile = options.ringbackFile;
  }

  get reconnectDelay() {
    return 1000;
  }

  /**
   * Creates a new connection for exchanging data with the WebRTC server
   *
   * ## Examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.connect();
   * ```
   */
  async connect(): Promise<void> {
    this.sessionid = await sessionStorage.getItem(SESSION_ID);
    super.connect();
  }

  /**
   * Checks if the browser has the permission to access mic and/or webcam
   *
   * @param audio Whether to check for microphone permissions.
   * @param video Whether to check for webcam permissions.
   *
   * ## Examples
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
   * ## Examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.disconnect();
   * ```
   */
  async disconnect() {
    Object.keys(this.calls).forEach((k) => this.calls[k].setState(State.Purge));
    this.calls = {};

    await super.disconnect();
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
   * ## Examples
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
      trigger(SwEvent.MediaError, error, this.uuid);
      return [];
    });
  }

  /**
   * Return the device list supported by the browser
   */
  getVideoDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.Video).catch((error) => {
      trigger(SwEvent.MediaError, error, this.uuid);
      return [];
    });
  }

  /**
   * Return the audio output devices supported by the browser.
   *
   * ## Examples
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
   */
  getAudioInDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.AudioIn).catch((error) => {
      trigger(SwEvent.MediaError, error, this.uuid);
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
   * ## Examples
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
   */
  getAudioOutDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.AudioOut).catch((error) => {
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
   * ## Examples
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
   * ## Examples
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
    this._audioConstraints = false;
  }

  /**
   * Enables use of the microphone in subsequent calls.
   *
   * Note: This setting will be ignored if `audio: false` is
   * specified when creating a new call.
   *
   * ## Examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.enableMicrophone();
   * ```
   */
  enableMicrophone() {
    this._audioConstraints = true;
  }

  /**
   * Sets the default `video` constraints for your client. [See here](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#Properties_of_video_tracks) for further details.
   *
   * Note: It's a common behaviour, in WebRTC applications,
   * to persist devices user's selection to then reuse them across visits.
   * Due to a Webkit’s security protocols, Safari generates random `deviceId` on each page load.
   * To avoid this issue you can specify two additional properties
   * `camId` and `camLabel` in the constraints input parameter.
   * The client will use these values to assure the webcam you want to use is available
   * by matching both `id` and `label` with the device list retrieved from the browser.
   *
   * @param settings [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `camId` and `camLabel`.
   *
   * @return `Promise<MediaTrackConstraints>` Video constraints applied to the client.
   *
   * @examples
   *
   * Set webcam by `id` and `label` with 720p resolution.
   *
   * ```js
   * // within an async function
   * const constraints = await client.setVideoSettings({
   *  camId: '882e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
   *  camLabel: 'Default WebCam (Built-in)',
   *  width: 1080,
   *  height: 720
   * })
   * ```
   */
  async setVideoSettings(settings: IVideoSettings) {
    if (!settings) {
      throw new Error('You need to provide the settings object');
    }

    const { camId, camLabel, ...constraints } = settings;

    removeUnsupportedConstraints(constraints);
    this._videoConstraints = await checkDeviceIdConstraints(
      camId,
      camLabel,
      'videoinput',
      constraints
    );
    this.camId = camId;
    this.camLabel = camLabel;
    return this._videoConstraints;
  }

  /**
   * Disables use of the webcam in subsequent calls.
   *
   * Note: This method will disable the video even if `video: true` is specified.
   *
   * ## Examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.disableWebcam();
   * ```
   *
   * ```js
   * const client = new TelnyxRTC({
   *   ...options,
   *   video: true
   * });
   *
   * client.disableWebcam();
   * ```
   */
  disableWebcam() {
    this._videoConstraints = false;
  }

  /**
   * Enables use of the webcam in subsequent calls.
   *
   * Note: This setting will be ignored if `video: false` is
   * specified when creating a new call.
   *
   * ## Examples
   *
   * ```js
   * const client = new TelnyxRTC(options);
   *
   * client.enableWebcam();
   * ```
   */
  enableWebcam() {
    this._videoConstraints = true;
  }

  set iceServers(servers: RTCIceServer[] | boolean) {
    if (typeof servers === 'boolean') {
      this._iceServers = servers
        ? [{ urls: ['stun:stun.l.google.com:19302'] }]
        : [];
    } else {
      this._iceServers = servers || [TURN_SERVER, STUN_SERVER];
    }
  }

  get iceServers() {
    return this._iceServers;
  }

  set speaker(deviceId: string) {
    this._speaker = deviceId;
  }

  get speaker() {
    return this._speaker;
  }

  set localElement(tag: HTMLMediaElement | string | Function) {
    this._localElement = findElementByType(tag);
  }

  get localElement() {
    return this._localElement;
  }

  set remoteElement(tag: HTMLMediaElement | string | Function) {
    this._remoteElement = findElementByType(tag);
  }

  get remoteElement() {
    return this._remoteElement;
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
    const { unauthorized = [], subscribed = [] } = destructSubscribeResponse(
      response
    );
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
    const { unsubscribed = [], notSubscribed = [] } = destructSubscribeResponse(
      response
    );
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
