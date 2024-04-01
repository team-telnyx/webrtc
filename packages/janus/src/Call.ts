import { connection } from "./Connection";
import { trigger } from "./Handler";
import Peer from "./Peer";
import { transactionManager } from "./TransactionManager";
import { SwEvent } from "./constants";
import { SIPAnswerTransaction } from "./transactions/SIPAnswer";
import { SIPHangupTransaction } from "./transactions/SIPHangup";
import { CallState, ICall, ICallOptions } from "./types";
import { v4 as uuid } from "uuid";

type CallDirection = "inbound" | "outbound";
type TelnyxIds = {
  telnyxCallControlId?: string;
  telnyxLegId?: string;
  telnyxSessionId?: string;
};
export default class Call implements ICall {
  public peer: Peer | null;
  public options: ICallOptions;

  private _offerSDP?: RTCSessionDescriptionInit;

  direction: CallDirection;
  prevState: CallState;
  state: CallState;

  constructor(
    options: ICallOptions,
    direction: CallDirection,
    offerSDP: RTCSessionDescriptionInit | undefined = undefined
  ) {
    this.peer = null;
    this.direction = direction;
    this.state = "new";
    this.prevState = "new";
    this.options = options;
    this.options.id = options.id ?? uuid();
    this._offerSDP = offerSDP;
  }

  public setState = (state: CallState) => {
    this.prevState = this.state;
    this.state = state;
    trigger(SwEvent.Notification, { type: "callUpdate", call: this });
  };

  public get localStream(): MediaStream | null {
    return this.options.localStream ?? null;
  }

  public get remoteStream(): MediaStream | null {
    return this.options.remoteStream ?? null;
  }

  public get telnyxIDs() {
    return {
      telnyxCallControlId: this.options.telnyxCallControlId,
      telnyxLegId: this.options.telnyxLegId,
      telnyxSessionId: this.options.telnyxSessionId,
    };
  }

  public set telnyxIDs({
    telnyxCallControlId,
    telnyxLegId,
    telnyxSessionId,
  }: TelnyxIds) {
    this.options.telnyxCallControlId = telnyxCallControlId;
    this.options.telnyxLegId = telnyxLegId;
    this.options.telnyxSessionId = telnyxSessionId;
  }

  public get destinationNumber() {
    return this.options.destinationNumber;
  }

  public onCallAccepted = () => {};

  public get id() {
    if (!this.options.id) {
      throw new Error("Call id is not set");
    }
    return this.options.id;
  }

  public set id(id: string) {
    this.options.id = id;
  }

  hangup = async (executeTransaction: boolean = true): Promise<void> => {
    if (executeTransaction) {
      if (!connection.gatewayHandleId || !connection.gatewaySessionId) {
        throw new Error("Gateway handle or session id not found");
      }
      try {
        await transactionManager.execute(
          new SIPHangupTransaction({
            handle_id: connection.gatewayHandleId,
            session_id: connection.gatewaySessionId,
          })
        );
      } catch (err) {
        console.error(err);
      }
    }

    await this.peer?.close();
    this.setState("hangup");
  };

  answer = async (): Promise<void> => {
    if (this.direction === "outbound") {
      throw new Error("Cannot answer an outbound call");
    }
    if (!this._offerSDP) {
      throw new Error("Did not receive offer");
    }

    if (!connection.gatewayHandleId || !connection.gatewaySessionId) {
      throw new Error("Gateway handle or session id not found");
    }

    this.peer = await Peer.createAnswer(this.options, this._offerSDP);

    try {
      await transactionManager.execute(
        new SIPAnswerTransaction({
          answer: this.peer.peerConnection.localDescription!,
          gatewayHandleId: connection.gatewayHandleId,
          gatewaySessionId: connection.gatewaySessionId,
        })
      );
      this.setState("active");
    } catch (error) {}
  };

  deaf(): void {
    throw new Error("Method not implemented.");
  }
  dtmf(dtmf: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  hold(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  muteAudio(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  muteVideo(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  setAudioInDevice(deviceId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  setAudioOutDevice(deviceId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  setVideoDevice(deviceId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  toggleAudioMute(): void {
    throw new Error("Method not implemented.");
  }
  toggleDeaf(): void {
    throw new Error("Method not implemented.");
  }
  toggleHold(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  toggleVideoMute(): void {
    throw new Error("Method not implemented.");
  }
  undeaf(): void {
    throw new Error("Method not implemented.");
  }
  unhold(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  unmuteAudio(): void {
    throw new Error("Method not implemented.");
  }
  unmuteVideo(): void {
    throw new Error("Method not implemented.");
  }
}
