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

export interface ICall {
  state: CallState;
  isHeld?: Boolean;
  isMuted?: Boolean;
  hangup(): void;
  answer(): void;
  hold(): void;
  unhold(): void;
  mute(): void;
  unmute(): void;
  dtmf(input: string): void;
  transfer(input: string): void;
  setAudioOutDevice(sinkId: string, callback?: Function): Promise<undefined>;
  // setAudioInDevce();
  // setVideoDevice();
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
