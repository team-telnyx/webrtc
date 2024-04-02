import { connection } from "./Connection";
import { transactionManager } from "./TransactionManager";
import { STUN_SERVER, TURN_SERVER } from "./constants";
import { ICETrickleTransaction } from "./transactions/ICETrickleTransaction";
import { ICallOptions } from "./types";
import { DeferredPromise, deferredPromise } from "./util/promise";

type PeerType = "offer" | "answer";
export default class Peer {
  public static createOffer = async (options: ICallOptions) => {
    const peer = new Peer(options, "offer");
    await peer._setupLocalStream();
    await peer._offerIsReady?.promise;
    return peer;
  };

  public static createAnswer = async (
    options: ICallOptions,
    remoteSDP: RTCSessionDescriptionInit
  ) => {
    const peer = new Peer(options, "answer");
    await peer._setupLocalStream();
    await peer.setRemoteDescription(remoteSDP);
    return peer;
  };

  private _callOptions: ICallOptions;
  private _offerIsReady: DeferredPromise<boolean> | null;
  public connection: RTCPeerConnection;
  public peerType: PeerType;

  constructor(options: ICallOptions, peerType: PeerType) {
    this._offerIsReady = null;
    this._callOptions = options;
    this.peerType = peerType;

    if (this.peerType === "offer") {
      this._offerIsReady = deferredPromise<boolean>();
    }

    if (!this._callOptions.localStream) {
      this._callOptions.localStream = new MediaStream();
    }

    if (!this._callOptions.remoteStream) {
      this._callOptions.remoteStream = new MediaStream();
    }

    this.connection = this._createConnection();
  }

  public setRemoteDescription = async (
    description: RTCSessionDescriptionInit
  ) => {
    const sdp = new RTCSessionDescription(description);
    if (this.peerType === "offer") {
      await this.connection.setRemoteDescription(sdp);
      return;
    }
    await this.connection.setRemoteDescription(sdp);
    await this.connection.createAnswer().then((answer) => {
      this.connection.setLocalDescription(answer);
    });
  };

  private _createConnection() {
    const customIceServers = this._callOptions.iceServers ?? [];
    const pc = new RTCPeerConnection({
      bundlePolicy: "max-compat",
      iceServers: [...customIceServers, STUN_SERVER, TURN_SERVER],
    });

    if (this.peerType === "offer") {
      pc.addEventListener("negotiationneeded", this._startOffer);
    }
    pc.addEventListener("track", this._onTrack);
    pc.addEventListener("icecandidate", this._onIceCandidate);
    pc.addEventListener("iceconnectionstatechange", (ev) => {
      console.log("iceconnectionstatechange", pc.iceConnectionState);
    });
    return pc;
  }

  private _startOffer = async () => {
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    this._offerIsReady?.resolve(true);
  };

  private _setupLocalStream = async () => {
    const constrains: MediaStreamConstraints = {
      audio: this._callOptions.audio ?? true,
      video: this._callOptions.video ?? false,
    };
    // TODO add support for specific devices
    const stream = await navigator.mediaDevices
      .getUserMedia(constrains)
      .then((stream) => stream)
      .catch((err) => null);

    const tracks = stream?.getTracks() ?? [];

    tracks.forEach((track) => {
      this._callOptions.localStream?.addTrack(track);
      this.connection.addTrack(track);
    });

    return constrains;
  };

  private _onIceCandidate = async (event: RTCPeerConnectionIceEvent) => {
    if (!connection.gatewayHandleId || !connection.gatewaySessionId) {
      throw new Error("Gateway Session Not Established");
    }
    await transactionManager.execute(
      new ICETrickleTransaction({
        handle_id: connection.gatewayHandleId,
        session_id: connection.gatewaySessionId,
        candidate: event.candidate,
      })
    );
  };

  private _onTrack = (event: RTCTrackEvent) => {
    if (this._callOptions.remoteStream == null) {
      this._callOptions.remoteStream = new MediaStream();
    }
    this._callOptions.remoteStream.addTrack(event.track);
  };

  public close() {
    this._callOptions.localStream?.getTracks().forEach((track) => track.stop());
    this.connection.close();
  }
}
