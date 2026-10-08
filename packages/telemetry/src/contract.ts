// Call Report V2 wire contract (schema 2.1). The commented original lives in team-telnyx/webrtc-squad-telemetry
// docs/call-report-v2/data-design/client-data/call-report-v2-events.ts: change it there first, then here.
// Typed fields are what every SDK sends; anything else an SDK knows goes, untyped, under the payload's `extra`
// (a nested object's extras under the same path, e.g. extra.totals.<name>).

// 1. Transport: one JSON-RPC notification per event on the SDK's own telemetry WebSocket.

export type TelemetryNotification = {
  jsonrpc: '2.0';
  method: 'telnyx_rtc.telemetry';
  params: ClientEvent;
};

/** VSP -> SDK kill switch: enabled false = stop sending and drop pending events. */
export type TelemetryControlNotification = {
  jsonrpc: '2.0';
  method: 'telnyx_rtc.telemetry_control';
  params: { enabled: boolean };
};

// 2. Envelope

/** call_metrics goes only with socket_generation, voice_sdk_id, session_id and call_id (checked by the SDK and the backend). */
export type ClientEvent = Envelope & EventBody;

/** Untyped extras of an event, kept whole. Never passwords or tokens. */
export type Extra = Record<string, unknown>;

export type SchemaVersion = '2.0' | '2.1';

export type Envelope = {
  schema_version: SchemaVersion;
  sequence: number; // 1, 2, 3... per sdk_instance_id, one per record (each per-call copy too), never reused
  timestamp: string; // ISO 8601 with ms; call_metrics: end of the interval
  socket_generation?: number; // signaling socket attempt: absent before the first, then 1, 2...
  client: ClientInfo;
  ids: KnownIds;
  sent_at?: string; // only on an event that waited for the telemetry socket
};

export type KnownIds = {
  sdk_instance_id: string;
  voice_sdk_id?: string;
  session_id?: string; // verto sessid, from login_succeeded on
  call_id?: string; // on every record of the call; shared records go once per active call
  telnyx_leg_id?: string; // never on call_metrics
  telnyx_session_id?: string; // never on call_metrics
};

export type ClientInfo = {
  environment: 'production' | 'development';
  sdk: 'js' | 'react-native' | 'android' | 'ios' | 'flutter';
  sdk_version: string;
  os:
    | 'macos'
    | 'windows'
    | 'linux'
    | 'android'
    | 'ios'
    | 'chromeos'
    | 'unknown';
  os_version?: string;
  user_agent: string;
};

// 3. Events

export type EventBodyCore =
  | {
      name: 'sdk_creation_started';
      payload: {
        options: SdkOptions;
        raw_client_options: Record<string, unknown>;
      };
    }
  | { name: 'sdk_creation_failed'; payload: { error: CodedErrorInfo } }
  | { name: 'sdk_created'; payload: SdkCreatedPayload }
  | { name: 'network_changed'; payload: NetworkChangedPayload }
  | { name: 'app_state_changed'; payload: AppStateChangedPayload }
  | { name: 'input_device_changed'; payload: DeviceChangedPayload }
  | { name: 'output_device_changed'; payload: DeviceChangedPayload }
  | { name: 'device_list_changed'; payload: DeviceListChangedPayload }
  | {
      name: 'socket_connect_started';
      payload: { target: SocketTarget; is_reconnect: boolean };
    }
  | { name: 'socket_failed'; payload: SocketFailedPayload }
  | { name: 'socket_connected'; payload: SocketConnectedPayload }
  | { name: 'socket_closed'; payload: SocketClosedPayload }
  | { name: 'login_started'; payload: LoginStartedPayload }
  | { name: 'login_failed'; payload: LoginFailedPayload }
  | { name: 'login_succeeded'; payload: LoginSucceededPayload }
  | { name: 'client_ready'; payload: ClientReadyPayload }
  | { name: 'gateway_state'; payload: GatewayStatePayload }
  | { name: 'gateway_check_started'; payload: { check_number: number } }
  | { name: 'gateway_check_succeeded'; payload: GatewayCheckSucceededPayload }
  | {
      name: 'gateway_check_failed';
      payload: { check_number: number; error: ErrorInfo; will_retry: boolean };
    }
  | { name: 'signaling_message'; payload: SignalingMessagePayload }
  | { name: 'call_started'; payload: CallStartedPayload }
  | { name: 'call_state'; payload: CallStatePayload }
  | { name: 'ice_candidate'; payload: IceCandidatePayload }
  | { name: 'call_media_changed'; payload: CallMediaChangedPayload }
  | { name: 'call_metrics'; payload: CallMetricsPayload }
  | { name: 'call_warning'; payload: CallWarningPayload }
  | { name: 'call_timings'; payload: CallTimingsPayload }
  | { name: 'call_ended'; payload: CallEndedPayload }
  | { name: 'network_route_measured'; payload: NetworkRouteMeasuredPayload }
  | { name: 'logs'; payload: LogEntry }
  | { name: 'error'; payload: ErrorPayload };

