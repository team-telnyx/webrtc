/**
 * Call Report V2: the SDK-wide (non-call) events of one SDK instance
 * (contract 1.4): sdk_*, network/app state, devices, the signaling socket,
 * login, client_ready, gateway, signaling_message and stage errors.
 *
 * Every public method is a hook called from SDK code. None of them throws:
 * telemetry must never change what the SDK does.
 */
import type BaseSession from '../BaseSession';
import type { IVertoOptions } from '../util/interfaces';
import {
  DEFAULT_DEV_ICE_SERVERS,
  DEFAULT_PROD_ICE_SERVERS,
} from '../util/constants';
import TelemetryClient from './TelemetryClient';
import type {
  ErrorInfo,
  ErrorPayload,
  GatewayState,
  KnownIds,
  LoginMethod,
  NetworkChangedPayload,
  SdkOptions,
  SignalingMessagePayload,
  SignalingVsp,
  SocketTarget,
} from './contract';
import {
  sanitizeDetails,
  toCodedErrorInfo,
  toErrorInfo,
  toIceServerInfo,
} from './sanitize';
import { isFilteredFrameMethod } from './filter';
import {
  frameCallId,
  frameMethod,
  GATEWAY_STATE_METHOD,
  resultMessage,
  rpcIdString,
  signalingCategory,
  utf8Length,
  rawFrame,
} from './signaling';

/** SDK error codes used here (util/constants/errorCodes.ts). */
const CODE_WEBSOCKET_CONNECTION_FAILED = 45001;
const CODE_LOGIN_FAILED = 46001;
const CODE_INVALID_CREDENTIALS = 46002;

const MAX_PENDING_FRAMES = 500;

// ── Server-provided names (VSP) ────────────────────────────────────────────
// The signaling login result carries these, each optional (VSP, 2026-10-04).
// One place, so a rename on the server side is a one-line change here.

export const SIGNALING_VSP_FIELDS = [
  'signaling_region',
  'signaling_dc',
  'signaling_node',
] as const;

export const B2BUA_RTC_FIELDS = [
  'b2bua_rtc_region',
  'b2bua_rtc_dc',
  'b2bua_rtc_node',
] as const;

/**
 * signaling_message plus the frame itself (owner, 2026-10-06; proposed for
 * the contract): secrets out, see rawFrame.
 */
export type SignalingMessageWithRaw = SignalingMessagePayload & {
  raw?: unknown;
};

export type SignalingVspNames = {
  signaling_region?: string;
  signaling_dc?: string;
  signaling_node?: string;
};

export type B2buaRtcNames = {
  b2bua_rtc_region?: string;
  b2bua_rtc_dc?: string;
  b2bua_rtc_node?: string;
};

/**
 * Reads the given string fields from a server result, defensively: from the
 * result itself or from its `params`. Missing or non-string values are omitted.
 */
export function readServerNames<K extends string>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
  fields: readonly K[]
): Partial<Record<K, string>> {
  const names: Partial<Record<K, string>> = {};
  if (!result || typeof result !== 'object') return names;
  for (const field of fields) {
    const value = result[field] ?? result.params?.[field];
    if (typeof value === 'string' && value) names[field] = value;
  }
  return names;
}

// ── Options ────────────────────────────────────────────────────────────────

export function defaultIceServers(options: IVertoOptions): RTCIceServer[] {
  if (Array.isArray(options.iceServers)) return options.iceServers;
  return options.env === 'development'
    ? DEFAULT_DEV_ICE_SERVERS
    : DEFAULT_PROD_ICE_SERVERS;
}

