/**
 * Structured error codes and types for the Telnyx WebRTC SDK.
 *
 * All call-related errors are surfaced via the `SwEvent.Error` ('telnyx.error')
 * event with a `TelnyxError` instance attached.
 */

export interface ITelnyxError {
  /** Numeric error code (e.g. 40001) */
  code: number;
  /** Machine-readable error name in UPPER_SNAKE_CASE (e.g. 'SDP_CREATE_OFFER_FAILED') */
  name: string;
  /** Full explanation of the error — what happened and why */
  description: string;
  /** Short human-readable message suitable for UI alerts */
  message: string;
  /** Possible root causes */
  causes: string[];
  /** Suggested remediation steps */
  solutions: string[];
  /** The original error that triggered this, if any */
  originalError?: unknown;
}

export class TelnyxError extends Error implements ITelnyxError {
  public readonly code: number;
  public readonly description: string;
  public readonly causes: string[];
  public readonly solutions: string[];
  public readonly originalError?: unknown;

  constructor(params: Omit<ITelnyxError, 'message'> & { message?: string }) {
    const message = params.message || `[${params.code}] ${params.name}`;
    super(message);

    this.name = params.name;
    this.code = params.code;
    this.description = params.description;
    this.causes = params.causes;
    this.solutions = params.solutions;
    this.originalError = params.originalError;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, TelnyxError.prototype);
  }

  toJSON(): ITelnyxError {
    return {
      code: this.code,
      name: this.name,
      description: this.description,
      message: this.message,
      causes: this.causes,
      solutions: this.solutions,
      originalError: this.originalError,
    };
  }
}

/**
 * Full registry of SDK error codes.
 *
 * Code ranges:
 * - 400xx — SDP negotiation errors
 * - 420xx — Media / device errors
 * - 430xx — Peer connection errors
 * - 440xx — Call-control errors (hold, bye)
 */
export const SDK_ERRORS = {
  // ── SDP errors (400xx) ──────────────────────────────────────────────
  40001: {
    name: 'SDP_CREATE_OFFER_FAILED',
    message: 'Failed to create call offer',
    description:
      'The browser was unable to generate a local SDP offer. This typically indicates a WebRTC API error or invalid media constraints.',
    causes: [
      'Browser WebRTC API error',
      'Missing or invalid media constraints',
    ],
    solutions: [
      'Check getUserMedia permissions',
      'Verify ICE server configuration',
    ],
  },
  40002: {
    name: 'SDP_CREATE_ANSWER_FAILED',
    message: 'Failed to answer the call',
    description:
      'The browser was unable to generate a local SDP answer. The remote offer may be invalid or the browser state inconsistent.',
    causes: ['Browser WebRTC API error', 'Invalid remote SDP offer'],
    solutions: ['Retry the call', 'Check browser WebRTC compatibility'],
  },
  40003: {
    name: 'SDP_SET_LOCAL_DESCRIPTION_FAILED',
    message: 'Failed to apply local call settings',
    description:
      'setLocalDescription() was rejected by the browser. The generated SDP may be malformed or the browser state may be inconsistent.',
    causes: ['Malformed SDP', 'Browser state inconsistency'],
    solutions: ['Retry the call'],
  },
  40004: {
    name: 'SDP_SET_REMOTE_DESCRIPTION_FAILED',
    message: 'Failed to process remote call settings',
    description:
      'setRemoteDescription() was rejected by the browser. The remote SDP may be malformed or contain unsupported codecs.',
    causes: ['Malformed remote SDP', 'Browser codec mismatch'],
    solutions: ['Retry the call', 'Check codec configuration'],
  },
  40005: {
    name: 'SDP_SEND_FAILED',
    message: 'Failed to send call data to server',
    description:
      'The Invite or Answer message could not be delivered via the signaling WebSocket. The connection may have been lost.',
    causes: ['WebSocket connection lost', 'Server error'],
    solutions: ['Check network connectivity', 'Retry the call'],
  },

  // ── Media / device errors (420xx) ───────────────────────────────────
  42001: {
    name: 'MEDIA_MICROPHONE_PERMISSION_DENIED',
    message: 'Microphone access denied',
    description:
      'The user or operating system denied microphone permission. The browser permission prompt was dismissed or OS-level access is disabled.',
    causes: [
      'User denied browser permission prompt',
      'OS-level microphone access disabled',
    ],
    solutions: ['Ask user to grant microphone permission in browser settings'],
  },
  42002: {
    name: 'MEDIA_DEVICE_NOT_FOUND',
    message: 'No microphone found',
    description:
      'The requested audio input device is not available. No microphone is connected, the device was disconnected, or an invalid deviceId was specified.',
    causes: [
      'No microphone connected',
      'Device was disconnected',
      'Invalid deviceId',
    ],
    solutions: [
      'Check that a microphone is connected',
      'Select a valid audio input device',
    ],
  },
  42003: {
    name: 'MEDIA_GET_USER_MEDIA_FAILED',
    message: 'Failed to access microphone',
    description:
      'getUserMedia() was rejected for an unexpected reason. The device may be in use by another application or the browser encountered an internal error.',
    causes: ['Browser error', 'Device in use by another application'],
    solutions: ['Close other applications using the microphone', 'Retry'],
  },

  // ── Peer connection errors (430xx) ──────────────────────────────────
  43001: {
    name: 'PEER_CONNECTION_FAILED',
    message: 'Connection failed',
    description:
      'RTCPeerConnection entered the failed state. This may be caused by ICE failure, DTLS handshake failure, or a prolonged network interruption.',
    causes: [
      'ICE failure after reconnect exhausted',
      'DTLS handshake failure',
      'Prolonged network interruption',
    ],
    solutions: [
      'Check network connectivity',
      'Verify TURN server credentials',
      'Retry the call',
    ],
  },

  // ── Call-control errors (440xx) ─────────────────────────────────────
  44001: {
    name: 'HOLD_FAILED',
    message: 'Failed to hold the call',
    description:
      'The server rejected or did not respond to the hold request. The WebSocket connection may have been lost during the operation.',
    causes: ['Server error', 'WebSocket connection lost during hold'],
    solutions: ['Retry the hold operation', 'Check network connectivity'],
  },
  44003: {
    name: 'BYE_SEND_FAILED',
    message: 'Failed to hang up cleanly',
    description:
      'The hangup signal could not be delivered to the server. The call was terminated locally but the server may not be aware.',
    causes: ['WebSocket connection lost before BYE sent'],
    solutions: [
      'No action needed — call is terminated locally',
      'Check network connectivity',
    ],
  },
} as const;

export type SdkErrorCode = keyof typeof SDK_ERRORS;

/**
 * Factory that creates a `TelnyxError` from a registered error code.
 *
 * @param code - One of the numeric keys from `SDK_ERRORS`
 * @param originalError - The underlying error, if available
 */
export function createTelnyxError(
  code: SdkErrorCode,
  originalError?: unknown,
  message?: string
): TelnyxError {
  const entry = SDK_ERRORS[code];
  return new TelnyxError({
    code,
    name: entry.name,
    description: entry.description,
    message: message || entry.message,
    causes: [...entry.causes],
    solutions: [...entry.solutions],
    originalError,
  });
}
