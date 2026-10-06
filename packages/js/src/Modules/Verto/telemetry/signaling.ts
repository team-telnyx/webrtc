/**
 * Helpers for `signaling_message`: the frame itself, resent as it is with its
 * secrets taken out (rawFrame, owner 2026-10-06), and what the SDK needs to
 * leave out keepalive frames and put the call's ID on a frame.
 */
export const GATEWAY_STATE_METHOD = 'telnyx_rtc.gatewayState';

/**
 * The method of a frame the SDK sends: JSON-RPC `method`, or the `type` of a
 * debug-report frame, or the request method a Result acknowledges.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frameMethod(frame: any): string {
  if (!frame || typeof frame !== 'object') return '';
  if (typeof frame.method === 'string') return frame.method;
  if (typeof frame.type === 'string') return frame.type;
  if (frame.result && typeof frame.result.method === 'string') {
    return frame.result.method;
  }
  return '';
}

/** The verto callID a frame is about, if any. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frameCallId(frame: any): string | undefined {
  const id =
    frame?.params?.callID ??
    frame?.params?.dialogParams?.callID ??
    frame?.result?.callID ??
    frame?.call_id;
  return typeof id === 'string' && id ? id : undefined;
}

export function rpcIdString(id: unknown): string {
  return id === undefined || id === null ? '' : String(id);
}

/** Keys whose values never leave the SDK, at any depth of a frame. */
const SECRET_FRAME_KEYS = new Set([
  'passwd',
  'password',
  'login_token',
  'telemetry_token',
]);

/**
 * The JSON-RPC frame as sent or received (owner, 2026-10-06), minus its
 * secrets: login passwords and tokens become "[REDACTED]", and SDP keeps
 * everything but its a=ice-pwd: lines (the media session's password).
 * Customer values (numbers, userVariables, header values) stay: the
 * Telemetry Backend's sanitizer handles them (contract 1.8).
 */
export function rawFrame(frame: unknown): unknown {
  return clean(frame, 0);
}

function clean(value: unknown, depth: number): unknown {
  if (typeof value === 'string') {
    return value.includes('a=ice-pwd:')
      ? value.replace(/a=ice-pwd:[^\r\n]*(\r?\n)?/g, '')
      : value;
  }
  if (!value || typeof value !== 'object' || depth > 12) return value;
  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    // An empty secret field (e.g. no login_token on a SIP login) stays empty.
    result[key] =
      SECRET_FRAME_KEYS.has(key.toLowerCase()) && item != null && item !== ''
        ? '[REDACTED]'
        : clean(item, depth + 1);
  }
  return result;
}
