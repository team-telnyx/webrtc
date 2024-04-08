import { Janus } from "../messages/janus";
import { JanusSIPHoldCallRequest } from "../messages/request";
import { JanusResponse, JanusSIPHoldingResponse } from "../messages/response";
import { isSipError } from "../util/janus";
import { BaseTransaction } from "./BaseTransaction";

function isSIPHoldingEvent(msg: JanusResponse): msg is JanusSIPHoldingResponse {
  if (!("plugindata" in msg)) {
    return false;
  }
  return (
    msg.janus === Janus.event &&
    msg.plugindata.data.sip === "event" &&
    msg.plugindata.data.result?.event === "holding"
  );
}

type ConstructorParams = {
  sessionId: number;
  handlerId: number;
};

export class SIPHoldTransaction extends BaseTransaction<
  boolean,
  JanusSIPHoldCallRequest
> {
  constructor({ handlerId, sessionId }: ConstructorParams) {
    super({
      handle_id: handlerId,
      session_id: sessionId,
      janus: Janus.message,

      body: {
        direction: "sendonly",
        request: "hold",
      },
    });
  }

  public onMessage(msg: JanusResponse): void {
    if (isSIPHoldingEvent(msg)) {
      return this._resolve(true);
    }

    if (isSipError(msg)) {
      return this._reject(new Error(msg.plugindata.data.error));
    }
  }
}
