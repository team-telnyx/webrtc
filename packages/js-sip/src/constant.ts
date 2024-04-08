export const TELNYX_WS_URL_PROD: string = "wss://sip.telnyx.com";
export const TELNYX_WS_URL_DEV: string = "wss://sipdev.telnyx.com:7443";
export enum SwEvent {
  // Socket Events
  SocketOpen = "telnyx.socket.open",
  SocketClose = "telnyx.socket.close",
  SocketError = "telnyx.socket.error",
  SocketMessage = "telnyx.socket.message",

  // Internal events
  SpeedTest = "telnyx.internal.speedtest",

  // Global Events
  Registering = "telnyx.register.registering",
  Registered = "telnyx.register.registered",

  Ready = "telnyx.ready",
  Closed = "telnyx.closed",
  Error = "telnyx.error",
  Notification = "telnyx.notification",

  // Blade Events
  Messages = "telnyx.messages",
  Calls = "telnyx.calls",

  // RTC Events
  MediaError = "telnyx.rtc.mediaError",
}

export const stunServers = {
  urls: ["stun:stun.telnyx.com:3478"],
};
export const turnServers = {
  urls: ["turn:turn.telnyx.com:3478?transport=tcp"],
  username: "turnuser",
  password: "turnpassword",
};
