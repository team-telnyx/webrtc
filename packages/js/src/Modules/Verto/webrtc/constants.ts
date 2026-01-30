import { IVertoCallOptions } from './interfaces';

export enum PeerType {
  Offer = 'offer',
  Answer = 'answer',
}

export enum Direction {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export enum VertoMethod {
  Invite = 'telnyx_rtc.invite',
  Attach = 'telnyx_rtc.attach',
  Answer = 'telnyx_rtc.answer',
  Info = 'telnyx_rtc.info',
  Candidate = 'telnyx_rtc.candidate',
  EndOfCandidates = 'telnyx_rtc.endOfCandidates',
  Display = 'telnyx_rtc.display',
  Media = 'telnyx_rtc.media',
  Event = 'telnyx_rtc.event',
  Bye = 'telnyx_rtc.bye',
  Punt = 'telnyx_rtc.punt',
  Broadcast = 'telnyx_rtc.broadcast',
  Subscribe = 'telnyx_rtc.subscribe',
  Unsubscribe = 'telnyx_rtc.unsubscribe',
  ClientReady = 'telnyx_rtc.clientReady',
  Modify = 'telnyx_rtc.modify',
  Ringing = 'telnyx_rtc.ringing',
  GatewayState = 'telnyx_rtc.gatewayState',
  Ping = 'telnyx_rtc.ping',
  Pong = 'telnyx_rtc.pong',
}

export const NOTIFICATION_TYPE = {
  generic: 'event',
  [VertoMethod.Display]: 'participantData',
  [VertoMethod.Attach]: 'participantData',
  conferenceUpdate: 'conferenceUpdate',
  callUpdate: 'callUpdate',
  vertoClientReady: 'vertoClientReady',
  userMediaError: 'userMediaError',
  peerConnectionFailureError: 'peerConnectionFailureError',
  signalingStateClosed: 'signalingStateClosed',
  unrecovarablePeerConnectionError: 'unrecovarablePeerConnectionError',
};

export const DEFAULT_CALL_OPTIONS: IVertoCallOptions = {
  destinationNumber: '',
  remoteCallerName: 'Outbound Call',
  remoteCallerNumber: '',
  callerName: '',
  callerNumber: '',
  audio: true,
  useStereo: false,
  debug: false,
  debugOutput: 'socket',
  attach: false,
  screenShare: false,
  userVariables: {},
  mediaSettings: { useSdpASBandwidthKbps: false, sdpASBandwidthKbps: 0 },
  mutedMicOnStart: false,
};

export enum State {
  New,
  Requesting,
  Trying,
  Recovering,
  Ringing,
  Answering,
  Early,
  Active,
  Held,
  Hangup,
  Destroy,
  Purge,
}

export enum Role {
  Participant = 'participant',
  Moderator = 'moderator',
}

export enum ConferenceAction {
  Join = 'join',
  Leave = 'leave',
  Bootstrap = 'bootstrap',
  Add = 'add',
  Modify = 'modify',
  Delete = 'delete',
  Clear = 'clear',
  ChatMessage = 'chatMessage',
  LayerInfo = 'layerInfo',
  LogoInfo = 'logoInfo',
  LayoutInfo = 'layoutInfo',
  LayoutList = 'layoutList',
  ModCmdResponse = 'modCommandResponse',
}

export enum DeviceType {
  Video = 'videoinput',
  AudioIn = 'audioinput',
  AudioOut = 'audiooutput',
}

export enum GatewayStateType {
  REGED = 'REGED',
  UNREGED = 'UNREGED',
  NOREG = 'NOREG',
  FAILED = 'FAILED',
  FAIL_WAIT = 'FAIL_WAIT',
  REGISTER = 'REGISTER',
  TRYING = 'TRYING',
  EXPIRED = 'EXPIRED',
  UNREGISTER = 'UNREGISTER',
}
