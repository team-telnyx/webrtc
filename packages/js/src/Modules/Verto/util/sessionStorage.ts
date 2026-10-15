/**
 * Safe `sessionStorage` accessors.
 *
 * Every call is wrapped, because `sessionStorage` is not reliably available:
 * Safari private mode throws on write once the quota is reached, browsers with
 * site data blocked throw on access, and a cross-origin iframe without storage
 * access throws on the property lookup itself. None of that should take a call
 * down, so a failed read returns `null` and a failed write or delete no-ops.
 *
 * Everything the SDK persists here is a best-effort recovery hint — a reconnect
 * token, a session id, an undelivered call report. Losing one degrades
 * recovery; throwing would end the session.
 */
import logger from './logger';

/** @returns the stored value, or `null` if absent or storage is unavailable. */
export function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (err) {
    logger.debug(`safeGetItem('${key}') failed: ${describe(err)}`);
    return null;
  }
}

/**
 * @returns `true` when the value was stored. Callers that need to know whether
 * the write survived — a persisted queue, for instance — can branch on it;
 * callers writing a hint can ignore it.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (err) {
    // Most often quota exceeded, or storage unavailable in private mode.
    logger.info(`safeSetItem('${key}') failed: ${describe(err)}`);
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    logger.debug(`safeRemoveItem('${key}') failed: ${describe(err)}`);
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
