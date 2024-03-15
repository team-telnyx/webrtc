import { v4 as uuidV4 } from 'uuid';
import Peer from './Peer';
import { transactionManager } from './TransactionManager';
import { ICallOptions } from './interfaces';
import { JanusSIPCallAcceptedEvent } from './messages/response';
import { SIPAnswerTransaction } from './transactions/SIPAnswer';
import { SIPHangupTransaction } from './transactions/SIPHangup';
import { connection } from './Connection';
import { attachMediaStream } from './util/webrtc';

type CallState = 'new' | 'connecting' | 'ringing' | 'active' | 'held' | 'done';

type CallDirection = 'inbound' | 'outbound';

export class Call {
  public peer?: Peer;
  public id: string;
  public direction: CallDirection;
  public state: CallState;
  public options: ICallOptions;

  constructor(options: ICallOptions, direction: CallDirection) {
    this.options = options;
    this.id = this.options.id || uuidV4();
    this.state = 'new';
    this.direction = direction;
  }

  public async closeCall() {
    this.state = 'done';
    await this.peer?.close();
  }

  public hangup = async () => {
    await transactionManager.execute(
      new SIPHangupTransaction({
        handle_id: connection.gatewayHandleId,
        session_id: connection.gatewaySessionId,
      })
    );
  };

  public answer = async () => {
    if (this.direction === 'outbound') {
      return;
    }

    this.peer = await Peer.createAnswer(this.options);
    await transactionManager.execute(
      new SIPAnswerTransaction({
        answer: this.peer.peerConnection.localDescription,
        gatewayHandleId: connection.gatewayHandleId,
        gatewaySessionId: connection.gatewaySessionId,
      })
    );
  };

  public onCallAccepted = async (msg: JanusSIPCallAcceptedEvent) => {
    this.state = 'active';
    if (this.direction === 'outbound') {
      /**
       * Janus uses the same event for both inbound and outbound calls.
       * But in case of an outbound call, the accepted event will include
       * the Response SDP
       */
      await this.peer.onRemoteSDP(msg.jsep);
    }
  };

  public getStats(...args: any[]) {
    // TODO implement
    console.log(arguments);
  }

  set telnyxIds(ids: {
    telnyxCallControlId: string;
    telnyxLegId: string;
    telnyxSessionId: string;
  }) {
    this.options.telnyxCallControlId = ids.telnyxCallControlId;
    this.options.telnyxLegId = ids.telnyxLegId;
    this.options.telnyxSessionId = ids.telnyxSessionId;
  }

  set remoteElement(element: HTMLMediaElement) {
    this.options.remoteElement = element;
    attachMediaStream(element, this.options.remoteStream);
  }
}
