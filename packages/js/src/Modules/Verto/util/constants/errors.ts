/**
 * SDK error code registry.
 *
 * All entries are surfaced via `SwEvent.Error` ('telnyx.error') with level 'error'.
 * These represent unrecoverable failures that terminate or prevent a call.
 *
 * Code ranges:
 * - 400xx — SDP negotiation errors
 * - 420xx — Media / device errors
 * - 440xx — Call-control errors (hold, bye)
 * - 450xx — WebSocket / transport errors
 * - 460xx — Authentication errors
 * - 480xx — Network errors
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

  // ── WebSocket / transport errors (450xx) ────────────────────────────
  45001: {
    name: 'WEBSOCKET_CONNECTION_FAILED',
    message: 'Unable to connect to server',
    description:
      'The WebSocket connection to the signaling server could not be established. The server may be unreachable, the URL may be incorrect, or a firewall may be blocking the connection.',
    causes: [
      'Server unreachable',
      'Incorrect WebSocket URL',
      'Firewall blocking WebSocket connections',
      'Network interruption',
    ],
    solutions: [
      'Check network connectivity',
      'Verify the signaling server URL',
      'Ensure WebSocket connections are not blocked by a firewall',
    ],
  },
  45002: {
    name: 'WEBSOCKET_ERROR',
    message: 'Connection to server lost',
    description:
      'An error occurred on the WebSocket connection after it was established. The connection may have been dropped due to network issues or server-side closure.',
    causes: [
      'Network interruption',
      'Server closed the connection',
      'Idle timeout',
    ],
    solutions: [
      'Check network connectivity',
      'SDK will attempt automatic reconnection if configured',
    ],
  },

  // ── Authentication errors (460xx) ───────────────────────────────────
  46001: {
    name: 'LOGIN_FAILED',
    message: 'Authentication failed',
    description:
      'The login request was rejected by the server. The credentials may be invalid, expired, or the account may be suspended.',
    causes: [
      'Invalid credentials (username/password or token)',
      'Expired authentication token',
      'Account suspended or disabled',
    ],
    solutions: [
      'Verify credentials',
      'Generate a new authentication token',
      'Check account status',
    ],
  },

  // ── Network errors (480xx) ──────────────────────────────────────────
  48001: {
    name: 'NETWORK_OFFLINE',
    message: 'Device is offline',
    description:
      'The browser reported that the device has lost network connectivity (navigator.onLine === false). All WebSocket and media connections will fail until the network is restored.',
    causes: [
      'Wi-Fi or ethernet disconnected',
      'Airplane mode enabled',
      'Network interface went down',
    ],
    solutions: [
      'Check network connectivity',
      'Reconnect to Wi-Fi or ethernet',
      'Disable airplane mode',
    ],
  },
} as const;

export type SdkErrorCode = keyof typeof SDK_ERRORS;
