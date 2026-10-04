/**
 * The SDK logger's telemetry sink: every SDK log line becomes one `logs` event
 * on every live telemetry client (contract 1.7, 1.8).
 */
import type { LogCategory, LogEntry } from './contract';
import { isFilteredLogLine } from './filter';
import TelemetryClient from './TelemetryClient';

const LEVELS: Record<string, LogEntry['level']> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

const ICE_RE =
  /\bICE\b|candidate|ice(Connection|Gathering)State|gathering|\bSTUN\b|\bTURN\b/i;
const MEDIA_RE =
  /getUserMedia|\btrack\b|tracks|\bmute|unmute|device|microphone|speaker|\bcamera|RTCPeer|PeerConnection|\bSDP\b|localDescription|remoteDescription|\bstream\b|\bmedia\b|audio/i;
const CONNECTION_RE =
  /socket|connect|login|logged|gateway|REGED|session|token|telnyx_rtc|voice_sdk_id|region|\bping\b|keepalive|network/i;
const CALL_RE =
  /\bcall\b|calls\b|callId|hangup|hang up|invite|answer|\bbye\b|attach|ringing|ringback|ringtone|\bhold\b|unhold|dtmf|recover/i;

/**
 * A small prefix/keyword heuristic for lines whose call site does not set a
 * category. The backend re-derives categories for SDKs that do not send one,
 * so a rough guess is acceptable.
 */
export function categorizeLog(
  level: LogEntry['level'],
  message: string
): LogCategory {
  if (message.startsWith('ICE candidate error')) return 'ice_candidate_error';
  if (level === 'error') return 'error';
  if (level === 'warn') return 'warning';
  if (ICE_RE.test(message)) return 'ice';
  if (CALL_RE.test(message) && !/socket|websocket/i.test(message)) {
    return MEDIA_RE.test(message) ? 'media' : 'call';
  }
  if (MEDIA_RE.test(message)) return 'media';
  if (CONNECTION_RE.test(message)) return 'connection';
  return 'general';
}

const toMessage = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

/**
 * "ICE candidate error:" lines carry the whole DOM event; keep its five
 * fields (contract 1.7) instead of the event object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iceCandidateErrorDetails = (event: any): Record<string, unknown> => {
  if (!event || typeof event !== 'object') return undefined;
  const details: Record<string, unknown> = {};
  if (event.errorCode !== undefined) details.error_code = event.errorCode;
  if (event.errorText !== undefined) details.error_text = event.errorText;
  if (event.url !== undefined) details.url = event.url;
  if (event.address !== undefined) details.address = event.address;
  if (event.port !== undefined) details.port = event.port;
  return details;
};

/** Called by the SDK logger for every line. Never throws. */
export function forwardSdkLog(methodName: string, logArgs: unknown[]): void {
  try {
    if (TelemetryClient.liveInstanceIds().length === 0) return;
    const level = LEVELS[methodName];
    if (!level || logArgs.length === 0) return;
    const [first, ...rest] = logArgs;
    const message = toMessage(first);
    if (isFilteredLogLine(message)) return;
    const category = categorizeLog(level, message);
    let details: unknown;
    if (category === 'ice_candidate_error') {
      details = iceCandidateErrorDetails(rest[0]);
    } else if (rest.length === 1) {
      details = rest[0];
    } else if (rest.length > 1) {
      details = { args: rest };
    }
    // TelemetryClient.log sanitizes details (no whole objects, no secrets).
    TelemetryClient.forwardLog(level, category, message, details);
  } catch {
    // Telemetry must never break logging.
  }
}
