import { v4 as uuidv4 } from 'uuid';

class MediaStreamMock implements MediaStream {
  _tracks: MediaStreamTrack[] = [];
  active: boolean;
  id: string;

  onactive: (this: MediaStream, ev: Event) => any;

  onaddtrack: (this: MediaStream, ev: MediaStreamTrackEvent) => any;

  oninactive: (this: MediaStream, ev: Event) => any;

  onremovetrack: (this: MediaStream, ev: MediaStreamTrackEvent) => any;

  addTrack(track: MediaStreamTrack) {
    this._tracks.push(track);
  }
  //@ts-ignore
  clone(): MediaStream {}
  //@ts-ignore
  getTrackById(trackId: any): MediaStreamTrack {}

  removeTrack(track: any) {}

  stop() {}

  addEventListener(type: any, listener: any, options?: any) {}

  removeEventListener(type: any, listener: any, options?: any) {}
  //@ts-ignore
  dispatchEvent(event: Event): boolean {}

  getTracks() {
    return this._tracks;
  }

  getVideoTracks() {
    return this._tracks.filter((t) => t.kind === 'video');
  }

  getAudioTracks() {
    return this._tracks.filter((t) => t.kind === 'audio');
  }
}

class MediaStreamTrackMock implements MediaStreamTrack {
  contentHint: string;
  enabled: boolean = true;
  id: string = uuidv4();
  isolated: boolean;
  kind: string;
  label: string = 'Track Label';
  muted: boolean;
  readonly: boolean;
  readyState: MediaStreamTrackState;
  remote: boolean;
  onended: (this: MediaStreamTrack, ev: Event) => any;
  onisolationchange: (this: MediaStreamTrack, ev: Event) => any;
  onmute: (this: MediaStreamTrack, ev: Event) => any;
  onoverconstrained: (this: MediaStreamTrack, ev: Event) => any;
  onunmute: (this: MediaStreamTrack, ev: Event) => any;

  //@ts-ignore
  applyConstraints(constraints: any): Promise<void> {}
  //@ts-ignore
  clone(): MediaStreamTrack {}
  //@ts-ignore
  getCapabilities(): MediaTrackCapabilities {}
  //@ts-ignore
  getConstraints(): MediaTrackConstraints {}
  //@ts-ignore
  getSettings(): MediaTrackSettings {}

  stop() {
    this.enabled = false;
    this.readyState = 'ended';
  }

  addEventListener(type: any, listener: any, options?: any) {
    // throw new Error("Method not implemented.")
  }

  removeEventListener(type: any, listener: any, options?: any) {
    // throw new Error("Method not implemented.")
  }
  //@ts-ignore
  dispatchEvent(event: Event): boolean {}
}

//@ts-ignore
class RTCRtpTransceiverMock implements RTCRtpTransceiver {}

class RTCRtpSenderMock implements RTCRtpSender {
  dtmf: RTCDTMFSender;
  rtcpTransport: RTCDtlsTransport;
  track: MediaStreamTrack;
  transport: RTCDtlsTransport;
  //@ts-ignore
  transform: RTCRtpScriptTransform;
  getParameters(): RTCRtpSendParameters;
  getParameters(): RTCRtpParameters;
  getParameters(): any {}
  //@ts-ignore
  getStats(): Promise<RTCStatsReport> {}
  replaceTrack(withTrack: MediaStreamTrack): Promise<void>;
  replaceTrack(withTrack: MediaStreamTrack): Promise<void>;
  replaceTrack(withTrack: any): any {}
  setParameters(parameters: RTCRtpSendParameters): Promise<void>;
  setParameters(parameters?: RTCRtpParameters): Promise<void>;
  //@ts-ignore
  setParameters(parameters?: any): Promise<void> {}
  setStreams(...streams: MediaStream[]): void {}
}

class RTCRtpReceiverMock implements RTCRtpReceiver {
  jitterBufferTarget?: number;
  getSynchronizationSources(): RTCRtpSynchronizationSource[] {
    return [];
  }
  rtcpTransport: RTCDtlsTransport;
  track: MediaStreamTrack;
  transport: RTCDtlsTransport;
  //@ts-ignore
  transform: RTCRtpScriptTransform;
  getContributingSources(): RTCRtpContributingSource[] {
    return [];
  }
  getParameters(): RTCRtpReceiveParameters;
  getParameters(): RTCRtpParameters;
  getParameters(): any {}
  //@ts-ignore
  getStats(): Promise<RTCStatsReport> {}
}

