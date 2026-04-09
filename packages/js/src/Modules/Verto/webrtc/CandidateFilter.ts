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
 * Solution: Lock to a specific interface (by index or first available) and drop
 * candidates from all others. Interface is identified by `raddr` (private IP),
 * falling back to `network-id` when raddr is anonymized (e.g. relay-only mode
 * where raddr is 0.0.0.0). This is zero-config, works across all browsers,
 * and adds no buffering delay.
 *
 * Enabled via `singleInterfaceIce: true` (first interface) or
 * `singleInterfaceIce: 0|1|2|3` (specific interface by index) in SDK options.
 *
 * @see https://github.com/team-telnyx/webrtc/pull/558
 */
/**
 * raddr value when the browser anonymizes the related address.
 */
const ANONYMIZED_RADDR = '0.0.0.0';

interface BufferedCandidate {
  candidate: RTCIceCandidate;
  interfaceKey: string;
}

export class CandidateFilter {
  private _lockedInterface: string | null = null;
  private _enabled: boolean;
  private _targetInterfaceIndex: number | null = null;
  private _seenInterfaces: string[] = [];
  private _bufferedCandidates: BufferedCandidate[] = [];
  private _onCandidate: (candidate: RTCIceCandidate) => void;
  private _onEndOfCandidates: () => void;
  private _filteredCount: number = 0;
  private _passedCount: number = 0;

  constructor(
    enabled: boolean | number,
    onCandidate: (candidate: RTCIceCandidate) => void,
    onEndOfCandidates: () => void
  ) {
    // Handle boolean | number union type
    if (typeof enabled === 'number') {
      this._enabled = true;
      this._targetInterfaceIndex = enabled;
    } else {
      this._enabled = enabled;
      this._targetInterfaceIndex = null; // Lock to first interface seen
    }
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
      // If gathering completes before we locked, lock to first available interface
      if (this._enabled && !this._lockedInterface && this._seenInterfaces.length > 0) {
        const targetIndex = this._targetInterfaceIndex ?? 0;
        // When target is out of range, fall back to first interface (index 0)
        const fallbackIndex = targetIndex < this._seenInterfaces.length ? targetIndex : 0;
        this._lockedInterface = this._seenInterfaces[fallbackIndex];
        if (fallbackIndex !== targetIndex) {
          logger.warn(
            `[CandidateFilter] Requested interface index ${targetIndex} not available, ` +
              `falling back to index 0: ${this._lockedInterface}`
          );
        }
        this._flushBuffer();
      }

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

    // Track this interface if we haven't seen it before
    const isNewInterface = !this._seenInterfaces.includes(interfaceKey);
    if (isNewInterface) {
      this._seenInterfaces.push(interfaceKey);
    }

    // Determine which interface to lock to
    if (!this._lockedInterface) {
      const targetIndex = this._targetInterfaceIndex ?? 0;

      // If we haven't seen enough interfaces yet, buffer this candidate
      if (this._seenInterfaces.length - 1 < targetIndex) {
        this._bufferedCandidates.push({ candidate: event.candidate, interfaceKey });
        logger.debug(
          `[CandidateFilter] Buffering candidate from ${interfaceKey} ` +
            `(waiting for interface index ${targetIndex})`
        );
        return;
      }

      // Lock to the interface at the target index
      const targetInterface = this._seenInterfaces[targetIndex];
      if (targetInterface) {
        this._lockedInterface = targetInterface;
        logger.info(
          `[CandidateFilter] Locked to interface index ${targetIndex}: ${targetInterface}`
        );
      } else {
        // Fallback: target index out of range, use first interface
        this._lockedInterface = this._seenInterfaces[0];
        logger.warn(
          `[CandidateFilter] Requested interface index ${targetIndex} not available, ` +
            `falling back to index 0: ${this._lockedInterface}`
        );
      }

      // Flush buffered candidates, keeping only those from locked interface
      this._flushBuffer();
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
   * Flush buffered candidates after lock is established.
   * All buffered candidates are passed through (they arrived before lock).
   */
  private _flushBuffer(): void {
    for (const buffered of this._bufferedCandidates) {
      this._passedCount++;
      this._onCandidate(buffered.candidate);
    }
    this._bufferedCandidates = [];
  }

  /**
   * Reset filter state. Call on ICE restart or new call.
   */
  reset(): void {
    this._lockedInterface = null;
    this._seenInterfaces = [];
    this._bufferedCandidates = [];
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
