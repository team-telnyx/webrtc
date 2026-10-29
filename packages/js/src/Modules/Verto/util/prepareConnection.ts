import { resolveSignalingHost } from './helpers';
import logger from './logger';

/**
 * Where the connection will be made: the same `host`, `env` and `region`
 * values the client is later constructed with. All optional; the defaults
 * are the production anycast signaling host.
 */
export interface IPrepareConnectionOptions {
  host?: string;
  env?: string;
  region?: string | null;
}

/**
 * The HTTPS URL of the signaling host these options connect to: the
 * WebSocket URL with its scheme swapped, so a plain request reaches the
 * listener the socket will open against.
 */
export function signalingHttpUrl(
  options: IPrepareConnectionOptions = {}
): string {
  return resolveSignalingHost(options).replace(/^ws(s?):\/\//i, 'http$1://');
}

/**
 * Warms up the path to the signaling host before a client exists: one
 * `HEAD` request resolves the name, opens TCP and completes the TLS
 * handshake. When `connect()` opens the WebSocket the browser already has
 * the address in its DNS cache, the certificate chain validated, and, where
 * the host issues TLS session tickets, a session to resume.
 *
 * The browser keeps a resolved address for about a minute (Chrome and
 * Firefox use their own 60 s cache; Safari follows the record TTL), so the
 * warm-up pays off when `connect()` follows within that window. Calling it
 * again later is cheap and harmless.
 *
 * The request is made in `no-cors` mode, so the status the host answers
 * with is irrelevant and never read; the resolved promise only means the
 * handshake completed. It never rejects: a failure resolves `false` and is
 * logged at debug level. It is a no-op outside environments with `fetch`.
 */
export async function prepareConnection(
  options: IPrepareConnectionOptions = {}
): Promise<boolean> {
  if (typeof fetch !== 'function') {
    return false;
  }

  const url = signalingHttpUrl(options);

  try {
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
    });
    logger.debug(`prepareConnection: warmed up ${url}`);
    return true;
  } catch (error) {
    logger.debug(`prepareConnection: could not reach ${url}`, error);
    return false;
  }
}
