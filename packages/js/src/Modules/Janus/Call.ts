import { v4 as uuidV4 } from 'uuid';
import Peer from './Peer';
import { transactionManager } from './TransactionManager';
import { ICallOptions } from './interfaces';
import { JanusSIPCallAcceptedEvent } from './messages/response';
import { SIPAnswerTransaction } from './transactions/SIPAnswer';
import { SIPHangupTransaction } from './transactions/SIPHangup';

type CallState = 'new' | 'connecting' | 'ringing' | 'active' | 'held' | 'done';

type CallDirection = 'inbound' | 'outbound';

export class Call {
  public peer?: Peer;
  public id: string;
  public direction: CallDirection;
  public state: CallState;
  private _options: ICallOptions;

  constructor(options: ICallOptions, direction: CallDirection) {
    this._options = options;
    this.id = this._options.id || uuidV4();
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
        handle_id: this._options.handleId,
        session_id: this._options.sessionId,
      })
    );
  };

  public answer = async () => {
    if (this.direction === 'outbound') {
      return;
    }

    this.peer = await Peer.createAnswer(this._options);
    await transactionManager.execute(
      new SIPAnswerTransaction({
        answer: this.peer.peerConnection.localDescription,
        gatewayHandleId: this._options.handleId,
        gatewaySessionId: this._options.sessionId,
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
    this._options.telnyxCallControlId = ids.telnyxCallControlId;
    this._options.telnyxLegId = ids.telnyxLegId;
    this._options.telnyxSessionId = ids.telnyxSessionId;
  }
}
