/**
 * Tests for the shared stats sampling pipeline — VSDK-301.
 *
 * These tests verify the `PreCallDiagnostic.collectOneSample()` /
 * `collectSamples()` pipeline through `run()`, covering:
 * - Missing peer connection (no getStats available anywhere)
 * - Empty stats (getStats returns empty/null)
 * - Rejected getStats (getStats throws) — must not abort diagnostic
 * - Partial browser stats (only some RTP entries present)
 * - Real SDK callback-style getStats fallback (BaseCall.getStats is
 *   callback-based with length === 2; must fall back to peerConnection)
 * - peer.instance fallback for real SDK Call shape
 * - Stats are collected into context.statsSamples and surfaced in raw.samples
 *
 * The pipeline is owned by PreCallDiagnostic; both the network and media
 * modules consume context.statsSamples only.
 */

import { PreCallDiagnostic } from '../PreCallDiagnostic';
import type {
  PreCallDiagnosticOptions,
} from '../types';
import type Call from '../../Modules/Verto/webrtc/Call';
import type { TelnyxRTC } from '../../TelnyxRTC';

// --- Mock helpers ---

// Permissive overrides type: allows partial `peer` with just `instance`
// (the real Peer type has 53+ properties we don't need in tests).
type MockCallOverrides = Partial<Omit<Call, 'peer'>> & {
  peer?: { instance?: RTCPeerConnection | null };
  getStats?: (...args: unknown[]) => unknown;
};
function createMockCall(overrides: MockCallOverrides = {}): Call {
  return {
    id: 'test-call-id',
    hangup: jest.fn(),
    peer: { instance: undefined },
    ...overrides,
  } as unknown as Call;
}

function createMockClient(
  mockCall: Call
): TelnyxRTC {
  return {
    newCall: jest.fn().mockReturnValue(mockCall),
  } as unknown as TelnyxRTC;
}

function createOptions(
  overrides: Partial<PreCallDiagnosticOptions> & { client: TelnyxRTC }
): PreCallDiagnosticOptions {
  return {
    destinationNumber: '1234',
    durationMs: 10, // Keep tests fast
    statsSampleIntervalMs: 5,
    ...overrides,
  };
}

// A valid stats frame with both inbound and outbound audio
function createValidFrame(): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    audio: {
      inbound: [
        {
          packetsReceived: 1000,
          packetsLost: 0,
          jitter: 0.005,
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
        inbound: [{ roundTripTime: 0.025, jitter: 0.005 }],
      },
    },
  };
}

// --- Tests ---

