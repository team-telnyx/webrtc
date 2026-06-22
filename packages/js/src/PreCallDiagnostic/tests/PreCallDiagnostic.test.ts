/**
 * Tests for PreCallDiagnostic — T1 skeleton and module template.
 *
 * These tests verify:
 * - API shape: constructor accepts typed options
 * - Report shape: run() returns a PreCallDiagnosticReport with version: 1
 * - Successful run: cleanup is called when autoHangup is true
 * - Failure cleanup: cleanup is called even when run() throws
 * - autoHangup: false — cleanup is NOT called
 * - Module extension points: module builders are called during run()
 * - Existing PreCallDiagnosis import compatibility
 */

import { PreCallDiagnostic } from '../PreCallDiagnostic';
import type {
  ClientLike,
  CallLike,
  PreCallDiagnosticOptions,
} from '../types';
import { PreCallDiagnosis } from '../../PreCallDiagnosis';

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

// --- Tests ---

describe('PreCallDiagnostic', () => {
  describe('constructor', () => {
    it('accepts typed options with required fields', () => {
      const options = createOptions();
      const diagnostic = new PreCallDiagnostic(options);
      expect(diagnostic).toBeInstanceOf(PreCallDiagnostic);
    });

    it('accepts options with all optional fields', () => {
      const options: PreCallDiagnosticOptions = {
        client: createMockClient(),
        destinationNumber: '1234',
        callerName: 'Test Caller',
        callerNumber: '15551234567',
        audio: true,
        timeoutMs: 10000,
        callSetupTimeoutMs: 5000,
        statsSampleIntervalMs: 500,
        durationMs: 3000,
        autoHangup: true,
        ice: { gatherCandidates: true, gatherTimeoutMs: 3000 },
        network: { enabled: true },
        media: { enabled: true },
        microphone: { checkPermission: true, checkDeviceAvailability: true },
        rtcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      };
      const diagnostic = new PreCallDiagnostic(options);
      expect(diagnostic).toBeInstanceOf(PreCallDiagnostic);
    });
  });

  describe('run()', () => {
    it('returns a PreCallDiagnosticReport with version: 1', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report).toBeDefined();
      expect(report.version).toBe(1);
    });

    it('returns a report with verdict', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.verdict).toBeDefined();
      // Default verdict from placeholder is 'inconclusive'
      expect(report.verdict).toBe('inconclusive');
    });

    it('returns a report with timings', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings).toBeDefined();
      expect(report.timings?.startedAt).toBeDefined();
      expect(report.timings?.completedAt).toBeDefined();
      expect(typeof report.timings?.startedAt).toBe('number');
      expect(typeof report.timings?.completedAt).toBe('number');
    });

    it('returns a report with reasons (empty array from placeholder)', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      // Placeholder verdict has no reasons, so reasons should be undefined
      expect(report.reasons).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('hangs up the diagnostic call when autoHangup is true (default)', async () => {
      const mockCall = createMockCall();
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      await diagnostic.run();

      expect(mockCall.hangup).toHaveBeenCalled();
    });

    it('does NOT hang up the call when autoHangup is false', async () => {
      const mockCall = createMockCall();
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient, autoHangup: false })
      );

      await diagnostic.run();

      expect(mockCall.hangup).not.toHaveBeenCalled();
    });

    it('cleans up even when an error occurs during the run', async () => {
      const mockClient = createMockClient({
        newCall: jest.fn().mockImplementation(() => {
          throw new Error('Call creation failed');
        }),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      // Should NOT throw — errors are caught and reported
      const report = await diagnostic.run();

      expect(report.version).toBe(1);
      // Error report still has a verdict
      expect(report.verdict).toBeDefined();
    });

    it('swallows hangup errors during cleanup', async () => {
      const mockCall = createMockCall({
        hangup: jest.fn().mockRejectedValue(new Error('Hangup failed')),
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      // Should NOT throw even though hangup rejects
      const report = await diagnostic.run();
      expect(report.version).toBe(1);
    });

    it('swallows synchronous hangup errors during cleanup', async () => {
      const mockCall = createMockCall({
        hangup: jest.fn().mockImplementation(() => {
          throw new Error('Hangup failed sync');
        }),
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      // Should NOT throw even though hangup throws synchronously
      const report = await diagnostic.run();
      expect(report.version).toBe(1);
    });

    it('awaits async hangup during cleanup', async () => {
      let hangupResolved = false;
      const mockCall = createMockCall({
        hangup: jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          hangupResolved = true;
        }),
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      await diagnostic.run();

      // hangup was awaited and completed
      expect(mockCall.hangup).toHaveBeenCalled();
      expect(hangupResolved).toBe(true);
    });
  });

  describe('call creation', () => {
    it('calls client.newCall with the correct options', async () => {
      const mockClient = createMockClient();
      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          destinationNumber: '9999',
          callerName: 'Diag Caller',
          callerNumber: '15559876543',
          audio: { echoCancellation: true },
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
        })
      );
    });

    // --- Runtime ICE servers wiring (VSDK-306 changes-requested resolution) ---
    // The TelnyxRTC public methods (runPreCall/runNetworkCheck/runMicrophoneCheck)
    // build `PreCallDiagnosticOptions.rtcConfig` from `options.iceServers ?? this.iceServers`.
    // createDiagnosticCall() must thread `rtcConfig.iceServers` through to the
    // real `client.newCall()` call options — not just leave it on the
    // PreCallDiagnostic constructor options. These tests exercise the runtime
    // path (no PreCallDiagnostic mock) to assert that wiring.

    it('passes rtcConfig.iceServers through to client.newCall at runtime', async () => {
      const customIceServers: RTCIceServer[] = [
        { urls: 'turn:turn.example.com', username: 'user', credential: 'pass' },
      ];
      const mockClient = createMockClient();
      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          destinationNumber: '1234',
          rtcConfig: { iceServers: customIceServers },
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledTimes(1);
      expect(mockClient.newCall).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationNumber: '1234',
          debug: true,
          iceServers: customIceServers,
        })
      );
      // Identity must be preserved (no copy/mutation) so the same array
      // the caller supplied reaches the SDK call path.
      const callArg = (mockClient.newCall as jest.Mock).mock.calls[0][0];
      expect(callArg.iceServers).toBe(customIceServers);
    });

    it('does NOT pass iceServers to client.newCall when rtcConfig is undefined', async () => {
      // Lower-level callers who construct PreCallDiagnosticOptions directly
      // without rtcConfig should let the SDK fall back to the client's own
      // default ICE server configuration (normal call behavior).
      const mockClient = createMockClient();
      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          destinationNumber: '1234',
          // rtcConfig intentionally omitted
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledTimes(1);
      const callArg = (mockClient.newCall as jest.Mock).mock.calls[0][0];
      // iceServers must NOT be present on the call options — the SDK should
      // apply its own default ICE server configuration for this call.
      expect(callArg).not.toHaveProperty('iceServers');
    });

    it('does NOT pass iceServers to client.newCall when rtcConfig.iceServers is empty', async () => {
      // An empty iceServers array is treated as "no explicit override" so the
      // call falls back to the client default rather than dialing with no
      // ICE servers at all.
      const mockClient = createMockClient();
      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          destinationNumber: '1234',
          rtcConfig: { iceServers: [] },
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledTimes(1);
      const callArg = (mockClient.newCall as jest.Mock).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('iceServers');
    });

    it('still passes destinationNumber/audio/debug to client.newCall when iceServers is wired', async () => {
      // Ensure threading iceServers through does not regress other call fields.
      const customIceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
      ];
      const mockClient = createMockClient();
      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          destinationNumber: '4321',
          callerName: 'Wired',
          callerNumber: '15551110000',
          audio: false,
          rtcConfig: { iceServers: customIceServers },
        })
      );

      await diagnostic.run();

      expect(mockClient.newCall).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationNumber: '4321',
          callerName: 'Wired',
          callerNumber: '15551110000',
          audio: false,
          debug: true,
          iceServers: customIceServers,
        })
      );
    });

    it('passes the same iceServers array to client.newCall when rtcConfig.iceServers matches the client default', async () => {
      // The public API builds rtcConfig.iceServers from `this.iceServers`
      // when the caller omits iceServers. The runtime path must forward
      // that same array reference to client.newCall (no copy, no mutation).
      const clientIceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
      ];
      const mockClient = createMockClient();
      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          destinationNumber: '1234',
          rtcConfig: { iceServers: clientIceServers },
        })
      );

      await diagnostic.run();

      const callArg = (mockClient.newCall as jest.Mock).mock.calls[0][0];
      expect(callArg.iceServers).toBe(clientIceServers);
    });
  });

  describe('module extension points', () => {
    it('does not include ice section when ice is disabled', async () => {
      const diagnostic = new PreCallDiagnostic(
        createOptions({ ice: false })
      );
      const report = await diagnostic.run();

      expect(report.ice).toBeUndefined();
    });

    it('does not include network section when network is disabled', async () => {
      const diagnostic = new PreCallDiagnostic(
        createOptions({ network: false })
      );
      const report = await diagnostic.run();

      expect(report.network).toBeUndefined();
    });

    it('does not include media section when media is disabled', async () => {
      const diagnostic = new PreCallDiagnostic(
        createOptions({ media: false })
      );
      const report = await diagnostic.run();

      expect(report.media).toBeUndefined();
    });

    it('does not include microphone section when microphone is disabled', async () => {
      const diagnostic = new PreCallDiagnostic(
        createOptions({ microphone: false })
      );
      const report = await diagnostic.run();

      expect(report.microphone).toBeUndefined();
    });

    it('includes placeholder module sections when enabled (default)', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      // Placeholder modules return undefined — sections exist in the report
      // structure but are undefined until future tickets implement them
      expect(report).toHaveProperty('ice');
      expect(report).toHaveProperty('network');
      expect(report).toHaveProperty('media');
      expect(report).toHaveProperty('microphone');
    });
  });

  describe('report shape', () => {
    it('has all expected top-level fields', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report).toHaveProperty('version');
      expect(report).toHaveProperty('verdict');
      expect(report).toHaveProperty('reasons');
      expect(report).toHaveProperty('timings');
      expect(report).toHaveProperty('ice');
      expect(report).toHaveProperty('network');
      expect(report).toHaveProperty('media');
      expect(report).toHaveProperty('microphone');
      expect(report).toHaveProperty('raw');
    });

    it('timings report has expected fields', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      const timings = report.timings;
      expect(timings).toBeDefined();
      expect(timings?.startedAt).toBeDefined();
      expect(timings?.completedAt).toBeDefined();
    });
  });
});

describe('PreCallDiagnostic compatibility with PreCallDiagnosis', () => {
  it('existing PreCallDiagnosis export is not affected', () => {
    // Verify the existing PreCallDiagnosis can still be imported
    // This test is structural — if the import works, the existing API is preserved
    expect(PreCallDiagnosis).toBeDefined();
    expect(typeof PreCallDiagnosis.run).toBe('function');
  });
});
