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
  userVariables?: { [key: string]: any }
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
  skipNotifications?: boolean
  negotiateAudio?: boolean
  negotiateVideo?: boolean
  mediaSettings: { useSdpASBandwidth_kbps: boolean, sdpASBandwidth_kbps: number };
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
  answer: () => void;
  hangup: (params: any, execute: boolean) => void;
  transfer: (destination: string) => void;
  replace: (replaceCallID: string) => void;
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
  setAudioBandwidthEncodingsMaxBps: (max: number) => void,
  setVideoBandwidthEncodingsMaxBps: (max: number) => void,
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
  browserName: string
  features?: Array<string>;
  supported: string
}
export interface IWebRTCSupportedBrowser {
  operationSystem: string;
  supported: Array<IWebRTCBrowser>;
}
export interface IAudio extends HTMLAudioElement {
  _playFulfilled: boolean;
  _promise: Promise<any>;
}
