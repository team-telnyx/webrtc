import logger from './logger';
import type Call from '../webrtc/Call';

const STORAGE_KEY = 'telnyx-voice-sdk-id';
const SESSION_ID_STORAGE_KEY = 'telnyx-voice-sdk-session-id';
const SESSION_ID_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-session-id-stored-at';

export const RECONNECT_SESSION_ID_MAX_AGE_MS = 90 * 1000;

// ── Active-calls recovery marker (page-reload recovery detection) ──────
// Before page unload, the entire active Call objects are serialized (with
// `session` and `peer` stripped to avoid circular references and
// non-serializable host objects) and persisted to a single sessionStorage
// entry, so that on the next SDK startup the SDK can detect whether
// previously active calls were reattached by the server and emit
// SESSION_NOT_REATTACHED for any that were not. The serialized objects
// retain every public Call field (id, options, state, direction, cause,
// channels, etc.) so consumers and future diagnostics have access to the
// full picture, not a minimal projection.
const ACTIVE_CALLS_STORAGE_KEY = 'telnyx-voice-sdk-active-calls';

/** Max age for a saved recovery marker before it is considered stale. */
export const RECOVERY_MARKER_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Single persisted recovery marker holding every active Call object plus
 * the session context and write timestamp. Stored as one JSON blob under
 * a single sessionStorage key.
 *
 * `calls` is the full serialized Call array (with `session`/`peer` stripped
 * to avoid circular references and non-serializable host objects). Each
 * Call retains its public fields (id, options, state, direction, cause,
 * channels, ...) so consumers and future diagnostics have the complete
 * picture rather than a minimal projection.
 *
 * `sessionId` is the sessid that was active at save time; the consume path
 * only notifies when it matches the current session's sessid.
 *
 * `storedAt` is the epoch-millis write timestamp used to apply the
 * staleness deadline ({@link RECOVERY_MARKER_MAX_AGE_MS}).
 */
export interface IStoredActiveCalls {
  /** The sessid that was active when the marker was written. */
  sessionId: string;
  /** Serialized Call objects (session/peer stripped). */
  calls: Call[];
  /** Epoch milliseconds when the record was written. */
  storedAt: number;
}

/**
 * Permissive read-back shape for a single persisted Call. The `session` and
 * `peer` host fields are stripped at write time, so they never appear here.
 * Only `id` is required to validate a record on read-back; all other Call
 * fields are optional (they may be `undefined` on the live object at write
 * time, e.g. `cause`/`causeCode` before hangup, or `telnyxSessionId` before
 * the server assigns it).
 */
export interface IActiveCallRecoveryMarker {
  /** The call identifier (Call.id). Required to validate a record. */
  id: string;
  /** Any other serialized Call field (options, state, direction, cause, ...). */
  [key: string]: unknown;
}

/**
 * Read-back shape returned by {@link getActiveCallsRecoveryMarker}:
 * the permissive marker array plus the session id that was active at save
 * time (null when nothing is stored or storage is unavailable).
 */
export interface IActiveCallsRecoveryResult {
  markers: IActiveCallRecoveryMarker[];
  sessid: string | null;
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
    logger.debug(
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

export function setReconnectToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
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
  sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ID_STORED_AT_STORAGE_KEY);
}

// ── Active-calls recovery marker helpers ────────────────────────────────

/**
 * Remove the persisted active-calls recovery marker (single key).
 */
export function clearActiveCallsRecoveryMarker(): void {
  safeRemoveItem(ACTIVE_CALLS_STORAGE_KEY);
}

/**
 * Read the persisted active-calls recovery marker. Returns the saved marker
 * records (the serialized Call array) plus the session id that was active
 * when the marker was written. Returns `{ markers: [], sessid: null }` when
 * nothing is stored, storage is unavailable, the payload is malformed, or
 * the marker is older than {@link RECOVERY_MARKER_MAX_AGE_MS}.
 *
 * Storage is cleaned up immediately after the read — once we have the
 * in-memory copy the persisted copy is no longer needed, and clearing it
 * here guarantees the record cannot be re-consumed by a duplicate recovery
 * event, a stale tab, or a future page load (at-most-once notification).
 *
 * Validation is minimal: each Call only needs a string `id` field. The
 * `session`/`peer` host fields are never serialized (stripped at write
 * time), so read-back does not need to strip them.
 */
