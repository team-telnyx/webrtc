import {
  clearReconnectToken,
  getReconnectSessionId,
  getReconnectToken,
  RECONNECT_SESSION_ID_MAX_AGE_MS,
  setReconnectSessionId,
  setReconnectToken,
  getActiveCallsRecoveryMarker,
  setActiveCallsRecoveryMarker,
  clearActiveCallsRecoveryMarker,
  RECOVERY_MARKER_MAX_AGE_MS,
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
});

describe('active-calls recovery marker storage', () => {
  afterEach(() => {
    clearActiveCallsRecoveryMarker();
  });

  it('returns empty markers and null sessid when nothing is stored', () => {
    const result = getActiveCallsRecoveryMarker();
    expect(result.markers).toEqual([]);
    expect(result.sessid).toBeNull();
  });

  it('round-trips a set then a get', () => {
    const now = Date.now();
    setActiveCallsRecoveryMarker(
      [
        {
          id: 'call-a',
          state: 'active',
          direction: 'outbound',
          options: { telnyxSessionId: 'tsid-a' },
        },
        {
          id: 'call-b',
          state: 'active',
          direction: 'inbound',
        },
      ],
      'sess-1',
      now
    );

    const result = getActiveCallsRecoveryMarker(now);
    // getActiveCallsRecoveryMarker clears storage after reading.
    expect(result.markers.length).toBe(2);
    expect(result.sessid).toBe('sess-1');

    const a = result.markers.find((m) => m.id === 'call-a');
    expect(a).toBeDefined();
    expect(a.state).toBe('active');
    expect(a.direction).toBe('outbound');
    expect((a.options as Record<string, unknown>)?.telnyxSessionId).toBe(
      'tsid-a'
    );

    const b = result.markers.find((m) => m.id === 'call-b');
    expect(b).toBeDefined();
    expect(b.state).toBe('active');
  });

  it('drops records older than RECOVERY_MARKER_MAX_AGE_MS and clears storage', () => {
    const baseTime = 1000000;
    setActiveCallsRecoveryMarker(
      [{ id: 'old-call', state: 'active' }],
      'sess-old',
      baseTime
    );

    // Just inside the deadline → returned.
    let result = getActiveCallsRecoveryMarker(
      baseTime + RECOVERY_MARKER_MAX_AGE_MS
    );
    expect(result.markers.length).toBe(1);

    // Re-set because the previous read cleared storage.
    setActiveCallsRecoveryMarker(
      [{ id: 'old-call', state: 'active' }],
      'sess-old',
      baseTime
    );

    // Just past the deadline → cleared and empty.
    result = getActiveCallsRecoveryMarker(
      baseTime + RECOVERY_MARKER_MAX_AGE_MS + 1
    );
    expect(result.markers.length).toBe(0);

    // Storage keys should have been removed.
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls-stored-at')
    ).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls-sessid')
    ).toBeNull();
  });

  it('clearActiveCallsRecoveryMarker removes all keys', () => {
    setActiveCallsRecoveryMarker(
      [{ id: 'c', state: 'active' }],
      's'
    );
    // getActiveCallsRecoveryMarker clears on read, so just test clear directly.
    clearActiveCallsRecoveryMarker();

    const result = getActiveCallsRecoveryMarker();
    expect(result.markers).toEqual([]);
    expect(result.sessid).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls-stored-at')
    ).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls-sessid')
    ).toBeNull();
  });

  it('returns empty markers and clears storage when the payload is malformed JSON', () => {
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls',
      'not-json{'
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-stored-at',
      String(Date.now())
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-sessid',
      'sess-1'
    );

    const result = getActiveCallsRecoveryMarker();
    expect(result.markers).toEqual([]);
    expect(result.sessid).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
  });

  it('returns empty markers and clears storage when the payload is not an array', () => {
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls',
      JSON.stringify({ id: 'x', state: 'active' })
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-stored-at',
      String(Date.now())
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-sessid',
      'sess-1'
    );

    const result = getActiveCallsRecoveryMarker();
    expect(result.markers).toEqual([]);
    expect(result.sessid).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
  });

  it('filters out individual records missing the required id field', () => {
    const now = Date.now();
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls',
      JSON.stringify([
        { id: 'good', state: 'active' },
        { state: 'active' }, // missing id
        { id: 123, state: 'active' }, // id not a string
        'not-an-object',
        null,
      ])
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-stored-at',
      String(now)
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-sessid',
      'sess-1'
    );

    const result = getActiveCallsRecoveryMarker(now);
    expect(result.markers.length).toBe(1);
    expect(result.markers[0].id).toBe('good');
    expect(result.sessid).toBe('sess-1');
  });

  it('setActiveCallsRecoveryMarker with an empty array clears storage (no dead state)', () => {
    setActiveCallsRecoveryMarker(
      [{ id: 'c', state: 'active' }],
      's'
    );

    setActiveCallsRecoveryMarker([], 's');
    const result = getActiveCallsRecoveryMarker();
    expect(result.markers).toEqual([]);
    expect(result.sessid).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
  });

  it('does not throw when sessionStorage getItem throws', () => {
    const original = sessionStorage.getItem;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sessionStorage as any).getItem = jest.fn(() => {
      throw new Error('blocked');
    });

    expect(() => getActiveCallsRecoveryMarker()).not.toThrow();
    const result = getActiveCallsRecoveryMarker();
    expect(result.markers).toEqual([]);
    expect(result.sessid).toBeNull();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sessionStorage as any).getItem = original;
  });

  it('does not throw when sessionStorage setItem throws', () => {
    const original = sessionStorage.setItem;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sessionStorage as any).setItem = jest.fn(() => {
      throw new Error('blocked');
    });

    expect(() =>
      setActiveCallsRecoveryMarker([{ id: 'c', state: 'active' }], 's')
    ).not.toThrow();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sessionStorage as any).setItem = original;
    // Clean up any partial state (write semantics vary by mock timing).
    clearActiveCallsRecoveryMarker();
  });

  it('clears storage immediately after a successful read (at-most-once)', () => {
    const now = Date.now();
    setActiveCallsRecoveryMarker(
      [{ id: 'call-x', state: 'active' }],
      'sess-x',
      now
    );

    // First read returns the marker and clears storage.
    const first = getActiveCallsRecoveryMarker(now);
    expect(first.markers.length).toBe(1);
    expect(first.sessid).toBe('sess-x');

    // Second read sees nothing — storage was cleared by the first.
    const second = getActiveCallsRecoveryMarker(now);
    expect(second.markers).toEqual([]);
    expect(second.sessid).toBeNull();
  });
});
