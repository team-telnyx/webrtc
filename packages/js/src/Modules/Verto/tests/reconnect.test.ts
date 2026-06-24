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
  type IStoredActiveCall,
} from '../util/reconnect';

const ACTIVE_CALLS_KEY = 'telnyx-voice-sdk-active-calls';

// Helper to cast a plain object to the narrow persisted shape for tests.
// The marker helpers serialize via JSON.stringify, so the input only needs
// to be JSON-serializable.
const asStoredCall = (obj: Record<string, unknown>) =>
  obj as unknown as IStoredActiveCall;

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

  it('returns null when nothing is stored', () => {
    const result = getActiveCallsRecoveryMarker();
    expect(result).toBeNull();
  });

  it('round-trips a set then a get', () => {
    const now = Date.now();
    setActiveCallsRecoveryMarker(
      [
        asStoredCall({
          id: 'call-a',
          state: 'active',
          options: { telnyxSessionId: 'tsid-a' },
        }),
        asStoredCall({
          id: 'call-b',
          state: 'active',
          options: {},
        }),
      ],
      'sess-1',
      now
    );

    const result = getActiveCallsRecoveryMarker(now);
    // getActiveCallsRecoveryMarker clears storage after reading.
    expect(result).not.toBeNull();
    expect(result!.calls.length).toBe(2);
    expect(result!.sessionId).toBe('sess-1');

    const a = result!.calls.find((m) => m.id === 'call-a');
    expect(a).toBeDefined();
    // Only the narrow projection (id + options.telnyx*Id) is persisted; the
    // extra `state` field on the input is dropped by the narrow type, but
    // since tests write directly with JSON the round-trip preserves whatever
    // was serialized. The consume path only reads id + options, so verify
    // those.
    expect(a!.id).toBe('call-a');
    expect(a!.options?.telnyxSessionId).toBe('tsid-a');

    const b = result!.calls.find((m) => m.id === 'call-b');
    expect(b).toBeDefined();
    expect(b!.options?.telnyxSessionId).toBeUndefined();
    expect(b!.options?.telnyxCallControlId).toBeUndefined();
  });

  it('drops records older than RECOVERY_MARKER_MAX_AGE_MS and clears storage', () => {
    const baseTime = 1000000;
    setActiveCallsRecoveryMarker(
      [asStoredCall({ id: 'old-call', state: 'active', options: {} })],
      'sess-old',
      baseTime
    );

    // Just inside the deadline → returned.
    let result = getActiveCallsRecoveryMarker(
      baseTime + RECOVERY_MARKER_MAX_AGE_MS
    );
    expect(result).not.toBeNull();
    expect(result!.calls.length).toBe(1);

    // Re-set because the previous read cleared storage.
    setActiveCallsRecoveryMarker(
      [asStoredCall({ id: 'old-call', state: 'active', options: {} })],
      'sess-old',
      baseTime
    );

    // Just past the deadline → cleared and null.
    result = getActiveCallsRecoveryMarker(
      baseTime + RECOVERY_MARKER_MAX_AGE_MS + 1
    );
    expect(result).toBeNull();

    // Storage key should have been removed.
    expect(sessionStorage.getItem(ACTIVE_CALLS_KEY)).toBeNull();
  });

  it('clearActiveCallsRecoveryMarker removes the key', () => {
    setActiveCallsRecoveryMarker(
      [asStoredCall({ id: 'c', state: 'active', options: {} })],
      's'
    );
    // getActiveCallsRecoveryMarker clears on read, so just test clear directly.
    clearActiveCallsRecoveryMarker();

    const result = getActiveCallsRecoveryMarker();
    expect(result).toBeNull();
    expect(sessionStorage.getItem(ACTIVE_CALLS_KEY)).toBeNull();
  });

  it('returns null and clears storage when the payload is malformed JSON', () => {
    sessionStorage.setItem(ACTIVE_CALLS_KEY, 'not-json{');

    const result = getActiveCallsRecoveryMarker();
    expect(result).toBeNull();
    expect(sessionStorage.getItem(ACTIVE_CALLS_KEY)).toBeNull();
  });

  it('returns null and clears storage when the payload is not a container object', () => {
    sessionStorage.setItem(
      ACTIVE_CALLS_KEY,
      JSON.stringify({ id: 'x', state: 'active', options: {} })
    );

    const result = getActiveCallsRecoveryMarker();
    expect(result).toBeNull();
    expect(sessionStorage.getItem(ACTIVE_CALLS_KEY)).toBeNull();
  });

  it('returns null and clears storage when calls is not an array', () => {
    sessionStorage.setItem(
      ACTIVE_CALLS_KEY,
      JSON.stringify({ sessionId: 's', calls: 'not-an-array', storedAt: Date.now() })
    );

    const result = getActiveCallsRecoveryMarker();
    expect(result).toBeNull();
    expect(sessionStorage.getItem(ACTIVE_CALLS_KEY)).toBeNull();
  });

  it('does not throw when sessionStorage getItem throws', () => {
    const original = sessionStorage.getItem;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sessionStorage as any).getItem = jest.fn(() => {
      throw new Error('blocked');
    });

    expect(() => getActiveCallsRecoveryMarker()).not.toThrow();
    const result = getActiveCallsRecoveryMarker();
    expect(result).toBeNull();

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
      setActiveCallsRecoveryMarker(
        [asStoredCall({ id: 'c', state: 'active', options: {} })],
        's'
      )
    ).not.toThrow();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sessionStorage as any).setItem = original;
    // Clean up any partial state (write semantics vary by mock timing).
    clearActiveCallsRecoveryMarker();
  });

  it('clears storage immediately after a successful read (at-most-once)', () => {
    const now = Date.now();
    setActiveCallsRecoveryMarker(
      [asStoredCall({ id: 'call-x', state: 'active', options: {} })],
      'sess-x',
      now
    );

    // First read returns the marker and clears storage.
    const first = getActiveCallsRecoveryMarker(now);
    expect(first).not.toBeNull();
    expect(first!.calls.length).toBe(1);
    expect(first!.sessionId).toBe('sess-x');

    // Second read sees nothing — storage was cleared by the first.
    const second = getActiveCallsRecoveryMarker(now);
    expect(second).toBeNull();
  });

  it('persists only the narrow projection and excludes sensitive host fields', () => {
    const now = Date.now();
    // The producer (Verto/index.ts) projects each active call to the narrow
    // shape before calling setActiveCallsRecoveryMarker. Simulate that here:
    // the persisted record carries only id + options.telnyx*Id, never the full
    // Call (which would include session/peer/localStream/remoteStream/iceServers/...).
    setActiveCallsRecoveryMarker(
      [
        asStoredCall({
          id: 'call-narrow',
          options: {
            telnyxSessionId: 'tsid-narrow',
            telnyxCallControlId: 'ccid-narrow',
          },
        }),
      ],
      'sess-narrow',
      now
    );

    const result = getActiveCallsRecoveryMarker(now);
    expect(result).not.toBeNull();
    expect(result!.calls.length).toBe(1);
    const serialized = JSON.stringify(result!.calls[0]);
    // The narrow projection never includes these sensitive / host fields.
    expect(serialized).not.toContain('"session"');
    expect(serialized).not.toContain('"peer"');
    expect(serialized).not.toContain('"localStream"');
    expect(serialized).not.toContain('"remoteStream"');
    expect(serialized).not.toContain('"iceServers"');
    expect(serialized).not.toContain('"customHeaders"');
    // The correlation ids ARE persisted.
    expect(serialized).toContain('"telnyxSessionId"');
    expect(serialized).toContain('"telnyxCallControlId"');
  });

  it('filters out malformed records (null / non-object / missing id) on read', () => {
    const now = Date.now();
    // Manually inject a payload with a mix of well-formed and malformed records.
    // getActiveCallsRecoveryMarker must drop the bad ones and keep the good one.
    sessionStorage.setItem(
      ACTIVE_CALLS_KEY,
      JSON.stringify({
        sessionId: 'sess-malformed',
        storedAt: now,
        calls: [
          { id: 'good-call', options: { telnyxSessionId: 'tsid-good' } },
          null,
          'not-an-object',
          { options: { telnyxSessionId: 'no-id' } },
          { id: '', options: {} },
        ],
      })
    );

    const result = getActiveCallsRecoveryMarker(now);
    expect(result).not.toBeNull();
    expect(result!.calls.length).toBe(1);
    expect(result!.calls[0].id).toBe('good-call');
    expect(result!.calls[0].options?.telnyxSessionId).toBe('tsid-good');
  });

  it('returns null when all records are malformed (no well-formed call records)', () => {
    const now = Date.now();
    sessionStorage.setItem(
      ACTIVE_CALLS_KEY,
      JSON.stringify({
        sessionId: 'sess-all-bad',
        storedAt: now,
        calls: [null, { options: {} }, { id: 123 }],
      })
    );

    const result = getActiveCallsRecoveryMarker(now);
    expect(result).toBeNull();
    // Storage is still cleared after the read.
    expect(sessionStorage.getItem(ACTIVE_CALLS_KEY)).toBeNull();
  });
});
