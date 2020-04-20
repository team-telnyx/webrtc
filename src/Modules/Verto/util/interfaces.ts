interface IMessageBase { jsonrpc: string, id: string }

type TBladeVersion = { major: number, minor: number, revision: number }

export interface ISubscription { channel: string, protocol: string, subscribers: string[] }

export interface IBladeResultError extends IMessageBase { error: { code: number, message: string } }

export interface IBladeConnectRequest extends IMessageBase {
  method: string
  params: {
    version: TBladeVersion
    authentication: { project: string, token?: string, jwt_token?: string }
    sessionid?: string
    agent?: string
  }
}

export interface IBladeConnectResult extends IMessageBase {
  sessionid: string
  nodeid: string
  master_nodeid: string
  protocols_uncertified: string[]
  authorization: {
    expires_at: number
    signature: string
  }
}

export interface IBladeExecuteRequest extends IMessageBase {
  method: string
  params: {
    protocol: string
    method: string
    params: any
  }
}

export interface IBladeExecuteResult extends IMessageBase {
  result: {
    requester_nodeid: string
    responder_nodeid: string
    protocol: string
    result: any
  }
}

export interface IBladeSubscriptionRequest extends IMessageBase {
  method: string
  params: {
    command: string
    protocol: string
    channels: string[]
    auto_create?: boolean
    downstream?: boolean
  }
}

export interface ISignalWireOptions {
  host?: string,
  project?: string
  token?: string
  login?: string
  passwd?: string
  password?: string
  userVariables?: Object
}

export interface SubscribeParams {
  channels?: string[]
  protocol?: string
  handler?: Function
  nodeId?: string
}

export interface BroadcastParams {
  channel?: string
  protocol?: string
  data?: object
  nodeId?: string
}

export interface ICacheDevices {
  videoinput?: { [deviceId: string]: MediaDeviceInfo }
  audioinput?: { [deviceId: string]: MediaDeviceInfo }
  audiooutput?: { [deviceId: string]: MediaDeviceInfo }
}

export interface IAudioSettings extends MediaTrackConstraints {
  micId?: string
  micLabel?: string
}

export interface IVideoSettings extends MediaTrackConstraints {
  camId?: string
  camLabel?: string
}

export interface ICall {
  id: string
  tag?: string
  nodeId: string
  state: string
  prevState: string
  context: string
  // peer: Call
  type: string
  to: string
  from: string
  timeout: number
  active: boolean
  failed: boolean
  answered: boolean
  ended: boolean
  busy: boolean
  on: Function
  off: Function
  dial: Function
  hangup: Function
  record: Function
  recordAsync: Function
  answer: Function
  connect: Function
  connectAsync: Function
  play: Function
  playAsync: Function
  playAudio: Function
  playAudioAsync: Function
  playSilence: Function
  playSilenceAsync: Function
  playTTS: Function
  playTTSAsync: Function
  prompt: Function
  promptAsync: Function
  promptAudio: Function
  promptAudioAsync: Function
  promptTTS: Function
  promptTTSAsync: Function
  waitFor: Function
  waitForRinging: Function
  waitForAnswered: Function
  waitForEnding: Function
  waitForEnded: Function
  faxReceive: Function
  faxReceiveAsync: Function
  faxSend: Function
  faxSendAsync: Function
  detect: Function
  detectAsync: Function
  detectAnsweringMachine: Function
  detectAnsweringMachineAsync: Function
  detectHuman?: Function
  detectHumanAsync?: Function
  detectMachine?: Function
  detectMachineAsync?: Function
  detectFax: Function
  detectFaxAsync: Function
  detectDigit: Function
  detectDigitAsync: Function
  tap: Function
  tapAsync: Function
  sendDigits: Function
  sendDigitsAsync: Function
}

export interface ICallDevice {
  type: string
  params: {
    from_number: string
    to_number: string
    timeout: number
  }
}

export interface ICallPeer {
  call_id: string
  node_id: string
  device?: ICallDevice
}

export interface ICallOptions {
  device?: ICallDevice
  peer?: ICallPeer
  node_id?: string
  call_id?: string
  call_state?: string
  context?: string
}

export interface IMakeCallParams {
  type: string
  from?: string
  to: string
  timeout?: number
}

// export interface Constructable<T> {
//   new(any: any): T
// }