export type WithExtra = { extra?: Extra };

type AddExtra<T> = T extends { name: infer N; payload: infer P }
  ? { name: N; payload: P & WithExtra }
  : never;

export type EventBody = AddExtra<EventBodyCore>;
export type EventName = EventBody['name'];
export type EventPayload = EventBody['payload'];
export type PayloadOf<N extends EventName> = Extract<
  EventBody,
  { name: N }
>['payload'];

// 4. Payloads

/** The essential options every SDK shares; the rest is in raw_client_options. */
export type SdkOptions = {
  login: string | null; // null for token and anonymous logins
  debug: boolean;
  login_type: 'sip_credential' | 'gencred' | 'token' | 'anonymous';
  explicit_rtc_provided: boolean;
  use_canary: boolean | null;
  skip_trailing: boolean;
  region: string | null;
  keep_connection_alive_on_socket_close: boolean | null;
  hangup_on_before_unload: boolean | null;
  trickle_ice: boolean;
  prefetch_ice_candidates: boolean | null;
  force_relay_candidate: boolean | null;
  muted_mic_on_start: boolean | null;
  push_when_active: boolean | null;
  early_sdp_answer: boolean | null;
  media_permissions_recovery: boolean | null;
  ice_servers: IceServerInfo[]; // what the SDK will use, defaults included
  custom_ice_servers: boolean;
  push_provider: 'fcm' | 'apns' | 'none';
  log_level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'off';
  telemetry: TelemetryOptions;
};

export type TelemetryOptions = { enabled: boolean };

export type IceServerInfo = { url: string; has_credential: boolean };

export type SdkCreatedPayload = {
  creation_duration_ms: number;
  sdk_instances: string[]; // live SDK instances on the page, this one included
};

export type NetworkChangedPayload = {
  initial: boolean;
  network_type: 'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'none' | 'unknown';
  online: boolean;
  effective_type?: 'slow-2g' | '2g' | '3g' | '4g' | '5g';
  downlink_mbps?: number;
};

export type AppState = 'foreground' | 'background' | 'visible' | 'hidden';

export type AppStateChangedPayload = {
  state: AppState;
  previous_state?: AppState; // the state before; absent if unknown
};

export type DeviceKind = 'audioinput' | 'audiooutput' | 'videoinput';

/** label: "" while the system hides it (a browser before a media permission). */
export type DeviceInfo = { id: string; label: string };

export type ListedDevice = DeviceInfo & { kind: DeviceKind };

/** The microphone (input) or speaker (output) now in use, chosen by the app or the SDK. */
export type DeviceChangedPayload = {
  device: DeviceInfo;
  device_count?: number; // devices of this kind
};

/** The system's devices changed: the whole list now, and what came and went. */
export type DeviceListChangedPayload = {
  devices: ListedDevice[];
  added: ListedDevice[];
  removed: ListedDevice[];
};

/** Where the socket connects; no credentials or query in the url. */
export type SocketTarget = {
  url: string;
  region?: string;
  rtc_ip?: string;
  rtc_port?: number;
  use_canary_server: boolean;
  skip_last_voice_sdk_id: boolean;
  skip_trailing: boolean;
  resume_voice_sdk_id?: string;
};

export type SocketFailedPayload = {
  error: CodedErrorInfo;
  close_code?: number;
  attempt: number;
  will_retry: boolean;
};

