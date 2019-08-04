export type CallState =
  | 'new'
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'held'
  | 'done';
export type Env = 'production' | 'development';
export type RTCElement = HTMLMediaElement | string | Function;
