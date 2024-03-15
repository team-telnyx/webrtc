import { muteMediaElement } from '../Verto/util/webrtc';
import { connection } from './Connection';
import { trigger } from './Handler';
import { transactionManager } from './TransactionManager';
import { SwEvent } from './constants';
import { ICallOptions } from './interfaces';
import { ICETrickleTransaction } from './transactions/ICETrickleTransaction';
import { DeferredPromise, deferredPromise } from './util/promise';
import { attachMediaStream } from './util/webrtc';

type PeerType = 'offer' | 'answer';

export default class Peer {
  public type: PeerType;
  private _callOptions: ICallOptions;
  public peerConnection: RTCPeerConnection;
  public offerIsReady: DeferredPromise<boolean>;

  static async createOffer(options: ICallOptions): Promise<Peer> {
    const peer = new Peer(options, 'offer');
    await peer._setupLocalStream();
    await peer.offerIsReady.promise;
    return peer;
  }

  static async createAnswer(options: ICallOptions): Promise<Peer> {
    if (!options.remoteSdp) {
      throw new Error('Cannot create answer without offer');
    }

    const peer = new Peer(options, 'answer');
    await peer._setupLocalStream();
    await peer.onRemoteSDP(options.remoteSdp);

    return peer;
  }

  constructor(callOptions: ICallOptions, peerType: PeerType) {
    this._callOptions = callOptions;
    this.type = peerType;
    this.peerConnection = this._createRTCPeerConnection();
  }

  private _getStreamConstraints = (): MediaStreamConstraints => {
    let audio: MediaStreamConstraints['audio'] =
      this._callOptions.audio != null ? this._callOptions.audio : true;
    let video: MediaStreamConstraints['video'] =
      this._callOptions.video != null ? this._callOptions.video : false;

    if (this._callOptions.micId) {
      audio = { deviceId: this._callOptions.micId };
    }
    if (this._callOptions.camId) {
      video = { deviceId: this._callOptions.camId };
    }

    return {
      audio,
      video,
    };
  };

  private _setupLocalStream = async () => {
    const stream = await navigator.mediaDevices
      .getUserMedia(this._getStreamConstraints())
      .then((stream) => stream)
      .catch((reason) => {
        trigger(SwEvent.MediaError, reason);
        return null;
      });

    this._callOptions.localStream = stream;

    if (this._callOptions.localStream == null) {
      return;
    }

    this._addStreamTracks(this._callOptions.localStream);
    muteMediaElement(this._callOptions.localElement);
    attachMediaStream(
      this._callOptions.localElement,
      this._callOptions.localStream
    );
    return stream;
  };

  private _addStreamTracks = (stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    audioTracks.forEach((track) => {
      this.peerConnection.addTrack(track, stream);
    });
    videoTracks.forEach((track) => {
      this.peerConnection.addTrack(track, stream);
    });
  };

  private _createRTCPeerConnection(): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection({
      bundlePolicy: 'max-compat',
      // TODO pass user defined iceServers
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    if (this.type === 'offer') {
      peerConnection.addEventListener(
        'negotiationneeded',
        this._onNegotiationNeeded
      );
      this.offerIsReady = deferredPromise<boolean>();
    }
    peerConnection.addEventListener('track', this._onTrackEvent);
    peerConnection.addEventListener('icecandidate', this._onIceCandidate);

    return peerConnection;
  }

  private _onIceCandidate = async (event: RTCPeerConnectionIceEvent) => {
    await transactionManager.execute(
      new ICETrickleTransaction({
        handle_id: connection.gatewayHandleId,
        session_id: connection.gatewaySessionId,
        candidate: event.candidate,
      })
    );
  };
  private _onNegotiationNeeded = async () => {
    await this.peerConnection
      .createOffer({
        offerToReceiveAudio: Boolean(this._callOptions.audio),
        offerToReceiveVideo: Boolean(this._callOptions.video),
      })
      .then((offer) => this.peerConnection.setLocalDescription(offer))
      .then(() => this.offerIsReady.resolve(true))
      .catch((error) => this.offerIsReady.reject(error));
  };

  public onRemoteSDP = async (sdp: RTCSessionDescriptionInit) => {
    if (this.type === 'offer') {
      return await this.peerConnection.setRemoteDescription(sdp);
    }
    await this.peerConnection.setRemoteDescription(sdp);
    await this.peerConnection.setLocalDescription(
      await this.peerConnection.createAnswer()
    );
  };

  public close() {
    this._callOptions.localStream.getTracks().forEach((track) => track.stop());
    this.peerConnection.close();
    this.peerConnection = null;
  }

  private _onTrackEvent = (event: RTCTrackEvent) => {
    const [stream] = event.streams;
    this._callOptions.remoteStream = stream;
    debugger
    attachMediaStream(
      this._callOptions.remoteElement,
      this._callOptions.remoteStream
    );
  };
}
