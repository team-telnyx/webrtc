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
import TelemetryClient, { readClientHints } from './TelemetryClient';
import type {
  AppStateChangedPayload,
  DeviceListChangedPayload,
  ErrorInfo,
  ErrorPayload,
  GatewayState,
  KnownIds,
  LoginMethod,
  MediaDeviceEntry,
  NetworkChangedPayload,
  SdkCreatedPayload,
  SdkOptions,
  EventBody,
  SignalingMessagePayload,
  SignalingVsp,
  SocketTarget,
} from './payloads';
import {
  assignDefined,
  attempt,
  hasFocusNow,
  onlineNow,
  readBrowserSupport,
  readDeviceList,
  readPageInfo,
  readPermission,
  readRtpCapabilities,
  visibilityNow,
} from './browserInfo';
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
  rpcIdString,
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
  const loginType: SdkOptions['login_type'] = options.login_token
    ? 'token'
    : options.login
      ? /^gencred/i.test(options.login)
        ? 'gencred'
        : 'sip_credential'
      : 'anonymous';
  return {
    login:
      loginType === 'sip_credential' || loginType === 'gencred'
        ? options.login
        : null,
    debug: !!options.debug,
    login_type: loginType,
    explicit_rtc_provided: !!(options.rtcIp && options.rtcPort),
    use_canary:
      typeof options.useCanaryRtcServer === 'boolean'
        ? options.useCanaryRtcServer
        : null,
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

/** Option values that never leave the SDK. */
const SECRET_OPTION_KEYS = new Set([
  'password',
  'passwd',
  'login_token',
  'credential',
]);

/**
 * The options as the app passed them (sdk_creation_started.raw_client_options):
 * passwords, tokens and TURN credentials become "[REDACTED]"; DOM elements,
 * streams and functions are described, since they can't be copied.
 */
export function rawClientOptions(options: unknown): Record<string, unknown> {
  const raw = describeOption(options, 0, new WeakSet());
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function describeOption(
  value: unknown,
  depth: number,
  seen: WeakSet<object>
): unknown {
  if (value === null || value === undefined) return value;
  const type = typeof value;
  if (type === 'function') return '[function]';
  if (type !== 'object') return value;
  if (typeof Node !== 'undefined' && value instanceof Node) {
    const element = value as Element;
    return `[${(element.nodeName || 'node').toLowerCase()}${
      element.id ? `#${element.id}` : ''
    }]`;
  }
  if (typeof MediaStream !== 'undefined' && value instanceof MediaStream) {
    return `[MediaStream ${value.id}]`;
  }
  if (seen.has(value as object) || depth > 20) return '[circular]';
  seen.add(value as object);
  if (Array.isArray(value)) {
    return value.map((item) => describeOption(item, depth + 1, seen));
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] =
      SECRET_OPTION_KEYS.has(key.toLowerCase()) && item != null && item !== ''
        ? '[REDACTED]'
        : describeOption(item, depth + 1, seen);
  }
  return result;
}

// ── Network ────────────────────────────────────────────────────────────────

type NetworkInformationLike = {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: (event: Event) => void) => void;
  removeEventListener?: (
    type: string,
    listener: (event: Event) => void
  ) => void;
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

export function networkSnapshot(
  initial: boolean,
  trigger?: NetworkChangedPayload['trigger']
): NetworkChangedPayload {
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
  if (trigger) payload.trigger = trigger;
  if (typeof connection?.type === 'string' && connection.type) {
    payload.connection_type = connection.type;
  }
  // Infinity = unknown (the spec's value when the browser can't tell).
  if (
    typeof connection?.downlinkMax === 'number' &&
    Number.isFinite(connection.downlinkMax)
  ) {
    payload.downlink_max_mbps = connection.downlinkMax;
  }
  if (typeof connection?.rtt === 'number') payload.rtt_ms = connection.rtt;
  if (typeof connection?.saveData === 'boolean') {
    payload.save_data = connection.saveData;
  }
  return payload;
}

/** A server answer, whole, credentials removed, as { server_result }; {} when there is none. */
function serverResult(result: unknown): {
  server_result?: Record<string, unknown>;
} {
  if (!result || typeof result !== 'object') return {};
  const clean = sanitizeDetails(result);
  return clean && Object.keys(clean).length ? { server_result: clean } : {};
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
  /** Socket attempt number within its connect chain. */
  attempt?: number;
  /** The WebSocket itself, for its protocol, extensions and bufferedAmount. */
  ws?: WebSocket;
  framesSent: number;
  framesReceived: number;
  lastSentAt?: number;
  lastReceivedAt?: number;
};

type PendingFrame = { method: string; at: number; callId?: string };

/** A received frame whose record is emitted after the SDK handled it. */
export type ReceivedFrame = {
  sequence: number;
  timestamp: number;
  payload: SignalingMessagePayload;
  ids?: Partial<KnownIds>;
};

type DeviceSnapshot = {
  keys: Set<string>;
  inputs: number;
  outputs: number;
  videoInputs: number;
  entries: MediaDeviceEntry[];
};

const deviceKey = (device: MediaDeviceEntry) =>
  `${device.kind}:${device.device_id}:${device.group_id}`;

type LoginState = {
  method: LoginMethod;
  isReconnect: boolean;
  startedAt: number;
  attempt: number;
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
  private _lastGatewayAt: number | null = null;
  private _gatewayCheckNumber = 0;
  private _gatewayChecks = new Map<string, { number: number; at: number }>();
  private _sentRequests = new Map<string, PendingFrame>();
  private _receivedRequests = new Map<string, PendingFrame>();
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
      const payload: Extract<
        EventBody,
        { name: 'sdk_creation_started' }
      >['payload'] = {
        options: buildSdkOptions(options, this._client),
        raw_client_options: rawClientOptions(options),
      };
      const page = attempt(readPageInfo);
      if (page && Object.keys(page).length) payload.page = page;
      const support = attempt(readBrowserSupport);
      if (support) payload.browser_support = support;
      this._client.emit('sdk_creation_started', payload);
      // Client Hints answer in a few ms; the event is serialized only when
      // sent (after the telemetry login), so it goes out with them.
      void readClientHints().then((hints) => {
        if (hints) payload.client_hints = hints;
      });
      // The browser and device details (constant for the instance) go once,
      // here; every event's client carries only the structured fields.
      payload.client_details = this._client.client as unknown as Record<
        string,
        unknown
      >;
    });
  }

  /** The constructor is about to throw: hand pending events to the next instance. */
  creationFailed(error: unknown): void {
    this._safe(() => {
      this._client.emit('sdk_creation_failed', {
        error: toCodedErrorInfo(error, CODE_INVALID_CREDENTIALS),
        duration_ms: Date.now() - this.creationStartedAt,
      });
    });
    this._safe(() => this._client.orphan());
  }

  /** The constructor finished. */
  created(): void {
    this._safe(() => {
      this._createdAt = Date.now();
      const payload: SdkCreatedPayload = {
        creation_duration_ms: this._createdAt - this.creationStartedAt,
        sdk_instances: TelemetryClient.liveInstanceIds(),
      };
      const capabilities = attempt(readRtpCapabilities);
      if (capabilities) payload.rtp_capabilities = capabilities;
      this._client.emit('sdk_created', payload);
      // The device list and permissions answer in a few ms; the event is
      // serialized only when sent (after the telemetry login), so it goes
      // out with them. They are also the baseline for device_list_changed.
      void this._completeCreated(payload);
      this.networkChanged(true);
      this._attachListeners();
    });
  }

  private async _completeCreated(payload: SdkCreatedPayload): Promise<void> {
    try {
      const [devices, microphone, camera] = await Promise.all([
        this._readDevices().catch((): null => null),
        readPermission('microphone'),
        readPermission('camera'),
      ]);
      if (devices) {
        if (!this._devices) this._devices = devices;
        payload.devices = devices.entries;
      }
      if (microphone) payload.microphone_permission = microphone;
      if (camera) payload.camera_permission = camera;
    } catch {
      // ignore
    }
  }

  networkChanged(
    initial = false,
    trigger?: NetworkChangedPayload['trigger']
  ): void {
    this._safe(() => {
      const payload = networkSnapshot(initial, initial ? 'initial' : trigger);
      const key = JSON.stringify({
        ...payload,
        initial: false,
        trigger: undefined,
      });
      if (!initial && key === this._lastNetwork) return;
      this._lastNetwork = key;
      this._client.emit('network_changed', payload);
    });
  }

  appStateChanged(
    trigger: AppStateChangedPayload['trigger'] = 'visibilitychange',
    event?: unknown
  ): void {
    this._safe(() => {
      if (typeof document === 'undefined') return;
      const payload: AppStateChangedPayload = {
        state: document.visibilityState === 'hidden' ? 'hidden' : 'visible',
        trigger,
      };
      const persisted = (event as { persisted?: unknown })?.persisted;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wasDiscarded = (document as any).wasDiscarded;
      assignDefined(payload, {
        has_focus: hasFocusNow(),
        persisted: typeof persisted === 'boolean' ? persisted : undefined,
        was_discarded:
          typeof wasDiscarded === 'boolean' ? wasDiscarded : undefined,
      });
      this._client.emit('app_state_changed', payload);
    });
  }

  /** The device with this ID in the last device list, as the payload's device fields. */
  private _deviceFields(
    kind: 'audioinput' | 'audiooutput',
    deviceId?: string | null
  ): { device_id?: string; label?: string; group_id?: string } {
    const id = typeof deviceId === 'string' && deviceId ? deviceId : 'default';
    const found = this._devices?.entries.find(
      (device) => device.kind === kind && device.device_id === id
    );
    return {
      device_id: id,
      ...(found?.label ? { label: found.label } : {}),
      ...(found?.group_id ? { group_id: found.group_id } : {}),
    };
  }

  /** The app (or the SDK, by: "sdk") chose a microphone. */
  inputDeviceChanged(by: 'app' | 'sdk', deviceId?: string | null): void {
    this._safe(() => {
      this._client.emit('input_device_changed', {
        by,
        ...(this._devices ? { device_count: this._devices.inputs } : {}),
        ...this._deviceFields('audioinput', deviceId),
      });
    });
  }

  /** The app (or the SDK, by: "sdk") chose a speaker. */
  outputDeviceChanged(by: 'app' | 'sdk', deviceId?: string | null): void {
    this._safe(() => {
      this._client.emit('output_device_changed', {
        by,
        ...(this._devices ? { device_count: this._devices.outputs } : {}),
        ...this._deviceFields('audiooutput', deviceId),
      });
    });
  }

  private async _readDevices(): Promise<DeviceSnapshot | null> {
    const entries = await readDeviceList();
    if (!entries) return null;
    const snapshot: DeviceSnapshot = {
      keys: new Set(),
      inputs: 0,
      outputs: 0,
      videoInputs: 0,
      entries,
    };
    for (const device of entries) {
      if (device.kind === 'audioinput') snapshot.inputs += 1;
      else if (device.kind === 'audiooutput') snapshot.outputs += 1;
      else if (device.kind === 'videoinput') snapshot.videoInputs += 1;
      snapshot.keys.add(deviceKey(device));
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
      const isAudio = (device: MediaDeviceEntry) =>
        device.kind === 'audioinput' || device.kind === 'audiooutput';
      let addedDevices: MediaDeviceEntry[] = [];
      let removedDevices: MediaDeviceEntry[] = [];
      if (previous) {
        addedDevices = next.entries.filter(
          (device) => !previous.keys.has(deviceKey(device))
        );
        removedDevices = previous.entries.filter(
          (device) => !next.keys.has(deviceKey(device))
        );
        // added/removed count audio devices only (as before); the lists have every kind.
        added = addedDevices.filter(isAudio).length;
        removed = removedDevices.filter(isAudio).length;
        // Before a media permission, browsers hide device IDs: fall back to counts.
        if (added === 0 && removed === 0) {
          const diff =
            next.inputs + next.outputs - (previous.inputs + previous.outputs);
          if (diff > 0) added = diff;
          else removed = -diff;
        }
      }
      const payload: DeviceListChangedPayload = {
        input_count: next.inputs,
        output_count: next.outputs,
        added,
        removed,
        video_input_count: next.videoInputs,
        devices: next.entries,
      };
      if (addedDevices.length) payload.added_devices = addedDevices;
      if (removedDevices.length) payload.removed_devices = removedDevices;
      this._client.emit('device_list_changed', payload);
    } catch {
      // ignore
    }
  }

  private _attachListeners(): void {
    const listen = (
      target: {
        addEventListener?: (type: string, listener: (e: Event) => void) => void;
        removeEventListener?: (
          type: string,
          listener: (e: Event) => void
        ) => void;
      },
      type: string,
      listener: (event: Event) => void
    ) => {
      if (!target?.addEventListener) return;
      target.addEventListener(type, listener);
      this._cleanups.push(() => target.removeEventListener?.(type, listener));
    };
    if (typeof window !== 'undefined' && window.addEventListener) {
      listen(window, 'online', () => this.networkChanged(false, 'online'));
      listen(window, 'offline', () => this.networkChanged(false, 'offline'));
      const connection = getConnectionInfo();
      if (connection) {
        listen(connection, 'change', () =>
          this.networkChanged(false, 'connection_change')
        );
      }
      listen(window, 'focus', () => this.appStateChanged('focus'));
      listen(window, 'blur', () => this.appStateChanged('blur'));
      listen(window, 'pagehide', (event) =>
        this.appStateChanged('pagehide', event)
      );
      listen(window, 'pageshow', (event) =>
        this.appStateChanged('pageshow', event)
      );
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      listen(document, 'visibilitychange', () =>
        this.appStateChanged('visibilitychange')
      );
      // Page Lifecycle API (Chromium only).
      listen(document, 'freeze', () => this.appStateChanged('freeze'));
      listen(document, 'resume', () => this.appStateChanged('resume'));
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
    // The baseline for added/removed and device_count is read by created().
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
        attempt: chain.socketAttempts,
        framesSent: 0,
        framesReceived: 0,
      };
      this._socket = socket;
      this._lastGatewayRaw = null;
      this._lastGatewayAt = null;
      const online = onlineNow();
      this._client.emit('socket_connect_started', {
        target,
        is_reconnect: this.socketGeneration > 1,
        attempt: chain.socketAttempts,
        ...(online !== undefined ? { online } : {}),
      });
    });
    return socket;
  }

  socketOpened(socket: SocketTelemetry | null, ws?: WebSocket): void {
    this._safe(() => {
      if (!socket) return;
      const now = Date.now();
      socket.openedAt = now;
      if (ws) socket.ws = ws;
      if (this._chain) this._chain.socketConnectedAt = now;
      const vsp = this._vsp();
      const protocol = attempt(() => socket.ws?.protocol);
      const extensions = attempt(() => socket.ws?.extensions);
      this._client.emit('socket_connected', {
        connect_duration_ms: now - socket.startedAt,
        ...(vsp.signaling_region ? { region: vsp.signaling_region } : {}),
        ...(vsp.signaling_dc ? { dc: vsp.signaling_dc } : {}),
        ...(vsp.signaling_node ? { node: vsp.signaling_node } : {}),
        ...(socket.attempt !== undefined ? { attempt: socket.attempt } : {}),
        ...(typeof protocol === 'string' ? { protocol } : {}),
        ...(typeof extensions === 'string' ? { extensions } : {}),
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
    close: { code?: number; reason?: string; wasClean?: boolean } = {}
  ): void {
    this._safe(() => {
      if (!socket || socket.ended) return;
      socket.ended = true;
      const willRetry = this._session.hasAutoReconnect();
      const now = Date.now();
      const online = onlineNow();
      const wasClean =
        typeof close.wasClean === 'boolean' ? close.wasClean : undefined;
      const buffered = attempt(() => socket.ws?.bufferedAmount);
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
          attempt: socket.attempt || this._chain?.socketAttempts || 1,
          will_retry: willRetry,
          ...(close.reason ? { close_reason: close.reason } : {}),
          ...(wasClean !== undefined ? { was_clean: wasClean } : {}),
          elapsed_ms: now - socket.startedAt,
          ...(online !== undefined ? { online } : {}),
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
          open_duration_ms: now - socket.openedAt,
          will_reconnect: willRetry,
          ...(typeof document !== 'undefined'
            ? { in_background: document.visibilityState === 'hidden' }
            : {}),
          ...(wasClean !== undefined ? { was_clean: wasClean } : {}),
          frames_sent: socket.framesSent,
          frames_received: socket.framesReceived,
          ...(socket.lastReceivedAt !== undefined
            ? { since_last_received_ms: now - socket.lastReceivedAt }
            : {}),
          ...(socket.lastSentAt !== undefined
            ? { since_last_sent_ms: now - socket.lastSentAt }
            : {}),
          ...(typeof buffered === 'number'
            ? { buffered_amount: buffered }
            : {}),
          ...(online !== undefined ? { online } : {}),
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
    resumeSessionId?: string,
    rpcId?: unknown
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
        attempt: chain.loginAttempts,
      };
      const id =
        rpcId !== undefined && rpcId !== null ? rpcIdString(rpcId) : '';
      this._client.emit('login_started', {
        method: this._login.method,
        is_reconnect: this._login.isReconnect,
        ...(resumeSessionId ? { resume_session_id: resumeSessionId } : {}),
        attempt: chain.loginAttempts,
        ...(id ? { rpc_id: id } : {}),
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
        attempt: login.attempt,
        duration_ms: Date.now() - login.startedAt,
      });
    });
  }

  /** The login answer: `result` is the server's whole login result. */
  loginSucceeded(result?: unknown): void {
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
        attempt: login.attempt,
        ...serverResult(result),
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

  /**
   * The client can make and take calls (JS: REGED). Once per (re)login.
   * `params` = the server answer's params (JS REGED: call_report_id, dc, region, state).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clientReady(params?: any): void {
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
        ...(typeof params?.call_report_id === 'string' && params.call_report_id
          ? { call_report_id: params.call_report_id }
          : {}),
        ...(typeof params?.state === 'string' && params.state
          ? { gateway_state: params.state }
          : {}),
        ...serverResult(params),
      });
      this._reattachedCallIds = [];
      this._chain = null;
    });
  }

  // ── Gateway ────────────────────────────────────────────────────────────

  /**
   * A gateway state reported by the server: in the answer to a request
   * (source "result") or pushed by it ("notification").
   */
  gatewayState(raw: string, source?: 'result' | 'notification'): void {
    this._safe(() => {
      if (!raw || raw === this._lastGatewayRaw) return;
      const previous = this._lastGatewayRaw;
      const previousAt = this._lastGatewayAt;
      const now = Date.now();
      this._lastGatewayRaw = raw;
      this._lastGatewayAt = now;
      this._client.emit('gateway_state', {
        state: toGatewayState(raw),
        raw_state: raw,
        ...(previous ? { previous_state: toGatewayState(previous) } : {}),
        ...(previous && previousAt !== null
          ? { since_previous_ms: now - previousAt }
          : {}),
        ...(source ? { source } : {}),
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
        ...(id ? { rpc_id: id } : {}),
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
        ...(id ? { rpc_id: id } : {}),
        response_time_ms: Date.now() - check.at,
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
      ...(id ? { rpc_id: id } : {}),
      ...serverResult(msg.result?.params ?? msg.result),
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
      const context: { online?: boolean; visibility_state?: string } = {};
      assignDefined(context, {
        online: onlineNow(),
        visibility_state: visibilityNow(),
      });
      let payload: ErrorPayload;
      if (stage === 'call' || stage === 'media') {
        payload = {
          stage,
          error: toCodedErrorInfo(error, 49001),
          is_fatal: isFatal,
          ...(clean ? { details: clean } : {}),
          ...context,
        };
      } else {
        const info: ErrorInfo = toErrorInfo(error);
        payload = {
          stage,
          error: info,
          is_fatal: isFatal,
          ...(clean ? { details: clean } : {}),
          ...context,
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

  /** A JSON-RPC frame sent on the signaling socket. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frameSent(frame: any): void {
    this._safe(() => {
      if (!frame || typeof frame !== 'object') return;
      const now = Date.now();
      if (this._socket) {
        this._socket.framesSent += 1;
        this._socket.lastSentAt = now;
      }
      const id = rpcIdString(frame.id);
      const isResponse = 'result' in frame || 'error' in frame;
      // The request's method and call are remembered only to leave out
      // keepalive answers and to put the call's ID on its answer.
      let method = frameMethod(frame);
      let callId = frameCallId(frame);
      if (isResponse) {
        const request = this._receivedRequests.get(id);
        if (request) {
          this._receivedRequests.delete(id);
          method = request.method || method;
          callId = callId ?? request.callId;
        }
      } else {
        this._remember(this._sentRequests, id, { method, at: now, callId });
      }
      if (isFilteredFrameMethod(method)) return;
      this._client.emit(
        'signaling_message',
        { direction: 'sent', raw: rawFrame(frame) },
        callId ? { ids: { call_id: callId } } : {}
      );
    });
  }

  /**
   * A JSON-RPC frame received on the signaling socket, before the SDK handles
   * it. Its sequence is taken now, so it comes before what handling it
   * causes; the record goes out in receivedFrameDone().
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frameReceived(msg: any): ReceivedFrame | null {
    let received: ReceivedFrame | null = null;
    this._safe(() => {
      if (!msg || typeof msg !== 'object') return;
      const now = Date.now();
      if (this._socket) {
        this._socket.framesReceived += 1;
        this._socket.lastReceivedAt = now;
      }
      const id = rpcIdString(msg.id);
      const isRequest = typeof msg.method === 'string';
      let method = isRequest ? msg.method : '';
      let callId = frameCallId(msg);
      if (isRequest) {
        this._remember(this._receivedRequests, id, { method, at: now, callId });
      } else {
        const request = this._sentRequests.get(id);
        if (request) {
          this._sentRequests.delete(id);
          method = request.method;
          callId = callId ?? request.callId;
          if (method === GATEWAY_STATE_METHOD)
            this._gatewayCheckAnswered(id, msg);
        } else {
          method = frameMethod(msg);
        }
      }
      if (isFilteredFrameMethod(method)) return;
      received = {
        sequence: this._client.reserveSequence(),
        timestamp: now,
        payload: { direction: 'received', raw: rawFrame(msg) },
        ids: callId ? { call_id: callId } : undefined,
      };
    });
    return received;
  }

  receivedFrameDone(received: ReceivedFrame | null): void {
    this._safe(() => {
      if (!received) return;
      this._client.emit('signaling_message', received.payload, {
        sequence: received.sequence,
        timestamp: received.timestamp,
        ...(received.ids ? { ids: received.ids } : {}),
      });
    });
  }
}
