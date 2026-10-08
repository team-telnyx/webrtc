/**
 * Call Report V2: the SDK-wide events of one SDK instance (contract 1.4):
 * sdk_*, network and app state, devices, the signaling socket, login,
 * client_ready, gateway, signaling_message and errors. Every public method is
 * a hook called from SDK code; none of them throws (guard).
 */
import TelemetryClient, {
  TELEMETRY_DEV_URL,
  TELEMETRY_PROD_URL,
} from './sender';
import type {
  AppState,
  DeviceKind,
  ErrorInfo,
  ErrorPayload,
  GatewayState,
  KnownIds,
  ListedDevice,
  LoginMethod,
  LoginType,
  NetworkChangedPayload,
  PayloadOf,
  SdkOptions,
  SocketTarget,
} from './contract';
import {
  hasFocusNow,
  onlineNow,
  readBrowserSupport,
  readClientHints,
  readDeviceList,
  readPageInfo,
  readPermission,
  readRtpCapabilities,
  visibilityNow,
  type DeviceEntry,
} from './browser';
import {
  attempt,
  bool,
  cleanObject,
  defined,
  describeNode,
  frameCallId,
  frameMethod,
  GATEWAY_STATE_METHOD,
  guard,
  isFilteredFrameMethod,
  isSecretKey,
  rawFrame,
  rpcIdString,
  scrubText,
  sanitizeDetails,
  str,
  stripUrlCredentials,
  toCodedErrorInfo,
  toErrorInfo,
  toIceServerInfo,
  words,
  type Any,
  type Flat,
} from './sanitize';

/** What the package reads from the SDK session (BaseSession); options = IVertoOptions. */
export interface SessionHost {
  options: Any;
  sessionid?: string | null;
  callReportVoiceSdkId?: string | null;
  region?: string | null;
  dc?: string | null;
  hasAutoReconnect(): boolean;
}

/** What the SDK hands the package once. */
export interface SdkConfig {
  sdkVersion: string;
  /** The telemetry server rejected the credentials: tell the app (telnyx.warning). */
  onLoginRejected?(error: ErrorInfo): void;
  defaultIceServers: Record<'production' | 'development', RTCIceServer[]>;
  readCallMarks(callId: string): Record<string, number>;
  observeCallMarks(
    callId: string,
    observer: (marks: Record<string, number>) => void
  ): () => void;
}

const CODE_WEBSOCKET_CONNECTION_FAILED = 45001;
const CODE_LOGIN_FAILED = 46001;
const CODE_INVALID_CREDENTIALS = 46002;
const MAX_PENDING_FRAMES = 500;
const GATEWAY_STATES = words(`UNREGED TRYING REGISTER REGED UNREGISTER FAILED
  FAIL_WAIT EXPIRED NOREG TIMEOUT DOWN ATTACHED`);

export const toGatewayState = (raw: string) =>
  (GATEWAY_STATES.includes(raw) ? raw : 'UNKNOWN') as GatewayState;

/** The signaling credentials, for the telemetry login too (owner, 2026-10-04). */
function loginParams(options: Any): Flat | null {
  const { login, login_token: token } = options;
  const password = options.password || options.passwd;
  if (token) return { login_token: token };
  return login && password ? { login, passwd: password } : null;
}

/** The credentials the client logs in with now (envelope login_type). */
export function loginTypeOf(options: Any): LoginType {
  if (options.login_token) return 'token';
  if (!options.login) return 'anonymous';
  return /^gencred/i.test(options.login) ? 'gencred' : 'sip_credentials';
}

/** The options as the app passed them: secrets redacted, DOM nodes, streams and functions described. */
export function rawClientOptions(options: unknown): Flat {
  const seen = new WeakSet<object>();
  const describe = (value: Any, depth: number): unknown => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'string') return scrubText(value);
    if (typeof value !== 'object') return value;
    if (typeof Node !== 'undefined' && value instanceof Node) {
      return describeNode(value as Element);
    }
    if (typeof MediaStream !== 'undefined' && value instanceof MediaStream) {
      return `[MediaStream ${value.id}]`;
    }
    if (seen.has(value) || depth > 20) return '[circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.map((v) => describe(v, depth + 1));
    const result: Flat = {};
    for (const [key, item] of Object.entries(value)) {
      const secret = isSecretKey(key);
      result[key] =
        secret && item != null && item !== ''
          ? '[REDACTED]'
          : describe(item, depth + 1);
    }
    return result;
  };
  const raw = describe(options, 0);
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Flat)
    : {};
}

