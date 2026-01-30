import { State } from './constants';

export interface IMediaSettings {
  useSdpASBandwidthKbps?: boolean;
  sdpASBandwidthKbps?: number;
}

/**
 * Parameters for the hangup method.
 * @internal
 */
export interface IHangupParams {
  /** Custom hangup cause string (e.g., 'NORMAL_CLEARING', 'PURGE', 'USER_BUSY') */
  cause?: string;
  /** Custom hangup cause code */
  causeCode?: number;
  /** SIP response code */
  sipCode?: number;
  /** SIP reason phrase */
  sipReason?: string;
  /** SIP Call-ID header value */
  sip_call_id?: string;
  /** Dialog parameters including custom headers */
  dialogParams?: {
    customHeaders?: Array<{ name: string; value: string }>;
  };
  /** When true, sets call to Recovering state for reconnection flow */
  isRecovering?: boolean;
}

export interface IVertoCallOptions {
  // Optional
  destinationNumber?: string;
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
  iceServers?: RTCIceServer[];
  audio?: boolean | MediaTrackConstraints;
  // So far video is only for internal use. Use only for debugging purposes.
  video?: boolean | MediaTrackConstraints;
  attach?: boolean;
  useStereo?: boolean;
  micId?: string;
  micLabel?: string;
  camId?: string;
  camLabel?: string;
  speakerId?: string;
  userVariables?: { [key: string]: any };
  screenShare?: boolean;
  onNotification?: Function;
  googleMaxBitrate?: number;
  googleMinBitrate?: number;
  googleStartBitrate?: number;
  ringtoneFile?: string;
  ringbackFile?: string;
  // Optional, sent by Telnyx RTC
  telnyxCallControlId?: string;
  telnyxSessionId?: string;
  telnyxLegId?: string;
  clientState?: string;
  skipNotifications?: boolean;
  negotiateAudio?: boolean;
  negotiateVideo?: boolean;
  mediaSettings?: IMediaSettings;
  customHeaders?: Array<{ name: string; value: string }>;
  debug?: boolean;
  debugOutput?: 'socket' | 'file';
  preferred_codecs?: RTCRtpCodecCapability[];
  prefetchIceCandidates?: boolean;
  forceRelayCandidate?: boolean;
  trickleIce?: boolean;
  keepConnectionAliveOnSocketClose?: boolean;
  mutedMicOnStart?: boolean;
}

export interface IStatsBinding {
  constraints: any;
  callback: Function;
}

export interface AnswerParams {
  /**
   *  *
   * ### Setting Custom Headers
   *
   * ```js
   *
   * client.newCall({
   *  destinationNumber: '18004377950',
   *
   *  callerNumber: '155531234567',
   *
   *  customHeaders: [ {name: "X-Header", value: "value" } ]
   * });
   * ```
   */
  customHeaders?: Array<{ name: string; value: string }>;

  /**
   * ### Setting Media Constraints
   */
  video?: boolean;
}

export interface IWebRTCCall {
  id: string;
  state: string;
  prevState: string;
  direction: string;
  peer?: {
    instance?: RTCPeerConnection | null;
    restartedIceOnConnectionStateFailed?: boolean;
    restartStatsReporter?: () => Promise<void>;
    isConnectionHealty?: () => boolean;
    close?: () => Promise<void>;
  } | null;
  options: IVertoCallOptions;
  cause: string;
  causeCode: number;
  channels: string[];
  role: string;
  extension: string;
  localStream: MediaStream;
  remoteStream: MediaStream;
  isAudioMuted: boolean;
  creatingPeer: boolean;
  signalingStateClosed: boolean;
  invite: () => void;
  answer: (params: AnswerParams) => void;
  hangup: (params: IHangupParams, execute: boolean) => void;

  hold: () => void;
  unhold: () => void;
  toggleHold: () => void;
  dtmf: (dtmf: string) => void;
  message: (to: string, body: string) => void;
  muteAudio: () => void;
  unmuteAudio: () => void;
  toggleAudioMute: () => void;
  setAudioInDevice: (deviceId: string, muted?: boolean) => Promise<void>;
  muteVideo: () => void;
  unmuteVideo: () => void;
  toggleVideoMute: () => void;
  setVideoDevice: (deviceId: string) => Promise<void>;
  deaf: () => void;
  undeaf: () => void;
  toggleDeaf: () => void;
  setAudioBandwidthEncodingsMaxBps: (max: number) => void;
  setVideoBandwidthEncodingsMaxBps: (max: number) => void;
  getStats: (callback: Function, constraints: any) => void;
  setState: (state: State) => void;
  // Privates
  handleMessage: (msg: any) => void;
  _addChannel: (laChannel: any) => void;
  handleConferenceUpdate: (packet: any, pvtData: any) => Promise<string>;
  // WEB
  startScreenShare?: (opts?: object) => Promise<IWebRTCCall>;
  stopScreenShare?: () => void;
  setAudioOutDevice?: (deviceId: string) => Promise<boolean>;
  // RN
  setSpeakerPhone?: (flag: boolean) => void;
}
export interface IWebRTCInfo {
  browserInfo: any;
  browserName: string;
  browserVersion: number;
  supportWebRTC: boolean;
  supportWebRTCAudio: boolean;
  supportWebRTCVideo: boolean;
  supportRTCPeerConnection: boolean;
  supportSessionDescription: boolean;
  supportIceCandidate: boolean;
  supportMediaDevices: boolean;
  supportGetUserMedia: boolean;
}
export interface IWebRTCBrowser {
  browserName: string;
  features?: Array<string>;
  supported: string;
}
export interface IWebRTCSupportedBrowser {
  operationSystem: string;
  supported: Array<IWebRTCBrowser>;
}
export interface IAudio extends HTMLAudioElement {
  _playFulfilled: boolean;
  _promise: Promise<any>;
}
