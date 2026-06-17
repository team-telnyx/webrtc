const STORAGE_KEY = 'telnyx-voice-sdk-id';
const SESSION_ID_STORAGE_KEY = 'telnyx-voice-sdk-session-id';
const SESSION_ID_STORED_AT_STORAGE_KEY =
  'telnyx-voice-sdk-session-id-stored-at';
const LAST_SOCKET_CLOSE_STORAGE_KEY = 'telnyx-voice-sdk-last-socket-close';

export const RECONNECT_SESSION_ID_MAX_AGE_MS = 90 * 1000;

export interface ILastSocketClose {
  type: 'socket-close' | 'socket-error';
  code?: number;
  codeName?: string;
  reason?: string;
  wasClean?: boolean;
  error?: string;
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

export function getLastSocketClose(): ILastSocketClose | null {
  const value = sessionStorage.getItem(LAST_SOCKET_CLOSE_STORAGE_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as ILastSocketClose;
  } catch {
    sessionStorage.removeItem(LAST_SOCKET_CLOSE_STORAGE_KEY);
    return null;
  }
}

export function setLastSocketClose(socketClose: ILastSocketClose): void {
  sessionStorage.setItem(
    LAST_SOCKET_CLOSE_STORAGE_KEY,
    JSON.stringify(socketClose)
  );
}

export function clearReconnectToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ID_STORED_AT_STORAGE_KEY);
  sessionStorage.removeItem(LAST_SOCKET_CLOSE_STORAGE_KEY);
}
