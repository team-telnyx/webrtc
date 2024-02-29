import { Janus } from './Request';
import { JANUS_SIP_PLUGIN } from './util/constants/plugins';

export type JanusError = {
  janus: Janus.error;
  transaction?: string;
  error: {
    code: number;
    reason: string;
  };
};
type JanusCreateSessionResponse = {
  janus: Janus.success;
  transaction: string;
  data: {
    id: number;
  };
};

type JanusAttachPluginResponse = {
  janus: Janus.success;
  transaction: string;
  data: {
    id: number;
  };
};

type JanusACKEvent = {
  janus: Janus.ack;
  transaction: string;
};

type JanusRegisteringEvent = {
  janus: Janus.event;
  session_id: number;
  transaction: string;
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

type JanusRegisteredEvent = {
  janus: Janus.event;
  session_id: number;
  sender: number;
  transaction?: string
  plugindata: {
    plugin: 'janus.plugin.sip';
    data: {
      sip: 'event';
      result: {
        event: 'registered';
        username: string;
        register_sent: true;
        master_id: number;
      };
    };
  };
};

export type JanusResponse =
  | JanusCreateSessionResponse
  | JanusAttachPluginResponse
  | JanusRegisteringEvent
  | JanusRegisteredEvent
  | JanusACKEvent
  | JanusError;

export type JanusResponseMap = {
  [Janus.create]: JanusCreateSessionResponse;
  [Janus.attach]: JanusAttachPluginResponse;
  [Janus.error]: JanusError;
  [Janus.message]: JanusError; // TODO
  [Janus.event]: JanusError; // TODO
};

// {
//   "janus": "event",
//   "session_id": 1708807399805339,
//   "transaction": "fKAINBHVQI4d",
//   "sender": 3468491548907886,
//   "plugindata": {
//       "plugin": "janus.plugin.sip",
//       "data": {
//           "sip": "event",
//           "result": {
//               "event": "registering"
//           }
//       }
//   }
// }

// {
//   "janus": "event",
//   "session_id": 1708807399805339,
//   "sender": 3468491548907886,
//   "plugindata": {
//       "plugin": "janus.plugin.sip",
//       "data": {
//           "sip": "event",
//           "result": {
//               "event": "registered",
//               "username": "haythem",
//               "register_sent": true,
//               "master_id": 2393399947
//           }
//       }
//   }
// }
