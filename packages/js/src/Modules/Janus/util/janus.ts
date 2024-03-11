import {
  JanusResponse,
  JanusSIPCallAcceptedEvent,
  JanusSIPError,
  JanusSIPHangupEvent,
  JanusSIPIncomingCallEvent,
  JanusSIPRingingEvent,
} from '../messages/response';

export function isSipError(msg: JanusResponse): msg is JanusSIPError {
  return (
    msg.janus === 'event' &&
    msg.plugindata.data.sip === 'event' &&
    Boolean((msg as JanusSIPError).plugindata.data.error)
  );
}

export function isSipHangupEvent(
  msg: JanusResponse
): msg is JanusSIPHangupEvent {
  return (
    msg.janus === 'event' &&
    msg.plugindata.data.sip === 'event' &&
    msg.plugindata.data.result?.event === 'hangup'
  );
}

export function isSIPIncomingCallMessage(
  msg: JanusResponse
): msg is JanusSIPIncomingCallEvent {
  return (
    msg.janus === 'event' &&
    msg.plugindata.data.sip === 'event' &&
    msg.plugindata.data.result.event === 'incomingcall' &&
    (msg as JanusSIPIncomingCallEvent).jsep != null
  );
}

export function isSIPCallAcceptedEvent(
  msg: JanusResponse
): msg is JanusSIPCallAcceptedEvent {
  return (
    msg.janus === 'event' &&
    msg.plugindata.data.sip === 'event' &&
    (msg as JanusSIPCallAcceptedEvent).plugindata.data.result.event ===
      'accepted'
  );
}

export function isSipRingingEvent(
  msg: JanusResponse
): msg is JanusSIPRingingEvent {
  return (
    msg.janus === 'event' &&
    msg.plugindata.data.sip === 'event' &&
    msg.plugindata.data.result.event === 'ringing'
  );
}
