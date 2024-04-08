import { Janus } from "../messages/janus";
import { JanusSIPDTMFRequest } from "../messages/request";
import { JanusResponse } from "../messages/response";
import { BaseTransaction } from "./BaseTransaction";

type DTMFConstructorParams = {
  digit: string;
  gatewaySessionId: number;
  gatewayHandleId: number;
};

export class SIPDTMFTransaction extends BaseTransaction<
  boolean,
  JanusSIPDTMFRequest
> {
  constructor({
    digit,
    gatewayHandleId,
    gatewaySessionId,
  }: DTMFConstructorParams) {
    super({
      janus: Janus.message,
      body: {
        request: "dtmf_info",
        digit,
      },
      session_id: gatewaySessionId,
      handle_id: gatewayHandleId,
    });
  }
  public onMessage(_msg: JanusResponse): void {
    this._resolve(true);
  }
}