export function networkSnapshot(
  initial: boolean,
  trigger?: string
): PayloadOf<'network_changed'> & { extra: Flat } {
  const n: Any = typeof navigator !== 'undefined' ? navigator : undefined;
  const online = n && n.onLine !== undefined ? !!n.onLine : true;
  const connection = n?.connection;
  const { type, effectiveType: effective, downlinkMax: max } = connection ?? {};
  const number = (value: unknown) =>
    typeof value === 'number' ? value : undefined;
  return {
    initial,
    network_type: !online
      ? 'none'
      : words('wifi cellular ethernet none').includes(type)
        ? type
        : 'unknown',
    online,
    ...defined({
      effective_type: words('slow-2g 2g 3g 4g 5g').includes(effective)
        ? (effective as NetworkChangedPayload['effective_type'])
        : undefined,
      downlink_mbps: number(connection?.downlink),
    }),
    extra: defined({
      trigger,
      connection_type: str(type),
      // Infinity = the browser can't tell.
      downlink_max_mbps: Number.isFinite(max) ? max : undefined,
      rtt_ms: number(connection?.rtt),
      save_data: bool(connection?.saveData),
    }),
  };
}

/** A server answer, whole, credentials removed. */
const serverResult = (result: unknown) => ({
  server_result: cleanObject(result),
});

const since = (from?: number, to?: number) =>
  from !== undefined && to !== undefined ? to - from : undefined;

type ConnectChain = {
  startedAt: number;
  isReconnect: boolean;
  appWaitMs?: number;
  socketAttempts: number;
  loginAttempts: number;
  firstSocketAt?: number;
  socketConnectedAt?: number;
  firstLoginAt?: number;
  loginSucceededAt?: number;
};

type SocketState = {
  startedAt: number;
  attempt: number;
  target: SocketTarget;
  openedAt?: number;
  closeRequested?: boolean;
  ended?: boolean;
  ws?: Any;
  framesSent: number;
  framesReceived: number;
  lastSentAt?: number;
  lastReceivedAt?: number;
};

type Request = { method: string; callId?: string };

/** A received frame's record: sequence taken on arrival, sent once handled. */
export type ReceivedFrame = {
  sequence: number;
  timestamp: number;
  raw: unknown;
  ids?: Partial<KnownIds>;
};

const listed = (d: DeviceEntry): ListedDevice => ({
  kind: d.kind as DeviceKind,
  id: d.device_id,
  label: d.label,
});

/** The devices `list` has beyond `other`, counted: hidden devices all look alike. */
function devicesMissing(list: DeviceEntry[], other: DeviceEntry[]) {
  const key = (d: DeviceEntry) => `${d.kind}\n${d.device_id}\n${d.label}`;
  const left = new Map<string, number>();
  for (const d of other) left.set(key(d), (left.get(key(d)) ?? 0) + 1);
  return list.filter((d) => {
    const count = left.get(key(d)) ?? 0;
    left.set(key(d), count - 1);
    return count <= 0;
  });
}

/** extra for a device list: each device's group ID, by position; none without any. */
const groupIds = (list: DeviceEntry[]) =>
  list.some((d) => d.group_id)
    ? list.map((d) => (d.group_id ? { group_id: d.group_id } : {}))
    : undefined;

export default class SessionTelemetry {
  /** Signaling socket counter (envelope socket_generation). */
  socketGeneration = 0;
  readonly creationStartedAt = Date.now();

  private _createdAt: number | null = null;
  private _hasConnected = false;
  private _hasLoggedIn = false;
  private _chain: ConnectChain | null = null;
  private _socket: SocketState | null = null;
  private _sockets = new WeakMap<object, SocketState>();
  private _login: {
    method: LoginMethod;
    isReconnect: boolean;
    startedAt: number;
    attempt: number;
  } | null = null;
  private _readyPending = false;
  private _reattachedCallIds: string[] = [];
  private _lastGateway: { raw: string; at: number } | null = null;
  private _gatewayCheckNumber = 0;
  private _gatewayChecks = new Map<string, { number: number; at: number }>();
  private _sentRequests = new Map<string, Request>();
  private _receivedRequests = new Map<string, Request>();
  private _devices: DeviceEntry[] | null = null;
  private _lastNetwork: string | null = null;
  private _appState: AppState | undefined;
  private _cleanups: Array<() => void> = [];
  private _disposed = false;

