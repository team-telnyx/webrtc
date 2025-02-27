export interface IMediaSettings {
  useSdpASBandwidthKbps?: boolean;
  sdpASBandwidthKbps?: number;
}

export interface IVertoCallOptions {
  // Required
  destinationNumber: string;
  // Optional
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
   *
   * ### Setting Preferred Codec
   *
   * You can pass `preferred_codecs` to the `newCall` method to set codec preference during the call.
   *
   * `preferred_codecs` is a sub-array of the codecs returned by [RTCRtpReceiver.getCapabilities('audio')](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/getCapabilities_static#codecs)
   *
   * ```js
   * const allCodecs = RTCRtpReceiver.getCapabilities('audio').codecs;
   *
   * const PCMACodec = allCodecs.find((c) => c.mimeType.toLowerCase().includes('pcma'));
   *
   * client.newCall({
   * destinationNumber: '123',
   * preferred_codecs: [PCMACodec],
   * });
   */
  preferred_codecs?: Array<RTCRtpCodecCapability>;

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
  options: IVertoCallOptions;
  cause: string;
  causeCode: number;
  channels: string[];
  role: string;
  extension: string;
  localStream: MediaStream;
  remoteStream: MediaStream;
  invite: () => void;
  answer: (params: AnswerParams) => void;
  hangup: (params: any, execute: boolean) => void;

  hold: () => void;
  unhold: () => void;
  toggleHold: () => void;
  dtmf: (dtmf: string) => void;
  message: (to: string, body: string) => void;
  muteAudio: () => void;
  unmuteAudio: () => void;
  toggleAudioMute: () => void;
  setAudioInDevice: (deviceId: string) => Promise<void>;
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
  setState: (state: any) => void;
  // Privates
  handleMessage: (msg: any) => void;
  _addChannel: (laChannel: any) => void;
  handleConferenceUpdate: (packet: any, pvtData: any) => Promise<string>;
  // WEB
  startScreenShare?: (opts?: object) => Promise<IWebRTCCall>;
  stopScreenShare?: () => void;
  setAudioOutDevice?: (deviceId: string) => Promise<boolean>;
  // RN
  switchCamera?: () => void;
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
