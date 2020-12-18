import { IWebRTCCall } from '../webrtc/interfaces';

type Environment = 'production' | 'development';
export interface ITelnyxRTCOptions {
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

export interface IVertoCall {
  id: string;
  tag?: string;
  nodeId: string;
  state: string;
  prevState: string;
  context: string;
  // peer: Call
  type: string;
  to: string;
  from: string;
  timeout: number;
  active: boolean;
  failed: boolean;
  answered: boolean;
  ended: boolean;
  busy: boolean;
  on: Function;
  off: Function;
  dial: Function;
  hangup: Function;
  record: Function;
  recordAsync: Function;
  answer: Function;
  connect: Function;
  connectAsync: Function;
  play: Function;
  playAsync: Function;
  playAudio: Function;
  playAudioAsync: Function;
  playSilence: Function;
  playSilenceAsync: Function;
  playTTS: Function;
  playTTSAsync: Function;
  prompt: Function;
  promptAsync: Function;
  promptAudio: Function;
  promptAudioAsync: Function;
  promptTTS: Function;
  promptTTSAsync: Function;
  waitFor: Function;
  waitForRinging: Function;
  waitForAnswered: Function;
  waitForEnding: Function;
  waitForEnded: Function;
  faxReceive: Function;
  faxReceiveAsync: Function;
  faxSend: Function;
  faxSendAsync: Function;
  detect: Function;
  detectAsync: Function;
  detectAnsweringMachine: Function;
  detectAnsweringMachineAsync: Function;
  detectHuman?: Function;
  detectHumanAsync?: Function;
  detectMachine?: Function;
  detectMachineAsync?: Function;
  detectFax: Function;
  detectFaxAsync: Function;
  detectDigit: Function;
  detectDigitAsync: Function;
  tap: Function;
  tapAsync: Function;
  sendDigits: Function;
  sendDigitsAsync: Function;
}

export interface IVertoCallDevice {
  type: string;
  params: {
    from_number: string;
    to_number: string;
    timeout: number;
  };
}

export interface IVertoCallPeer {
  call_id: string;
  node_id: string;
  device?: IVertoCallDevice;
}

export interface IVertoCallOptions {
  device?: IVertoCallDevice;
  peer?: IVertoCallPeer;
  node_id?: string;
  call_id?: string;
  call_state?: string;
  context?: string;
}

export interface IMakeVertoCallParams {
  type: string;
  from?: string;
  to: string;
  timeout?: number;
}

// export interface Constructable<T> {
//   new(any: any): T
// }

export interface StringTMap<T> {
  [key: string]: T;
}
export interface StringStringMap extends StringTMap<string> {}

export interface ICallingConnectParams {
  devices: DeepArray<IMakeVertoCallParams>;
  ringback?: any;
}

export interface ICallingPlayParams {
  media: any;
  volume?: number;
}

export interface ICallingPlayRingtone {
  name: string;
  duration?: number;
  volume?: number;
}

export interface ICallingPlayTTS {
  text: string;
  language?: string;
  gender?: string;
  volume?: number;
}

export interface ICallingCollect {
  type?: string;
  digits_max?: number;
  digits_terminators?: string;
  digits_timeout?: number;
  end_silence_timeout?: number;
  speech_timeout?: number;
  speech_language?: string;
  speech_hints?: string[];
  volume?: number;
  media?: any;
}

export interface ICallingCollectAudio extends ICallingCollect {
  url?: string;
}

export interface ICallingCollectTTS extends ICallingCollect {
  text?: string; // optional for backward compatibility
  language?: string;
  gender?: string;
}

export interface ICallingCollectRingtone extends ICallingCollect {
  name: string;
  duration?: number;
}

export interface ICallingDetect {
  type?: string;
  timeout?: number;
  wait_for_beep?: boolean;
}
export interface ICallingTapFlat {
  audio_direction?: string;
  target_type: string;
  target_addr?: string;
  target_port?: number;
  target_ptime?: number;
  target_uri?: string;
  rate?: number;
  codec?: string;
}

export interface DeepArray<T> extends Array<T | DeepArray<T>> {}

export interface IMessage {
  id: string;
  state: string;
  context: string;
  from: string;
  to: string;
  direction: string;
  tags: string[];
  body: string;
  media: string[];
  segments: number;
}

export interface IMessageOptions {
  message_id: string;
  message_state: string;
  context: string;
  from_number: string;
  to_number: string;
  direction: string;
  tags: string[];
  body: string;
  media: string[];
  segments: number;
  reason?: string;
}

export interface INotificationEventData {
  type: string;
  call?: IWebRTCCall;
  error?: Error;
  displayName?: string;
  displayNumber?: string;
  displayDirection?: string;
}
