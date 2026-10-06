/**
 * Client-side sanitizing for Call Report V2 telemetry.
 * Owner, 2026-10-06: every log goes out whole, with all its objects and data,
 * never cut. Only credentials are taken out: passwords, tokens, the ICE
 * password, TURN credentials. The Telemetry Backend handles personal data.
 */
import type { CodedErrorInfo, ErrorInfo, IceServerInfo } from './contract';

/** Keys whose values are credentials, at any depth. */
const SECRET_KEYS = new Set([
  'password',
  'passwd',
  'credential',
  'secret',
  'token',
  'login_token',
  'telemetry_token',
  'access_token',
  'jwt',
  'authorization',
  'ice_pwd',
]);

/** Deep enough for any SDK object; guards against runaway host-object graphs. */
const MAX_DEPTH = 32;

const normalizeKey = (key: string) => key.toLowerCase().replace(/-/g, '_');

/** Credentials inside text: SDP ice-pwd lines, JWTs, bearer tokens, URL passwords, JSON secret fields. */
export function scrubText(text: string): string {
  return text
    .replace(/a=ice-pwd:[^\r\n"]*/g, 'a=ice-pwd:[REDACTED]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]')
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [REDACTED]')
    .replace(/(\w+:\/\/)[^/@\s]+:[^/@\s]+@/g, '$1')
    .replace(
      /("(?:passwd|password|login_token|telemetry_token|access_token|credential)"\s*:\s*)"[^"]*"/gi,
      '$1"[REDACTED]"'
    );
}

const isPlainObject = (value: object) => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/** A track's own data (its getters are invisible to Object.entries). */
function describeTrack(track: MediaStreamTrack): Record<string, unknown> {
  const info: Record<string, unknown> = {
    kind: track.kind,
    id: track.id,
    label: track.label,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
  };
  try {
    info.settings = track.getSettings?.();
  } catch {
    // not every browser has it
  }
  return info;
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
  if (type === 'bigint') return String(value);
  if (type === 'symbol') return String(value);
  if (type === 'function') {
    return `[function ${(value as { name?: string }).name || 'anonymous'}]`;
  }
  const object = value as object;
  if (seen.has(object)) return '[circular]';
  if (object instanceof Error) {
    // The error's fields plus everything else it carries (originalError,
    // causes, constraint...), whole.
    seen.add(object);
    try {
      const extra: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(object)) {
        extra[key] = SECRET_KEYS.has(normalizeKey(key))
          ? redacted(item)
          : sanitizeValue(item, depth + 1, seen);
      }
      return { ...extra, ...toErrorInfo(object) };
    } finally {
      seen.delete(object);
    }
  }
  if (depth >= MAX_DEPTH) return '[too deep]';
  seen.add(object);
  try {
    if (typeof Node !== 'undefined' && object instanceof Node) {
      const element = object as Element;
      return `[${(element.nodeName || 'node').toLowerCase()}${
        element.id ? `#${element.id}` : ''
      }]`;
    }
    if (
      typeof MediaStreamTrack !== 'undefined' &&
      object instanceof MediaStreamTrack
    ) {
      return describeTrack(object);
    }
    if (typeof MediaStream !== 'undefined' && object instanceof MediaStream) {
      return {
        id: object.id,
        active: object.active,
        tracks: object.getTracks().map(describeTrack),
      };
    }
    if (Array.isArray(object)) {
      return object.map((item) => sanitizeValue(item, depth + 1, seen));
    }
    if (object instanceof Map) {
      return sanitizeValue(Object.fromEntries(object), depth + 1, seen);
    }
    if (object instanceof Set) {
      return sanitizeValue(Array.from(object), depth + 1, seen);
    }
    if (!isPlainObject(object)) {
      // Host objects (RTCIceCandidate, RTCSessionDescription, DOM events...)
      // keep their data in getters: their own JSON form, else every
      // enumerable property, inherited ones included.
      const toJSON = (object as { toJSON?: () => unknown }).toJSON;
      if (typeof toJSON === 'function') {
        try {
          return sanitizeValue(toJSON.call(object), depth + 1, seen);
        } catch {
          // fall through to the properties
        }
      }
      const result: Record<string, unknown> = {};
      for (const key in object) {
        let item: unknown;
        try {
          item = (object as Record<string, unknown>)[key];
        } catch {
          continue;
        }
        if (typeof item === 'function') continue;
        result[key] = SECRET_KEYS.has(normalizeKey(key))
          ? redacted(item)
          : sanitizeValue(item, depth + 1, seen);
      }
      return result;
    }
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(object)) {
      result[key] = SECRET_KEYS.has(normalizeKey(key))
        ? redacted(item)
        : sanitizeValue(item, depth + 1, seen);
    }
    return result;
  } finally {
    seen.delete(object);
  }
}

/** An empty credential field stays empty; a filled one becomes "[REDACTED]". */
const redacted = (item: unknown) =>
  item === null || item === undefined || item === '' ? item : '[REDACTED]';

/** Plain JSON, whole: nothing cut, only credentials taken out. */
export function sanitizeDetails(
  details: unknown
): Record<string, unknown> | undefined {
  if (details === null || details === undefined) return undefined;
  let clean = sanitizeValue(details, 0, new WeakSet());
  if (!clean || typeof clean !== 'object' || Array.isArray(clean)) {
    clean = { value: clean };
  }
  return clean as Record<string, unknown>;
}

export function sanitizeMessage(message: string): string {
  return scrubText(message);
}

/**
 * Copies an error's own fields: JSON.stringify(new Error()) gives "{}".
 * Understands the SDK's ITelnyxError (numeric code, originalError) and a
 * JSON-RPC error object ({ code, message }) from the server.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toErrorInfo(error: any, code?: string | number): ErrorInfo {
  if (error === null || error === undefined) {
    return {
      name: 'Error',
      message: '',
      ...(code ? { code: String(code) } : {}),
    };
  }
  if (typeof error !== 'object') {
    return {
      name: 'Error',
      message: sanitizeMessage(String(error)),
      ...(code ? { code: String(code) } : {}),
    };
  }
  const info: ErrorInfo = {
    // A plain object has no useful constructor name ("Object"): a server's
    // JSON-RPC error (negative code) is a ServerError, anything else an Error.
    name: String(
      error.name ||
        (error.constructor && error.constructor !== Object
          ? error.constructor.name
          : typeof error.code === 'number' && error.code < 0
            ? 'ServerError'
            : 'Error')
    ),
    message: sanitizeMessage(String(error.message ?? error.description ?? '')),
  };
  // The SDK's own codes are 400xx-490xx; a DOMException's legacy code is not one.
  const sdkCode =
    code ??
    (typeof error.code === 'number' && error.code >= 40000 && error.code < 50000
      ? error.code
      : undefined);
  if (sdkCode !== undefined) info.code = String(sdkCode);

  // The server's own answer: a JSON-RPC error (negative code), either the
  // error itself or the one the SDK wrapped.
  const isServerError = (value: unknown): value is { code: number } =>
    !!value &&
    typeof value === 'object' &&
    typeof (value as { code?: unknown }).code === 'number' &&
    (value as { code: number }).code < 0;
  const original = error.originalError ?? error.error;
  const server = isServerError(original)
    ? original
    : isServerError(error)
      ? error
      : undefined;
  if (server) {
    info.server_code = String(server.code);
    const serverMessage = (server as { message?: unknown }).message;
    if (serverMessage)
      info.server_message = sanitizeMessage(String(serverMessage));
  }
  const stack =
    typeof error.stack === 'string' ? scrubText(error.stack) : undefined;
  if (stack) info.stack = stack;
  return info;
}

export function toCodedErrorInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any,
  fallbackCode: string | number
): CodedErrorInfo {
  const info = toErrorInfo(error);
  return { ...info, code: info.code ?? String(fallbackCode) };
}

/** ICE servers keep their URLs plus has_credential; usernames and passwords go. */
export function toIceServerInfo(servers: RTCIceServer[] = []): IceServerInfo[] {
  const result: IceServerInfo[] = [];
  for (const server of servers || []) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    for (const url of urls) {
      if (!url) continue;
      result.push({
        url: String(url).replace(/(\w+:\/\/)[^/@\s]+:[^/@\s]+@/g, '$1'),
        has_credential: !!server.credential,
      });
    }
  }
  return result;
}

/** Device labels lose the trailing USB "(vid:pid)" suffix. */
export function stripDeviceLabel(label?: string): string {
  return (label || '').replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '');
}
