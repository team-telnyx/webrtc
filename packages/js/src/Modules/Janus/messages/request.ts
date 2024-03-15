import { Janus } from './janus';

// Messages that are SENT to the janus gateway
export type JanusCreateSessionRequest = {
  janus: Janus.create;
  transaction?: string;
};

export type JanusAttachPluginRequest = {
  janus: Janus.attach;
  plugin: 'janus.plugin.sip';
  opaque_id: string;
  transaction?: string;
  session_id: number;
};

export type JanusSIPRegisterRequest = {
  janus: Janus.message;
  body: {
    request: 'register';
    login?: string;
    password?: string;
    login_token?: string;
    display_name: string;
  };
  transaction?: string;
  session_id: number;
  handle_id: number;
};

export type JanusSIPCallRequest = {
  janus: Janus.message;
  body: {
    request: 'call';
    call_id: string;
    uri: string;
    refer_id?: string;
    headers?: Record<string, unknown>;
    srtp?: string;
    srtp_profile?: string;
    secret?: string;
    ha1_secret?: string;
    authuser?: string;
    autoaccept_reinvites?: boolean;
  };
  transaction?: string;
  jsep: RTCSessionDescriptionInit;
  session_id: number;
  handle_id: number;
};

export type JanusICETrickleRequest = {
  janus: Janus.trickle;
  candidate:
    | {
        candidate: string;
        sdpMid: string;
        sdpMLineIndex: number;
      }
    | { completed: true };
  transaction?: string;
  session_id: number;
  handle_id: number;
};

export type JanusKeepAliveRequest = {
  janus: 'keepalive';
  session_id: number;
  transaction?: string;
};

export type JanusSIPAnswerRequest = {
  janus: Janus.message;
  body: {
    request: 'accept';
    autoaccept_reinvites: false;
  };
  transaction?: string;
  jsep: {
    type: 'answer';
    sdp: string;
  };
  session_id: number;
  handle_id: number;
};

export type JanusSIPHangupRequest = {
  janus: Janus.message;
  body: {
    request: 'hangup';
  };
  transaction?: string;
  session_id: number;
  handle_id: number;
};
