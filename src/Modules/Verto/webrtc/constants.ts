import { CallOptions } from './interfaces'

export enum PeerType {
  Offer = 'offer',
  Answer = 'answer'
}

export enum Direction {
  Inbound = 'inbound',
  Outbound = 'outbound'
}

export enum VertoMethod {
  Invite = 'telnyx_rtc.invite',
  Attach = 'telnyx_rtc.attach',
  Answer = 'telnyx_rtc.answer',
  Info = 'telnyx_rtc.info',
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
}

export const NOTIFICATION_TYPE = {
  generic: 'event',
  [VertoMethod.Display]: 'participantData',
  [VertoMethod.Attach]: 'participantData',
  conferenceUpdate: 'conferenceUpdate',
  callUpdate: 'callUpdate',
  vertoClientReady: 'vertoClientReady',
  userMediaError: 'userMediaError',
  refreshToken: 'refreshToken',
}

export const DEFAULT_CALL_OPTIONS: CallOptions = {
  destinationNumber: '',
  remoteCallerName: 'Outbound Call',
  remoteCallerNumber: '',
  callerName: '',
  callerNumber: '',
  audio: true,
  video: false,
  useStereo: false,
  attach: false,
  screenShare: false,
  userVariables: {},
}

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
  Purge
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
  AudioOut = 'audiooutput'
}
