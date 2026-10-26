import { getDefaultIceServers } from './constants';
import { resolveSignalingHost } from './helpers';

/**
 * Extracts the hostname from a WebSocket (`wss://host[:port]/…`), ICE
 * (`turn:host:3478?transport=udp`, `turns:host:443`, `stun:host:19302`) or
 * plain `host` string. Returns `null` for anything else.
 */
export function hostnameOf(url: string): string | null {
  const m =
    /^(?:[a-z][a-z0-9+.-]*:)?\/\/([^/:?#]+)|^(?:turns?|stun):([^:?#/]+)|^([^/:?#]+)$/i.exec(
      url.trim()
    );
  return m ? m[1] || m[2] || m[3] || null : null;
}

/**
 * The hosts a session with these options will resolve before it can
 * register and make a call: the signaling host and the ICE server hosts.
 */
export function hostsToPrefetch(options: {
  host?: string;
  env?: string;
  region?: string | null;
  iceServers?: RTCIceServer[];
}): string[] {
  const iceServers =
    options.iceServers ?? getDefaultIceServers(options.env, options.region);
  const urls = iceServers.flatMap((server) =>
    Array.isArray(server.urls) ? server.urls : [server.urls]
  );
  const hosts = [resolveSignalingHost(options), ...urls]
    .map(hostnameOf)
    .filter((h): h is string => !!h);
  return Array.from(new Set(hosts));
}

/**
 * Inserts a `<link rel="dns-prefetch">` for each host into `document.head`,
 * once per host, so the browser resolves them while the application is
 * still getting ready to call `connect()`.
 *
 * The signaling zone's records have a 5-second TTL, so the first lookup on a
 * cold start is almost always a resolver cache miss that costs a round trip
 * to the authoritative server before the WebSocket can even open. A hint in
 * the DOM moves that lookup off the critical path for any application that
 * constructs the client before it connects. It is a no-op outside a browser
 * and harmless when `connect()` follows immediately.
 */
export function prefetchDns(hosts: string[]): void {
  if (typeof document === 'undefined' || !document.head) {
    return;
  }

  for (const host of hosts) {
    const href = `//${host}`;
    if (
      document.head.querySelector(`link[rel="dns-prefetch"][href="${href}"]`)
    ) {
      continue;
    }
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
}
