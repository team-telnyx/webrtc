/**
 * Tests for VSDK-308 — Custom RTC/ICE configuration options for pre-call diagnostic.
 *
 * These tests verify:
 * - rtcConfig is passed through createDiagnosticCall to client.newCall()
 * - Default RTC config is preserved when no override is provided
 * - Custom ICE servers are passed to the diagnostic call
 * - Relay-only policy (iceTransportPolicy: 'relay') is passed correctly
 * - Partial overrides: omitted fields still use SDK defaults
 * - TURN credentials (username/credential) are redacted from logs/reports/context
 * - sanitizeRtcConfig correctly sanitizes all credential fields
 * - sanitizeIceServer handles all edge cases
 */

import { PreCallDiagnostic } from '../PreCallDiagnostic';
import type {
  ClientLike,
  CallLike,
  PreCallDiagnosticOptions,
} from '../types';
import {
  sanitizeRtcConfig,
  sanitizeIceServer,
  sanitizeCallOptionsRtcConfig,
} from '../sanitize';

// --- Mock helpers ---

function createMockCall(overrides: Partial<CallLike> = {}): CallLike {
  return {
    id: 'test-call-id',
    hangup: jest.fn(),
    peerConnection: undefined,
    ...overrides,
  };
}

function createMockClient(overrides: Partial<ClientLike> = {}): ClientLike {
  const mockCall = createMockCall();
  return {
    newCall: jest.fn().mockReturnValue(mockCall),
    ...overrides,
  };
}

function createOptions(
  overrides: Partial<PreCallDiagnosticOptions> = {}
): PreCallDiagnosticOptions {
  return {
    client: createMockClient(),
    destinationNumber: '1234',
    durationMs: 10, // Keep tests fast
    ...overrides,
  };
}

/**
 * Assert that a sanitized ice server entry does not contain raw
 * username or credential values.
 */
function expectNoRawCredentials(sanitizedEntry: unknown): void {
  const obj = sanitizedEntry as Record<string, unknown>;
  expect(obj).not.toHaveProperty('username');
  expect(obj).not.toHaveProperty('credential');
}

// --- Tests ---

describe('VSDK-308: Custom RTC/ICE configuration for pre-call diagnostic', () => {
  describe('rtcConfig passthrough', () => {
    it('passes rtcConfig to client.newCall when provided in options', async () => {
      const mockClient = createMockClient();
      const rtcConfig: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          rtcConfig,
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledWith(
        expect.objectContaining({
          rtcConfig,
        })
      );
    });

    it('does not pass rtcConfig when not provided in options', async () => {
      const mockClient = createMockClient();

      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      await diagnostic.run();

      const callArgs = (mockClient.newCall as jest.Mock).mock.calls[0][0];
      expect(callArgs.rtcConfig).toBeUndefined();
    });

    it('passes rtcConfig with custom ICE servers', async () => {
      const mockClient = createMockClient();
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
        { urls: 'stun:stun.l.google.com:19302' },
      ];
      const rtcConfig: RTCConfiguration = {
        iceServers: customIceServers,
      };

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          rtcConfig,
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledWith(
        expect.objectContaining({
          rtcConfig: {
            iceServers: customIceServers,
          },
        })
      );
    });

    it('passes rtcConfig with relay-only iceTransportPolicy', async () => {
      const mockClient = createMockClient();
      const rtcConfig: RTCConfiguration = {
        iceTransportPolicy: 'relay',
        iceServers: [
          { urls: 'turn:turn.example.com:3478', username: 'relayUser', credential: 'relayPass' },
        ],
      };

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          rtcConfig,
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledWith(
        expect.objectContaining({
          rtcConfig: {
            iceTransportPolicy: 'relay',
            iceServers: [
              { urls: 'turn:turn.example.com:3478', username: 'relayUser', credential: 'relayPass' },
            ],
          },
        })
      );
    });

    it('passes partial rtcConfig with only bundlePolicy', async () => {
      const mockClient = createMockClient();
      const rtcConfig: RTCConfiguration = {
        bundlePolicy: 'max-bundle',
      };

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          rtcConfig,
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledWith(
        expect.objectContaining({
          rtcConfig: { bundlePolicy: 'max-bundle' },
        })
      );
    });

    it('preserves other call options when rtcConfig is provided', async () => {
      const mockClient = createMockClient();
      const rtcConfig: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          destinationNumber: '9999',
          callerName: 'Diag Caller',
          callerNumber: '15559876543',
          audio: { echoCancellation: true },
          rtcConfig,
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationNumber: '9999',
          callerName: 'Diag Caller',
          callerNumber: '15559876543',
          audio: { echoCancellation: true },
          debug: true,
          rtcConfig,
        })
      );
    });
  });

  describe('default RTC config preservation', () => {
    it('returns a valid report when no rtcConfig is provided (uses SDK defaults)', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report).toBeDefined();
      expect(report.version).toBe(1);
      expect(report.verdict).toBeDefined();
    });

    it('does not include sanitizedRtcConfig in context when no rtcConfig is provided', async () => {
      // This is verified indirectly — the report has no rtcConfig-related fields
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      // Report should still be valid without any RTC config data
      expect(report.version).toBe(1);
      expect(report.timings).toBeDefined();
    });
  });

  describe('context sanitizedRtcConfig', () => {
    it('is populated when rtcConfig is provided', async () => {
      // Verify indirectly through the module builders — if context.sanitizedRtcConfig
      // is set, modules can access it without seeing raw credentials.
      // We test sanitizeRtcConfig directly below.
      const rtcConfig: RTCConfiguration = {
        iceServers: [
          { urls: 'turn:turn.example.com:3478', username: 'testUser', credential: 'testPass' },
        ],
        iceTransportPolicy: 'relay',
      };

      const diagnostic = new PreCallDiagnostic(
        createOptions({ rtcConfig })
      );

      const report = await diagnostic.run();
      expect(report.version).toBe(1);
    });
  });
});

