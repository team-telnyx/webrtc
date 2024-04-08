import { Janus } from "../messages/janus";
import { JanusSIPCallRequest } from "../messages/request";
import { JanusResponse } from "../messages/response";
import { isSipError, isSipRingingEvent } from "../util/janus";
import { BaseTransaction } from "./BaseTransaction";

type SIPCallTransactionOptions = {
  callId: string;
  uri: string;
  session_id: number;
  handle_id: number;
  headers?: Record<string, unknown>;
  jsep: RTCSessionDescriptionInit;
};

export class SIPCallTransaction extends BaseTransaction<
  {
    callId: string;
    telnyxLegId: string;
    telnyxCallControlId: string;
    telnyxSessionId: string;
  },
  JanusSIPCallRequest
> {
  constructor(options: SIPCallTransactionOptions) {
    super({
      session_id: options.session_id,
      handle_id: options.handle_id,
      janus: Janus.message,
      body: {
        request: "call",
        call_id: options.callId,
        uri: options.uri,
        headers: options.headers,
      },
      jsep: options.jsep,
    });
  }

  public onMessage(msg: JanusResponse): void {
    if (isSipError(msg)) {
      return this._reject(new Error(msg.plugindata.data.error));
    }

    if (isSipRingingEvent(msg)) {
      return this._resolve({
        callId: msg.plugindata.data.call_id,
        telnyxLegId: msg.plugindata.data.result.headers["X-Telnyx-Leg-ID"],
        telnyxCallControlId:
          msg.plugindata.data.result.headers["X-Telnyx-Call-Control-ID"],
        telnyxSessionId:
          msg.plugindata.data.result.headers["X-Telnyx-Session-ID"],
      });
    }
  }
}