export type SocketConnectedPayload = {
  connect_duration_ms: number;
};

export type SocketClosedPayload = {
  close_code?: number;
  reason?: string;
  closed_by: 'client' | 'server' | 'network' | 'unknown';
  open_duration_ms: number;
  will_reconnect: boolean;
  in_background?: boolean;
};

/** Only the kind of login, never the secret. */
export type LoginMethod =
  | { login_type: 'sip_credentials'; username: string }
  | { login_type: 'gencred'; username: string }
  | { login_type: 'token' }
  | { login_type: 'anonymous'; target_type: string; target_id: string };

export type LoginType = LoginMethod['login_type'];

export type LoginStartedPayload = {
  method: LoginMethod;
  is_reconnect: boolean;
  resume_session_id?: string;
};

export type LoginFailedPayload = {
  method: LoginMethod;
  is_reconnect: boolean;
  error: CodedErrorInfo;
  will_retry: boolean;
};

export type LoginSucceededPayload = {
  method: LoginMethod;
  is_reconnect: boolean;
  login_duration_ms: number;
};

/** The connection's step times; "provided" flags never carry the value. */
export type ClientReadyPayload = {
  is_reconnect: boolean;
  time_to_ready_ms: number; // since sdk_creation_started
  connect_to_ready_ms: number; // since connect() or the reconnect
  app_wait_ms?: number;
  socket_connect_ms?: number;
  login_ms?: number;
  login_to_ready_ms?: number;
  socket_attempts: number;
  login_attempts: number;
  started_by_push?: boolean;
  push_to_ready_ms?: number;
  remote_element_provided: boolean | null;
  mic_id_provided: boolean;
  speaker_id_provided: boolean | null;
  reattached_call_ids: string[];
};

export type GatewayState =
  | 'UNREGED'
  | 'TRYING'
  | 'REGISTER'
  | 'REGED'
  | 'UNREGISTER'
  | 'FAILED'
  | 'FAIL_WAIT'
  | 'EXPIRED'
  | 'NOREG'
  | 'TIMEOUT'
  | 'DOWN'
  | 'ATTACHED'
  | 'UNKNOWN';

export type GatewayStatePayload = {
  state: GatewayState;
  raw_state: string;
  previous_state?: GatewayState;
};

export type GatewayCheckSucceededPayload = {
  check_number: number;
  state: GatewayState;
  raw_state: string;
  response_time_ms: number;
};

export type SignalingCategory = Extract<Category, 'call' | 'connection'>;

/** The JSON-RPC frame as it is, passwords and tokens removed (TURN credentials and a=ice-pwd stay). */
export type SignalingMessagePayload = {
  direction: 'sent' | 'received';
  raw: unknown;
};

/** The values the call ran with; null = this SDK has no such option. */
export type CallStartedPayload = {
  direction: 'inbound' | 'outbound';
  caller_number?: string;
  caller_name?: string;
  destination_number?: string;
  audio: boolean;
  video: boolean;
  trickle_ice: boolean;
  force_relay_candidate: boolean | null;
  prefetch_ice_candidates: boolean | null;
  keep_connection_alive_on_socket_close: boolean | null;
  custom_ice_servers: boolean;
  ice_servers_count: number;
  use_stereo: boolean | null;
  use_sdp_as_bandwidth: boolean | null;
  sdp_as_bandwidth_kbps?: number;
  preferred_codecs?: string[]; // "audio/PCMU/8000"
  custom_header_names?: string[]; // names only
  remote_element_provided: boolean | null;
  local_element_provided: boolean | null;
  mic_id_provided: boolean;
  speaker_id_provided: boolean | null;
  camera_id_provided: boolean | null;
  is_reattach: boolean;
  raw_call_options: Record<string, unknown>; // the call's options as the app gave them; passwords, tokens and SDPs removed
};

export type CallState =
  | 'new'
  | 'requesting'
  | 'trying'
  | 'recovering'
  | 'ringing'
  | 'answering'
  | 'early'
  | 'active'
  | 'held'
  | 'hangup'
  | 'destroy'
  | 'purge';

export type CallStatePayload = {
  state: CallState;
  previous_state?: CallState;
};

