import { IWebRTCCall } from '../webrtc/interfaces';
import logger from './logger';

/**
 * What the recovery marker keeps for one call. Only plain values are stored:
 * no SDP, credentials, streams or DOM elements (VSDK-316).
 */
export interface IStoredActiveCall {
  id: IWebRTCCall['id'];
  customHeaders: IWebRTCCall['options']['customHeaders'];
  /**
   * Id of the call's remote media element, saved only when the element was
   * given as a string id. The recovered call looks it up again by id; without
   * it the call uses the session-level `client.remoteElement`.
   */
  remoteElement?: string;
  /** Id of the call's local media element; same rules as `remoteElement`. */
  localElement?: string;
  /** True when the call was held. */
  wasHeld?: boolean;
  /** Whether the microphone was muted. Missing in markers from older SDK versions. */
  audioMuted?: boolean;
  /** Relay policy evaluated for recovery. */
  forceRelayCandidate: boolean;
}

export interface IStoredActiveCalls {
  sessionId: string;
  calls: IStoredActiveCall[];
  storedAt: number;
}

const STORAGE_KEY = 'telnyx-voice-sdk-id';
const CANARY_RTC_SERVER_STORAGE_KEY = 'telnyx-voice-sdk-id-canary-rtc-server';
const SESSION_ID_STORAGE_KEY = 'telnyx-voice-sdk-session-id';
const SESSION_ID_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-session-id-stored-at';
const ACTIVE_CALLS_STORAGE_KEY = 'telnyx-voice-sdk-active-calls';

export const RECONNECT_SESSION_ID_MAX_AGE_MS = 90 * 1000;
export const RECOVERY_MARKER_MAX_AGE_MS = 15 * 60 * 1000;

function getReconnectSessionIdStoredAt(): number | null {
  const storedAt = Number(
    sessionStorage.getItem(SESSION_ID_STORED_AT_STORAGE_KEY)
  );
  return Number.isFinite(storedAt) ? storedAt : null;
}

export function isReconnectSessionIdFresh(now = Date.now()): boolean {
  const storedAt = getReconnectSessionIdStoredAt();
  return storedAt !== null && now - storedAt <= RECONNECT_SESSION_ID_MAX_AGE_MS;
}

export function getReconnectToken(): string | null {
  const token = sessionStorage.getItem(STORAGE_KEY);
  return token;
}

export function getReconnectTokenCanaryRtcServer(): boolean | undefined {
  const value = safeGetItem(CANARY_RTC_SERVER_STORAGE_KEY);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function setReconnectToken(
  token: string,
  useCanaryRtcServer?: boolean
): void {
  sessionStorage.setItem(STORAGE_KEY, token);
  if (typeof useCanaryRtcServer === 'boolean') {
    sessionStorage.setItem(
      CANARY_RTC_SERVER_STORAGE_KEY,
      String(useCanaryRtcServer)
    );
  } else {
    sessionStorage.removeItem(CANARY_RTC_SERVER_STORAGE_KEY);
  }
}

export function getReconnectSessionId(now = Date.now()): string | null {
  const sessionId = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
  if (!sessionId) return null;

  if (!isReconnectSessionIdFresh(now)) {
    sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_ID_STORED_AT_STORAGE_KEY);
    return null;
  }

  return sessionId;
}

export function setReconnectSessionId(
  sessionId: string,
  storedAt = Date.now()
): void {
  sessionStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  sessionStorage.setItem(SESSION_ID_STORED_AT_STORAGE_KEY, String(storedAt));
}

export function clearReconnectToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(CANARY_RTC_SERVER_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ID_STORED_AT_STORAGE_KEY);
}

