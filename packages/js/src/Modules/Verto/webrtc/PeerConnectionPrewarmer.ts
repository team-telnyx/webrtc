import logger from '../util/logger';
import { RTCPeerConnection } from '../util/webrtc';

/**
 * The subset of RTCConfiguration that decides whether a pre-gathered peer
 * connection can be reused. All of it is fixed at construction time as far as
 * ICE gathering is concerned, so a call whose configuration differs on any of
 * these cannot adopt a connection warmed for another.
 */
export interface PrewarmConfig {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  iceCandidatePoolSize?: number;
  bundlePolicy?: RTCBundlePolicy;
}

/**
 * Holds one idle RTCPeerConnection so its ICE candidate pool has time to gather
 * before a call needs it.
 *
 * `iceCandidatePoolSize` only pays off when there is wall-clock time between
 * constructing the peer connection and calling setLocalDescription: the pool is
 * gathered in the background from construction onwards, and whatever it has
 * finished by then is reused instead of re-gathered. In the normal flow the peer
 * connection is built inside newCall() and the offer follows about 40ms later,
 * which is not enough for a STUN round trip and nowhere near enough for a TURN
 * allocation — so the pool costs sockets and gives nothing back. Warming one at
 * client init turns those 40ms into however long the user takes to place a call.
 *
 * Deliberately holds exactly one. A second idle connection would double the
 * sockets and TURN allocations to save nothing: a call adopts one, and the next
 * one is warmed immediately afterwards.
 */
export class PeerConnectionPrewarmer {
  /**
   * How long a warmed connection is considered usable.
   *
   * TURN allocations expire (commonly 600s, refreshed only while something holds
   * them) and any network change — Wi-Fi to cellular, VPN up or down, docking —
   * silently invalidates every gathered candidate. Handing a call a connection
   * whose candidates no longer route is far worse than gathering fresh, so the
   * window is kept well inside both.
   */
  static MAX_AGE_MS = 60_000;

  private _instance: RTCPeerConnection | null = null;
  private _fingerprint: string | null = null;
  private _createdAt = 0;

  /**
   * Warm a connection for `config`, replacing any existing one that no longer
   * matches. A no-op when a matching, fresh connection is already held.
   */
  prewarm(config: PrewarmConfig): void {
    const fingerprint = PeerConnectionPrewarmer.fingerprint(config);
    if (this._instance && this._fingerprint === fingerprint && !this._isStale()) {
      return;
    }

    this.dispose();

    try {
      this._instance = RTCPeerConnection(config as RTCConfiguration);
      this._fingerprint = fingerprint;
      this._createdAt = Date.now();
      logger.debug('Prewarmed peer connection', config);
    } catch (error) {
      // Never let warming break the client: the call path builds its own
      // connection anyway, so a failure here costs latency, not function.
      logger.warn('Could not prewarm peer connection', error);
      this._instance = null;
      this._fingerprint = null;
    }
  }

  /**
   * Hand over the warmed connection if it was gathered for this exact
   * configuration and is still fresh, otherwise null. The prewarmer releases
   * ownership: the caller closes it from here on.
   */
  take(config: PrewarmConfig): RTCPeerConnection | null {
    if (!this._instance) return null;

    if (this._fingerprint !== PeerConnectionPrewarmer.fingerprint(config)) {
      // A per-call override — forceRelayCandidate, or call-level iceServers —
      // means the pooled candidates were gathered under the wrong policy.
      logger.debug('Prewarmed peer connection does not match call config');
      this.dispose();
      return null;
    }

    if (this._isStale()) {
      logger.debug('Prewarmed peer connection is stale');
      this.dispose();
      return null;
    }

    if (this._instance.connectionState === 'closed') {
      this.dispose();
      return null;
    }

    const instance = this._instance;
    this._instance = null;
    this._fingerprint = null;
    return instance;
  }

  dispose(): void {
    if (this._instance) {
      try {
        this._instance.close();
      } catch (error) {
        logger.warn('Could not close prewarmed peer connection', error);
      }
    }
    this._instance = null;
    this._fingerprint = null;
    this._createdAt = 0;
  }

  private _isStale(): boolean {
    return Date.now() - this._createdAt > PeerConnectionPrewarmer.MAX_AGE_MS;
  }

  /**
   * Stable key for the gathering-relevant configuration. iceServers are
   * order-insensitive here: the same servers listed differently still gather the
   * same candidates.
   */
  static fingerprint(config: PrewarmConfig): string {
    const servers = (config.iceServers || [])
      .map((server) => {
        const urls = Array.isArray(server.urls) ? [...server.urls] : [server.urls];
        return `${urls.sort().join(',')}|${server.username || ''}|${server.credential || ''}`;
      })
      .sort();

    return JSON.stringify({
      servers,
      iceTransportPolicy: config.iceTransportPolicy || 'all',
      iceCandidatePoolSize: config.iceCandidatePoolSize || 0,
      bundlePolicy: config.bundlePolicy || 'balanced',
    });
  }
}
