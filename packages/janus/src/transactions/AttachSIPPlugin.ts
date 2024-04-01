import { v4 as uuidV4 } from "uuid";
import { Janus } from "../messages/janus";
import { JanusAttachPluginRequest } from "../messages/request";
import { JanusResponse } from "../messages/response";
import { BaseTransaction } from "./BaseTransaction";

export class AttachSipPluginTransaction extends BaseTransaction<
  { handleId: number },
  JanusAttachPluginRequest
> {
  constructor({ sessionId }: { sessionId: number }) {
    super({
      janus: Janus.attach,
      session_id: sessionId,
      plugin: "janus.plugin.sip",
      opaque_id: `sip-${uuidV4()}`,
    });
  }
  public onMessage(message: JanusResponse): void {
    if (!("janus" in message)) {
      return;
    }

    if (message.janus === Janus.success && message.data.id) {
      this._resolve({ handleId: message.data.id });
    } else {
      this._reject(new Error("Failed to attach plugin."));
    }
  }
}
