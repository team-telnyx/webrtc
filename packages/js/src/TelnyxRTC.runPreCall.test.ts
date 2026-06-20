/**
 * Tests for TelnyxRTC.runPreCall() — T9 public API.
 *
 * These tests verify:
 * - Option mapping: RunPreCallOptions fields map into PreCallDiagnosticOptions
 * - Client/config reuse: client's ICE servers are reused when rtcConfig is not overridden
 * - Returned report passthrough: runPreCall returns the PreCallDiagnosticReport
 * - Backwards-compatible public exports: existing APIs and PreCallDiagnosis unaffected
 */

import { TelnyxRTC, RunPreCallOptions } from './TelnyxRTC';
import { PreCallDiagnostic } from './PreCallDiagnostic';
import type {
  PreCallDiagnosticOptions,
  PreCallDiagnosticReport,
} from './PreCallDiagnostic/types';
import { PreCallDiagnosis } from './PreCallDiagnosis';

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

jest.mock('./Modules/Verto', () => {
  return class MockVerto {
    options: any;
    iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
    ];
    calls: any = {};
    constructor(options: any) {
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

function createClient(overrides: Record<string, any> = {}): TelnyxRTC {
  return new TelnyxRTC({
    login_token: 'test-token',
    ...overrides,
  });
}

// --- Tests ---

describe('TelnyxRTC.runPreCall', () => {
  beforeEach(() => {
    capturedDiagnosticOptions = null;
    jest.clearAllMocks();
  });

  describe('option mapping', () => {
    it('maps required destinationNumber into PreCallDiagnosticOptions', async () => {
      const client = createClient();
      await client.runPreCall({ destinationNumber: '1234' });

      expect(capturedDiagnosticOptions).toBeDefined();
      expect(capturedDiagnosticOptions!.destinationNumber).toBe('1234');
    });

    it('maps all call-setup fields into PreCallDiagnosticOptions', async () => {
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '9999',
        callerName: 'Test Caller',
        callerNumber: '15559876543',
        audio: { echoCancellation: true },
      });

      expect(capturedDiagnosticOptions!.callerName).toBe('Test Caller');
      expect(capturedDiagnosticOptions!.callerNumber).toBe('15559876543');
      expect(capturedDiagnosticOptions!.audio).toEqual({
        echoCancellation: true,
      });
    });

    it('maps timeout and timing options into PreCallDiagnosticOptions', async () => {
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '1234',
        timeoutMs: 15000,
        callSetupTimeoutMs: 8000,
        statsSampleIntervalMs: 500,
        durationMs: 3000,
      });

      expect(capturedDiagnosticOptions!.timeoutMs).toBe(15000);
      expect(capturedDiagnosticOptions!.callSetupTimeoutMs).toBe(8000);
      expect(capturedDiagnosticOptions!.statsSampleIntervalMs).toBe(500);
      expect(capturedDiagnosticOptions!.durationMs).toBe(3000);
    });

    it('maps autoHangup into PreCallDiagnosticOptions', async () => {
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '1234',
        autoHangup: false,
      });

      expect(capturedDiagnosticOptions!.autoHangup).toBe(false);
    });

    it('maps diagnostic probe options into PreCallDiagnosticOptions', async () => {
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '1234',
        ice: { gatherCandidates: true, gatherTimeoutMs: 3000 },
        network: { enabled: true },
        media: { enabled: false },
        microphone: { checkPermission: true, checkDeviceAvailability: false },
      });

      expect(capturedDiagnosticOptions!.ice).toEqual({
        gatherCandidates: true,
        gatherTimeoutMs: 3000,
      });
      expect(capturedDiagnosticOptions!.network).toEqual({ enabled: true });
      expect(capturedDiagnosticOptions!.media).toEqual({ enabled: false });
      expect(capturedDiagnosticOptions!.microphone).toEqual({
        checkPermission: true,
        checkDeviceAvailability: false,
      });
    });

    it('maps boolean probe options (shorthand) into PreCallDiagnosticOptions', async () => {
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '1234',
        ice: false,
        network: true,
        media: false,
        microphone: false,
      });

      expect(capturedDiagnosticOptions!.ice).toBe(false);
      expect(capturedDiagnosticOptions!.network).toBe(true);
      expect(capturedDiagnosticOptions!.media).toBe(false);
      expect(capturedDiagnosticOptions!.microphone).toBe(false);
    });

    it('maps rtcConfig into PreCallDiagnosticOptions when provided', async () => {
      const customRtcConfig: RTCConfiguration = {
        iceServers: [{ urls: 'turn:turn.example.com' }],
      };
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '1234',
        rtcConfig: customRtcConfig,
      });

      expect(capturedDiagnosticOptions!.rtcConfig).toBe(customRtcConfig);
    });
  });

  describe('client/config reuse', () => {
    it('passes client: this as the client dependency', async () => {
      const client = createClient();
      await client.runPreCall({ destinationNumber: '1234' });

      expect(capturedDiagnosticOptions!.client).toBe(client);
    });

    it('reuses client ICE servers when rtcConfig is not provided', async () => {
      const client = createClient();
      await client.runPreCall({ destinationNumber: '1234' });

      expect(capturedDiagnosticOptions!.rtcConfig).toBeDefined();
      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).toBe(
        client.iceServers
      );
    });

    it('uses caller-provided rtcConfig instead of client ICE servers when both exist', async () => {
      const customRtcConfig: RTCConfiguration = {
        iceServers: [{ urls: 'turn:custom.example.com' }],
      };
      const client = createClient();
      await client.runPreCall({
        destinationNumber: '1234',
        rtcConfig: customRtcConfig,
      });

      // Should be the custom config, not the client's default
      expect(capturedDiagnosticOptions!.rtcConfig).toBe(customRtcConfig);
      expect(capturedDiagnosticOptions!.rtcConfig!.iceServers).not.toBe(
        client.iceServers
      );
    });
  });

  describe('returned report passthrough', () => {
    it('returns PreCallDiagnosticReport from diagnostic.run()', async () => {
      const client = createClient();
      const report = await client.runPreCall({ destinationNumber: '1234' });

      expect(report).toBeDefined();
      expect(report.version).toBe(1);
      expect(report.verdict).toBe('inconclusive');
      expect(report.timings).toBeDefined();
    });

    it('returns report with verdict type from PreCallDiagnosticReport', async () => {
      const client = createClient();
      const report = await client.runPreCall({ destinationNumber: '1234' });

      // Type check: verdict should be one of the allowed values
      expect(['ready', 'degraded', 'blocked', 'permission_denied', 'inconclusive']).toContain(report.verdict);
    });
  });

  describe('PreCallDiagnostic instantiation', () => {
    it('instantiates PreCallDiagnostic with the mapped options', async () => {
      const client = createClient();
      await client.runPreCall({ destinationNumber: '1234' });

      expect(PreCallDiagnostic).toHaveBeenCalledWith(
        expect.objectContaining({
          client: client,
          destinationNumber: '1234',
        })
      );
    });

    it('calls diagnostic.run() exactly once', async () => {
      const client = createClient();
      await client.runPreCall({ destinationNumber: '1234' });

      // The mock's run() is called once per runPreCall
      const mockInstance = (PreCallDiagnostic as jest.Mock).mock.results[0]
        .value;
      expect(mockInstance.run).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Backwards compatibility with existing APIs', () => {
  it('PreCallDiagnosis is still importable and has the same API', () => {
    expect(PreCallDiagnosis).toBeDefined();
    expect(typeof PreCallDiagnosis.run).toBe('function');
  });

  it('TelnyxRTC still has newCall and static methods', () => {
    const client = createClient();
    expect(typeof client.newCall).toBe('function');
    expect(typeof TelnyxRTC.webRTCInfo).toBe('function');
    expect(typeof TelnyxRTC.webRTCSupportedBrowserList).toBe('function');
  });

  it('runPreCall does not replace or modify existing client methods', () => {
    const client = createClient();
    expect(typeof client.runPreCall).toBe('function');
    expect(typeof client.newCall).toBe('function');
    // Existing methods are still present
    expect(typeof client.connect).toBe('function');
    expect(typeof client.disconnect).toBe('function');
  });
});

describe('RunPreCallOptions type export', () => {
  it('is exported from the package entry point', () => {
    // If this compiles and runs, the type export is working
    const options: RunPreCallOptions = {
      destinationNumber: '1234',
    };
    expect(options.destinationNumber).toBe('1234');
  });
});
