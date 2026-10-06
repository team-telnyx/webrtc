// Copied from team-telnyx/webrtc-squad-telemetry
// docs/call-report-v2/data-design/client-data/call-report-v2-events.ts (prettier-formatted).
// Change the contract there first, then copy it here.
/**
 * Call Report V2: client -> VSP -> Telemetry Backend event contract (candidate, to validate in the PoC).
 * Standalone: it does not import ./call-report-v2.ts (the owner's draft), but keeps every name chosen there.
 *
 * Rules (the owner's, unchanged):
 * - Every event is one envelope + one { name, payload } pair. The name decides the payload.
 * - An event is identified by its sdk_instance_id and sequence; there is no event ID (owner's decision, 2026-09-30).
 *   So the SDK never repeats a sequence number within an SDK instance: that is on the SDK test list.
 * - The IDs of the event itself live in `ids` on the envelope. A payload may reference OTHER objects' IDs
 *   (sdk_instances, reattached_call_ids, resume_*, rpc_id), and names them *_id / *_ids.
 * - While a call is active, every record carries that call's ID in ids.call_id: socket, login, gateway and other
 *   SDK-wide events and log lines too (owner, 2026-09-30). Which ID when two calls are active is open (contract 1.13, q. 9).
 * - Timestamps: UTC ISO 8601 with ms (2026-09-25T18:10:02.709Z). Durations: *_ms numbers.
 * - Never send passwords, tokens, ICE credentials, SDP or JSON-RPC params. Errors are plain fields.
 * - `?` = the SDK may not know the value yet. Send it as soon as it is known.
 *
 * Rules added from the V1 samples:
 * - Not measured = omitted. Never send 0 for "not measured".
 * - Static data (options, socket target, codec, ICE pair, microphone) is sent once and again only when it changes.
 *   It is never repeated in the 1 Hz metrics sample (it was ~1/3 of V1 stats bytes).
 * - call_metrics carries per-interval deltas of WebRTC counters plus gauges. A delta of 0 is omitted,
 *   EXCEPT played_samples and synthesized_ms, which are always sent (0 included) when the SDK can measure them.
 *   Exact whole-call totals travel once, in call_ended.
 * - The client sends everything except keepalive (telnyx_rtc.ping, its PONG, "Ping received") and debug_report_data
 *   frames with their replies (owner's decision, 2026-09-29). Other noise is labelled with a `category`, not dropped.
 * - Every event is sent as its own message the moment it happens, with its whole envelope. The client never batches,
 *   acknowledges or resends: it is not relied on to hold data (owner's decision, 2026-09-28).
 * - Telemetry has its own WebSocket, separate from the signaling socket (owner, 2026-09-30).
 *
 * Rules added from the analytics review (owner, 2026-10-01; notes/analytics-notes.md):
 * - Infrastructure names, never addresses: the signaling VSP tells the SDK its region, DC and node, and the B2BUA-RTC
 *   that serves a call; the SDK puts them on its socket, login and call events.
 * - Every failure carries the SDK's own code (one list for all SDKs) and, when a server refused, the server's code
 *   and message (ErrorInfo).
 * - Failed logins are reported by VSP itself (VspLoginFailedRecord, section 5); the SDK puts its sdk_instance_id in
 *   the login request so VSP's record joins the instance's events.
 * - "Provided" flags say whether the app gave the SDK something (an element, a device ID), never the value.
 */

// ============================================================================
// 1. TRANSPORT: one message per event on the SDK's own telemetry WebSocket
// ============================================================================

/**
 * SDK -> VSP, on the SDK's own telemetry WebSocket: a second socket next to the signaling one, always on a different
 * VSP node than the signaling socket (VSP nodes are already loaded by signaling). So telemetry cannot delay signaling.
 * How this socket is authenticated, and whether it ends on dedicated VSP nodes or straight on the Telemetry Backend
 * (with a short-lived signed token from the signaling login), is open (contract 1.13, question 8).
 * One JSON-RPC notification per event (no `id`, so the server never answers), sent the moment the event happens.
 * The client is not relied on to hold, batch, acknowledge or resend anything:
 * - Nothing is batched and nothing is resent. Delivery from the client is at most once; a gap in `sequence` shows a loss.
 * - Sent only while the telemetry socket is connected and authenticated. Events that happen while it is not (SDK
 *   creation, the time before the telemetry socket is up, a telemetry reconnect) wait IN MEMORY ONLY, at most
 *   options.telemetry.max_pending_events (oldest dropped first). As soon as the telemetry socket is up they are sent
 *   one message each, in sequence order, with sent_at set. They are lost if the page or app closes first.
 *   A failed SDK instance's pending events are sent by the next instance whose telemetry socket is up on the same
 *   page or app process, still under the failed instance's own sdk_instance_id.
 * - Bounded: when the telemetry socket's unsent backlog is above options.telemetry.max_send_backlog_bytes
 *   (browser: WebSocket.bufferedAmount), the event is dropped, never queued.
 * - Telemetry frames are never recorded as signaling_message, and the SDK does not log each send (no feedback loop).
 * Server side, VSP may group many sockets' messages per request to the Telemetry Backend; that batching is ours, not the client's.
 */
export type TelemetryNotification = {
  jsonrpc: '2.0';
  method: 'telnyx_rtc.telemetry';
  params: ClientEvent; // the whole event: envelope + { name, payload }
};

/**
 * VSP -> SDK, on the telemetry socket: the kill switch. Sent when telemetry is switched off or back on for this socket.
 * enabled: false = stop sending and drop pending events, until enabled: true or until the telemetry socket connects again.
 * Calls are never affected. Without this message, telemetry is on.
 */
export type TelemetryControlNotification = {
  jsonrpc: '2.0';
  method: 'telnyx_rtc.telemetry_control';
  params: { enabled: boolean };
};

// ============================================================================
// 2. ENVELOPE: one event, exactly as it travels in its message
// ============================================================================

export type ClientEvent =
  | (Envelope & Exclude<EventBody, { name: 'call_metrics' }>)
  | (MetricsEnvelope & Extract<EventBody, { name: 'call_metrics' }>);

/**
 * call_metrics always carries these: a call cannot exist without a socket and a login (owner, 2026-09-30).
 * So they are required there, and the backend dead-letters a call_metrics record without them (invalid_envelope).
 */
