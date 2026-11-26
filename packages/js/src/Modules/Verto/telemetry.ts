/**
 * Call Report V2 telemetry: the SDK's side of @telnyx/webrtc-telemetry (a
 * workspace package bundled into this one). Hooks reach a session's
 * telemetry through telemetryOf(), so no public type names the package.
 */
import {
  CallTelemetry,
  SessionTelemetry,
  type CallHost,
  type SdkWarning,
  type SessionHost,
  type WarningDetails,
} from '@telnyx/webrtc-telemetry';
import pkg from '../../../package.json';
import { observeTriggers, trigger } from './services/Handler';
import {
  DEFAULT_DEV_ICE_SERVERS,
  DEFAULT_PROD_ICE_SERVERS,
  SwEvent,
  TELEMETRY_CREDENTIALS_REJECTED,
} from './util/constants';
import { createTelnyxWarning } from './util/errors';
import type { ITelnyxWarningEvent } from './util/constants/warnings';
import logger from './util/logger';
import {
  observeCallMarks,
  readCallMarks,
} from './webrtc/CallEstablishmentTimings';

const sessions = new WeakMap<object, SessionTelemetry>();
/** By session uuid, for the warning observer: one entry per SDK instance. */
const sessionsByUuid = new Map<string, SessionTelemetry>();
/** Warnings a call's telemetry already sent (CallTelemetry.onWarning). */
const sentByCall = new WeakSet<object>();

/**
 * Every telnyx.warning the SDK triggers for a session becomes a telemetry
 * warning event: with its call ID when it has one, the event's other fields
 * (beyond warning, sessionId and callId) in its extra. The call quality
 * warnings already went out through CallTelemetry.onWarning (callWarning).
 */
observeTriggers((event, data, uniqueId) => {
  if (event !== SwEvent.Warning || !data || typeof data !== 'object') return;
  const events = sessionsByUuid.get(uniqueId);
  const { warning, callId, ...rest } = data as Partial<ITelnyxWarningEvent> &
    Record<string, unknown>;
  if (!events || !warning || sentByCall.has(warning)) return;
  delete rest.sessionId; // the envelope has it
  try {
    events.warning(
      warning,
      undefined,
      typeof callId === 'string' ? callId : undefined,
      rest
    );
  } catch (error) {
    logger.warn('Call report telemetry: warning event failed', {
      code: warning.code,
      callId,
      error,
    });
  }
});

/** A call's warning through its own telemetry (with the call's timing). */
export function callWarning(
  events: CallTelemetry | null,
  warning: SdkWarning,
  details?: WarningDetails
): void {
  if (!events) return;
  sentByCall.add(warning);
  events.onWarning(warning, details);
}

/** Telemetry of a new SDK instance (sdk_creation_started); null when off. */
export function startTelemetry(
  session: SessionHost & { uuid: string }
): SessionTelemetry | null {
  const events = SessionTelemetry.create(session, {
    sdkVersion: pkg.version,
    onLoginRejected: () => {
      const warning = createTelnyxWarning(TELEMETRY_CREDENTIALS_REJECTED);
      trigger(
        SwEvent.Warning,
        { warning, sessionId: session.sessionid },
        session.uuid
      );
    },
    // The telemetry load let this instance through no telemetry: a log line,
    // nothing else. Calls are not affected.
    onDisabledByServer: () => {
      logger.info(
        'Call report telemetry is turned off by the server for this session'
      );
    },
    defaultIceServers: {
      production: DEFAULT_PROD_ICE_SERVERS,
      development: DEFAULT_DEV_ICE_SERVERS,
    },
    readCallMarks,
    observeCallMarks,
  });
  if (events) {
    sessions.set(session, events);
    sessionsByUuid.set(session.uuid, events);
  }
  return events;
}

/** The session's telemetry hooks; undefined when telemetry is off. */
export const telemetryOf = (session: unknown): SessionTelemetry | undefined =>
  sessions.get(session as object);

/** A call's telemetry; null when telemetry is off. */
export const callTelemetry = (
  call: CallHost,
  session: unknown
): CallTelemetry | null => CallTelemetry.create(call, telemetryOf(session));