  /**
   * Telemetry for a new SDK instance, or null when it is off; emits
   * sdk_creation_started (sequence 1). An anonymous-only client only
   * captures: the telemetry socket takes no anonymous login.
   */
  static create(
    session: SessionHost,
    config: SdkConfig
  ): SessionTelemetry | null {
    const create = () => {
      const { options } = session;
      const client = TelemetryClient.create(
        options.telemetry,
        options.env,
        config.sdkVersion,
        !options.anonymous_login || !!loginParams(options)
      );
      if (!client) return null;
      const events = new SessionTelemetry(session, client, config);
      client.attach({
        getLoginParams: () => loginParams(session.options),
        getVoiceSdkId: () => session.callReportVoiceSdkId,
        getSessionId: () => session.sessionid,
        getSocketGeneration: () => events.socketGeneration,
        getLoginType: () => loginTypeOf(session.options),
        // Picked like the signaling host: production or development.
        getDefaultUrl: () =>
          session.options.env === 'development'
            ? TELEMETRY_DEV_URL
            : TELEMETRY_PROD_URL,
        onLoginRejected: (error) => config.onLoginRejected?.(error),
      });
      events.creationStarted(); // after attach: the envelope's login_type comes from the host
      return events;
    };
    return attempt(create) ?? null;
  }

  constructor(
    readonly session: SessionHost,
    readonly client: TelemetryClient,
    readonly config: SdkConfig
  ) {
    guard(this);
  }

  // ── SDK instance ─────────────────────────────────────────────────────

  /** First thing in the constructor: sequence 1. */
  creationStarted(): void {
    const { options } = this.session;
    const loginType = options.login_token
      ? 'token'
      : !options.login
        ? 'anonymous'
        : /^gencred/i.test(options.login)
          ? 'gencred'
          : 'sip_credential';
    const env = options.env === 'development' ? 'development' : 'production';
    const sdkOptions: SdkOptions = {
      login: ['token', 'anonymous'].includes(loginType) ? null : options.login,
      debug: !!options.debug,
      login_type: loginType,
      explicit_rtc_provided: !!(options.rtcIp && options.rtcPort),
      use_canary: bool(options.useCanaryRtcServer) ?? null,
      skip_trailing: !!options.skipTrailing,
      region: options.region || 'auto',
      keep_connection_alive_on_socket_close:
        options.keepConnectionAliveOnSocketClose ?? false,
      hangup_on_before_unload: options.hangupOnBeforeUnload !== false,
      trickle_ice: options.trickleIce ?? false,
      prefetch_ice_candidates: options.prefetchIceCandidates ?? false,
      force_relay_candidate: options.forceRelayCandidate ?? false,
      muted_mic_on_start: options.mutedMicOnStart ?? false,
      push_when_active:
        options.pushWhenActive ?? !!options.userVariables?.push_when_active,
      early_sdp_answer: options.earlySdpAnswer ?? false,
      media_permissions_recovery: !!options.mediaPermissionsRecovery?.enabled,
      ice_servers: toIceServerInfo(
        Array.isArray(options.iceServers)
          ? options.iceServers
          : this.config.defaultIceServers[env]
      ),
      custom_ice_servers: Array.isArray(options.iceServers),
      push_provider: 'none',
      log_level: options.debug ? 'debug' : 'info',
      telemetry_enabled: true,
    };
    const page = attempt(readPageInfo);
    const extra: Flat = defined({
      page: page && Object.keys(page).length ? page : undefined,
      browser_support: attempt(readBrowserSupport),
      // Once per instance; every envelope's client has the structured fields only.
      client_details: this.client.clientDetails,
    });
    this.client.emit('sdk_creation_started', {
      options: sdkOptions,
      raw_client_options: rawClientOptions(options),
      extra,
    });
    // Serialized when sent (after the telemetry login): goes out with the hints.
    void readClientHints().then((hints) => {
      if (hints) extra.client_hints = hints;
    });
  }