export type MetricsEnvelope = Envelope & {
  socket_generation: number;
  ids: KnownIds & { voice_sdk_id: string; session_id: string; call_id: string };
};

/** Who, where and when. Same shape for every event. */
export type Envelope = {
  schema_version: '2.1'; // "MAJOR.MINOR"; see contract section 1.10 (schema evolution). 2.1: call_sequence, shared events copied per active call
  sequence: number; // 1, 2, 3... per sdk_instance_id, across sockets and logins, never reset; never reused for a different event (the copies of one shared event share it): with sdk_instance_id it identifies the event (support links, DLQ, read-time dedupe); gaps = lost events
  call_sequence?: number; // since 2.1. On every record with ids.call_id: 1, 2, 3... per (sdk_instance_id, call_id), counting the call's own events, its call_metrics and its copies of shared events. call_ended carries the last one (= the call's record count). Absent without call_id
  timestamp: string; // client time it happened. call_metrics: end of the interval
  socket_generation?: number; // the signaling socket attempt it happened on: absent before the first socket_connect_started, then 1, +1 for each new socket. A counter, not an ID
  client: ClientInfo; // repeated in every message; permessage-deflate removes the repetition on the wire
  ids: KnownIds;
  sent_at?: string; // only on an event that waited for the telemetry socket: client clock when its message was sent
};

/** Every ID known when the event happened. Used to join events. Omitted = not known yet. */
export type KnownIds = {
  sdk_instance_id: string; // created with the SDK, never changes; the Kafka key
  voice_sdk_id?: string; // from the server on connect; kept across socket reconnects and, in session storage, across page refreshes, so it can span several SDK instances
  session_id?: string; // server sessid, from login_succeeded on; kept across socket reconnects
  call_id?: string; // SDK call id (verto callID); on every event of the call. Since 2.1 a shared event (socket, login, gateway, logs...) is sent once per active call, each copy with that call's id (same sequence and timestamp); none after the call's call_ended
  /**
   * Telnyx call-control IDs, from the first call_state that knows them onward, on every call-scoped event
   * EXCEPT call_metrics: they are constant per call and would add ~119 B (+13%) to every 1 Hz sample,
   * and metric rows are joined to the call by call_id.
   */
  telnyx_leg_id?: string;
  telnyx_session_id?: string; // the Telnyx call session (not the verto sessid in session_id)
};

/** What is running. Constant for the life of the SDK instance. */
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
  user_agent: string; // browser UA on web; SDK-defined UA on native
  // network_type is not here: it changes during an instance's life, so it is the network_changed event.
};

/** User-Agent Client Hints (navigator.userAgentData, Chromium browsers), as the browser gives them. */
export type ClientHints = {
  brands?: { brand: string; version: string }[];
  full_version_list?: { brand: string; version: string }[];
  mobile?: boolean;
  platform?: string; // "macOS"
  platform_version?: string; // "26.6.2"
  architecture?: string; // "arm", "x86"
  bitness?: string; // "64"
  model?: string; // Android device model; "" on desktop
  form_factors?: string[]; // ["Desktop"]
  wow64?: boolean;
};

// ============================================================================
// 3. EVENTS: name -> payload
// ============================================================================

export type EventBody =
  // ---- SDK instance ----
  /** The SDK constructor was entered. The only event that carries the options. */
  | {
      name: 'sdk_creation_started';
      payload: {
        options: SdkOptions;
        /** What the browser's User-Agent Client Hints say (Chromium); omitted where the browser has none. */
        client_hints?: ClientHints;
        /**
         * The options exactly as the app passed them to the constructor, with password and tokens
         * replaced by "[REDACTED]". DOM elements and functions are described, not copied.
         */
        raw_client_options: Record<string, unknown>;
      };
    }
  /** The constructor threw (e.g. invalid options). */
  | { name: 'sdk_creation_failed'; payload: { error: CodedErrorInfo } }
  /** The constructor finished. */
  | { name: 'sdk_created'; payload: SdkCreatedPayload }
  /** Once right after sdk_created (initial: true), then on every network type or online/offline change. */
  | { name: 'network_changed'; payload: NetworkChangedPayload }
  /** The app went to the background or came back; on web, the tab was hidden or shown. */
  | { name: 'app_state_changed'; payload: AppStateChangedPayload }
  /**
   * Devices, for the instance's whole life, in a call or not (during a call they carry its ID, like every record).
   * No device names: a label can carry a person's name, and analytics needs counts. The call's media snapshot keeps its label.
   */
  | { name: 'input_device_changed'; payload: DeviceChangedPayload }
  | { name: 'output_device_changed'; payload: DeviceChangedPayload }
  /** The browser's or OS's device list changed by itself (devicechange; audio route change on iOS and Android). */
  | { name: 'device_list_changed'; payload: DeviceListChangedPayload }

  // ---- Signaling socket (joined by the envelope's socket_generation; the target is sent once, on _started) ----
  // The telemetry socket has no events of its own: the telemetry sender logs its connects and drops (category "telemetry").
  /** A new signaling socket starts opening. socket_generation has just gone up by one. */
  | {
      name: 'socket_connect_started';
      payload: { target: SocketTarget; is_reconnect: boolean };
    }
  /** The socket did not open. */
  | { name: 'socket_failed'; payload: SocketFailedPayload }
  /** The signaling socket is open. */
  | { name: 'socket_connected'; payload: SocketConnectedPayload }
  /** An open socket closed. A normal close is not an error. */
  | { name: 'socket_closed'; payload: SocketClosedPayload }

  // ---- Login ----
  /** The login request was sent. */
  | { name: 'login_started'; payload: LoginStartedPayload }
  /** The server rejected the login, or it timed out. */
  | { name: 'login_failed'; payload: LoginFailedPayload }
  /** The server accepted the login. ids.session_id is set from this event on. */
  | { name: 'login_succeeded'; payload: LoginSucceededPayload }
  /** The client can make and take calls (server clientReady). Once per (re)login. */
  | { name: 'client_ready'; payload: ClientReadyPayload }

  // ---- Gateway (SIP registration) ----
  /** The server reported a new gateway state. */
  | { name: 'gateway_state'; payload: GatewayStatePayload }
  /** JS polls the gateway state after the first login. */
  | { name: 'gateway_check_started'; payload: { check_number: number } }
  /** The poll got an answer. */
  | { name: 'gateway_check_succeeded'; payload: GatewayCheckSucceededPayload }
  /** The poll errored or timed out. */
  | {
      name: 'gateway_check_failed';
      payload: { check_number: number; error: ErrorInfo; will_retry: boolean };
    }

  // ---- Signaling ----
  /** Every JSON-RPC frame sent or received on the signaling socket. Replaces V1's SEND:/RECV: log lines. */
  | { name: 'signaling_message'; payload: SignalingMessagePayload }

  // ---- Call ----
  /** The SDK created a call object (outbound newCall(), or an inbound invite arrived). */
  | { name: 'call_started'; payload: CallStartedPayload }
  /** Every SDK call state transition (trying, ringing, active, held, hangup...). */
  | { name: 'call_state'; payload: CallStatePayload }
  /**
   * One ICE candidate, as it happens: every local candidate the SDK gathers (host, srflx, prflx, relay), and every
   * remote candidate it receives. Together they are the full list for the call. The V1 "RTCPeer Candidate:" log line
   * still goes out as a log; this is the same fact as data.
   */
  | { name: 'ice_candidate'; payload: IceCandidatePayload }
  /** Media setup snapshot: at the first metrics tick, then at any tick where something in it changed. */
  | { name: 'call_media_changed'; payload: CallMediaChangedPayload }
  /** Every second (1 Hz) while the call has a peer connection. */
  | { name: 'call_metrics'; payload: CallMetricsPayload }
  /** The SDK's quality detector fired. One event per firing; episodes are derived at read time. */
  | { name: 'call_warning'; payload: CallWarningPayload }
  /**
   * Once: when the call is active and DTLS has connected, whichever comes last, or at call end if either never
   * happened. Not at DTLS alone: with early media, DTLS connects before the answer. Replaces the [CallTimings] ASCII table.
   */
  | { name: 'call_timings'; payload: CallTimingsPayload }
  /** The call object was destroyed. Carries the exact final totals. */
  | { name: 'call_ended'; payload: CallEndedPayload }

  // ---- Diagnostics, logs, errors ----
  /** An mtr/traceroute run finished (pre-call test, app, support or after a warning). Hops stay in the payload. */
  | { name: 'network_route_measured'; payload: NetworkRouteMeasuredPayload }
  /** One SDK log line = one event. The envelope timestamp is the line's time. Flattened: no `log` wrapper. */
  | { name: 'logs'; payload: LogEntry }
  /** An error not already covered by a *_failed event. */
  | { name: 'error'; payload: ErrorPayload };

