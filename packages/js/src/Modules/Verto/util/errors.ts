/**
 * Structured error codes and types for the Telnyx WebRTC SDK.
 *
 * All call-related errors are surfaced via the `SwEvent.Error` ('telnyx.error')
 * event with a `TelnyxError` instance attached.
 */

export interface ITelnyxError {
  /** Numeric error code (e.g. 40001) */
  code: number;
  /** Machine-readable error name (e.g. 'SdpCreateOfferFailed') */
  name: string;
  /** Short description of what failed */
  description: string;
  /** Longer explanation of the failure context */
  explanation: string;
  /** Human-readable message combining code + description */
  message: string;
  /** Possible root causes */
  causes: string[];
  /** Suggested remediation steps */
  solutions: string[];
  /** The original error that triggered this, if any */
  originalError?: unknown;
  /** Whether the operation can be retried */
  canRetry: boolean;
}

export class TelnyxError extends Error implements ITelnyxError {
  public readonly code: number;
  public readonly description: string;
  public readonly explanation: string;
  public readonly causes: string[];
  public readonly solutions: string[];
  public readonly originalError?: unknown;
  public readonly canRetry: boolean;

  constructor(params: Omit<ITelnyxError, 'message'> & { message?: string }) {
    const message =
      params.message ||
      `[${params.code}] ${params.name}: ${params.description}`;
    super(message);

    this.name = params.name;
    this.code = params.code;
    this.description = params.description;
    this.explanation = params.explanation;
    this.causes = params.causes;
    this.solutions = params.solutions;
    this.originalError = params.originalError;
    this.canRetry = params.canRetry;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, TelnyxError.prototype);
  }

  toJSON(): ITelnyxError {
    return {
      code: this.code,
      name: this.name,
      description: this.description,
      explanation: this.explanation,
      message: this.message,
      causes: this.causes,
      solutions: this.solutions,
      originalError: this.originalError,
      canRetry: this.canRetry,
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
 * - 440xx — Call-control errors (hold, transfer, bye)
 */
export const SDK_ERRORS = {
  // ── SDP errors (400xx) ──────────────────────────────────────────────
  40001: {
    name: 'SdpCreateOfferFailed',
    description: 'Failed to create SDP offer.',
    explanation: 'The browser was unable to generate a local SDP offer.',
    causes: [
      'Browser WebRTC API error',
      'Missing or invalid media constraints',
    ],
    solutions: [
      'Check getUserMedia permissions',
      'Verify ICE server configuration',
    ],
    canRetry: true,
  },
  40002: {
    name: 'SdpCreateAnswerFailed',
    description: 'Failed to create SDP answer.',
    explanation: 'The browser was unable to generate a local SDP answer.',
    causes: ['Browser WebRTC API error', 'Invalid remote SDP offer'],
    solutions: ['Retry the call', 'Check browser WebRTC compatibility'],
    canRetry: true,
  },
  40003: {
    name: 'SdpSetLocalDescriptionFailed',
    description: 'Failed to set local SDP description.',
    explanation: 'setLocalDescription() was rejected by the browser.',
    causes: ['Malformed SDP', 'Browser state inconsistency'],
    solutions: ['Retry the call'],
    canRetry: true,
  },
  40004: {
    name: 'SdpSetRemoteDescriptionFailed',
    description: 'Failed to set remote SDP description.',
    explanation:
      'setRemoteDescription() was rejected; the remote SDP may be malformed.',
    causes: ['Malformed remote SDP', 'Browser codec mismatch'],
    solutions: ['Retry the call', 'Check codec configuration'],
    canRetry: true,
  },
  40005: {
    name: 'SdpSendFailed',
    description: 'Failed to send SDP to the server.',
    explanation:
      'The Invite or Answer message could not be delivered via signaling.',
    causes: ['WebSocket connection lost', 'Server error'],
    solutions: ['Check network connectivity', 'Retry the call'],
    canRetry: true,
  },

  // ── Media / device errors (420xx) ───────────────────────────────────
  42001: {
    name: 'MediaMicrophonePermissionDenied',
    description: 'Microphone access was denied.',
    explanation: 'The user denied microphone permission.',
    causes: [
      'User denied browser permission prompt',
      'OS-level microphone access disabled',
    ],
    solutions: ['Ask user to grant microphone permission in browser settings'],
    canRetry: false,
  },
  42002: {
    name: 'MediaDeviceNotFound',
    description: 'No microphone device found.',
    explanation: 'The requested audio input device is not available.',
    causes: [
      'No microphone connected',
      'Device was disconnected',
      'Invalid deviceId',
    ],
    solutions: [
      'Check that a microphone is connected',
      'Select a valid audio input device',
    ],
    canRetry: false,
  },
  42003: {
    name: 'MediaGetUserMediaFailed',
    description: 'Failed to acquire local media stream.',
    explanation: 'getUserMedia() was rejected for an unexpected reason.',
    causes: ['Browser error', 'Device in use by another application'],
    solutions: ['Close other applications using the microphone', 'Retry'],
    canRetry: true,
  },

  // ── Peer connection errors (430xx) ──────────────────────────────────
  43001: {
    name: 'PeerConnectionFailed',
    description: 'WebRTC peer connection failed and could not be recovered.',
    explanation:
      'RTCPeerConnection entered the failed state and all reconnection/ICE restart attempts were exhausted.',
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
    canRetry: true,
  },

  // ── Call-control errors (440xx) ─────────────────────────────────────
  44001: {
    name: 'HoldFailed',
    description: 'Failed to put the call on hold.',
    explanation: 'The server rejected or did not respond to the hold request.',
    causes: ['Server error', 'WebSocket connection lost during hold'],
    solutions: ['Retry the hold operation', 'Check network connectivity'],
    canRetry: true,
  },
  44003: {
    name: 'ByeSendFailed',
    description: 'Failed to send BYE to the server.',
    explanation:
      'The hangup signal could not be delivered; the call was terminated locally.',
    causes: ['WebSocket connection lost before BYE sent'],
    solutions: [
      'No action needed — call is terminated locally',
      'Check network connectivity',
    ],
    canRetry: false,
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
  originalError?: unknown
): TelnyxError {
  const entry = SDK_ERRORS[code];
  return new TelnyxError({
    code,
    name: entry.name,
    description: entry.description,
    explanation: entry.explanation,
    causes: [...entry.causes],
    solutions: [...entry.solutions],
    canRetry: entry.canRetry,
    originalError,
  });
}