  /** The constructor is about to throw: hand pending events to the next instance. */
  creationFailed(error: unknown): void {
    attempt(() =>
      this.client.emit('sdk_creation_failed', {
        error: toCodedErrorInfo(error, CODE_INVALID_CREDENTIALS),
        extra: { duration_ms: Date.now() - this.creationStartedAt },
      })
    );
    this.client.orphan();
  }

  /** The constructor finished. */
  created(): void {
    this._createdAt = Date.now();
    const extra: Flat = defined({
      rtp_capabilities: attempt(readRtpCapabilities),
    });
    this.client.emit('sdk_created', {
      creation_duration_ms: this._createdAt - this.creationStartedAt,
      sdk_instances: TelemetryClient.liveInstanceIds(),
      extra,
    });
    // Devices and permissions answer in a few ms, before the event is sent.
    void Promise.all([
      readDeviceList(),
      readPermission('microphone'),
      readPermission('camera'),
    ]).then(([devices, microphone_permission, camera_permission]) => {
      if (devices) {
        this._devices ??= devices;
        extra.devices = devices;
      }
      Object.assign(
        extra,
        defined({ microphone_permission, camera_permission })
      );
    });
    this.networkChanged(true);
    this._appState = this._visibleState();
    this._attachListeners();
    // The telemetry socket opens now, independent of the signaling socket.
    this.client.connect();
  }

  networkChanged(initial = false, trigger?: string): void {
    const payload = networkSnapshot(initial, initial ? 'initial' : trigger);
    const extra = { ...payload.extra, trigger: undefined };
    const key = JSON.stringify({ ...payload, initial: false, extra });
    if (!initial && key === this._lastNetwork) return;
    this._lastNetwork = key;
    this.client.emit('network_changed', payload);
  }

  appStateChanged(trigger = 'visibilitychange', event?: Any): void {
    const state = this._visibleState();
    if (!state) return;
    const previous_state = this._appState;
    this._appState = state;
    this.client.emit('app_state_changed', {
      state,
      ...defined({ previous_state }),
      extra: defined({
        trigger,
        has_focus: hasFocusNow(),
        persisted: bool(event?.persisted),
        was_discarded: bool((document as Any).wasDiscarded),
      }),
    });
  }

  private _visibleState(): AppState | undefined {
    if (typeof document === 'undefined') return undefined;
    return document.visibilityState === 'hidden' ? 'hidden' : 'visible';
  }

  /** The microphone in use changed: the app's choice or the SDK's fallback. */
  inputDeviceChanged(deviceId?: string | null, label?: string): void {
    this._deviceChanged('input_device_changed', 'audioinput', deviceId, label);
  }

  /** The speaker in use changed: the app's choice or the SDK's fallback. */
  outputDeviceChanged(deviceId?: string | null, label?: string): void {
    this._deviceChanged(
      'output_device_changed',
      'audiooutput',
      deviceId,
      label
    );
  }

  private _deviceChanged(
    name: 'input_device_changed' | 'output_device_changed',
    kind: DeviceKind,
    deviceId?: string | null,
    label?: string
  ): void {
    const id = str(deviceId) ?? 'default';
    const timestamp = Date.now();
    const find = (list: DeviceEntry[] | null) =>
      list?.find((d) => d.kind === kind && d.device_id === id);
    const emit = (list: DeviceEntry[] | null) => {
      const found = find(list);
      this.client.emit(
        name,
        {
          device: { id, label: found?.label || str(label) || '' },
          ...(list
            ? { device_count: list.filter((d) => d.kind === kind).length }
            : {}),
          ...(found?.group_id ? { extra: { group_id: found.group_id } } : {}),
        },
        { timestamp }
      );
    };
    if (find(this._devices)) return emit(this._devices);
    // Not listed yet (just plugged in?): read the list again first.
    void readDeviceList().then((list) => emit(list ?? this._devices));
  }

  private async _onDeviceChange(): Promise<void> {
    const previous = this._devices;
    const next = await readDeviceList();
    if (!next || this._disposed) return;
    this._devices = next;
    const added = previous ? devicesMissing(next, previous) : [];
    const removed = previous ? devicesMissing(previous, next) : [];
    this.client.emit('device_list_changed', {
      devices: next.map(listed),
      added: added.map(listed),
      removed: removed.map(listed),
      extra: defined({
        devices: groupIds(next),
        added: groupIds(added),
        removed: groupIds(removed),
      }),
    });
  }

