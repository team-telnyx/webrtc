const STORAGE_KEY = 'telnyx-voice-sdk-id';
const SESSION_ID_STORAGE_KEY = 'telnyx-voice-sdk-session-id';
const SESSION_ID_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-session-id-stored-at';

export const RECONNECT_SESSION_ID_MAX_AGE_MS = 90 * 1000;

function scopedStorageKey(key: string, reconnectSessionKey?: string): string {
  return reconnectSessionKey ? `${key}:${reconnectSessionKey}` : key;
}

function normalizeLookupArgs(
  reconnectSessionKeyOrNow?: string | number,
  now = Date.now()
): { reconnectSessionKey?: string; now: number } {
  if (typeof reconnectSessionKeyOrNow === 'number') {
    return { now: reconnectSessionKeyOrNow };
  }

  return { reconnectSessionKey: reconnectSessionKeyOrNow, now };
}

function normalizeSetArgs(
  reconnectSessionKeyOrStoredAt?: string | number,
  storedAt = Date.now()
): { reconnectSessionKey?: string; storedAt: number } {
  if (typeof reconnectSessionKeyOrStoredAt === 'number') {
    return { storedAt: reconnectSessionKeyOrStoredAt };
  }

  return { reconnectSessionKey: reconnectSessionKeyOrStoredAt, storedAt };
}

function getReconnectSessionIdStoredAt(
  reconnectSessionKey?: string
): number | null {
  const storedAt = Number(
    sessionStorage.getItem(
      scopedStorageKey(SESSION_ID_STORED_AT_STORAGE_KEY, reconnectSessionKey)
    )
  );
  return Number.isFinite(storedAt) ? storedAt : null;
}

export function isReconnectSessionIdFresh(
  reconnectSessionKeyOrNow?: string | number,
  now = Date.now()
): boolean {
  const args = normalizeLookupArgs(reconnectSessionKeyOrNow, now);
  const storedAt = getReconnectSessionIdStoredAt(args.reconnectSessionKey);
  return (
    storedAt !== null && args.now - storedAt <= RECONNECT_SESSION_ID_MAX_AGE_MS
  );
}

export function getReconnectToken(reconnectSessionKey?: string): string | null {
  return sessionStorage.getItem(
    scopedStorageKey(STORAGE_KEY, reconnectSessionKey)
  );
}

export function setReconnectToken(
  token: string,
  reconnectSessionKey?: string
): void {
  sessionStorage.setItem(
    scopedStorageKey(STORAGE_KEY, reconnectSessionKey),
    token
  );
}

export function getReconnectSessionId(
  reconnectSessionKeyOrNow?: string | number,
  now = Date.now()
): string | null {
  const args = normalizeLookupArgs(reconnectSessionKeyOrNow, now);
  const sessionIdKey = scopedStorageKey(
    SESSION_ID_STORAGE_KEY,
    args.reconnectSessionKey
  );
  const sessionId = sessionStorage.getItem(sessionIdKey);
  if (!sessionId) return null;

  if (!isReconnectSessionIdFresh(args.reconnectSessionKey, args.now)) {
    sessionStorage.removeItem(sessionIdKey);
    sessionStorage.removeItem(
      scopedStorageKey(
        SESSION_ID_STORED_AT_STORAGE_KEY,
        args.reconnectSessionKey
      )
    );
    return null;
  }

  return sessionId;
}

export function setReconnectSessionId(
  sessionId: string,
  reconnectSessionKeyOrStoredAt?: string | number,
  storedAt = Date.now()
): void {
  const args = normalizeSetArgs(reconnectSessionKeyOrStoredAt, storedAt);
  sessionStorage.setItem(
    scopedStorageKey(SESSION_ID_STORAGE_KEY, args.reconnectSessionKey),
    sessionId
  );
  sessionStorage.setItem(
    scopedStorageKey(
      SESSION_ID_STORED_AT_STORAGE_KEY,
      args.reconnectSessionKey
    ),
    String(args.storedAt)
  );
}

export function clearReconnectToken(reconnectSessionKey?: string): void {
  sessionStorage.removeItem(scopedStorageKey(STORAGE_KEY, reconnectSessionKey));
  sessionStorage.removeItem(
    scopedStorageKey(SESSION_ID_STORAGE_KEY, reconnectSessionKey)
  );
  sessionStorage.removeItem(
    scopedStorageKey(SESSION_ID_STORED_AT_STORAGE_KEY, reconnectSessionKey)
  );
}
