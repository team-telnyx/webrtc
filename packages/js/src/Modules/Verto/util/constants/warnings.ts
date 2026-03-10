/**
 * SDK warning code registry.
 *
 * Warnings represent degraded conditions that may recover automatically.
 * They do not terminate the call — the call may still succeed or fail
 * with a terminal error later.
 *
 * Code ranges:
 * - 410xx — ICE connectivity warnings
 * - 430xx — Peer connection warnings
 */
export const SDK_WARNINGS = {
  // ── ICE warnings (410xx) ────────────────────────────────────────────
  41002: {
    name: 'ICE_NO_CANDIDATES',
    message: 'No ICE candidates gathered',
    description:
      'No ICE candidates were gathered after sending the initial SDP. This may indicate a firewall blocking STUN/TURN traffic or no available network interface. The call may still succeed on retry.',
    causes: [
      'Firewall blocking all STUN/TURN traffic',
      'No network interface available',
      'VPN blocking UDP',
    ],
    solutions: [
      'Check STUN/TURN server reachability',
      'Ensure UDP traffic is not blocked',
      'Use forceRelayCandidate option',
    ],
  },
  41003: {
    name: 'ICE_GATHERING_TIMEOUT',
    message: 'ICE gathering timed out',
    description:
      'ICE candidate gathering did not complete within the safety timeout after sending the initial SDP. This is typically caused by network restrictions blocking STUN/TURN. The call may still succeed if candidates arrive late.',
    causes: [
      'Firewall blocking STUN/TURN',
      'Network unreachable',
      'STUN/TURN server not responding',
    ],
    solutions: [
      'Check STUN/TURN server reachability',
      'Ensure UDP traffic is not blocked',
      'Try forceRelayCandidate option',
    ],
  },
} as const;

export type SdkWarningCode = keyof typeof SDK_WARNINGS;
