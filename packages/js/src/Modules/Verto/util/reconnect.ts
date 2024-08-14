const STORAGE_KEY = 'telnyx-voice-sdk-id';

export function getReconnectToken(): string | null {
  const token = sessionStorage.getItem(STORAGE_KEY);
  return token;
}

export function setReconnectToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearReconnectToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

window.addEventListener('beforeunload', () => {
  clearReconnectToken();
});
