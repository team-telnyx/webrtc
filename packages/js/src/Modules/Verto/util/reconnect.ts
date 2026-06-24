import logger from './logger';
import type Call from '../webrtc/Call';

const STORAGE_KEY = 'telnyx-voice-sdk-id';
const SESSION_ID_STORAGE_KEY = 'telnyx-voice-sdk-session-id';
const SESSION_ID_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-session-id-stored-at';

export const RECONNECT_SESSION_ID_MAX_AGE_MS = 90 * 1000;

// ── Active-calls recovery marker (page-reload recovery detection) ──────
// Before page unload, the entire active Call objects are persisted to a
// single sessionStorage entry, so that on the next SDK startup the SDK can
// detect whether previously active calls were reattached by the server and
// emit SESSION_NOT_REATTACHED for any that were not.
const ACTIVE_CALLS_STORAGE_KEY = 'telnyx-voice-sdk-active-calls';

/** Max age for a saved recovery marker before it is considered stale. */
export const RECOVERY_MARKER_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Single persisted recovery marker holding every active Call object plus
 * the session context and write timestamp. Stored as one JSON blob under
 * a single sessionStorage key.
 *
 * `calls` is the serialized Call array. `session`/`peer` host fields are
 * stripped at write time (see `setActiveCallsRecoveryMarker`) to avoid
 * circular references and non-serializable host objects.
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
 * Read the persisted active-calls recovery marker. Returns the saved
 * {@link IStoredActiveCalls} record, or `null` when nothing is stored,
 * storage is unavailable, the payload is malformed, or the marker is
 * older than {@link RECOVERY_MARKER_MAX_AGE_MS}.
 *
 * Storage is cleaned up immediately after the read — once we have the
 * in-memory copy the persisted copy is no longer needed, and clearing it
 * here guarantees the record cannot be re-consumed by a duplicate recovery
 * event, a stale tab, or a future page load (at-most-once notification).
 */
export function getActiveCallsRecoveryMarker(
  now = Date.now()
): IStoredActiveCalls | null {
  const raw = safeGetItem(ACTIVE_CALLS_STORAGE_KEY);

  // Once we have the item from storage we won't need it again — clean up
  // immediately so the record cannot be re-consumed.
  clearActiveCallsRecoveryMarker();

  if (!raw) {
    logger.debug(
      'Active-calls recovery marker not found in storage — nothing to recover.'
    );
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as IStoredActiveCalls;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.calls)
    ) {
      logger.debug(
        'Active-calls recovery marker payload was malformed — discarded.'
      );
      return null;
    }

    const storedAt = Number(parsed.storedAt);
    if (
      !Number.isFinite(storedAt) ||
      now - storedAt > RECOVERY_MARKER_MAX_AGE_MS
    ) {
      logger.debug(
        'Active-calls recovery marker was stale or had an invalid timestamp — discarded.'
      );
      return null;
    }

    return parsed;
  } catch (err) {
    logger.debug(
      `Active-calls recovery marker JSON parse failed — discarded: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

/**
 * Persist the active-call recovery marker (the entire serialized Call
 * objects, with `session`/`peer` stripped to avoid circular references and
 * non-serializable host objects) before page unload, along with the sessid
 * that was active at save time. Stored as a single JSON blob under a single
 * sessionStorage key. Writes are wrapped in try/catch so a blocked/unavailable
 * `sessionStorage` silently no-ops, matching the safety pattern of the
 * reconnect-token helpers.
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
  const payload: IStoredActiveCalls = {
    sessionId,
    calls,
    storedAt,
  };
  safeSetItem(ACTIVE_CALLS_STORAGE_KEY, JSON.stringify(payload, replacer));
}

/**
 * JSON.stringify replacer that skips the `session` and `peer` keys to avoid
 * circular-reference errors and non-serializable host objects
 * (RTCPeerConnection, BrowserSession). Everything else is serialized so the
 * persisted recovery marker carries the full Call picture.
 */
function replacer(key: string, value: unknown): unknown {
  if (key === 'session' || key === 'peer') {
    return undefined;
  }
  return value;
}
