/**
 * Tests for TelnyxRTC.runNetworkCheck() and TelnyxRTC.runMicrophoneCheck() —
 * T9 public API (VSDK-306).
 *
 * These tests verify:
 * - Module gating: runNetworkCheck enables only ICE; runMicrophoneCheck only microphone
 * - Option mapping: call-setup and timing fields map into PreCallDiagnosticOptions
 * - Client/config reuse: client's ICE servers are reused when not overridden
 * - iceServers handling (folded VSDK-308):
 *   - omitted → reuses client's iceServers
 *   - provided → passed only to the diagnostic call (in rtcConfig.iceServers)
 *   - provided → does NOT mutate client.iceServers
 *   - rtcConfig takes precedence over iceServers when both are provided
 * - Returned report passthrough
 */

import {
  TelnyxRTC,
  RunNetworkCheckOptions,
  RunMicrophoneCheckOptions,
} from './TelnyxRTC';
import type { PreCallDiagnosticOptions } from './PreCallDiagnostic/types';

// --- Mock PreCallDiagnostic to intercept constructor options ---

let capturedDiagnosticOptions: PreCallDiagnosticOptions | null = null;

jest.mock('./PreCallDiagnostic', () => {
  return {
    PreCallDiagnostic: jest.fn().mockImplementation(
      (options: PreCallDiagnosticOptions) => {
        capturedDiagnosticOptions = options;
        return {
          run: jest.fn().mockResolvedValue({
            version: 1,
            verdict: 'inconclusive' as const,
            timings: {
              startedAt: Date.now(),
              completedAt: Date.now(),
            },
          }),
        };
      }
    ),
  };
});

// --- Mock the Verto base class so TelnyxRTC can be instantiated without a real WS ---

interface MockVertoOptions {
  [key: string]: unknown;
  login_token?: string;
}

jest.mock('./Modules/Verto', () => {
  return class MockVerto {
    options: MockVertoOptions;
    iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
    ];
    calls: Record<string, unknown> = {};
    constructor(options: MockVertoOptions) {
      this.options = options;
    }
    newCall() {
      return { id: 'mock-call', hangup: jest.fn() };
    }
    connect() {
      return Promise.resolve();
    }
    disconnect() {
      return Promise.resolve();
    }
    on() {
      return this;
    }
    off() {
      return this;
    }
  };
});

// --- Helper ---

function createClient(overrides: Partial<MockVertoOptions> = {}): TelnyxRTC {
  return new TelnyxRTC({
    login_token: 'test-token',
    ...overrides,
  });
}

// --- Tests ---

