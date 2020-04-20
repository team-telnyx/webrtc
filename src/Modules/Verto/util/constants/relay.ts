export enum CallState {
  None = 'none',
  Created = 'created',
  Ringing = 'ringing',
  Answered = 'answered',
  Ending = 'ending',
  Ended = 'ended'
}

export const CALL_STATES: string[] = Object.values(CallState)

export const DEFAULT_CALL_TIMEOUT = 30

export enum DisconnectReason {
  Hangup = 'hangup',
  Cancel = 'cancel',
  Busy = 'busy',
  NoAnswer = 'noAnswer',
  Decline = 'decline',
  Error = 'error'
}

export enum DisconnectSource {
  None = 'none',
  Client = 'client',
  Server = 'server',
  Endpoint = 'endpoint'
}

export enum CallType {
  Phone = 'phone',
  Sip = 'sip',
  WebRTC = 'webrtc'
}

export enum CallConnectState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Failed = 'failed',
}

export enum CallNotification {
  State = 'calling.call.state',
  Receive = 'calling.call.receive',
  Connect = 'calling.call.connect',
  Record = 'calling.call.record',
  Play = 'calling.call.play',
  Collect = 'calling.call.collect',
  Fax = 'calling.call.fax',
  Detect = 'calling.call.detect',
  Tap = 'calling.call.tap',
  SendDigits = 'calling.call.send_digits',
}

export enum CallMethod {
  Answer = 'calling.answer',
  Begin = 'calling.begin',
  Connect = 'calling.connect',
  Disconnect = 'calling.disconnect',
  End = 'calling.end',
  Record = 'calling.record',
  Play = 'calling.play',
  PlayAndCollect = 'calling.play_and_collect',
  ReceiveFax = 'calling.receive_fax',
  SendFax = 'calling.send_fax',
  Detect = 'calling.detect',
  Tap = 'calling.tap',
  SendDigits = 'calling.send_digits',
}

export enum SendDigitsState {
  Finished = 'finished',
}

export enum CallPlayState {
  Playing = 'playing',
  Error = 'error',
  Finished = 'finished',
}

export enum CallPlayType {
  Audio = 'audio',
  Silence = 'silence',
  TTS = 'tts',
  Ringtone = 'ringtone',
}

export enum CallTapState {
  Tapping = 'tapping',
  Finished = 'finished',
}

export enum CallFaxState {
  Page = 'page',
  Error = 'error',
  Finished = 'finished',
}

export enum CallPromptState {
  Error = 'error',
  NoInput = 'no_input',
  NoMatch = 'no_match',
  Digit = 'digit',
  Speech = 'speech',
}

export enum CallRecordState {
  Recording = 'recording',
  NoInput = 'no_input',
  Finished = 'finished',
}

export enum CallDetectState {
  Error = 'error',
  Finished = 'finished',
  CED = 'CED',
  CNG = 'CNG',
  Machine = 'MACHINE',
  Human = 'HUMAN',
  Unknown = 'UNKNOWN',
  Ready = 'READY',
  NotReady = 'NOT_READY',
}

export enum CallDetectType {
  Fax = 'fax',
  Machine = 'machine',
  Digit = 'digit',
}

export enum MessageNotification {
  State = 'messaging.state',
  Receive = 'messaging.receive',
}
