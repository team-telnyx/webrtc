/**
 * Unit tests for reconnecting on a transient login rejection (VSUP-171).
 *
 * A `-32001 Login Incorrect` raised while a freshly minted credential is
 * still propagating is recoverable, but only on a different b2bua-rtc
 * instance. The session must therefore drop the socket (so the existing
 * reconnect path re-enters `connect()`) with `skipLastVoiceSdkId` set, and
 * must stop doing so after a bounded number of attempts. Terminal
 * rejections carrying the same code must pass straight through.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import BaseSession from '../BaseSession';
import { trigger } from '../services/Handler';
import { SwEvent, LOGIN_FAILED } from '../util/constants';

jest.mock('../services/Connection');
jest.mock('../services/Handler');
jest.mock('../util/logger');
jest.mock('../util/reconnect', () => ({
  getReconnectToken: jest.fn(() => null),
  getReconnectSessionId: jest.fn(() => ''),
  isReconnectSessionIdFresh: jest.fn(() => false),
  setReconnectToken: jest.fn(),
  setReconnectSessionId: jest.fn(),
  clearReconnectToken: jest.fn(),
}));

const mockTrigger = trigger as jest.MockedFunction<typeof trigger>;

class TestSession extends BaseSession {
  validateOptions() {
    return true;
  }
}

const TRANSIENT_ERROR = { code: -32001, message: 'Login Incorrect' };

/** The LOGIN_FAILED payload from the most recent SwEvent.Error trigger. */
function lastLoginFailedEvent(): any {
  const calls = mockTrigger.mock.calls.filter(
    ([event, payload]: any[]) =>
      event === SwEvent.Error && payload?.error?.code === LOGIN_FAILED
  );
  return calls.length ? (calls[calls.length - 1][1] as any) : null;
}

describe('BaseSession - transient login rejection', () => {
  let session: any;
  let mockConnection: any;

  beforeEach(() => {
    mockTrigger.mockClear();
    session = new TestSession({ login: 'testuser', password: 'testpass' });
    mockConnection = {
      close: jest.fn(),
      connect: jest.fn(),
      isAlive: true,
      connected: true,
      previousGatewayState: '',
      socketGeneration: 0,
    };
    session.connection = mockConnection;
    session._autoReconnect = true;
    session._idle = false;
  });

  describe('recoverable rejections', () => {
    it('closes the socket so the reconnect path re-enters connect()', () => {
      session._handleLoginError(TRANSIENT_ERROR);

      expect(mockConnection.close).toHaveBeenCalledTimes(1);
    });

    it('asks the next connection to skip the instance that rejected the login', () => {
      expect(session.options.skipLastVoiceSdkId).toBeUndefined();

      session._handleLoginError(TRANSIENT_ERROR);

      expect(session.options.skipLastVoiceSdkId).toBe(true);
    });

    it('reports the error as non-fatal while a retry is still budgeted', () => {
      session._handleLoginError(TRANSIENT_ERROR);

      expect(lastLoginFailedEvent().error.fatal).toBe(false);
    });

    it('treats -32000 Authentication Required the same way', () => {
      session._handleLoginError({
        code: -32000,
        message: 'Authentication Required',
      });

      expect(mockConnection.close).toHaveBeenCalledTimes(1);
      expect(session.options.skipLastVoiceSdkId).toBe(true);
    });

    it('matches the gateway message case-insensitively', () => {
      session._handleLoginError({ code: -32001, message: 'LOGIN INCORRECT' });

      expect(mockConnection.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry ceiling', () => {
    it('stops reconnecting after the bounded number of attempts', () => {
      session._handleLoginError(TRANSIENT_ERROR);
      session._handleLoginError(TRANSIENT_ERROR);
      expect(mockConnection.close).toHaveBeenCalledTimes(2);

      // Third rejection exceeds the ceiling — surface it instead.
      session._handleLoginError(TRANSIENT_ERROR);

      expect(mockConnection.close).toHaveBeenCalledTimes(2);
      expect(lastLoginFailedEvent().error.fatal).toBe(true);
    });

    it('restores the budget after a login succeeds', async () => {
      session._handleLoginError(TRANSIENT_ERROR);
      session._handleLoginError(TRANSIENT_ERROR);
      expect(session._transientLoginReconnects).toBe(2);

      jest
        .spyOn(session, 'execute')
        .mockResolvedValue({ sessid: 'session-after-recovery' });
      await session._login({ type: 'login' });

      expect(session._transientLoginReconnects).toBe(0);

      session._handleLoginError(TRANSIENT_ERROR);
      expect(mockConnection.close).toHaveBeenCalledTimes(3);
    });
  });

  describe('rejections that must not be retried', () => {
    it('passes through a terminal error carrying the same code', () => {
      session._handleLoginError({
        code: -32001,
        message: 'Credential expired',
      });

      expect(mockConnection.close).not.toHaveBeenCalled();
      expect(session.options.skipLastVoiceSdkId).toBeUndefined();
      expect(lastLoginFailedEvent().error.fatal).toBe(true);
    });

    it('passes through an unrelated error code', () => {
      session._handleLoginError({ code: -32600, message: 'Invalid Request' });

      expect(mockConnection.close).not.toHaveBeenCalled();
    });

    it('passes through an error with no code at all', () => {
      session._handleLoginError(new Error('socket exploded'));

      expect(mockConnection.close).not.toHaveBeenCalled();
    });

    it('does not reconnect when auto-reconnect is disabled', () => {
      session._autoReconnect = false;

      session._handleLoginError(TRANSIENT_ERROR);

      expect(mockConnection.close).not.toHaveBeenCalled();
      expect(lastLoginFailedEvent().error.fatal).toBe(true);
    });
  });

  it('always emits LOGIN_FAILED, retrying or not', () => {
    session._handleLoginError(TRANSIENT_ERROR);
    expect(lastLoginFailedEvent()).not.toBeNull();

    mockTrigger.mockClear();
    session._handleLoginError({ code: -32001, message: 'Credential expired' });
    expect(lastLoginFailedEvent()).not.toBeNull();
  });
});
