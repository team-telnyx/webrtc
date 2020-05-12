export const STORAGE_PREFIX = '@telnyx:'
export const ADD = 'add'
export const REMOVE = 'remove'
export const SESSION_ID = 'sessId'

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

  // Blade Events
  Messages = 'telnyx.messages',
  Calls = 'telnyx.calls',

  // RTC Events
  MediaError = 'telnyx.rtc.mediaError',
}

export enum BladeMethod {
  Broadcast = 'blade.broadcast',
  Disconnect = 'blade.disconnect'
}