export function getActiveCallsRecoveryMarker(
  now = Date.now()
): IActiveCallsRecoveryResult {
  const raw = safeGetItem(ACTIVE_CALLS_STORAGE_KEY);

  // Once we have the item from storage we won't need it again — clean up
  // immediately so the record cannot be re-consumed.
  clearActiveCallsRecoveryMarker();

  if (!raw) {
    logger.debug(
      'Active-calls recovery marker not found in storage — nothing to recover.'
    );
    return { markers: [], sessid: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<IStoredActiveCalls> & {
      [key: string]: unknown;
    };

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.calls)) {
      logger.debug(
        'Active-calls recovery marker payload was malformed — discarded.'
      );
      return { markers: [], sessid: null };
    }

    const storedAt = Number(parsed.storedAt);
    if (
      !Number.isFinite(storedAt) ||
      now - storedAt > RECOVERY_MARKER_MAX_AGE_MS
    ) {
      logger.debug(
        'Active-calls recovery marker was stale or had an invalid timestamp — discarded.'
      );
      return { markers: [], sessid: null };
    }

    // Defensive: keep only well-formed Call records — each must have a string
    // `id`. The `session`/`peer` host fields are stripped at write time, so
    // read-back does not need to strip them.
    const markers = (parsed.calls as unknown[]).filter(
      (r: unknown): r is IActiveCallRecoveryMarker =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as IActiveCallRecoveryMarker).id === 'string'
    );

    const sessid =
      typeof parsed.sessionId === 'string' ? parsed.sessionId : null;

    return { markers, sessid };
  } catch (err) {
    logger.debug(
      `Active-calls recovery marker JSON parse failed — discarded: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { markers: [], sessid: null };
  }
}

/**
 * JSON.stringify replacer that skips the `session` and `peer` keys on Call
 * objects to avoid circular-reference errors and non-serializable host
 * objects (RTCPeerConnection, BrowserSession). Everything else on the Call
 * (id, options, state, direction, cause, channels, etc.) is serialized so
 * the persisted recovery marker carries the full Call picture.
 */
const CALL_REPLACER = (key: string, value: unknown) => {
  if (key === 'session' || key === 'peer') {
    return undefined;
  }
  return value;
};

/**
 * Persist the active-call recovery marker (the entire serialized Call
 * objects, with `session`/`peer` stripped via the {@link CALL_REPLACER} to
 * avoid circular references and non-serializable host objects) before page
 * unload, along with the sessid that was active at save time. Stored as a
 * single JSON blob under a single sessionStorage key. Writes are wrapped in
 * try/catch so a blocked/unavailable `sessionStorage` silently no-ops,
 * matching the safety pattern of the reconnect-token helpers.
 */
export function setActiveCallsRecoveryMarker(
  calls: Call[],
  sessionId: string,
  storedAt = Date.now()
): void {
  if (!Array.isArray(calls) || calls.length === 0) {
    // Defensive: never persist an empty marker — a future reload would have
    // nothing to compare and the entry would be dead state.
    clearActiveCallsRecoveryMarker();
    return;
  }
  // Serialize each Call with the replacer to strip `session`/`peer`. The
  // serialized form (plain objects) is what goes into the persisted array.
  const serializedCalls = calls.map((call) =>
    JSON.parse(JSON.stringify(call, CALL_REPLACER))
  );
  const payload: IStoredActiveCalls = {
    sessionId,
    calls: serializedCalls,
    storedAt,
  };
  safeSetItem(ACTIVE_CALLS_STORAGE_KEY, JSON.stringify(payload));
}
