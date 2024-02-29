export enum Janus {
  create = 'create',
  success = 'success',
  error = 'error',
  attach = 'attach',
  message = 'message',
  event = 'event',
  ack = 'ack'
}

type JanusCreateSessionRequest = {
  janus: Janus.create;
  transaction?: string;
};

type JanusAttachPluginRequest = {
  janus: Janus.attach;
  plugin: string;
  session_id: number;
  transaction?: string;
};

type JanusSIPRegisterRequest = {
  janus: Janus.message;
  body: {
    request: 'register';
    type?: string; //"<if guest or helper, no SIP REGISTER is actually sent; optional>",
    send_register?: boolean; // <true|false; if false, no SIP REGISTER is actually sent; optional>,
    force_udp?: boolean; // <true|false; if true, forces UDP for the SIP messaging; optional>,
    force_tcp?: boolean; // <true|false; if true, forces TCP for the SIP messaging; optional>,
    sips?: boolean; // <true|false; if true, configures a SIPS URI too when registering; optional>,
    rfc2543_cancel?: boolean; // <true|false; if true, configures sip client to CANCEL pending INVITEs without having received a provisional response first; optional>,
    username: string; // "<SIP URI to register; mandatory>",
    secret?: string; // "<password to use to register; optional>",
    ha1_secret?: string; // "<prehashed password to use to register; optional>",
    authuser?: string; // "<username to use to authenticate (overrides the one in the SIP URI); optional>",
    display_name?: string; // "<display name to use when sending SIP REGISTER; optional>",
    user_agent?: string; //"<user agent to use when sending SIP REGISTER; optional>",
    proxy?: string; //"<server to register at; optional, as won't be needed in case the REGISTER is not goint to be sent (e.g., guests)>";
    outbound_proxy?: string; // '<outbound proxy to use, if any; optional>';
    headers?: Record<string, string>; // '<object with key/value mappings (header name/value), to specify custom headers to add to the SIP REGISTER; optional>';
    contact_params?: Record<string, string>[]; // "<array of key/value objects, to specify custom Contact URI params to add to the SIP REGISTER; optional>",
    incoming_header_prefixes?: string[]; // "<array of strings, to specify custom (non-standard) headers to read on incoming SIP events; optional>",
    refresh?: boolean; // "<true|false; if true, only uses the SIP REGISTER as an update and not a new registration; optional>",
    master_id?: number; //"<ID of an already registered account, if this is an helper for multiple calls (more on that later); optional>",
    register_ttl?: number; //: "<integer; number of seconds after which the registration should expire; optional>"
  };
  transaction?: string;
  handle_id: number;
  session_id: number;
};
export type JanusRequest =
  | JanusCreateSessionRequest
  | JanusAttachPluginRequest
  | JanusSIPRegisterRequest;