export type EventName = EventBody['name'];
export type EventPayload = EventBody['payload'];

// ============================================================================
// 4. PAYLOADS AND SHARED PIECES
// ============================================================================

// ---------------------------------------------------------------------------
// SDK instance
// ---------------------------------------------------------------------------

/**
 * Only the well-structured, essential client options every SDK shares and that we know from the start.
 * Everything else the app passed is in sdk_creation_started.raw_client_options.
 */
export type SdkOptions = {
  login: string | null; // SIP username or gencred login; null for token and anonymous logins
  debug: boolean;
  login_type: 'sip_credential' | 'gencred' | 'token' | 'anonymous';
  explicit_rtc_provided: boolean; // the app set rtcIp and rtcPort
  use_canary: boolean | null; // useCanaryRtcServer; null when not set
  skip_trailing: boolean;

  region: string | null; // requested, e.g. "auto", "us-central"
  keep_connection_alive_on_socket_close: boolean | null; // JS
  hangup_on_before_unload: boolean | null; // JS
  trickle_ice: boolean;
  prefetch_ice_candidates: boolean | null;
  force_relay_candidate: boolean | null;
  muted_mic_on_start: boolean | null;
  push_when_active: boolean | null; // JS pushWhenActive (sent in the login request today)
  early_sdp_answer: boolean | null; // JS earlySdpAnswer
  media_permissions_recovery: boolean | null; // JS mediaPermissionsRecovery: enabled or not (the object itself is not sent)
  ice_servers: IceServerInfo[]; // what the SDK will use: JS fills in its defaults when the app passed none
  custom_ice_servers: boolean; // true = the app passed its own ICE servers (the list above cannot say so)
  push_provider: 'fcm' | 'apns' | 'none';
  log_level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'off';
  telemetry: TelemetryOptions;
};

/** V1 callReports.flushIntervalMs and debugLogMaxEntries have no equivalent: nothing is batched or buffered for sending. */
export type TelemetryOptions = {
  enabled: boolean; // app-level off switch: false = the SDK records and sends nothing (so this event is never seen with false)
  metrics_interval_ms: number; // 1000
  max_pending_events: number; // 1000 (assumption): held in memory only while the telemetry socket is not connected and authenticated
  max_send_backlog_bytes: number; // 65536 (assumption): above this unsent telemetry-socket backlog, telemetry is dropped, never queued
};

/** V1 masking kept. V1's hasUsername always equalled hasCredential in the samples, so only one flag. */
export type IceServerInfo = { url: string; has_credential: boolean };

export type SdkCreatedPayload = {
  creation_duration_ms: number;
  sdk_instances: string[]; // live SDK instance ids in the same app/page, this one included (owner's field, moved off the envelope)
};

export type NetworkChangedPayload = {
  initial: boolean; // true = the snapshot right after sdk_created (the network at start), not a change
  network_type: 'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'none' | 'unknown';
  online: boolean;
  effective_type?: 'slow-2g' | '2g' | '3g' | '4g' | '5g'; // navigator.connection or the native radio
  downlink_mbps?: number;
};

/** Mobile: foreground or background. Web: the tab's visibility (visibilitychange). */
export type AppStateChangedPayload = {
  state: 'foreground' | 'background' | 'visible' | 'hidden';
};

/**
 * by: "app" = the app chose the device (setAudioSettings, client.speaker, setAudioInDevice, setAudioOutDevice);
 * "sdk" = the SDK switched by itself, e.g. back to the default device when the one in use was unplugged.
 */
export type DeviceChangedPayload = {
  by: 'app' | 'sdk';
  device_count?: number; // inputs (input_device_changed) or outputs (output_device_changed) available after the change
};

