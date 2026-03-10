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
// UDP preferred for lower latency, TCP as fallback for restrictive firewalls
export const TURN_SERVER = [
  {
    urls: 'turn:turn.telnyx.com:3478?transport=udp',
    username: 'testuser',
    credential: 'testpassword',
  },
  {
    urls: 'turn:turn.telnyx.com:3478?transport=tcp',
    username: 'testuser',
    credential: 'testpassword',
  },
];
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

export const DEFAULT_PROD_ICE_SERVERS: RTCIceServer[] = [
  STUN_SERVER,
  GOOGLE_STUN_SERVER,
  ...TURN_SERVER,
];

export const DEFAULT_DEV_ICE_SERVERS: RTCIceServer[] = [
  STUN_DEV_SERVER,
  GOOGLE_STUN_SERVER,
  ...TURN_DEV_SERVER,
];

export enum SwEvent {
  // Socket Events
  SocketOpen = 'telnyx.socket.open',
  SocketClose = 'telnyx.socket.close',
  SocketError = 'telnyx.socket.error',
  SocketMessage = 'telnyx.socket.message',

  // Internal events
  SpeedTest = 'telnyx.internal.speedtest',

  // Global Events
  Ready = 'telnyx.ready',
  Error = 'telnyx.error',
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
}