export type MediaChange =
  | 'initial'
  | 'codec'
  | 'candidate_pair'
  | 'ice_state'
  | 'dtls_state'
  | 'sending'
  | 'input_device'
  | 'output_device'
  | 'echo';

/** A full media snapshot, sent at the first metrics tick and whenever it changed. */
export type CallMediaChangedPayload = {
  changed: MediaChange[];
  codec_in?: Codec;
  codec_out?: Codec;
  target_bitrate_bps?: number;
  local_candidate?: IceCandidate;
  remote_candidate?: IceCandidate;
  previous_local_candidate?: IceCandidate; // only when the pair changed
  previous_remote_candidate?: IceCandidate;
  pair_changes?: number;
  ice_state?:
    | 'new'
    | 'checking'
    | 'connected'
    | 'completed'
    | 'disconnected'
    | 'failed'
    | 'closed';
  dtls_state?: 'new' | 'connecting' | 'connected' | 'closed' | 'failed';
  srtp_cipher?: string;
  dtls_version?: string;
  sending?: boolean;
  input_device?: InputDevice;
  output_device_label?: string;
  input_device_count?: number;
  output_device_count?: number;
  echo_return_loss_db?: number;
  echo_return_loss_enhancement_db?: number;
};

export type Codec = {
  mime_type: string;
  clock_rate: number;
  channels: number;
  payload_type: number;
  sdp_fmtp_line?: string;
};

/** One ICE candidate; addresses are masked by the backend. */
export type IceCandidate = {
  candidate_type: 'host' | 'srflx' | 'prflx' | 'relay';
  protocol: 'udp' | 'tcp';
  relay_protocol?: 'udp' | 'tcp' | 'tls';
  network_type?: 'ethernet' | 'wifi' | 'cellular' | 'vpn' | 'unknown';
  foundation?: string;
  priority?: number;
  tcp_type?: 'active' | 'passive' | 'so';
  address?: string;
  port?: number;
  url?: string;
};

/** A gathered or received candidate (no raddr/rport). */
export type IceCandidatePayload = IceCandidate & {
  side: 'local' | 'remote';
  ice_generation: number;
  component: 'rtp' | 'rtcp';
  since_gathering_started_ms?: number;
  signaled?: boolean; // local only: false = gathered after a non-trickle SDP went out
};

export type InputDevice = {
  label: string; // trailing USB "(vid:pid)" stripped
  enabled: boolean;
  muted: boolean;
  ready_state: 'live' | 'ended';
  auto_gain_control?: boolean;
  echo_cancellation?: boolean;
  noise_suppression?: boolean;
  sample_rate?: number;
  sample_size?: number;
  channel_count?: number;
  latency_ms?: number;
};

/** One getStats() interval: counters as deltas (0 omitted, except played_samples and synthesized_ms), gauges as values. */
export type CallMetricsPayload = {
  interval_ms: number;
  rtt_ms?: number;
  rtcp_rtt_ms?: number;
  jitter_ms?: number;
  remote_jitter_ms?: number;
  in_packets?: number;
  in_bytes?: number;
  in_lost?: number;
  in_discarded?: number;
  in_fec_packets?: number;
  in_samples?: number;
  in_concealed_samples?: number;
  in_concealment_events?: number;
  played_samples?: number;
  synthesized_ms?: number;
  jitter_buffer_ms?: number;
  jitter_buffer_target_ms?: number;
  playout_delay_ms?: number;
  in_level?: number;
  out_packets?: number;
  out_bytes?: number;
  out_retransmitted_packets?: number;
  out_nacks?: number;
  out_send_delay_ms?: number;
  out_level?: number;
  remote_lost?: number;
  remote_sent_packets?: number;
  ice_requests?: number;
  ice_responses?: number;
  counters_reset?: true; // the peer connection was replaced
};

export const WARNING_CODES = {
  31001: 'high_network_latency',
  31005: 'low_local_audio',
  31006: 'low_inbound_audio',
  33008: 'ice_pair_changed',
} as const;

export type KnownWarningCode = keyof typeof WARNING_CODES;
export type WarningCode = KnownWarningCode | (number & {});

