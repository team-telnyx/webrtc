import { BaseTransaction } from "./BaseTransaction";
import {
  JanusACKResponse,
  JanusRegisteringEvent,
  JanusResponse,
} from "../messages/response";
import { JanusSIPRegisterRequest } from "../messages/request";
import { Janus } from "../messages/janus";
import { isSipError } from "../util/janus";
import { IClientOptions } from "../types";

export class SIPRegisterTransaction extends BaseTransaction<
  JanusACKResponse | JanusRegisteringEvent,
  JanusSIPRegisterRequest
> {
  constructor(
    options: IClientOptions & { session_id: number; handle_id: number }
  ) {
    const payload: JanusSIPRegisterRequest = {
      janus: Janus.message,
      body: {
        request: "register",
        display_name: options.login ?? "Outbound Call",
      },
      session_id: options.session_id,
      handle_id: options.handle_id,
    };
    if (options.login_token) {
      payload.body.login_token = options.login_token;
    } else if (options.login && options.password) {
      payload.body.login = options.login;
      payload.body.password = options.password;
    }

    super(payload);
  }
  public onMessage(msg: JanusResponse): void {
    if (msg.janus === Janus.error) {
      return this._reject(new Error(msg.error.reason));
    }
    if (isSipError(msg)) {
      return this._reject(new Error(msg.plugindata.data.error));
    }

    if (!("plugindata" in msg)) {
      return;
    }
    
    if (
      msg.janus === Janus.event &&
      msg.plugindata.data.result.event === "registering"
    ) {
      return this._resolve(msg as JanusRegisteringEvent);
    }
  }
}
