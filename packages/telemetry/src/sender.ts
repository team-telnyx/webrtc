/**
 * Call Report V2 telemetry sender (contract 1.6, schema 2.1).
 *
 * - Its own WebSocket, opened when the SDK instance is created and logged in
 *   with the credentials given to it; independent of the signaling socket,
 *   it stays open through every signaling reconnect. Rejected credentials
 *   wait for new ones on the open socket.
 * - One socket per client (owner, 2026-10-08). It closes once the client has
 *   had nothing to send for IDLE_CLOSE_MS (log lines don't count: they are
 *   page-wide) and on pagehide; the client's next event opens it again.
 *   connect() and disconnect() never open or close it.
 * - One JSON-RPC notification per event, sent the moment it happens; never
 *   batched, acknowledged or resent (a gap in `sequence` shows a loss).
 * - While not connected and logged in, events wait in memory (at most
 *   MAX_PENDING_EVENTS, oldest dropped) and go out in order with `sent_at`.
 * - Above MAX_SEND_BACKLOG_BYTES of socket backlog an event is dropped.
 * - telnyx_rtc.telemetry_control switches it off and on.
 * - An event without its own call ID goes out once per active call: same
 *   timestamp, and each copy takes its own sequence like any other record.
 * - Capture mode (the default): the same frames, kept and printed locally.
 */
import { v4 as uuidv4 } from 'uuid';
import type {
  ClientEvent,
  ClientInfo,
  ErrorInfo,
  EventName,
  KnownIds,
  LogCategory,
  LogEntry,
  PayloadOf,
} from './contract';
import { buildClientInfo } from './browser';
import { sanitizeDetails, scrubText, toErrorInfo, type Any } from './sanitize';

export const TELEMETRY_METHOD = 'telnyx_rtc.telemetry';
export const TELEMETRY_PROD_URL = 'wss://rtc-telemetry.telnyx.com';
export const TELEMETRY_DEV_URL = 'wss://rtc-telemetrydev.telnyx.com';
export const TELEMETRY_CONTROL_METHOD = 'telnyx_rtc.telemetry_control';
export const TELEMETRY_LOGIN_METHOD = 'telnyx_rtc.telemetry_login';
export const MAX_PENDING_EVENTS = 1000;
/** At least one max-size record (4 MiB) fits (owner, 2026-10-08). */
export const MAX_SEND_BACKLOG_BYTES = 8 * 1024 * 1024;
export const METRICS_INTERVAL_MS = 1000;
export const DEFAULT_CAPTURE_MARK = '[CR2 telemetry]';
export const DEFAULT_CAPTURE_FLUSH_MS = 5 * 60 * 1000;
export const SCHEMA_VERSION = '2.1';

/** Reconnect backoff [base, max]; after -32003 Telemetry Unavailable it is longer. */
const RECONNECT_MS = [1000, 30000];
const UNAVAILABLE_MS = [30000, 5 * 60 * 1000];
const LOGIN_INCORRECT = -32001;
const TELEMETRY_UNAVAILABLE = -32003;
const LOGIN_TIMEOUT_MS = 10000;
/** The socket closes once the client has had nothing to send for this long. */
export const IDLE_CLOSE_MS = 5 * 60 * 1000;
const MAX_CAPTURED_FRAMES = 200000;
const MAX_ENDED_CALLS = 100;

/** The app's `options.telemetry` (documented in the SDK's ITelemetryOptions). */
export type TelemetrySettings = {
  enabled?: boolean;
  url?: string;
  /** With the socket: also print each event frame to the console (marked) and keep it for capturedFrames(). */
  console?: boolean;
  capture?: boolean | CaptureSettings;
  onFrame?: (frame: string) => void;
};

export type CaptureSettings = {
  console?: boolean;
  consoleMark?: string;
  download?: boolean;
  onFlush?: (frames: string[]) => void;
  flushIntervalMs?: number;
};

/** What the session tells the sender. A socket generation of 0 = no signaling socket yet. */
export interface TelemetryHost {
  getLoginParams(): Record<string, unknown> | null;
  getVoiceSdkId(): string | null | undefined;
  getSessionId(): string | null | undefined;
  getSocketGeneration(): number;
  getDefaultUrl?(): string | null;
  /** The server rejected the credentials (-32001): the app should provide new ones. */
  onLoginRejected?(error: ErrorInfo): void;
}

