/**
 * Everything goes out whole (owner, 2026-10-06); only credentials are taken
 * out: passwords, tokens, the ICE password, TURN credentials. Keepalive
 * frames and the "Ping received" line are never recorded. Plus the small
 * helpers every module uses.
 */
import type { CodedErrorInfo, ErrorInfo, IceServerInfo } from './contract';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;
export type Flat = Record<string, unknown>;

/** "a b c" -> ['a', 'b', 'c']. */
export const words = (text: string): string[] => text.trim().split(/\s+/);

/** A whitespace table, one row per line. */
export const table = (text: string): string[][] =>
  text.trim().split('\n').map(words);

export const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
export const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;
export const bool = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
export const round = (value: number, decimals = 0): number =>
  Math.round(value * 10 ** decimals) / 10 ** decimals;

/** Runs a reader; undefined when it throws. */
export function attempt<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/** `source` without its undefined values. */
export function defined<T extends object>(source: T): Partial<T> {
  const result: Flat = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) result[key] = value;
  }
  return result as Partial<T>;
}

/** Makes every public method of `object` swallow its errors: telemetry never throws into the SDK. */
export function guard<T extends object>(object: T): T {
  const proto = Object.getPrototypeOf(object);
  for (const name of Object.getOwnPropertyNames(proto)) {
    const method = Object.getOwnPropertyDescriptor(proto, name)?.value;
    if (
      name === 'constructor' ||
      name[0] === '_' ||
      typeof method !== 'function'
    ) {
      continue;
    }
    Object.defineProperty(object, name, {
      configurable: true,
      writable: true,
      value: (...args: unknown[]) => attempt(() => method.apply(object, args)),
    });
  }
  return object;
}

const SECRET_KEYS = words(`password passwd credential secret token login_token
  telemetry_token access_token jwt authorization ice_pwd`);
const SECRET_FRAME_KEYS = words('passwd password login_token telemetry_token');
const MAX_DEPTH = 32;
const REDACTED = '[REDACTED]';
const URL_CREDENTIALS = /(\w+:\/\/)[^/@\s]+:[^/@\s]+@/g;

/** Credentials inside text: ice-pwd lines, JWTs, bearer tokens, URL passwords, JSON secret fields. */
export const scrubText = (text: string): string =>
  text
    .replace(/a=ice-pwd:[^\r\n"]*/g, 'a=ice-pwd:[REDACTED]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, REDACTED)
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [REDACTED]')
    .replace(URL_CREDENTIALS, '$1')
    .replace(
      /("(?:passwd|password|login_token|telemetry_token|access_token|credential)"\s*:\s*)"[^"]*"/gi,
      '$1"[REDACTED]"'
    );

/** An empty credential stays empty; a filled one becomes "[REDACTED]". */
const redacted = (item: unknown) =>
  item === null || item === undefined || item === '' ? item : REDACTED;

export const describeNode = (element: Element): string =>
  `[${(element.nodeName || 'node').toLowerCase()}${element.id ? `#${element.id}` : ''}]`;

function describeTrack(track: MediaStreamTrack): Flat {
  const { kind, id, label, enabled, muted, readyState } = track;
  const settings = attempt(() => track.getSettings?.());
  return {
    kind,
    id,
    label,
    enabled,
    muted,
    readyState,
    ...defined({ settings }),
  };
}

function cleanEntries(
  entries: Iterable<[string, unknown]>,
  depth: number,
  seen: WeakSet<object>
): Flat {
  const result: Flat = {};
  for (const [key, item] of entries) {
    result[key] = SECRET_KEYS.includes(key.toLowerCase().replace(/-/g, '_'))
      ? redacted(item)
      : sanitizeValue(item, depth + 1, seen);
  }
  return result;
}

/** A host object's enumerable properties, inherited ones included (RTCIceCandidate, events...). */
function hostEntries(object: object): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  for (const key in object) {
    const item = attempt(() => (object as Flat)[key]);
    if (typeof item !== 'function') entries.push([key, item]);
  }
  return entries;
}

function sanitizeValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>
): unknown {
  if (value === null || value === undefined) return value;
  const type = typeof value;
  if (type === 'string') return scrubText(value as string);
  if (type === 'number' || type === 'boolean') return value;
  if (type === 'bigint' || type === 'symbol') return String(value);
  if (type === 'function') {
    return `[function ${(value as { name?: string }).name || 'anonymous'}]`;
  }
  const object = value as object;
  if (seen.has(object)) return '[circular]';
  const isError = object instanceof Error;
  if (!isError && depth >= MAX_DEPTH) return '[too deep]';
  seen.add(object);
  try {
    if (isError) {
      // Every field it carries (originalError, constraint...) plus its own.
      return {
        ...cleanEntries(Object.entries(object), depth, seen),
        ...toErrorInfo(object),
      };
    }
    if (typeof Node !== 'undefined' && object instanceof Node) {
      return describeNode(object as Element);
    }
    if (
      typeof MediaStreamTrack !== 'undefined' &&
      object instanceof MediaStreamTrack
    ) {
      return describeTrack(object);
    }
    if (typeof MediaStream !== 'undefined' && object instanceof MediaStream) {
      const { id, active } = object;
      return { id, active, tracks: object.getTracks().map(describeTrack) };
    }
    if (Array.isArray(object)) {
      return object.map((item) => sanitizeValue(item, depth + 1, seen));
    }
    if (object instanceof Map || object instanceof Set) {
      const plain =
        object instanceof Map ? Object.fromEntries(object) : Array.from(object);
      return sanitizeValue(plain, depth + 1, seen);
    }
    const proto = Object.getPrototypeOf(object);
    if (proto === Object.prototype || proto === null) {
      return cleanEntries(Object.entries(object), depth, seen);
    }
    // A host object: its own JSON form, else every enumerable property.
    const toJSON = (object as { toJSON?: () => unknown }).toJSON;
    if (typeof toJSON === 'function') {
      try {
        return sanitizeValue(toJSON.call(object), depth + 1, seen);
      } catch {
        // fall through to the properties
      }
    }
    return cleanEntries(hostEntries(object), depth, seen);
  } finally {
    seen.delete(object);
  }
}

