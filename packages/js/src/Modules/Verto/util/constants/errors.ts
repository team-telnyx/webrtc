/**
 * SDK error code registry.
 *
 * All entries are surfaced via `SwEvent.Error` ('telnyx.error') with level 'error'.
 * Per-entry runtime guarantee lives on `fatal`. `true` = terminal, `false` = SDK
 * handles or safe to ignore.
 *
 * Code ranges:
 * - 400xx — SDP negotiation errors
 * - 420xx — Media / device errors
 * - 440xx — Call-control errors (hold, bye, subscribe, call params)
 * - 450xx — WebSocket / transport errors
 * - 460xx — Authentication errors
 * - 480xx — Network errors
 */
type SdkErrorDefinition = {
  name: string;
  message: string;
  description: string;
  causes: readonly string[];
  solutions: readonly string[];
  fatal: boolean;
};

export const _SDK_ERRORS = {
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
    fatal: true,
  },
  40002: {
    name: 'SDP_CREATE_ANSWER_FAILED',
    message: 'Failed to answer the call',
    description:
      'The browser was unable to generate a local SDP answer. The remote offer may be invalid or the browser state inconsistent.',
    causes: ['Browser WebRTC API error', 'Invalid remote SDP offer'],
    solutions: ['Retry the call', 'Check browser WebRTC compatibility'],
    fatal: true,
  },
  40003: {
    name: 'SDP_SET_LOCAL_DESCRIPTION_FAILED',
    message: 'Failed to apply local call settings',
    description:
      'setLocalDescription() was rejected by the browser. The generated SDP may be malformed or the browser state may be inconsistent.',
    causes: ['Malformed SDP', 'Browser state inconsistency'],
    solutions: ['Retry the call'],
    fatal: true,
  },
  40004: {
    name: 'SDP_SET_REMOTE_DESCRIPTION_FAILED',
    message: 'Failed to apply remote call settings',
    description:
      'setRemoteDescription() was rejected by the browser. The remote SDP may be malformed or contain unsupported codecs.',
    causes: ['Malformed remote SDP', 'Browser codec mismatch'],
    solutions: ['Retry the call', 'Check codec configuration'],
    fatal: true,
  },
  40005: {
    name: 'SDP_SEND_FAILED',
    message: 'Failed to send call data to server',
    description:
      'The Invite or Answer message could not be delivered via the signaling WebSocket. The connection may have been lost.',
    causes: ['WebSocket connection lost', 'Server error'],
    solutions: ['Check network connectivity', 'Retry the call'],
    fatal: true,
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
    // Default: fatal. The media-recovery flow overrides to `false` at the
    // recovery emit site (Peer.ts); everywhere else a media failure is
    // terminal for that call.
    fatal: true,
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
    // Default: fatal. Recovery flow overrides to `false`.
    fatal: true,
  },
  42003: {
    name: 'MEDIA_GET_USER_MEDIA_FAILED',
    message: 'Failed to access microphone',
    description:
      'getUserMedia() was rejected for an unexpected reason. The device may be in use by another application or the browser encountered an internal error.',
    causes: ['Browser error', 'Device in use by another application'],
    solutions: ['Close other applications using the microphone', 'Retry'],
    // Default: fatal. Recovery flow overrides to `false`.
    fatal: true,
  },

  // ── Call-control errors (440xx) ─────────────────────────────────────
  44001: {
    name: 'HOLD_FAILED',
    message: 'Failed to hold the call',
    description:
      'The server rejected or did not respond to the hold request. The WebSocket connection may have been lost during the operation.',
    causes: ['Server error', 'WebSocket connection lost during hold'],
    solutions: ['Retry the hold operation', 'Check network connectivity'],
    fatal: false,
  },
  44002: {
    name: 'INVALID_CALL_PARAMETERS',
    message: 'Invalid call parameters',
    description:
      'The call could not be initiated because required parameters are missing or invalid. For example, no destination number was provided to newCall().',
    causes: [
      'Missing destinationNumber in call options',
      'Invalid or empty call parameters',
    ],
    solutions: [
      'Provide a valid destinationNumber when calling newCall()',
      'Check the call options object for required fields',
    ],
    fatal: true,
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
    fatal: false,
  },
  44004: {
    name: 'SUBSCRIBE_FAILED',
    message: 'Failed to subscribe to call events',
    description:
      'The Verto subscribe request for the call channel failed. This may prevent receiving call state updates from the server.',
    causes: [
      'WebSocket connection lost during subscribe',
      'Server rejected the subscription request',
    ],
    solutions: ['Check network connectivity', 'Retry the call'],
    fatal: false,
  },
  44005: {
    name: 'PEER_CLOSED_DURING_INIT',
    message: 'Call was closed during setup',
    description:
      'The PeerConnection was closed (e.g. by hangup()) while peer.init() was still running. This is a race condition: an async operation such as setRemoteDescription, getUserMedia, or the media recovery flow yielded control, and close() ran during that gap. The init() cannot continue because the underlying RTCPeerConnection has been destroyed.',
    causes: [
      'call.hangup() or call.close() was called while the call was still setting up',
      'A WebSocket Bye message arrived during getUserMedia prompt or SDP negotiation',
      'User clicked hangup/decline before media permissions were granted',
    ],
    solutions: [
      'This is expected if the user intentionally hung up during setup — no action needed',
      'If this happens frequently without user action, check for automatic hangup triggers that may fire too early',
    ],
    fatal: true,
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
    // Rare path: `new WebSocket(...)` throws synchronously, so there is no
    // socket object for auto-reconnect to retry. Per the approved plan this
    // is terminal — clean up the session and mark fatal.
    fatal: true,
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
    // The SDK's auto-reconnect pipeline continues after this; not terminal.
    fatal: false,
  },
  45003: {
    name: 'RECONNECTION_EXHAUSTED',
    message: 'Unable to reconnect to server',
    description:
      'All automatic reconnection attempts have been exhausted. The SDK tried to re-establish the WebSocket connection multiple times but failed on every attempt.',
    causes: [
      'Prolonged network outage',
      'Server unreachable',
      'Firewall or proxy blocking reconnection',
    ],
    solutions: [
      'Check network connectivity',
      'Call client.disconnect() and client.connect() to manually retry',
      'Notify the user that the connection was lost',
    ],
    // The session is dead; active calls are torn down locally before emit.
    fatal: true,
  },
  45004: {
    name: 'GATEWAY_FAILED',
    message: 'Gateway connection failed',
    description:
      'The upstream gateway reported a FAILED, FAIL_WAIT, or TIMEOUT state. The signaling server could not establish or maintain a connection to the gateway. When autoReconnect is disabled, this is immediately fatal. When enabled, the SDK will retry until RECONNECTION_EXHAUSTED.',
    causes: [
      'Gateway down or unreachable',
      'Server-side infrastructure issue',
      'Network partition between signaling server and gateway',
    ],
    solutions: [
      'Wait for automatic reconnection (if autoReconnect is enabled)',
      'Call client.disconnect() and client.connect() to manually retry',
      'Check Telnyx service status',
    ],
    // SDK retries via skipLastVoiceSdkId + auto-reconnect. Not terminal until
    // retries are exhausted (which emits RECONNECTION_EXHAUSTED, fatal).
    fatal: false,
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
    // `_handleLoginError` retries automatically; not terminal. One emit site
    // (after RETRY_REGISTER_TIME is exhausted) overrides to `true`.
    fatal: false,
  },
  46002: {
    name: 'INVALID_CREDENTIALS',
    message: 'Invalid credential parameters',
    description:
      'The SDK rejected the login options before sending any request to the server. This is an internal client-side validation guard — the credentials object is missing required fields or has an invalid structure. No network request was made.',
    causes: [
      'Missing login and password fields',
      'Missing or malformed authentication token',
      'Invalid combination of credential fields in the options object',
    ],
    solutions: [
      'Provide valid login/password or a valid authentication token',
      'Check the TelnyxRTC constructor options against the documentation',
      'Ensure the credential object matches one of the supported auth modes (credentials, token, or anonymous)',
    ],
    // Bad options — nothing to retry. Terminal.
    fatal: true,
  },
  46003: {
    name: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication required',
    description:
      'The server rejected a request because the session is not authenticated. This can happen when the client sends a message (e.g. Invite, Subscribe, or Ping) before login completes, after a token expires mid-session, or after the server drops the authenticated state for any reason.',
    causes: [
      'Message sent before login completed',
      'Authentication token expired during the session',
      'Server-side session was invalidated',
      'WebSocket reconnected but re-authentication did not complete',
    ],
    solutions: [
      'Ensure the client is fully logged in before sending messages',
      'Re-authenticate using client.login() with fresh credentials',
      'Listen for telnyx.ready before making calls or sending requests',
    ],
    // SDK re-auths on reconnect; not terminal. One emit site (when
    // `_autoReconnect === false`) overrides to `true`.
    fatal: false,
  },

  // ── ICE restart errors (470xx) ─────────────────────────────────────
  47001: {
    name: 'ICE_RESTART_FAILED',
    message: 'ICE restart failed',
    description:
      'The ICE restart Modify request could not be sent or the server returned an error. The media path could not be recovered via ICE restart.',
    causes: [
      'WebSocket connection lost during ICE restart',
      'Server rejected the Modify request',
      'Timeout waiting for server response',
    ],
    solutions: [
      'The call may recover via WebSocket reconnect + Attach',
      'If the call does not recover, hang up and retry',
    ],
    // BaseCall only notifies SignalingHealth; the Signaling service owns the
    // recovery decision. Not terminal from BaseCall's perspective.
    fatal: false,
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
    // BrowserSession reconnects on the `online` event; not terminal.
    fatal: false,
  },

  // ── Session errors (485xx) ───────────────────────────────────────────
  48501: {
    name: 'SESSION_NOT_REATTACHED',
    message: 'Active call lost after reconnect',
    description:
      'The WebSocket reconnected successfully but the server did not reattach the active call session. The server no longer knows about the call, so any subsequent call-control operation (hangup, hold, etc.) will fail with CALL_DOES_NOT_EXIST. The call is unrecoverable and must be terminated locally.',
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
    // Server lost the call; the call is gone. Terminal.
    fatal: true,
  },

  // ── General / catch-all errors (490xx) ──────────────────────────────
  49001: {
    name: 'UNEXPECTED_ERROR',
    message: 'An unexpected error occurred',
    description:
      'An error was thrown that does not match any known SDK error category. This is a catch-all for unclassified failures.',
    causes: ['Unknown or unhandled error condition'],
    solutions: [
      'Check the originalError property for the underlying cause',
      'Report the issue if it persists',
    ],
    // Safe fallback when context is unknown; every emit site overrides
    // explicitly to make the intent clear at the call site.
    fatal: true,
  },
} as const;

/**
 * Compile-time guarantee that every entry in `SDK_ERRORS` conforms to
 * `SdkErrorDefinition` (in particular, that each one has `fatal: boolean`).
 *
 * `satisfies` (TS 4.9+) is unavailable on this repo's pinned TypeScript 4.7,
 * so we use a no-op helper that the type checker validates against the full
 * record type. This produces a compile error if any entry is missing `fatal`
 * (or any other required field) while keeping `SDK_ERRORS`'s literal-typed
 * keys via `as const`.
 */
const _assertSdkErrorsShape = (
  _errors: Record<string, SdkErrorDefinition>
): void => {
  void _errors;
};
_assertSdkErrorsShape(_SDK_ERRORS);

export const SDK_ERRORS = _SDK_ERRORS;
export type SdkErrorCode = keyof typeof SDK_ERRORS;
