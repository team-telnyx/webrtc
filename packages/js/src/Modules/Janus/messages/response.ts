import { Janus } from './janus';

export type JanusErrorResponse = {
  janus: Janus.error;
  transaction?: string;
  error: {
    code: number;
    reason: string;
  };
};
export type JanusSessionCreatedResponse = {
  janus: Janus.success;
  transaction?: string;
  data: {
    id: number;
  };
};

export type JanusAttachPluginResponse = {
  janus: Janus.success;
  session_id?: number;
  transaction?: string;
  data: {
    id: number;
  };
};
export type JanusACKResponse = {
  janus: Janus.ack;
  session_id: number;
  transaction?: string;
};
export type JanusRegisteringEvent = {
  janus: Janus.event;
  session_id: number;
  transaction?: string;
  sender: number;
  plugindata: {
    plugin: 'janus.plugin.sip';
    data: {
      sip: 'event';
      result: {
        event: 'registering';
      };
    };
  };
};

export type JanusRegisteredEvent = {
  janus: Janus.event;
  session_id: number;
  sender: number;
  transaction?: string;
  plugindata: {
    plugin: 'janus.plugin.sip';
    data: {
      sip: 'event';
      result: {
        event: 'registered';
        username: string;
        register_sent: boolean;
        master_id: number;
      };
    };
  };
};

export type JanusSIPCallingEvent = {
  janus: 'event';
  session_id: number;
  transaction?: string;
  sender: number;
  plugindata: {
    plugin: 'janus.plugin.sip';
    data: {
      sip: 'event';
      result: { event: 'calling'; call_id: string };
      call_id: string;
    };
  };
};

export type JanusSIPRingingEvent = {
  janus: Janus.event;
  session_id: number;
  transaction?: string;
  sender: number;
  plugindata: {
    plugin: 'janus.plugin.sip';
    data: {
      sip: 'event';
      result: {
        event: 'ringing';
        headers: Record<string, string>;
      };
      call_id: string;
    };
  };
};

export type JanusSIPError = {
  janus: Janus.event;
  session_id: number;
  transaction?: string;
  sender: number;
  plugindata: {
    plugin: 'janus.plugin.sip';
    data: {
      sip: 'event';
      error_code: number;
      error: string;
      result?: undefined;
    };
  };
};

export type JanusSIPIncomingCallEvent = {
  transaction?: string;
  janus: 'event';
  jsep: {
    sdp: string;
    type: RTCSdpType;
  };
  plugindata: {
    data: {
      call_id: string;
      result: {
        call_id: string;
        callee: string;
        displayname: string;
        event: 'incomingcall';
        headers: Record<string, string>;
      };
      sip: 'event';
    };
    plugin: 'janus.plugin.sip';
  };
  sender: number;
  session_id: number;
};

export type JanusSIPCallAcceptedEvent = {
  janus: Janus.event;
  jsep: {
    sdp: string;
    type: RTCSdpType;
  };
  plugindata: {
    data: {
      call_id: string;
      result: {
        event: 'accepted';
        headers: Record<string, string>;
        username: string;
      };
      sip: 'event';
    };
    plugin: 'janus.plugin.sip';
  };
  sender: number;
  session_id: number;
  transaction: string;
};

export type JanusSIPHangupEvent = {
  janus: Janus.event;
  session_id: number;
  transaction?: string;
  sender: number;
  plugindata: {
    plugin: 'janus.plugin.sip';
    data: {
      sip: 'event';
      result: {
        event: 'hangup';
        code: number;
        reason: string;
        reason_header: string;
        reason_header_protocol: string;
        reason_header_cause: string;
      };
      call_id: string;
    };
  };
};

export type JanusResponse =
  | JanusSessionCreatedResponse
  | JanusAttachPluginResponse
  | JanusACKResponse
  | JanusRegisteringEvent
  | JanusRegisteredEvent
  | JanusErrorResponse
  | JanusSIPCallingEvent
  | JanusSIPRingingEvent
  | JanusSIPError
  | JanusSIPHangupEvent
  | JanusSIPIncomingCallEvent
  | JanusSIPCallAcceptedEvent;
