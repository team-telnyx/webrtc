import BrowserSession from '../BrowserSession';
import { trigger } from '../services/Handler';
import { SwEvent } from '../util/constants';
import {
  createWebRTCStatsReporter,
  getConnectionStateDetails,
  WebRTCStatsReporter,
} from '../util/debug';

import { isFunction } from '../util/helpers';
import logger from '../util/logger';
import {
  attachMediaStream,
  audioIsMediaTrackConstraints,
  RTCPeerConnection,
  streamIsValid,
  videoIsMediaTrackConstraints,
} from '../util/webrtc';
import { PeerType } from './constants';
import {
  disableAudioTracks,
  getMediaConstraints,
  getPreferredCodecs,
  getUserMedia,
} from './helpers';
import { IVertoCallOptions } from './interfaces';

/**
 * @ignore Hide in docs output
 */
export default class Peer {
  public instance: RTCPeerConnection;
  public onSdpReadyTwice: ((data: RTCSessionDescription) => void) | null = null;
  public statsReporter: WebRTCStatsReporter | null = null;
  private _constraints: {
    offerToReceiveAudio: boolean;
    offerToReceiveVideo?: boolean;
  };

  private _session: BrowserSession;
  private _negotiating: boolean = false;
  private _prevConnectionState: RTCPeerConnectionState = null;
  private _restartedIceOnConnectionStateFailed: boolean = false;
  private _trickleIceSdpFn: (sdp: RTCSessionDescriptionInit) => void;
  private _registerPeerEvents: (instance: RTCPeerConnection) => void;
  private _sleepWakeupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    public type: PeerType,
    private options: IVertoCallOptions,
    session: BrowserSession,
    trickleIceSdpFn: (sdp: RTCSessionDescriptionInit) => void,
    registerPeerEvents: (instance: RTCPeerConnection) => void
  ) {
    logger.info('New Peer with type:', this.type, 'Options:', this.options);

    this._constraints = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: !!options.video,
    };

    this._sdpReady = this._sdpReady.bind(this);
    this.handleSignalingStateChangeEvent =
      this.handleSignalingStateChangeEvent.bind(this);
    this.handleNegotiationNeededEvent =
      this.handleNegotiationNeededEvent.bind(this);
    this.handleTrackEvent = this.handleTrackEvent.bind(this);
    this.createPeerConnection = this.createPeerConnection.bind(this);

    this._session = session;
    this._trickleIceSdpFn = trickleIceSdpFn;
    this._registerPeerEvents = registerPeerEvents;
  }

  get isOffer() {
    return this.type === PeerType.Offer;
  }

  get isAnswer() {
    return this.type === PeerType.Answer;
  }

  get isDebugEnabled() {
    return this.options.debug || this._session.options.debug;
  }

  get debugOutput() {
    return this.options.debugOutput || this._session.options.debugOutput;
  }

  get keepConnectionAliveOnSocketClose() {
    return (
      this.options.keepConnectionAliveOnSocketClose ||
      this._session.options.keepConnectionAliveOnSocketClose
    );
  }

  get restartedIceOnConnectionStateFailed() {
    return this._restartedIceOnConnectionStateFailed;
  }

  startNegotiation() {
    performance.mark(`ice-gathering-start`);

    this._negotiating = true;

    if (this._isOffer()) {
      this._createOffer();
    } else {
      this._createAnswer();
    }
  }
  async startTrickleIceNegotiation() {
    performance.mark(`ice-gathering-start`);

    this._negotiating = true;

    if (this._isOffer()) {
      await this._createOffer().then(this._trickleIceSdpFn.bind(this));
    } else {
      await this._createAnswer().then(this._trickleIceSdpFn.bind(this));
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

  private get trickleIcePerformanceMetrics() {
    const newCall = performance.measure(
      'new-call',
      'new-call-start',
      'new-call-end'
    );

    const peerCreation = performance.measure(
      'peer-creation',
      'peer-creation-start',
      'peer-creation-end'
    );

    const iceGathering = performance.measure(
      'ice-gathering',
      'ice-gathering-start',
      'ice-gathering-end'
    );

    const sdpSend = performance.measure(
      'sdp-send',
      'sdp-send-start',
      'sdp-send-end'
    );

    const inviteSend = performance.measure(
      'invite-send',
      'new-call-start',
      'sdp-send-start'
    );

    const totalDuration = performance.measure(
      'total-duration',
      'peer-creation-start',
      'sdp-send-end'
    );

    const formatDuration = (dur: number) => `${dur.toFixed(2)}ms`;
    return {
      'New Call': {
        duration: formatDuration(newCall.duration),
      },
      'Peer Creation': {
        duration: formatDuration(peerCreation.duration),
      },
      'ICE Gathering': {
        duration: formatDuration(iceGathering.duration),
      },
      [this._isOffer() ? 'Invite Send' : 'Answer Send']: {
        duration: formatDuration(inviteSend.duration),
      },
      'SDP Send': {
        duration: formatDuration(sdpSend.duration),
      },
      'Total Duration': {
        duration: formatDuration(totalDuration.duration),
      },
    };
  }

  private handleSignalingStateChangeEvent() {
    logger.info('signalingState:', this.instance.signalingState);

    switch (this.instance.signalingState) {
      case 'stable':
        // Workaround to skip nested negotiations
        // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=740501
        this._negotiating = false;
        break;
      case 'closed':
        trigger(
          SwEvent.PeerConnectionSignalingStateClosed,
          {
            sessionId: this._session.sessionid,
          },
          this.options.id
        );

        if (this.instance) {
          logger.debug(
            `[${this.options.id}] Closing peer due to signalingState closed`
          );
          this.close();
        }
        break;
      default:
        this._negotiating = true;
    }
  }

  private handleNegotiationNeededEvent() {
    logger.info('Negotiation needed event');
    if (this.instance.signalingState !== 'stable' || this._negotiating) {
      logger.debug(
        'Skipping negotiation, state:',
        this.instance.signalingState,
        'negotiating:',
        this._negotiating
      );
      return;
    }
    if (this._isTrickleIce()) {
      this.startTrickleIceNegotiation();
    } else {
      this.startNegotiation();
    }
  }

  private handleTrackEvent(event: RTCTrackEvent) {
    const {
      streams: [first],
    } = event;
    const { remoteElement, screenShare } = this.options;
    this.options.remoteStream = first;

    if (screenShare === false) {
      attachMediaStream(remoteElement, this.options.remoteStream);
    }
  }

  private handleConnectionStateChange = async () => {
    const { connectionState } = this.instance;
    logger.info(
      `[${new Date().toISOString()}] Connection State changed: ${
        this._prevConnectionState
      } -> ${connectionState}`
    );

    // Case 1: failed (total diruption) or disconnected (degraded): Attempt ICE restart/renegotiation
    if (connectionState === 'failed' || connectionState === 'disconnected') {
      const onConnectionOnline = async () => {
        // Report detailed connection state if debug is enabled
        if (this.isDebugEnabled && this.statsReporter) {
          const details = await getConnectionStateDetails(
            this.instance,
            this._prevConnectionState
          );
          this.statsReporter.reportConnectionStateChange(details);
        }

        /**
         * restart ice as ice credentials might have changed
         * Per WebRTC spec, ICE restart requires creating a new offer
         * (regardless of whether we were originally the offerer or answerer)
         */
        if (
          !this._restartedIceOnConnectionStateFailed &&
          connectionState === 'failed' &&
          this._session.hasAutoReconnect()
        ) {
          // await this.instance.restartIce();
          this._restartedIceOnConnectionStateFailed = true;
          logger.info('Peer connection state failed. ICE restarted.');
        }

        window.removeEventListener('online', onConnectionOnline);
      };

      if (navigator.onLine) {
        onConnectionOnline();
      } else {
        window.addEventListener('online', onConnectionOnline);
      }
    }

    if (connectionState === 'failed') {
      trigger(
        SwEvent.PeerConnectionFailureError,
        {
          error: new Error(
            `Peer Connection failed. previous state: ${this._prevConnectionState}, current state: ${connectionState}`
          ),
          sessionId: this._session.sessionid,
        },
        this.options.id
      );
    }

    // update previous state for the next transition
    this._prevConnectionState = connectionState;

    if (this._isTrickleIce()) {
      if (connectionState === 'connecting') {
        performance.mark('peer-connection-connecting');
      }

      if (connectionState === 'connected') {
        performance.mark('peer-connection-connected');
        // Log Trickle ICE performance metrics
        console.group('Performance Metrics');
        console.table(this.trickleIcePerformanceMetrics);
        console.groupEnd();
        performance.clearMarks();
      }
    }
  };

  private async createPeerConnection() {
    this.instance = RTCPeerConnection(this._config());

    this.instance.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    this.instance.onnegotiationneeded = this.handleNegotiationNeededEvent;
    this.instance.ontrack = this.handleTrackEvent;
    this.instance.addEventListener(
      'connectionstatechange',
      this.handleConnectionStateChange
    );
    this.instance.addEventListener(
      'iceconnectionstatechange',
      this._handleIceConnectionStateChange
    );
    this.instance.addEventListener(
      'icegatheringstatechange',
      this._handleIceGatheringStateChange
    );
    // addstream and MediaStreamEvent are deprecated
    //@ts-expect-error MediaStreamEvent is not defined
    this.instance.addEventListener('addstream', (event: MediaStreamEvent) => {
      this.options.remoteStream = event.stream;
    });
    this._registerPeerEvents(this.instance);
    this._prevConnectionState = this.instance.connectionState;

    // Set ASAP, for applying mid correctly
    if (this.isAnswer) {
      await this._setRemoteDescription({
        sdp: this.options.remoteSdp,
        type: PeerType.Offer,
      });
    }

    this.options.localStream = await this._retrieveLocalStream().catch(
      (error) => {
        trigger(SwEvent.MediaError, error, this.options.id);
        return null;
      }
    );

    if (
      this.options.mutedMicOnStart &&
      streamIsValid(this.options.localStream)
    ) {
      logger.info('Muting local audio tracks on start');
      disableAudioTracks(this.options.localStream);
    }

    performance.mark(`peer-creation-end`);
  }

  private _handleIceConnectionStateChange = () => {
    logger.debug(
      `[${new Date().toISOString()}] ICE Connection State`,
      this.instance.iceConnectionState
    );
  };
  private _handleIceGatheringStateChange = () => {
    logger.debug(
      `[${new Date().toISOString()}] ICE Gathering State`,
      this.instance.iceGatheringState
    );
  };
  async init() {
    await this.createPeerConnection();

    if (this.isDebugEnabled) {
      this.statsReporter = createWebRTCStatsReporter(
        this._session,
        this.options.id
      );

      await this.statsReporter?.start(
        this.instance,
        this._session.sessionid,
        this._session.sessionid
      );
    }

    const {
      localElement,
      localStream = null,
      screenShare = false,
    } = this.options;

    if (streamIsValid(localStream)) {
      const audioTracks = localStream.getAudioTracks();
      let tracks = [...audioTracks];

      logger.info('Local audio tracks: ', audioTracks);

      if (audioIsMediaTrackConstraints(this.options.audio)) {
        // tells whether the constraints used to get the audio track took effect. Browsers may ignore unsupported constraints silently
        audioTracks.forEach((track) => {
          logger.info(
            'Local audio tracks constraints: ',
            track.getConstraints()
          );
        });
      }

      if (!!this.options.video) {
        const videoTracks = localStream.getVideoTracks();
        tracks = [...audioTracks, ...videoTracks];

        logger.info('Local video tracks: ', videoTracks);

        if (videoIsMediaTrackConstraints(this.options.video)) {
          // tells whether the constraints used to get the video track took effect. Browsers may ignore unsupported constraints silently
          videoTracks.forEach((track) => {
            logger.info(
              'Local video tracks constraints: ',
              track.getConstraints()
            );
          });
        }
      }

      const { audioCodecs, videoCodecs } = getPreferredCodecs(
        this.options.preferred_codecs
      );

      if (this.isOffer && typeof this.instance.addTransceiver === 'function') {
        // Use addTransceiver
        const transceiverParams: RTCRtpTransceiverInit = {
          direction: 'sendrecv',
          streams: [localStream],
        };

        tracks.forEach((track) => {
          if (track.kind === 'audio') {
            this.options.userVariables.microphoneLabel = track.label;
          }
          if (track.kind === 'video') {
            this.options.userVariables.cameraLabel = track.label;
          }

          const transceiver = this.instance.addTransceiver(
            track,
            transceiverParams
          );

          if (track.kind === 'audio' && audioCodecs.length > 0) {
            this._setCodecs(transceiver, audioCodecs);
          }

          if (track.kind === 'video' && videoCodecs.length > 0) {
            this._setCodecs(transceiver, videoCodecs);
          }
        });
      } else if (typeof this.instance.addTrack === 'function') {
        // Use addTrack

        tracks.forEach((track) => {
          if (track.kind === 'audio') {
            this.options.userVariables.microphoneLabel = track.label;
          }
          if (track.kind === 'video') {
            this.options.userVariables.cameraLabel = track.label;
          }

          this.instance.addTrack(track, localStream);
        });

        this.instance.getTransceivers().forEach((trans) => {
          if (trans.receiver.track.kind === 'audio' && audioCodecs.length > 0) {
            this._setCodecs(trans, audioCodecs);
          }
          if (trans.receiver.track.kind === 'video' && videoCodecs.length > 0) {
            this._setCodecs(trans, videoCodecs);
          }
        });
      } else {
        // Fallback to legacy addStream ..
        // addStream is deprecated
        // @ts-expect-error addStream does not exist on RTCPeerConnection
        this.instance.addStream(localStream);
      }

      if (screenShare === false) {
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
    } else if (!this._isTrickleIce()) {
      this.startNegotiation();
    }

    if (this._isTrickleIce()) {
      this.startTrickleIceNegotiation();
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

  private async _createOffer() {
    if (!this._isOffer()) {
      return;
    }
    // set default audio true, given value given in session mediaConstraints and call options is may be undefined
    this._constraints.offerToReceiveAudio = this.options.audio !== false;
    this._constraints.offerToReceiveVideo = Boolean(this.options.video);
    logger.info('_createOffer - this._constraints', this._constraints);
    // FIXME: Use https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpTransceiver when available (M71)

    try {
      const offer = await this.instance.createOffer(this._constraints);
      await this._setLocalDescription(offer);

      if (!this._isTrickleIce()) {
        this._sdpReady();
      }

      return offer;
    } catch (error) {
      logger.error('Peer _createOffer error:', error);
    }
  }

  private async _setRemoteDescription(
    remoteDescription: RTCSessionDescriptionInit
  ) {
    logger.debug('Setting remote description', remoteDescription);
    await this.instance.setRemoteDescription(remoteDescription);
  }

  private async _createAnswer() {
    if (!this._isAnswer()) {
      return;
    }
    if (
      this.instance.signalingState !== 'stable' &&
      this.instance.signalingState !== 'have-remote-offer'
    ) {
      logger.debug(
        'Skipping negotiation, state:',
        this.instance.signalingState
      );
      logger.debug(
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

    this._logTransceivers();

    try {
      const answer = await this.instance.createAnswer();
      await this._setLocalDescription(answer);

      return answer;
    } catch (error) {
      logger.error('Peer _createAnswer error:', error);
    }
  }

  private async _setLocalDescription(
    sessionDescription: RTCSessionDescriptionInit
  ) {
    await this.instance.setLocalDescription(sessionDescription);
  }

  private _setCodecs = (
    transceiver: RTCRtpTransceiver,
    codecs: RTCRtpCodecCapability[]
  ) => {
    if (transceiver.setCodecPreferences) {
      return transceiver.setCodecPreferences(codecs);
    }
  };
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

  private _isTrickleIce(): boolean {
    return this.options.trickleIce === true;
  }

  private _config(): RTCConfiguration {
    const { prefetchIceCandidates, forceRelayCandidate, iceServers } =
      this.options;

    const config: RTCConfiguration = {
      bundlePolicy: 'balanced',
      iceCandidatePoolSize: prefetchIceCandidates ? 10 : 0,
      iceServers,
      iceTransportPolicy: forceRelayCandidate ? 'relay' : 'all',
    };

    logger.info('RTC config', config);
    return config;
  }

  /**
   * Only restarts if a stats reporter was previously created (debug was enabled).
   */
  public async restartStatsReporter() {
    if (!this.isDebugEnabled || !this.statsReporter) {
      return;
    }

    if (!this.instance) {
      logger.debug(
        `[${this.options.id}] Cannot restart stats reporter - no peer connection instance`
      );
      return;
    }

    if (this.statsReporter.isRunning) {
      logger.debug(
        `[${this.options.id}] Stats reporter already running, skipping restart`
      );
      return;
    }

    logger.debug(
      `[${this.options.id}] Restarting stats reporter after reconnect`
    );
    await this.statsReporter.start(
      this.instance,
      this._session.sessionid,
      this._session.sessionid
    );
  }

  public async close() {
    if (this._sleepWakeupIntervalId !== null) {
      clearInterval(this._sleepWakeupIntervalId);
      this._sleepWakeupIntervalId = null;
    }
    if (this.isDebugEnabled && this.statsReporter) {
      await this.statsReporter.stop(this.debugOutput);
    }
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}
