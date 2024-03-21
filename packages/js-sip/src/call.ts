import { Session } from "sip.js";
import {
  SessionDescriptionHandler,
  SessionManager,
} from "sip.js/lib/platform/web";
import { SwEvent } from "./constant";
import { eventBus } from "./events";
import { CallState, ICall } from "./types";

export class Call implements ICall {
  public direction: "inbound" | "outbound";
  public prevState: CallState;
  public state: CallState;
  public destinationNumber: string;

  private _session: Session;
  private _sessionManager: SessionManager;

  constructor(
    session: Session,
    manager: SessionManager,
    direction: "inbound" | "outbound",
    destinationNumber: string
  ) {
    session.dialog?.id;
    this._session = session;
    this._sessionManager = manager;
    this.direction = direction;
    this.destinationNumber = destinationNumber;
  }

  public get id() {
    return this._session.id;
  }
  public get localStream(): MediaStream | null {
    return this._sessionManager.getLocalMediaStream(this._session) ?? null;
  }

  public get remoteStream(): MediaStream | null {
    return this._sessionManager.getRemoteMediaStream(this._session) ?? null;
  }

  public telnyxIDs: {};

  public hangup(): Promise<void> {
    return this._sessionManager.hangup(this._session).then(() => {
      this.setState("hangup");
    });
  }

  public setState(nextState: CallState) {
    this.prevState = this.state;
    this.state = nextState;

    eventBus.emit(SwEvent.Notification, { call: this, type: "callUpdate" });
  }

  public answer(): Promise<void> {
    return this._sessionManager.answer(this._session).then(() => {
      this.setState("active");
    });
  }
  public deaf(): void {
    const handler = this._session.sessionDescriptionHandler;
    if (!(handler instanceof SessionDescriptionHandler)) {
      return;
    }
    handler.enableReceiverTracks(false);
  }
  dtmf(dtmf: any): Promise<void> {
    throw new Error("Method not implemented.");
  }
  hold(): Promise<void> {
    return this._sessionManager.hold(this._session);
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
  setVideoDevice(deviceId: any): Promise<void> {
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
    const handler = this._session.sessionDescriptionHandler;
    if (!(handler instanceof SessionDescriptionHandler)) {
      return;
    }
    handler.enableReceiverTracks(true);
  }
  unhold(): Promise<void> {
    return this._sessionManager.unhold(this._session);
  }

  unmuteAudio(): void {
    const handler = this._session.sessionDescriptionHandler;
    if (!(handler instanceof SessionDescriptionHandler)) {
      return;
    }
    handler.enableSenderTracks(true);
  }
  unmuteVideo(): void {
    const handler = this._session.sessionDescriptionHandler;
    if (!(handler instanceof SessionDescriptionHandler)) {
      return;
    }
    handler.enableSenderTracks(true);
  }

  getStats() {
    console.log("getStats");
  }
}
