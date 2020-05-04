import { v4 as uuidv4 } from 'uuid'

class MediaStreamMock implements MediaStream {
  _tracks: MediaStreamTrack[] = []
  active: boolean
  id: string

  onactive: (this: MediaStream, ev: Event) => any

  onaddtrack: (this: MediaStream, ev: MediaStreamTrackEvent) => any

  oninactive: (this: MediaStream, ev: Event) => any

  onremovetrack: (this: MediaStream, ev: MediaStreamTrackEvent) => any

  addTrack(track: MediaStreamTrack) {
    this._tracks.push(track)
  }

  clone(): MediaStream {
    throw new Error('Method not implemented.')
  }

  getTrackById(trackId: any): MediaStreamTrack {
    throw new Error('Method not implemented.')
  }

  removeTrack(track: any) {
    throw new Error('Method not implemented.')
  }

  stop() {
    throw new Error('Method not implemented.')
  }

  addEventListener(type: any, listener: any, options?: any) {
    throw new Error('Method not implemented.')
  }

  removeEventListener(type: any, listener: any, options?: any) {
    throw new Error('Method not implemented.')
  }

  dispatchEvent(event: Event): boolean {
    throw new Error("Method not implemented.")
  }

  getTracks() {
    return this._tracks
  }

  getVideoTracks() {
    return this._tracks.filter(t => t.kind === 'video')
  }

  getAudioTracks() {
    return this._tracks.filter(t => t.kind === 'audio')
  }
}

class MediaStreamTrackMock implements MediaStreamTrack {
  enabled: boolean = true
  id: string = uuidv4()
  isolated: boolean
  kind: string
  label: string = 'Track Label'
  muted: boolean
  readonly: boolean
  readyState: MediaStreamTrackState
  remote: boolean
  onended: (this: MediaStreamTrack, ev: MediaStreamErrorEvent) => any
  onisolationchange: (this: MediaStreamTrack, ev: Event) => any
  onmute: (this: MediaStreamTrack, ev: Event) => any
  onoverconstrained: (this: MediaStreamTrack, ev: MediaStreamErrorEvent) => any
  onunmute: (this: MediaStreamTrack, ev: Event) => any

  applyConstraints(constraints: any): Promise<void> {
    throw new Error("Method not implemented.")
  }

  clone(): MediaStreamTrack {
    throw new Error("Method not implemented.")
  }

  getCapabilities(): MediaTrackCapabilities {
    throw new Error("Method not implemented.")
  }

  getConstraints(): MediaTrackConstraints {
    throw new Error("Method not implemented.")
  }

  getSettings(): MediaTrackSettings {
    throw new Error("Method not implemented.")
  }

  stop() {
    this.enabled = false
    this.readyState = 'ended'
  }

  addEventListener(type: any, listener: any, options?: any) {
    // throw new Error("Method not implemented.")
  }

  removeEventListener(type: any, listener: any, options?: any) {
    // throw new Error("Method not implemented.")
  }

  dispatchEvent(event: Event): boolean {
    throw new Error("Method not implemented.")
  }
}

class RTCRtpSenderMock implements RTCRtpSender {
  dtmf: RTCDTMFSender
  rtcpTransport: RTCDtlsTransport
  track: MediaStreamTrack
  transport: RTCDtlsTransport
  getParameters(): RTCRtpSendParameters
  getParameters(): RTCRtpParameters
  getParameters(): any {
    throw new Error('Method not implemented.')
  }
  getStats(): Promise<RTCStatsReport> {
    throw new Error('Method not implemented.')
  }
  replaceTrack(withTrack: MediaStreamTrack): Promise<void>
  replaceTrack(withTrack: MediaStreamTrack): Promise<void>
  replaceTrack(withTrack: any): any {
    throw new Error('Method not implemented.')
  }
  setParameters(parameters: RTCRtpSendParameters): Promise<void>
  setParameters(parameters?: RTCRtpParameters): Promise<void>
  setParameters(parameters?: any): Promise<void> {
    throw new Error('Method not implemented.')
  }
  setStreams(...streams: MediaStream[]): void {
    throw new Error('Method not implemented.')
  }
}

