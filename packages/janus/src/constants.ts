export const PROD_HOST = 'wss://rtcdev.telnyx.com:443/v2';
// TODO point to dev server when it's ready
export const DEV_HOST = 'wss://rtcdev.telnyx.com:443/v2';
export const WS_PROTOCOL = 'janus-protocol';
export enum Environment {
  production = 'production',
  development = 'development',
}

export enum ConnectionEvents {
  StateChange = 'state-change',
  Message = 'message',
  error = 'error',
}

export const STORAGE_PREFIX = '@telnyx:';

export const STUN_SERVER = { urls: 'stun:stun.telnyx.com:3478' };
export const TURN_SERVER = {
  urls: 'turn:turn.telnyx.com:3478?transport=tcp',
  username: 'testuser',
  credential: 'testpassword',
};

export enum SwEvent {
  // Socket Events
  SocketOpen = 'telnyx.socket.open',
  SocketClose = 'telnyx.socket.close',
  SocketError = 'telnyx.socket.error',
  SocketMessage = 'telnyx.socket.message',

  // Internal events
  SpeedTest = 'telnyx.internal.speedtest',

  // Global Events
  DTMF = 'telnyx.dtmf',
  Ready = 'telnyx.ready',
  Error = 'telnyx.error',
  Notification = 'telnyx.notification',
  RegisterStateChange = 'telnyx.register.stateChange',

  // Blade Events
  Messages = 'telnyx.messages',
  Calls = 'telnyx.calls',

  // RTC Events
  MediaError = 'telnyx.rtc.mediaError',
}
