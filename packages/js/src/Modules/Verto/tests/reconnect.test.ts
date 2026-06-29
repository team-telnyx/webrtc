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
    // The producer (Verto/index.ts beforeunload handler) projects each active
    // call to the narrow `{ id, customHeaders }` shape — it pulls
    // `call.options.customHeaders`, NOT `options.telnyxSessionId`. The tests
    // mirror that real projection so they pin the actual persisted shape.
    setActiveCallsRecoveryMarker(
      [
        asStoredCall({
          id: 'call-a',
          customHeaders: [{ name: 'X-Test', value: 'a' }],
        }),
        asStoredCall({
          id: 'call-b',
          customHeaders: undefined,
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
    // Only the narrow projection (id + customHeaders) is persisted; the
    // consume path (VertoHandler) reads only `id` and `customHeaders`.
    expect(a!.id).toBe('call-a');
    expect(a!.customHeaders).toEqual([{ name: 'X-Test', value: 'a' }]);

    const b = result!.calls.find((m) => m.id === 'call-b');
    expect(b).toBeDefined();
    expect(b!.customHeaders).toBeUndefined();
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
    // the persisted record carries only `id` + `customHeaders`, never the full
    // Call (which would include session/peer/localStream/remoteStream/iceServers/...).
    setActiveCallsRecoveryMarker(
      [
        asStoredCall({
          id: 'call-narrow',
          customHeaders: [{ name: 'X-Custom', value: 'narrow' }],
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
    // The persisted custom headers ARE present.
    expect(serialized).toContain('"customHeaders"');
    expect(serialized).toContain('"X-Custom"');
    // The legacy correlation-id fields are NOT part of the narrow projection
    // (the producer maps only `customHeaders`, not `options.telnyxSessionId`).
    expect(serialized).not.toContain('"telnyxSessionId"');
    expect(serialized).not.toContain('"telnyxCallControlId"');
  });

  it('returns the parsed payload verbatim (no per-record filtering) when the top-level shape is valid', () => {
    const now = Date.now();
    // Manually inject a payload with a mix of well-formed and malformed records.
    // getActiveCallsRecoveryMarker validates only the top-level shape
    // (`calls` is a non-empty array, fresh `storedAt`); it does NOT filter
    // individual records. Per the accepted PR direction ("return
    // IStoredActiveCalls object or null. No extra logic here"), the consumer
    // (VertoHandler) is responsible for tolerating malformed entries via its
    // per-record try/catch. This test pins that contract: the raw `calls`
    // array is returned as-is.
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
    expect(result!.sessionId).toBe('sess-malformed');
    // The calls array is returned verbatim — no per-record filtering.
    expect(result!.calls.length).toBe(5);
    expect(result!.calls[0].id).toBe('good-call');
    expect(result!.calls[1]).toBeNull();
    expect(result!.calls[2]).toBe('not-an-object');
    // Storage is cleared after the read (at-most-once).
    expect(sessionStorage.getItem(ACTIVE_CALLS_KEY)).toBeNull();
  });

  it('returns the parsed payload (not null) when all records are malformed but the top-level shape is valid', () => {
    const now = Date.now();
    // Top-level shape is valid: `calls` is a non-empty array and `storedAt`
    // is fresh. getActiveCallsRecoveryMarker does not inspect individual
    // records, so it returns the parsed object even when every record is
    // malformed. The `null` cases (malformed top-level, stale, empty array,
    // missing payload) are covered by the tests above.
    sessionStorage.setItem(
      ACTIVE_CALLS_KEY,
      JSON.stringify({
        sessionId: 'sess-all-bad',
        storedAt: now,
        calls: [null, { options: {} }, { id: 123 }],
      })
    );

    const result = getActiveCallsRecoveryMarker(now);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('sess-all-bad');
    expect(result!.calls.length).toBe(3);
    expect(result!.calls[0]).toBeNull();
    // Storage is still cleared after the read.
    expect(sessionStorage.getItem(ACTIVE_CALLS_KEY)).toBeNull();
  });
});
