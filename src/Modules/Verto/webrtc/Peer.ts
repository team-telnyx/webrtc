import logger from '../util/logger'
import { getUserMedia, getMediaConstraints, sdpStereoHack, sdpBitrateHack } from './helpers'
import { SwEvent } from '../util/constants'
import { PeerType } from './constants'
import { attachMediaStream, muteMediaElement, sdpToJsonHack, RTCPeerConnection, streamIsValid } from '../util/webrtc'
import { isFunction } from '../util/helpers'
import { CallOptions } from './interfaces'
import { trigger } from '../services/Handler'

export default class Peer {
  public instance: RTCPeerConnection
  public onSdpReadyTwice: Function = null
  private _constraints: { offerToReceiveAudio: boolean, offerToReceiveVideo: boolean }
  private _negotiating: boolean = false

  constructor(public type: PeerType, private options: CallOptions) {
    logger.info('New Peer with type:', this.type, 'Options:', this.options)

    this._constraints = { offerToReceiveAudio: true, offerToReceiveVideo: true }
    this._sdpReady = this._sdpReady.bind(this)
    this._init()
  }

  startNegotiation() {
    this._negotiating = true

    if (this._isOffer()) {
      this._createOffer()
    } else {
      this._createAnswer()
    }
  }

  private async _init() {
    this.instance = RTCPeerConnection(this._config())

    this.instance.onsignalingstatechange = event => {
      switch (this.instance.signalingState) {
        case 'stable':
          // Workaround to skip nested negotiations
          // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=740501
          this._negotiating = false
          break
        case 'closed':
          this.instance = null
          break
        default:
          this._negotiating = true
      }
    }

    this.instance.onnegotiationneeded = event => {
      if (this._negotiating) {
        logger.debug('Skip twice onnegotiationneeded..')
        return
      }
      this.startNegotiation()
    }
    console.log("======> this.options", this.options)
    this.options.localStream = await this._retrieveLocalStream()
      .catch(error => {
        trigger(SwEvent.MediaError, error, this.options.id)
        return null
      })
    const { localElement, localStream = null, screenShare = false } = this.options
    if (streamIsValid(localStream)) {
      if (typeof this.instance.addTrack === 'function') {
        localStream.getTracks().forEach(t => this.instance.addTrack(t, localStream))
      } else {
        // @ts-ignore
        this.instance.addStream(localStream)
      }
      if (screenShare !== true) {
        muteMediaElement(localElement)
        attachMediaStream(localElement, localStream)
      }
    } else if (localStream === null) {
      this.startNegotiation()
    }
  }

  private _createOffer() {
    if (!this._isOffer()) {
      return
    }
    // FIXME: Use https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpTransceiver when available (M71)
    this.instance.createOffer(this._constraints)
      .then(this._setLocalDescription.bind(this))
      .then(this._sdpReady)
      .catch(error => logger.error('Peer _createOffer error:', error))
  }

  private _createAnswer() {
    if (!this._isAnswer()) {
      return
    }
    const { remoteSdp, useStereo } = this.options
    const sdp = useStereo ? sdpStereoHack(remoteSdp) : remoteSdp
    const sessionDescr: RTCSessionDescription = sdpToJsonHack({ sdp, type: PeerType.Offer })
    this.instance.setRemoteDescription(sessionDescr)
      .then(() => this.instance.createAnswer())
      .then(this._setLocalDescription.bind(this))
      .then(this._sdpReady)
      .catch(error => logger.error('Peer _createAnswer error:', error))
  }

  private _setLocalDescription(sessionDescription: RTCSessionDescriptionInit) {
    const { useStereo, googleMaxBitrate, googleMinBitrate, googleStartBitrate } = this.options
    console.log("THIS.opton===> _setLocalDescription", this.options)
    if (useStereo) {
      sessionDescription.sdp = sdpStereoHack(sessionDescription.sdp)
    }
    if (googleMaxBitrate && googleMinBitrate && googleStartBitrate) {
      sessionDescription.sdp = sdpBitrateHack(sessionDescription.sdp, googleMaxBitrate, googleMinBitrate, googleStartBitrate)
    }
    return this.instance.setLocalDescription(sessionDescription)
  }

  /** Workaround for ReactNative: first time SDP has no candidates */
  private _sdpReady(): void {
    if (isFunction(this.onSdpReadyTwice)) {
      this.onSdpReadyTwice(this.instance.localDescription)
    }
  }

  private async _retrieveLocalStream() {
    if (streamIsValid(this.options.localStream)) {
      return this.options.localStream
    }
    const constraints = await getMediaConstraints(this.options)
    return getUserMedia(constraints)
  }

  private _isOffer(): boolean {
    return this.type === PeerType.Offer
  }

  private _isAnswer(): boolean {
    return this.type === PeerType.Answer
  }

  private _config(): RTCConfiguration {
    const { iceServers = [] } = this.options
    // @ts-ignore
    const config: RTCConfiguration = { sdpSemantics: 'plan-b', bundlePolicy: 'max-compat', iceServers }
    logger.info('RTC config', config)
    return config
  }
}
