import { IWebRTCCall } from '../webrtc/interfaces';
import logger from './logger';

export interface IStoredActiveCall {
  id: IWebRTCCall['id'];
  customHeaders: IWebRTCCall['options']['customHeaders'];
}
export interface IStoredActiveCalls {
  sessionId: string;
  calls: IStoredActiveCall[];
  storedAt: number;
}

const STORAGE_KEY = 'telnyx-voice-sdk-id';
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

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.calls)) {
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

    if (parsed.calls.length === 0) {
      logger.debug(
        'Active-calls recovery marker had no call records — discarded.'
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
 * Persist the active-call recovery marker — a narrow projection of each
 * active Call (only `id` plus optional `options.telnyxSessionId` /
 * `options.telnyxCallControlId` correlation identifiers) — before page
 * unload, along with the sessid that was active at save time. Stored as a
 * single JSON blob under a single sessionStorage key. Writes are wrapped in
 * try/catch so a blocked/unavailable `sessionStorage` silently no-ops,
 * matching the safety pattern of the reconnect-token helpers.
 *
 * Persisting only the narrow projection (rather than the full `Call`) keeps
 * credentials, tokens, SDP, ICE/TURN secrets, custom header values, and
 * non-serializable host objects (`localStream`, `remoteStream`, `RTCPeerConnection`)
 * out of `sessionStorage` (VSDK-316 security constraints).
 */
export function setActiveCallsRecoveryMarker(
  calls: IStoredActiveCall[],
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
  safeSetItem(ACTIVE_CALLS_STORAGE_KEY, JSON.stringify(payload));
}
