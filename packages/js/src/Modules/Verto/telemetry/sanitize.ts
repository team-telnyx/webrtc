/**
 * Client-side sanitizing for Call Report V2 telemetry (contract 1.8).
 * The Telemetry Backend is the authority; this only keeps obvious secrets,
 * SDP and whole host objects off the wire.
 */
import type { CodedErrorInfo, ErrorInfo, IceServerInfo } from './contract';

const SECRET_KEYS = new Set([
  'password',
  'passwd',
  'credential',
  'secret',
  'token',
  'login_token',
  'access_token',
  'jwt',
  'authorization',
  'ice_pwd',
  'ice_ufrag',
  'ufrag',
  'fingerprint',
  'sdp',
  'username',
]);

/** Customer values: only their key names are kept. */
const NAMES_ONLY_KEYS = new Set(['uservariables', 'dialogparams']);

const MAX_DEPTH = 4;
const MAX_DETAILS_BYTES = 4096;
const MAX_MESSAGE_BYTES = 2048;
const MAX_STACK_FRAMES = 20;
const MAX_STACK_BYTES = 4096;

const normalizeKey = (key: string) => key.toLowerCase().replace(/-/g, '_');

export function truncate(value: string, maxBytes: number): string {
  if (value.length <= maxBytes) return value;
  return `${value.slice(0, maxBytes - 3)}...`;
}

export function scrubText(text: string): string {
  return text
    .replace(/v=0\r?\n[\s\S]*?(?=("|$))/g, (sdp) => {
      return `[SDP removed, ${sdp.length} bytes]`;
    })
    .replace(/a=(ice-pwd|ice-ufrag|fingerprint):[^\r\n"]*/g, '')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]')
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [REDACTED]')
    .replace(/(\w+:\/\/)[^/@\s]+:[^/@\s]+@/g, '$1');
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  const type = typeof value;
  if (type === 'string') return scrubText(value as string);
  if (type === 'number' || type === 'boolean') return value;
  if (type === 'bigint') return String(value);
  if (type === 'function' || type === 'symbol') return undefined;
  if (value instanceof Error) return toErrorInfo(value);
  if (typeof Event !== 'undefined' && value instanceof Event) {
    return { type: value.type };
  }
  if (typeof Node !== 'undefined' && value instanceof Node) {
    return '[DOM node]';
  }
  if (typeof MediaStream !== 'undefined' && value instanceof MediaStream) {
    return '[MediaStream]';
  }
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }
  if (type === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as object)) {
      const normalized = normalizeKey(key);
      if (SECRET_KEYS.has(normalized)) {
        result[key] = '[REDACTED]';
      } else if (NAMES_ONLY_KEYS.has(normalized.replace(/_/g, ''))) {
        result[key] =
          item && typeof item === 'object' ? Object.keys(item as object) : [];
      } else {
        const clean = sanitizeValue(item, depth + 1);
        if (clean !== undefined) result[key] = clean;
      }
    }
    return result;
  }
  return String(value);
}

/** Plain JSON, at most 4 levels deep and 4 KB serialized, secrets removed. */
export function sanitizeDetails(
  details: unknown
): Record<string, unknown> | undefined {
  if (details === null || details === undefined) return undefined;
  let clean = sanitizeValue(details, 0);
  if (!clean || typeof clean !== 'object' || Array.isArray(clean)) {
    clean = { value: clean };
  }
  let json: string;
  try {
    json = JSON.stringify(clean);
  } catch {
    return { value: '[unserializable]' };
  }
  if (json.length > MAX_DETAILS_BYTES) {
    return { truncated: truncate(json, MAX_DETAILS_BYTES) };
  }
  return clean as Record<string, unknown>;
}

export function sanitizeMessage(message: string): string {
  return truncate(scrubText(message), MAX_MESSAGE_BYTES);
}

function capStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  const frames = stack
    .split('\n')
    .slice(0, MAX_STACK_FRAMES + 1)
    .join('\n');
  return truncate(frames, MAX_STACK_BYTES);
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
    name: String(error.name || error.constructor?.name || 'Error'),
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
  const stack = capStack(
    typeof error.stack === 'string' ? scrubText(error.stack) : undefined
  );
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
