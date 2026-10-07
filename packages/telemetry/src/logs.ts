/** The SDK logger's sink: every SDK log line becomes one `logs` event on every live client (contract 1.7). */
import type { LogCategory, LogEntry } from './contract';
import { isFilteredLogLine } from './sanitize';
import TelemetryClient from './sender';

const LEVELS = ['trace', 'debug', 'info', 'warn', 'error'];
const ICE_RE =
  /\bICE\b|candidate|ice(Connection|Gathering)State|gathering|\bSTUN\b|\bTURN\b/i;
const MEDIA_RE =
  /getUserMedia|\btrack\b|tracks|\bmute|unmute|device|microphone|speaker|\bcamera|RTCPeer|PeerConnection|\bSDP\b|localDescription|remoteDescription|\bstream\b|\bmedia\b|audio/i;
const CONNECTION_RE =
  /socket|connect|login|logged|gateway|REGED|session|token|telnyx_rtc|voice_sdk_id|region|\bping\b|keepalive|network/i;
const CALL_RE =
  /\bcall\b|calls\b|callId|hangup|hang up|invite|answer|\bbye\b|attach|ringing|ringback|ringtone|\bhold\b|unhold|dtmf|recover/i;

/** A rough keyword guess; the backend re-derives categories anyway. */
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
  return CONNECTION_RE.test(message) ? 'connection' : 'general';
}

function toMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Called by the SDK logger for every line, whole (only credentials removed). Never throws. */
export function forwardSdkLog(methodName: string, logArgs: unknown[]): void {
  try {
    if (!TelemetryClient.liveInstanceIds().length) return;
    if (!LEVELS.includes(methodName) || !logArgs.length) return;
    const level = methodName as LogEntry['level'];
    const [first, ...rest] = logArgs;
    const message = toMessage(first);
    if (isFilteredLogLine(message, rest[0])) return;
    const category = categorizeLog(level, message);
    // "RTCPeer Candidate:" and the like: the candidate's own line goes into the message.
    const only =
      rest.length === 1 ? (rest[0] as Record<string, unknown>) : null;
    if (
      only &&
      typeof only === 'object' &&
      typeof only.candidate === 'string' &&
      only.candidate
    ) {
      const details: Record<string, unknown> = {};
      if (typeof only.sdpMid === 'string') details.sdpMid = only.sdpMid;
      if (typeof only.sdpMLineIndex === 'number') {
        details.sdpMLineIndex = only.sdpMLineIndex;
      }
      TelemetryClient.forwardLog(
        level,
        category,
        `${message} ${only.candidate}`,
        Object.keys(details).length ? details : undefined
      );
      return;
    }
    const details = rest.length > 1 ? { args: rest } : rest[0];
    TelemetryClient.forwardLog(level, category, message, details);
  } catch {
    // Telemetry never breaks logging.
  }
}
