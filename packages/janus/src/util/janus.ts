import {
  JanusResponse,
  JanusSIPCallAcceptedEvent,
  JanusSIPError,
  JanusSIPHangupEvent,
  JanusSIPIncomingCallEvent,
  JanusSIPRingingEvent,
} from "../messages/response";

export function isSipError(msg: JanusResponse): msg is JanusSIPError {
  if (msg.janus !== "event") {
    return false;
  }
  if (!("plugindata" in msg)) {
    return false;
  }
  return (
    msg.plugindata.data.sip === "event" &&
    Boolean((msg as JanusSIPError).plugindata.data.error)
  );
}

export function isSipHangupEvent(
  msg: JanusResponse
): msg is JanusSIPHangupEvent {
  if (msg.janus !== "event") {
    return false;
  }
  if (!("plugindata" in msg)) {
    return false;
  }

  return msg.plugindata.data.result?.event === "hangup";
}

export function isSIPIncomingCallMessage(
  msg: JanusResponse
): msg is JanusSIPIncomingCallEvent {
  if (msg.janus !== "event") {
    return false;
  }
  if (!("plugindata" in msg)) {
    return false;
  }

  return (
    msg.janus === "event" &&
    msg.plugindata.data.sip === "event" &&
    msg.plugindata.data.result?.event === "incomingcall" &&
    (msg as JanusSIPIncomingCallEvent).jsep != null
  );
}

export function isSIPCallAcceptedEvent(
  msg: JanusResponse
): msg is JanusSIPCallAcceptedEvent {
  if (msg.janus !== "event") {
    return false;
  }
  if (!("plugindata" in msg)) {
    return false;
  }
  return (
    msg.janus === "event" &&
    msg.plugindata.data.sip === "event" &&
    (msg as JanusSIPCallAcceptedEvent).plugindata.data.result?.event ===
      "accepted"
  );
}

export function isSipRingingEvent(
  msg: JanusResponse
): msg is JanusSIPRingingEvent {
  if (msg.janus !== "event") {
    return false;
  }
  if (!("plugindata" in msg)) {
    return false;
  }

  return msg.plugindata.data.result?.event === "ringing";
}
