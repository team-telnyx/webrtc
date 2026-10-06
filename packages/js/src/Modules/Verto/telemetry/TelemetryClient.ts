/**
 * Call Report V2 telemetry sender (contract 1.6, schema_version 2.1).
 *
 * - Its own WebSocket, next to the signaling one.
 * - One JSON-RPC notification per event, sent the moment it happens.
 * - No batching, no acknowledgement, no resend. A gap in `sequence` shows a loss.
 * - Events that happen while the telemetry socket is not connected and
 *   authenticated wait in memory only (max_pending_events, oldest dropped first)
 *   and go out in sequence order with `sent_at` once it is.
 * - Above max_send_backlog_bytes of unsent socket backlog, an event is dropped.
 * - The server can switch it off with telnyx_rtc.telemetry_control.
 * - Contract 2.1: an event not about one call (no explicit call_id) goes out
 *   once per active call, every copy with the same sequence and timestamp and
 *   its own ids.call_id; every record with a call_id carries call_sequence
 *   (1, 2, 3... per call ID). call_ended is the call's last record.
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
/** The telemetry VSP: its own domain, any path (owner, 2026-10-06). */
export const TELEMETRY_PROD_URL = 'wss://rtc-telemetry.telnyx.com';
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
  /**
   * false = the SDK records and sends nothing. true = send to the telemetry
   * socket. Unset = local capture (the default; see `capture`).
   */
  enabled?: boolean;
  /**
   * The telemetry socket's URL. Setting it (or `enabled: true`) sends to the
   * telemetry socket instead of the default local capture. Defaults to the
   * telemetry VSP, wss://rtc-telemetry.telnyx.com (production; with env
   * "development" there is no default yet).
   */
  url?: string;
  metricsIntervalMs?: number;
  maxPendingEvents?: number;
  maxSendBacklogBytes?: number;
  /**
   * Local capture, for checking what the SDK collects, as if the telemetry
   * socket existed: nothing goes over the network. Each frame the SDK would
   * send on the telemetry socket (the login with its credentials redacted,
   * then one per event) is kept in memory in send order, printed to the
   * console and passed to `onFrame`. Read them with
   * `client.telemetry.capturedFrames()` or save them with
   * `client.telemetry.downloadCapture()`; see ITelemetryCaptureOptions for
   * the console and the periodic flush to a file.
   */
  capture?: boolean | ITelemetryCaptureOptions;
  /** Capture mode: called with each frame's JSON text as it is "sent". */
  onFrame?: (frame: string) => void;
}

/** Capture mode settings (`telemetry.capture`). */
export interface ITelemetryCaptureOptions {
  /** Print each frame to the console as it is "sent". Default true. */
  console?: boolean;
  /** What each console line starts with, to filter on. Default "[CR2 telemetry]". */
  consoleMark?: string;
  /**
   * Save the frames captured since the last flush as a JSON Lines file (one
   * frame per line) through the browser's download, every `flushIntervalMs`
   * and when the client disconnects.
   */
  download?: boolean;
  /** Same schedule as `download`: called with the frames since the last flush. */
  onFlush?: (frames: string[]) => void;
  /** How often to flush. Default 300000 (5 minutes). */
  flushIntervalMs?: number;
}

export const DEFAULT_CAPTURE_MARK = '[CR2 telemetry]';
export const DEFAULT_CAPTURE_FLUSH_MS = 5 * 60 * 1000;

/** Credentials never kept in a captured login frame. */
const CAPTURE_REDACTED_KEYS = ['passwd', 'password', 'login_token', 'login'];

/** Most frames a capture keeps in memory (oldest dropped first). */
const MAX_CAPTURED_FRAMES = 200000;

/**
 * Stands in for the telemetry socket in capture mode: records each frame and
 * answers the login itself, so the sender runs exactly as it would online.
 */
class CaptureSocket {
  readyState = 0;
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((message: { data: string }) => void) | null = null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(private _record: (frame: string) => void) {
    setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }

