import { Janus } from "../messages/janus";
import { JanusKeepAliveRequest } from "../messages/request";
import { JanusResponse } from "../messages/response";
import { BaseTransaction } from "./BaseTransaction";

const KEEP_ALIVE_TIMEOUT = 5000;
export class KeepAliveTransaction extends BaseTransaction<
  boolean,
  JanusKeepAliveRequest
> {
  private _isResolved: false;
  private _timeout: number;
  constructor(gatewaySessionId: number) {
    super({
      janus: Janus.keepAlive,
      session_id: gatewaySessionId,
    });
    this._isResolved = false;
    this._timeout = window.setTimeout(this._onTimeout, KEEP_ALIVE_TIMEOUT);
  }

  private _onTimeout = () => {
    if (this._isResolved) {
      return;
    }
    this._reject();
  };

  public onMessage(msg: JanusResponse): void {
    clearTimeout(this._timeout);
    if (!("janus" in msg)) {
      return;
    }

    if (msg.janus === Janus.error) {
      this._reject();
    }
    if (msg.janus === Janus.ack) {
      this._resolve(true);
    }
  }
}