  private _attachListeners(): void {
    const listen = (target: Any, type: string, fn: (e: Event) => void) => {
      if (!target?.addEventListener) return;
      target.addEventListener(type, fn);
      this._cleanups.push(() => target.removeEventListener?.(type, fn));
    };
    if (typeof window !== 'undefined' && window.addEventListener) {
      for (const type of words('online offline')) {
        listen(window, type, () => this.networkChanged(false, type));
      }
      listen((navigator as Any)?.connection, 'change', () =>
        this.networkChanged(false, 'connection_change')
      );
      for (const type of words('focus blur pagehide pageshow')) {
        listen(window, type, (event) => this.appStateChanged(type, event));
      }
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      // freeze and resume: Page Lifecycle API (Chromium).
      for (const type of words('visibilitychange freeze resume')) {
        listen(document, type, () => this.appStateChanged(type));
      }
    }
    const media = typeof navigator !== 'undefined' && navigator.mediaDevices;
    listen(media, 'devicechange', () => {
      this._onDeviceChange().catch(() => undefined);
    });
  }

  /** The app called disconnect(): listeners go; the telemetry socket stays. */
  disconnected(): void {
    this.dispose();
  }

  /** New credentials (client.login({ creds })): a rejected login tries them. */
  credentialsChanged(): void {
    this.client.connect();
  }

  /** Stops listening to the browser. */
  dispose(): void {
    this._disposed = true;
    this._cleanups.splice(0).forEach((cleanup) => attempt(cleanup));
    this._chain = null;
    this._forgetRequests();
  }

  private _forgetRequests(): void {
    this._sentRequests.clear();
    this._receivedRequests.clear();
    this._gatewayChecks.clear();
  }

  // ── Connect chain and signaling socket ───────────────────────────────

  private _ensureChain(): ConnectChain {
    if (!this._chain) {
      const now = Date.now();
      this._chain = {
        startedAt: now,
        isReconnect: this._hasConnected,
        socketAttempts: 0,
        loginAttempts: 0,
      };
      if (!this._hasConnected && this._createdAt !== null) {
        this._chain.appWaitMs = Math.max(0, now - this._createdAt);
      }
      this._hasConnected = true;
    }
    return this._chain;
  }

  /** The app called connect(), or the SDK reconnects. */
  connectCalled(): void {
    this._ensureChain();
    if (this._disposed) {
      this._disposed = false; // connect() after disconnect(): listen again
      this._attachListeners();
    }
  }

  /** A new signaling socket starts opening (one socket = one VSP and B2BUA-RTC). */
  socketConnectStarted(url: URL): void {
    const chain = this._ensureChain();
    const now = Date.now();
    chain.socketAttempts += 1;
    chain.firstSocketAt ??= now;
    this.socketGeneration += 1;
    const attempt = chain.socketAttempts;
    // url: without the query; final_url: the URL the socket opens, query included.
    const query = (key: string) => url.searchParams.get(key) || undefined;
    const path = url.pathname === '/' ? '' : url.pathname;
    const target: SocketTarget = {
      url: `${url.protocol}//${url.host}${path}`,
      final_url: stripUrlCredentials(url.toString()),
      use_canary_server: query('canary') === 'true',
      skip_last_voice_sdk_id: query('skip_last_voice_sdk_id') === 'true',
      skip_trailing: query('skip_trailing') === 'true',
      ...defined({
        region: this.session.options.region || undefined,
        rtc_ip: query('rtc_ip'),
        rtc_port: Number(query('rtc_port')) || undefined,
        resume_voice_sdk_id: query('voice_sdk_id'),
      }),
    };
    this._socket = {
      startedAt: now,
      attempt,
      target,
      framesSent: 0,
      framesReceived: 0,
    };
    this._lastGateway = null;
    this.client.emit('socket_connect_started', {
      ...target,
      is_reconnect: this.socketGeneration > 1,
      extra: defined({ attempt, online: onlineNow() }),
    });
  }

  /** The WebSocket of the socket socketConnectStarted() announced. */
  socketCreated(ws: object): void {
    if (this._socket && ws) this._sockets.set(ws, this._socket);
  }

