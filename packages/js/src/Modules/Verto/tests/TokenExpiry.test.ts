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
});
