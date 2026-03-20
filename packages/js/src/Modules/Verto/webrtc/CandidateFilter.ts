import logger from '../util/logger';

/**
 * ICE Candidate Interface Filter
 *
 * Mitigates DTLS handshake failures on multi-NIC clients by ensuring all
 * trickled ICE candidates originate from the same network interface.
 *
 * Problem: When a client has multiple network interfaces (e.g. WiFi + Ethernet),
 * the browser gathers ICE candidates from each. The B2BUA may select a candidate
 * from interface A while the client nominates a candidate from interface B,
 * causing a DTLS path mismatch and zero audio.
 *
 * Solution: Lock to the first interface and drop candidates from all others.
 * Interface is identified by `raddr` (private IP), falling back to `network-id`
 * when raddr is anonymized (e.g. relay-only mode where raddr is 0.0.0.0).
 * This is zero-config, works across all browsers, and adds no buffering delay.
 *
 * Enabled via `singleInterfaceIce: true` in SDK options.
 *
 * @see https://github.com/team-telnyx/webrtc/pull/558
 */
/**
 * raddr value when the browser anonymizes the related address.
 */
const ANONYMIZED_RADDR = '0.0.0.0';

export class CandidateFilter {
  private _lockedInterface: string | null = null;
  private _enabled: boolean;
  private _onCandidate: (candidate: RTCIceCandidate) => void;
  private _onEndOfCandidates: () => void;
  private _filteredCount: number = 0;
  private _passedCount: number = 0;

  constructor(
    enabled: boolean,
    onCandidate: (candidate: RTCIceCandidate) => void,
    onEndOfCandidates: () => void
  ) {
    this._enabled = enabled;
    this._onCandidate = onCandidate;
    this._onEndOfCandidates = onEndOfCandidates;
  }

  /**
   * Process an ICE candidate event from `pc.onicecandidate`.
   * Pass-through when disabled. When enabled, locks to the first
   * routable interface and drops candidates from other interfaces.
   */
  add(event: RTCPeerConnectionIceEvent): void {
    // null candidate = gathering complete
    if (!event.candidate || !event.candidate.candidate) {
      if (this._enabled && this._filteredCount > 0) {
        logger.info(
          `[CandidateFilter] Gathering complete. ` +
            `Passed: ${this._passedCount}, Filtered: ${this._filteredCount}, ` +
            `Locked interface: ${this._lockedInterface}`
        );
      }
      this._onEndOfCandidates();
      return;
    }

    // When disabled, pass everything through
    if (!this._enabled) {
      this._onCandidate(event.candidate);
      return;
    }

    const str = event.candidate.candidate;

    // Host candidates — always pass through.
    // They carry private IPs that the B2BUA drops via ACL anyway,
    // but some srflx candidates depend on host being present.
    if (str.includes('typ host')) {
      this._onCandidate(event.candidate);
      return;
    }

    // TCP candidates — drop. Not used for media transport.
    if (this._isTcpCandidate(str)) {
      return;
    }

    // Determine interface identifier.
    // Primary: raddr (private IP of source interface).
    // Fallback: network-id (Chrome extension, useful when raddr is 0.0.0.0
    // e.g. relay-only mode with iceTransportPolicy: 'relay').
    const raddr = this._extractRaddr(str);
    const networkId = this._extractNetworkId(str);
    const interfaceKey =
      raddr && raddr !== ANONYMIZED_RADDR ? raddr : networkId;

    if (!interfaceKey) {
      // Can't determine interface at all — pass through.
      this._passedCount++;
      this._onCandidate(event.candidate);
      return;
    }

    // Lock to first interface seen
    if (!this._lockedInterface) {
      this._lockedInterface = interfaceKey;
      logger.info(`[CandidateFilter] Locked to interface: ${interfaceKey}`);
    }

    if (interfaceKey === this._lockedInterface) {
      this._passedCount++;
      this._onCandidate(event.candidate);
    } else {
      this._filteredCount++;
      logger.debug(
        `[CandidateFilter] Dropped candidate from ${interfaceKey} ` +
          `(locked: ${this._lockedInterface}): ${str}`
      );
    }
  }

  /**
   * Reset filter state. Call on ICE restart or new call.
   */
  reset(): void {
    this._lockedInterface = null;
    this._filteredCount = 0;
    this._passedCount = 0;
  }

  /**
   * Extract `raddr` value from an ICE candidate string.
   * raddr is the related address (private IP of the source interface).
   */
  private _extractRaddr(candidateStr: string): string | null {
    const match = candidateStr.match(/raddr (\S+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract `network-id` from an ICE candidate string.
   * network-id is a Chrome extension that identifies the source interface.
   * Used as fallback when raddr is anonymized (0.0.0.0).
   */
  private _extractNetworkId(candidateStr: string): string | null {
    const match = candidateStr.match(/network-id (\d+)/);
    return match ? `network-id:${match[1]}` : null;
  }

  /**
   * Check if a candidate string is TCP-based.
   * TCP candidates are not used for media transport.
   */
  private _isTcpCandidate(candidateStr: string): boolean {
    // candidate format: foundation component protocol priority address port ...
    const parts = candidateStr.split(' ');
    return parts.length > 2 && parts[2].toLowerCase() === 'tcp';
  }
}