  socketOpened(ws: Any): void {
    const socket = this._sockets.get(ws);
    if (!socket) return;
    const now = (socket.openedAt = Date.now());
    socket.ws = ws;
    if (this._chain) this._chain.socketConnectedAt = now;
    const protocol = attempt(() => ws.protocol);
    const extensions = attempt(() => ws.extensions);
    this.client.emit('socket_connected', {
      ...socket.target,
      connect_duration_ms: now - socket.startedAt,
      extra: {
        attempt: socket.attempt,
        ...(typeof protocol === 'string' ? { protocol } : {}),
        ...(typeof extensions === 'string' ? { extensions } : {}),
      },
    });
  }

  /** The SDK closes the socket itself: recorded now (its close event comes after disconnect). */
  socketCloseRequested(ws: object): void {
    const socket = this._sockets.get(ws);
    if (!socket) return;
    socket.closeRequested = true;
    this.socketEnded(ws);
  }

  /**
   * The socket closed or was given up on: socket_failed if it never opened,
   * else socket_closed. Called after the SDK decided whether to reconnect.
   */
  socketEnded(
    ws: object,
    close: { code?: number; reason?: string; wasClean?: boolean } = {}
  ): void {
    const socket = this._sockets.get(ws);
    if (!socket || socket.ended) return;
    socket.ended = true;
    const willRetry = this.session.hasAutoReconnect();
    const now = Date.now();
    const { code, reason } = close;
    const wasClean = bool(close.wasClean);
    if (socket.openedAt === undefined) {
      const message =
        reason || 'WebSocket closed before the connection was established';
      this.client.emit('socket_failed', {
        error: toCodedErrorInfo(
          { name: 'SocketError', message },
          CODE_WEBSOCKET_CONNECTION_FAILED
        ),
        ...defined({ close_code: code }),
        attempt: socket.attempt || this._chain?.socketAttempts || 1,
        will_retry: willRetry,
        extra: defined({
          close_reason: reason || undefined,
          was_clean: wasClean,
          elapsed_ms: now - socket.startedAt,
          online: onlineNow(),
        }),
      });
    } else {
      const buffered = attempt(() => socket.ws?.bufferedAmount);
      this.client.emit('socket_closed', {
        ...defined({ close_code: code, reason: reason || undefined }),
        closed_by: socket.closeRequested
          ? 'client'
          : code === undefined
            ? 'unknown'
            : code === 1006
              ? 'network'
              : 'server',
        open_duration_ms: now - socket.openedAt,
        will_reconnect: willRetry,
        extra: defined({
          was_clean: wasClean,
          frames_sent: socket.framesSent,
          frames_received: socket.framesReceived,
          since_last_received_ms: since(socket.lastReceivedAt, now),
          since_last_sent_ms: since(socket.lastSentAt, now),
          buffered_amount: typeof buffered === 'number' ? buffered : undefined,
          online: onlineNow(),
        }),
      });
    }
    if (this._socket === socket) this._forgetRequests();
  }

  /** `new WebSocket()` itself threw. */
  socketCreateFailed(error: unknown): void {
    this.client.emit('socket_failed', {
      error: toCodedErrorInfo(error, CODE_WEBSOCKET_CONNECTION_FAILED),
      attempt: this._chain?.socketAttempts || 1,
      will_retry: false,
    });
  }

  // ── Login ────────────────────────────────────────────────────────────

  loginStarted(
    type: 'login' | 'anonymous_login',
    resumeSessionId?: string,
    rpcId?: unknown
  ): void {
    const { options } = this.session;
    const anonymous = type === 'anonymous_login' && options.anonymous_login;
    const chain = this._ensureChain();
    const now = Date.now();
    chain.loginAttempts += 1;
    chain.firstLoginAt ??= now;
    const method: LoginMethod = anonymous
      ? {
          login_type: 'anonymous',
          target_type: String(anonymous.target_type ?? ''),
          target_id: String(anonymous.target_id ?? ''),
        }
      : options.login_token
        ? { login_type: 'token' }
        : {
            login_type: /^gencred/i.test(options.login ?? '')
              ? 'gencred'
              : 'sip_credentials',
            username: String(options.login ?? ''),
          };
    const isReconnect = this._hasLoggedIn;
    const attempt = chain.loginAttempts;
    this._login = { method, isReconnect, startedAt: now, attempt };
    const id = rpcIdString(rpcId);
    this.client.emit('login_started', {
      method,
      is_reconnect: isReconnect,
      ...defined({ resume_session_id: resumeSessionId || undefined }),
      extra: { attempt, ...(id ? { rpc_id: id } : {}) },
    });
  }