class RTCPeerConnectionMock implements RTCPeerConnection {
  restartIce: () => void;
  canTrickleIceCandidates: boolean;
  connectionState: RTCPeerConnectionState;
  currentLocalDescription: RTCSessionDescription;
  currentRemoteDescription: RTCSessionDescription;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  idpErrorInfo: string;
  idpLoginUrl: string;
  localDescription: RTCSessionDescription;
  onconnectionstatechange: (this: RTCPeerConnection, ev: Event) => any;
  ondatachannel: (this: RTCPeerConnection, ev: RTCDataChannelEvent) => any;
  onicecandidate: (
    this: RTCPeerConnection,
    ev: RTCPeerConnectionIceEvent
  ) => any;
  onicecandidateerror: (this: RTCPeerConnection, ev: Event) => any;
  oniceconnectionstatechange: (this: RTCPeerConnection, ev: Event) => any;
  onicegatheringstatechange: (this: RTCPeerConnection, ev: Event) => any;
  onnegotiationneeded: (this: RTCPeerConnection, ev: Event) => any;
  onsignalingstatechange: (this: RTCPeerConnection, ev: Event) => any;
  onstatsended: (this: RTCPeerConnection, ev: Event) => any;
  ontrack: (this: RTCPeerConnection, ev: RTCTrackEvent) => any;
  peerIdentity: Promise<any>;
  pendingLocalDescription: RTCSessionDescription;
  pendingRemoteDescription: RTCSessionDescription;
  remoteDescription: RTCSessionDescription;
  sctp: RTCSctpTransport;
  signalingState: RTCSignalingState;
  // addIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate): Promise<void>
  // addIceCandidate(candidate?: RTCIceCandidateInit | RTCIceCandidate): Promise<void>
  // addIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate, successCallback: () => void, failureCallback: RTCPeerConnectionErrorCallback): Promise<void>
  addIceCandidate(
    candidate?: RTCIceCandidateInit | RTCIceCandidate
    //@ts-ignore
  ): Promise<void> {}
  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender {
    return new RTCRtpSenderMock();
  }
  addTransceiver(
    trackOrKind: string | MediaStreamTrack,
    init?: RTCRtpTransceiverInit
  ): RTCRtpTransceiver {
    const transceiver = new RTCRtpTransceiverMock();
    //@ts-ignore
    return transceiver;
  }
  close() {}
  createAnswer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
  createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>;
  createAnswer(
    successCallback: RTCSessionDescriptionCallback,
    failureCallback: RTCPeerConnectionErrorCallback
  ): Promise<void>;
  createAnswer(
    successCallback?: any,
    failureCallback?: any
  ): Promise<RTCSessionDescriptionInit | void> {
    return Promise.resolve({
      type: 'answer',
      sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-'
    });
  }
  createDataChannel(
    label: string,
    dataChannelDict?: RTCDataChannelInit
  ): RTCDataChannel;
  createDataChannel(
    label: string,
    dataChannelDict?: RTCDataChannelInit
  ): RTCDataChannel;
  //@ts-ignore
  createDataChannel(label: any, dataChannelDict?: any): RTCDataChannel {}
  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
  createOffer(
    successCallback: RTCSessionDescriptionCallback,
    failureCallback: RTCPeerConnectionErrorCallback,
    options?: RTCOfferOptions
  ): Promise<void>;
  createOffer(
    successCallback?: any,
    failureCallback?: any,
    options?: any
  ): Promise<RTCSessionDescriptionInit | void> {
    return Promise.resolve({
      type: 'offer',
      sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-'
    });
  }
  //@ts-ignore
  getConfiguration(): RTCConfiguration {}
  //@ts-ignore
  getIdentityAssertion(): Promise<string> {}
  getReceivers(): RTCRtpReceiver[] {
    return [new RTCRtpReceiverMock()];
  }
  getSenders(): RTCRtpSender[] {
    return [new RTCRtpSenderMock()];
  }
  getStats(selector?: MediaStreamTrack): Promise<RTCStatsReport>;
  getStats(selector?: MediaStreamTrack): Promise<RTCStatsReport>;
  getStats(
    selector: MediaStreamTrack,
    successCallback: any,
    failureCallback: RTCPeerConnectionErrorCallback
  ): Promise<void>;
  getStats(
    selector?: any,
    successCallback?: any,
    failureCallback?: any
    //@ts-ignore
  ): Promise<RTCStatsReport | void> {}
  getTransceivers(): RTCRtpTransceiver[] {
    return [];
  }
  removeTrack(sender: RTCRtpSender): void;
  removeTrack(sender: RTCRtpSender): void;
  removeTrack(sender: any) {}
  setConfiguration(configuration: RTCConfiguration): void;
  setConfiguration(configuration: RTCConfiguration): void;
  setConfiguration(configuration: any) {}
  setIdentityProvider(provider: string, options?: any): void {}
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
  setLocalDescription(
    description: RTCSessionDescriptionInit,
    successCallback: () => void,
    failureCallback: RTCPeerConnectionErrorCallback
  ): Promise<void>;
  setLocalDescription(
    description: any,
    successCallback?: any,
    failureCallback?: any
  ): Promise<void> {
    return Promise.resolve();
  }
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(
    description: RTCSessionDescriptionInit,
    successCallback: () => void,
    failureCallback: RTCPeerConnectionErrorCallback
  ): Promise<void>;
  setRemoteDescription(
    description: any,
    successCallback?: any,
    failureCallback?: any
  ): Promise<void> {
    return Promise.resolve();
  }
  addEventListener<
    K extends
      | 'connectionstatechange'
      | 'datachannel'
      | 'icecandidate'
      | 'icecandidateerror'
      | 'iceconnectionstatechange'
      | 'icegatheringstatechange'
      | 'negotiationneeded'
      | 'signalingstatechange'
      | 'statsended'
      | 'track'
  >(
    type: K,
    listener: (this: RTCPeerConnection, ev: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: any, listener: any, options?: any) {}
  removeEventListener<
    K extends
      | 'connectionstatechange'
      | 'datachannel'
      | 'icecandidate'
      | 'icecandidateerror'
      | 'iceconnectionstatechange'
      | 'icegatheringstatechange'
      | 'negotiationneeded'
      | 'signalingstatechange'
      | 'statsended'
      | 'track'
  >(
    type: K,
    listener: (this: RTCPeerConnection, ev: Event) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(type: any, listener: any, options?: any) {}
  //@ts-ignore
  dispatchEvent(event: Event): boolean {}
}

export { MediaStreamMock, MediaStreamTrackMock, RTCPeerConnectionMock };
