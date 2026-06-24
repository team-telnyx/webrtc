import logger from './logger';

const STORAGE_KEY = 'telnyx-voice-sdk-id';
const SESSION_ID_STORAGE_KEY = 'telnyx-voice-sdk-session-id';
const SESSION_ID_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-session-id-stored-at';

export const RECONNECT_SESSION_ID_MAX_AGE_MS = 90 * 1000;

// ── Active-calls recovery marker (page-reload recovery detection) ──────
// The entire Call object is persisted before page unload so that, on the
// next SDK startup, the SDK can detect whether previously active calls
// were reattached by the server and emit SESSION_NOT_REATTACHED for any
// that were not. Live host objects (RTCPeerConnection, MediaStream) are
// dropped by the JSON replacer; the persisted record is a snapshot of the
// call's serializable fields (id, options, state, direction, etc.).
const ACTIVE_CALLS_STORAGE_KEY = 'telnyx-voice-sdk-active-calls';
const ACTIVE_CALLS_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-active-calls-stored-at';
const ACTIVE_CALLS_SESSID_STORAGE_KEY = 'telnyx-voice-sdk-active-calls-sessid';

/** Max age for a saved recovery marker before it is considered stale. */
export const RECOVERY_MARKER_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Shape of a single persisted active-call record. The entire Call object is
 * serialized, so this is a permissive shape — the only guaranteed field is
 * `id` (the call identifier). Additional fields from the Call/options may be
 * present and are passed through untouched.
 */
export interface IActiveCallRecoveryMarker {
  id: string;
  [key: string]: unknown;
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
 * Remove the persisted active-calls recovery marker (all keys).
 */
export function clearActiveCallsRecoveryMarker(): void {
  safeRemoveItem(ACTIVE_CALLS_STORAGE_KEY);
  safeRemoveItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY);
  safeRemoveItem(ACTIVE_CALLS_SESSID_STORAGE_KEY);
}

/**
 * Read the persisted active-calls recovery marker. Returns the saved marker
 * records (entire serialized Call objects) plus the sessid that was active
 * when the marker was written. Returns `{ markers: [], sessid: null }` when
 * nothing is stored, storage is unavailable, the payload is malformed, or the
 * marker is older than {@link RECOVERY_MARKER_MAX_AGE_MS}.
 *
 * Storage is cleaned up immediately after the read — once we have the
 * in-memory copy the persisted copy is no longer needed, and clearing it
 * here guarantees the record cannot be re-consumed by a duplicate recovery
 * event, a stale tab, or a future page load (at-most-once notification).
 *
 * Validation is minimal: each record only needs an `id` field (the call
 * identifier). All other fields are passed through untouched.
 */
export function getActiveCallsRecoveryMarker(now = Date.now()): {
  markers: IActiveCallRecoveryMarker[];
  sessid: string | null;
} {
  const raw = safeGetItem(ACTIVE_CALLS_STORAGE_KEY);
  const storedAtRaw = safeGetItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY);
  const sessidRaw = safeGetItem(ACTIVE_CALLS_SESSID_STORAGE_KEY);

  // Once we have all items from storage we won't need it again — clean up
  // immediately so the record cannot be re-consumed.
  clearActiveCallsRecoveryMarker();

  if (!raw) {
    logger.debug(
      'Active-calls recovery marker not found in storage — nothing to recover.'
    );
    return { markers: [], sessid: null };
  }

  const storedAt = Number(storedAtRaw);
  if (!Number.isFinite(storedAt) || now - storedAt > RECOVERY_MARKER_MAX_AGE_MS) {
    // Stale or invalid — storage already cleared above.
    logger.debug(
      'Active-calls recovery marker was stale or had an invalid timestamp — discarded.'
    );
    return { markers: [], sessid: null };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.debug(
        'Active-calls recovery marker payload was not an array — discarded.'
      );
      return { markers: [], sessid: null };
    }
    // Defensive: keep only well-formed records — each must have a string `id`.
    const markers = parsed.filter(
      (r: unknown): r is IActiveCallRecoveryMarker =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as IActiveCallRecoveryMarker).id === 'string'
    );
    return { markers, sessid: sessidRaw };
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
 * Persist an array of active-call recovery markers (entire Call objects)
 * before page unload, along with the sessid that was active at save time.
 * Writes are wrapped in try/catch so a blocked/unavailable `sessionStorage`
 * silently no-ops, matching the safety pattern of the reconnect-token helpers.
 */
export function setActiveCallsRecoveryMarker(
  markers: IActiveCallRecoveryMarker[],
  sessid: string,
  storedAt = Date.now()
): void {
  if (!Array.isArray(markers) || markers.length === 0) {
    // Defensive: never persist an empty marker — a future reload would have
    // nothing to compare and the entry would be dead state.
    clearActiveCallsRecoveryMarker();
    return;
  }
  safeSetItem(ACTIVE_CALLS_STORAGE_KEY, JSON.stringify(markers));
  safeSetItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY, String(storedAt));
  safeSetItem(ACTIVE_CALLS_SESSID_STORAGE_KEY, sessid);
}
