import { INotificationEventData } from '../Modules/Verto/util/interfaces';
import { Env, RTCElement } from './types';

export interface ICredentials {
  username?: string;
  password?: string;
  token?: string;
}

export interface IClientOptions {
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

// TODO Consolidate with `CallOptions`
export interface ICallOptions {
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
}

// TODO Consolidate with `Call`
export interface ICall {
  setAudioInDevice(deviceId: string): Promise<any>;
  setAudioOutDevice(deviceId: string): Promise<any>;
  setVideoDevice(deviceId: string): Promise<any>;
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
 * | `participantData` | Call participant data has changed | `call`, `displayDirection`, `displayName`, `displayNumber` |
 * | `userMediaError` | The browser does not have permission to access media devices | `error` |
 *
 * @examples
 *
 * Usage with {@link TelnyxRTC.on}:
 * ```js
 * client.on('telnyx.notification', (notification) => {
 *   if (notification.type === 'callUpdate') {
 *     console.log(notification.call);
 *
 *     // Do something with the call and update UI accordingly
 *   } else if (notification.type === 'participantData') {
 *     console.log(notification.displayName, notification.displayNumber);
 *
 *     // Update UI with new display name and/or number
 *   } else if (notification.type === 'participantData') {
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
 * #### `participantData`
 *
 * ```js
 * {
 *   type: 'participantData',
 *   call: Call,
 *   displayName: 'Ada Lovelace',
 *   displayNumber: '15551234567',
 *   displayDirection: 'inbound'
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
 * @apidoc Include in API docs
 * @internalnote {@see NOTIFICATION_TYPE}
 */
export interface INotification extends Omit<INotificationEventData, 'call'> {
  /**
   * Identifies the event case.
   */
  type: string;
  /**
   * The current call. Reference this call state to update your UI.
   */
  call?: ICall;
  /**
   * Error from the `userMediaError` event.
   * Check your `audio` and `video` constraints for browser support.
   */
  error?: Error;
  /**
   * Participant's display name.
   */
  displayName?: string;
  /**
   * Participant's display phone number or SIP address.
   */
  displayNumber?: string;
  /**
   * Participant's call direction.
   */
  displayDirection?: 'inbound' | 'outbound';
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