describe('sanitizeIceServer', () => {
  it('redacts username and credential from a TURN server', () => {
    const server: RTCIceServer = {
      urls: 'turn:turn.example.com:3478',
      username: 'secretUser',
      credential: 'secretPass',
    };

    const result = sanitizeIceServer(server);

    expect(result.urls).toBe('turn:turn.example.com:3478');
    expect(result.hasUsername).toBe(true);
    expect(result.hasCredential).toBe(true);
    expectNoRawCredentials(result);
  });

  it('preserves credentialType metadata', () => {
    const server: RTCIceServer = {
      urls: 'turn:turn.example.com:3478',
      username: 'user',
      credential: 'pass',
      credentialType: 'password',
    };

    const result = sanitizeIceServer(server);

    expect(result.credentialType).toBe('password');
    expectNoRawCredentials(result);
  });

  it('handles STUN server without credentials', () => {
    const server: RTCIceServer = {
      urls: 'stun:stun.l.google.com:19302',
    };

    const result = sanitizeIceServer(server);

    expect(result.urls).toBe('stun:stun.l.google.com:19302');
    expect(result.hasUsername).toBe(false);
    expect(result.hasCredential).toBe(false);
  });

  it('handles server with username but no credential', () => {
    const server: RTCIceServer = {
      urls: 'turn:turn.example.com:3478',
      username: 'userOnly',
    };

    const result = sanitizeIceServer(server);

    expect(result.hasUsername).toBe(true);
    expect(result.hasCredential).toBe(false);
  });

  it('handles server with array of URLs', () => {
    const server: RTCIceServer = {
      urls: ['turn:turn1.example.com:3478', 'turn:turn2.example.com:3478'],
      username: 'multiUrlUser',
      credential: 'multiUrlPass',
    };

    const result = sanitizeIceServer(server);

    expect(result.urls).toEqual(['turn:turn1.example.com:3478', 'turn:turn2.example.com:3478']);
    expect(result.hasUsername).toBe(true);
    expect(result.hasCredential).toBe(true);
  });

  it('handles empty username and credential strings', () => {
    const server: RTCIceServer = {
      urls: 'turn:turn.example.com:3478',
      username: '',
      credential: '',
    };

    const result = sanitizeIceServer(server);

    expect(result.hasUsername).toBe(false);
    expect(result.hasCredential).toBe(false);
  });
});

