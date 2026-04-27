/**
 * Named constants for SDK error and warning codes.
 *
 * SDK consumers should import these instead of hard-coding numeric literals
 * in comparisons against `telnyx.error` and `telnyx.warning` event payloads.
 */

export const TELNYX_ERROR_CODES = {
  // ── SDP errors (400xx) ──────────────────────────────────────────────
  SDP_CREATE_OFFER_FAILED: 40001,
  SDP_CREATE_ANSWER_FAILED: 40002,
  SDP_SET_LOCAL_DESCRIPTION_FAILED: 40003,
  SDP_SET_REMOTE_DESCRIPTION_FAILED: 40004,
  SDP_SEND_FAILED: 40005,

  // ── Media / device errors (420xx) ───────────────────────────────────
  MEDIA_MICROPHONE_PERMISSION_DENIED: 42001,
  MEDIA_DEVICE_NOT_FOUND: 42002,
  MEDIA_GET_USER_MEDIA_FAILED: 42003,

  // ── Call-control errors (440xx) ─────────────────────────────────────
  HOLD_FAILED: 44001,
  INVALID_CALL_PARAMETERS: 44002,
  BYE_SEND_FAILED: 44003,
  SUBSCRIBE_FAILED: 44004,

  // ── WebSocket / transport errors (450xx) ────────────────────────────
  WEBSOCKET_CONNECTION_FAILED: 45001,
  WEBSOCKET_ERROR: 45002,
  RECONNECTION_EXHAUSTED: 45003,
  GATEWAY_FAILED: 45004,

  // ── Authentication errors (460xx) ───────────────────────────────────
  LOGIN_FAILED: 46001,
  INVALID_CREDENTIALS: 46002,
  AUTHENTICATION_REQUIRED: 46003,

  // ── Network errors (480xx) ──────────────────────────────────────────
  NETWORK_OFFLINE: 48001,

  // ── General / catch-all errors (490xx) ──────────────────────────────
  UNEXPECTED_ERROR: 49001,
} as const;

export const TELNYX_WARNING_CODES = {
  // ── Network quality warnings (310xx) ────────────────────────────────
  HIGH_RTT: 31001,
  HIGH_JITTER: 31002,
  HIGH_PACKET_LOSS: 31003,
  LOW_MOS: 31004,

  // ── Connection / data-flow warnings (320xx) ─────────────────────────
  LOW_BYTES_RECEIVED: 32001,
  LOW_BYTES_SENT: 32002,

  // ── Call connection warnings (330xx) ─────────────────────────────────
  ICE_CONNECTIVITY_LOST: 33001,
  ICE_GATHERING_TIMEOUT: 33002,
  ICE_GATHERING_EMPTY: 33003,
  PEER_CONNECTION_FAILED: 33004,
  ONLY_HOST_ICE_CANDIDATES: 33005,
  ANSWER_WHILE_PEER_ACTIVE: 33006,

  // ── Authentication warnings (340xx) ─────────────────────────────────
  TOKEN_EXPIRING_SOON: 34001,

  // ── Session / reconnection warnings (350xx) ─────────────────────────
  SESSION_NOT_REATTACHED: 35001,
} as const;

// Extract constants to simplify how we use them internally
export const {
  SDP_CREATE_OFFER_FAILED,
  SDP_CREATE_ANSWER_FAILED,
  SDP_SET_LOCAL_DESCRIPTION_FAILED,
  SDP_SET_REMOTE_DESCRIPTION_FAILED,
  SDP_SEND_FAILED,
  MEDIA_MICROPHONE_PERMISSION_DENIED,
  MEDIA_DEVICE_NOT_FOUND,
  MEDIA_GET_USER_MEDIA_FAILED,
  HOLD_FAILED,
  INVALID_CALL_PARAMETERS,
  BYE_SEND_FAILED,
  SUBSCRIBE_FAILED,
  WEBSOCKET_CONNECTION_FAILED,
  WEBSOCKET_ERROR,
  RECONNECTION_EXHAUSTED,
  GATEWAY_FAILED,
  LOGIN_FAILED,
  INVALID_CREDENTIALS,
  AUTHENTICATION_REQUIRED,
  NETWORK_OFFLINE,
  UNEXPECTED_ERROR,
} = TELNYX_ERROR_CODES;

export const {
  HIGH_RTT,
  HIGH_JITTER,
  HIGH_PACKET_LOSS,
  LOW_MOS,
  LOW_BYTES_RECEIVED,
  LOW_BYTES_SENT,
  ICE_CONNECTIVITY_LOST,
  ICE_GATHERING_TIMEOUT,
  ICE_GATHERING_EMPTY,
  PEER_CONNECTION_FAILED,
  ONLY_HOST_ICE_CANDIDATES,
  ANSWER_WHILE_PEER_ACTIVE,
  TOKEN_EXPIRING_SOON,
  SESSION_NOT_REATTACHED,
} = TELNYX_WARNING_CODES;

/**
 * Regex to detect non-host ICE candidates (srflx, prflx, or relay) in SDP.
 * Used to check if only host candidates were gathered.
 */
export const HAS_NON_HOST_ICE_CANDIDATE_REGEX =
  /^a=candidate:.+typ (srflx|prflx|relay)/m;