/** Sanitized options (contract SdkOptions). Never credentials or app objects. */
export function buildSdkOptions(
  options: IVertoOptions,
  client: TelemetryClient
): SdkOptions {
  return {
    region: options.region || 'auto',
    auto_reconnect: options.autoReconnect ?? true,
    max_reconnect_attempts: options.maxReconnectAttempts ?? 10,
    reconnect_timeout_ms: null,
    keep_connection_alive_on_socket_close:
      options.keepConnectionAliveOnSocketClose ?? false,
    hangup_on_before_unload: options.hangupOnBeforeUnload !== false,
    audio: true,
    video: !!options.video,
    trickle_ice: options.trickleIce ?? false,
    prefetch_ice_candidates: options.prefetchIceCandidates ?? false,
    force_relay_candidate: options.forceRelayCandidate ?? false,
    muted_mic_on_start: options.mutedMicOnStart ?? false,
    push_when_active:
      options.pushWhenActive ??
      !!options.userVariables?.push_when_active ??
      false,
    early_sdp_answer: options.earlySdpAnswer ?? false,
    media_permissions_recovery: !!options.mediaPermissionsRecovery?.enabled,
    ice_servers: toIceServerInfo(defaultIceServers(options)),
    custom_ice_servers: Array.isArray(options.iceServers),
    push_provider: 'none',
    log_level: options.debug ? 'debug' : 'info',
    telemetry: {
      enabled: true,
      metrics_interval_ms: client.metricsIntervalMs,
      max_pending_events: client.maxPendingEvents,
      max_send_backlog_bytes: client.maxSendBacklogBytes,
    },
  };
}

// ── Network ────────────────────────────────────────────────────────────────

