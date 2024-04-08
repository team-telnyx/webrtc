import { Janus } from "../messages/janus";
import { JanusSIPUnregisterRequest } from "../messages/request";
import {
  JanusResponse,
  JanusSIPUnregisterResponse,
} from "../messages/response";
import { isSipError } from "../util/janus";
import { BaseTransaction } from "./BaseTransaction";

function isSIPUnregisterResponse(
  msg: JanusResponse
): msg is JanusSIPUnregisterResponse {
  if (!("sip" in msg)) {
    return false;
  }
  return msg.sip === "event" && msg.result.event === "unregistered";
}
export class SIPUnregisterTransaction extends BaseTransaction<
  boolean,
  JanusSIPUnregisterRequest
> {
  constructor({
    handleId,
    sessionId,
  }: {
    sessionId: number;
    handleId: number;
  }) {
    super({
      janus: Janus.message,
      body: { request: "unregister" },
      session_id: sessionId,
      handle_id: handleId,
    });
  }

  public onMessage(msg: JanusResponse): void {
    if (isSIPUnregisterResponse(msg)) {
      return this._resolve?.(true);
    }
    if (isSipError(msg)) {
      return this._reject?.(new Error("Unregister failed"));
    }
  }
}
