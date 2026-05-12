/**
 * SDK warning code registry.
 *
 * Warnings represent degraded conditions that may cause unstable
 * connections or bad call experience. They are surfaced via the
 * `SwEvent.Warning` ('telnyx.warning') event as plain objects
 * (not Error instances).
 *
 * Code ranges:
 * - 310xx — Network quality warnings
 * - 320xx — Connection / data-flow warnings
 * - 330xx — Call connection warnings
 * - 340xx — Authentication warnings
 * - 350xx — Session / reconnection warnings
 */

export interface ITelnyxWarning {
  /** Numeric warning code (e.g. 31001) */
  code: SdkWarningCode;
  /** Machine-readable name in UPPER_SNAKE_CASE */
  name: string;
  /** Short human-readable message for UI alerts */
  message: string;
  /** Full explanation of the warning */
  description: string;
  /** Possible root causes */
  causes: string[];
  /** Suggested remediation steps */
  solutions: string[];
}

export interface ITelnyxWarningEvent {
  /** Structured SDK warning */
  warning: ITelnyxWarning;
  /** Current SDK session identifier */
  sessionId: string;
  /** Call identifier when the warning is associated with a call */
  callId?: string;
}

export const SDK_WARNINGS = {
  // ── Network quality warnings (310xx) ────────────────────────────────
  31001: {
    name: 'HIGH_RTT',
    message: 'High network latency detected',
    description:
      'Round-trip time (RTT) exceeded the threshold for multiple consecutive samples. High latency causes perceptible audio delays.',
    causes: [
      'Poor network connection',
      'Geographic distance to media server',
      'Network congestion',
    ],
    solutions: [
      'Check network connectivity',
      'Use a wired connection instead of Wi-Fi',
      'Close bandwidth-heavy applications',
    ],
  },
  31002: {
    name: 'HIGH_JITTER',
    message: 'High jitter detected',
    description:
      'Jitter (variability in packet arrival time) exceeded the threshold for multiple consecutive samples. High jitter causes crackling and choppy audio.',
    causes: [
      'Network congestion',
      'Unstable Wi-Fi connection',
      'Overloaded network equipment',
    ],
    solutions: [
      'Use a wired connection instead of Wi-Fi',
      'Close bandwidth-heavy applications',
      'Check network equipment',
    ],
  },
  31003: {
    name: 'HIGH_PACKET_LOSS',
    message: 'High packet loss detected',
    description:
      'Packet loss exceeded the threshold for multiple consecutive samples. High packet loss causes choppy audio or dropped calls.',
    causes: [
      'Network congestion',
      'Unstable connection',
      'Firewall or QoS misconfiguration',
    ],
    solutions: [
      'Check network connectivity',
      'Use a wired connection',
      'Contact network administrator',
    ],
  },
  31004: {
    name: 'LOW_MOS',
    message: 'Low call quality score',
    description:
      'Mean Opinion Score (MOS) dropped below the acceptable threshold for multiple consecutive samples. This is a composite indicator of overall call quality.',
    causes: [
      'Combination of high latency, jitter, and/or packet loss',
      'Poor network conditions',
    ],
    solutions: [
      'Check network connectivity',
      'Use a wired connection',
      'Close bandwidth-heavy applications',
    ],
  },

  // ── Connection / data-flow warnings (320xx) ─────────────────────────
  32001: {
    name: 'LOW_BYTES_RECEIVED',
    message: 'No audio data received',
    description:
      'No bytes have been received from the remote party for multiple consecutive seconds. This may indicate a network interruption or remote-side issue.',
    causes: [
      'Network interruption',
      'Remote party microphone issue',
      'Firewall blocking inbound media',
    ],
    solutions: [
      'Check network connectivity',
      'Ask remote party to check their microphone',
      'Check firewall rules for media ports',
    ],
  },
  32002: {
    name: 'LOW_BYTES_SENT',
    message: 'No audio data being sent',
    description:
      'No bytes have been sent for multiple consecutive seconds. This may indicate a local microphone issue or network interruption.',
    causes: [
      'Microphone muted or disconnected',
      'Network interruption',
      'Local media track ended',
    ],
    solutions: [
      'Check that the microphone is not muted',
      'Verify the microphone is still connected',
      'Check network connectivity',
    ],
  },

  // ── Call connection warnings (330xx) ─────────────────────────────────
  33001: {
    name: 'ICE_CONNECTIVITY_LOST',
    message: 'Connection interrupted',
    description:
      'The ICE connection transitioned to the disconnected state. The previously selected connection path was lost and renegotiation may be required. The connection may recover automatically.',
    causes: [
      'Temporary network interruption',
      'Network interface change (e.g. Wi-Fi to cellular)',
      'NAT rebinding',
    ],
    solutions: ['Wait for automatic recovery', 'Check network connectivity'],
  },
  33002: {
    name: 'ICE_GATHERING_TIMEOUT',
    message: 'ICE gathering timed out',
    description:
      'ICE candidate gathering did not complete within the safety timeout. This is typically caused by network restrictions blocking STUN/TURN. The call may still succeed if candidates arrive late.',
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
  33003: {
    name: 'ICE_GATHERING_EMPTY',
    message: 'No ICE candidates gathered',
    description:
      'No ICE candidates were gathered after sending the initial SDP. This may indicate a firewall blocking all STUN/TURN traffic or no available network interface.',
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

  33004: {
    name: 'PEER_CONNECTION_FAILED',
    message: 'Connection failed',
    description:
      'RTCPeerConnection entered the failed state. This is a recoverable condition — the SDK may attempt ICE restart or the connection may recover. If it does not recover, the call will eventually be terminated.',
    causes: [
      'ICE failure',
      'DTLS handshake failure',
      'Prolonged network interruption',
    ],
    solutions: [
      'Wait for automatic recovery',
      'Check network connectivity',
      'Verify TURN server credentials',
    ],
  },

  33005: {
    name: 'ONLY_HOST_ICE_CANDIDATES',
    message: 'Only local network candidates available',
    description:
      'ICE gathering completed but only host (local network) candidates were collected — no server-reflexive (srflx) or relay (turn) candidates were found. This typically means the STUN/TURN servers are unreachable, which will prevent connections outside the local network.',
    causes: [
      'STUN/TURN servers unreachable',
      'Firewall blocking UDP traffic to STUN/TURN servers',
      'Incorrect TURN server configuration or credentials',
      'Restrictive corporate network or VPN',
    ],
    solutions: [
      'Verify STUN/TURN server URLs and credentials',
      'Ensure UDP traffic to STUN/TURN ports is not blocked',
      'Check firewall or VPN settings',
      'Try using TCP-based TURN as a fallback',
    ],
  },
  33006: {
    name: 'ANSWER_WHILE_PEER_ACTIVE',
    message: 'Call answer ignored because a peer connection is already active',
    description:
      'answer() was called on a call that already has an active or connecting peer connection. Creating a second peer connection for the same call would duplicate media negotiation, confuse the remote party, and break call reporting. This is typically caused by application code invoking answer() multiple times (e.g. from multiple event handlers).',
    causes: [
      'Application called answer() twice on the same call object',
      'Multiple click handlers or event listeners triggering answer()',
    ],
    solutions: [
      'Ensure answer() is called only once per call',
      'Disable the answer button after the first click',
      'Check that answer() is not invoked from multiple event handlers',
    ],
  },
  33007: {
    name: 'DUPLICATE_INBOUND_ANSWER',
    message:
      'Call answer ignored because another inbound call is already being answered for this credential',
    description:
      'answer() was called on an inbound call while another inbound call for the same SDK credential is already answering or active in this JavaScript runtime. Answering both legs can trigger SIP 486 USER_BUSY / LOSE_RACE when duplicate WebSocket registrations receive the same incoming call.',
    causes: [
      'Multiple TelnyxRTC instances using the same credential in the same page',
      'Application code recreating a client without disconnecting the previous instance',
      'Duplicate inbound call notifications produced by duplicate WebSocket registrations',
    ],
    solutions: [
      'Keep a single active TelnyxRTC instance per credential',
      'Call disconnect() before replacing an SDK client instance',
      'Only call answer() for one inbound call notification at a time per credential',
    ],
  },

  // ── Authentication warnings (340xx) ─────────────────────────────────
  34001: {
    name: 'TOKEN_EXPIRING_SOON',
    message: 'Authentication token expiring soon',
    description:
      'The authentication token is approaching its expiration time. If the token expires the connection will be lost and calls will fail. A new token should be generated before expiration.',
    causes: ['Token was issued with a limited lifetime'],
    solutions: [
      'Generate a new authentication token',
      'Reconnect with fresh credentials before the token expires',
    ],
  },

  // ── Session / reconnection warnings (350xx) ─────────────────────────
  35001: {
    name: 'SESSION_NOT_REATTACHED',
    message: 'Active call lost after reconnect',
    description:
      'The WebSocket reconnected successfully but the server returned an empty reattached_sessions list while the SDK still has an active call. The server no longer knows about the call, so any subsequent call-control operation (hangup, hold, etc.) will fail with CALL_DOES_NOT_EXIST.',
    causes: [
      'Server-side session expired during the disconnection window',
      'Reconnect token was invalidated',
      'Backend restarted or lost in-memory call state',
    ],
    solutions: [
      'Terminate the local call and notify the user',
      'Start a new call',
      'Investigate why the session was not preserved on the server',
    ],
  },
} as const;

export type SdkWarningCode = keyof typeof SDK_WARNINGS;

type WarningEntry = (typeof SDK_WARNINGS)[SdkWarningCode];

/**
 * Creates a warning object from a registered warning code.
 *
 * @param code - One of the numeric keys from `SDK_WARNINGS`
 * @param message - Optional override for the default message
 * @returns A plain `ITelnyxWarning` object (not an Error)
 */
export function createTelnyxWarning(
  code: SdkWarningCode,
  message?: string
): ITelnyxWarning {
  const entry: WarningEntry = SDK_WARNINGS[code];
  return {
    code,
    name: entry.name,
    message: message || entry.message,
    description: entry.description,
    causes: [...entry.causes],
    solutions: [...entry.solutions],
  };
}
