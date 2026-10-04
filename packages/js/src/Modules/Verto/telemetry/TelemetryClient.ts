/**
 * Call Report V2 telemetry sender (contract 1.6).
 *
 * - Its own WebSocket, next to the signaling one.
 * - One JSON-RPC notification per event, sent the moment it happens.
 * - No batching, no acknowledgement, no resend. A gap in `sequence` shows a loss.
 * - Events that happen while the telemetry socket is not connected and
 *   authenticated wait in memory only (max_pending_events, oldest dropped first)
 *   and go out in sequence order with `sent_at` once it is.
 * - Above max_send_backlog_bytes of unsent socket backlog, an event is dropped.
 * - The server can switch it off with telnyx_rtc.telemetry_control.
 */
import { v4 as uuidv4 } from 'uuid';
import pkg from '../../../../package.json';
import type {
  ClientEvent,
  ClientInfo,
  EventBody,
  EventName,
  KnownIds,
  LogCategory,
  LogEntry,
} from './contract';
import { sanitizeDetails, sanitizeMessage, toErrorInfo } from './sanitize';

export const TELEMETRY_METHOD = 'telnyx_rtc.telemetry';
export const TELEMETRY_CONTROL_METHOD = 'telnyx_rtc.telemetry_control';
export const TELEMETRY_LOGIN_METHOD = 'telnyx_rtc.telemetry_login';

export const DEFAULT_MAX_PENDING_EVENTS = 1000;
export const DEFAULT_MAX_SEND_BACKLOG_BYTES = 64 * 1024;
export const DEFAULT_METRICS_INTERVAL_MS = 1000;

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
/** VSP said telemetry is unavailable (backend or call party down): wait longer. */
const UNAVAILABLE_BASE_MS = 30000;
const UNAVAILABLE_MAX_MS = 5 * 60 * 1000;

/** VSP's telemetry login errors (VSP thread, 2026-10-04). */
const LOGIN_INCORRECT = -32001;
const TELEMETRY_UNAVAILABLE = -32003;
const LOGIN_TIMEOUT_MS = 10000;

/** App-facing options (`options.telemetry`). */
export interface ITelemetryOptions {
  /** false = the SDK records and sends nothing. */
  enabled?: boolean;
  /**
   * The telemetry socket's URL. Defaults to the signaling host's /telemetry
   * path (e.g. wss://rtc.telnyx.com/telemetry). Telemetry is on when this is
   * set or `enabled` is true.
   */
  url?: string;
  metricsIntervalMs?: number;
  maxPendingEvents?: number;
  maxSendBacklogBytes?: number;
}

/** What the session tells the telemetry client about itself. */
export interface ITelemetryHost {
  /** Auth params for the telemetry login (the same credentials as the signaling login). */
  getLoginParams(): Record<string, unknown> | null;
  getVoiceSdkId(): string | null | undefined;
  getSessionId(): string | null | undefined;
  /** Current signaling socket generation; 0 or less = no socket attempt yet. */
  getSocketGeneration(): number;
  /** The telemetry URL when the app gave none. */
  getDefaultUrl?(): string | null;
}

type EmitOptions = {
  /** Event time; defaults to now. */
  timestamp?: number;
  /** A sequence number taken earlier with reserveSequence(). */
  sequence?: number;
  /** IDs of this event that override the client's current ones (call_id, Telnyx IDs). */
  ids?: Partial<KnownIds>;
  /** Do not add the active call's ID (an event of another call). */
  noActiveCall?: boolean;
};

type Pending = { event: ClientEvent };

type WebSocketCtor = typeof WebSocket;

let WebSocketImpl: WebSocketCtor | null =
  typeof WebSocket !== 'undefined' ? WebSocket : null;

/** For tests and non-browser runtimes. */
export const setTelemetryWebSocket = (impl: WebSocketCtor): void => {
  WebSocketImpl = impl;
};

/** Live clients on this page, newest last (sdk_created.sdk_instances, log fan-out). */
const liveClients: TelemetryClient[] = [];

/**
 * Pending events of SDK instances that failed in their constructor. The next
 * client whose telemetry socket is up sends them, under their own instance ID.
 */
