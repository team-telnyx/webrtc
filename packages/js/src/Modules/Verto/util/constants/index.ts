export * from './errorCodes';
export const STORAGE_PREFIX = '@telnyx:';
export const ADD = 'add';
export const REMOVE = 'remove';
export const SESSION_ID = 'sessId';
export const TIME_CALL_INVITE = 'Time to call invite';
export const PROD_HOST = 'wss://rtc.telnyx.com';
export const DEV_HOST = 'wss://rtcdev.telnyx.com';

/**
 * WebSocket close status codes (RFC 6455)
 * https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4.1
 */
export const WS_CLOSE_CODES = {
  NORMAL_CLOSURE: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED_DATA: 1003,
  NO_STATUS_RECEIVED: 1005,
  ABNORMAL_CLOSURE: 1006,
  INVALID_FRAME_PAYLOAD: 1007,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  INTERNAL_ERROR: 1011,
} as const;
export const GOOGLE_STUN_SERVER = { urls: 'stun:stun.l.google.com:19302' };
export const STUN_SERVER = { urls: 'stun:stun.telnyx.com:3478' };
export const STUN_DEV_SERVER = { urls: 'stun:stundev.telnyx.com:3478' };
// Individual Telnyx TURN servers. Both the prod and dev defaults (see
// DEFAULT_PROD_ICE_SERVERS / DEFAULT_DEV_ICE_SERVERS below) include TURN over
// UDP/3478 and TCP/3478, plus TURNS on 443 (TURN_TLS_443_SERVER) as a
// last-resort fallback for networks that block both 3478 transports. The two
// environments are kept in sync.
export const TURN_UDP_3478_SERVER = {
  urls: 'turn:turn.telnyx.com:3478?transport=udp',
  username: 'testuser',
  credential: 'testpassword',
};
export const TURN_TCP_3478_SERVER = {
  urls: 'turn:turn.telnyx.com:3478?transport=tcp',
  username: 'testuser',
  credential: 'testpassword',
};
export const TURN_SERVER = [TURN_UDP_3478_SERVER, TURN_TCP_3478_SERVER];
export const TURN_DEV_SERVER = [
  {
    urls: 'turn:turndev.telnyx.com:3478?transport=udp',
    username: 'testuser',
    credential: 'testpassword',
  },
  {
    urls: 'turn:turndev.telnyx.com:3478?transport=tcp',
    username: 'testuser',
    credential: 'testpassword',
  },
];
// TURN over TLS on port 443 — the last-resort fallback for restrictive
// firewalls that block both UDP/3478 and TCP/3478. No transport param, so the
// client negotiates transport.
export const TURN_TLS_443_SERVER = {
  urls: 'turns:turn2.telnyx.com:443',
  username: 'testuser',
  credential: 'testpassword',
};
// NOTE: the dev TURNS/443 endpoint may not gather any relay candidates in some
// dev environments — it is kept for parity with the prod list (harmless when it
// yields no candidates), but don't rely on TURNS/443 working in dev.
export const TURN_TLS_443_DEV_SERVER = {
  urls: 'turns:turndev.telnyx.com:443',
  username: 'testuser',
  credential: 'testpassword',
};

export const DEFAULT_PROD_ICE_SERVERS: RTCIceServer[] = [
  STUN_SERVER,
  GOOGLE_STUN_SERVER,
  ...TURN_SERVER,
  TURN_TLS_443_SERVER,
];

export const DEFAULT_DEV_ICE_SERVERS: RTCIceServer[] = [
  STUN_DEV_SERVER,
  GOOGLE_STUN_SERVER,
  ...TURN_DEV_SERVER,
  TURN_TLS_443_DEV_SERVER,
];

/**
 * Public catalog of Telnyx-provided ICE servers. Each entry is a ready-to-use
 * `RTCIceServer`. Import this and compose any combination into the `iceServers`
 * option of `TelnyxRTC` (client level) or `client.newCall()` (per call).
 *
 * These are building blocks only — picking a subset does NOT change the SDK's
 * built-in default (`DEFAULT_PROD_ICE_SERVERS`, used when `iceServers` is
 * omitted), which includes STUN + TURN UDP/3478 + TURN TCP/3478 + TURNS/443.
 * Treat the entries
 * as read-only; spread them into a new array rather than mutating in place.
 *
 * @example
 * ```js
 * import { TelnyxRTC, TELNYX_ICE_SERVERS } from '@telnyx/webrtc';
 *
 * const client = new TelnyxRTC({
 *   login_token: '<JWT>',
 *   iceServers: [
 *     TELNYX_ICE_SERVERS.TELNYX_STUN,
 *     TELNYX_ICE_SERVERS.TELNYX_TURN_UDP_3478,
 *     TELNYX_ICE_SERVERS.TELNYX_TURNS_TCP_443,
 *   ],
 * });
 * ```
 */
export const TELNYX_ICE_SERVERS = {
  GOOGLE_STUN: GOOGLE_STUN_SERVER,
  TELNYX_STUN: STUN_SERVER,
  TELNYX_TURN_UDP_3478: TURN_UDP_3478_SERVER,
  TELNYX_TURN_TCP_3478: TURN_TCP_3478_SERVER,
  TELNYX_TURNS_TCP_443: TURN_TLS_443_SERVER,
} as const;

export enum SwEvent {
  // Socket Events
  SocketOpen = 'telnyx.socket.open',
  SocketClose = 'telnyx.socket.close',
  SocketError = 'telnyx.socket.error',
  SocketMessage = 'telnyx.socket.message',

  // Internal events
  SpeedTest = 'telnyx.internal.speedtest',
  /** Emitted by Connection on every inbound WS message (before dispatch) */
  SocketActivity = 'telnyx.internal.socketActivity',

  // Global Events
  Ready = 'telnyx.ready',
  Error = 'telnyx.error',
  Warning = 'telnyx.warning',
  Notification = 'telnyx.notification',
  StatsFrame = 'telnyx.stats.frame',
  StatsReport = 'telnyx.stats.report',

  // Blade Events
  Messages = 'telnyx.messages',
  Calls = 'telnyx.calls',

  // RTC Events
  MediaError = 'telnyx.rtc.mediaError',
  PeerConnectionFailureError = 'telnyx.rtc.peerConnectionFailureError',
  PeerConnectionSignalingStateClosed = 'telnyx.rtc.peerConnectionSignalingStateClosed',

  // AI Conversation Events
  /** Emitted when an ai_conversation message is received from the backend */
  AIConversationMessage = 'telnyx.ai.conversation',
}
