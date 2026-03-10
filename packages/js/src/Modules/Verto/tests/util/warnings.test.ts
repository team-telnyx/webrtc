import {
  SDK_WARNINGS,
  SdkWarningCode,
  ITelnyxWarning,
  createTelnyxWarning,
} from '../../util/constants/warnings';

describe('warnings module', () => {
  describe('SDK_WARNINGS', () => {
    const expectedCodes: number[] = [
      31001, 31002, 31003, 31004, 32001, 32002, 33001, 33002, 33003, 34001,
      35001,
    ];

    it('should contain all expected warning codes', () => {
      const registeredCodes = Object.keys(SDK_WARNINGS).map(Number);
      expect(registeredCodes).toEqual(expect.arrayContaining(expectedCodes));
      expect(registeredCodes).toHaveLength(expectedCodes.length);
    });

    it('every entry should have the required fields', () => {
      for (const [, entry] of Object.entries(SDK_WARNINGS)) {
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('message');
        expect(entry).toHaveProperty('causes');
        expect(entry).toHaveProperty('solutions');
        expect(typeof entry.name).toBe('string');
        expect(typeof entry.description).toBe('string');
        expect(typeof entry.message).toBe('string');
        expect(Array.isArray(entry.causes)).toBe(true);
        expect(Array.isArray(entry.solutions)).toBe(true);
        expect(entry.causes.length).toBeGreaterThan(0);
        expect(entry.solutions.length).toBeGreaterThan(0);
      }
    });

    it('every name should be UPPER_SNAKE_CASE', () => {
      for (const [, entry] of Object.entries(SDK_WARNINGS)) {
        expect(entry.name).toMatch(/^[A-Z][A-Z0-9_]+$/);
      }
    });

    it('all codes should start with 3xxxx', () => {
      const registeredCodes = Object.keys(SDK_WARNINGS).map(Number);
      for (const code of registeredCodes) {
        expect(code).toBeGreaterThanOrEqual(30000);
        expect(code).toBeLessThan(40000);
      }
    });
  });

  describe('createTelnyxWarning', () => {
    it('should return a plain ITelnyxWarning object (not an Error)', () => {
      const warning = createTelnyxWarning(31001);
      expect(warning).not.toBeInstanceOf(Error);
      expect(warning.code).toBe(31001);
      expect(warning.name).toBe('HIGH_RTT');
      expect(warning.message).toBe('High network latency detected');
      expect(warning.description).toBeTruthy();
      expect(warning.causes.length).toBeGreaterThan(0);
      expect(warning.solutions.length).toBeGreaterThan(0);
    });

    it('should allow message override', () => {
      const warning = createTelnyxWarning(31001, 'Custom message');
      expect(warning.message).toBe('Custom message');
    });

    it('should use default message when not overridden', () => {
      const warning = createTelnyxWarning(31002);
      expect(warning.message).toBe('High jitter detected');
    });

    it('should create warnings for all code ranges', () => {
      const networkWarning = createTelnyxWarning(31003);
      expect(networkWarning.name).toBe('HIGH_PACKET_LOSS');

      const connectionWarning = createTelnyxWarning(32001);
      expect(connectionWarning.name).toBe('LOW_BYTES_RECEIVED');

      const iceWarning = createTelnyxWarning(33001);
      expect(iceWarning.name).toBe('ICE_CONNECTIVITY_LOST');
    });

    it('should not share arrays between instances', () => {
      const a = createTelnyxWarning(31001);
      const b = createTelnyxWarning(31001);
      a.causes.push('extra');
      expect(b.causes).not.toContain('extra');
    });

    it('should satisfy ITelnyxWarning type', () => {
      const warning: ITelnyxWarning = createTelnyxWarning(33002);
      expect(warning.code).toBe(33002);
      expect(warning.name).toBe('ICE_GATHERING_TIMEOUT');
    });

    it('should accept only valid SdkWarningCode', () => {
      // Type-level check: ensure the factory accepts all codes
      const codes: SdkWarningCode[] = [
        31001, 31002, 31003, 31004, 32001, 32002, 33001, 33002, 33003, 34001,
        35001,
      ];
      for (const code of codes) {
        const warning = createTelnyxWarning(code);
        expect(warning.code).toBe(code);
      }
    });
  });
});
