import logger from '../util/logger';

/**
 * Timing measurements for call establishment phases.
 * All durations are in milliseconds from the call start point.
 * Undefined if the phase didn't occur (e.g., inbound calls won't have createOffer).
 *
 * Outbound start: newCall() called
 * Inbound start: invite message arrived (VertoHandler)
 */
export interface ICallEstablishmentTimings {
  mode: 'trickle' | 'non-trickle';
  direction: 'outbound' | 'inbound';
  /** Ordered steps with label, absolute time from start, and delta from previous */
  steps: Array<{ label: string; fromStart: number; delta: number }>;
}

/** All known mark suffixes (appended to callId prefix). */
const MARK_SUFFIXES = [
  'new-call-start',
  'new-peer',
  'get-user-media',
  'peer-creation-end',
  'start-negotiation',
  'create-offer',
  'create-answer',
  'set-local-description',
  'ice-gathering-started',
  'first-candidate',
  'first-non-host-candidate',
  'send-sdp',
  'ice-gathering-completed',
  'ringing',
  'telnyx-rtc-media',
  'first-remote-media-track',
  'set-remote-description',
  'telnyx-rtc-answer',
  'ice-connected',
  'dtls-connected',
  'call-active',
  'answer-called',
] as const;

/** Human-readable labels for each mark suffix. */
const MARK_LABELS: Record<string, string> = {
  'new-call-start': 'Call Start',
  'new-peer': 'Peer object created',
  'get-user-media': 'Media devices acquired',
  'peer-creation-end': 'Peer setup complete',
  'start-negotiation': 'SDP negotiation started',
  'create-offer': 'SDP offer generated',
  'create-answer': 'SDP answer generated',
  'set-local-description': 'Local description applied',
  'ice-gathering-started': 'ICE candidate gathering started',
  'first-candidate': 'First ICE candidate found',
  'first-non-host-candidate': 'First server-reflexive/relay candidate found',
  'send-sdp': 'SDP sent to server',
  'ice-gathering-completed': 'All ICE candidates gathered',
  ringing: 'Remote side ringing',
  'telnyx-rtc-media': 'Early media received from server',
  'first-remote-media-track': 'First remote audio/video track received',
  'set-remote-description': 'Remote description applied',
  'telnyx-rtc-answer': 'Call answered by remote side',
  'ice-connected': 'ICE connection established',
  'dtls-connected': 'Secure media channel established (DTLS)',
  'call-active': 'Call is active',
  'answer-called': 'Answer delay (invite → call.answer)',
};

/**
 * Safely get the timestamp of a performance mark.
 * Returns undefined if the mark doesn't exist.
 */
function getMarkTime(markName: string): number | undefined {
  try {
    const entries = performance.getEntriesByName(markName, 'mark');
    if (entries.length > 0) {
      return entries[0].startTime;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Collect all call establishment timings from performance marks.
 * All times are measured from the 'new-call-start' mark.
 *
 * @param mode - 'trickle' or 'non-trickle' ICE mode
 * @param direction - 'outbound' or 'inbound'
 */
export function collectCallEstablishmentTimings(
  mode: 'trickle' | 'non-trickle',
  direction: 'outbound' | 'inbound'
): ICallEstablishmentTimings {
  const startTime = getMarkTime('new-call-start');

  if (startTime === undefined) {
    return { mode, direction, steps: [] };
  }

  // Collect all marks that exist, compute fromStart
  const raw: Array<{ label: string; fromStart: number }> = [];

  for (const suffix of MARK_SUFFIXES) {
    if (suffix === 'new-call-start') continue; // skip the start point itself
    const time = getMarkTime(suffix);
    if (time !== undefined) {
      raw.push({
        label: MARK_LABELS[suffix] || suffix,
        fromStart: time - startTime,
      });
    }
  }

  // Sort chronologically
  raw.sort((a, b) => a.fromStart - b.fromStart);

  // Compute deltas
  const steps: ICallEstablishmentTimings['steps'] = [];
  let prev = 0;
  for (const entry of raw) {
    steps.push({
      label: entry.label,
      fromStart: entry.fromStart,
      delta: entry.fromStart - prev,
    });
    prev = entry.fromStart;
  }

  return { mode, direction, steps };
}

/**
 * Log call establishment timings as a readable table.
 */
export function logCallEstablishmentTimings(
  timings: ICallEstablishmentTimings
): void {
  const { mode, direction, steps } = timings;
  const tag = `[CallTimings][${direction}][${mode}]`;

  if (steps.length === 0) {
    logger.info(`${tag} No timing data collected`);
    return;
  }

  // Column widths
  const maxLabel = Math.max(...steps.map((s) => s.label.length), 'Step'.length);
  const colStep = maxLabel + 2;
  const colDelta = 14;
  const colFromStart = 14;

  // ES6-safe padding
  const rpad = (s: string, w: number) => {
    while (s.length < w) s += ' ';
    return s;
  };
  const lpad = (s: string, w: number) => {
    while (s.length < w) s = ' ' + s;
    return s;
  };

  const header =
    rpad('Step', colStep) +
    lpad('Delta', colDelta) +
    lpad('From Start', colFromStart);
  let separator = '';
  for (let i = 0; i < header.length; i++) separator += '-';

  logger.info(`${tag} Call establishment timing breakdown:`);
  logger.info(`${tag} ${header}`);
  logger.info(`${tag} ${separator}`);

  // Start row
  logger.info(
    `${tag} ${rpad('Call Start', colStep)}${lpad('-', colDelta)}${lpad('0.00ms', colFromStart)}`
  );

  for (const step of steps) {
    const deltaStr = step.delta.toFixed(2) + 'ms';
    const fromStartStr = step.fromStart.toFixed(2) + 'ms';
    logger.info(
      `${tag} ${rpad(step.label, colStep)}${lpad(deltaStr, colDelta)}${lpad(fromStartStr, colFromStart)}`
    );
  }

  logger.info(`${tag} ${separator}`);
}

/**
 * Clear all call establishment performance marks.
 */
export function clearCallMarks(): void {
  for (const suffix of MARK_SUFFIXES) {
    try {
      performance.clearMarks(suffix);
    } catch {
      logger.warn('Clearing performance marks is failed');
    }
  }
}