export type EmitOptions = {
  timestamp?: number;
  /** Taken earlier with reserveSequence(). */
  sequence?: number;
  ids?: Partial<KnownIds>;
  /** Once without call_id instead of once per active call. */
  noActiveCall?: boolean;
};

let WebSocketImpl: Any = typeof WebSocket !== 'undefined' ? WebSocket : null;

/** For tests and non-browser runtimes. */
export const setTelemetryWebSocket = (impl: unknown): void => {
  WebSocketImpl = impl;
};

/** Live clients on this page, newest last. */
const liveClients: TelemetryClient[] = [];

// The page is going away: every client's socket closes (their next event reopens it).
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', () => {
    for (const client of [...liveClients]) client.park('pagehide');
  });
}
/** Pending events of instances that failed in their constructor. */
const orphanEvents: ClientEvent[] = [];

const iso = (ms: number) => new Date(ms).toISOString();
const hasValues = (value: unknown) =>
  !!value && Object.values(value).some((v) => v !== undefined);
/** The app's callback never breaks the sender. */
const callApp = (fn: Any, arg: unknown) => {
  try {
    fn?.(arg);
  } catch {
    // ignore
  }
};

/** A short non-reversible tag of a credentials object. */
function fingerprint(params: Record<string, unknown>): string {
  const text = JSON.stringify(params);
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `${text.length}:${hash}`;
}

/** Capture mode's socket: records each frame (login credentials redacted) and answers the login itself. */
class CaptureSocket {
  readyState = 0;
  bufferedAmount = 0;
  onopen: Any = null;
  onmessage: Any = null;
  onclose: Any = null;
  onerror: Any = null;

  constructor(private _record: (frame: string) => void) {
    setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }

  send(text: string): void {
    const frame = JSON.parse(text);
    if (frame.method !== TELEMETRY_LOGIN_METHOD) return this._record(text);
    for (const key of ['passwd', 'password', 'login_token', 'login']) {
      if (key in frame.params) frame.params[key] = '[REDACTED]';
    }
    this._record(JSON.stringify(frame));
    const result = { message: 'logged in' };
    const data = JSON.stringify({ jsonrpc: '2.0', id: frame.id, result });
    setTimeout(() => this.onmessage?.({ data }), 0);
  }

  close(code = 1000): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

export default class TelemetryClient {
  readonly sdkInstanceId: string = uuidv4();
  /** The envelope's client: structured fields only. */
  readonly client: ClientInfo;
  /** Every browser and device detail (sdk_creation_started's extra.client_details). */
  readonly clientDetails: Record<string, unknown>;
  readonly url: string | undefined;
  readonly capture: boolean;
  private _capture: CaptureSettings;
  private _onFrame: ((frame: string) => void) | undefined;
  private _captured: string[] = [];
  /** Socket mode with console: true: each sent frame is also recorded locally. */
  private _mirror: boolean;
  private _unflushed: string[] = [];
  private _flushTimer: Any = null;

  private _sequence = 0;
  private _host: TelemetryHost | null = null;
  private _pending: ClientEvent[] = [];
  private _ws: Any = null;
  private _authenticated = false;
  private _remoteEnabled = true;
  private _closed = false;
  /** Closed while idle: no reconnects until the client's next event. */
  private _parked = false;
  private _idleTimer: Any = null;
  private _reconnectAttempts = 0;
  private _reconnectTimer: Any = null;
  private _loginTimer: Any = null;
  private _loginId: string | null = null;
  private _loginFingerprint: string | null = null;
  /** Credentials the server rejected: not retried until the session has others. */
  private _rejectedFingerprint: string | null = null;
  private _unavailable = false;
  private _droppedBacklog = 0;
  private _droppedPending = 0;
  private _activeCalls: string[] = [];
  private _endedCalls: string[] = [];
  private _emittingLog = false;

