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

// TODO Consolidate with `IBaseCall`
export interface IBaseCall {
  direction?: any;
  id?: any;
  prevState?: any;
  state?: any;
  localStream?: any;
  remoteStream?: any;
  answer(): void;
  deaf(): void;
  dtmf(input: string): void;
  hangup(): void;
  hold(): Promise<any>;
  muteAudio(): void;
  muteVideo(): void;
  toggleAudioMute(): void;
  toggleDeaf(): void;
  toggleHold(): Promise<any>;
  toggleVideoMute(): void;
  undeaf(): void;
  unhold(): Promise<any>;
  unmuteAudio(): void;
  unmuteVideo(): void;
}

// TODO Consolidate with `Call`
export interface ICall {
  setAudioInDevice(deviceId: string): Promise<any>;
  setAudioOutDevice(deviceId: string): Promise<any>;
  setVideoDevice(deviceId: string): Promise<any>;
}

export interface INotification extends Omit<INotificationEventData, 'call'> {
  call?: ICall;
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
