import { TelnyxError, SDK_ERRORS, createTelnyxError } from '../../util/errors';

describe('errors module', () => {
  describe('SDK_ERRORS', () => {
    it('should contain all expected error codes', () => {
      const expectedCodes: number[] = [
        40001, 40002, 40003, 40004, 40005, 42001, 42002, 42003, 43001, 44001,
        44003, 45001, 45002, 46001,
      ];
      const registeredCodes = Object.keys(SDK_ERRORS).map(Number);
      expect(registeredCodes).toEqual(expect.arrayContaining(expectedCodes));
      expect(registeredCodes).toHaveLength(expectedCodes.length);
    });

    it('every entry should have the required fields', () => {
      for (const [, entry] of Object.entries(SDK_ERRORS)) {
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
      for (const [, entry] of Object.entries(SDK_ERRORS)) {
        expect(entry.name).toMatch(/^[A-Z][A-Z0-9_]+$/);
      }
    });
  });

  describe('createTelnyxError', () => {
    it('should return a TelnyxError instance for SDP error code', () => {
      const error = createTelnyxError(40001);
      expect(error).toBeInstanceOf(TelnyxError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(40001);
      expect(error.name).toBe('SDP_CREATE_OFFER_FAILED');
      expect(error.causes.length).toBeGreaterThan(0);
      expect(error.solutions.length).toBeGreaterThan(0);
    });

    it('should return a TelnyxError for media error code', () => {
      const error = createTelnyxError(42001);
      expect(error.code).toBe(42001);
      expect(error.name).toBe('MEDIA_MICROPHONE_PERMISSION_DENIED');
    });

    it('should return a TelnyxError for peer connection error code', () => {
      const error = createTelnyxError(43001);
      expect(error.code).toBe(43001);
      expect(error.name).toBe('PEER_CONNECTION_FAILED');
    });

    it('should return a TelnyxError for call-control error code', () => {
      const error = createTelnyxError(44003);
      expect(error.code).toBe(44003);
      expect(error.name).toBe('BYE_SEND_FAILED');
    });

    it('should attach originalError when provided', () => {
      const original = new Error('something went wrong');
      const error = createTelnyxError(40004, original);
      expect(error.originalError).toBe(original);
    });

    it('should set originalError to undefined when not provided', () => {
      const error = createTelnyxError(40004);
      expect(error.originalError).toBeUndefined();
    });

    it('should use the short message from SDK_ERRORS', () => {
      const error = createTelnyxError(40005);
      expect(error.message).toBe('Failed to send call data to server');
    });
  });

  describe('TelnyxError', () => {
    it('should extend Error', () => {
      const error = createTelnyxError(40001);
      expect(error instanceof Error).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('toJSON() should return a plain object with all fields', () => {
      const original = new TypeError('test');
      const error = createTelnyxError(42003, original);
      const json = error.toJSON();

      expect(json).toEqual({
        code: 42003,
        name: 'MEDIA_GET_USER_MEDIA_FAILED',
        description: expect.any(String),
        message: 'Failed to access microphone',
        causes: expect.any(Array),
        solutions: expect.any(Array),
        originalError: original,
      });
    });

    it('toJSON() should be serializable (minus originalError circular refs)', () => {
      const error = createTelnyxError(40001);
      const json = error.toJSON();
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized);
      expect(parsed.code).toBe(40001);
      expect(parsed.name).toBe('SDP_CREATE_OFFER_FAILED');
    });

    it('should not share cause/solution arrays between instances', () => {
      const a = createTelnyxError(40001);
      const b = createTelnyxError(40001);
      a.causes.push('extra');
      expect(b.causes).not.toContain('extra');
    });
  });
});
