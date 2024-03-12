import { createAudio, playAudio, stopAudio } from '../Verto/webrtc/helpers';
import { IAudio } from '../Verto/webrtc/interfaces';
import { Call } from './Call';
import { Connection } from './Connection';
import { trigger } from './Handler';
import Peer from './Peer';
import { transactionManager } from './TransactionManager';
import { ConnectionEvents, SwEvent } from './constants';
import { ICallOptions } from './interfaces';
import {
  JanusResponse,
  JanusSIPCallAcceptedEvent,
  JanusSIPHangupEvent,
  JanusSIPIncomingCallEvent,
} from './messages/response';
import { SIPCallTransaction } from './transactions/SIPCall';
import {
  isSIPCallAcceptedEvent,
  isSIPIncomingCallMessage,
  isSipHangupEvent,
} from './util/janus';
import { findElementByType } from './util/webrtc';

type CallAgentOptions = {
  connection: Connection;
  gatewaySessionId: number;
  gatewayHandleId: number;
  ringtoneFile?: string;
  ringbackFile?: string;
};

export default class CallAgent {
  private _calls: Map<string, Call>;
  private _connection: Connection;
  private _gatewaySessionId: number;
  private _gatewayHandleId: number;
  // TODO move from verto
  private _ringtone: IAudio;
  private _ringback: IAudio;
  private _remoteElement: HTMLMediaElement | null;

  constructor({
    connection,
    gatewaySessionId,
    gatewayHandleId,
    ringbackFile,
    ringtoneFile,
  }: CallAgentOptions) {
    this._calls = new Map();
    this._connection = connection;
    this._gatewayHandleId = gatewayHandleId;
    this._gatewaySessionId = gatewaySessionId;
    this._connection.addListener(ConnectionEvents.Message, this._onMessage);
    this._connection.addListener(
      ConnectionEvents.StateChange,
      this._onConnectionStateChange
    );
    this._ringtone = createAudio(ringtoneFile, '_ringtone');
    this._ringback = createAudio(ringbackFile, '_ringback');
  }

  private _onConnectionStateChange = async () => {
    if (!this._connection.isDead) {
      await Promise.all(
        Object.values(this._calls).map((call: Call) => call.closeCall())
      );
      this._calls.clear();
    }
  };
  private _onMessage = (data: string) => {
    const msg = JSON.parse(data) as JanusResponse;
    if (isSIPIncomingCallMessage(msg)) {
      return this._onIncomingCall(msg);
    }
    if (isSipHangupEvent(msg)) {
      return this._onHangup(msg);
    }
    if (isSIPCallAcceptedEvent(msg)) {
      return this._onAccept(msg);
    }
  };

  private _onHangup = async (msg: JanusSIPHangupEvent) => {
    const call = this._calls.get(msg.plugindata.data.call_id);
    if (!call) {
      return;
    }
    await call.closeCall();
    trigger(SwEvent.Notification, {
      type: 'callUpdate',
      call,
    });
    this._calls.delete(call.id);
  };
  private _onAccept = async (msg: JanusSIPCallAcceptedEvent) => {
    const call = this._calls.get(msg.plugindata.data.call_id);
    if (!call) {
      return;
    }
    stopAudio(this._ringback);
    stopAudio(this._ringtone);
    await call.onCallAccepted(msg);
    trigger(SwEvent.Notification, {
      type: 'callUpdate',
      call,
    });
  };
  private _onIncomingCall = (msg: JanusSIPIncomingCallEvent) => {
    return this.Inbound(msg);
  };

  public async Outbound(options: ICallOptions) {
    const call = new Call(options, 'outbound');
    this._calls.set(call.id, call);
    call.peer = await Peer.createOffer({
      handleId: this._gatewayHandleId,
      sessionId: this._gatewaySessionId,
      remoteElement: this._remoteElement,
      ...options,
    });
    try {
      const { callId, telnyxCallControlId, telnyxLegId, telnyxSessionId } =
        await transactionManager.execute(
          new SIPCallTransaction({
            callId: call.id,
            uri: options.destinationNumber,
            session_id: options.sessionId,
            handle_id: options.handleId,
            jsep: call.peer.peerConnection.localDescription,
          })
        );

      call.state = 'ringing';
      playAudio(this._ringback);
      call.id = callId;
      call.telnyxIds = {
        telnyxCallControlId,
        telnyxLegId,
        telnyxSessionId,
      };
      debugger;
      trigger(SwEvent.Notification, {
        type: 'callUpdate',
        call,
      });
    } catch (error) {
      trigger(SwEvent.Error, error);
    }
  }

  private Inbound(msg: JanusSIPIncomingCallEvent) {
    const callOptions: ICallOptions = {
      id: msg.plugindata.data.result.call_id,
      destinationNumber: msg.plugindata.data.result.callee,
      sessionId: msg.session_id,
      handleId: msg.sender,
      callerName: msg.plugindata.data.result.displayname,
      callerNumber: msg.plugindata.data.result.callee,
      telnyxCallControlId:
        msg.plugindata.data.result.headers['X-Telnyx-Call-Control-Id'],
      telnyxLegId: msg.plugindata.data.result.headers['X-Telnyx-Leg-Id'],
      telnyxSessionId:
        msg.plugindata.data.result.headers['X-Telnyx-Session-Id'],
      remoteSdp: msg.jsep,
      remoteElement: this._remoteElement,
    };
    const call = new Call(callOptions, 'inbound');
    call.state = 'ringing';
    this._calls.set(call.id, call);
    playAudio(this._ringtone);
    trigger(SwEvent.Notification, {
      type: 'callUpdate',
      call,
    });
  }

  get calls() {
    return Object.fromEntries(this._calls.entries());
  }

  set remoteElement(
    element: HTMLMediaElement | string | (() => HTMLMediaElement)
  ) {
    this._remoteElement = findElementByType(element);
  }
}
