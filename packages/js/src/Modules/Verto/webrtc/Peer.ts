import logger from '../util/logger';
import {
  getUserMedia,
  getMediaConstraints,
  sdpStereoHack,
  sdpBitrateHack,
  sdpBitrateASHack,
  sdpMediaOrderHack,
} from './helpers';
import { SwEvent } from '../util/constants';
import { PeerType } from './constants';
import {
  attachMediaStream,
  muteMediaElement,
  sdpToJsonHack,
  RTCPeerConnection,
  streamIsValid,
} from '../util/webrtc';
import { DeferredPromise, deferredPromise, isFunction } from '../util/helpers';
import { IVertoCallOptions } from './interfaces';
import { trigger } from '../services/Handler';
import { WebRTCStats } from '@peermetrics/webrtc-stats';
/**
 * @ignore Hide in docs output
 */
export default class Peer {
  public instance: RTCPeerConnection;
  public iceGatheringComplete: DeferredPromise<boolean>;
  public onSdpReadyTwice: Function = null;
  private _webrtcStats: WebRTCStats;
  private _constraints: {
    offerToReceiveAudio: boolean;
    offerToReceiveVideo: boolean;
  };

  private _negotiating: boolean = false;

  constructor(public type: PeerType, private options: IVertoCallOptions) {
    logger.info('New Peer with type:', this.type, 'Options:', this.options);

    this._constraints = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    };

    this._sdpReady = this._sdpReady.bind(this);
    this.handleSignalingStateChangeEvent =
      this.handleSignalingStateChangeEvent.bind(this);
    this.handleNegotiationNeededEvent =
      this.handleNegotiationNeededEvent.bind(this);
    this.handleTrackEvent = this.handleTrackEvent.bind(this);
    this.createPeerConnection = this.createPeerConnection.bind(this);
    this.iceGatheringComplete = deferredPromise({ debounceTime: 100 });

