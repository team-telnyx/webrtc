const STORAGE_KEY = 'telnyx-voice-sdk-id';
const SESSION_ID_STORAGE_KEY = 'telnyx-voice-sdk-session-id';

export function getReconnectToken(): string | null {
  const token = sessionStorage.getItem(STORAGE_KEY);
  return token;
}

export function setReconnectToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function getReconnectSessionId(): string | null {
  return sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
}

export function setReconnectSessionId(sessionId: string): void {
  sessionStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
}

export function clearReconnectToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
}