/** Plain JSON, whole: nothing cut, only credentials taken out. */
export function sanitizeDetails(details: unknown): Flat | undefined {
  if (details === null || details === undefined) return undefined;
  const clean = sanitizeValue(details, 0, new WeakSet());
  return clean && typeof clean === 'object' && !Array.isArray(clean)
    ? (clean as Flat)
    : { value: clean };
}

/** sanitizeDetails, but nothing for a missing or empty object. */
export function cleanObject(value: unknown): Flat | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const clean = attempt(() => sanitizeDetails(value));
  return clean && Object.keys(clean).length ? clean : undefined;
}

const isServerError = (
  value: Any
): value is { code: number; message?: unknown } =>
  !!value &&
  typeof value === 'object' &&
  typeof value.code === 'number' &&
  value.code < 0;

/**
 * An error's fields (JSON.stringify(new Error()) gives "{}"). Knows the SDK's
 * errors (code 400xx-490xx, originalError) and JSON-RPC errors ({ code, message }).
 */
export function toErrorInfo(error: Any, code?: string | number): ErrorInfo {
  if (error === null || error === undefined || typeof error !== 'object') {
    return {
      name: 'Error',
      message: error == null ? '' : scrubText(String(error)),
      ...(code ? { code: String(code) } : {}),
    };
  }
  const info: ErrorInfo = {
    name: String(
      error.name ||
        (error.constructor && error.constructor !== Object
          ? error.constructor.name
          : isServerError(error)
            ? 'ServerError'
            : 'Error')
    ),
    message: scrubText(String(error.message ?? error.description ?? '')),
  };
  // A DOMException's legacy code is not an SDK code.
  const sdkCode =
    code ??
    (typeof error.code === 'number' && error.code >= 40000 && error.code < 50000
      ? error.code
      : undefined);
  if (sdkCode !== undefined) info.code = String(sdkCode);
  const original = error.originalError ?? error.error;
  const server = isServerError(original)
    ? original
    : isServerError(error)
      ? error
      : null;
  if (server) {
    info.server_code = String(server.code);
    if (server.message) info.server_message = scrubText(String(server.message));
  }
  if (typeof error.stack === 'string' && error.stack) {
    info.stack = scrubText(error.stack);
  }
  return info;
}

export function toCodedErrorInfo(
  error: unknown,
  fallbackCode: string | number
): CodedErrorInfo {
  const info = toErrorInfo(error);
  return { ...info, code: info.code ?? String(fallbackCode) };
}

/** URLs plus has_credential; usernames and passwords go. */
export function toIceServerInfo(servers: RTCIceServer[] = []): IceServerInfo[] {
  return (servers || []).flatMap((server) =>
    (Array.isArray(server.urls) ? server.urls : [server.urls])
      .filter(Boolean)
      .map((url) => ({
        url: String(url).replace(URL_CREDENTIALS, '$1'),
        has_credential: !!server.credential,
      }))
  );
}

/** Device labels lose the trailing USB "(vid:pid)" suffix. */
export const stripDeviceLabel = (label?: string): string =>
  (label || '').replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '');

// ── Signaling frames ──────────────────────────────────────────────────────

export const GATEWAY_STATE_METHOD = 'telnyx_rtc.gatewayState';
/** The one keepalive log line (BaseSession.setPingReceived). */
export const PING_RECEIVED_LOG = 'Ping received';

export const isFilteredFrameMethod = (method: string | undefined): boolean =>
  method === 'telnyx_rtc.ping' || method === 'debug_report_data';

/** JSON-RPC method, a debug-report frame's type, or the method a Result acknowledges. */
export const frameMethod = (frame: Any): string =>
  [frame?.method, frame?.type, frame?.result?.method].find(
    (value) => typeof value === 'string'
  ) ?? '';

export const frameCallId = (frame: Any): string | undefined =>
  str(
    frame?.params?.callID ??
      frame?.params?.dialogParams?.callID ??
      frame?.result?.callID ??
      frame?.call_id
  );

export const rpcIdString = (id: unknown): string =>
  id === undefined || id === null ? '' : String(id);

/** The frame as it is, minus login secrets and SDP a=ice-pwd: lines. */
export function rawFrame(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return value.includes('a=ice-pwd:')
      ? value.replace(/a=ice-pwd:[^\r\n]*(\r?\n)?/g, '')
      : value;
  }
  if (!value || typeof value !== 'object' || depth > 12) return value;
  if (Array.isArray(value)) return value.map((v) => rawFrame(v, depth + 1));
  const result: Flat = {};
  for (const [key, item] of Object.entries(value as Flat)) {
    result[key] = SECRET_FRAME_KEYS.includes(key.toLowerCase())
      ? redacted(item)
      : rawFrame(item, depth + 1);
  }
  return result;
}

/** Every SDK log line goes out except keepalive: "Ping received" and SEND:/RECV: dumps of filtered frames. */
export function isFilteredLogLine(
  message: string,
  frameDump?: unknown
): boolean {
  if (message === PING_RECEIVED_LOG) return true;
  if (!/^(SEND|RECV):/.test(message) || typeof frameDump !== 'string') {
    return false;
  }
  const frame = attempt(() => JSON.parse(frameDump));
  return isFilteredFrameMethod(
    frame?.method ?? frame?.type ?? frame?.result?.method
  );
}
