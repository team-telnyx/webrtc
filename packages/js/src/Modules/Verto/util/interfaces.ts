import { IWebRTCCall } from '../webrtc/interfaces';

type Environment = 'production' | 'development';
export interface IVertoOptions {
  host?: string;
  project?: string;
  token?: string;
  login?: string;
  passwd?: string;
  password?: string;
  login_token?: string;
  userVariables?: Object;
  ringtoneFile?: string;
  ringbackFile?: string;
  env?: Environment;
  iceServers?: RTCIceServer[];
  /**
   * autoReconnect: Determine if the SDK has to re-connect automatically when detecting a gateway connection failure. 
   * This is set to`true` as default
   * @type {boolean}
   */
  autoReconnect?: boolean;
}
export interface SubscribeParams {
  channels?: string[];
  protocol?: string;
  handler?: Function;
  nodeId?: string;
}
export interface BroadcastParams {
  channel?: string;
  protocol?: string;
  data?: object;
  nodeId?: string;
}
export interface IAudioSettings extends MediaTrackConstraints {
  micId?: string;
  micLabel?: string;
}
export interface IVideoSettings extends MediaTrackConstraints {
  camId?: string;
  camLabel?: string;
}
export interface INotificationEventData {
  type: string;
  call?: IWebRTCCall;
  error?: Error;
  displayName?: string;
  displayNumber?: string;
  displayDirection?: string;
}
