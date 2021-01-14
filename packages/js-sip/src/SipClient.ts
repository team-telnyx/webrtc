import { ISIPClientOptions, ICallOptions } from "../../js/src/utils/interfaces";

import SIP from "sip.js";

import BaseClient from "../../js/src/BaseClient";
import SipCall from "./SipCall";

const HOST = "sip.telnyx.com";
const PORT = 7443;

const getDeviceString = (input: string | Boolean): string => {
  if (input instanceof Boolean) {
    return input ? "any" : "none";
  }

  return input;
};

/**
 * @hidden
 */
export default class SipClient extends BaseClient {
  protected sip: SIP.Web.Simple;

  constructor(o?: ISIPClientOptions) {
    super(o);
    this.host = this.host || HOST;
    this.port = this.port || PORT;
  }

  connect() {
    const emitCallUpdate = (session, isIncoming) => {
      this.eventBus.emit(
        "callUpdate",
        new SipCall(this.sip, session, isIncoming)
      );
    };

    this.sip = new SIP.Web.Simple({
      media: {
        remote: {
          video: this.useCamera && this.remoteElement,
          audio: this.remoteElement,
        },
        local: {
          video: this.localElement,
        },
      },

      ua: {
        uri: `${this.credentials.username}@${this.host}`,
        password: this.credentials.token || this.credentials.password,
        displayName: this.displayName,
        wsServers: `wss://${this.host}:${this.port}`,
      },
    })
      .on("registered", () => {
        this.eventBus.emit("ready");
        this.eventBus.emit("registered");
      })
      .on("unregistered", () => {
        this.eventBus.emit("unregistered");
      })
      .on("connected", emitCallUpdate)
      .on("ringing", (session) => emitCallUpdate(session, true))
      .on("new", emitCallUpdate)
      .on("done", emitCallUpdate)
      .on("connecting", emitCallUpdate);

    this.sip.ua.once("transportCreated", () =>
      this.eventBus.emit("socket.connect")
    );

    this.sip.ua.start();
  }

  disconnect() {
    if (this.sip) {
      this.sip.ua.stop();
      this.eventBus.emit("unregistered");
    }

    this.eventBus.removeAllListeners();
  }

  async checkDevices(): Promise<[]> {
    return Promise.resolve([]);
  }

  async checkPermissions(): Promise<void> {
    return Promise.resolve();
  }

  newCall(options: ICallOptions): SipCall {
    if (!options.destination) {
      throw new TypeError("destination is required");
    }

    const session = this.sip.call(options.destination);

    if (session) {
      return new SipCall(this.sip, session);
    }
  }
}