describe('TelnyxRTC.runNetworkCheck', () => {
  beforeEach(() => {
    capturedDiagnosticOptions = null;
    jest.clearAllMocks();
  });

  describe('module gating', () => {
    it('enables ICE by default and disables network/media/microphone', async () => {
      const client = createClient();
      await client.runNetworkCheck({ destinationNumber: '1234' });

      expect(capturedDiagnosticOptions!.ice).toBe(true);
      expect(capturedDiagnosticOptions!.network).toBe(false);
      expect(capturedDiagnosticOptions!.media).toBe(false);
      expect(capturedDiagnosticOptions!.microphone).toBe(false);
    });

    it('preserves caller-provided ICE options (object form)', async () => {
      const client = createClient();
      await client.runNetworkCheck({
        destinationNumber: '1234',
        ice: { gatherCandidates: false, gatherTimeoutMs: 2000 },
      });

      expect(capturedDiagnosticOptions!.ice).toEqual({
        gatherCandidates: false,
        gatherTimeoutMs: 2000,
      });
      expect(capturedDiagnosticOptions!.network).toBe(false);
      expect(capturedDiagnosticOptions!.media).toBe(false);
      expect(capturedDiagnosticOptions!.microphone).toBe(false);
    });

    it('allows explicitly disabling ICE via ice: false', async () => {
      const client = createClient();
      await client.runNetworkCheck({
        destinationNumber: '1234',
        ice: false,
      });

      expect(capturedDiagnosticOptions!.ice).toBe(false);
      expect(capturedDiagnosticOptions!.network).toBe(false);
      expect(capturedDiagnosticOptions!.media).toBe(false);
      expect(capturedDiagnosticOptions!.microphone).toBe(false);
    });
  });

  describe('option mapping', () => {
    it('maps required destinationNumber', async () => {
      const client = createClient();
      await client.runNetworkCheck({ destinationNumber: '9999' });

      expect(capturedDiagnosticOptions!.destinationNumber).toBe('9999');
    });

    it('maps call-setup fields (callerName, callerNumber, audio)', async () => {
      const client = createClient();
      await client.runNetworkCheck({
        destinationNumber: '1234',
        callerName: 'Net Check',
        callerNumber: '15550001111',
        audio: { echoCancellation: true },
      });

      expect(capturedDiagnosticOptions!.callerName).toBe('Net Check');
      expect(capturedDiagnosticOptions!.callerNumber).toBe('15550001111');
      expect(capturedDiagnosticOptions!.audio).toEqual({
        echoCancellation: true,
      });
    });

    it('maps timing options', async () => {
      const client = createClient();
      await client.runNetworkCheck({
        destinationNumber: '1234',
        timeoutMs: 12000,
        callSetupTimeoutMs: 7000,
        statsSampleIntervalMs: 250,
        durationMs: 2000,
      });

      expect(capturedDiagnosticOptions!.timeoutMs).toBe(12000);
      expect(capturedDiagnosticOptions!.callSetupTimeoutMs).toBe(7000);
      expect(capturedDiagnosticOptions!.statsSampleIntervalMs).toBe(250);
      expect(capturedDiagnosticOptions!.durationMs).toBe(2000);
    });

    it('maps autoHangup', async () => {
      const client = createClient();
      await client.runNetworkCheck({
        destinationNumber: '1234',
        autoHangup: false,
      });

      expect(capturedDiagnosticOptions!.autoHangup).toBe(false);
    });
  });

  describe('client/config reuse', () => {
    it('passes client: this as the client dependency', async () => {
      const client = createClient();
      await client.runNetworkCheck({ destinationNumber: '1234' });

      expect(capturedDiagnosticOptions!.client).toBe(client);
    });

    it('reuses client ICE servers when iceServers is not provided', async () => {
      const client = createClient();
      await client.runNetworkCheck({ destinationNumber: '1234' });

      expect(capturedDiagnosticOptions!.rtcConfig).toBeDefined();
      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).toBe(
        client.iceServers
      );
    });
  });

  describe('returned report passthrough', () => {
    it('returns PreCallDiagnosticReport from diagnostic.run()', async () => {
      const client = createClient();
      const report = await client.runNetworkCheck({
        destinationNumber: '1234',
      });

      expect(report).toBeDefined();
      expect(report.version).toBe(1);
      expect(report.verdict).toBe('inconclusive');
    });
  });
});

describe('TelnyxRTC.runMicrophoneCheck', () => {
  beforeEach(() => {
    capturedDiagnosticOptions = null;
    jest.clearAllMocks();
  });

  describe('module gating', () => {
    it('enables microphone by default and disables ice/network/media', async () => {
      const client = createClient();
      await client.runMicrophoneCheck({ destinationNumber: '1234' });

      expect(capturedDiagnosticOptions!.microphone).toBe(true);
      expect(capturedDiagnosticOptions!.ice).toBe(false);
      expect(capturedDiagnosticOptions!.network).toBe(false);
      expect(capturedDiagnosticOptions!.media).toBe(false);
    });

    it('preserves caller-provided microphone options (object form)', async () => {
      const client = createClient();
      await client.runMicrophoneCheck({
        destinationNumber: '1234',
        microphone: {
          checkPermission: true,
          checkDeviceAvailability: false,
        },
      });

      expect(capturedDiagnosticOptions!.microphone).toEqual({
        checkPermission: true,
        checkDeviceAvailability: false,
      });
      expect(capturedDiagnosticOptions!.ice).toBe(false);
      expect(capturedDiagnosticOptions!.network).toBe(false);
      expect(capturedDiagnosticOptions!.media).toBe(false);
    });

    it('allows explicitly disabling microphone via microphone: false', async () => {
      const client = createClient();
      await client.runMicrophoneCheck({
        destinationNumber: '1234',
        microphone: false,
      });

      expect(capturedDiagnosticOptions!.microphone).toBe(false);
      expect(capturedDiagnosticOptions!.ice).toBe(false);
    });
  });

  describe('option mapping', () => {
    it('maps required destinationNumber', async () => {
      const client = createClient();
      await client.runMicrophoneCheck({ destinationNumber: '7777' });

      expect(capturedDiagnosticOptions!.destinationNumber).toBe('7777');
    });

    it('maps call-setup fields', async () => {
      const client = createClient();
      await client.runMicrophoneCheck({
        destinationNumber: '1234',
        callerName: 'Mic Check',
        callerNumber: '15559998888',
        audio: false,
      });

      expect(capturedDiagnosticOptions!.callerName).toBe('Mic Check');
      expect(capturedDiagnosticOptions!.callerNumber).toBe('15559998888');
      expect(capturedDiagnosticOptions!.audio).toBe(false);
    });

    it('maps timing options', async () => {
      const client = createClient();
      await client.runMicrophoneCheck({
        destinationNumber: '1234',
        timeoutMs: 8000,
        durationMs: 1000,
      });

      expect(capturedDiagnosticOptions!.timeoutMs).toBe(8000);
      expect(capturedDiagnosticOptions!.durationMs).toBe(1000);
    });
  });

  describe('returned report passthrough', () => {
    it('returns PreCallDiagnosticReport from diagnostic.run()', async () => {
      const client = createClient();
      const report = await client.runMicrophoneCheck({
        destinationNumber: '1234',
      });

      expect(report).toBeDefined();
      expect(report.version).toBe(1);
    });
  });
});