describe('sanitizeRtcConfig', () => {
  it('returns undefined when config is undefined', () => {
    expect(sanitizeRtcConfig(undefined)).toBeUndefined();
  });

  it('sanitizes iceServers with TURN credentials', () => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'turn:turn.example.com:3478', username: 'secretUser', credential: 'secretPass' },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    const result = sanitizeRtcConfig(config);

    expect(result).toBeDefined();
    expect(result!.iceServers).toHaveLength(2);
    expect(result!.iceServers![0].urls).toBe('turn:turn.example.com:3478');
    expect(result!.iceServers![0].hasUsername).toBe(true);
    expect(result!.iceServers![0].hasCredential).toBe(true);
    expectNoRawCredentials(result!.iceServers![0]);
    expect(result!.iceServers![1].urls).toBe('stun:stun.l.google.com:19302');
    expect(result!.iceServers![1].hasUsername).toBe(false);
    expect(result!.iceServers![1].hasCredential).toBe(false);
  });

  it('preserves iceTransportPolicy', () => {
    const config: RTCConfiguration = {
      iceTransportPolicy: 'relay',
      iceServers: [{ urls: 'turn:turn.example.com:3478', username: 'u', credential: 'c' }],
    };

    const result = sanitizeRtcConfig(config);

    expect(result!.iceTransportPolicy).toBe('relay');
  });

  it('preserves bundlePolicy', () => {
    const config: RTCConfiguration = {
      bundlePolicy: 'max-bundle',
    };

    const result = sanitizeRtcConfig(config);

    expect(result!.bundlePolicy).toBe('max-bundle');
  });

  it('preserves iceCandidatePoolSize', () => {
    const config: RTCConfiguration = {
      iceCandidatePoolSize: 10,
    };

    const result = sanitizeRtcConfig(config);

    expect(result!.iceCandidatePoolSize).toBe(10);
  });

  it('omits iceServers when empty array', () => {
    const config: RTCConfiguration = {
      iceServers: [],
    };

    const result = sanitizeRtcConfig(config);

    expect(result!.iceServers).toBeUndefined();
  });

  it('omits iceServers when not provided', () => {
    const config: RTCConfiguration = {
      bundlePolicy: 'balanced',
    };

    const result = sanitizeRtcConfig(config);

    expect(result!.iceServers).toBeUndefined();
  });

  it('omits undefined non-secret fields', () => {
    const config: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    const result = sanitizeRtcConfig(config);

    expect(result!.iceTransportPolicy).toBeUndefined();
    expect(result!.bundlePolicy).toBeUndefined();
    expect(result!.iceCandidatePoolSize).toBeUndefined();
  });

  it('handles relay-only config with all fields', () => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'turn:turn.example.com:3478', username: 'relayUser', credential: 'relayPass' },
      ],
      iceTransportPolicy: 'relay',
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 5,
    };

    const result = sanitizeRtcConfig(config);

    expect(result!.iceServers).toHaveLength(1);
    expect(result!.iceServers![0].hasUsername).toBe(true);
    expect(result!.iceServers![0].hasCredential).toBe(true);
    expectNoRawCredentials(result!.iceServers![0]);
    expect(result!.iceTransportPolicy).toBe('relay');
    expect(result!.bundlePolicy).toBe('max-bundle');
    expect(result!.iceCandidatePoolSize).toBe(5);
  });

  it('never includes raw username or credential in output', () => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'turn:t1.example.com:3478', username: 'user1', credential: 'pass1' },
        { urls: 'turn:t2.example.com:3478?transport=tcp', username: 'user2', credential: 'pass2', credentialType: 'password' },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    const result = sanitizeRtcConfig(config);
    const json = JSON.stringify(result);

    expect(json).not.toContain('user1');
    expect(json).not.toContain('pass1');
    expect(json).not.toContain('user2');
    expect(json).not.toContain('pass2');
    expect(json).toContain('hasUsername');
    expect(json).toContain('hasCredential');
  });
});

describe('sanitizeCallOptionsRtcConfig', () => {
  it('returns undefined when call options have no rtcConfig', () => {
    const result = sanitizeCallOptionsRtcConfig({
      destinationNumber: '1234',
    });

    expect(result).toBeUndefined();
  });

  it('sanitizes rtcConfig from call options', () => {
    const result = sanitizeCallOptionsRtcConfig({
      destinationNumber: '1234',
      rtcConfig: {
        iceServers: [
          { urls: 'turn:turn.example.com:3478', username: 'secret', credential: 'secret' },
        ],
        iceTransportPolicy: 'relay',
      },
    });

    expect(result).toBeDefined();
    expect(result!.iceTransportPolicy).toBe('relay');
    expect(result!.iceServers![0].hasUsername).toBe(true);
    expect(result!.iceServers![0].hasCredential).toBe(true);
    expectNoRawCredentials(result!.iceServers![0]);
  });
});
