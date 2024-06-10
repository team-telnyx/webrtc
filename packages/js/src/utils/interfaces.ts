import { INotificationEventData } from '../Modules/Verto/util/interfaces';
import { Env, RTCElement } from './types';

export interface ICredentials {
  username?: string;
  password?: string;
  token?: string;
}

export interface ISIPClientOptions {
  // SIP.js client options:
  host?: string;
  port?: number;
  env?: Env;
  project?: string;
  credentials: ICredentials;
  localElement?: RTCElement;
  remoteElement?: RTCElement;
  useMic?: string | boolean;
  useSpeaker?: string | boolean;
  useCamera?: string | boolean;
  displayName?: string;
  ringFile?: string;
}

/**
 * IClientOptions
 * @interface IClientOptions
 */
export interface IClientOptions {
  /**
   * The JSON Web Token (JWT) to authenticate with your SIP Connection.
   * This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).
   */
  login_token?: string;
  /**
   * The `username` to authenticate with your SIP Connection.
   * `login` and `password` will take precedence over
   * `login_token` for authentication.
   */
  login?: string;
  /**
   * The `password` to authenticate with your SIP Connection.
   */
  password?: string;
  /**
   * A URL to a wav/mp3 ringtone file.
   */
  ringtoneFile?: string;
  /**
   * A URL to a wav/mp3 ringback file that will be used when you disable
   * "Generate Ringback Tone" in your SIP Connection.
   */
  ringbackFile?: string;
}

export interface ISIPCallOptions {
  destinationNumber: string;
  remoteCallerName?: string;
  remoteCallerNumber?: string;
  callerName?: string;
  callerNumber?: string;
  id?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  localElement?: HTMLMediaElement | string | Function;
  remoteElement?: HTMLMediaElement | string | Function;
  iceServers?: RTCIceServer[];
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
  useStereo?: boolean;
  micId?: string;
  camId?: string;
  speakerId?: string;
  onNotification?: Function;
  telnyxCallControlId?: string;
  telnyxSessionId?: string;
  telnyxLegId?: string;
  clientState?: string;
}

// TODO Consolidate with `Call`
export interface ICall {
  setAudioInDevice(deviceId: string): Promise<any>;
  setAudioOutDevice(deviceId: string): Promise<any>;
  setVideoDevice(deviceId: string): Promise<any>;
}

/**
 * ICallOptions
 * @interface ICallOptions
 */
export interface ICallOptions {
  /**
   * Phone number or SIP URI to dial.
   */
  destinationNumber: string;
  /**
   * Number to use as the caller ID when dialing out to a destination. A valid phone number is required for dials out to PSTN numbers.
   */
  callerNumber?: string;
  /**
   * Name to use as the caller ID name when dialing out to a destination.
   */
  callerName?: string;
  /**
   * Custom ID to identify the call. This will be used as the `callID` in place of the UUID generated by the client.
   */
  id?: string;
  /**
   * Telnyx Call Control ID, if using Call Control services.
   */
  telnyxCallControlId?: string;
  /**
   * Telnyx call session ID, if using Call Control services.
   */
  telnyxSessionId?: string;
  /**
   * Telnyx call leg ID, if using Call Control services.
   */
  telnyxLegId?: string;
  /**
   *
   * Telnyx's Call Control client_state. Can be used with Connections with Advanced -> Events enabled.
   * `clientState` string should be base64 encoded.
   */
  clientState?: string;
  /**
   * If set, the call will use this stream instead of retrieving a new one.
   */
  localStream?: MediaStream;
  /**
   * If set, the call will use this stream instead of retrieving a new one.
   */
  remoteStream?: MediaStream;
  /**
   * Overrides client's default `localElement`.
   */
  localElement?: HTMLMediaElement | string;
  /**
   * Overrides client's default `remoteElement`.
   */
  remoteElement?: HTMLMediaElement | string;
  /**
   * Overrides client's default `iceServers`.
   */
  iceServers?: RTCIceServer[];
  /**
   * Overrides client's default audio constraints. Defaults to `true`
   */
  audio?: boolean;
  /**
   * Overrides client's default video constraints. Defaults to `false`
   */
  video?: boolean;
  /**
   * Uses stereo audio instead of mono.
   */
  useStereo?: boolean;
  /**
   * `deviceId` to use as microphone. Overrides the client's default one.
   */
  micId?: string;
  /**
   * `deviceId` to use as webcam. Overrides the client's default one.
   */
  camId?: string;
  /**
   * `deviceId` to use as speaker. Overrides the client's default one.
   */
  speakerId?: string;
  /**
   * Overrides client's default `telnyx.notification` handler for this call.
   */
  onNotification?: Function;

  /**
   * Configures media (audio/video) in a call.
   */
  mediaSettings?: {
    useSdpASBandwidthKbps?: boolean;
    sdpASBandwidthKbps?: number;
  };

  /**
   * Add custom headers to the INVITE and ANSWER request.
   */
  customHeaders?: { name: string; value: string }[];

  /**
   * Enable debug mode for this call.
   */
  debug?: boolean;

  /**
   * Output debug logs to a file.
   */
  debugOutput?: 'socket' | 'file';

  /**
   * Preferred codecs for the call.
   */
  preferred_codecs?: RTCRtpCodecCapability[];
}

/**
 *
 * An event dispatched by Telnyx to notify the client of changes to the session or call.
 *
 * The conditions of the event can be identified by the `type` property.
 *
 * | `type` | Description | Additional properties |
 * |---|---|---|
 * | `callUpdate` | A call has changed state | `call` |
 * | `userMediaError` | The browser does not have permission to access media devices | `error` |
 *
 * @examples
 *
 * Usage with TelnyxRTC Client `.on`:
 * ```js
 * client.on('telnyx.notification', (notification) => {
 *   if (notification.type === 'callUpdate') {
 *     console.log(notification.call);
 *
 *     // Do something with the call and update UI accordingly
 *   } else if (notification.type === 'userMediaError') {
 *     console.log(notification.error);
 *
 *     // Handle the error and update UI accordingly
 *   }
 * });
 * ```
 *
 * ### Data structure
 *
 * The notification structure is determined by its `type`.
 *
 * #### `callUpdate`
 *
 * ```js
 * {
 *   type: 'callUpdate',
 *   call: Call // current call
 * }
 * ```
 *
 * #### `userMediaError`
 *
 * ```js
 * {
 *   type: 'userMediaError',
 *   error: Error
 * }
 * ```
 *
 * @category Notification
 * @apialias Notification
 * @internalnote {see NOTIFICATION_TYPE}
 */
export interface INotification extends Omit<INotificationEventData, 'call'> {
  /**
   * Identifies the event case.
   */
  type: string;
  /**
   * The current call. Reference this call state to update your UI.
   * See `Call` documentation.
   */
  call?: ICall;
  /**
   * Error from the `userMediaError` event.
   * Check your `audio` and `video` constraints for browser support.
   */
  error?: Error;
}

export interface MessageEvents {
  ready: () => void;
  registered: () => void;
  unregistered: () => void;
  error: () => void;
  callUpdate: (call: ICall) => void;
  'socket.error': (error: Error) => void;
  'socket.connect': () => void;
  'socket.close': (error?: Error) => void;
}