  loginFailed(error: unknown, willRetry: boolean): void {
    const login = this._login;
    if (!login) return;
    this.client.emit('login_failed', {
      method: login.method,
      is_reconnect: login.isReconnect,
      error: toCodedErrorInfo(error, CODE_LOGIN_FAILED),
      will_retry: willRetry,
      extra: {
        attempt: login.attempt,
        duration_ms: Date.now() - login.startedAt,
      },
    });
  }

  /** The server's whole login result goes under extra. */
  loginSucceeded(result?: unknown): void {
    const login = this._login;
    if (!login) return;
    const now = Date.now();
    this._ensureChain().loginSucceededAt = now;
    this._hasLoggedIn = this._readyPending = true;
    this._gatewayCheckNumber = 0;
    this.client.emit('login_succeeded', {
      method: login.method,
      is_reconnect: login.isReconnect,
      login_duration_ms: now - login.startedAt,
      extra: defined({ attempt: login.attempt, ...serverResult(result) }),
    });
  }

  /** The server's reattached_sessions list (clientReady params). */
  reattachedSessions(ids: unknown): void {
    if (!Array.isArray(ids)) return;
    this._reattachedCallIds = ids.filter((id) => typeof id === 'string');
  }

  /** The client can make and take calls (REGED); params = that answer's params. */
  clientReady(params?: Any): void {
    if (!this._readyPending) return;
    this._readyPending = false;
    const now = Date.now();
    const chain = this._ensureChain();
    const session = this.session as Any;
    this.client.emit('client_ready', {
      is_reconnect: chain.isReconnect,
      remote_element_provided:
        'remoteElement' in session ? !!session.remoteElement : null,
      mic_id_provided: !!session.micId,
      speaker_id_provided: 'speaker' in session ? !!session.speaker : null,
      reattached_call_ids: this._reattachedCallIds,
      extra: defined({
        call_report_id: str(params?.call_report_id),
        gateway_state: str(params?.state),
        ...serverResult(params),
      }),
    });
    // Right after each client_ready: the step times (owner, 2026-10-08).
    this.client.emit('session_timings', {
      is_reconnect: chain.isReconnect,
      time_to_ready_ms: now - this.creationStartedAt,
      connect_to_ready_ms: now - chain.startedAt,
      ...defined({
        app_wait_ms: chain.appWaitMs,
        socket_connect_ms: since(chain.firstSocketAt, chain.socketConnectedAt),
        login_ms: since(chain.firstLoginAt, chain.loginSucceededAt),
        login_to_ready_ms: since(chain.loginSucceededAt, now),
      }),
      socket_attempts: chain.socketAttempts,
      login_attempts: chain.loginAttempts,
    });
    this._reattachedCallIds = [];
    this._chain = null;
  }

  // ── Gateway ──────────────────────────────────────────────────────────

  /** A gateway state in the answer to a request ("result") or pushed ("notification"). */
  gatewayState(raw: string, source?: 'result' | 'notification'): void {
    const previous = this._lastGateway;
    if (!raw || raw === previous?.raw) return;
    const now = Date.now();
    this._lastGateway = { raw, at: now };
    this.client.emit('gateway_state', {
      state: toGatewayState(raw),
      raw_state: raw,
      ...(previous ? { previous_state: toGatewayState(previous.raw) } : {}),
      extra: defined({ since_previous_ms: since(previous?.at, now), source }),
    });
  }

  /** A gatewayState poll with this request id is about to go out. */
  gatewayCheckStarted(rpcId: unknown): void {
    const id = rpcIdString(rpcId);
    const number = ++this._gatewayCheckNumber;
    this._gatewayChecks.set(id, { number, at: Date.now() });
    this.client.emit('gateway_check_started', {
      check_number: number,
      extra: id ? { rpc_id: id } : {},
    });
  }

  gatewayCheckFailed(rpcId: unknown, error: unknown, willRetry = false): void {
    const id = rpcIdString(rpcId);
    const check = this._gatewayChecks.get(id);
    if (!check) return;
    this._gatewayChecks.delete(id);
    this.client.emit('gateway_check_failed', {
      check_number: check.number,
      error: toErrorInfo(error),
      will_retry: willRetry,
      extra: {
        ...(id ? { rpc_id: id } : {}),
        response_time_ms: Date.now() - check.at,
      },
    });
  }

