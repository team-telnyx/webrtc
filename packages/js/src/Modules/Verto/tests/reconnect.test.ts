import {
  clearReconnectToken,
  getReconnectSessionId,
  getReconnectToken,
  RECONNECT_SESSION_ID_MAX_AGE_MS,
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

  it('scopes reconnect state by application-provided session key', () => {
    setReconnectToken('voice-sdk-user-2449', 'x-user-id:2449');
    setReconnectSessionId('sessid-user-2449', 'x-user-id:2449');
    setReconnectToken('voice-sdk-user-2093', 'x-user-id:2093');
    setReconnectSessionId('sessid-user-2093', 'x-user-id:2093');

    expect(getReconnectToken('x-user-id:2449')).toBe('voice-sdk-user-2449');
    expect(getReconnectSessionId('x-user-id:2449')).toBe('sessid-user-2449');
    expect(getReconnectToken('x-user-id:2093')).toBe('voice-sdk-user-2093');
    expect(getReconnectSessionId('x-user-id:2093')).toBe('sessid-user-2093');

    clearReconnectToken('x-user-id:2449');

    expect(getReconnectToken('x-user-id:2449')).toBeNull();
    expect(getReconnectSessionId('x-user-id:2449')).toBeNull();
    expect(getReconnectToken('x-user-id:2093')).toBe('voice-sdk-user-2093');
    expect(getReconnectSessionId('x-user-id:2093')).toBe('sessid-user-2093');

    clearReconnectToken('x-user-id:2093');
  });
});
