import {
  clearReconnectToken,
  getLastSocketClose,
  getReconnectSessionId,
  getReconnectToken,
  RECONNECT_SESSION_ID_MAX_AGE_MS,
  setLastSocketClose,
  setReconnectSessionId,
  setReconnectToken,
} from '../util/reconnect';

describe('reconnect token storage', () => {
  it('keeps the voice_sdk_id available across page unloads in the browser session', () => {
    setReconnectToken('voice-sdk-id');

    window.dispatchEvent(new Event('beforeunload'));

    expect(getReconnectToken()).toBe('voice-sdk-id');

    clearReconnectToken();
  });

  it('keeps the previous sessid available for reconnect login and clears it with the token', () => {
    setReconnectToken('voice-sdk-id');
    setReconnectSessionId('previous-sessid');

    expect(getReconnectToken()).toBe('voice-sdk-id');
    expect(getReconnectSessionId()).toBe('previous-sessid');

    clearReconnectToken();

    expect(getReconnectToken()).toBeNull();
    expect(getReconnectSessionId()).toBeNull();
  });

  it('expires the previous sessid after 90 seconds', () => {
    setReconnectSessionId('previous-sessid', 1000);

    expect(getReconnectSessionId(1000 + RECONNECT_SESSION_ID_MAX_AGE_MS)).toBe(
      'previous-sessid'
    );
    expect(
      getReconnectSessionId(1001 + RECONNECT_SESSION_ID_MAX_AGE_MS)
    ).toBeNull();
  });

  it('stores the last socket close metadata in browser session storage', () => {
    setLastSocketClose({
      type: 'socket-close',
      code: 1006,
      codeName: 'ABNORMAL_CLOSURE',
      reason: 'network changed',
      wasClean: false,
    });

    expect(getLastSocketClose()).toEqual({
      type: 'socket-close',
      code: 1006,
      codeName: 'ABNORMAL_CLOSURE',
      reason: 'network changed',
      wasClean: false,
    });

    clearReconnectToken();
  });
});
