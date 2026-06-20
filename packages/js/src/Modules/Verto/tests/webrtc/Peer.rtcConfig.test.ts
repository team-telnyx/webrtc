/**
 * Tests for VSDK-308 — Peer._config() RTC configuration merge behavior.
 *
 * These tests verify that:
 * - Default RTC config is preserved when no rtcConfig override is provided
 * - rtcConfig fields are merged with SDK defaults
 * - Existing specific options (iceServers, forceRelayCandidate, prefetchIceCandidates)
 *   take precedence over rtcConfig values
 * - TURN credentials are redacted from logger output
 * - Partial overrides: omitted rtcConfig fields fall back to SDK defaults
 */

Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn().mockReturnValue({ duration: 0 }),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    now: jest.fn().mockReturnValue(Date.now()),
  },
});

import BrowserSession from '../../BrowserSession';
import Peer from '../../webrtc/Peer';
import { PeerType } from '../../webrtc/constants';
import { IVertoCallOptions } from '../../webrtc/interfaces';

jest.mock('../../services/Handler', () => ({
  trigger: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PeerWithPrivates = any;

type SessionDouble = {
  options: Record<string, never>;
  sessionid: string;
  connected: boolean;
  reportPeerFailure: jest.Mock;
};

function createSession(): SessionDouble {
  return {
    options: {},
    sessionid: 'test-session',
    connected: true,
    reportPeerFailure: jest.fn(),
  };
}

function createPeer(callOptions: Partial<IVertoCallOptions> = {}): PeerWithPrivates {
  const session = createSession();
  const peer = new Peer(
    PeerType.Offer,
    {
      id: 'test-call',
      debug: false,
      ...callOptions,
    } as IVertoCallOptions,
    session as unknown as BrowserSession,
    jest.fn(),
    jest.fn()
  );
  return peer;
}

describe('VSDK-308: Peer._config() RTC configuration merge', () => {
  describe('default config (no rtcConfig)', () => {
    it('uses default values when no rtcConfig and no specific options', () => {
      const peer = createPeer();
      const config = peer._config();

      expect(config.bundlePolicy).toBe('balanced');
      expect(config.iceCandidatePoolSize).toBe(10); // default prefetchIceCandidates=true
      expect(config.iceTransportPolicy).toBe('all');
    });

    it('uses prefetchIceCandidates=false to set iceCandidatePoolSize=0', () => {
      const peer = createPeer({ prefetchIceCandidates: false });
      const config = peer._config();

      expect(config.iceCandidatePoolSize).toBe(0);
    });

    it('uses forceRelayCandidate=true to set iceTransportPolicy=relay', () => {
      const peer = createPeer({ forceRelayCandidate: true });
      const config = peer._config();

      expect(config.iceTransportPolicy).toBe('relay');
    });

    it('uses iceServers from call options', () => {
      const customServers: RTCIceServer[] = [
        { urls: 'stun:custom.stun.example.com' },
      ];
      const peer = createPeer({ iceServers: customServers });
      const config = peer._config();

      expect(config.iceServers).toBe(customServers);
    });
  });

  describe('rtcConfig override merge', () => {
    it('overrides bundlePolicy via rtcConfig', () => {
      const peer = createPeer({
        rtcConfig: { bundlePolicy: 'max-bundle' },
      });
      const config = peer._config();

      expect(config.bundlePolicy).toBe('max-bundle');
    });

    it('overrides iceTransportPolicy via rtcConfig when no forceRelayCandidate', () => {
      const peer = createPeer({
        rtcConfig: {
          iceTransportPolicy: 'relay',
          iceServers: [{ urls: 'turn:turn.example.com:3478' }],
        },
      });
      const config = peer._config();

      expect(config.iceTransportPolicy).toBe('relay');
    });

    it('overrides iceCandidatePoolSize via rtcConfig when no prefetchIceCandidates', () => {
      const peer = createPeer({
        rtcConfig: { iceCandidatePoolSize: 5 },
      });
      const config = peer._config();

      expect(config.iceCandidatePoolSize).toBe(5);
    });

    it('overrides iceServers via rtcConfig when no iceServers in call options', () => {
      const customServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com:3478', username: 'testUser', credential: 'testPass' },
      ];
      const peer = createPeer({
        rtcConfig: { iceServers: customServers },
      });
      const config = peer._config();

      expect(config.iceServers).toBe(customServers);
    });

    it('merges multiple rtcConfig fields simultaneously', () => {
      const customServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com:3478', username: 'u', credential: 'c' },
      ];
      const peer = createPeer({
        rtcConfig: {
          bundlePolicy: 'max-compat',
          iceTransportPolicy: 'relay',
          iceCandidatePoolSize: 7,
          iceServers: customServers,
        },
      });
      const config = peer._config();

      expect(config.bundlePolicy).toBe('max-compat');
      expect(config.iceTransportPolicy).toBe('relay');
      expect(config.iceCandidatePoolSize).toBe(7);
      expect(config.iceServers).toBe(customServers);
    });
  });

  describe('specific options take precedence over rtcConfig', () => {
    it('iceServers from call options takes precedence over rtcConfig', () => {
      const callServers: RTCIceServer[] = [
        { urls: 'stun:call-option.stun.example.com' },
      ];
      const rtcServers: RTCIceServer[] = [
        { urls: 'stun:rtc-config.stun.example.com' },
      ];
      const peer = createPeer({
        iceServers: callServers,
        rtcConfig: { iceServers: rtcServers },
      });
      const config = peer._config();

      expect(config.iceServers).toBe(callServers);
    });

    it('forceRelayCandidate takes precedence over rtcConfig.iceTransportPolicy', () => {
      const peer = createPeer({
        forceRelayCandidate: false,
        rtcConfig: {
          iceTransportPolicy: 'relay',
          iceServers: [{ urls: 'turn:turn.example.com:3478' }],
        },
      });
      const config = peer._config();

      // forceRelayCandidate=false → 'all', overriding rtcConfig's 'relay'
      expect(config.iceTransportPolicy).toBe('all');
    });

    it('prefetchIceCandidates takes precedence over rtcConfig.iceCandidatePoolSize', () => {
      const peer = createPeer({
        prefetchIceCandidates: false,
        rtcConfig: { iceCandidatePoolSize: 99 },
      });
      const config = peer._config();

      // prefetchIceCandidates=false → 0, overriding rtcConfig's 99
      expect(config.iceCandidatePoolSize).toBe(0);
    });

    it('forceRelayCandidate=true overrides rtcConfig.iceTransportPolicy=all', () => {
      const peer = createPeer({
        forceRelayCandidate: true,
        rtcConfig: { iceTransportPolicy: 'all' },
      });
      const config = peer._config();

      // forceRelayCandidate=true → 'relay', overriding rtcConfig's 'all'
      expect(config.iceTransportPolicy).toBe('relay');
    });
  });

  describe('credential sanitization in logger output', () => {
    it('_sanitizeConfigForLog redacts TURN credentials', () => {
      const peer = createPeer();
      const config: RTCConfiguration = {
        bundlePolicy: 'balanced',
        iceServers: [
          {
            urls: 'turn:turn.example.com:3478',
            username: 'secretUser',
            credential: 'secretPass',
          },
          { urls: 'stun:stun.l.google.com:19302' },
        ],
        iceTransportPolicy: 'relay',
        iceCandidatePoolSize: 10,
      };

      const sanitized = peer._sanitizeConfigForLog(config);
      const json = JSON.stringify(sanitized);

      // Credentials must not appear in output
      expect(json).not.toContain('secretUser');
      expect(json).not.toContain('secretPass');
      // But metadata should be present
      expect(json).toContain('hasUsername');
      expect(json).toContain('hasCredential');
      expect(json).toContain('turn:turn.example.com:3478');
    });

    it('_sanitizeConfigForLog preserves credentialType', () => {
      const peer = createPeer();
      const config: RTCConfiguration = {
        iceServers: [
          {
            urls: 'turn:turn.example.com:3478',
            username: 'u',
            credential: 'c',
            credentialType: 'password',
          },
        ],
      };

      const sanitized = peer._sanitizeConfigForLog(config);
      const firstServer = sanitized.iceServers[0];

      expect(firstServer.credentialType).toBe('password');
      expect(firstServer.hasUsername).toBe(true);
      expect(firstServer.hasCredential).toBe(true);
    });

    it('_sanitizeConfigForLog handles empty config', () => {
      const peer = createPeer();
      const sanitized = peer._sanitizeConfigForLog({});

      expect(Object.keys(sanitized)).toHaveLength(0);
    });
  });
});
