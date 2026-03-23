import Verto from '..';
import { IVertoOptions } from '../util/interfaces';
import { SwEvent } from '../util/constants';
import { register, deRegister } from '../services/Handler';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Connection = require('../services/Connection');

/**
 * Helper: create a minimal JWT with a given `exp` claim.
 * The token is structurally valid (3 dot-separated base64 parts)
 * but is NOT cryptographically signed — the SDK only decodes the payload.
 */
function makeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp }));
  const signature = btoa('fake-sig');
  return `${header}.${payload}.${signature}`;
}

/** Seconds since epoch, right now. */
const nowSec = () => Math.floor(Date.now() / 1000);

describe('Token expiry logic', () => {
  const TOKEN_EXPIRY_WARNING_SECONDS = 120; // mirrors BaseSession constant

  const buildInstance = (overrides: Partial<IVertoOptions> = {}): Verto => {
    const instance = new Verto({
      host: 'example.telnyx.com',
      login: 'login',
      password: 'password',
      ...overrides,
    });
    instance.connection = Connection.default();
    return instance;
  };

  let instance: Verto;

  beforeEach(() => {
    jest.useFakeTimers();
    instance = buildInstance();
    Connection.mockSend.mockClear();
    Connection.default.mockClear();
    Connection.mockClose.mockClear();
  });

  afterEach(() => {
    deRegister(SwEvent.Warning, undefined, instance.uuid);
    jest.useRealTimers();
  });

  // ─── _checkTokenExpiry via login() ────────────────────────────────

  describe('when login_token is not a JWT', () => {
    it('should not emit warning for a plain string token', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = 'not-a-jwt';
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should not emit warning when login_token is undefined', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = undefined;
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should not emit warning when login_token is empty string', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = '';
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should not emit warning for a two-part token (not 3 dots)', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = 'part1.part2';
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should not emit warning for a JWT with non-numeric exp', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const payload = btoa(JSON.stringify({ exp: 'not-a-number' }));
      const sig = btoa('sig');
      instance.options.login_token = `${header}.${payload}.${sig}`;
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should not emit warning for a JWT without exp claim', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const payload = btoa(JSON.stringify({ sub: 'user123' }));
      const sig = btoa('sig');
      instance.options.login_token = `${header}.${payload}.${sig}`;
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });
  });

  describe('when token is already expired (exp <= now)', () => {
    it('should not emit warning for an already-expired token', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = makeJwt(nowSec() - 10);
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should not emit warning when exp equals current time', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = makeJwt(nowSec());
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });
  });

  describe('when token expires within WARNING_SECONDS (immediate warning)', () => {
    it('should emit TOKEN_EXPIRING_SOON immediately when expiry is within 120s', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      // Token expires in 60 seconds (< 120s threshold)
      instance.options.login_token = makeJwt(nowSec() + 60);
      await instance.login();

      expect(warningHandler).toHaveBeenCalledTimes(1);
      const { warning } = warningHandler.mock.calls[0][0];
      expect(warning.code).toBe(34001);
      expect(warning.name).toBe('TOKEN_EXPIRING_SOON');
    });

    it('should emit immediately when expiry is exactly at the threshold boundary', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      // Token expires in exactly 120s (== TOKEN_EXPIRY_WARNING_SECONDS)
      instance.options.login_token = makeJwt(
        nowSec() + TOKEN_EXPIRY_WARNING_SECONDS
      );
      await instance.login();

      expect(warningHandler).toHaveBeenCalledTimes(1);
      const { warning } = warningHandler.mock.calls[0][0];
      expect(warning.code).toBe(34001);
    });

    it('should emit immediately when expiry is 1 second away', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = makeJwt(nowSec() + 1);
      await instance.login();

      expect(warningHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('when token expires beyond WARNING_SECONDS (scheduled warning)', () => {
    it('should schedule warning and fire it at the correct time', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      // Token expires in 300 seconds (> 120s)
      // Warning should fire at 300 - 120 = 180 seconds
      const expiresInSec = 300;
      instance.options.login_token = makeJwt(nowSec() + expiresInSec);
      await instance.login();

      // Should NOT fire immediately
      expect(warningHandler).not.toHaveBeenCalled();

      // Advance to just before the scheduled time
      const delayMs = (expiresInSec - TOKEN_EXPIRY_WARNING_SECONDS) * 1000;
      jest.advanceTimersByTime(delayMs - 100);
      expect(warningHandler).not.toHaveBeenCalled();

      // Advance past the scheduled time
      jest.advanceTimersByTime(200);
      expect(warningHandler).toHaveBeenCalledTimes(1);

      const { warning } = warningHandler.mock.calls[0][0];
      expect(warning.code).toBe(34001);
      expect(warning.name).toBe('TOKEN_EXPIRING_SOON');
    });

    it('should not fire warning more than once', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = makeJwt(nowSec() + 600);
      await instance.login();

      // Advance well past the scheduled time
      jest.advanceTimersByTime(600 * 1000);
      expect(warningHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout cleanup', () => {
    it('should clear scheduled warning on disconnect', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = makeJwt(nowSec() + 300);
      await instance.login();

      // Disconnect before the timer fires
      await instance.disconnect();

      // Advance all timers — warning should NOT fire
      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should clear previous timeout when login is called again', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      // First login — token expires in 300s, warning at 180s
      instance.options.login_token = makeJwt(nowSec() + 300);
      await instance.login();

      // Second login — new token expires in 600s, warning at 480s
      instance.options.login_token = makeJwt(nowSec() + 600);
      await instance.login();

      // Advance past the first timeout (180s) — should NOT fire (was cleared)
      jest.advanceTimersByTime(200 * 1000);
      expect(warningHandler).not.toHaveBeenCalled();

      // Advance to the new timeout (480s from login time)
      jest.advanceTimersByTime(300 * 1000);
      expect(warningHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('warning payload', () => {
    it('should include sessionId in the warning event', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = makeJwt(nowSec() + 60);
      await instance.login();

      expect(warningHandler).toHaveBeenCalledTimes(1);
      const eventPayload = warningHandler.mock.calls[0][0];
      expect(eventPayload).toHaveProperty('sessionId');
      expect(eventPayload).toHaveProperty('warning');
    });

    it('should have correct warning structure', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = makeJwt(nowSec() + 60);
      await instance.login();

      const { warning } = warningHandler.mock.calls[0][0];
      expect(warning).toMatchObject({
        code: 34001,
        name: 'TOKEN_EXPIRING_SOON',
        message: expect.any(String),
        description: expect.any(String),
        causes: expect.any(Array),
        solutions: expect.any(Array),
      });
    });
  });

  describe('login with creds updates token and rechecks expiry', () => {
    it('should schedule warning when login_token is updated via creds', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      // Initial login with no JWT
      await instance.login();
      expect(warningHandler).not.toHaveBeenCalled();

      // Update with a JWT that expires soon
      await instance.login({
        creds: { login_token: makeJwt(nowSec() + 30) },
      });

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler.mock.calls[0][0].warning.code).toBe(34001);
    });

    it('should reschedule warning when token is refreshed with longer-lived JWT', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      // Login with a token expiring soon — triggers immediate warning
      await instance.login({
        creds: { login_token: makeJwt(nowSec() + 60) },
      });
      expect(warningHandler).toHaveBeenCalledTimes(1);
      warningHandler.mockClear();

      // Refresh with a longer-lived token — warning should be scheduled, not immediate
      await instance.login({
        creds: { login_token: makeJwt(nowSec() + 600) },
      });
      expect(warningHandler).not.toHaveBeenCalled();

      // Advance to scheduled time
      jest.advanceTimersByTime(
        (600 - TOKEN_EXPIRY_WARNING_SECONDS) * 1000 + 100
      );
      expect(warningHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed base64 in JWT payload gracefully', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      instance.options.login_token = 'valid-header.!!!invalid-base64!!!.sig';
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should handle JWT with valid base64 but invalid JSON payload', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const payload = btoa('not-json-at-all');
      const sig = btoa('sig');
      instance.options.login_token = `${header}.${payload}.${sig}`;
      await instance.login();

      jest.runAllTimers();
      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should handle token with very large exp value', async () => {
      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, instance.uuid);

      // Token expires in ~31 years
      instance.options.login_token = makeJwt(nowSec() + 1_000_000_000);
      await instance.login();

      // No immediate warning
      expect(warningHandler).not.toHaveBeenCalled();
    });
  });
});
