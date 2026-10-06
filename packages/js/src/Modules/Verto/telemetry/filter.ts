/**
 * Call Report V2 noise filter (contract 1.7).
 *
 * Two kinds of traffic are never recorded: keepalive (telnyx_rtc.ping frames,
 * their responses and the SDK's own "Ping received" line) and debug-report
 * data frames (and their responses). Filtered records never reach the
 * telemetry sender, so they take no sequence number.
 *
 * The filter matches the frame's method and one exact log message, never log
 * text in general.
 */

/** The one log line written by BaseSession.setPingReceived(). Matched exactly. */
export const PING_RECEIVED_LOG = 'Ping received';

/** Frame methods (or debug-report `type`s) that are not recorded. */
const FILTERED_FRAME_METHODS = new Set<string>([
  'telnyx_rtc.ping',
  'debug_report_data',
]);

export function isFilteredFrameMethod(method: string | undefined): boolean {
  return !!method && FILTERED_FRAME_METHODS.has(method);
}

/**
 * Every SDK log line goes out (owner, 2026-10-06), except keepalive: the
 * "Ping received" line, and SEND:/RECV: dumps of a keepalive or debug-report
 * frame (frameDump is the dumped frame's JSON text).
 */
export function isFilteredLogLine(
  message: string,
  frameDump?: unknown
): boolean {
  if (message === PING_RECEIVED_LOG) return true;
  if (!/^(SEND|RECV):/.test(message) || typeof frameDump !== 'string') {
    return false;
  }
  try {
    const frame = JSON.parse(frameDump);
    const method =
      frame?.method ?? frame?.type ?? frame?.result?.method ?? undefined;
    return isFilteredFrameMethod(method);
  } catch {
    return false;
  }
}
