import { Janus } from '../messages/janus';
import { JanusSIPHangupRequest } from '../messages/request';
import { JanusResponse } from '../messages/response';
import { isSipHangupEvent } from '../util/janus';
import { BaseTransaction } from './BaseTransaction';

type SIPHangupTransactionOptions = {
  session_id: number;
  handle_id: number;
};
export class SIPHangupTransaction extends BaseTransaction<
  boolean,
  JanusSIPHangupRequest
> {
  constructor({ session_id, handle_id }: SIPHangupTransactionOptions) {
    super({
      janus: Janus.message,
      body: { request: 'hangup' },
      session_id: session_id,
      handle_id: handle_id,
    });
  }

  public onMessage(msg: JanusResponse): void {
    if (msg.janus === Janus.error) {
      return this._reject(new Error(msg.error.reason));
    }
    if (msg.janus === Janus.ack) {
      return this._resolve(true);
    }
  }
}
