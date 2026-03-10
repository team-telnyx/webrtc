import {
  TelnyxError,
  SDK_WARNINGS,
  createTelnyxWarning,
} from '../../util/errors';

describe('warnings module', () => {
  describe('SDK_WARNINGS', () => {
    it('should contain all expected warning codes', () => {
      const expectedCodes: number[] = [41002, 41003];
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
  });

  describe('createTelnyxWarning', () => {
    it('should return a TelnyxError instance', () => {
      const warning = createTelnyxWarning(41002);
      expect(warning).toBeInstanceOf(TelnyxError);
      expect(warning).toBeInstanceOf(Error);
      expect(warning.code).toBe(41002);
      expect(warning.name).toBe('ICE_NO_CANDIDATES');
    });

    it('should return a warning for ICE gathering timeout', () => {
      const warning = createTelnyxWarning(41003);
      expect(warning.code).toBe(41003);
      expect(warning.name).toBe('ICE_GATHERING_TIMEOUT');
    });

    it('should allow message override', () => {
      const warning = createTelnyxWarning(41002, undefined, 'Custom message');
      expect(warning.message).toBe('Custom message');
    });

    it('should use default message when not overridden', () => {
      const warning = createTelnyxWarning(41002);
      expect(warning.message).toBe('No ICE candidates gathered');
    });

    it('should attach originalError when provided', () => {
      const original = new Error('test');
      const warning = createTelnyxWarning(41003, original);
      expect(warning.originalError).toBe(original);
    });
  });
});