const orphanEvents: ClientEvent[] = [];

function detectOs(userAgent: string): Pick<ClientInfo, 'os' | 'os_version'> {
  const ua = userAgent || '';
  let match: RegExpMatchArray | null;
  if ((match = ua.match(/Android\s([\d.]+)/))) {
    return { os: 'android', os_version: match[1] };
  }
  if ((match = ua.match(/(?:iPhone|iPad|iPod).*?OS\s([\d_]+)/))) {
    return { os: 'ios', os_version: match[1].replace(/_/g, '.') };
  }
  if (/CrOS/.test(ua)) return { os: 'chromeos' };
  if ((match = ua.match(/Windows NT\s([\d.]+)/))) {
    return { os: 'windows', os_version: match[1] };
  }
  if ((match = ua.match(/Mac OS X\s([\d_.]+)/))) {
    return { os: 'macos', os_version: match[1].replace(/_/g, '.') };
  }
  if (/Linux/.test(ua)) return { os: 'linux' };
  return { os: 'unknown' };
}

export function buildClientInfo(env?: string): ClientInfo {
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const os = detectOs(userAgent);
  const info: ClientInfo = {
    environment: env === 'development' ? 'development' : 'production',
    sdk: 'js',
    sdk_version: pkg.version,
    os: os.os,
    user_agent: userAgent,
  };
  if (os.os_version) info.os_version = os.os_version;
  return info;
}

const iso = (ms: number) => new Date(ms).toISOString();

/** A short, non-reversible tag of a credentials object (never sent or logged). */
function fingerprint(params: Record<string, unknown>): string {
  const text = JSON.stringify(params);
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `${text.length}:${hash}`;
}

export default class TelemetryClient {
  public readonly sdkInstanceId: string = uuidv4();
  public readonly client: ClientInfo;
  public readonly metricsIntervalMs: number;
  public readonly maxPendingEvents: number;
  public readonly maxSendBacklogBytes: number;
  public readonly url: string | undefined;

  private _sequence = 0;
  private _host: ITelemetryHost | null = null;
  private _pending: Pending[] = [];
  private _ws: WebSocket | null = null;
  private _authenticated = false;
  private _remoteEnabled = true;
  private _closed = false;
  private _reconnectAttempts = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _loginTimer: ReturnType<typeof setTimeout> | null = null;
  private _loginId: string | null = null;
  /** Fingerprint of the credentials of the login in flight. */
  private _loginFingerprint: string | null = null;
  /**
   * Fingerprint of credentials the server rejected: not retried until the
   * session has other ones (e.g. after client.login({ creds })).
   */
  private _rejectedFingerprint: string | null = null;
  /** The last login answer was -32003: back off longer before trying again. */
  private _unavailable = false;
  private _droppedBacklog = 0;
  private _droppedPending = 0;
  /** Active calls, oldest first. The newest one's ID goes on every record. */
  private _activeCalls: string[] = [];
  private _emittingLog = false;

  /** Returns null when the app switched telemetry off or gave no URL. */
  static create(
    options: { telemetry?: ITelemetryOptions; env?: string } = {}
  ): TelemetryClient | null {
    const telemetry = options.telemetry;
    if (
      !telemetry ||
      telemetry.enabled === false ||
      (!telemetry.url && telemetry.enabled !== true)
    ) {
      return null;
    }
    return new TelemetryClient(telemetry, options.env);
  }

  static liveInstanceIds(): string[] {
    return liveClients.map((client) => client.sdkInstanceId);
  }

  /** Fan-out target for the SDK logger: every live client gets the line. */
  static forwardLog(
    level: LogEntry['level'],
    category: LogCategory,
    message: string,
    details?: unknown
  ): void {
    for (const client of liveClients) {
      client.log(level, category, message, details);
    }
  }

  constructor(options: ITelemetryOptions, env?: string) {
    this.url = options.url;
    this.client = buildClientInfo(env);
    this.metricsIntervalMs =
      options.metricsIntervalMs ?? DEFAULT_METRICS_INTERVAL_MS;
    this.maxPendingEvents =
      options.maxPendingEvents ?? DEFAULT_MAX_PENDING_EVENTS;
    this.maxSendBacklogBytes =
      options.maxSendBacklogBytes ?? DEFAULT_MAX_SEND_BACKLOG_BYTES;
    liveClients.push(this);
  }

