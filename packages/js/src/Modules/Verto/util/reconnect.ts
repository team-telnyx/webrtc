const STORAGE_KEY = 'telnyx-voice-sdk-id';
const SESSION_ID_STORAGE_KEY = 'telnyx-voice-sdk-session-id';
const SESSION_ID_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-session-id-stored-at';

export const RECONNECT_SESSION_ID_MAX_AGE_MS = 90 * 1000;

// ── Active-calls recovery marker (page-reload recovery detection) ──────
// Minimal, safe metadata persisted for active calls before page unload so
// that, on the next SDK startup, the SDK can detect whether previously
// active calls were reattached by the server. No call objects, SDP, ICE,
// media, credentials, or other sensitive material are persisted here — only
// identifier/diagnostic fields projected from each live Call.
const ACTIVE_CALLS_STORAGE_KEY = 'telnyx-voice-sdk-active-calls';
const ACTIVE_CALLS_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-active-calls-stored-at';

/** Max age for a saved recovery marker before it is considered stale. */
export const RECOVERY_MARKER_MAX_AGE_MS = 30 * 60 * 1000;

/** Shape of a single persisted active-call record. Notification-only. */
export interface IActiveCallRecoveryMarker {
  callId: string;
  sessid: string;
  storedAt: number;
  /** Optional safe correlation identifiers (no sensitive data). */
  telnyxSessionId?: string;
  telnyxCallControlId?: string;
}

function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage may be unavailable (private mode, disabled storage).
    // Fail silently — recovery detection is a best-effort feature.
  }
}

function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Fail silently — see safeSetItem.
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
 * Read the persisted active-calls recovery marker. Returns an empty array
 * when nothing is stored, storage is unavailable, the payload is malformed,
 * or the marker is older than {@link RECOVERY_MARKER_MAX_AGE_MS}.
 *
 * Stale markers are cleared as a side effect (matches the pattern used by
 * `getReconnectSessionId` for the reconnect-session-id helpers).
 *
 * This is a *pure read*: it does NOT clear the marker. The consumer is the
 * sole owner of clearing (see `clearActiveCallsRecoveryMarker`) so that an
 * at-most-once notification guarantee can be enforced by the caller.
 */
export function getActiveCallsRecoveryMarker(
  now = Date.now()
): IActiveCallRecoveryMarker[] {
  const raw = safeGetItem(ACTIVE_CALLS_STORAGE_KEY);
  if (!raw) return [];

  const storedAtRaw = safeGetItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY);
  const storedAt = Number(storedAtRaw);
  if (!Number.isFinite(storedAt) || now - storedAt > RECOVERY_MARKER_MAX_AGE_MS) {
    // Stale or invalid — clear both keys so it can't be re-consumed.
    safeRemoveItem(ACTIVE_CALLS_STORAGE_KEY);
    safeRemoveItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY);
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      safeRemoveItem(ACTIVE_CALLS_STORAGE_KEY);
      safeRemoveItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY);
      return [];
    }
    // Defensive: keep only well-formed records (callId + sessid required).
    return parsed
      .filter(
        (r: unknown): r is IActiveCallRecoveryMarker =>
          !!r &&
          typeof r === 'object' &&
          typeof (r as IActiveCallRecoveryMarker).callId === 'string' &&
          typeof (r as IActiveCallRecoveryMarker).sessid === 'string' &&
          typeof (r as IActiveCallRecoveryMarker).storedAt === 'number'
      )
      .map((r) => ({
        callId: r.callId,
        sessid: r.sessid,
        storedAt: r.storedAt,
        ...(r.telnyxSessionId !== undefined
          ? { telnyxSessionId: r.telnyxSessionId }
          : {}),
        ...(r.telnyxCallControlId !== undefined
          ? { telnyxCallControlId: r.telnyxCallControlId }
          : {}),
      }));
  } catch {
    // Malformed JSON — clear and ignore.
    safeRemoveItem(ACTIVE_CALLS_STORAGE_KEY);
    safeRemoveItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY);
    return [];
  }
}

/**
 * Persist an array of active-call recovery markers before page unload.
 * Writes are wrapped in try/catch so a blocked/unavailable `sessionStorage`
 * silently no-ops, matching the safety pattern of the reconnect-token
 * helpers.
 */
export function setActiveCallsRecoveryMarker(
  markers: IActiveCallRecoveryMarker[],
  storedAt = Date.now()
): void {
  if (!Array.isArray(markers) || markers.length === 0) {
    // Defensive: never persist an empty marker — a future reload would have
    // nothing to compare and the entry would be dead state.
    safeRemoveItem(ACTIVE_CALLS_STORAGE_KEY);
    safeRemoveItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY);
    return;
  }
  safeSetItem(ACTIVE_CALLS_STORAGE_KEY, JSON.stringify(markers));
  safeSetItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY, String(storedAt));
}

/**
 * Remove the persisted active-calls recovery marker (both keys).
 * Must be called by the consumer after reading the marker to guarantee
 * at-most-once notification semantics.
 */
export function clearActiveCallsRecoveryMarker(): void {
  safeRemoveItem(ACTIVE_CALLS_STORAGE_KEY);
  safeRemoveItem(ACTIVE_CALLS_STORED_AT_STORAGE_KEY);
}
