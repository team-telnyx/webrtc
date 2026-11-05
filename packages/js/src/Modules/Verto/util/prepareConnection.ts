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

/**
 * Options for `keepConnectionWarm`: where the connection will be made, and
 * how often to warm the path up again.
 */
export interface IKeepConnectionWarmOptions extends IPrepareConnectionOptions {
  /**
   * Milliseconds between warm-ups. Defaults to 50 000, under the minute a
   * browser keeps a resolved name; values below 1 000 are raised to 1 000.
   */
  intervalMs?: number;
}

/** Under the 60 s a browser keeps a resolved name, so a connect finds it in cache. */
export const DEFAULT_KEEP_WARM_INTERVAL_MS = 50_000;

/**
 * Keeps the path to the signaling host warm while the page waits to connect:
 * runs `prepareConnection` now and again every `intervalMs`, with the same
 * `host`, `env` and `region`. One warm-up lasts about a minute (the browser's
 * DNS cache; the signaling records themselves carry a TTL of seconds), so a
 * single call at page load does nothing for a connect that comes later. This
 * repeats it until stopped, at one `HEAD` request per interval per open tab.
 *
 * Returns a function that stops the repetition: call it once the client has
 * connected, or leave the warm-up running for the next connect. Where `fetch`
 * or timers are unavailable nothing is scheduled and the returned function is
 * a no-op.
 */
export function keepConnectionWarm(
  options: IKeepConnectionWarmOptions = {}
): () => void {
  const { intervalMs = DEFAULT_KEEP_WARM_INTERVAL_MS, ...target } = options;
  if (typeof fetch !== 'function' || typeof setInterval !== 'function') {
    return () => undefined;
  }

  void prepareConnection(target);
  const timer = setInterval(
    () => {
      void prepareConnection(target);
    },
    Math.max(1_000, intervalMs)
  );
  return () => clearInterval(timer);
}