type NetworkInformationLike = {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

const getConnectionInfo = (): NetworkInformationLike | undefined =>
  typeof navigator !== 'undefined'
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((navigator as any).connection as NetworkInformationLike | undefined)
    : undefined;

const NETWORK_TYPES: Record<string, NetworkChangedPayload['network_type']> = {
  wifi: 'wifi',
  cellular: 'cellular',
  ethernet: 'ethernet',
  none: 'none',
};

const EFFECTIVE_TYPES = new Set(['slow-2g', '2g', '3g', '4g', '5g']);

export function networkSnapshot(initial: boolean): NetworkChangedPayload {
  const online =
    typeof navigator !== 'undefined' && navigator.onLine !== undefined
      ? !!navigator.onLine
      : true;
  const connection = getConnectionInfo();
  const payload: NetworkChangedPayload = {
    initial,
    network_type: online
      ? (NETWORK_TYPES[connection?.type ?? ''] ?? 'unknown')
      : 'none',
    online,
  };
  if (
    connection?.effectiveType &&
    EFFECTIVE_TYPES.has(connection.effectiveType)
  ) {
    payload.effective_type =
      connection.effectiveType as NetworkChangedPayload['effective_type'];
  }
  if (typeof connection?.downlink === 'number') {
    payload.downlink_mbps = connection.downlink;
  }
  return payload;
}

// ── Gateway ────────────────────────────────────────────────────────────────

const GATEWAY_STATES = new Set<string>([
  'UNREGED',
  'TRYING',
  'REGISTER',
  'REGED',
  'UNREGISTER',
  'FAILED',
  'FAIL_WAIT',
  'EXPIRED',
  'NOREG',
  'TIMEOUT',
  'DOWN',
  'ATTACHED',
]);

export const toGatewayState = (raw: string): GatewayState =>
  GATEWAY_STATES.has(raw) ? (raw as GatewayState) : 'UNKNOWN';

// ── State kept per instance ────────────────────────────────────────────────

/** One connect() (or reconnect) up to the client_ready it leads to. */
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

/** One signaling socket, from socket_connect_started to its close. */
export type SocketTelemetry = {
  generation: number;
  startedAt: number;
  openedAt?: number;
  closeRequested: boolean;
  ended: boolean;
};

type PendingFrame = { method: string; at: number; callId?: string };

/** A received frame whose record is emitted after the SDK handled it. */
export type ReceivedFrame = {
  sequence: number;
  timestamp: number;
  payload: SignalingMessageWithRaw;
  ids?: Partial<KnownIds>;
  unhandled: boolean;
};

type DeviceSnapshot = { keys: Set<string>; inputs: number; outputs: number };

type LoginState = {
  method: LoginMethod;
  isReconnect: boolean;
  startedAt: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySession = BaseSession & Record<string, any>;

export default class SessionTelemetry {
  /** Monotonic signaling socket counter for the instance (envelope socket_generation). */
  public socketGeneration = 0;
  public readonly creationStartedAt: number = Date.now();

  private _createdAt: number | null = null;
  private _hasConnected = false;
  private _hasLoggedIn = false;
  private _chain: ConnectChain | null = null;
  private _socket: SocketTelemetry | null = null;
  private _login: LoginState | null = null;
  private _readyPending = false;
  private _reattachedCallIds: string[] = [];
  private _lastGatewayRaw: string | null = null;
  private _gatewayCheckNumber = 0;
  private _gatewayChecks = new Map<string, { number: number; at: number }>();
  private _sentRequests = new Map<string, PendingFrame>();
  private _receivedRequests = new Map<string, PendingFrame>();
  private _currentReceived: ReceivedFrame | null = null;
  private _devices: DeviceSnapshot | null = null;
  private _lastNetwork: string | null = null;
  private _cleanups: Array<() => void> = [];
  private _disposed = false;

  constructor(
    private readonly _session: BaseSession,
    private readonly _client: TelemetryClient
  ) {}

  get client(): TelemetryClient {
    return this._client;
  }

  private get _anySession(): AnySession {
    return this._session as AnySession;
  }

  private _safe(fn: () => void): void {
    try {
      fn();
    } catch {
      // Telemetry must never throw into SDK code paths.
    }
  }

  private _vsp(): SignalingVsp {
    const names = this._anySession.signalingVsp as SignalingVspNames;
    return names ? { ...names } : {};
  }

  // ── SDK instance ───────────────────────────────────────────────────────

  /** First thing in the constructor: sequence 1. */
  creationStarted(options: IVertoOptions): void {
    this._safe(() => {
      this._client.emit('sdk_creation_started', {
        options: buildSdkOptions(options, this._client),
      });
    });
  }

  /** The constructor is about to throw: hand pending events to the next instance. */
  creationFailed(error: unknown): void {
    this._safe(() => {
      this._client.emit('sdk_creation_failed', {
        error: toCodedErrorInfo(error, CODE_INVALID_CREDENTIALS),
      });
    });
    this._safe(() => this._client.orphan());
  }

  /** The constructor finished. */
  created(): void {
    this._safe(() => {
      this._createdAt = Date.now();
      this._client.emit('sdk_created', {
        creation_duration_ms: this._createdAt - this.creationStartedAt,
        sdk_instances: TelemetryClient.liveInstanceIds(),
      });
      this.networkChanged(true);
      this._attachListeners();
    });
  }

  networkChanged(initial = false): void {
    this._safe(() => {
      const payload = networkSnapshot(initial);
      const key = JSON.stringify({ ...payload, initial: false });
      if (!initial && key === this._lastNetwork) return;
      this._lastNetwork = key;
      this._client.emit('network_changed', payload);
    });
  }

  appStateChanged(): void {
    this._safe(() => {
      if (typeof document === 'undefined') return;
      this._client.emit('app_state_changed', {
        state: document.visibilityState === 'hidden' ? 'hidden' : 'visible',
      });
    });
  }

  /** The app (or the SDK, by: "sdk") chose a microphone. */
  inputDeviceChanged(by: 'app' | 'sdk'): void {
    this._safe(() => {
      this._client.emit('input_device_changed', {
        by,
        ...(this._devices ? { device_count: this._devices.inputs } : {}),
      });
    });
  }

  /** The app (or the SDK, by: "sdk") chose a speaker. */
  outputDeviceChanged(by: 'app' | 'sdk'): void {
    this._safe(() => {
      this._client.emit('output_device_changed', {
        by,
        ...(this._devices ? { device_count: this._devices.outputs } : {}),
      });
    });
  }

  private async _readDevices(): Promise<DeviceSnapshot | null> {
    const mediaDevices =
      typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!mediaDevices?.enumerateDevices) return null;
    const devices = await mediaDevices.enumerateDevices();
    const snapshot: DeviceSnapshot = { keys: new Set(), inputs: 0, outputs: 0 };
    for (const device of devices || []) {
      if (device.kind === 'audioinput') snapshot.inputs += 1;
      else if (device.kind === 'audiooutput') snapshot.outputs += 1;
      else continue;
      // In memory only, to count added/removed; never sent.
      snapshot.keys.add(`${device.kind}:${device.deviceId}:${device.groupId}`);
    }
    return snapshot;
  }

  private async _onDeviceChange(): Promise<void> {
    try {
      const previous = this._devices;
      const next = await this._readDevices();
      if (!next || this._disposed) return;
      this._devices = next;
      let added = 0;
      let removed = 0;
      if (previous) {
        next.keys.forEach((key) => {
          if (!previous.keys.has(key)) added += 1;
        });
        previous.keys.forEach((key) => {
          if (!next.keys.has(key)) removed += 1;
        });
        // Before a media permission, browsers hide device IDs: fall back to counts.
        if (added === 0 && removed === 0) {
          const diff =
            next.inputs + next.outputs - (previous.inputs + previous.outputs);
          if (diff > 0) added = diff;
          else removed = -diff;
        }
      }
      this._client.emit('device_list_changed', {
        input_count: next.inputs,
        output_count: next.outputs,
        added,
        removed,
      });
    } catch {
      // ignore
    }
  }

  private _attachListeners(): void {
    if (typeof window !== 'undefined' && window.addEventListener) {
      const onNetwork = () => this.networkChanged(false);
      window.addEventListener('online', onNetwork);
      window.addEventListener('offline', onNetwork);
      this._cleanups.push(() => {
        window.removeEventListener('online', onNetwork);
        window.removeEventListener('offline', onNetwork);
      });
      const connection = getConnectionInfo();
      if (connection?.addEventListener) {
        connection.addEventListener('change', onNetwork);
        this._cleanups.push(() =>
          connection.removeEventListener?.('change', onNetwork)
        );
      }
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      const onVisibility = () => this.appStateChanged();
      document.addEventListener('visibilitychange', onVisibility);
      this._cleanups.push(() =>
        document.removeEventListener('visibilitychange', onVisibility)
      );
    }
    const mediaDevices =
      typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (mediaDevices?.addEventListener) {
      const onDeviceChange = () => {
        void this._onDeviceChange();
      };
      mediaDevices.addEventListener('devicechange', onDeviceChange);
      this._cleanups.push(() =>
        mediaDevices.removeEventListener?.('devicechange', onDeviceChange)
      );
    }
    // Baseline for added/removed and device_count.
    this._readDevices()
      .then((snapshot) => {
        if (snapshot && !this._devices) this._devices = snapshot;
      })
      .catch(() => undefined);
  }

  /** The SDK instance is going away (disconnect). */
  dispose(): void {
    this._disposed = true;
    for (const cleanup of this._cleanups) this._safe(cleanup);
    this._cleanups = [];
    this._chain = null;
    this._sentRequests.clear();
    this._receivedRequests.clear();
    this._gatewayChecks.clear();
  }

  // ── Connect chain ──────────────────────────────────────────────────────

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
    this._safe(() => {
      this._ensureChain();
    });
  }

  // ── Signaling socket ───────────────────────────────────────────────────

  /** A new signaling socket starts opening. Returns its handle for the socket's events. */
  socketConnectStarted(target: SocketTarget): SocketTelemetry | null {
    let socket: SocketTelemetry | null = null;
    this._safe(() => {
      const chain = this._ensureChain();
      const now = Date.now();
      chain.socketAttempts += 1;
      if (chain.firstSocketAt === undefined) chain.firstSocketAt = now;
      this.socketGeneration += 1;
      socket = {
        generation: this.socketGeneration,
        startedAt: now,
        closeRequested: false,
        ended: false,
      };
      this._socket = socket;
      this._lastGatewayRaw = null;
      this._client.emit('socket_connect_started', {
        target,
        is_reconnect: this.socketGeneration > 1,
      });
    });
    return socket;
  }

  socketOpened(socket: SocketTelemetry | null): void {
    this._safe(() => {
      if (!socket) return;
      const now = Date.now();
      socket.openedAt = now;
      if (this._chain) this._chain.socketConnectedAt = now;
      const vsp = this._vsp();
      this._client.emit('socket_connected', {
        connect_duration_ms: now - socket.startedAt,
        ...(vsp.signaling_region ? { region: vsp.signaling_region } : {}),
        ...(vsp.signaling_dc ? { dc: vsp.signaling_dc } : {}),
        ...(vsp.signaling_node ? { node: vsp.signaling_node } : {}),
      });
    });
  }

  /**
   * The SDK closes the socket itself. Recorded now: on disconnect() the
   * telemetry client is closed before the socket's close event arrives.
   */
  socketCloseRequested(socket: SocketTelemetry | null): void {
    if (!socket) return;
    socket.closeRequested = true;
    this.socketEnded(socket, {});
  }

  /**
   * The socket closed (or was given up on). Emits socket_failed if it never
   * opened, else socket_closed. Called after the SDK handled the close, so
   * will_retry / will_reconnect reflect its decision.
   */
  socketEnded(
    socket: SocketTelemetry | null,
    close: { code?: number; reason?: string } = {}
  ): void {
    this._safe(() => {
      if (!socket || socket.ended) return;
      socket.ended = true;
      const willRetry = this._session.hasAutoReconnect();
      if (socket.openedAt === undefined) {
        this._client.emit('socket_failed', {
          error: toCodedErrorInfo(
            {
              name: 'SocketError',
              message:
                close.reason ||
                'WebSocket closed before the connection was established',
            },
            CODE_WEBSOCKET_CONNECTION_FAILED
          ),
          ...(close.code !== undefined ? { close_code: close.code } : {}),
          attempt: this._chain?.socketAttempts || 1,
          will_retry: willRetry,
        });
      } else {
        const code = close.code;
        const closedBy = socket.closeRequested
          ? 'client'
          : code === undefined
            ? 'unknown'
            : code === 1006
              ? 'network'
              : 'server';
        this._client.emit('socket_closed', {
          ...(code !== undefined ? { close_code: code } : {}),
          ...(close.reason ? { reason: close.reason } : {}),
          closed_by: closedBy,
          open_duration_ms: Date.now() - socket.openedAt,
          will_reconnect: willRetry,
          ...(typeof document !== 'undefined'
            ? { in_background: document.visibilityState === 'hidden' }
            : {}),
        });
      }
      if (this._socket === socket) {
        this._sentRequests.clear();
        this._receivedRequests.clear();
        this._gatewayChecks.clear();
      }
    });
  }

  /** `new WebSocket()` itself threw: there is no socket to retry with. */
  socketCreateFailed(error: unknown): void {
    this._safe(() => {
      this._client.emit('socket_failed', {
        error: toCodedErrorInfo(error, CODE_WEBSOCKET_CONNECTION_FAILED),
        attempt: this._chain?.socketAttempts || 1,
        will_retry: false,
      });
    });
  }

  // ── Login ──────────────────────────────────────────────────────────────

  loginMethod(type: 'login' | 'anonymous_login'): LoginMethod {
    const options = this._session.options;
    if (type === 'anonymous_login' && options.anonymous_login) {
      return {
        login_type: 'anonymous',
        target_type: String(options.anonymous_login.target_type ?? ''),
        target_id: String(options.anonymous_login.target_id ?? ''),
      };
    }
    if (options.login_token) return { login_type: 'token' };
    return {
      login_type: 'sip_credentials',
      username: String(options.login ?? ''),
    };
  }

  loginStarted(
    type: 'login' | 'anonymous_login',
    resumeSessionId?: string
  ): void {
    this._safe(() => {
      const chain = this._ensureChain();
      const now = Date.now();
      chain.loginAttempts += 1;
      if (chain.firstLoginAt === undefined) chain.firstLoginAt = now;
      this._login = {
        method: this.loginMethod(type),
        isReconnect: this._hasLoggedIn,
        startedAt: now,
      };
      this._client.emit('login_started', {
        method: this._login.method,
        is_reconnect: this._login.isReconnect,
        ...(resumeSessionId ? { resume_session_id: resumeSessionId } : {}),
      });
    });
  }

  loginFailed(error: unknown, willRetry: boolean): void {
    this._safe(() => {
      const login = this._login;
      if (!login) return;
      this._client.emit('login_failed', {
        ...this._vsp(),
        method: login.method,
        is_reconnect: login.isReconnect,
        error: toCodedErrorInfo(error, CODE_LOGIN_FAILED),
        will_retry: willRetry,
      });
    });
  }

  loginSucceeded(): void {
    this._safe(() => {
      const login = this._login;
      if (!login) return;
      const now = Date.now();
      const chain = this._ensureChain();
      chain.loginSucceededAt = now;
      this._hasLoggedIn = true;
      this._readyPending = true;
      this._gatewayCheckNumber = 0;
      this._client.emit('login_succeeded', {
        ...this._vsp(),
        method: login.method,
        is_reconnect: login.isReconnect,
        login_duration_ms: now - login.startedAt,
      });
    });
  }

  /** The server's reattached_sessions list (clientReady params). */
  reattachedSessions(ids: unknown): void {
    if (!Array.isArray(ids)) return;
    this._reattachedCallIds = ids.filter(
      (id): id is string => typeof id === 'string'
    );
  }

  /** The client can make and take calls (JS: REGED). Once per (re)login. */
  clientReady(): void {
    this._safe(() => {
      if (!this._readyPending) return;
      this._readyPending = false;
      const now = Date.now();
      const chain = this._ensureChain();
      const session = this._anySession;
      // Until VSP sends its names in the login result, the region and DC the
      // server put in this REGED answer (session.region / dc, set just now).
      const vsp = this._vsp();
      if (!vsp.signaling_region && typeof session.region === 'string') {
        vsp.signaling_region = session.region;
      }
      if (!vsp.signaling_dc && typeof session.dc === 'string') {
        vsp.signaling_dc = session.dc;
      }
      this._client.emit('client_ready', {
        ...vsp,
        is_reconnect: chain.isReconnect,
        time_to_ready_ms: now - this.creationStartedAt,
        connect_to_ready_ms: now - chain.startedAt,
        ...(chain.appWaitMs !== undefined
          ? { app_wait_ms: chain.appWaitMs }
          : {}),
        ...(chain.firstSocketAt !== undefined &&
        chain.socketConnectedAt !== undefined
          ? { socket_connect_ms: chain.socketConnectedAt - chain.firstSocketAt }
          : {}),
        ...(chain.firstLoginAt !== undefined &&
        chain.loginSucceededAt !== undefined
          ? { login_ms: chain.loginSucceededAt - chain.firstLoginAt }
          : {}),
        ...(chain.loginSucceededAt !== undefined
          ? { login_to_ready_ms: now - chain.loginSucceededAt }
          : {}),
        socket_attempts: chain.socketAttempts,
        login_attempts: chain.loginAttempts,
        remote_element_provided:
          'remoteElement' in session ? !!session.remoteElement : null,
        mic_id_provided: !!session.micId,
        speaker_id_provided: 'speaker' in session ? !!session.speaker : null,
        reattached_call_ids: this._reattachedCallIds,
      });
      this._reattachedCallIds = [];
      this._chain = null;
    });
  }

  // ── Gateway ────────────────────────────────────────────────────────────

  /** A gateway state reported by the server (result or notification). */
  gatewayState(raw: string): void {
    this._safe(() => {
      if (!raw || raw === this._lastGatewayRaw) return;
      const previous = this._lastGatewayRaw;
      this._lastGatewayRaw = raw;
      this._client.emit('gateway_state', {
        state: toGatewayState(raw),
        raw_state: raw,
        ...(previous ? { previous_state: toGatewayState(previous) } : {}),
      });
    });
  }

  /** VertoHandler is about to send a gatewayState poll with this request id. */
  gatewayCheckStarted(rpcId: unknown): void {
    this._safe(() => {
      const id = rpcIdString(rpcId);
      this._gatewayCheckNumber += 1;
      this._gatewayChecks.set(id, {
        number: this._gatewayCheckNumber,
        at: Date.now(),
      });
      this._client.emit('gateway_check_started', {
        check_number: this._gatewayCheckNumber,
      });
    });
  }

  gatewayCheckFailed(rpcId: unknown, error: unknown, willRetry = false): void {
    this._safe(() => {
      const id = rpcIdString(rpcId);
      const check = this._gatewayChecks.get(id);
      if (!check) return;
      this._gatewayChecks.delete(id);
      this._client.emit('gateway_check_failed', {
        check_number: check.number,
        error: toErrorInfo(error),
        will_retry: willRetry,
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _gatewayCheckAnswered(id: string, msg: any): void {
    const check = this._gatewayChecks.get(id);
    if (!check) return;
    if (msg.error) {
      this.gatewayCheckFailed(id, msg.error);
      return;
    }
    this._gatewayChecks.delete(id);
    const raw = String(msg.result?.params?.state ?? msg.result?.state ?? '');
    this._client.emit('gateway_check_succeeded', {
      check_number: check.number,
      state: toGatewayState(raw),
      raw_state: raw,
      response_time_ms: Date.now() - check.at,
    });
  }

  // ── Errors ─────────────────────────────────────────────────────────────

  /** An SDK-wide error not already covered by a *_failed event. */
  error(
    stage: 'sdk' | 'socket' | 'login' | 'gateway' | 'call' | 'media',
    error: unknown,
    isFatal: boolean,
    details?: Record<string, unknown>,
    ids?: Partial<KnownIds>
  ): void {
    this._safe(() => {
      const clean = details ? sanitizeDetails(details) : undefined;
      let payload: ErrorPayload;
      if (stage === 'call' || stage === 'media') {
        payload = {
          stage,
          error: toCodedErrorInfo(error, 49001),
          is_fatal: isFatal,
          ...(clean ? { details: clean } : {}),
        };
      } else {
        const info: ErrorInfo = toErrorInfo(error);
        payload = {
          stage,
          error: info,
          is_fatal: isFatal,
          ...(clean ? { details: clean } : {}),
        };
      }
      this._client.emit('error', payload, ids ? { ids } : {});
    });
  }

  // ── Signaling frames ───────────────────────────────────────────────────

  private _remember(
    map: Map<string, PendingFrame>,
    id: string,
    frame: PendingFrame
  ) {
    if (!id) return;
    map.set(id, frame);
    if (map.size > MAX_PENDING_FRAMES) {
      const oldest = map.keys().next().value;
      map.delete(oldest);
    }
  }

  /** A JSON-RPC frame sent on the signaling socket. `text` is exactly what went out. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frameSent(frame: any, text: string): void {
    this._safe(() => {
      if (!frame || typeof frame !== 'object') return;
      const now = Date.now();
      const id = rpcIdString(frame.id);
      const isResponse = 'result' in frame || 'error' in frame;
      let method = frameMethod(frame);
      let callId = frameCallId(frame);
      let responseTime: number | undefined;
      if (isResponse) {
        const request = this._receivedRequests.get(id);
        if (request) {
          this._receivedRequests.delete(id);
          method = request.method || method;
          callId = callId ?? request.callId;
          responseTime = now - request.at;
        }
      } else {
        this._remember(this._sentRequests, id, { method, at: now, callId });
      }
      if (isFilteredFrameMethod(method)) return;
      const payload: SignalingMessageWithRaw = {
        direction: 'sent',
        kind: frame.error ? 'error' : isResponse ? 'response' : 'request',
        method,
        rpc_id: id,
        size_bytes: utf8Length(text),
        category: signalingCategory(method),
      };
      if (responseTime !== undefined) payload.response_time_ms = responseTime;
      const message = resultMessage(frame);
      if (message) payload.result_message = message;
      if (frame.error) {
        if (typeof frame.error.code === 'number')
          payload.error_code = frame.error.code;
        if (frame.error.message)
          payload.error_message = String(frame.error.message);
      }
      payload.raw = rawFrame(frame);
      this._client.emit(
        'signaling_message',
        payload,
        callId ? { ids: { call_id: callId } } : {}
      );
    });
  }

  /**
   * A JSON-RPC frame received on the signaling socket, before the SDK handles
   * it. Its sequence is taken now; the record goes out in receivedFrameDone()
   * so it can say whether the SDK had a handler.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frameReceived(msg: any, sizeBytes: number): ReceivedFrame | null {
    let received: ReceivedFrame | null = null;
    this._safe(() => {
      if (!msg || typeof msg !== 'object') return;
      const now = Date.now();
      const id = rpcIdString(msg.id);
      const isRequest = typeof msg.method === 'string';
      let method = isRequest ? msg.method : '';
      let callId = frameCallId(msg);
      let responseTime: number | undefined;
      if (isRequest) {
        this._remember(this._receivedRequests, id, { method, at: now, callId });
      } else {
        const request = this._sentRequests.get(id);
        if (request) {
          this._sentRequests.delete(id);
          method = request.method;
          callId = callId ?? request.callId;
          responseTime = now - request.at;
          if (method === GATEWAY_STATE_METHOD)
            this._gatewayCheckAnswered(id, msg);
        } else {
          method = frameMethod(msg);
        }
      }
      if (isFilteredFrameMethod(method)) return;
      const payload: SignalingMessageWithRaw = {
        direction: 'received',
        kind: isRequest ? 'request' : msg.error ? 'error' : 'response',
        method,
        rpc_id: id,
        size_bytes: sizeBytes,
        category: signalingCategory(method),
      };
      if (responseTime !== undefined) payload.response_time_ms = responseTime;
      const message = resultMessage(msg);
      if (message) payload.result_message = message;
      if (msg.error) {
        if (typeof msg.error.code === 'number')
          payload.error_code = msg.error.code;
        if (msg.error.message)
          payload.error_message = String(msg.error.message);
      }
      payload.raw = rawFrame(msg);
      received = {
        sequence: this._client.reserveSequence(),
        timestamp: now,
        payload,
        ids: callId ? { call_id: callId } : undefined,
        unhandled: false,
      };
      this._currentReceived = received;
    });
    return received;
  }

  /** The SDK had no handler for the frame being handled. */
  markUnhandled(): void {
    if (this._currentReceived) this._currentReceived.unhandled = true;
  }

  receivedFrameDone(received: ReceivedFrame | null): void {
    if (this._currentReceived === received) this._currentReceived = null;
    this._safe(() => {
      if (!received) return;
      if (received.unhandled) received.payload.unhandled = true;
      this._client.emit('signaling_message', received.payload, {
        sequence: received.sequence,
        timestamp: received.timestamp,
        ...(received.ids ? { ids: received.ids } : {}),
      });
    });
  }
}
