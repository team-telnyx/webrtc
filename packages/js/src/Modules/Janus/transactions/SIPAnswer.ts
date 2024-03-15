import { Janus } from '../messages/janus';
import { JanusSIPAnswerRequest } from '../messages/request';
import { JanusResponse } from '../messages/response';
import { isSIPCallAcceptedEvent, isSipError } from '../util/janus';
import { BaseTransaction } from './BaseTransaction';

type AnswerConstructorParams = {
  gatewaySessionId: number;
  gatewayHandleId: number;
  answer: RTCSessionDescriptionInit;
};
export class SIPAnswerTransaction extends BaseTransaction<
  { callId: string },
  JanusSIPAnswerRequest
> {
  constructor({
    answer,
    gatewayHandleId,
    gatewaySessionId,
  }: AnswerConstructorParams) {
    super({
      janus: Janus.message,
      body: {
        request: 'accept',
        autoaccept_reinvites: false,
      },
      jsep: { type: 'answer', sdp: answer.sdp },
      session_id: gatewaySessionId,
      handle_id: gatewayHandleId,
    });
  }
  public onMessage(msg: JanusResponse): void {
    if (isSipError(msg)) {
      return this._reject(new Error(msg.plugindata.data.error));
    }
    if (isSIPCallAcceptedEvent(msg)) {
      return this._resolve({ callId: msg.plugindata.data.call_id });
    }
  }
}