export interface StringTMap<T> { [key: string]: T }
export interface StringStringMap extends StringTMap<string> { }

interface IRelayCallingRecordAudio {
  beep?: boolean
  format?: string
  stereo?: boolean
  direction?: string
  initial_timeout?: number
  end_silence_timeout?: number
  terminators?: string
}

export interface IRelayCallingRecord {
  audio: IRelayCallingRecordAudio
}

export interface ICallingRecord extends IRelayCallingRecordAudio {
  audio?: IRelayCallingRecordAudio // backwards compatibility
  type?: 'audio'
}

export interface ICallingConnectParams {
  devices: DeepArray<IMakeCallParams>
  ringback?: ICallingPlay
}

interface IRelayCallingPlayParams {
  url?: string
  text?: string
  language?: string
  gender?: string
  duration?: number
  name?: string
}

export interface IRelayCallingPlay {
  type: string
  params: IRelayCallingPlayParams
}

export interface ICallingPlay extends IRelayCallingPlayParams {
  type: string
}

export interface ICallingPlayParams {
  media: (IRelayCallingPlay | ICallingPlay)[]
  volume?: number
}

export interface ICallingPlayRingtone {
  name: string
  duration?: number
  volume?: number
}

export interface ICallingPlayTTS {
  text: string
  language?: string
  gender?: string
  volume?: number
}

export interface IRelayCallingCollect {
  initial_timeout?: number
  digits?: {
    max: number
    terminators?: string
    digit_timeout?: number
  },
  speech?: {
    end_silence_timeout?: number
    speech_timeout?: number
    language?: string
    hints?: string[]
  }
  partial_results?: boolean
}

export interface ICallingCollect extends IRelayCallingCollect {
  type?: string
  digits_max?: number
  digits_terminators?: string
  digits_timeout?: number
  end_silence_timeout?: number
  speech_timeout?: number
  speech_language?: string
  speech_hints?: string[]
  volume?: number
  media?: (IRelayCallingPlay | ICallingPlay)[]
}

export interface ICallingCollectAudio extends ICallingCollect {
  url?: string
}

export interface ICallingCollectTTS extends ICallingCollect {
  text?: string // optional for backward compatibility
  language?: string
  gender?: string
}

export interface ICallingCollectRingtone extends ICallingCollect {
  name: string
  duration?: number
}

interface IRelayCallingDetectParams {
  initial_timeout?: number
  end_silence_timeout?: number
  machine_voice_threshold?: number
  machine_words_threshold?: number
  tone?: string
  digits?: string
}

export interface IRelayCallingDetect {
  type: string
  params: IRelayCallingDetectParams
}

export interface ICallingDetect extends IRelayCallingDetectParams {
  type?: string
  timeout?: number
  wait_for_beep?: boolean
}

interface IRelayCallingTapTapParams {
  direction?: string
}

export interface IRelayCallingTapTap {
  type: 'audio'
  params: IRelayCallingTapTapParams
}

export interface ICallingTapTap extends IRelayCallingTapTapParams {
  type: IRelayCallingTapTap['type']
}

interface IRelayCallingTapDeviceParams {
  addr?: string
  port?: number
  codec?: string
  ptime?: number
  uri?: string
  rate?: number
}

export interface IRelayCallingTapDevice {
  type: string
  params: IRelayCallingTapDeviceParams
}

export interface ICallingTapDevice extends IRelayCallingTapDeviceParams {
  type?: string
}

export interface ICallingTapFlat {
  audio_direction?: string
  target_type: string
  target_addr?: string
  target_port?: number
  target_ptime?: number
  target_uri?: string
  rate?: number
  codec?: string
}

export interface DeepArray<T> extends Array<T | DeepArray<T>> { }

export interface IRelayConsumerParams {
  host?: string
  project: string
  token: string
  contexts?: string[]
  onIncomingCall?: Function
  onIncomingMessage?: Function
  onMessageStateChange?: Function
  onTask?: Function
  setup?: Function
  ready?: Function
  teardown?: Function
}

export interface IMessage {
  id: string
  state: string
  context: string
  from: string
  to: string
  direction: string
  tags: string[]
  body: string
  media: string[]
  segments: number
}


export interface IMessageOptions {
  message_id: string
  message_state: string
  context: string
  from_number: string
  to_number: string
  direction: string
  tags: string[]
  body: string
  media: string[]
  segments: number
  reason?: string
}