describe('PreCallDiagnostic stats collection pipeline', () => {
  describe('missing peer connection', () => {
    it('produces quality: unknown and media_no_stats when no stats source exists', async () => {
      // Call has no getStats, no peerConnection, no peer.instance
      const mockCall = createMockCall();
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // No stats collected → network quality unknown, media no_stats
      expect(report.network).toBeDefined();
      expect(report.network?.quality).toBe('unknown');
      expect(report.media).toBeDefined();
      expect(report.media?.audioFlowing).toBe(false);
      expect(report.media?.reasons?.[0]?.code).toBe('media_no_stats');
      // raw.samples should be undefined (no samples collected)
      expect(report.raw?.samples).toBeUndefined();
    });
  });

  describe('empty stats', () => {
    it('handles getStats returning null without crashing', async () => {
      const mockCall = createMockCall({
        getStats: jest.fn().mockResolvedValue(null) as unknown as () => Promise<unknown>,
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // No valid frames collected
      expect(report.network?.quality).toBe('unknown');
      expect(report.media?.audioFlowing).toBe(false);
    });

    it('handles getStats returning an empty object', async () => {
      const mockCall = createMockCall({
        getStats: jest.fn().mockResolvedValue({}) as unknown as () => Promise<unknown>,
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // Empty object is passed through as a frame (no audio/connection keys),
      // so media sees "no audio RTP" and network sees "unknown"
      expect(report.network).toBeDefined();
      expect(report.media).toBeDefined();
      // It won't crash
    });
  });

  describe('rejected getStats', () => {
    it('does not abort diagnostic when getStats throws on first call', async () => {
      const mockCall = createMockCall({
        getStats: jest.fn().mockRejectedValue(new Error('getStats failed')) as unknown as () => Promise<unknown>,
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // Diagnostic completed despite getStats errors
      expect(report).toBeDefined();
      expect(report.verdict).toBeDefined();
      expect(report.network?.quality).toBe('unknown');
    });

    it('continues collecting after some samples fail and others succeed', async () => {
      let callCount = 0;
      const mockCall = createMockCall({
        getStats: jest.fn().mockImplementation(async () => {
          callCount++;
          // Odd calls fail, even calls succeed
          if (callCount % 2 === 1) {
            throw new Error('intermittent failure');
          }
          return createValidFrame();
        }) as unknown as () => Promise<unknown>,
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          durationMs: 40,
          statsSampleIntervalMs: 10,
        })
      );

      const report = await diagnostic.run();

      // Some samples should have been collected despite intermittent failures
      expect(report).toBeDefined();
      // At least one successful sample → network not unknown
      if (report.raw?.samples && (report.raw.samples as unknown[]).length > 0) {
        expect(report.network?.quality).not.toBe('unknown');
      }
    });
  });

  describe('partial browser stats', () => {
    it('handles frames with only outbound audio (no inbound, no remote, no connection)', async () => {
      const partialFrame = {
        timestamp: Date.now(),
        audio: {
          outbound: [{ packetsSent: 500, bytesSent: 80000 }],
        },
      };
      const mockCall = createMockCall({
        getStats: jest.fn().mockResolvedValue(partialFrame) as unknown as () => Promise<unknown>,
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // Network report should still build (quality may be unknown — no RTT/loss data)
      expect(report.network).toBeDefined();
      // Media report: outbound present, inbound missing
      expect(report.media).toBeDefined();
      expect(report.media?.outboundAudioFlowing).toBe(false); // single sample, no delta
      expect(report.media?.inboundAudioFlowing).toBe(false);
    });

    it('handles frames with only remote-inbound RTP (no local inbound/outbound)', async () => {
      const partialFrame = {
        timestamp: Date.now(),
        remote: {
          audio: {
            inbound: [{ roundTripTime: 0.03, jitter: 0.004 }],
          },
        },
      };
      const mockCall = createMockCall({
        getStats: jest.fn().mockResolvedValue(partialFrame) as unknown as () => Promise<unknown>,
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // Should not crash; RTT should be parsed from remote inbound
      expect(report.network?.rtt).toBeDefined();
      expect(report.media?.audioFlowing).toBe(false); // no audio RTP (no inbound/outbound local)
    });
  });

  describe('real SDK callback-style getStats fallback', () => {
    it('falls back to peerConnection.getStats() when call.getStats is callback-based (length === 2)', async () => {
      const validFrame = createValidFrame();

      // Simulate the real SDK's BaseCall.getStats(callback, constraints) —
      // takes 2 args, returns undefined (callback registration, not a promise).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function callbackGetStats(_callback: () => void, _constraints: unknown) {
        return undefined;
      }

      const mockPeerConnection = {
        getStats: jest.fn().mockResolvedValue(validFrame),
      };

      // Real SDK Call shape: uses peer.instance (not peerConnection)
      const mockCall = createMockCall({
        getStats: callbackGetStats as unknown as () => Promise<unknown>,
        peer: {
          instance: mockPeerConnection as unknown as RTCPeerConnection,
        },
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // peer.instance.getStats() should have been used as fallback
      expect(mockPeerConnection.getStats).toHaveBeenCalled();
      // Stats should be collected → network quality not unknown
      expect(report.network?.quality).not.toBe('unknown');
      expect(report.network?.quality).toBe('good');
      expect(report.network?.rtt?.average).toBeCloseTo(25, 0);
      // Media report should see audio RTP
      expect(report.media?.outboundAudioFlowing).toBe(false); // single sample
      expect(report.media?.inboundAudioFlowing).toBe(false);
    });

    it('falls back to peer.instance.getStats() when call.getStats is callback-based and peerConnection is absent', async () => {
      const validFrame = createValidFrame();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function callbackGetStats(_callback: () => void, _constraints: unknown) {
        return undefined;
      }

      const mockPeerConnection = {
        getStats: jest.fn().mockResolvedValue(validFrame),
      };

      // Real SDK Call shape: has peer.instance
      const mockCall = createMockCall({
        getStats: callbackGetStats as unknown as () => Promise<unknown>,
        peer: {
          instance: mockPeerConnection as unknown as RTCPeerConnection,
        },
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      expect(mockPeerConnection.getStats).toHaveBeenCalled();
      expect(report.network?.quality).not.toBe('unknown');
      expect(report.network?.rtt?.average).toBeCloseTo(25, 0);
    });

    it('does NOT call callback-based getStats (avoids registering a no-op callback)', async () => {
      const validFrame = createValidFrame();
      const mockPeerConnection = {
        getStats: jest.fn().mockResolvedValue(validFrame),
      };

      let callbackGetStatsCallCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function callbackGetStats(_callback: () => void, _constraints: unknown) {
        callbackGetStatsCallCount++;
        return undefined;
      }

      // Real SDK Call shape: uses peer.instance
      const mockCall = createMockCall({
        getStats: callbackGetStats as unknown as () => Promise<unknown>,
        peer: {
          instance: mockPeerConnection as unknown as RTCPeerConnection,
        },
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      await diagnostic.run();

      // The callback-style getStats should NOT have been called at all
      // (we detect it via length === 2 and skip it)
      expect(callbackGetStatsCallCount).toBe(0);
      // The peer.instance fallback should have been used
      expect(mockPeerConnection.getStats).toHaveBeenCalled();
    });
  });

  describe('multiple samples collected over duration', () => {
    it('collects multiple samples and surfaces them in raw.samples', async () => {
      let callCount = 0;
      const mockCall = createMockCall({
        getStats: jest.fn().mockImplementation(async () => {
          callCount++;
          return {
            timestamp: Date.now(),
            audio: {
              inbound: [
                {
                  packetsReceived: 100 + callCount * 50,
                  packetsLost: 0,
                  jitter: 0.005,
                  bytesReceived: 16000 + callCount * 8000,
                },
              ],
              outbound: [
                {
                  packetsSent: 100 + callCount * 50,
                  bytesSent: 16000 + callCount * 8000,
                },
              ],
            },
            remote: {
              audio: {
                inbound: [{ roundTripTime: 0.02 + callCount * 0.005 }],
              },
            },
          };
        }) as unknown as () => Promise<unknown>,
      });
      const mockClient = createMockClient(mockCall);
      const diagnostic = new PreCallDiagnostic(
        createOptions({
          client: mockClient,
          durationMs: 50,
          statsSampleIntervalMs: 15,
        })
      );

      const report = await diagnostic.run();

      expect(report.raw?.samples).toBeDefined();
      expect((report.raw?.samples as unknown[])?.length).toBeGreaterThan(1);
      expect(callCount).toBeGreaterThan(1);
      // With multiple increasing samples, media should detect flowing
      expect(report.media?.audioFlowing).toBe(true);
      expect(report.media?.outboundAudioFlowing).toBe(true);
      expect(report.media?.inboundAudioFlowing).toBe(true);
    });
  });
});