  /**
   * null = off. On by default (owner, 2026-10-08): sends to the telemetry
   * socket and prints each frame to the console. `capture` sends nothing; a
   * client that may not log in (allowSocket false) only captures by default.
   */
  static create(
    settings: TelemetrySettings | undefined,
    env?: string,
    sdkVersion = '',
    allowSocket = true
  ): TelemetryClient | null {
    if (settings?.enabled === false) return null;
    const chosen = settings?.capture || settings?.url || settings?.enabled;
    if (!chosen && !allowSocket) {
      return new TelemetryClient(
        { ...settings, capture: true },
        env,
        sdkVersion
      );
    }
    if (!settings?.capture && !allowSocket) return null;
    const resolved = chosen ? settings : { ...settings, console: true };
    return new TelemetryClient(resolved, env, sdkVersion);
  }

  static liveInstanceIds(): string[] {
    return liveClients.map((client) => client.sdkInstanceId);
  }

  /** The SDK logger's fan-out: every live client gets the line. */
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

  constructor(settings: TelemetrySettings, env?: string, sdkVersion = '') {
    this.url = settings.url;
    this.capture = !!settings.capture;
    this._mirror = !this.capture && !!settings.console;
    this._onFrame = settings.onFrame;
    this._capture =
      typeof settings.capture === 'object' ? settings.capture : {};
    const { download, onFlush, flushIntervalMs } = this._capture;
    if (download || onFlush) {
      this._flushTimer = setInterval(
        () => this.flushCapture(),
        flushIntervalMs || DEFAULT_CAPTURE_FLUSH_MS
      );
    }
    const info = buildClientInfo(sdkVersion, env);
    this.client = info.client;
    this.clientDetails = info.details;
    liveClients.push(this);
    this._active();
  }

  get ready(): boolean {
    return (
      this._ws?.readyState === 1 && this._authenticated && this._remoteEnabled
    );
  }

  get lastSequence(): number {
    return this._sequence;
  }

  attach(host: TelemetryHost): void {
    this._host = host;
  }

  // ── Capture mode ─────────────────────────────────────────────────────

  /** Every frame "sent" so far, as JSON text. */
  capturedFrames(): string[] {
    return this._captured.slice();
  }

  /** Saves the captured frames as a JSON Lines file (browser download). */
  downloadCapture(filename?: string): void {
    this._download(this._captured, filename);
  }

  /** Hands the frames since the last flush to onFlush and/or a download. */
  flushCapture(): void {
    if (!this._unflushed.length) return;
    const frames = this._unflushed;
    this._unflushed = [];
    callApp(this._capture.onFlush, frames);
    if (this._capture.download) this._download(frames);
  }