  send(text: string): void {
    const frame = JSON.parse(text);
    if (frame.method === TELEMETRY_LOGIN_METHOD) {
      for (const key of CAPTURE_REDACTED_KEYS) {
        if (key in frame.params) frame.params[key] = '[REDACTED]';
      }
      this._record(JSON.stringify(frame));
      setTimeout(() => {
        this.onmessage?.({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: frame.id,
            result: { message: 'logged in' },
          }),
        });
      }, 0);
      return;
    }
    this._record(text);
  }

  close(code = 1000): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code });
  }
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
  /** Do not copy the event to the active calls: send it once without call_id. */
  noActiveCall?: boolean;
};

type Pending = { event: ClientEvent };

export const SCHEMA_VERSION = '2.1';

/** Ended call IDs remembered so a late record of one is sent without its call_id. */
const MAX_ENDED_CALLS = 100;

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
  /** Local capture mode: frames are kept, nothing is sent (see ITelemetryOptions). */
  public readonly capture: boolean;
  private _onFrame: ((frame: string) => void) | null;
  private _captured: string[] = [];
  private _captureOptions: ITelemetryCaptureOptions = {};
  /** Frames captured since the last flush. */
  private _unflushed: string[] = [];
  private _flushTimer: ReturnType<typeof setInterval> | null = null;

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
  /** Active calls, oldest first. A shared event goes to each of them. */
  private _activeCalls: string[] = [];
  /** call_sequence counters: the last value used per call ID. */
  private _callSequences = new Map<string, number>();
  /** Calls whose call_ended was built: nothing carries their ID any more. */
  private _endedCalls: string[] = [];
  private _emittingLog = false;

  /** Returns null when the app switched telemetry off or gave no URL. */
  static create(
    options: { telemetry?: ITelemetryOptions; env?: string } = {},
    { allowSocket = true }: { allowSocket?: boolean } = {}
  ): TelemetryClient | null {
    const telemetry = TelemetryClient.resolveOptions(options.telemetry);
    if (!telemetry) return null;
    // A client that may not log in to the telemetry socket still captures.
    if (!telemetry.capture && !allowSocket) return null;
    return new TelemetryClient(telemetry, options.env);
  }

  /**
   * The telemetry settings in force (beta, owner 2026-10-06): on by default
   * in local capture mode with the console printout, so nothing is sent.
   * A `url`, or `enabled: true`, sends to the telemetry socket instead;
   * `enabled: false` switches telemetry off. null = off.
   */
  static resolveOptions(
    telemetry: ITelemetryOptions | undefined
  ): ITelemetryOptions | null {
    if (telemetry?.enabled === false) return null;
    if (telemetry?.capture || telemetry?.url || telemetry?.enabled === true) {
      return telemetry;
    }
    return { ...telemetry, capture: true };
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
    this.capture = !!options.capture;
    this._onFrame = options.onFrame ?? null;
    if (options.capture) {
      this._captureOptions =
        typeof options.capture === 'object' ? options.capture : {};
      const { download, onFlush, flushIntervalMs } = this._captureOptions;
      if (download || onFlush) {
        this._flushTimer = setInterval(
          () => this.flushCapture(),
          flushIntervalMs || DEFAULT_CAPTURE_FLUSH_MS
        );
      }
    }
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

  /** Capture mode: every frame "sent" so far, as JSON text, in send order. */
  capturedFrames(): string[] {
    return this._captured.slice();
  }

  /**
   * Capture mode, in a browser: saves the captured frames as a JSON Lines
   * file (one frame per line) through the browser's download.
   */
  downloadCapture(filename?: string): void {
    this._download(this._captured, filename);
  }

  /**
   * Capture mode: hands the frames captured since the last flush to
   * `onFlush` and, with `download`, saves them as a .jsonl file. Runs every
   * `flushIntervalMs` and when the client disconnects; can be called any time.
   */
  flushCapture(): void {
    if (!this._unflushed.length) return;
    const frames = this._unflushed;
    this._unflushed = [];
    const { download, onFlush } = this._captureOptions;
    try {
      onFlush?.(frames);
    } catch {
      // the app's callback never breaks the sender
    }
    if (download) this._download(frames);
  }

  private _download(frames: string[], filename?: string): void {
    if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
    const name =
      filename ||
      `telemetry-${this.sdkInstanceId}-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.jsonl`;
    const blob = new Blob([frames.join('\n') + '\n'], {
      type: 'application/x-ndjson',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  private _recordFrame(frame: string): void {
    this._captured.push(frame);
    if (this._captured.length > MAX_CAPTURED_FRAMES) this._captured.shift();
    if (this._captureOptions.download || this._captureOptions.onFlush) {
      this._unflushed.push(frame);
    }
    if (this._captureOptions.console !== false) this._printFrame(frame);
    try {
      this._onFrame?.(frame);
    } catch {
      // the app's callback never breaks the sender
    }
  }

  /** Straight to the console, never through the SDK logger (that would loop). */
  private _printFrame(frame: string): void {
    if (typeof console === 'undefined') return;
    const mark = this._captureOptions.consoleMark || DEFAULT_CAPTURE_MARK;
    try {
      const parsed = JSON.parse(frame);
      if (parsed.method === TELEMETRY_METHOD) {
        const event = parsed.params;
        console.log(mark, `#${event.sequence} ${event.name}`, event);
      } else {
        console.log(mark, parsed.method, parsed.params);
      }
    } catch {
      console.log(mark, frame);
    }
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

  // ── Active calls: each gets a copy of every shared event ─────────────

  callStarted(callId: string): void {
    if (!callId) return;
    this._activeCalls = this._activeCalls.filter((id) => id !== callId);
    this._activeCalls.push(callId);
    this._endedCalls = this._endedCalls.filter((id) => id !== callId);
  }

  /**
   * The call's call_ended was built (or the call is gone): it leaves the
   * active list, its call_sequence counter is dropped, and later records with
   * its ID are sent without call_id.
   */
  callEnded(callId: string): void {
    if (!callId) return;
    this._activeCalls = this._activeCalls.filter((id) => id !== callId);
    this._callSequences.delete(callId);
    if (!this._endedCalls.includes(callId)) {
      this._endedCalls.push(callId);
      if (this._endedCalls.length > MAX_ENDED_CALLS) this._endedCalls.shift();
    }
  }

  /** Active call IDs, oldest first. */
  get activeCallIds(): string[] {
    return [...this._activeCalls];
  }

  /** The last call_sequence used for a call ID (0 when none). */
  callSequence(callId: string): number {
    return this._callSequences.get(callId) ?? 0;
  }

  // ── Emitting ──────────────────────────────────────────────────────────

  emit<N extends EventName>(
    name: N,
    payload: Extract<EventBody, { name: N }>['payload'],
    options: EmitOptions = {}
  ): ClientEvent | null {
    return this.emitAll(name, payload as never, options)[0] ?? null;
  }

  /**
   * Like emit(), returning every message sent for the event: one per active
   * call for a shared event, else one. Empty when nothing was sent.
   */
  emitAll<N extends EventName>(
    name: N,
    payload: Extract<EventBody, { name: N }>['payload'],
    options: EmitOptions = {}
  ): ClientEvent[] {
    if (this._closed || !this._remoteEnabled) return [];
    const events = this._buildEvents(name, payload, options);
    if (!events.length) return [];
    if (this.ready && this._pending.length === 0) {
      for (const event of events) this._send(event, false);
    } else {
      this._enqueue(events);
      this._flushPending();
    }
    return events;
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

  /**
   * The messages of one event. An event with an explicit call ID (or
   * noActiveCall) is one message; a shared event is one message per active
   * call (same sequence and timestamp, own call_id and call_sequence), or one
   * without call_id when no call is active.
   */
  private _buildEvents(
    name: EventName,
    payload: EventBody['payload'],
    options: EmitOptions
  ): ClientEvent[] {
    const ids: KnownIds = { sdk_instance_id: this.sdkInstanceId };
    const voiceSdkId = this._host?.getVoiceSdkId();
    if (voiceSdkId) ids.voice_sdk_id = voiceSdkId;
    const sessionId = this._host?.getSessionId();
    if (sessionId) ids.session_id = sessionId;
    if (options.ids) {
      for (const [key, value] of Object.entries(options.ids)) {
        if (value) (ids as Record<string, string>)[key] = value as string;
      }
    }
    // A record of a call whose call_ended went out no longer carries its ID.
    if (ids.call_id && this._endedCalls.includes(ids.call_id)) {
      delete ids.call_id;
    }

    let callIds: (string | undefined)[];
    if (ids.call_id) callIds = [ids.call_id];
    else if (options.ids?.call_id || options.noActiveCall)
      callIds = [undefined];
    else
      callIds = this._activeCalls.length ? [...this._activeCalls] : [undefined];

    if (
      name === 'call_metrics' &&
      (!(this._host?.getSocketGeneration() > 0) ||
        !ids.voice_sdk_id ||
        !ids.session_id ||
        !ids.call_id)
    ) {
      // The backend dead-letters these (contract 1.5); don't spend a sequence on it.
      return [];
    }

    const sequence = options.sequence ?? this.reserveSequence();
    const timestamp = iso(options.timestamp ?? Date.now());
    const generation = this._host?.getSocketGeneration() ?? 0;
    return callIds.map((callId) => {
      const event = {
        schema_version: SCHEMA_VERSION,
        sequence,
        timestamp,
        client: this.client,
        ids: callId ? { ...ids, call_id: callId } : ids,
        name,
        payload,
      } as ClientEvent;
      if (callId) {
        const callSequence = (this._callSequences.get(callId) ?? 0) + 1;
        this._callSequences.set(callId, callSequence);
        event.call_sequence = callSequence;
      }
      if (generation > 0) event.socket_generation = generation;
      return event;
    });
  }

  /**
   * Adds the copies of one event to the pending queue, in sequence order
   * (a reserved sequence may arrive after newer ones). Copies share a sequence:
   * they stay together, in the order built. Above max_pending_events messages,
   * the oldest event is dropped with all its copies.
   */
  private _enqueue(events: ClientEvent[]): void {
    if (!events.length) return;
    const sequence = events[0].sequence;
    let index = this._pending.length;
    while (index > 0 && this._pending[index - 1].event.sequence > sequence) {
      index -= 1;
    }
    this._pending.splice(index, 0, ...events.map((event) => ({ event })));
    while (this._pending.length > this.maxPendingEvents) {
      const oldest = this._pending[0].event.sequence;
      while (
        this._pending.length &&
        this._pending[0].event.sequence === oldest
      ) {
        this._pending.shift();
        this._droppedPending += 1;
      }
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
    if (this._closed || (!WebSocketImpl && !this.capture)) return;
    if (this._ws && (this._ws.readyState === 0 || this._ws.readyState === 1)) {
      return;
    }
    const params = this._loginParams();
    if (!params || fingerprint(params) === this._rejectedFingerprint) return;
    const url = this.capture
      ? 'capture:'
      : this.url || this._host.getDefaultUrl?.();
    if (!url) return;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    let ws: WebSocket;
    try {
      ws = this.capture
        ? (new CaptureSocket((frame) =>
            this._recordFrame(frame)
          ) as unknown as WebSocket)
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

  /** Capture mode logs in to nothing: it needs no credentials (e.g. anonymous logins). */
  private _loginParams(): Record<string, unknown> | null {
    const params = this._host?.getLoginParams() ?? null;
    return params ?? (this.capture ? {} : null);
  }

  private _login(ws: WebSocket): void {
    const params = this._loginParams();
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
    if (this._flushTimer) clearInterval(this._flushTimer);
    this._flushTimer = null;
    this.flushCapture();
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