  get ready(): boolean {
    return (
      !!this._ws &&
      this._ws.readyState === 1 &&
      this._authenticated &&
      this._remoteEnabled
    );
  }

  get pendingCount(): number {
    return this._pending.length;
  }

  get lastSequence(): number {
    return this._sequence;
  }

  attach(host: ITelemetryHost): void {
    this._host = host;
  }

  /** Takes the next sequence number now, for an event emitted later. */
  reserveSequence(): number {
    this._sequence += 1;
    return this._sequence;
  }

  // ── Active call: its ID goes on every record while it lasts ──────────

  callStarted(callId: string): void {
    this._activeCalls = this._activeCalls.filter((id) => id !== callId);
    this._activeCalls.push(callId);
  }

  callEnded(callId: string): void {
    this._activeCalls = this._activeCalls.filter((id) => id !== callId);
  }

  get activeCallId(): string | undefined {
    return this._activeCalls[this._activeCalls.length - 1];
  }

  // ── Emitting ──────────────────────────────────────────────────────────

  emit<N extends EventName>(
    name: N,
    payload: Extract<EventBody, { name: N }>['payload'],
    options: EmitOptions = {}
  ): ClientEvent | null {
    if (this._closed || !this._remoteEnabled) return null;
    const event = this._buildEvent(name, payload, options);
    if (!event) return null;
    if (this.ready && this._pending.length === 0) {
      this._send(event, false);
    } else {
      this._enqueue(event);
      this._flushPending();
    }
    return event;
  }

  /** One SDK log line = one `logs` event. Never logs through the SDK logger itself. */
  log(
    level: LogEntry['level'],
    category: LogCategory,
    message: string,
    details?: unknown
  ): void {
    if (this._emittingLog) return;
    this._emittingLog = true;
    try {
      const entry: LogEntry = {
        level,
        category,
        message: sanitizeMessage(message),
      };
      const clean = sanitizeDetails(details);
      if (clean && Object.keys(clean).length) entry.details = clean;
      this.emit('logs', entry);
    } finally {
      this._emittingLog = false;
    }
  }

  private _buildEvent(
    name: EventName,
    payload: EventBody['payload'],
    options: EmitOptions
  ): ClientEvent | null {
    const ids: KnownIds = { sdk_instance_id: this.sdkInstanceId };
    const voiceSdkId = this._host?.getVoiceSdkId();
    if (voiceSdkId) ids.voice_sdk_id = voiceSdkId;
    const sessionId = this._host?.getSessionId();
    if (sessionId) ids.session_id = sessionId;
    const activeCallId = options.noActiveCall ? undefined : this.activeCallId;
    if (activeCallId) ids.call_id = activeCallId;
    if (options.ids) {
      for (const [key, value] of Object.entries(options.ids)) {
        if (value) (ids as Record<string, string>)[key] = value as string;
      }
    }

    if (
      name === 'call_metrics' &&
      (!(this._host?.getSocketGeneration() > 0) ||
        !ids.voice_sdk_id ||
        !ids.session_id ||
        !ids.call_id)
    ) {
      // The backend dead-letters these (contract 1.5); don't spend a sequence on it.
      return null;
    }

    const event = {
      schema_version: '2.0',
      sequence: options.sequence ?? this.reserveSequence(),
      timestamp: iso(options.timestamp ?? Date.now()),
      client: this.client,
      ids,
      name,
      payload,
    } as ClientEvent;
    const generation = this._host?.getSocketGeneration() ?? 0;
    if (generation > 0) event.socket_generation = generation;
    return event;
  }

  private _enqueue(event: ClientEvent): void {
    // Keep sequence order: a reserved sequence may arrive after newer ones.
    let index = this._pending.length;
    while (
      index > 0 &&
      this._pending[index - 1].event.sequence > event.sequence
    ) {
      index -= 1;
    }
    this._pending.splice(index, 0, { event });
    while (this._pending.length > this.maxPendingEvents) {
      this._pending.shift();
      this._droppedPending += 1;
    }
  }

