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
 * Solution: Lock to the first interface (identified by `raddr` — the private IP
 * that sourced the candidate) and drop candidates from all other interfaces.
 * This is zero-config, works across all browsers, and adds no buffering delay.
 *
 * Enabled via `filterCandidatesByInterface: true` in SDK options.
 *
 * @see https://telnyx.atlassian.net/browse/ENGDESK-50518
 */
export class CandidateFilter {
  private _lockedRaddr: string | null = null;
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
            `Locked interface: ${this._lockedRaddr}`
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

    // Extract raddr (related address = private IP of the source interface)
    const raddr = this._extractRaddr(str);

    if (!raddr || raddr === '0.0.0.0') {
      // Can't determine interface (browser privacy mode) — pass through.
      // Worst case: no filtering, same behavior as today.
      this._passedCount++;
      this._onCandidate(event.candidate);
      return;
    }

    // Lock to first interface seen
    if (!this._lockedRaddr) {
      this._lockedRaddr = raddr;
      logger.info(`[CandidateFilter] Locked to interface: ${raddr}`);
    }

    if (raddr === this._lockedRaddr) {
      this._passedCount++;
      this._onCandidate(event.candidate);
    } else {
      this._filteredCount++;
      logger.debug(
        `[CandidateFilter] Dropped candidate from ${raddr} ` +
          `(locked: ${this._lockedRaddr}): ${str}`
      );
    }
  }

  /**
   * Reset filter state. Call on ICE restart or new call.
   */
  reset(): void {
    this._lockedRaddr = null;
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
   * Check if a candidate string is TCP-based.
   * TCP candidates are not used for media transport.
   */
  private _isTcpCandidate(candidateStr: string): boolean {
    // candidate format: foundation component protocol priority address port ...
    const parts = candidateStr.split(' ');
    return parts.length > 2 && parts[2].toLowerCase() === 'tcp';
  }
}