export type DeviceListChangedPayload = {
  input_count: number; // after the change
  output_count: number;
  added: number;
  removed: number;
};

// ---------------------------------------------------------------------------
// Socket
// ---------------------------------------------------------------------------

/**
 * The signaling VSP the SDK is talking to, by name (owner, 2026-10-01): the server tells the SDK on connect.
 * Names only, never addresses. Repeated on the login events and client_ready so each can be counted by it.
 */
export type SignalingVsp = {
  signaling_region?: string; // e.g. "us-central"
  signaling_dc?: string; // e.g. "da1-prod"
  signaling_node?: string; // e.g. "vsp-da1-11"
};

/** Where the socket connects. No credentials or query tokens in the url. */
export type SocketTarget = {
  url: string; // e.g. "wss://rtc.telnyx.com"
  region?: string; // requested
  rtc_ip?: string;
  rtc_port?: number;
  use_canary_server: boolean;
  skip_last_voice_sdk_id: boolean;
  skip_trailing: boolean;
  resume_voice_sdk_id?: string; // voice_sdk_id the client asked to return to: a reference, not this event's own ID
};

export type SocketFailedPayload = {
  error: CodedErrorInfo; // e.g. code "45001" (JS: WebSocket connection failed)
  close_code?: number;
  attempt: number; // 1 for the first try
  will_retry: boolean;
};

/** The signaling socket's region and DC: what a call's troubleshooting needs (vsp.vsp_region and vsp_dc are the telemetry socket's). */
export type SocketConnectedPayload = {
  connect_duration_ms: number;
  region?: string; // resolved by the server, e.g. "us-central"
  dc?: string; // e.g. "da1-prod"
  node?: string; // the signaling VSP node's name, e.g. "vsp-da1-11" (needs the server to send it)
};

export type SocketClosedPayload = {
  close_code?: number; // 1000 normal, 1006 abnormal
  reason?: string;
  closed_by: 'client' | 'server' | 'network' | 'unknown';
  open_duration_ms: number;
  will_reconnect: boolean;
  in_background?: boolean; // the app was in the background, or the tab hidden, when it closed (app_state_changed)
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * How the client logs in. Only the kind, never the secret. V1 login_password -> sip_credentials, login_token -> token.
 * `username` is the SIP username (personal data, open question): the SDK sends it, and by default the Telemetry
 * Backend replaces it with a keyed hash ("h:" + 16 hex). VSP's credential_id already identifies the credential.
 */
export type LoginMethod =
  | { login_type: 'sip_credentials'; username: string }
  | { login_type: 'gencred'; username: string } // generated credential: provenance only, same wire login
  | { login_type: 'token' }
  | { login_type: 'anonymous'; target_type: string; target_id: string };

export type LoginType = LoginMethod['login_type'];

export type LoginStartedPayload = {
  method: LoginMethod;
  is_reconnect: boolean;
  resume_session_id?: string; // sessid asked to resume: a reference, not this event's own ID
};

/**
 * For the instance's timeline only. Analytics counts failed logins from VSP's own records (VspLoginFailedRecord),
 * so a retry is never counted twice, and successful ones from login_succeeded (owner, 2026-10-01).
 */
export type LoginFailedPayload = SignalingVsp & {
  method: LoginMethod;
  is_reconnect: boolean;
  error: CodedErrorInfo; // e.g. code "46002", server_code "-32001", server_message "Login Incorrect"
  will_retry: boolean;
};

export type LoginSucceededPayload = SignalingVsp & {
  method: LoginMethod;
  is_reconnect: boolean;
  login_duration_ms: number;
};

/**
 * Only what is new. Options, target and method were already sent.
 * The connection's step times, measured by the SDK, so each step's latency is on one record (analytics notes 1c).
 * A step that took several tries counts from its first try to its success.
 */
export type ClientReadyPayload = SignalingVsp & {
  is_reconnect: boolean; // false for the instance's first connection
  time_to_ready_ms: number; // since sdk_creation_started: the whole first connection, the app's wait included
  connect_to_ready_ms: number; // since the connect() (or reconnect) that led to this: the SDK's own total
  app_wait_ms?: number; // first connection: sdk_created -> the app called connect()
  socket_connect_ms?: number; // first socket_connect_started -> socket_connected of this connection
  login_ms?: number; // first login_started -> login_succeeded of this connection
  login_to_ready_ms?: number; // login_succeeded -> client_ready
  socket_attempts: number;
  login_attempts: number;
  started_by_push?: boolean; // iOS, Android: the session was started by a push
  push_to_ready_ms?: number; // iOS, Android: the push arrived -> client_ready
  // What the app set on the client by now: provided or not, never the value (analytics notes 1b). null = this SDK has no such thing.
  remote_element_provided: boolean | null; // JS client.remoteElement
  mic_id_provided: boolean; // JS client.setAudioSettings({ micId })
  speaker_id_provided: boolean | null; // JS client.speaker
  reattached_call_ids: string[]; // references to other calls; [] when none
};

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

/** Known gateway states; anything else is "UNKNOWN" with raw_state kept. */
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
  raw_state: string; // exactly as received
  previous_state?: GatewayState;
};

export type GatewayCheckSucceededPayload = {
  check_number: number;
  state: GatewayState;
  raw_state: string;
  response_time_ms: number;
};

// ---------------------------------------------------------------------------
// Signaling
// ---------------------------------------------------------------------------

/** Values from the one Category list: call frames and login/session frames. Ping/PONG and debug_report_data frames are not sent. */
export type SignalingCategory = Extract<Category, 'call' | 'connection'>;

/**
 * Every JSON-RPC frame sent or received on the signaling socket, resent as it is (owner, 2026-10-06): no
 * structure of our own, only the direction. Passwords and tokens become "[REDACTED]" and SDP loses its
 * a=ice-pwd: lines; everything else is the frame. Ping and debug_report_data frames and their answers are
 * not sent. callID goes to ids.call_id.
 */
export type SignalingMessagePayload = {
  direction: 'sent' | 'received';
  raw: unknown; // the JSON-RPC frame
};

// ---------------------------------------------------------------------------
// Call
// ---------------------------------------------------------------------------

