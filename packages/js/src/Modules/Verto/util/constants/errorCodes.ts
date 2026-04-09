/**
 * Named constants for SDK error and warning codes.
 *
 * Use these instead of inline numeric literals when calling
 * `createTelnyxError()` or `createTelnyxWarning()`.
 *
 * Error codes reference `SDK_ERRORS` in `errors.ts`.
 * Warning codes reference `SDK_WARNINGS` in `warnings.ts`.
 */

import type { SdkErrorCode } from './errors';
import type { SdkWarningCode } from './warnings';

// ── SDP errors (400xx) ──────────────────────────────────────────────
export const SDP_CREATE_OFFER_FAILED: SdkErrorCode = 40001;
export const SDP_CREATE_ANSWER_FAILED: SdkErrorCode = 40002;
export const SDP_SET_LOCAL_DESCRIPTION_FAILED: SdkErrorCode = 40003;
export const SDP_SET_REMOTE_DESCRIPTION_FAILED: SdkErrorCode = 40004;
export const SDP_SEND_FAILED: SdkErrorCode = 40005;

// ── Media / device errors (420xx) ───────────────────────────────────
export const MEDIA_MICROPHONE_PERMISSION_DENIED: SdkErrorCode = 42001;
export const MEDIA_DEVICE_NOT_FOUND: SdkErrorCode = 42002;
export const MEDIA_GET_USER_MEDIA_FAILED: SdkErrorCode = 42003;

// ── Call-control errors (440xx) ─────────────────────────────────────
export const HOLD_FAILED: SdkErrorCode = 44001;
export const INVALID_CALL_PARAMETERS: SdkErrorCode = 44002;
export const BYE_SEND_FAILED: SdkErrorCode = 44003;
export const SUBSCRIBE_FAILED: SdkErrorCode = 44004;

// ── WebSocket / transport errors (450xx) ────────────────────────────
export const WEBSOCKET_CONNECTION_FAILED: SdkErrorCode = 45001;
export const WEBSOCKET_ERROR: SdkErrorCode = 45002;
export const RECONNECTION_EXHAUSTED: SdkErrorCode = 45003;
export const GATEWAY_FAILED: SdkErrorCode = 45004;

// ── Authentication errors (460xx) ───────────────────────────────────
export const LOGIN_FAILED: SdkErrorCode = 46001;
export const INVALID_CREDENTIALS: SdkErrorCode = 46002;
export const AUTHENTICATION_REQUIRED: SdkErrorCode = 46003;

// ── Network errors (480xx) ──────────────────────────────────────────
export const NETWORK_OFFLINE: SdkErrorCode = 48001;

// ── General / catch-all errors (490xx) ──────────────────────────────
export const UNEXPECTED_ERROR: SdkErrorCode = 49001;

// ── Network quality warnings (310xx) ────────────────────────────────
export const HIGH_RTT: SdkWarningCode = 31001;
export const HIGH_JITTER: SdkWarningCode = 31002;
export const HIGH_PACKET_LOSS: SdkWarningCode = 31003;
export const LOW_MOS: SdkWarningCode = 31004;

// ── Connection / data-flow warnings (320xx) ─────────────────────────
export const LOW_BYTES_RECEIVED: SdkWarningCode = 32001;
export const LOW_BYTES_SENT: SdkWarningCode = 32002;

// ── Call connection warnings (330xx) ─────────────────────────────────
export const ICE_CONNECTIVITY_LOST: SdkWarningCode = 33001;
export const ICE_GATHERING_TIMEOUT: SdkWarningCode = 33002;
export const ICE_GATHERING_EMPTY: SdkWarningCode = 33003;
export const PEER_CONNECTION_FAILED: SdkWarningCode = 33004;
export const ONLY_HOST_ICE_CANDIDATES: SdkWarningCode = 33005;

// ── Authentication warnings (340xx) ─────────────────────────────────
export const TOKEN_EXPIRING_SOON: SdkWarningCode = 34001;

// ── Session / reconnection warnings (350xx) ─────────────────────────
export const SESSION_NOT_REATTACHED: SdkWarningCode = 35001;

/**
 * Regex to detect non-host ICE candidates (srflx, prflx, or relay) in SDP.
 * Used to check if only host candidates were gathered.
 */
export const HAS_NON_HOST_ICE_CANDIDATE_REGEX =
  /^a=candidate:.+typ (srflx|prflx|relay)/m;
