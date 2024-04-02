import Call from "./Call";
import { connection } from "./Connection";
import { trigger } from "./Handler";
import Peer from "./Peer";
import { transactionManager } from "./TransactionManager";
import { ConnectionEvents, SwEvent } from "./constants";
import {
  JanusResponse,
  JanusSIPCallAcceptedEvent,
  JanusSIPHangupEvent,
  JanusSIPIncomingCallEvent,
} from "./messages/response";
import { SIPCallTransaction } from "./transactions/SIPCall";
import { ICallOptions } from "./types";
import {
  isSIPCallAcceptedEvent,
  isSIPIncomingCallMessage,
  isSipHangupEvent,
} from "./util/janus";
import { createAudioElement } from "./util/media";

type CallAgentConstructorOptions = {
  ringbackFile?: string;
  ringtoneFile?: string;
  localElement?: HTMLMediaElement | null;
  remoteElement?: HTMLMediaElement | null;
};

export default class CallAgent {
  private ringbackAudio: HTMLAudioElement;
  private ringtoneAudio: HTMLAudioElement;
  public localElement: HTMLMediaElement | null;
  public remoteElement: HTMLMediaElement | null;
  public defaultMediaConstrains: MediaStreamConstraints;
  public calls: Record<string, Call>;

  constructor({
    ringbackFile = "",
    ringtoneFile = "",
    localElement = null,
    remoteElement = null,
  }: CallAgentConstructorOptions) {
    this.localElement = localElement;
    this.remoteElement = remoteElement;
    this.ringbackAudio = createAudioElement(ringbackFile);
    this.ringtoneAudio = createAudioElement(ringtoneFile);
    this.calls = {};
    this.defaultMediaConstrains = { audio: true, video: true };

    connection.addListener(ConnectionEvents.Message, this._onMessage);
  }

  private _onMessage = (rawMessage: string) => {
    const msg = JSON.parse(rawMessage) as JanusResponse;
    if (isSIPIncomingCallMessage(msg)) {
      return this._onInboundCall(msg);
    }

    if (isSipHangupEvent(msg)) {
      return this._onHangup(msg);
    }

    if (isSIPCallAcceptedEvent(msg)) {
      return this._onCallAccepted(msg);
    }
  };

  private _onInboundCall = async (msg: JanusSIPIncomingCallEvent) => {
    const options: ICallOptions = {
      id: msg.plugindata.data.call_id,
      destinationNumber: msg.plugindata.data.result.callee,
      callerName: msg.plugindata.data.result.displayname,
      callerNumber: msg.plugindata.data.result.callee,
      telnyxLegId: msg.plugindata.data.result.headers["X-Telnyx-Leg-ID"],
      telnyxCallControlId:
        msg.plugindata.data.result.headers["X-Telnyx-Call-Control-ID"],
      telnyxSessionId:
        msg.plugindata.data.result.headers["X-Telnyx-Session-ID"],
      audio: Boolean(this.defaultMediaConstrains.audio),
      video: Boolean(this.defaultMediaConstrains.video),
      remoteElement: this.remoteElement ?? undefined,
      localElement: this.localElement ?? undefined,
    };
    const call = new Call(options, "inbound", msg.jsep);
    this.calls[call.id] = call;
    call.setState("ringing");
  };

  private _onHangup = async (msg: JanusSIPHangupEvent) => {
    const call = this.calls[msg.plugindata.data.call_id];
    if (!call) {
      return;
    }
    await call.hangup(false);
    delete this.calls[msg.plugindata.data.call_id];
  };

  private _onCallAccepted = async (msg: JanusSIPCallAcceptedEvent) => {
    const call = this.calls[msg.plugindata.data.call_id];

    if (!call) {
      return;
    }

    if (msg.jsep && call.peer?.peerType == "offer") {
      await call.peer?.setRemoteDescription(msg.jsep);
    }

    call.setState("active");
  };

  public newCall = async (options: ICallOptions) => {
    if (!connection.gatewaySessionId || !connection.gatewayHandleId) {
      throw new Error("Connection not ready");
    }

    const call = new Call(options, "outbound");
    this.calls[call.id] = call;
    call.peer = await Peer.createOffer(call.options);
    try {
      const ids = await transactionManager.execute(
        new SIPCallTransaction({
          callId: call.id,
          uri: options.destinationNumber,
          session_id: connection.gatewaySessionId,
          handle_id: connection.gatewayHandleId,
          jsep: call.peer.connection.localDescription!,
        })
      );
      call.telnyxIDs = ids;
      call.setState("ringing");
    } catch (error) {
      trigger(SwEvent.Error, error);
    }

    return call;
  };
}
