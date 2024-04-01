import { connection } from "./Connection";
import { trigger } from "./Handler";
import { transactionManager } from "./TransactionManager";
import { ConnectionEvents, SwEvent } from "./constants";
import { IClientOptions } from "./types";
import { Janus } from "./messages/janus";
import { JanusResponse } from "./messages/response";
import { SIPRegisterTransaction } from "./transactions/SIPRegister";
import { isSipError } from "./util/janus";
import { SIPUnregisterTransaction } from "./transactions/SIPUnregister";

type RegistrationState =
  | "unregistered"
  | "registered"
  | "error"
  | "registering";

export class SIPRegistrationAgent {
  public state: RegistrationState;

  constructor() {
    this.state = "unregistered";
    connection.addListener(ConnectionEvents.Message, this._onMessage);
  }

  private _onMessage = (msg: string) => {
    const data = JSON.parse(msg) as JanusResponse;

    if (isSipError(data)) {
      this.state = "error";
      trigger(SwEvent.Error, new Error(data.plugindata.data.error));
      return;
    }

    if (!("janus" in data) || !("plugindata" in data)) {
      return;
    }

    if (
      data.janus === Janus.event &&
      data.plugindata.data.result.event === "registered"
    ) {
      this._setState("registered");
      trigger(SwEvent.Ready, connection);
    }
  };

  private _setState = (state: RegistrationState) => {
    this.state = state;
    trigger(SwEvent.RegisterStateChange, this.state);
  };

  async register(options: IClientOptions): Promise<RegistrationState> {
    if (this.state === "registering") {
      return this.state;
    }

    if (
      !connection.connected ||
      !connection.gatewaySessionId ||
      !connection.gatewayHandleId
    ) {
      return this.state;
    }

    try {
      await transactionManager.execute(
        new SIPRegisterTransaction({
          ...options,
          session_id: connection.gatewaySessionId,
          handle_id: connection.gatewayHandleId,
        })
      );
      this._setState("registering");
    } catch (error) {
      this._setState("error");
    } finally {
      return this.state;
    }
  }

  async unregister() {
    await transactionManager.execute(new SIPUnregisterTransaction());
    connection.removeListener(ConnectionEvents.Message, this._onMessage);
    this._setState("unregistered");
  }
}