function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (err) {
    logger.debug(
      `safeGetItem('${key}') failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (err) {
    // sessionStorage may be unavailable (private mode, disabled storage).
    // Fail silently — recovery detection is a best-effort feature.
    logger.info(
      `safeSetItem('${key}') failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    logger.debug(
      `safeRemoveItem('${key}') failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

// ── Recovery marker ─────────────────────────────────────────────────────
// With `hangupOnBeforeUnload: false` the SDK saves its active calls here when
// the page unloads. After the reload, in whichever order the messages arrive:
// - each `telnyx_rtc.attach` takes its call's record to recover the call
//   ({@link takeSavedCall})
// - `reattached_sessions` takes the records of the calls the server did not
//   re-attach ({@link takeSavedCallsNotIn})
// The marker is removed once its last record is taken.

/** Remove the recovery marker. */
export function clearActiveCallsRecoveryMarker(): void {
  safeRemoveItem(ACTIVE_CALLS_STORAGE_KEY);
}

/**
 * Read the recovery marker without changing it. Returns `null`, and removes
 * the marker, when it is malformed, has no calls, or is older than
 * {@link RECOVERY_MARKER_MAX_AGE_MS}.
 */
export function getActiveCallsRecoveryMarker(
  now = Date.now()
): IStoredActiveCalls | null {
  const raw = safeGetItem(ACTIVE_CALLS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const discard = (reason: string) => {
    logger.debug(`Active-calls recovery marker ${reason} — discarded.`);
    clearActiveCallsRecoveryMarker();
    return null;
  };

  let parsed: IStoredActiveCalls;
  try {
    parsed = JSON.parse(raw) as IStoredActiveCalls;
  } catch (err) {
    return discard(
      `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.calls)) {
    return discard('payload was malformed');
  }
  const storedAt = Number(parsed.storedAt);
  if (
    !Number.isFinite(storedAt) ||
    now - storedAt > RECOVERY_MARKER_MAX_AGE_MS
  ) {
    return discard('was stale or had an invalid timestamp');
  }
  if (parsed.calls.length === 0) {
    return discard('had no call records');
  }
  return parsed;
}

/**
 * Save the recovery marker under a single sessionStorage key. An empty list
 * removes the marker instead. A blocked or unavailable sessionStorage is
 * ignored.
 */
export function setActiveCallsRecoveryMarker(
  calls: IStoredActiveCall[],
  sessionId: string,
  storedAt = Date.now()
): void {
  if (!Array.isArray(calls) || calls.length === 0) {
    clearActiveCallsRecoveryMarker();
    return;
  }
  const payload: IStoredActiveCalls = { sessionId, calls, storedAt };
  safeSetItem(ACTIVE_CALLS_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Remove and return the saved calls of `sessionId` that match `shouldTake`.
 * A marker saved for another session holds none of this session's calls: it
 * is dropped and nothing is returned.
 */
function takeSavedCalls(
  sessionId: string,
  shouldTake: (call: IStoredActiveCall) => boolean
): IStoredActiveCall[] {
  const marker = getActiveCallsRecoveryMarker();
  if (!marker || !sessionId) {
    return [];
  }

  if (marker.sessionId !== sessionId) {
    logger.info(
      `Recovery marker was saved for session ${marker.sessionId}, not the current session ${sessionId} — dropping it.`
    );
    clearActiveCallsRecoveryMarker();
    return [];
  }

  // Malformed records are skipped, and dropped when the marker is saved again.
  const calls = marker.calls.filter(
    (call) =>
      call !== null && typeof call === 'object' && typeof call.id === 'string'
  );
  const taken = calls.filter(shouldTake);
  if (taken.length > 0) {
    setActiveCallsRecoveryMarker(
      calls.filter((call) => !taken.includes(call)),
      marker.sessionId,
      marker.storedAt
    );
  }
  return taken;
}

/**
 * Remove and return the saved record of `callId`, or `null` when the call was
 * not saved for `sessionId`.
 */
export function takeSavedCall(
  callId: string,
  sessionId: string
): IStoredActiveCall | null {
  return takeSavedCalls(sessionId, (call) => call.id === callId)[0] ?? null;
}

/** Remove and return the saved calls of `sessionId` whose id is not in `ids`. */
export function takeSavedCallsNotIn(
  ids: ReadonlySet<string>,
  sessionId: string
): IStoredActiveCall[] {
  return takeSavedCalls(sessionId, (call) => !ids.has(call.id));
}