    if (this.options.debug) {
      this._webrtcStats = new WebRTCStats({
        getStatsInterval: 1000,
        rawStats: false,
        statsObject: false,
        filteredStats: false,
        remote: true,
        wrapGetUserMedia: true,
        debug: false,
        logLevel: 'warn',
      });
    }
    this._init();
  }

  get isOffer() {
    return this.type === PeerType.Offer;
  }

  get isAnswer() {
    return this.type === PeerType.Answer;
  }

  startNegotiation() {
    this._negotiating = true;

    if (this._isOffer()) {
      this._createOffer();
    } else {
      this._createAnswer();
    }
  }

  private _logTransceivers() {
    logger.info(
      'Number of transceivers:',
      this.instance.getTransceivers().length
    );
    this.instance.getTransceivers().forEach((tr, index) => {
      logger.info(
        `>> Transceiver [${index}]:`,
        tr.mid,
        tr.direction,
        tr.stopped
      );
      logger.info(
        `>> Sender Params [${index}]:`,
        JSON.stringify(tr.sender.getParameters(), null, 2)
      );
    });
  }

  private handleSignalingStateChangeEvent(event) {
    logger.info('signalingState:', this.instance.signalingState);

    switch (this.instance.signalingState) {
      case 'stable':
        // Workaround to skip nested negotiations
        // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=740501
        this._negotiating = false;
        break;
      case 'closed':
        this.instance = null;
        break;
      default:
        this._negotiating = true;
    }
  }

  private handleNegotiationNeededEvent() {
    logger.info('Negotiation needed event');
    if (this.instance.signalingState !== 'stable') {
      return;
    }
    this.startNegotiation();
  }

  private handleTrackEvent(event) {
    const {
      streams: [first],
    } = event;
    const { remoteElement, screenShare } = this.options;
    let { remoteStream } = this.options;

    remoteStream = first;

    if (screenShare === false) {
      attachMediaStream(remoteElement, remoteStream);
    }
  }

  private handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate && ['relay', 'srflx'].includes(event.candidate.type)) {
      // Found enough candidates to establish a connection
      // This is a workaround for the issue where iceGatheringState is always 'gathering'
      this.iceGatheringComplete.resolve(true);
    }
  };
  private async createPeerConnection() {
    this.instance = RTCPeerConnection(this._config());
    if (this.options.debug) {
      this._webrtcStats?.addConnection({
        pc: this.instance,
        peerId: this.options.id,
        connectionId: this.options.id,
      });
    }
    this.instance.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    this.instance.onnegotiationneeded = this.handleNegotiationNeededEvent;
    this.instance.ontrack = this.handleTrackEvent;
    this.instance.addEventListener('icecandidate', this.handleIceCandidate);

    //@ts-ignore
    this.instance.addEventListener('addstream', (event: MediaStreamEvent) => {
      this.options.remoteStream = event.stream;
    });

    this.options.localStream = await this._retrieveLocalStream().catch(
      (error) => {
        trigger(SwEvent.MediaError, error, this.options.id);
        return null;
      }
    );
  }

  private async _init() {
    await this.createPeerConnection();

    const {
      localElement,
      localStream = null,
      screenShare = false,
    } = this.options;

    if (streamIsValid(localStream)) {
      const audioTracks = localStream.getAudioTracks();
      logger.info('Local audio tracks: ', audioTracks);
      const videoTracks = localStream.getVideoTracks();
      logger.info('Local video tracks: ', videoTracks);
      // FIXME: use transceivers way only for offer - when answer gotta match mid from the ones from SRD
      if (this.isOffer && typeof this.instance.addTransceiver === 'function') {
        // Use addTransceiver

        audioTracks.forEach((track) => {
          this.options.userVariables.microphoneLabel = track.label;
          this.instance.addTransceiver(track, {
            direction: 'sendrecv',
            streams: [localStream],
          });
        });

        const transceiverParams: RTCRtpTransceiverInit = {
          direction: 'sendrecv',
          streams: [localStream],
        };

        console.debug('Applying video transceiverParams', transceiverParams);
        videoTracks.forEach((track) => {
          this.options.userVariables.cameraLabel = track.label;
          this.instance.addTransceiver(track, transceiverParams);
        });
      } else if (typeof this.instance.addTrack === 'function') {
        // Use addTrack

        audioTracks.forEach((track) => {
          this.options.userVariables.microphoneLabel = track.label;
          this.instance.addTrack(track, localStream);
        });

        videoTracks.forEach((track) => {
          this.options.userVariables.cameraLabel = track.label;
          this.instance.addTrack(track, localStream);
        });
      } else {
        // Fallback to legacy addStream ..
        // @ts-ignore
        this.instance.addStream(localStream);
      }

      if (screenShare === false) {
        muteMediaElement(localElement);
        attachMediaStream(localElement, localStream);
      }
    }

    if (this.isOffer) {
      if (this.options.negotiateAudio) {
        this._checkMediaToNegotiate('audio');
      }
      if (this.options.negotiateVideo) {
        this._checkMediaToNegotiate('video');
      }
    } else {
      this.startNegotiation();
    }

    this._logTransceivers();
  }

  private _getSenderByKind(kind: string) {
    return this.instance
      .getSenders()
      .find(({ track }) => track && track.kind === kind);
  }

  private _checkMediaToNegotiate(kind: string) {
    // addTransceiver of 'kind' if not present
    const sender = this._getSenderByKind(kind);
    if (!sender) {
      const transceiver = this.instance.addTransceiver(kind);
      logger.info('Add transceiver', kind, transceiver);
    }
  }

  private _createOffer() {
    if (!this._isOffer()) {
      return;
    }
    this._constraints.offerToReceiveAudio = Boolean(this.options.audio);
    this._constraints.offerToReceiveVideo = Boolean(this.options.video);
    logger.info('_createOffer - this._constraints', this._constraints);
    // FIXME: Use https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpTransceiver when available (M71)
    this.instance
      .createOffer(this._constraints)
      .then(this._setLocalDescription.bind(this))
      .then(this._sdpReady)
      .catch((error) => logger.error('Peer _createOffer error:', error));
  }

  private _setRemoteDescription(remoteDescription: RTCSessionDescriptionInit) {
    if (this.options.useStereo) {
      remoteDescription.sdp = sdpStereoHack(remoteDescription.sdp);
    }
    if (this.instance.localDescription) {
      remoteDescription.sdp = sdpMediaOrderHack(
        remoteDescription.sdp,
        this.instance.localDescription.sdp
      );
    }
    const sessionDescr: RTCSessionDescription =
      sdpToJsonHack(remoteDescription);
    logger.info(
      'REMOTE SDP \n',
      `Type: ${remoteDescription.type}`,
      '\n\n',
      remoteDescription.sdp
    );
    return this.instance.setRemoteDescription(sessionDescr);
  }

  private async _createAnswer() {
    if (!this._isAnswer()) {
      return;
    }
    if (this.instance.signalingState !== 'stable') {
      console.log(
        "  - But the signaling state isn't stable, so triggering rollback"
      );

      // Set the local and remove descriptions for rollback; don't proceed
      // until both return.
      await Promise.all([
        this.instance.setLocalDescription({ type: 'rollback' }),
        this.instance.setRemoteDescription({
          sdp: this.options.remoteSdp,
          type: PeerType.Offer,
        }),
      ]);
      return;
    }
    await this._setRemoteDescription({
      sdp: this.options.remoteSdp,
      type: PeerType.Offer,
    });
    this._logTransceivers();
    const answer = await this.instance.createAnswer();
    await this._setLocalDescription(answer);
  }

  private _setLocalDescription(sessionDescription: RTCSessionDescriptionInit) {
    const {
      useStereo,
      googleMaxBitrate,
      googleMinBitrate,
      googleStartBitrate,
      mediaSettings,
    } = this.options;

    if (useStereo) {
      sessionDescription.sdp = sdpStereoHack(sessionDescription.sdp);
    }

    if (googleMaxBitrate && googleMinBitrate && googleStartBitrate) {
      sessionDescription.sdp = sdpBitrateHack(
        sessionDescription.sdp,
        googleMaxBitrate,
        googleMinBitrate,
        googleStartBitrate
      );
    }

    if (
      mediaSettings &&
      mediaSettings.useSdpASBandwidthKbps &&
      mediaSettings.sdpASBandwidthKbps !== null
    ) {
      sessionDescription.sdp = sdpBitrateASHack(
        sessionDescription.sdp,
        mediaSettings.sdpASBandwidthKbps
      );
    }
    return this.instance.setLocalDescription(sessionDescription);
  }

  /** Workaround for ReactNative: first time SDP has no candidates */
  private _sdpReady(): void {
    if (isFunction(this.onSdpReadyTwice)) {
      this.onSdpReadyTwice(this.instance.localDescription);
    }
  }

  private async _retrieveLocalStream() {
    if (streamIsValid(this.options.localStream)) {
      return this.options.localStream;
    }
    const constraints = await getMediaConstraints(this.options);
    return getUserMedia(constraints);
  }

  private _isOffer(): boolean {
    return this.type === PeerType.Offer;
  }

  private _isAnswer(): boolean {
    return this.type === PeerType.Answer;
  }

  private _config(): RTCConfiguration {
    const { iceServers = [] } = this.options;

    const config: RTCConfiguration = {
      iceCandidatePoolSize: 255,
      bundlePolicy: 'max-compat',
      iceServers,
    };

    logger.info('RTC config', config);
    return config;
  }

  public close() {
    let data = null;
    if (this._webrtcStats) {
      data = this._webrtcStats.getTimeline('stats');
      this._webrtcStats.destroy();
    }
    this.instance.close();
    return data;
  }
}
