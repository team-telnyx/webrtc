/**
 * Unit tests for switchRegion() — client method to switch the signaling
 * connection to a different regional rtc.telnyx.com endpoint.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../services/Connection');
jest.mock('../util/logger');
jest.mock('../util/reconnect', () => ({
  getReconnectToken: jest.fn(() => null),
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
import { SUPPORTED_REGIONS } from '../util/constants';
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

    it.each(SUPPORTED_REGIONS)('accepts supported region "%s"', (region) => {
      expect(() => instance.switchRegion(region as any)).not.toThrow();
    });
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

    it('calls connection.setRegion with the new region', () => {
      instance.switchRegion('apac' as any);

      expect(Connection.mockSetRegion).toHaveBeenCalledWith('apac');
    });

    it('calls connection.setRegion with null when reverting', () => {
      instance.switchRegion(null);

      expect(Connection.mockSetRegion).toHaveBeenCalledWith(null);
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

  describe('active calls warning', () => {
    it('emits a telnyx.warning (36008) when active calls exist', () => {
      // Mock hasActiveCall to return true
      jest.spyOn(instance, 'hasActiveCall').mockReturnValue(true);

      instance.switchRegion('eu' as any);

      const warningCalls = (trigger as jest.Mock).mock.calls.filter(
        (c: any[]) => c[0] === 'telnyx.warning'
      );
      expect(warningCalls.length).toBeGreaterThanOrEqual(1);

      const payload = warningCalls[0][1];
      expect(payload.warning.code).toBe(36008);
      expect(payload.warning.name).toBe('REGION_SWITCH_WITH_ACTIVE_CALLS');
      expect(payload.region).toBe('eu');
    });

    it('does NOT emit a region-switch warning when no active calls', () => {
      jest.spyOn(instance, 'hasActiveCall').mockReturnValue(false);

      instance.switchRegion('eu' as any);

      const warningCalls = (trigger as jest.Mock).mock.calls.filter(
        (c: any[]) => c[0] === 'telnyx.warning' && c[1]?.warning?.code === 36008
      );
      expect(warningCalls).toHaveLength(0);
    });
  });

  describe('switching from a region to another region', () => {
    it('can switch from eu to apac', () => {
      instance.options.region = 'eu';
      Connection.mockHost.mockImplementation(() => 'wss://eu.rtc.telnyx.com');

      instance.switchRegion('apac' as any);

      expect(instance.options.region).toBe('apac');
      expect(Connection.mockSetRegion).toHaveBeenCalledWith('apac');
      expect(Connection.mockConnect).toHaveBeenCalled();
    });

    it('can switch from a region back to anycast (null)', () => {
      instance.options.region = 'us-east';
      Connection.mockHost.mockImplementation(
        () => 'wss://us-east.rtc.telnyx.com'
      );

      instance.switchRegion(null);

      expect(instance.options.region).toBeUndefined();
      expect(Connection.mockSetRegion).toHaveBeenCalledWith(null);
      expect(Connection.mockConnect).toHaveBeenCalled();
    });
  });
});
