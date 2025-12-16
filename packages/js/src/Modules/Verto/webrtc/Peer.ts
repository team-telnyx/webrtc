import BrowserSession from '../BrowserSession';
import { trigger } from '../services/Handler';
import { GOOGLE_STUN_SERVER, SwEvent, TURN_SERVER } from '../util/constants';
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
  muteMediaElement,
  RTCPeerConnection,
  sdpToJsonHack,
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

const DEVICE_SLEEP_DETECTION_INTERVAL = 1000; // in ms
const DEVICE_SLEEP_DETECTION_THRESHOLD = 5000; // in ms

/**
 * @ignore Hide in docs output
 */
export default class Peer {
  public instance: RTCPeerConnection;
  public onSdpReadyTwice: Function = null;
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

  private handleSignalingStateChangeEvent(event) {
    logger.info('signalingState:', this.instance.signalingState);

    switch (this.instance.signalingState) {
      case 'stable':
        // Workaround to skip nested negotiations
        // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=740501
        this._negotiating = false;
        break;
      case 'closed':
        if (this.keepConnectionAliveOnSocketClose) {
          logger.debug(
            'Keeping peer connection alive due to keepConnectionAliveOnSocketClose option'
          );
          return;
        }
        this.instance = null;
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
    let { remoteStream } = this.options;

    remoteStream = first;

    if (screenShare === false) {
      attachMediaStream(remoteElement, remoteStream);
    }
  }

  private handleConnectionStateChange = async (event: Event) => {
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
         */
        if (!this._restartedIceOnConnectionStateFailed) {
          this.instance.restartIce();

          if (connectionState === 'failed') {
            this._restartedIceOnConnectionStateFailed = true;
            logger.debug('ICE has been restarted on connection state failed.');
          }

          if (this._isTrickleIce()) {
            await this.startTrickleIceNegotiation();
          } else {
            this.startNegotiation();
          }
        } else {
          logger.debug(
            'Peer Connection failed again after ICE restart. Recovering call via peer reconnection through error handling.'
          );
          trigger(
            SwEvent.PeerConnectionFailureError,
            {
              error: new Error(
                `Peer Connection failed twice. previous state: ${this._prevConnectionState}, current state: ${connectionState}`
              ),
              sessionId: this._session.sessionid,
            },
            this.options.id
          );
        }

        window.removeEventListener('online', onConnectionOnline);
      };

      if (navigator.onLine) {
        onConnectionOnline();
      } else {
        window.addEventListener('online', onConnectionOnline);
      }
    }

    // Case 2: connected -> disconnected: Reset audio buffers
    if (
      this._prevConnectionState === 'connected' &&
      connectionState === 'disconnected'
    ) {
      await this._resetJitterBuffer();
    }

    // Case 3: disconnected -> connected: Reset audio buffers
    if (
      this._prevConnectionState === 'disconnected' &&
      connectionState === 'connected'
    ) {
      await this._resetJitterBuffer();
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

    this._restartNegotiationOnDeviceSleepWakeup();
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
    ); //@ts-ignore
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

  private _handleIceConnectionStateChange = (event) => {
    logger.debug(
      `[${new Date().toISOString()}] ICE Connection State`,
      this.instance.iceConnectionState
    );
  };
  private _handleIceGatheringStateChange = (event) => {
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
        // @ts-ignore
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

  private async _resetJitterBuffer() {
    try {
      const jitterBufferTarget = 20; // e.g., 20 ms
      const audioReceiver = this.instance
        .getReceivers()
        .find((r) => r.track && r.track.kind === 'audio');

      const videoReceiver = this.instance
        .getReceivers()
        .find((r) => r.track && r.track.kind === 'video');

      /**
       * Set optimal buffer duration for real-time audio (20ms)
       * This prevents iOS from using large buffers that cause delay
       * https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/jitterBufferTarget. Also, see support
       * https://github.com/team-telnyx/telnyx-webrtc-ios/blob/main/TelnyxRTC/Telnyx/WebRTC/Peer.swift#L522
       */
      if (audioReceiver && 'jitterBufferTarget' in audioReceiver) {
        // @ts-ignore
        audioReceiver.jitterBufferTarget = jitterBufferTarget; // e.g., 20 ms
        logger.debug(
          'audio [jitter] target set to',
          // @ts-ignore
          audioReceiver.jitterBufferTarget,
          'ms'
        );
      }

      if (videoReceiver && 'jitterBufferTarget' in videoReceiver) {
        // @ts-ignore
        videoReceiver.jitterBufferTarget = jitterBufferTarget; // e.g., 20 ms
        logger.debug(
          'video [jitter] target set to',
          // @ts-ignore
          videoReceiver.jitterBufferTarget,
          'ms'
        );
      }
    } catch (error) {
      logger.error('Peer _resetJitterBuffer error:', error);
    }
  }

  /**
   * Detect device sleep/wake up, restart ICE and renegotiate
   */
  private async _restartNegotiationOnDeviceSleepWakeup() {
    if (this._sleepWakeupIntervalId !== null) {
      clearInterval(this._sleepWakeupIntervalId);
      this._sleepWakeupIntervalId = null;
    }

    let lastTime = Date.now();
    this._sleepWakeupIntervalId = setInterval(async () => {
      const now = Date.now();
      if (now - lastTime > DEVICE_SLEEP_DETECTION_THRESHOLD) {
        // If time jumped more than 5s
        logger.warn(
          `Device sleep/wake detected. Time jump: ${
            now - lastTime
          }ms, connectionState: ${this.instance?.connectionState}`
        );

        if (!this.instance) {
          logger.debug('Peer connection closed, skipping ICE restart');
          return;
        }

        logger.info(
          'Restarting ICE and renegotiating due to device wakeup'
        );
        this.instance.restartIce();

        if (this._isTrickleIce()) {
          await this.startTrickleIceNegotiation();
        } else {
          this.startNegotiation();
        }
      }
      lastTime = now;
    }, DEVICE_SLEEP_DETECTION_INTERVAL);
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

  public async close() {
    if (this._sleepWakeupIntervalId !== null) {
      clearInterval(this._sleepWakeupIntervalId);
      this._sleepWakeupIntervalId = null;
    }
    await this.statsReporter?.stop(this.debugOutput);
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}
