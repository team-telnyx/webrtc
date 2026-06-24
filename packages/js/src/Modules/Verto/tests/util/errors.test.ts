/**
 * Factory, class, and backward-compat tests for the `fatal` field (VSDK-318
 * Step 7).
 *
 * Covers:
 *  - `createTelnyxError()` default + override semantics
 *  - `TelnyxError` stores and serializes `fatal` via `toJSON()`
 *  - top-level `event.recoverable` shape is unchanged (backward compat)
 *  - `isMediaRecoveryErrorEvent` still narrows on `recoverable === true`
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TelnyxError,
  createTelnyxError,
  isMediaRecoveryErrorEvent,
  ITelnyxError,
  ITelnyxStandardErrorEvent,
  ITelnyxMediaRecoveryErrorEvent,
} from '../../util/errors';
import {
  RECONNECTION_EXHAUSTED,
  WEBSOCKET_ERROR,
  WEBSOCKET_CONNECTION_FAILED,
  MEDIA_MICROPHONE_PERMISSION_DENIED,
  SDP_CREATE_OFFER_FAILED,
} from '../../util/constants/errorCodes';

describe('createTelnyxError — `fatal` default + override (VSDK-318)', () => {
  it('picks up the registry default for fatal codes', () => {
    expect(createTelnyxError(RECONNECTION_EXHAUSTED).fatal).toBe(true);
    expect(createTelnyxError(WEBSOCKET_CONNECTION_FAILED).fatal).toBe(true);
    expect(createTelnyxError(SDP_CREATE_OFFER_FAILED).fatal).toBe(true);
  });

  it('picks up the registry default for non-fatal codes', () => {
    expect(createTelnyxError(WEBSOCKET_ERROR).fatal).toBe(false);
  });

  it('MEDIA_* defaults to fatal: true (v4 flip from recovery flow)', () => {
    expect(
      createTelnyxError(MEDIA_MICROPHONE_PERMISSION_DENIED).fatal
    ).toBe(true);
  });

  it('explicit `fatal: false` override wins (media-recovery flow)', () => {
    const err = createTelnyxError(
      MEDIA_MICROPHONE_PERMISSION_DENIED,
      undefined,
      undefined,
      false
    );
    expect(err.fatal).toBe(false);
  });

  it('explicit `fatal: true` override wins for non-fatal defaults', () => {
    const err = createTelnyxError(WEBSOCKET_ERROR, undefined, undefined, true);
    expect(err.fatal).toBe(true);
  });

  it('returns a TelnyxError instance', () => {
    expect(createTelnyxError(RECONNECTION_EXHAUSTED)).toBeInstanceOf(TelnyxError);
  });

  it('preserves code, name, message, and originalError', () => {
    const original = new Error('boom');
    const err = createTelnyxError(SDP_CREATE_OFFER_FAILED, original);
    expect(err.code).toBe(SDP_CREATE_OFFER_FAILED);
    expect(err.name).toBe('SDP_CREATE_OFFER_FAILED');
    expect(err.originalError).toBe(original);
  });
});

describe('TelnyxError — `fatal` storage + serialization (VSDK-318)', () => {
  it('stores `fatal` as a readonly boolean', () => {
    const err = createTelnyxError(RECONNECTION_EXHAUSTED);
    expect(err.fatal).toBe(true);
    expect(typeof err.fatal).toBe('boolean');
  });

  it('toJSON() includes `fatal`', () => {
    const err = createTelnyxError(RECONNECTION_EXHAUSTED);
    const json = err.toJSON();
    expect(json).toHaveProperty('fatal', true);
    expect(json.code).toBe(RECONNECTION_EXHAUSTED);
    expect(json.name).toBe('RECONNECTION_EXHAUSTED');
  });

  it('toJSON() for a non-fatal error includes `fatal: false`', () => {
    const err = createTelnyxError(WEBSOCKET_ERROR);
    expect(err.toJSON()).toHaveProperty('fatal', false);
  });

  it('a directly-constructed TelnyxError requires fatal', () => {
    // Direct construction (used internally) must supply fatal explicitly.
    const err = new TelnyxError({
      code: RECONNECTION_EXHAUSTED,
      name: 'RECONNECTION_EXHAUSTED',
      description: 'desc',
      message: 'msg',
      causes: [],
      solutions: [],
      fatal: true,
    });
    expect(err.fatal).toBe(true);
    expect(err.toJSON()).toHaveProperty('fatal', true);
  });
});

describe('Backward compat — top-level `recoverable` (VSDK-318)', () => {
  it('ITelnyxStandardErrorEvent.recoverable is `false | undefined` (unchanged)', () => {
    const standardEvent: ITelnyxStandardErrorEvent = {
      error: createTelnyxError(WEBSOCKET_ERROR),
      sessionId: 'sess-1',
    };
    // `recoverable` is optional on the standard event — may be absent.
    expect(standardEvent.recoverable).toBeUndefined();
  });

  it('a standard event can explicitly set `recoverable: false`', () => {
    const standardEvent: ITelnyxStandardErrorEvent = {
      error: createTelnyxError(WEBSOCKET_ERROR),
      sessionId: 'sess-1',
      recoverable: false,
    };
    expect(standardEvent.recoverable).toBe(false);
  });

  it('ITelnyxMediaRecoveryErrorEvent keeps `recoverable: true` + helpers', () => {
    const mediaEvent: ITelnyxMediaRecoveryErrorEvent = {
      error: createTelnyxError(
        MEDIA_MICROPHONE_PERMISSION_DENIED,
        undefined,
        undefined,
        false // recovery-flow override
      ) as any,
      sessionId: 'sess-1',
      callId: 'call-1',
      recoverable: true,
      retryDeadline: Date.now() + 5000,
      resume: () => {},
      reject: () => {},
    };
    expect(mediaEvent.recoverable).toBe(true);
    expect(typeof mediaEvent.resume).toBe('function');
    expect(typeof mediaEvent.reject).toBe('function');
    // `fatal` lives only on event.error, not the top level.
    expect((mediaEvent as any).fatal).toBeUndefined();
    expect(mediaEvent.error.fatal).toBe(false);
  });

  it('isMediaRecoveryErrorEvent narrows on `recoverable === true`', () => {
    const standardEvent: ITelnyxStandardErrorEvent = {
      error: createTelnyxError(WEBSOCKET_ERROR),
      sessionId: 'sess-1',
    };
    const mediaEvent: ITelnyxMediaRecoveryErrorEvent = {
      error: createTelnyxError(
        MEDIA_MICROPHONE_PERMISSION_DENIED,
        undefined,
        undefined,
        false
      ) as any,
      sessionId: 'sess-1',
      callId: 'call-1',
      recoverable: true,
      retryDeadline: Date.now() + 5000,
      resume: () => {},
      reject: () => {},
    };
    expect(isMediaRecoveryErrorEvent(standardEvent as any)).toBe(false);
    expect(isMediaRecoveryErrorEvent(mediaEvent as any)).toBe(true);
  });
});

describe('Type-level guarantees (VSDK-318)', () => {
  it('ITelnyxError.fatal is `boolean` (mandatory, not optional)', () => {
    // Compile-time: this would error if `fatal` were optional or absent.
    const check: boolean = ({} as ITelnyxError).fatal;
    expect(typeof check).toBe('undefined'); // the cast object has no value, but the type is boolean
  });
});
