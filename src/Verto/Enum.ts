/**
 * Enum for Verto's call states. These should be ordered and auto-incrementing.
 * @hidden
 */
export enum VertoCallState {
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
    [VertoCallState.new]: {
      [VertoCallState.requesting]: 1,
      [VertoCallState.recovering]: 1,
      [VertoCallState.ringing]: 1,
      [VertoCallState.destroy]: 1,
      [VertoCallState.answering]: 1,
      [VertoCallState.hangup]: 1,
    },
    [VertoCallState.requesting]: {
      [VertoCallState.trying]: 1,
      [VertoCallState.hangup]: 1,
    },
    [VertoCallState.recovering]: {
      [VertoCallState.answering]: 1,
      [VertoCallState.hangup]: 1,
    },
    [VertoCallState.trying]: {
      [VertoCallState.active]: 1,
      [VertoCallState.early]: 1,
      [VertoCallState.hangup]: 1,
    },
    [VertoCallState.ringing]: {
      [VertoCallState.answering]: 1,
      [VertoCallState.hangup]: 1,
    },
    [VertoCallState.answering]: {
      [VertoCallState.active]: 1,
      [VertoCallState.hangup]: 1,
    },
    [VertoCallState.active]: {
      [VertoCallState.answering]: 1,
      [VertoCallState.requesting]: 1,
      [VertoCallState.hangup]: 1,
      [VertoCallState.held]: 1,
    },
    [VertoCallState.held]: {
      [VertoCallState.hangup]: 1,
      [VertoCallState.active]: 1,
    },
    [VertoCallState.early]: {
      [VertoCallState.hangup]: 1,
      [VertoCallState.active]: 1,
    },
    [VertoCallState.hangup]: {
      [VertoCallState.destroy]: 1,
    },
    [VertoCallState.destroy]: {},
    [VertoCallState.purge]: {
      [VertoCallState.destroy]: 1,
    },
  }),

  state: VertoCallState,

  direction: Direction,

  message: Message,
};
