/**
 * Enum for TelnyxRTC's call states. These should be ordered and auto-incrementing.
 * @hidden
 */
export enum TelnyxRTCCallState {
  new = 1,
  requesting,
  trying,
  recovering,
  ringing,
  answering,
  early,
  active,
  held,
  hangup,
  destroy,
  purge,
}

/**
 * @hidden
 */
export enum Direction {
  inbound = 'inbound',
  outbound = 'outbound',
}

/**
 * @hidden
 */
export enum Message {
  display = 'display',
  info = 'info',
  pvtEvent = 'pvtEvent',
  clientReady = 'clientReady',
}

export default {
  states: Object.freeze({
    [TelnyxRTCCallState.new]: {
      [TelnyxRTCCallState.requesting]: 1,
      [TelnyxRTCCallState.recovering]: 1,
      [TelnyxRTCCallState.ringing]: 1,
      [TelnyxRTCCallState.destroy]: 1,
      [TelnyxRTCCallState.answering]: 1,
      [TelnyxRTCCallState.hangup]: 1,
    },
    [TelnyxRTCCallState.requesting]: {
      [TelnyxRTCCallState.trying]: 1,
      [TelnyxRTCCallState.hangup]: 1,
    },
    [TelnyxRTCCallState.recovering]: {
      [TelnyxRTCCallState.answering]: 1,
      [TelnyxRTCCallState.hangup]: 1,
    },
    [TelnyxRTCCallState.trying]: {
      [TelnyxRTCCallState.active]: 1,
      [TelnyxRTCCallState.early]: 1,
      [TelnyxRTCCallState.hangup]: 1,
    },
    [TelnyxRTCCallState.ringing]: {
      [TelnyxRTCCallState.answering]: 1,
      [TelnyxRTCCallState.hangup]: 1,
    },
    [TelnyxRTCCallState.answering]: {
      [TelnyxRTCCallState.active]: 1,
      [TelnyxRTCCallState.hangup]: 1,
    },
    [TelnyxRTCCallState.active]: {
      [TelnyxRTCCallState.answering]: 1,
      [TelnyxRTCCallState.requesting]: 1,
      [TelnyxRTCCallState.hangup]: 1,
      [TelnyxRTCCallState.held]: 1,
    },
    [TelnyxRTCCallState.held]: {
      [TelnyxRTCCallState.hangup]: 1,
      [TelnyxRTCCallState.active]: 1,
    },
    [TelnyxRTCCallState.early]: {
      [TelnyxRTCCallState.hangup]: 1,
      [TelnyxRTCCallState.active]: 1,
    },
    [TelnyxRTCCallState.hangup]: {
      [TelnyxRTCCallState.destroy]: 1,
    },
    [TelnyxRTCCallState.destroy]: {},
    [TelnyxRTCCallState.purge]: {
      [TelnyxRTCCallState.destroy]: 1,
    },
  }),

  state: TelnyxRTCCallState,

  direction: Direction,

  message: Message,
};
