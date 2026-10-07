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
import {
  DEFAULT_DEV_ICE_SERVERS,
  DEFAULT_PROD_ICE_SERVERS,
} from './util/constants';
import {
  observeCallMarks,
  readCallMarks,
} from './webrtc/CallEstablishmentTimings';

const sessions = new WeakMap<object, SessionTelemetry>();

/** Telemetry of a new SDK instance (sdk_creation_started); null when off. */
export function startTelemetry(session: SessionHost): SessionTelemetry | null {
  const events = SessionTelemetry.create(session, {
    sdkVersion: pkg.version,
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

/** A call's telemetry; null when telemetry is off. */
export const callTelemetry = (
  call: CallHost,
  session: unknown
): CallTelemetry | null => CallTelemetry.create(call, telemetryOf(session));