  private _gatewayCheckAnswered(id: string, msg: Any): void {
    const check = this._gatewayChecks.get(id);
    if (!check) return;
    if (msg.error) return this.gatewayCheckFailed(id, msg.error);
    this._gatewayChecks.delete(id);
    const raw = String(msg.result?.params?.state ?? msg.result?.state ?? '');
    this.client.emit('gateway_check_succeeded', {
      check_number: check.number,
      state: toGatewayState(raw),
      raw_state: raw,
      response_time_ms: Date.now() - check.at,
      extra: defined({
        rpc_id: id || undefined,
        ...serverResult(msg.result?.params ?? msg.result),
      }),
    });
  }

  // ── Errors ───────────────────────────────────────────────────────────

  /** An error not already covered by a *_failed event. */
  error(
    stage: ErrorPayload['stage'],
    error: unknown,
    isFatal: boolean,
    details?: Flat,
    ids?: Partial<KnownIds>
  ): void {
    const coded = stage === 'call' || stage === 'media';
    const payload = {
      stage,
      error: coded ? toCodedErrorInfo(error, 49001) : toErrorInfo(error),
      is_fatal: isFatal,
      ...(details ? { details: sanitizeDetails(details) } : {}),
      extra: defined({
        online: onlineNow(),
        visibility_state: visibilityNow(),
      }),
    } as PayloadOf<'error'>;
    this.client.emit('error', payload, ids ? { ids } : {});
  }

  // ── Signaling frames ─────────────────────────────────────────────────

  private _remember(map: Map<string, Request>, id: string, request: Request) {
    if (!id) return;
    map.set(id, request);
    if (map.size > MAX_PENDING_FRAMES) map.delete(map.keys().next().value);
  }

  /** A JSON-RPC frame sent on the signaling socket. */
  frameSent(frame: Any): void {
    if (!frame || typeof frame !== 'object') return;
    if (this._socket) {
      this._socket.framesSent += 1;
      this._socket.lastSentAt = Date.now();
    }
    const id = rpcIdString(frame.id);
    let method = frameMethod(frame);
    let callId = frameCallId(frame);
    // Remembered to leave out keepalive answers and put the call's ID on its answer.
    if ('result' in frame || 'error' in frame) {
      const request = this._receivedRequests.get(id);
      if (request) {
        this._receivedRequests.delete(id);
        method = request.method || method;
        callId ??= request.callId;
      }
    } else {
      this._remember(this._sentRequests, id, { method, callId });
    }
    if (isFilteredFrameMethod(method)) return;
    this.client.emit(
      'signaling_message',
      { direction: 'sent', raw: rawFrame(frame) },
      callId ? { ids: { call_id: callId } } : {}
    );
  }

  /**
   * A frame received on the signaling socket, before the SDK handles it: its
   * sequence is taken now; receivedFrameDone() sends it after the handling.
   */
  frameReceived(msg: Any): ReceivedFrame | null {
    if (!msg || typeof msg !== 'object') return null;
    const now = Date.now();
    if (this._socket) {
      this._socket.framesReceived += 1;
      this._socket.lastReceivedAt = now;
    }
    const id = rpcIdString(msg.id);
    const isRequest = typeof msg.method === 'string';
    let method = isRequest ? msg.method : '';
    let callId = frameCallId(msg);
    const request = isRequest ? undefined : this._sentRequests.get(id);
    if (isRequest) {
      this._remember(this._receivedRequests, id, { method, callId });
    } else if (request) {
      this._sentRequests.delete(id);
      method = request.method;
      callId ??= request.callId;
      if (method === GATEWAY_STATE_METHOD) this._gatewayCheckAnswered(id, msg);
    } else {
      method = frameMethod(msg);
    }
    if (isFilteredFrameMethod(method)) return null;
    return {
      sequence: this.client.reserveSequence(),
      timestamp: now,
      raw: rawFrame(msg),
      ...(callId ? { ids: { call_id: callId } } : {}),
    };
  }

  receivedFrameDone(received: ReceivedFrame | null | undefined): void {
    if (!received) return;
    const { sequence, timestamp, raw, ids } = received;
    this.client.emit(
      'signaling_message',
      { direction: 'received', raw },
      { sequence, timestamp, ...(ids ? { ids } : {}) }
    );
  }
}
