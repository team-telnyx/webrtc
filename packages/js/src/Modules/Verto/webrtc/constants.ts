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
};

export const ERROR_TYPE = {
  invalidCredentialsOptions: 'InvalidCredentialsOptions',
};

/**
 * Default interval (ms) between intermediate call-recording flushes.
 * The recorder POSTs buffered RTP packets to /call_recording on this cadence
 * so long calls do not buffer unbounded packet data in memory. A final flush
 * at end of call submits the tail.
 * @default 240000 (4 minutes)
 */
export const DEFAULT_CALL_RECORDING_FLUSH_INTERVAL_MS = 240_000;

/**
 * Default hard cap (bytes) on the in-memory call-recording packet buffer.
 * On overflow the recorder drops the oldest packets and emits a
 * RECORDING_BUFFER_OVERFLOW warning (once per flush window).
 * @default 8_000_000 (8 MB)
 */
export const DEFAULT_CALL_RECORDING_MAX_BUFFER_BYTES = 8_000_000;

/**
 * Default sample rate (Hz) advertised in the recording envelope. The
 * captured Float32 PCM frames already carry the track's actual sample rate;
 * this is the value reported to voice-sdk-debug so it can interpret the
 * payload. 48 kHz is the typical WebRTC audio track rate.
 * @default 48000
 */
export const DEFAULT_CALL_RECORDING_SAMPLE_RATE = 48000;

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
  prefetchIceCandidates: true,
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
  TIMEOUT = 'TIMEOUT',
  REGISTER = 'REGISTER',
  TRYING = 'TRYING',
  EXPIRED = 'EXPIRED',
  UNREGISTER = 'UNREGISTER',
}

/**
 * Action strings used in Verto Modify messages.
 * @see https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/Verto.ts
 */
export enum VertoModifyAction {
  Hold = 'hold',
  Unhold = 'unhold',
  ToggleHold = 'toggleHold',
  UpdateMedia = 'updateMedia',
}