/**
 * The B2BUA-RTC instance that serves the call, by name (owner, 2026-10-01): VSP tells the SDK. Names only: never the
 * IP or port that voice_sdk_id encodes. On call_started when the SDK knows it (an inbound invite); otherwise on the
 * first call_state that knows it (outbound: after the server answered the invite).
 */
export type B2buaRtc = {
  b2bua_rtc_node?: string;
  b2bua_rtc_region?: string;
  b2bua_rtc_dc?: string;
};

/**
 * The values the call ran with (analytics notes 1b): its own per-call options, or the client's defaults.
 * null = this SDK has no such option; never false for "not available".
 */
export type CallStartedPayload = B2buaRtc & {
  direction: 'inbound' | 'outbound'; // JS: a reattach after a page refresh is a new call object answered as inbound (see is_reattach)
  // Personal data (open question). The SDK sends what it has; by default the Telemetry Backend replaces each
  // non-empty value with a keyed hash ("h:" + 16 hex, HMAC-SHA256 with a per-user secret). V1 was inconsistent: A hashed, C plain.
  caller_number?: string;
  caller_name?: string;
  destination_number?: string;
  audio: boolean;
  video: boolean;
  trickle_ice: boolean;
  force_relay_candidate: boolean | null; // JS can force relay per call (and on a reattach)
  prefetch_ice_candidates: boolean | null;
  keep_connection_alive_on_socket_close: boolean | null;
  custom_ice_servers: boolean; // the call's ICE servers were the app's own (per call or the client's), not the SDK's defaults
  ice_servers_count: number; // ICE servers the call used, defaults included
  use_stereo: boolean | null; // JS newCall({ useStereo })
  use_sdp_as_bandwidth: boolean | null; // JS mediaSettings.useSdpASBandwidthKbps
  sdp_as_bandwidth_kbps?: number; // JS mediaSettings.sdpASBandwidthKbps, when used
  preferred_codecs?: string[]; // "audio/PCMU/8000"
  custom_header_names?: string[]; // names only; values may carry customer PII
  // Provided or not, never the value (analytics notes 1b): per call, or the client's defaults.
  remote_element_provided: boolean | null;
  local_element_provided: boolean | null;
  mic_id_provided: boolean;
  speaker_id_provided: boolean | null;
  camera_id_provided: boolean | null;
  is_reattach: boolean; // re-attached after a reconnect or a page refresh
  // The signaling socket at call start (on a reattach, the one it re-attached on), as in that socket's socket_connected.
  // The JS SDK already logs it: "New Call — region: ..., dc: ...".
  signaling_region?: string; // e.g. "us-central"
  signaling_dc?: string; // e.g. "da1-prod"
  signaling_node?: string; // e.g. "vsp-da1-11"
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

/**
 * The Telnyx leg and call session IDs go to ids.telnyx_leg_id / ids.telnyx_session_id from the first call_state that knows them.
 * The B2BUA-RTC names go on the first call_state that knows them, when call_started did not have them.
 */
export type CallStatePayload = B2buaRtc & {
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

/**
 * A full snapshot every time (the latest row is the current media state).
 * Checked at every metrics tick; sent at the first tick and whenever any field differs from the last one sent.
 */
export type CallMediaChangedPayload = {
  changed: MediaChange[];
  codec_in?: Codec;
  codec_out?: Codec;
  target_bitrate_bps?: number; // outbound targetBitrate (64000 for PCMU in every sample)
  // The selected candidate pair, in every snapshot: the same fields as the ice_candidate list, so the report can point
  // at both candidates in it (match on foundation, address, port and protocol).
  local_candidate?: IceCandidate;
  remote_candidate?: IceCandidate;
  // Only when changed includes "candidate_pair": the pair selected before this change, so one event holds the previous
  // and the new pair even if an earlier snapshot was lost. Sample A: srflx over UDP (STUN) -> relay over TURN/TCP,
  // 0.6 s before the call ended.
  previous_local_candidate?: IceCandidate;
  previous_remote_candidate?: IceCandidate;
  pair_changes?: number; // transport.selectedCandidatePairChanges: counts every change, also two within one tick
  ice_state?:
    | 'new'
    | 'checking'
    | 'connected'
    | 'completed'
    | 'disconnected'
    | 'failed'
    | 'closed';
  dtls_state?: 'new' | 'connecting' | 'connected' | 'closed' | 'failed';
  srtp_cipher?: string; // e.g. "SRTP_AES128_CM_HMAC_SHA1_80"
  dtls_version?: string; // e.g. "FEFD" (DTLS 1.2)
  sending?: boolean; // outbound encoding active (V1 audio.outbound.active)
  input_device?: InputDevice;
  output_device_label?: string; // same rule as InputDevice.label
  input_device_count?: number;
  output_device_count?: number;
  echo_return_loss_db?: number; // constant through every V1 sample, so here, not per second
  echo_return_loss_enhancement_db?: number;
};

export type Codec = {
  mime_type: string; // "audio/PCMU"
  clock_rate: number; // Hz
  channels: number;
  payload_type: number;
  sdp_fmtp_line?: string;
};

/** One ICE candidate: an entry of the candidate list (ice_candidate), or one side of the selected pair (call_media_changed). */
export type IceCandidate = {
  candidate_type: 'host' | 'srflx' | 'prflx' | 'relay';
  protocol: 'udp' | 'tcp';
  relay_protocol?: 'udp' | 'tcp' | 'tls';
  network_type?: 'ethernet' | 'wifi' | 'cellular' | 'vpn' | 'unknown';
  foundation?: string;
  priority?: number;
  tcp_type?: 'active' | 'passive' | 'so'; // TCP candidates only
  related_address?: string; // raddr: for srflx/relay, the base it was derived from (masked like address)
  related_port?: number;
  // Masked by the Telemetry Backend (V1 did not mask): private, CGNAT, link-local and ULA addresses -> "192.168.139.x" /
  // "fdxx:x:x:x:x:x:x:x"; mDNS host names ("<uuid>.local") -> "x.local"; public (srflx, prflx) -> /24 "203.0.113.x"
  // or /48 "2001:db8:1234:x:x:x:x:x" until the personal-data question is decided. Telnyx addresses are kept: media
  // servers (the remote side) and TURN relay addresses.
  address?: string;
  port?: number;
  url?: string; // STUN/TURN server that produced it
};

/**
 * One gathered (local) or received (remote) ICE candidate. The address rules of IceCandidate apply: private addresses
 * masked, public ones truncated, Telnyx media-server addresses kept. related_address (raddr) is masked the same way.
 * The raw candidate line is not sent: it only repeats these fields, plus the ICE ufrag.
 *
 * Local: sent from the icecandidate handler, for every candidate until gathering completes. Today the SDK removes that
 * handler once a non-trickle SDP has gone out, so the telemetry listener must be its own.
 * Remote: sent for each candidate in the remote SDP when it is applied, and for each trickle telnyx_rtc.candidate.
 */
export type IceCandidatePayload = IceCandidate & {
  side: 'local' | 'remote';
  ice_generation: number; // 1 for the first gathering, +1 after each ICE restart
  component: 'rtp' | 'rtcp';
  since_gathering_started_ms?: number; // local: time since ICE gathering started; remote: since the remote description arrived
  // Local only. false = gathered after the SDK had already sent its SDP without trickle ICE (it waits at most 1 s,
  // 5 s on a reattach), so the far end never saw this candidate. Sample A's third relay candidate came 111 ms before
  // that cutoff. Always true with trickle ICE, unless the candidate could not be sent.
  signaled?: boolean;
};

/** The microphone. Track id, deviceId and groupId are not sent (random per-origin hashes). */
export type InputDevice = {
  label: string; // "Headset Microphone (Yealink UH37)": the trailing USB "(vid:pid)" suffix is stripped (SDK and backend)
  enabled: boolean; // false = muted by the app
  muted: boolean; // muted by the browser/OS
  ready_state: 'live' | 'ended';
  auto_gain_control?: boolean;
  echo_cancellation?: boolean;
  noise_suppression?: boolean;
  sample_rate?: number; // Hz
  sample_size?: number; // bits
  channel_count?: number;
  latency_ms?: number; // V1 latency 0.01 s -> 10
};

/**
 * One getStats() interval. envelope.timestamp = end of the interval.
 * Delta = count during this interval only. A delta of 0 is omitted (omitted = 0), except played_samples and
 * synthesized_ms: those are sent whenever the SDK can read them, 0 included, and omitted only when the stat does
 * not exist (e.g. JS 2.27.3 has no mediaPlayout.totalSamplesCount). So for those two, omitted = not measured.
 * Gauge = value for this interval; omitted when not measured (the pre-DTLS first sample, remote RTCP in the first ~3 s).
 * Derived at read time, not sent: bitrate (bytes x 8000 / interval_ms), loss %, fraction lost, MOS, averages.
 */
export type CallMetricsPayload = {
  interval_ms: number; // actual length, ~1000

  // Network (gauges)
  rtt_ms?: number; // ICE candidate-pair currentRoundTripTime (s) x 1000
  rtcp_rtt_ms?: number; // remote-inbound-rtp roundTripTime (s) x 1000: the media path end to end
  jitter_ms?: number; // inbound-rtp jitter (s) x 1000, 1 decimal (V1 jitterAvg rounded to whole ms and was mostly 0)
  remote_jitter_ms?: number; // remote-inbound-rtp jitter (s) x 1000, 1 decimal: the far end's jitter on our audio

  // Inbound RTP (deltas)
  in_packets?: number;
  in_bytes?: number; // payload bytes
  in_lost?: number;
  in_discarded?: number; // sample A: 94% discarded, the key "no audio" signal
  in_fec_packets?: number;

  // Decoder, jitter buffer and playout
  in_samples?: number; // delta totalSamplesReceived
  in_concealed_samples?: number; // delta
  in_concealment_events?: number; // delta
  played_samples?: number; // delta mediaPlayout.totalSamplesCount. Sent even when 0 (0 while packets arrive = nothing played)
  synthesized_ms?: number; // delta mediaPlayout.synthesizedSamplesDuration (s) x 1000, rounded to a whole ms. Sent even when 0
  jitter_buffer_ms?: number; // gauge: delta jitterBufferDelay / delta jitterBufferEmittedCount x 1000
  jitter_buffer_target_ms?: number; // gauge, same method (minimum delay equalled target in every sample: not sent)
  playout_delay_ms?: number; // gauge: delta totalPlayoutDelay / delta totalSamplesCount x 1000
  in_level?: number; // gauge 0..1: sqrt(delta totalAudioEnergy / delta totalSamplesDuration)

  // Outbound RTP
  out_packets?: number; // delta
  out_bytes?: number; // delta
  out_retransmitted_packets?: number; // delta
  out_nacks?: number; // delta nackCount (NACKs received from the far end)
  out_send_delay_ms?: number; // gauge: delta totalPacketSendDelay / delta packetsSent x 1000
  out_level?: number; // gauge 0..1 from media-source energy (the microphone)

  // Far end's RTCP reports (deltas)
  remote_lost?: number; // our packets the far end reported lost
  remote_sent_packets?: number; // what the far end says it sent us

  // ICE consent checks (deltas): requests without responses = the path is dying
  ice_requests?: number;
  ice_responses?: number;

  counters_reset?: true; // the peer connection was replaced; deltas start from a new baseline
};

/** Codes seen in the V1 samples, with the name the SDK sends. Other SDK codes pass through as numbers. */
export const WARNING_CODES = {
  31001: 'high_network_latency',
  31005: 'low_local_audio', // microphone
  31006: 'low_inbound_audio', // also fires while the far side is silent
  33008: 'ice_pair_changed',
} as const;

export type KnownWarningCode = keyof typeof WARNING_CODES;
export type WarningCode = KnownWarningCode | (number & {});

/**
 * One event each time the SDK's detector fires, exactly as V1 fires it (B: 12 firings of 31001, one every ~15 s,
 * for one steady condition). The SDK keeps no episode state; the report groups firings of the same code that are
 * less than ~20 s apart into one episode at read time. The SDK's own warning log line is still sent as `logs`.
 */
export type CallWarningPayload = {
  code: WarningCode;
  name: string; // "high_network_latency"
  metric?: string; // "rtt_ms"
  value?: number; // the measurement that tripped it, e.g. 620
  threshold?: number; // e.g. 400
};

/**
 * Milliseconds since call_started (V1 "From Start" column; "Delta" is derived at read time).
 * Steps that did not happen are omitted, and so are steps that happen after the event was sent.
 * Sent when the call is active and DTLS has connected, whichever comes last (owner, 2026-10-01): sending at DTLS alone
 * left out the answer on early-media calls, and DTLS can connect a moment after active.
 */
export type CallTimingsPayload = {
  complete: boolean; // false = sent at call end because the call never became active, or DTLS never connected
  answer_called_ms?: number; // inbound: invite -> app called answer() (V1 "Answer delay")
  peer_created_ms?: number;
  media_devices_acquired_ms?: number;
  peer_setup_complete_ms?: number;
  sdp_negotiation_started_ms?: number;
  sdp_local_created_ms?: number; // offer (outbound) or answer (inbound)
  local_description_applied_ms?: number;
  ice_gathering_started_ms?: number;
  sdp_sent_ms?: number;
  first_ice_candidate_ms?: number;
  first_srflx_or_relay_candidate_ms?: number;
  all_ice_candidates_gathered_ms?: number;
  remote_ringing_ms?: number;
  early_media_ms?: number; // telnyx_rtc.media arrived (JS mark telnyx-rtc-media)
  remote_answered_ms?: number;
  first_remote_track_ms?: number;
  remote_description_applied_ms?: number;
  call_active_ms?: number;
  ice_connected_ms?: number;
  dtls_connected_ms?: number;
  first_packet_received_ms?: number; // new: first metrics interval with in_packets > 0
};

export type CallEndReason =
  | 'local_hangup'
  | 'remote_hangup'
  | 'rejected' // inbound declined by the app
  | 'busy'
  | 'no_answer'
  | 'cancelled' // outbound hung up before answer
  | 'failed' // setup error (media, SDP, server error)
  | 'network_lost' // socket or ICE loss without a hangup
  | 'unknown';

export type CallEndedPayload = {
  end_reason: CallEndReason;
  cause?: string; // verto/SIP cause from telnyx_rtc.bye, e.g. "NORMAL_CLEARING"
  cause_code?: number; // e.g. 16
  sip_code?: number;
  sip_reason?: string;
  last_state: CallState; // state before hangup (the whole path is in call_state; calls.state_path keeps it)
  answered: boolean;
  duration_ms: number; // call_started -> call_ended (V1 durationSeconds x 1000)
  talk_ms?: number; // active -> ended
  metrics_samples: number; // call_metrics sent; the report compares with rows stored
  totals: CallTotals;
};

/** Final cumulative getStats() counters: exact even if some samples were lost. Same names as call_metrics. */
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
  rtcp_rtt_avg_ms?: number; // totalRoundTripTime / roundTripTimeMeasurements
  pair_changes: number;
};

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export type NetworkRouteMeasuredPayload = {
  tool: 'mtr' | 'traceroute' | 'other';
  trigger: 'preflight' | 'app' | 'support' | 'quality_warning';
  target: string; // host or IP tested, e.g. the media server
  protocol: 'icmp' | 'udp' | 'tcp';
  port?: number;
  packet_size_bytes?: number;
  probes_per_hop: number; // mtr "tests"
  duration_ms?: number;
  hops: RouteHop[]; // the source host name (mtr "src") is not sent: it names the device
};

export type RouteHop = {
  hop: number; // 1-based
  host: string | null; // null when the hop did not answer ("???"). Private addresses (usually hops 1-2) are masked: "192.168.1.x"
  loss_pct: number;
  sent: number;
  last_ms: number;
  avg_ms: number;
  best_ms: number;
  worst_ms: number;
  stdev_ms: number;
};

// ---------------------------------------------------------------------------
// Logs and errors
// ---------------------------------------------------------------------------

/**
 * ONE category list for every record (logs, signaling frames and events), so the read-time filter means one thing.
 * The SDK sets it on logs and signaling frames; the Telemetry Backend sets it on every other event (see RecordCategory).
 * Hidden by default at read time (with a count): ice_candidate_error, telemetry. Keepalive is not sent at all.
 */
export type Category =
  | 'connection' // SDK creation, network, app state, socket, login (VSP's failed-login records too), gateway; login/session signaling frames
  | 'call' // call state changes, hangup, new call; call signaling frames; call_* events
  | 'media' // getUserMedia, tracks, mute, devices, RTCPeerConnection and SDP steps (never SDP text); call_media_changed, device events
  | 'ice' // ice_candidate; gathering, connection state, "RTCPeer Candidate:" lines
  | 'warning' // quality warnings: the SDK's warning lines (31001...) and call_warning
  | 'metrics' // call_metrics
  | 'error' // error events and error-level problems
  | 'diagnostics' // network_route_measured
  | 'general' // anything else
  | 'ice_candidate_error' // noise: 59 of 176 lines in sample A
  | 'telemetry' // noise: the telemetry sender about itself (drops, its own socket's connects and failures); never one line per send
  | 'unknown'; // backend only: an event name from a newer minor schema version

/** What the SDK may put on a log line. */
export type LogCategory = Exclude<
  Category,
  'metrics' | 'diagnostics' | 'unknown'
>;

/** One SDK log line. Its time is envelope.timestamp. */
export type LogEntry = {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  category: LogCategory; // set at the call site; the backend re-derives it from the message for SDKs that do not
  message: string; // max 2 KB
  details?: Record<string, unknown>; // plain JSON only, sanitized, max 4 KB serialized
};

/** A call error (stage call or media) must carry the SDK's code: analytics counts calls by it (CallErrorRate). */
export type ErrorPayload =
  | {
      stage: 'call' | 'media';
      error: CodedErrorInfo; // e.g. "42001" microphone permission denied, "40002" creating the SDP answer failed
      is_fatal: boolean; // the SDK can no longer work
      details?: Record<string, unknown>; // sanitized
    }
  | {
      stage: 'sdk' | 'socket' | 'login' | 'gateway' | 'telemetry' | 'unknown';
      error: ErrorInfo;
      is_fatal: boolean;
      details?: Record<string, unknown>;
    };

/**
 * JSON.stringify(new Error()) gives "{}", so copy the fields.
 * Two codes (owner, 2026-10-01): `code` is the SDK's own, from one list for all SDKs (the JS SDK's list: 400xx SDP,
 * 420xx media, 440xx call control, 450xx socket, 460xx login, 470xx ICE restart, 480xx network, 485xx reattach,
 * 490xx unexpected); `server_code` and `server_message` are the server's answer when a server refused, so wrapping the
 * server's error in the SDK's own never loses them. Readable names and step groups come from a view at read time.
 */
export type ErrorInfo = {
  name: string; // "TypeError", "NotAllowedError"
  message: string;
  code?: string; // the SDK's own code, as a string, e.g. "46002"
  server_code?: string; // e.g. "-32001"
  server_message?: string; // e.g. "Login Incorrect"
  stack?: string; // max 20 frames / 4 KB
};

/** Required on sdk_creation_failed, socket_failed, login_failed and call errors. */
export type CodedErrorInfo = ErrorInfo & { code: string };

// ============================================================================
// 5. ADDED ON THE SERVER SIDE (the client never sends these)
// ============================================================================

/**
 * Added by VSP from the telemetry socket that delivered the message, and its login (how that socket is authenticated
 * is open, contract 1.13 question 8). Never taken from the client. It describes the telemetry connection, not the
 * signaling socket: the signaling socket's region and DC are in socket_connected and call_started.
 * For an event that waited for the telemetry socket, the connection is later than the event; its own ids say where it happened.
 */
export type VspContext = {
  user_id: string; // the customer account that logged in (V1 top-level user_id, a UUID); leads the ClickHouse sort keys. The backend writes the zero UUID when absent
  credential_id?: string; // SIP credential / connection used to log in, when there is one
  login_type: LoginType; // what VSP authenticated
  client_ip: string; // socket peer address; truncated by the backend to /24 or /48 ("203.0.113.x") until the personal-data question is decided
  client_port: number; // socket peer port, as VSP sees it
  vsp_region: string; // e.g. "us-central"
  vsp_dc: string; // e.g. "da1-prod"
  vsp_node: string;
};

/** VSP -> Telemetry Backend: one telemetry message as received plus who sent it. VSP may group many of these per request. */
export type VspForward = {
  vsp: VspContext;
  event: ClientEvent; // the message's params, unchanged
};

/**
 * VSP -> Telemetry Backend, when the signaling VSP rejects a login (owner, 2026-10-01). The client sends no telemetry
 * before it is logged in, so VSP reports failed logins itself, and analytics counts failed logins only from these
 * records (a client retry is never counted twice). The backend publishes it as a record like any other event
 * (VspLoginFailedRecord), so it lands in call_events with the instance's own events.
 */
export type VspLoginFailed = {
  timestamp: string; // VSP clock when it answered
  sdk_instance_id?: string; // from the login request: the SDK adds it (to do in every SDK). Omitted by older SDKs
  voice_sdk_id: string; // the signaling socket's
  sdk: ClientInfo['sdk'] | 'unknown'; // from the login request (JS: User-Agent.sdkVersion)
  sdk_version: string; // "" when the request did not say
  user_agent?: string; // the login request's user agent, if it has one
  vsp: VspContext; // the signaling VSP's own: user_id is the zero UUID when the username or token matched no user
  method: { login_type: LoginType; target_type?: string }; // never the username or secret
  is_reconnect?: boolean; // when the request says it resumes a session
  started_by_push?: boolean; // VSP logins already flag "from push"
  server_code: string; // what VSP answered, e.g. "-32001"
  server_message: string; // e.g. "Login Incorrect"
};

/**
 * Every record gets one, from the one Category list.
 * logs and signaling_message -> payload.category (re-derived if missing).
 * sdk_*, network_changed, app_state_changed, socket_*, login_*, vsp_login_failed, client_ready, gateway_* -> "connection".
 * input_device_changed, output_device_changed, device_list_changed -> "media".
 * call_started, call_state, call_timings, call_ended -> "call". call_media_changed -> "media". call_warning -> "warning".
 * ice_candidate -> "ice".
 * call_metrics -> "metrics". error -> "error". network_route_measured -> "diagnostics". A name from a newer minor version -> "unknown".
 */
export type RecordCategory = Category;

/** Added by the Telemetry Backend. */
export type BackendFields = {
  received_at: string; // backend clock; ClickHouse partitions by its day
  backend_node: string; // the Telemetry Backend node that received the record (the backend's region and DC are still to decide)
  browser?: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'other'; // web: parsed once from client.user_agent; omitted on native
  client_country?: string; // ISO 3166-1 alpha-2 from vsp.client_ip, looked up before the IP is truncated; omitted when unknown
  clock_skew_ms: number; // received_at - (sent_at if present, else timestamp); includes one-way transit
  category: RecordCategory; // the read-time noise filter
  redactions?: string[]; // what the sanitizer removed, e.g. ["details.iceServers.credential", "message:jwt"]; omitted when nothing. Policy transforms (hashing, IP truncation) are not listed
};

/** What the Telemetry Backend publishes to Kafka: one record per event, key = ids.sdk_instance_id. */
export type TelemetryRecord =
  | (ClientEvent & { vsp: VspContext } & BackendFields)
  | VspLoginFailedRecord;

/**
 * VSP's failed-login report as a Kafka record: the same shape as a client record, so it needs no route of its own.
 * sequence is 0: the SDK starts at 1, so it never collides with a client record; its identity is
 * (sdk_instance_id, sequence 0, timestamp). sdk_instance_id is the zero UUID when the login request had none
 * (the Kafka key is then voice_sdk_id). client.os is "unknown": VSP does not know it.
 */
export type VspLoginFailedRecord = {
  schema_version: '2.0';
  sequence: 0;
  timestamp: string;
  client: Omit<ClientInfo, 'sdk'> & { sdk: ClientInfo['sdk'] | 'unknown' };
  ids: { sdk_instance_id: string; voice_sdk_id: string };
  name: 'vsp_login_failed';
  payload: {
    method: VspLoginFailed['method'];
    is_reconnect?: boolean;
    started_by_push?: boolean;
    error: {
      name: 'LoginRejected';
      message: string;
      server_code: string;
      server_message: string;
    };
  } & SignalingVsp; // VSP's own region, DC and node
  vsp: VspContext;
} & BackendFields;
