/**
 * Registry completeness tests for SDK_ERRORS `fatal` field (VSDK-318 Step 7).
 *
 * Every entry in `SDK_ERRORS` MUST declare `fatal: boolean`. These tests guard
 * against a future code being added without the field by asserting the shape
 * of every entry and snapshotting the per-code `fatal` values so a silent flip
 * is caught.
 */

import { SDK_ERRORS } from '../../../util/constants/errors';

describe('SDK_ERRORS — `fatal` field (VSDK-318)', () => {
  const codes = Object.keys(SDK_ERRORS) as unknown as Array<keyof typeof SDK_ERRORS>;

  it('every entry has `fatal: boolean`', () => {
    for (const code of codes) {
      const entry = SDK_ERRORS[code];
      expect(typeof entry.fatal).toBe('boolean');
    }
  });

  it('every entry has the required metadata fields', () => {
    for (const code of codes) {
      const entry = SDK_ERRORS[code];
      expect(typeof entry.name).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.message).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(Array.isArray(entry.causes)).toBe(true);
      expect(Array.isArray(entry.solutions)).toBe(true);
    }
  });

  it('the registry covers the documented error codes', () => {
    // Ensures no code was accidentally dropped during the v4 refactor.
    const expected = [
      40001, 40002, 40003, 40004, 40005, // SDP
      42001, 42002, 42003, // Media
      44001, 44002, 44003, 44004, 44005, // Call control
      45001, 45002, 45003, 45004, // WebSocket / transport
      46001, 46002, 46003, // Auth
      47001, // ICE restart
      48001, // Network
      48501, // Session not reattached
      49001, // Unexpected
    ];
    for (const code of expected) {
      expect(SDK_ERRORS).toHaveProperty(String(code));
    }
  });

  it('terminal codes are `fatal: true` per the v4 plan', () => {
    const terminal = [
      40001, 40002, 40003, 40004, 40005, // SDP
      42001, 42002, 42003, // Media (default; recovery flow overrides)
      44002, 44005, // Invalid call params, peer closed during init
      45001, 45003, // WS connection failed, reconnection exhausted
      46001, // LOGIN_FAILED (review: retry will likely fail again)
      46002, // Invalid credentials
      48501, // Session not reattached
      49001, // Unexpected
    ] as Array<keyof typeof SDK_ERRORS>;
    for (const code of terminal) {
      expect(SDK_ERRORS[code].fatal).toBe(true);
    }
  });

  it('recoverable/benign codes are `fatal: false` per the v4 plan', () => {
    const nonTerminal = [
      44001, // HOLD_FAILED
      44003, // BYE_SEND_FAILED
      44004, // SUBSCRIBE_FAILED
      45002, // WEBSOCKET_ERROR
      45004, // GATEWAY_FAILED
      46003, // AUTHENTICATION_REQUIRED
      47001, // ICE_RESTART_FAILED
      48001, // NETWORK_OFFLINE
    ] as Array<keyof typeof SDK_ERRORS>;
    for (const code of nonTerminal) {
      expect(SDK_ERRORS[code].fatal).toBe(false);
    }
  });
});