  private _send(event: ClientEvent, waited: boolean): boolean {
    const ws = this._ws;
    if (!ws || ws.readyState !== 1) return false;
    if (ws.bufferedAmount > this.maxSendBacklogBytes) {
      this._droppedBacklog += 1;
      return true; // dropped, never queued
    }
    const params = waited ? { ...event, sent_at: iso(Date.now()) } : event;
    try {
      ws.send(
        JSON.stringify({ jsonrpc: '2.0', method: TELEMETRY_METHOD, params })
      );
    } catch {
      this._droppedBacklog += 1;
    }
    return true;
  }

  private _flushPending(): void {
    if (!this.ready) return;
    while (orphanEvents.length && this.ready) {
      this._send(orphanEvents.shift(), true);
    }
    while (this._pending.length && this.ready) {
      const { event } = this._pending.shift();
      this._send(event, true);
    }
    this._reportDrops();
  }

  /** The sender about itself: category telemetry, one line per incident, not per send. */
  private _reportDrops(): void {
    if (!this._droppedBacklog && !this._droppedPending) return;
    const details = {
      dropped_backlog: this._droppedBacklog,
      dropped_pending: this._droppedPending,
      max_pending_events: this.maxPendingEvents,
      max_send_backlog_bytes: this.maxSendBacklogBytes,
    };
    this._droppedBacklog = 0;
    this._droppedPending = 0;
    this.log('warn', 'telemetry', 'Telemetry events dropped', details);
  }

  // ── The telemetry socket ──────────────────────────────────────────────

  /**
   * Opens the telemetry socket if it is not open or opening. A no-op while the
   * session has no credentials, or only ones the server already rejected;
   * call again once it has new ones.
   */
  connect(): void {
    if (this._closed || !WebSocketImpl) return;
    if (this._ws && (this._ws.readyState === 0 || this._ws.readyState === 1)) {
      return;
    }
    const params = this._host?.getLoginParams();
    if (!params || fingerprint(params) === this._rejectedFingerprint) return;
    const url = this.url || this._host.getDefaultUrl?.();
    if (!url) return;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    let ws: WebSocket;
    try {
      ws = new WebSocketImpl(url);
    } catch (error) {
      this.log('warn', 'telemetry', 'Telemetry socket could not be created', {
        error: toErrorInfo(error),
      });
      this._scheduleReconnect();
      return;
    }
    this._ws = ws;
    this._authenticated = false;
    // A new telemetry socket turns telemetry back on (contract 1.6, kill switch).
    this._remoteEnabled = true;
    const openedAt = Date.now();

    ws.onopen = () => {
      if (this._ws !== ws) return;
      this._login(ws);
    };
    ws.onmessage = (message) => {
      if (this._ws !== ws) return;
      this._onMessage(ws, message.data);
    };
    ws.onerror = () => {
      // onclose follows and handles the reconnect.
    };
    ws.onclose = (event) => {
      if (this._ws !== ws) return;
      this._clearLoginTimer();
      const wasAuthenticated = this._authenticated;
      this._ws = null;
      this._authenticated = false;
      this.log('info', 'telemetry', 'Telemetry socket closed', {
        close_code: event?.code,
        reason: event?.reason,
        open_duration_ms: Date.now() - openedAt,
        was_authenticated: wasAuthenticated,
      });
      // After a rejected login, wait for other credentials (connect() again).
      if (!this._rejectedFingerprint) this._scheduleReconnect();
    };
  }