  private _download(frames: string[], filename?: string): void {
    if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
    const stamp = iso(Date.now()).replace(/[:.]/g, '-');
    const link = document.createElement('a');
    const type = 'application/x-ndjson';
    link.href = URL.createObjectURL(
      new Blob([frames.join('\n') + '\n'], { type })
    );
    link.download =
      filename || `telemetry-${this.sdkInstanceId}-${stamp}.jsonl`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  private _recordFrame(frame: string): void {
    this._captured.push(frame);
    if (this._captured.length > MAX_CAPTURED_FRAMES) this._captured.shift();
    if (this._capture.download || this._capture.onFlush) {
      this._unflushed.push(frame);
    }
    // Straight to the console, never through the SDK logger (that would loop).
    if (this._capture.console !== false && typeof console !== 'undefined') {
      const mark = this._capture.consoleMark || DEFAULT_CAPTURE_MARK;
      try {
        const { method, params } = JSON.parse(frame);
        if (method === TELEMETRY_METHOD) {
          console.log(mark, `#${params.sequence} ${params.name}`, params);
        } else {
          console.log(mark, method, params);
        }
      } catch {
        console.log(mark, frame);
      }
    }
    callApp(this._onFrame, frame);
  }

  // ── Calls: every shared event goes to each active call ────────────────

  /** Takes the next sequence number now, for an event emitted later. */
  reserveSequence(): number {
    return ++this._sequence;
  }

  callStarted(callId: string): void {
    if (!callId) return;
    this._activeCalls = this._activeCalls.filter((id) => id !== callId);
    this._activeCalls.push(callId);
    this._endedCalls = this._endedCalls.filter((id) => id !== callId);
  }

  /** The call's call_ended was built: later records lose its call ID. */
  callEnded(callId: string): void {
    if (!callId) return;
    this._activeCalls = this._activeCalls.filter((id) => id !== callId);
    if (!this._endedCalls.includes(callId)) {
      this._endedCalls.push(callId);
      if (this._endedCalls.length > MAX_ENDED_CALLS) this._endedCalls.shift();
    }
  }

  // ── Emitting ─────────────────────────────────────────────────────────

  /** Builds and sends (or queues) the event; returns its first message, null when none. */
  emit<N extends EventName>(
    name: N,
    payload: PayloadOf<N>,
    options: EmitOptions = {}
  ): ClientEvent | null {
    if (this._closed || !this._remoteEnabled) return null;
    const events = this._build(name, payload, options);
    if (!events.length) return null;
    if (this.ready && !this._pending.length) {
      for (const event of events) this._send(event, false);
      // Backlog drops are reported once the backlog is back under the limit.
      if (
        this._droppedBacklog &&
        this._ws.bufferedAmount <= MAX_SEND_BACKLOG_BYTES
      )
        this._flushPending();
    } else {
      this._enqueue(events);
      this._flushPending();
    }
    if (name !== 'logs') this._active();
    return events[0];
  }

  /** One SDK log line = one `logs` event; never logs through the SDK logger. */
  log(
    level: LogEntry['level'],
    category: LogCategory,
    message: string,
    details?: unknown
  ): void {
    if (this._emittingLog) return;
    this._emittingLog = true;
    try {
      const entry: LogEntry = { level, category, message: scrubText(message) };
      const clean = sanitizeDetails(details);
      if (clean && Object.keys(clean).length) entry.details = clean;
      this.emit('logs', entry);
    } finally {
      this._emittingLog = false;
    }
  }

  private _build(
    name: EventName,
    payload: unknown,
    options: EmitOptions
  ): ClientEvent[] {
    const host = this._host;
    const ids: KnownIds = { sdk_instance_id: this.sdkInstanceId };
    const voiceSdkId = host?.getVoiceSdkId();
    if (voiceSdkId) ids.voice_sdk_id = voiceSdkId;
    const sessionId = host?.getSessionId();
    if (sessionId) ids.session_id = sessionId;
    for (const [key, value] of Object.entries(options.ids ?? {})) {
      if (value) (ids as Record<string, string>)[key] = value;
    }
    // A record of a call whose call_ended went out no longer carries its ID.
    if (this._endedCalls.includes(ids.call_id)) delete ids.call_id;
    const shared = !options.ids?.call_id && !options.noActiveCall;
    const callIds: (string | undefined)[] = ids.call_id
      ? [ids.call_id]
      : shared && this._activeCalls.length
        ? [...this._activeCalls]
        : [undefined];
    const generation = host?.getSocketGeneration() ?? 0;
    if (
      name === 'call_metrics' &&
      !(generation > 0 && ids.voice_sdk_id && ids.session_id && ids.call_id)
    ) {
      return []; // dead-lettered by the backend: no sequence spent on it
    }
    const timestamp = iso(options.timestamp ?? Date.now());
    return callIds.map((callId, index) => {
      const event = {
        schema_version: SCHEMA_VERSION,
        // Every record its own number; only the first copy can use a reserved one.
        sequence:
          (index === 0 ? options.sequence : undefined) ??
          this.reserveSequence(),
        timestamp,
        client: this.client,
        ids: callId ? { ...ids, call_id: callId } : ids,
        name,
        payload,
      } as ClientEvent;
      if (generation > 0) event.socket_generation = generation;
      return event;
    });
  }

  /** In sequence order; above the cap the oldest go first. */
  private _enqueue(events: ClientEvent[]): void {
    for (const event of events) {
      let index = this._pending.length;
      while (index > 0 && this._pending[index - 1].sequence > event.sequence)
        index--;
      this._pending.splice(index, 0, event);
    }
    while (this._pending.length > MAX_PENDING_EVENTS) {
      this._pending.shift();
      this._droppedPending += 1;
    }
  }

  private _send(event: ClientEvent, waited: boolean): void {
    const ws = this._ws;
    if (ws?.readyState !== 1) return;
    if (ws.bufferedAmount > MAX_SEND_BACKLOG_BYTES) {
      this._droppedBacklog += 1; // dropped, never queued
      return;
    }
    // Extras are filled in until the event is sent; an empty one is left out.
    const { extra, ...rest } = event.payload as { extra?: object };
    const params = {
      ...event,
      payload: hasValues(extra) ? event.payload : rest,
      ...(waited ? { sent_at: iso(Date.now()) } : {}),
    };
    try {
      const text = JSON.stringify({
        jsonrpc: '2.0',
        method: TELEMETRY_METHOD,
        params,
      });
      ws.send(text);
      if (this._mirror) this._recordFrame(text);
    } catch {
      this._droppedBacklog += 1;
    }
  }

  private _flushPending(): void {
    if (!this.ready) return;
    while (orphanEvents.length && this.ready) {
      this._send(orphanEvents.shift(), true);
    }
    while (this._pending.length && this.ready) {
      this._send(this._pending.shift(), true);
    }
    if (!this._droppedBacklog && !this._droppedPending) return;
    // One line per incident, never per send.
    const details = {
      dropped_backlog: this._droppedBacklog,
      dropped_pending: this._droppedPending,
    };
    this._droppedBacklog = this._droppedPending = 0;
    this.log('warn', 'telemetry', 'Telemetry events dropped', details);
  }

  // ── The telemetry socket ─────────────────────────────────────────────

  private _loginParams(): Record<string, unknown> | null {
    // Capture mode logs in to nothing: no credentials needed.
    return this._host?.getLoginParams() ?? (this.capture ? {} : null);
  }

  /**
   * Opens the telemetry socket unless open or opening; on an open socket whose
   * login was rejected, logs in again if the credentials changed. A no-op
   * without credentials, or with ones the server rejected.
   */
  connect(): void {
    if (this._closed || this._parked) return;
    if (!WebSocketImpl && !this.capture) return;
    const params = this._loginParams();
    const usable =
      !!params && fingerprint(params) !== this._rejectedFingerprint;
    const ws = this._ws;
    if (ws && ws.readyState <= 1) {
      const idle =
        ws.readyState === 1 && !this._authenticated && !this._loginId;
      if (idle && usable) this._login(ws);
      return;
    }
    if (!usable) return;
    const url = this.capture
      ? 'capture:'
      : this.url || this._host.getDefaultUrl?.();
    if (!url) return;
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
    this._open(url);
  }

  private _open(url: string): void {
    let ws: Any;
    try {
      ws = this.capture
        ? new CaptureSocket((frame) => this._recordFrame(frame))
        : new WebSocketImpl(url);
    } catch (error) {
      this.log('warn', 'telemetry', 'Telemetry socket could not be created', {
        error: toErrorInfo(error),
      });
      this._scheduleReconnect();
      return;
    }
    this._ws = ws;
    this._authenticated = false;
    this._remoteEnabled = true; // a new socket turns telemetry back on
    const openedAt = Date.now();
    ws.onopen = () => this._ws === ws && this._login(ws);
    ws.onmessage = (message: Any) =>
      this._ws === ws && this._onMessage(ws, message.data);
    ws.onerror = () => undefined; // onclose follows
    ws.onclose = (event: Any) => {
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
      if (!this._rejectedFingerprint) this._scheduleReconnect();
    };
  }

  private _login(ws: Any): void {
    const params = this._loginParams();
    if (!params) {
      this.log('warn', 'telemetry', 'Telemetry login skipped: no credentials');
      ws.close(1000);
      return;
    }
    this._loginId = uuidv4();
    this._loginFingerprint = fingerprint(params);
    const voiceSdkId = this._host?.getVoiceSdkId();
    const { sdk_version: sdkVersion, user_agent: data } = this.client;
    ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: this._loginId,
        method: TELEMETRY_LOGIN_METHOD,
        params: {
          ...params,
          sdk_instance_id: this.sdkInstanceId,
          ...(voiceSdkId ? { voice_sdk_id: voiceSdkId } : {}),
          'User-Agent': { sdkVersion, data },
        },
      })
    );
    this._loginTimer = setTimeout(() => {
      this._loginTimer = null;
      if (this._ws !== ws || this._authenticated) return;
      this.log('warn', 'telemetry', 'Telemetry login timed out', {
        timeout_ms: LOGIN_TIMEOUT_MS,
      });
      ws.close(4000);
    }, LOGIN_TIMEOUT_MS);
  }

  private _onMessage(ws: Any, data: unknown): void {
    let msg: Any;
    try {
      msg = typeof data === 'string' ? JSON.parse(data) : null;
    } catch {
      return;
    }
    if (msg?.id && msg.id === this._loginId) {
      this._clearLoginTimer();
      this._loginId = null;
      if (msg.error) {
        const { code, message } = msg.error;
        const error = toErrorInfo({ code, message });
        this.log('warn', 'telemetry', 'Telemetry login failed', { error });
        if (code === LOGIN_INCORRECT) {
          // The socket stays open; new credentials log in again on it.
          this._rejectedFingerprint = this._loginFingerprint;
          callApp((e: ErrorInfo) => this._host?.onLoginRejected?.(e), error);
          return;
        }
        // Anything else is temporary: reconnect with backoff.
        if (code === TELEMETRY_UNAVAILABLE) this._unavailable = true;
        ws.close(1000);
        return;
      }
      this._authenticated = true;
      this._rejectedFingerprint = null;
      this._unavailable = false;
      this._reconnectAttempts = 0;
      const pending = this._pending.length;
      this._flushPending();
      this.log('info', 'telemetry', 'Telemetry socket connected', { pending });
    } else if (msg?.method === TELEMETRY_CONTROL_METHOD) {
      this._remoteEnabled = msg.params?.enabled !== false;
      if (!this._remoteEnabled) {
        this._pending = [];
        return;
      }
      this.log('info', 'telemetry', 'Telemetry switched back on by the server');
      this._flushPending();
    }
  }

  private _clearLoginTimer(): void {
    clearTimeout(this._loginTimer);
    this._loginTimer = null;
  }

  private _scheduleReconnect(): void {
    if (this._closed || this._parked || this._reconnectTimer) return;
    this._reconnectAttempts += 1;
    const [base, max] = this._unavailable ? UNAVAILABLE_MS : RECONNECT_MS;
    const backoff = Math.min(base * 2 ** (this._reconnectAttempts - 1), max);
    // ±25% jitter, so many clients don't come back at once.
    const delay = Math.round(backoff * (0.75 + Math.random() * 0.5));
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
    }, delay);
  }

  // ── Idle close ───────────────────────────────────────────────────────

  /** The client has something to send: reopens a socket closed while idle; the idle countdown starts again. */
  private _active(): void {
    if (this._closed || this.capture) return;
    if (this._parked) {
      this._parked = false;
      if (!liveClients.includes(this)) liveClients.push(this);
      this.connect();
    }
    clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      this._idleTimer = null;
      this.park('idle');
    }, IDLE_CLOSE_MS);
  }

  /** Closes the socket but keeps the client; its next event opens it again. */
  park(reason: 'idle' | 'pagehide'): void {
    if (this._closed || this._parked) return;
    clearTimeout(this._idleTimer);
    this._idleTimer = null;
    this.log('info', 'telemetry', 'Telemetry socket closed', {
      reason,
      pending: this._pending.length,
    });
    this._parked = true;
    const index = liveClients.indexOf(this);
    if (index >= 0) liveClients.splice(index, 1);
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
    this._clearLoginTimer();
    this._loginId = null;
    const ws = this._ws;
    this._ws = null;
    this._authenticated = false;
    if (!ws) return;
    ws.onclose = ws.onmessage = null;
    try {
      ws.close(1000);
    } catch {
      // already closed
    }
  }

  private _leave(): void {
    this._closed = true;
    const index = liveClients.indexOf(this);
    if (index >= 0) liveClients.splice(index, 1);
  }

  /** The instance is going away: sends what it can, then closes. */
  close(): void {
    if (this._closed) return;
    this._flushPending();
    this._leave();
    clearTimeout(this._idleTimer);
    clearInterval(this._flushTimer);
    this.flushCapture();
    clearTimeout(this._reconnectTimer);
    this._clearLoginTimer();
    const ws = this._ws;
    this._ws = null;
    if (!ws) return;
    ws.onclose = ws.onmessage = null;
    try {
      ws.close(1000);
    } catch {
      // already closed
    }
  }

  /** The constructor threw: the next live client sends this one's pending events. */
  orphan(): void {
    orphanEvents.push(...this._pending);
    orphanEvents.splice(0, orphanEvents.length - MAX_PENDING_EVENTS);
    this._pending = [];
    this._leave();
    for (const client of liveClients) client._flushPending();
  }
}
