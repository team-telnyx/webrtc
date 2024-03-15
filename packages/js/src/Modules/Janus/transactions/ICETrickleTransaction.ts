import { Janus } from '../messages/janus';
import { JanusICETrickleRequest } from '../messages/request';
import { JanusResponse } from '../messages/response';
import { BaseTransaction } from './BaseTransaction';

type ICETrickleTransactionOptions = {
  candidate: RTCIceCandidate | null;
  session_id: number;
  handle_id: number;
};

export class ICETrickleTransaction extends BaseTransaction<
  boolean,
  JanusICETrickleRequest
> {
  constructor({
    candidate,
    handle_id,
    session_id,
  }: ICETrickleTransactionOptions) {
    super({
      janus: Janus.trickle,
      candidate: candidate ?? { completed: true },
      session_id: session_id,
      handle_id: handle_id,
    });
  }
  public onMessage(msg: JanusResponse): void {
    if (msg.janus === Janus.ack) {
      return this._resolve(true);
    }
    if (msg.janus === Janus.error) {
      return this._reject(new Error(msg.error.reason));
    }
  }
}