  private _login(ws: WebSocket): void {
    const params = this._host?.getLoginParams();
    if (!params) {
      this.log('warn', 'telemetry', 'Telemetry login skipped: no credentials');
      ws.close(1000);
      return;
    }
    this._loginId = uuidv4();
    this._loginFingerprint = fingerprint(params);
    ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: this._loginId,
        method: TELEMETRY_LOGIN_METHOD,
        params: {
          ...params,
          sdk_instance_id: this.sdkInstanceId,
          ...(this._host?.getVoiceSdkId()
            ? { voice_sdk_id: this._host.getVoiceSdkId() }
            : {}),
          'User-Agent': {
            sdkVersion: pkg.version,
            data: this.client.user_agent,
          },
        },
      })
    );
    this._loginTimer = setTimeout(() => {
      this._loginTimer = null;
      if (this._ws === ws && !this._authenticated) {
        this.log('warn', 'telemetry', 'Telemetry login timed out', {
          timeout_ms: LOGIN_TIMEOUT_MS,
        });
        ws.close(4000);
      }
    }, LOGIN_TIMEOUT_MS);
  }

  private _onMessage(ws: WebSocket, data: unknown): void {
    let msg: {
      id?: string;
      method?: string;
      params?: { enabled?: boolean };
      result?: unknown;
      error?: { code?: number; message?: string };
    };
    try {
      msg = typeof data === 'string' ? JSON.parse(data) : null;
    } catch {
      return;
    }
    if (!msg) return;

    if (msg.id && msg.id === this._loginId) {
      this._clearLoginTimer();
      this._loginId = null;
      if (msg.error) {
        // Wrong credentials are not retried until the session has new ones;
        // anything else (e.g. -32003 Telemetry Unavailable) is temporary.
        if (msg.error.code === LOGIN_INCORRECT) {
          this._rejectedFingerprint = this._loginFingerprint;
        } else if (msg.error.code === TELEMETRY_UNAVAILABLE) {
          this._unavailable = true;
        }
        this.log('warn', 'telemetry', 'Telemetry login failed', {
          error: toErrorInfo({
            code: msg.error.code,
            message: msg.error.message,
          }),
        });
        ws.close(1000);
        return;
      }
      this._authenticated = true;
      this._rejectedFingerprint = null;
      this._unavailable = false;
      this._reconnectAttempts = 0;
      const pending = this._pending.length;
      this._flushPending();
      this.log('info', 'telemetry', 'Telemetry socket connected', {
        pending,
      });
      return;
    }

    if (msg.method === TELEMETRY_CONTROL_METHOD) {
      const enabled = msg.params?.enabled !== false;
      if (!enabled) {
        this._remoteEnabled = false;
        this._pending = [];
      } else {
        this._remoteEnabled = true;
        this.log(
          'info',
          'telemetry',
          'Telemetry switched back on by the server'
        );
        this._flushPending();
      }
    }
  }

  private _clearLoginTimer(): void {
    if (this._loginTimer) {
      clearTimeout(this._loginTimer);
      this._loginTimer = null;
    }
  }

  private _scheduleReconnect(): void {
    if (this._closed || this._reconnectTimer) return;
    this._reconnectAttempts += 1;
    const [base, max] = this._unavailable
      ? [UNAVAILABLE_BASE_MS, UNAVAILABLE_MAX_MS]
      : [RECONNECT_BASE_MS, RECONNECT_MAX_MS];
    const backoff = Math.min(
      base * Math.pow(2, this._reconnectAttempts - 1),
      max
    );
    // ±25% jitter, so many clients don't come back at the same moment.
    const delay = Math.round(backoff * (0.75 + Math.random() * 0.5));
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * The SDK instance is going away (disconnect). Sends what it can, then closes.
   * Pending events that could not go out are lost, as the contract allows.
   */
  close(): void {
    if (this._closed) return;
    this._flushPending();
    this._closed = true;
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
    this._clearLoginTimer();
    const ws = this._ws;
    this._ws = null;
    if (ws) {
      ws.onclose = null;
      ws.onmessage = null;
      try {
        ws.close(1000);
      } catch {
        // already closed
      }
    }
    const index = liveClients.indexOf(this);
    if (index >= 0) liveClients.splice(index, 1);
  }

  /**
   * The SDK constructor threw: hand this client's pending events to the next
   * client whose telemetry socket is up, and leave the page.
   */
  orphan(): void {
    for (const { event } of this._pending) orphanEvents.push(event);
    while (orphanEvents.length > DEFAULT_MAX_PENDING_EVENTS)
      orphanEvents.shift();
    this._pending = [];
    this._closed = true;
    const index = liveClients.indexOf(this);
    if (index >= 0) liveClients.splice(index, 1);
    for (const client of liveClients) client._flushPending();
  }
}