class RTCPeerConnectionMock implements RTCPeerConnection {
  canTrickleIceCandidates: boolean
  connectionState: RTCPeerConnectionState
  currentLocalDescription: RTCSessionDescription
  currentRemoteDescription: RTCSessionDescription
  iceConnectionState: RTCIceConnectionState
  iceGatheringState: RTCIceGatheringState
  idpErrorInfo: string
  idpLoginUrl: string
  localDescription: RTCSessionDescription
  onconnectionstatechange: (this: RTCPeerConnection, ev: Event) => any
  ondatachannel: (this: RTCPeerConnection, ev: RTCDataChannelEvent) => any
  onicecandidate: (this: RTCPeerConnection, ev: RTCPeerConnectionIceEvent) => any
  onicecandidateerror: (this: RTCPeerConnection, ev: RTCPeerConnectionIceErrorEvent) => any
  oniceconnectionstatechange: (this: RTCPeerConnection, ev: Event) => any
  onicegatheringstatechange: (this: RTCPeerConnection, ev: Event) => any
  onnegotiationneeded: (this: RTCPeerConnection, ev: Event) => any
  onsignalingstatechange: (this: RTCPeerConnection, ev: Event) => any
  onstatsended: (this: RTCPeerConnection, ev: RTCStatsEvent) => any
  ontrack: (this: RTCPeerConnection, ev: RTCTrackEvent) => any
  peerIdentity: Promise<RTCIdentityAssertion>
  pendingLocalDescription: RTCSessionDescription
  pendingRemoteDescription: RTCSessionDescription
  remoteDescription: RTCSessionDescription
  sctp: RTCSctpTransport
  signalingState: RTCSignalingState
  // addIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate): Promise<void>
  // addIceCandidate(candidate?: RTCIceCandidateInit | RTCIceCandidate): Promise<void>
  // addIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate, successCallback: () => void, failureCallback: RTCPeerConnectionErrorCallback): Promise<void>
  addIceCandidate(candidate?: RTCIceCandidateInit | RTCIceCandidate): Promise<void> {
    throw new Error('Method not implemented.')
  }
  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender {
    // throw new Error('Method not implemented.')
    return new RTCRtpSenderMock()
  }
  addTransceiver(trackOrKind: string | MediaStreamTrack, init?: RTCRtpTransceiverInit): RTCRtpTransceiver {
    throw new Error('Method not implemented.')
  }
  close() {
    throw new Error('Method not implemented.')
  }
  createAnswer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>
  createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>
  createAnswer(successCallback: RTCSessionDescriptionCallback, failureCallback: RTCPeerConnectionErrorCallback): Promise<void>
  createAnswer(successCallback?: any, failureCallback?: any): Promise<RTCSessionDescriptionInit | void> {
    throw new Error('Method not implemented.')
  }
  createDataChannel(label: string, dataChannelDict?: RTCDataChannelInit): RTCDataChannel
  createDataChannel(label: string, dataChannelDict?: RTCDataChannelInit): RTCDataChannel
  createDataChannel(label: any, dataChannelDict?: any): RTCDataChannel {
    throw new Error('Method not implemented.')
  }
  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>
  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>
  createOffer(successCallback: RTCSessionDescriptionCallback, failureCallback: RTCPeerConnectionErrorCallback, options?: RTCOfferOptions): Promise<void>
  createOffer(successCallback?: any, failureCallback?: any, options?: any): Promise<RTCSessionDescriptionInit | void> {
    throw new Error('Method not implemented.')
  }
  getConfiguration(): RTCConfiguration {
    throw new Error('Method not implemented.')
  }
  getIdentityAssertion(): Promise<string> {
    throw new Error('Method not implemented.')
  }
  getReceivers(): RTCRtpReceiver[] {
    throw new Error('Method not implemented.')
  }
  getSenders(): RTCRtpSender[] {
    throw new Error('Method not implemented.')
  }
  getStats(selector?: MediaStreamTrack): Promise<RTCStatsReport>
  getStats(selector?: MediaStreamTrack): Promise<RTCStatsReport>
  getStats(selector: MediaStreamTrack, successCallback: RTCStatsCallback, failureCallback: RTCPeerConnectionErrorCallback): Promise<void>
  getStats(selector?: any, successCallback?: any, failureCallback?: any): Promise<RTCStatsReport | void> {
    throw new Error('Method not implemented.')
  }
  getTransceivers(): RTCRtpTransceiver[] {
    throw new Error('Method not implemented.')
  }
  removeTrack(sender: RTCRtpSender): void
  removeTrack(sender: RTCRtpSender): void
  removeTrack(sender: any) {
    throw new Error('Method not implemented.')
  }
  setConfiguration(configuration: RTCConfiguration): void
  setConfiguration(configuration: RTCConfiguration): void
  setConfiguration(configuration: any) {
    throw new Error('Method not implemented.')
  }
  setIdentityProvider(provider: string, options?: RTCIdentityProviderOptions): void {
    throw new Error('Method not implemented.')
  }
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>
  setLocalDescription(description: RTCSessionDescriptionInit, successCallback: () => void, failureCallback: RTCPeerConnectionErrorCallback): Promise<void>
  setLocalDescription(description: any, successCallback?: any, failureCallback?: any): Promise<void> {
    throw new Error('Method not implemented.')
  }
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>
  setRemoteDescription(description: RTCSessionDescriptionInit, successCallback: () => void, failureCallback: RTCPeerConnectionErrorCallback): Promise<void>
  setRemoteDescription(description: any, successCallback?: any, failureCallback?: any): Promise<void> {
    throw new Error('Method not implemented.')
  }
  addEventListener<K extends 'connectionstatechange' | 'datachannel' | 'icecandidate' | 'icecandidateerror' | 'iceconnectionstatechange' | 'icegatheringstatechange' | 'negotiationneeded' | 'signalingstatechange' | 'statsended' | 'track'>(type: K, listener: (this: RTCPeerConnection, ev: RTCPeerConnectionEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  addEventListener(type: any, listener: any, options?: any) {
    // throw new Error('Method not implemented.')
  }
  removeEventListener<K extends 'connectionstatechange' | 'datachannel' | 'icecandidate' | 'icecandidateerror' | 'iceconnectionstatechange' | 'icegatheringstatechange' | 'negotiationneeded' | 'signalingstatechange' | 'statsended' | 'track'>(type: K, listener: (this: RTCPeerConnection, ev: RTCPeerConnectionEventMap[K]) => void, options?: boolean | EventListenerOptions): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
  removeEventListener(type: any, listener: any, options?: any) {
    throw new Error('Method not implemented.')
  }
  dispatchEvent(event: Event): boolean {
    throw new Error('Method not implemented.')
  }
}

export {
  MediaStreamMock,
  MediaStreamTrackMock,
  RTCPeerConnectionMock
}