describe('iceServers handling (folded VSDK-308)', () => {
  beforeEach(() => {
    capturedDiagnosticOptions = null;
    jest.clearAllMocks();
  });

  describe('runPreCall', () => {
    it('uses caller-provided iceServers when provided', async () => {
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com', username: 'user', credential: 'pass' },
      ];
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '1234',
        iceServers: customIceServers,
      });

      expect(capturedDiagnosticOptions!.rtcConfig).toBeDefined();
      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).toBe(
        customIceServers
      );
    });

    it('does NOT mutate client.iceServers when iceServers is provided', async () => {
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com' },
      ];
      const client = createClient();
      const originalClientIceServers = client.iceServers;

      await client.runPreCall({
        destinationNumber: '1234',
        iceServers: customIceServers,
      });

      // Client's ICE servers must be unchanged
      expect(client.iceServers).toBe(originalClientIceServers);
      expect(client.iceServers).not.toBe(customIceServers);
      // The diagnostic got the custom servers, not the client's
      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).toBe(
        customIceServers
      );
    });

    it('reuses client iceServers when iceServers is omitted', async () => {
      const client = createClient();
      await client.runPreCall({ destinationNumber: '1234' });

      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).toBe(
        client.iceServers
      );
    });

    it('uses rtcConfig instead of iceServers when both are provided', async () => {
      const customRtcConfig: RTCConfiguration = {
        iceServers: [{ urls: 'turn:rtcconfig.example.com' }],
      };
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:iceservers.example.com' },
      ];
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '1234',
        rtcConfig: customRtcConfig,
        iceServers: customIceServers,
      });

      // rtcConfig takes precedence
      expect(capturedDiagnosticOptions!.rtcConfig).toBe(customRtcConfig);
      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).not.toBe(
        customIceServers
      );
    });
  });

  describe('runNetworkCheck', () => {
    it('uses caller-provided iceServers when provided', async () => {
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com' },
      ];
      const client = createClient();
      await client.runNetworkCheck({
        destinationNumber: '1234',
        iceServers: customIceServers,
      });

      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).toBe(
        customIceServers
      );
    });

    it('does NOT mutate client.iceServers when iceServers is provided', async () => {
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com' },
      ];
      const client = createClient();
      const originalClientIceServers = client.iceServers;

      await client.runNetworkCheck({
        destinationNumber: '1234',
        iceServers: customIceServers,
      });

      expect(client.iceServers).toBe(originalClientIceServers);
      expect(client.iceServers).not.toBe(customIceServers);
    });
  });

  describe('runMicrophoneCheck', () => {
    it('uses caller-provided iceServers when provided', async () => {
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com' },
      ];
      const client = createClient();
      await client.runMicrophoneCheck({
        destinationNumber: '1234',
        iceServers: customIceServers,
      });

      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).toBe(
        customIceServers
      );
    });

    it('does NOT mutate client.iceServers when iceServers is provided', async () => {
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com' },
      ];
      const client = createClient();
      const originalClientIceServers = client.iceServers;

      await client.runMicrophoneCheck({
        destinationNumber: '1234',
        iceServers: customIceServers,
      });

      expect(client.iceServers).toBe(originalClientIceServers);
      expect(client.iceServers).not.toBe(customIceServers);
    });
  });
});

describe('Type exports', () => {
  it('RunNetworkCheckOptions is exported as a type', () => {
    const options: RunNetworkCheckOptions = {
      destinationNumber: '1234',
    };
    expect(options.destinationNumber).toBe('1234');
  });

  it('RunMicrophoneCheckOptions is exported as a type', () => {
    const options: RunMicrophoneCheckOptions = {
      destinationNumber: '1234',
    };
    expect(options.destinationNumber).toBe('1234');
  });
});
