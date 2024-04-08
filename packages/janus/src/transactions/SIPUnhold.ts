import { Janus } from "../messages/janus";
import { JanusSIPUnholdCallRequest } from "../messages/request";
import { JanusResponse, JanusSIPResumingResponse } from "../messages/response";
import { isSipError } from "../util/janus";
import { BaseTransaction } from "./BaseTransaction";

function isSIPResumingEvent(
  msg: JanusResponse
): msg is JanusSIPResumingResponse {
  if (!("plugindata" in msg)) {
    return false;
  }
  return (
    msg.janus === Janus.event &&
    msg.plugindata.data.sip === "event" &&
    msg.plugindata.data.result?.event === "resuming"
  );
}

type ConstructorParams = {
  sessionId: number;
  handlerId: number;
};
export class SIPUnholdTransaction extends BaseTransaction<
  boolean,
  JanusSIPUnholdCallRequest
> {
  constructor(params: ConstructorParams) {
    super({
      handle_id: params.handlerId,
      session_id: params.sessionId,
      body: { request: "unhold" },
      janus: Janus.message,
    });
  }

  public onMessage(msg: JanusResponse): void {
    if (isSIPResumingEvent(msg)) {
      return this._resolve(true);
    }
    if (isSipError(msg)) {
      return this._reject(new Error(msg.plugindata.data.error));
    }
  }
}
