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
 * Log lines that are not sent as `logs`:
 * - the keepalive line (exact match on its one call site's message),
 * - the SEND:/RECV: frame dumps (they are `signaling_message` events),
 * - the [CallTimings] table (it is the `call_timings` event).
 */
export function isFilteredLogLine(message: string): boolean {
  return (
    message === PING_RECEIVED_LOG ||
    message.startsWith('SEND:') ||
    message.startsWith('RECV:') ||
    message.startsWith('[CallTimings]')
  );
}