export type CallWarningPayload = {
  code: WarningCode;
  name: string;
  metric?: string;
  value?: number;
  threshold?: number;
};

/** Milliseconds since call_started; steps that did not happen are omitted. */
export type CallTimingsPayload = {
  complete: boolean;
  answer_called_ms?: number;
  peer_created_ms?: number;
  media_devices_acquired_ms?: number;
  peer_setup_complete_ms?: number;
  sdp_negotiation_started_ms?: number;
  sdp_local_created_ms?: number;
  local_description_applied_ms?: number;
  ice_gathering_started_ms?: number;
  sdp_sent_ms?: number;
  first_ice_candidate_ms?: number;
  first_srflx_or_relay_candidate_ms?: number;
  all_ice_candidates_gathered_ms?: number;
  remote_ringing_ms?: number;
  early_media_ms?: number;
  remote_answered_ms?: number;
  first_remote_track_ms?: number;
  remote_description_applied_ms?: number;
  call_active_ms?: number;
  ice_connected_ms?: number;
  dtls_connected_ms?: number;
  first_packet_received_ms?: number;
};

export type CallEndReason =
  | 'local_hangup'
  | 'remote_hangup'
  | 'rejected'
  | 'busy'
  | 'no_answer'
  | 'cancelled'
  | 'failed'
  | 'network_lost'
  | 'unknown';

export type CallEndedPayload = {
  end_reason: CallEndReason;
  cause?: string;
  cause_code?: number;
  sip_code?: number;
  sip_reason?: string;
  last_state: CallState;
  answered: boolean;
  duration_ms: number;
  talk_ms?: number;
  metrics_samples: number;
  totals: CallTotals;
};

/** Final cumulative counters, same names as call_metrics. */
export type CallTotals = {
  in_packets: number;
  in_bytes: number;
  in_lost: number;
  in_discarded: number;
  in_samples?: number;
  in_concealed_samples?: number;
  in_concealment_events?: number;
  out_packets: number;
  out_bytes: number;
  out_retransmitted_packets?: number;
  out_nacks?: number;
  remote_lost?: number;
  rtt_avg_ms?: number;
  rtt_max_ms?: number;
  rtcp_rtt_avg_ms?: number;
  pair_changes: number;
};

export type NetworkRouteMeasuredPayload = {
  tool: 'mtr' | 'traceroute' | 'other';
  trigger: 'preflight' | 'app' | 'support' | 'quality_warning';
  target: string;
  protocol: 'icmp' | 'udp' | 'tcp';
  port?: number;
  packet_size_bytes?: number;
  probes_per_hop: number;
  duration_ms?: number;
  hops: RouteHop[];
};

export type RouteHop = {
  hop: number;
  host: string | null;
  loss_pct: number;
  sent: number;
  last_ms: number;
  avg_ms: number;
  best_ms: number;
  worst_ms: number;
  stdev_ms: number;
};

/** One category list for every record. */
export type Category =
  | 'connection'
  | 'call'
  | 'media'
  | 'ice'
  | 'warning'
  | 'metrics'
  | 'error'
  | 'diagnostics'
  | 'general'
  | 'ice_candidate_error'
  | 'telemetry'
  | 'unknown';

export type LogCategory = Exclude<
  Category,
  'metrics' | 'diagnostics' | 'unknown'
>;

/** One SDK log line, whole; only passwords and tokens removed. */
export type LogEntry = {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  category: LogCategory;
  message: string;
  details?: Record<string, unknown>;
};

export type ErrorPayload =
  | {
      stage: 'call' | 'media';
      error: CodedErrorInfo;
      is_fatal: boolean;
      details?: Record<string, unknown>;
    }
  | {
      stage: 'sdk' | 'socket' | 'login' | 'gateway' | 'telemetry' | 'unknown';
      error: ErrorInfo;
      is_fatal: boolean;
      details?: Record<string, unknown>;
    };

/** code = the SDK's own; server_code/server_message = the server's answer. */
export type ErrorInfo = {
  name: string;
  message: string;
  code?: string;
  server_code?: string;
  server_message?: string;
  stack?: string;
};

export type CodedErrorInfo = ErrorInfo & { code: string };
