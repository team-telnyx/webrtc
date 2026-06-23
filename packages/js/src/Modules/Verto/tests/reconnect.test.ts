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

  it('returns an empty array when nothing is stored', () => {
    expect(getActiveCallsRecoveryMarker()).toEqual([]);
  });

  it('round-trips a set then a get', () => {
    const now = Date.now();
    setActiveCallsRecoveryMarker(
      [
        {
          callId: 'call-a',
          sessid: 'sess-1',
          storedAt: now,
          telnyxSessionId: 'tsid-a',
        },
        {
          callId: 'call-b',
          sessid: 'sess-1',
          storedAt: now,
        },
      ],
      now
    );

    const markers = getActiveCallsRecoveryMarker(now);
    expect(markers.length).toBe(2);

    const a = markers.find((m) => m.callId === 'call-a');
    expect(a.sessid).toBe('sess-1');
    expect(a.storedAt).toBe(now);
    expect(a.telnyxSessionId).toBe('tsid-a');
    expect(a.telnyxCallControlId).toBeUndefined();

    const b = markers.find((m) => m.callId === 'call-b');
    expect(b.telnyxSessionId).toBeUndefined();
    expect(b.telnyxCallControlId).toBeUndefined();
  });

  it('drops records older than RECOVERY_MARKER_MAX_AGE_MS and clears storage', () => {
    const baseTime = 1000000;
    setActiveCallsRecoveryMarker(
      [{ callId: 'old-call', sessid: 'sess-old', storedAt: baseTime }],
      baseTime
    );

    // Just inside the deadline → returned.
    expect(
      getActiveCallsRecoveryMarker(baseTime + RECOVERY_MARKER_MAX_AGE_MS)
        .length
    ).toBe(1);

    // Re-set because the previous read did not clear (pure read).
    setActiveCallsRecoveryMarker(
      [{ callId: 'old-call', sessid: 'sess-old', storedAt: baseTime }],
      baseTime
    );

    // Just past the deadline → cleared and empty.
    expect(
      getActiveCallsRecoveryMarker(baseTime + RECOVERY_MARKER_MAX_AGE_MS + 1)
        .length
    ).toBe(0);

    // Storage keys should have been removed.
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls-stored-at')
    ).toBeNull();
  });

  it('clearActiveCallsRecoveryMarker removes both keys', () => {
    setActiveCallsRecoveryMarker([
      { callId: 'c', sessid: 's', storedAt: Date.now() },
    ]);
    expect(getActiveCallsRecoveryMarker().length).toBe(1);

    clearActiveCallsRecoveryMarker();

    expect(getActiveCallsRecoveryMarker()).toEqual([]);
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls-stored-at')
    ).toBeNull();
  });

  it('returns an empty array and clears storage when the payload is malformed JSON', () => {
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls',
      'not-json{'
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-stored-at',
      String(Date.now())
    );

    expect(getActiveCallsRecoveryMarker()).toEqual([]);
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
  });

  it('returns an empty array and clears storage when the payload is not an array', () => {
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls',
      JSON.stringify({ callId: 'x', sessid: 'y', storedAt: 1 })
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-stored-at',
      String(Date.now())
    );

    expect(getActiveCallsRecoveryMarker()).toEqual([]);
    expect(
      sessionStorage.getItem('telnyx-voice-sdk-active-calls')
    ).toBeNull();
  });

  it('filters out individual records missing required fields', () => {
    const now = Date.now();
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls',
      JSON.stringify([
        { callId: 'good', sessid: 's', storedAt: now },
        { callId: 'no-sessid', storedAt: now }, // missing sessid
        { sessid: 's', storedAt: now }, // missing callId
        { callId: 'no-storedat', sessid: 's' }, // missing storedAt
        'not-an-object',
        null,
      ])
    );
    sessionStorage.setItem(
      'telnyx-voice-sdk-active-calls-stored-at',
      String(now)
    );

    const markers = getActiveCallsRecoveryMarker(now);
    expect(markers.length).toBe(1);
    expect(markers[0].callId).toBe('good');
  });

  it('setActiveCallsRecoveryMarker with an empty array clears storage (no dead state)', () => {
    setActiveCallsRecoveryMarker([
      { callId: 'c', sessid: 's', storedAt: Date.now() },
    ]);
    expect(getActiveCallsRecoveryMarker().length).toBe(1);

    setActiveCallsRecoveryMarker([]);
    expect(getActiveCallsRecoveryMarker()).toEqual([]);
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
    expect(getActiveCallsRecoveryMarker()).toEqual([]);

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
      setActiveCallsRecoveryMarker([
        { callId: 'c', sessid: 's', storedAt: Date.now() },
      ])
    ).not.toThrow();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sessionStorage as any).setItem = original;
    // Clean up any partial state (write semantics vary by mock timing).
    clearActiveCallsRecoveryMarker();
  });
});

