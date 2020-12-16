import { Env, RTCElement, CallState } from './types';

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

export interface ICallOptions {
  destination: string;
  // optional
  remoteCallerName?: string;
  remoteCallerNumber?: string;
  callerName?: string;
  callerNumber?: string;
  id?: string;
  remoteSdp?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  localElement?: HTMLMediaElement | string | Function;
  remoteElement?: HTMLMediaElement | string | Function;
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
  attach?: boolean;
  useStereo?: boolean;
  // micId?: string;
  // micLabel?: string;
  // camId?: string;
  // camLabel?: string;
  // speakerId?: string;
  userVariables?: Object;
  screenShare?: boolean;
  // onNotification?: Function
}

/**
 * {@see Call}
 *
 * @deprecated
 * @ignore
 */
export interface ICall {
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
  setAudioInDevice(deviceId: string): Promise<any>;
  setAudioOutDevice(deviceId: string): Promise<any>;
  setVideoDevice(deviceId: string): Promise<any>;
  toggleAudioMute(): void;
  toggleDeaf(): void;
  toggleHold(): Promise<any>;
  toggleVideoMute(): void;
  undeaf(): void;
  unhold(): Promise<any>;
  unmuteAudio(): void;
  unmuteVideo(): void;
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
