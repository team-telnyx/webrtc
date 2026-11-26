/**
 * Call Report V2 telemetry: the SDK's side of @telnyx/webrtc-telemetry (a
 * workspace package bundled into this one). Hooks reach a session's
 * telemetry through telemetryOf(), so no public type names the package.
 */
import {
  CallTelemetry,
  SessionTelemetry,
  type CallHost,
  type SessionHost,
} from '@telnyx/webrtc-telemetry';
import pkg from '../../../package.json';
import { trigger } from './services/Handler';
import {
  DEFAULT_DEV_ICE_SERVERS,
  DEFAULT_PROD_ICE_SERVERS,
  SwEvent,
  TELEMETRY_CREDENTIALS_REJECTED,
} from './util/constants';
import { createTelnyxWarning } from './util/errors';
import type { ITelnyxWarning } from './util/constants/warnings';
import logger from './util/logger';
import {
  observeCallMarks,
  readCallMarks,
} from './webrtc/CallEstablishmentTimings';

const sessions = new WeakMap<object, SessionTelemetry>();

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
  if (events) sessions.set(session, events);
  return events;
}

/** The session's telemetry hooks; undefined when telemetry is off. */
export const telemetryOf = (session: unknown): SessionTelemetry | undefined =>
  sessions.get(session as object);

/**
 * A `telnyx.warning` for the app, and the same warning in the call report
 * (`warning`, with the call ID when there is one; the payload's other fields
 * under `extra`). Telemetry can never stop the app's event.
 */
export function triggerWarning(
  session: unknown,
  data: { warning: ITelnyxWarning; callId?: string; [key: string]: unknown },
  target?: string
): void {
  try {
    const { warning, callId, ...rest } = data;
    delete rest.sessionId; // the record carries the session's own IDs
    telemetryOf(session)?.warning(warning, undefined, callId, rest);
  } catch {
    // Telemetry must not break the SDK.
  }
  trigger(
    SwEvent.Warning,
    data,
    target ?? (session as { uuid?: string })?.uuid
  );
}

/** A call's telemetry; null when telemetry is off. */
export const callTelemetry = (
  call: CallHost,
  session: unknown
): CallTelemetry | null => CallTelemetry.create(call, telemetryOf(session));
