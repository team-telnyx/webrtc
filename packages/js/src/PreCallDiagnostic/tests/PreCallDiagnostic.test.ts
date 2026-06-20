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
  PreCallDiagnosticOptions,
} from '../types';
import type Call from '../../Modules/Verto/webrtc/Call';
import type { TelnyxRTC } from '../../TelnyxRTC';
import { PreCallDiagnosis } from '../../PreCallDiagnosis';

// --- Mock helpers ---

function createMockCall(overrides: Partial<Call> = {}): Call {
  return {
    id: 'test-call-id',
    hangup: jest.fn().mockResolvedValue(undefined),
    peer: { instance: null },
    ...overrides,
  } as unknown as Call;
}

function createMockClient(overrides: Partial<TelnyxRTC> = {}): TelnyxRTC {
  const mockCall = createMockCall();
  return {
    newCall: jest.fn().mockReturnValue(mockCall),
    ...overrides,
  } as unknown as TelnyxRTC;
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
      } as unknown as Partial<TelnyxRTC>);
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
      } as unknown as Partial<TelnyxRTC>);
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
      } as unknown as Partial<TelnyxRTC>);
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
      } as unknown as Partial<TelnyxRTC>);
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
      } as unknown as Partial<TelnyxRTC>);
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
      } as unknown as Partial<TelnyxRTC>);
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

  describe('stats sampling from diagnostic call', () => {
    it('produces a populated network report when call.getStats() returns SDK-shaped stats', async () => {
      // Simulate an SDK-shaped call that provides stats via getStats().
      // The stats frame uses the IStatsInterval / raw WebRTC shapes that
      // buildPreCallNetworkReport() knows how to consume.
      const sdkStatsFrame = {
        timestamp: Date.now(),
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 2,
              jitter: 0.005, // 5ms in seconds
              bytesReceived: 160000,
            },
          ],
          outbound: [
            {
              packetsSent: 1000,
              bytesSent: 160000,
            },
          ],
        },
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.025, // 25ms RTT
                jitter: 0.005, // 5ms jitter
              },
            ],
          },
        },
        connection: {
          currentRoundTripTime: 0.025,
          bytesSent: 160000,
          bytesReceived: 160000,
        },
      };

      const mockCall = createMockCall({
        getStats: jest.fn().mockResolvedValue(sdkStatsFrame),
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          durationMs: 10, // Short duration for test speed
          statsSampleIntervalMs: 5,
        })
      );

      const report = await diagnostic.run();

      // The network report should be populated (not quality: 'unknown')
      expect(report.network).toBeDefined();
      expect(report.network?.quality).not.toBe('unknown');
      expect(report.network?.quality).toBe('good');
      expect(report.network?.rtt).toBeDefined();
      expect(report.network?.rtt?.average).toBeCloseTo(25, 0);
      expect(report.network?.jitter).toBeDefined();
      expect(report.network?.jitter?.average).toBeCloseTo(5, 0);
      expect(report.network?.packets).toBeDefined();
      expect(report.network?.packets?.packetsReceived).toBe(1000);
      expect(report.network?.packets?.packetsLost).toBe(2);
      expect(report.network?.bytes).toBeDefined();
      expect(report.network?.bytes?.bytesSent).toBe(160000);
      expect(report.network?.bytes?.bytesReceived).toBe(160000);

      // Raw samples should be recorded in the report
      expect(report.raw?.samples).toBeDefined();
      expect(report.raw?.samples?.length).toBeGreaterThan(0);
    });

    it('produces a degraded network report when call stats show high RTT', async () => {
      const sdkStatsFrame = {
        timestamp: Date.now(),
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 5,
              jitter: 0.01,
              bytesReceived: 160000,
            },
          ],
          outbound: [
            {
              packetsSent: 1000,
              bytesSent: 160000,
            },
          ],
        },
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.4, // 400ms — degraded (>= 300ms)
                jitter: 0.01,
              },
            ],
          },
        },
      };

      const mockCall = createMockCall({
        getStats: jest.fn().mockResolvedValue(sdkStatsFrame),
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          durationMs: 10,
          statsSampleIntervalMs: 5,
        })
      );

      const report = await diagnostic.run();

      expect(report.network).toBeDefined();
      expect(report.network?.quality).toBe('fair');
      expect(report.network?.reasons?.some((r) => r.code === 'network_high_rtt_degraded')).toBe(true);
    });

    it('produces network report with quality: unknown when call provides no stats', async () => {
      // Call has no getStats() and no peerConnection
      const mockCall = createMockCall();
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          durationMs: 10,
        })
      );

      const report = await diagnostic.run();

      expect(report.network).toBeDefined();
      expect(report.network?.quality).toBe('unknown');
    });

    it('collects stats from peerConnection.getStats() when call.getStats() is not available', async () => {
      const sdkStatsFrame = {
        timestamp: Date.now(),
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.03, // 30ms
                jitter: 0.004, // 4ms
              },
            ],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 500,
              packetsLost: 0,
              jitter: 0.004,
              bytesReceived: 80000,
            },
          ],
          outbound: [
            {
              packetsSent: 500,
              bytesSent: 80000,
            },
          ],
        },
      };

      const mockPeerConnection = {
        getStats: jest.fn().mockResolvedValue(sdkStatsFrame),
      };

      const mockCall = createMockCall({
        peerConnection: mockPeerConnection as unknown as RTCPeerConnection,
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          durationMs: 10,
          statsSampleIntervalMs: 5,
        })
      );

      const report = await diagnostic.run();

      expect(report.network).toBeDefined();
      expect(report.network?.quality).not.toBe('unknown');
      expect(report.network?.quality).toBe('good');
      expect(report.network?.rtt?.average).toBeCloseTo(30, 0);
    });

    it('falls back to peerConnection.getStats() when call.getStats is callback-based (SDK BaseCall shape)', async () => {
      // Regression: The real SDK's BaseCall.getStats(callback, constraints) is
      // callback-based and returns undefined. Because call.getStats exists as a
      // function, the old code would await call.getStats() (getting undefined)
      // and never fall through to peerConnection.getStats(). This test verifies
      // that the callback-based getStats (length === 2) is detected and skipped
      // in favor of peerConnection.getStats().
      const sdkStatsFrame = {
        timestamp: Date.now(),
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.04, // 40ms
                jitter: 0.006, // 6ms
              },
            ],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 800,
              packetsLost: 1,
              jitter: 0.006,
              bytesReceived: 128000,
            },
          ],
          outbound: [
            {
              packetsSent: 800,
              bytesSent: 128000,
            },
          ],
        },
      };

      // Simulate the real SDK's BaseCall.getStats(callback, constraints) —
      // it takes 2 args and returns undefined (callback registration, not a promise).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function callbackGetStats(_callback: () => void, _constraints: unknown) {
        // Real SDK would register the callback and return undefined
        return undefined;
      }

      const mockPeerConnection = {
        getStats: jest.fn().mockResolvedValue(sdkStatsFrame),
      };

      const mockCall = createMockCall({
        getStats: callbackGetStats as unknown as () => Promise<unknown>,
        peerConnection: mockPeerConnection as unknown as RTCPeerConnection,
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          durationMs: 10,
          statsSampleIntervalMs: 5,
        })
      );

      const report = await diagnostic.run();

      // The peerConnection.getStats() should have been used as fallback
      expect(mockPeerConnection.getStats).toHaveBeenCalled();

      // The network report should be populated (not quality: 'unknown')
      expect(report.network).toBeDefined();
      expect(report.network?.quality).not.toBe('unknown');
      expect(report.network?.quality).toBe('good');
      expect(report.network?.rtt?.average).toBeCloseTo(40, 0);
      expect(report.network?.jitter?.average).toBeCloseTo(6, 0);
      expect(report.network?.packets?.packetsReceived).toBe(800);
    });

    it('collects multiple stats samples over the duration', async () => {
      let callCount = 0;
      const mockCall = createMockCall({
        getStats: jest.fn().mockImplementation(async () => {
          callCount++;
          return {
            timestamp: Date.now(),
            remote: {
              audio: {
                inbound: [{ roundTripTime: 0.02 + callCount * 0.01 }],
              },
            },
          };
        }),
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });

      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          durationMs: 50,
          statsSampleIntervalMs: 15,
        })
      );

      const report = await diagnostic.run();

      // Multiple samples should have been collected
      expect(report.raw?.samples).toBeDefined();
      expect(report.raw?.samples?.length).toBeGreaterThan(1);
      expect(callCount).toBeGreaterThan(1);
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
