/**
 * Helpers for `signaling_message` (contract 1.4, 1.7): the method, IDs, sizes,
 * the short result message, and the frame itself (`raw`, owner 2026-10-06)
 * with its secrets taken out (rawFrame).
 */
import type { SignalingCategory } from './contract';

/** Call frames; everything else (login, gateway, subscribe...) is "connection". */
const CALL_METHODS = new Set<string>([
  'telnyx_rtc.invite',
  'telnyx_rtc.answer',
  'telnyx_rtc.attach',
  'telnyx_rtc.bye',
  'telnyx_rtc.modify',
  'telnyx_rtc.candidate',
  'telnyx_rtc.endOfCandidates',
  'telnyx_rtc.media',
  'telnyx_rtc.ringing',
  'telnyx_rtc.info',
  'telnyx_rtc.display',
  'debug_report_start',
  'debug_report_stop',
]);

export const GATEWAY_STATE_METHOD = 'telnyx_rtc.gatewayState';

const MAX_RESULT_MESSAGE = 100;

export function signalingCategory(method: string): SignalingCategory {
  return CALL_METHODS.has(method) ? 'call' : 'connection';
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resultMessage(frame: any): string | undefined {
  const message = frame?.result?.message;
  if (typeof message !== 'string' || !message) return undefined;
  return message.length > MAX_RESULT_MESSAGE
    ? message.slice(0, MAX_RESULT_MESSAGE)
    : message;
}

export function rpcIdString(id: unknown): string {
  return id === undefined || id === null ? '' : String(id);
}

/** UTF-8 byte length of a frame, without allocating a buffer. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code < 0xdc00) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
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
