import { connection } from "./Connection";
import { trigger } from "./Handler";
import { SwEvent } from "./constants";
import { JanusResponse, JanusSIPDTMFResponse } from "./messages/response";

function isDTMFEvent(msg: JanusResponse): msg is JanusSIPDTMFResponse {
  if (msg.janus !== "event") {
    return false;
  }

  if (!("plugindata" in msg)) {
    return false;
  }

  return msg.plugindata.data.result?.event === "dtmf";
}

export class DTMFAgent {
  private _onMessage = (data: string) => {
    const msg = JSON.parse(data) as JanusResponse;
    if (isDTMFEvent(msg)) {
      trigger(SwEvent.DTMF, msg.plugindata.data.result);
    }
  };

  public start = () => {
    connection.addListener("message", this._onMessage);
  };

  public stop = () => {
    connection.removeListener("message", this._onMessage);
  };
}
