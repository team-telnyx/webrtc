/**
 * Unit tests for switchRegion() — client method to switch the signaling
 * connection to a different regional rtc.telnyx.com endpoint.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../services/Connection');
jest.mock('../util/logger');
jest.mock('../util/reconnect', () => ({
  getReconnectToken: jest.fn(() => null),
  getReconnectTokenCanaryRtcServer: jest.fn(() => undefined),
  setReconnectToken: jest.fn(),
  clearReconnectToken: jest.fn(),
  getReconnectSessionId: jest.fn(() => null),
  setReconnectSessionId: jest.fn(),
  isReconnectSessionIdFresh: jest.fn(() => false),
  getActiveCallsRecoveryMarker: jest.fn(() => null),
  setActiveCallsRecoveryMarker: jest.fn(),
  clearActiveCallsRecoveryMarker: jest.fn(),
  RECONNECT_SESSION_ID_MAX_AGE_MS: 90000,
}));

import Verto from '..';
import { IVertoOptions } from '../util/interfaces';
import { Region } from '../../../Region';
import { trigger } from '../services/Handler';

jest.mock('../services/Handler', () => ({
  trigger: jest.fn(),
  register: jest.fn(),
  deRegister: jest.fn(),
  deRegisterAll: jest.fn(),
  registerOnce: jest.fn(),
  isQueued: jest.fn(),
}));

// Access the mock via require (same pattern as Verto.test.ts)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Connection = require('../services/Connection');

describe('switchRegion', () => {
  const _buildInstance = (props: IVertoOptions): Verto => {
    const instance: Verto = new Verto(props);
    instance.connection = Connection.default();
    return instance;
  };

  let instance: Verto;

  beforeEach(() => {
    jest.clearAllMocks();
    Connection.mockClose.mockClear();
    Connection.mockConnect.mockClear();
    Connection.mockSetRegion.mockClear();
    Connection.default.mockClear();
    Connection.mockHost.mockImplementation(() => 'wss://rtc.telnyx.com');
    instance = _buildInstance({
      login: 'login',
      password: 'password',
    });
  });

  describe('validation', () => {
    it('throws on an unsupported region string', () => {
      expect(() => instance.switchRegion('mars' as any)).toThrow(
        /Unsupported region "mars"/
      );
    });

    it('does NOT throw for null (revert to anycast)', () => {
      expect(() => instance.switchRegion(null)).not.toThrow();
    });

    it.each(Object.values(Region))(
      'accepts supported region "%s"',
      (region) => {
        expect(() => instance.switchRegion(region as any)).not.toThrow();
      }
    );
  });

  describe('option and host updates', () => {
    it('updates session.options.region to the new region', () => {
      instance.switchRegion('eu' as any);

      expect(instance.options.region).toBe('eu');
    });

    it('clears session.options.region when null is passed', () => {
      instance.options.region = 'eu';
      instance.switchRegion(null);

      expect(instance.options.region).toBeUndefined();
    });

    // The region reaches the new host through the Connection constructor,
    // which reads options.region, rather than through setRegion() on the
    // connection we just closed.
    it('builds a new Connection instead of re-pointing the old one', () => {
      const built = Connection.default.mock.calls.length;

      instance.switchRegion('apac' as any);

      expect(Connection.default.mock.calls.length).toBe(built + 1);
      expect(Connection.mockSetRegion).not.toHaveBeenCalled();
      expect(instance.options.region).toBe('apac');
    });

    it('builds a new Connection when reverting to anycast', () => {
      const built = Connection.default.mock.calls.length;

      instance.switchRegion(null);

      expect(Connection.default.mock.calls.length).toBe(built + 1);
      expect(Connection.mockSetRegion).not.toHaveBeenCalled();
      expect(instance.options.region).toBeUndefined();
    });

    // Order matters: options.region is read by the Connection constructor, so
    // a close that happens after the mutation would leave the session
    // describing a region its live socket is not on.
    it('closes before it mutates options.region', () => {
      const order: string[] = [];
      Connection.mockClose.mockImplementation(() => {
        order.push(`close:${instance.options.region ?? 'default'}`);
      });
      Connection.default.mockImplementation(() => {
        order.push(`construct:${instance.options.region ?? 'default'}`);
        return {
          connect: Connection.mockConnect,
          close: Connection.mockClose,
          setRegion: Connection.mockSetRegion,
          get host() {
            return Connection.mockHost();
          },
        };
      });
      instance.options.region = 'eu';

      instance.switchRegion('apac' as any);

      expect(order).toEqual(['close:eu', 'construct:apac']);
    });
  });

  describe('connection lifecycle', () => {
    it('closes the current connection before reconnecting', () => {
      instance.switchRegion('eu' as any);

      // _closeConnection calls connection.close()
      expect(Connection.mockClose).toHaveBeenCalled();
    });

    it('initiates a new connection to the new region', () => {
      instance.switchRegion('eu' as any);

      expect(Connection.mockConnect).toHaveBeenCalled();
    });

    it('resets _autoReconnect to true', () => {
      // Disable auto-reconnect by calling disconnect
      instance.disconnect();
      // Now switchRegion should re-enable it
      instance.switchRegion('eu' as any);

      // After switchRegion, _autoReconnect should be true (indirectly
      // verified by the fact that connect was called, which only
      // proceeds when autoReconnect is reset or connection is not alive)
      expect(Connection.mockConnect).toHaveBeenCalled();
    });

    it('resets reconnect attempts to 0', () => {
      // Access the private field to verify
      (instance as any)._reconnectAttempts = 5;

      instance.switchRegion('eu' as any);

      expect((instance as any)._reconnectAttempts).toBe(0);
    });
  });

  describe('active calls', () => {
    // Switching closes the socket, so the call does not survive it. Refusing
    // is the default; dropping a live call silently was the earlier behaviour.
    it('throws rather than dropping an active call', () => {
      jest.spyOn(instance, 'hasActiveCall').mockReturnValue(true);

      expect(() => instance.switchRegion('eu' as any)).toThrow(
        /Cannot switch region while a call is active/
      );
    });

    it('does not touch the connection when it refuses', () => {
      jest.spyOn(instance, 'hasActiveCall').mockReturnValue(true);
      const before = instance.options.region;

      expect(() => instance.switchRegion('eu' as any)).toThrow();

      expect(instance.options.region).toBe(before);
      expect(Connection.mockConnect).not.toHaveBeenCalled();
    });

    it('has no way to switch past an active call', () => {
      jest.spyOn(instance, 'hasActiveCall').mockReturnValue(true);

      // Any extra argument is ignored: there is no force option.
      expect(() =>
        (instance as any).switchRegion('eu', { force: true })
      ).toThrow(/Cannot switch region while a call is active/);
      expect(Connection.mockConnect).not.toHaveBeenCalled();
      expect(
        (trigger as jest.Mock).mock.calls.filter(
          (c: any[]) => c[0] === 'telnyx.warning'
        )
      ).toHaveLength(0);
    });

    it('switches once the call is gone', () => {
      const active = jest
        .spyOn(instance, 'hasActiveCall')
        .mockReturnValue(true);
      expect(() => instance.switchRegion('eu' as any)).toThrow();

      active.mockReturnValue(false);
      instance.switchRegion('eu' as any);

      expect(instance.options.region).toBe('eu');
      expect(Connection.mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('switching from a region to another region', () => {
    it('can switch from eu to apac', () => {
      instance.options.region = 'eu';
      Connection.mockHost.mockImplementation(() => 'wss://eu.rtc.telnyx.com');

      const built = Connection.default.mock.calls.length;

      instance.switchRegion('apac' as any);

      expect(instance.options.region).toBe('apac');
      expect(Connection.default.mock.calls.length).toBe(built + 1);
      expect(Connection.mockConnect).toHaveBeenCalled();
    });

    it('can switch from a region back to anycast (null)', () => {
      instance.options.region = 'us-east';
      Connection.mockHost.mockImplementation(
        () => 'wss://us-east.rtc.telnyx.com'
      );

      instance.switchRegion(null);

      expect(instance.options.region).toBeUndefined();
      expect(Connection.default.mock.calls.length).toBeGreaterThan(0);
      expect(Connection.mockConnect).toHaveBeenCalled();
    });
  });
});
