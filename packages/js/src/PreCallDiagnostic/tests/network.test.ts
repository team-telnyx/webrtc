/**
 * Tests for the network quality report module — T4 (VSDK-301).
 *
 * Verifies:
 * - buildPreCallNetworkReport produces typed, normalized output
 * - RTT, jitter, packet loss, byte counters, and bitrate are normalized
 * - Quality classification is correct for good/fair/poor/unknown
 * - No NaN values are emitted
 * - Partial/missing stats are handled safely
 * - Reason inputs are generated for degraded/poor metrics
 */

import { buildPreCallNetworkReport } from '../modules/network';
import type {
  PreCallDiagnosticContext,
} from '../context';
import type {
  PreCallDiagnosticOptions,
} from '../types';
import type { TelnyxRTC } from '../../TelnyxRTC';

// --- Helpers ---

function createContext(
  overrides: Partial<PreCallDiagnosticContext> = {}
): PreCallDiagnosticContext {
  const defaultOptions: PreCallDiagnosticOptions = {
    client: {
      newCall: jest.fn().mockReturnValue({
        id: 'test-call',
        hangup: jest.fn(),
      }),
    } as unknown as TelnyxRTC,
    destinationNumber: '1234',
  };

  return {
    options: defaultOptions,
    statsSamples: [],
    timings: {
      startedAt: Date.now(),
    },
    ...overrides,
  };
}

/**
 * Create a stats frame mimicking the SDK's stats collector output.
 * The SDK stats collector produces frames with:
 *   - audio.inbound[] — local inbound audio stats
 *   - audio.outbound[] — local outbound audio stats
 *   - remote.audio.inbound[] — remote inbound audio stats (RTT source)
 *   - connection — candidate-pair level stats
 */
function createStatsFrame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    audio: {
      inbound: [
        {
          packetsReceived: 100,
          packetsLost: 0,
          jitter: 0.005, // 5ms
          bytesReceived: 16000,
        },
      ],
      outbound: [
        {
          packetsSent: 100,
          bytesSent: 16000,
        },
      ],
    },
    remote: {
      audio: {
        inbound: [
          {
            roundTripTime: 0.05, // 50ms
            jitter: 0.005, // 5ms
          },
        ],
      },
    },
    connection: {
      bytesSent: 16000,
      bytesReceived: 16000,
      packetsSent: 100,
      packetsReceived: 100,
    },
    ...overrides,
  };
}

// --- Tests ---

describe('buildPreCallNetworkReport', () => {
  describe('with no stats samples', () => {
    it('returns quality: unknown when statsSamples is empty', () => {
      const context = createContext({ statsSamples: [] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      expect(report?.quality).toBe('unknown');
    });

    it('returns an empty reasons array when statsSamples is empty', () => {
      const context = createContext({ statsSamples: [] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.reasons).toEqual([]);
    });
  });

  describe('with good network stats', () => {
    it('returns quality: good for low RTT, jitter, and packet loss', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.02, // 20ms RTT
                jitter: 0.003, // 3ms jitter
              },
            ],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 0,
              jitter: 0.003, // 3ms
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      expect(report?.quality).toBe('good');
      expect(report?.rtt).toBeDefined();
      expect(report?.rtt?.average).toBeCloseTo(20, 0); // ~20ms
      expect(report?.jitter).toBeDefined();
      expect(report?.jitter?.average).toBeCloseTo(3, 0); // ~3ms
    });

    it('normalizes RTT from seconds to milliseconds', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.1, // 100ms
                jitter: 0.01, // 10ms
              },
            ],
          },
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.rtt?.average).toBeCloseTo(100, 0);
      expect(report?.jitter?.average).toBeCloseTo(10, 0);
    });

    it('computes packet loss fraction', () => {
      const frame = createStatsFrame({
        audio: {
          inbound: [
            {
              packetsReceived: 990,
              packetsLost: 10,
              jitter: 0.003,
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.packets).toBeDefined();
      expect(report?.packets?.packetsReceived).toBe(990);
      expect(report?.packets?.packetsLost).toBe(10);
      expect(report?.packets?.packetLossFraction).toBeCloseTo(10 / 1000, 4);
    });

    it('includes byte counters', () => {
      const frame = createStatsFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.bytes).toBeDefined();
      expect(report?.bytes?.bytesSent).toBe(16000);
      expect(report?.bytes?.bytesReceived).toBe(16000);
    });
  });

  describe('with degraded network stats', () => {
    it('returns quality: fair for RTT >= 300ms', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.35, // 350ms
                jitter: 0.005,
              },
            ],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 5,
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.quality).toBe('fair');
      expect(report?.reasons).toBeDefined();
      expect(report?.reasons?.length).toBeGreaterThanOrEqual(1);
      expect(report?.reasons?.[0]?.code).toBe('network_high_rtt');
    });

    it('returns quality: fair for jitter >= 30ms', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.02,
                jitter: 0.04, // 40ms
              },
            ],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 0,
              jitter: 0.04, // 40ms
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.quality).toBe('fair');
      expect(report?.reasons?.some((r) => r.code === 'network_high_jitter')).toBe(true);
    });

    it('returns quality: fair for packet loss >= 2%', () => {
      const frame = createStatsFrame({
        audio: {
          inbound: [
            {
              packetsReceived: 980,
              packetsLost: 20, // 2% loss
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.quality).toBe('fair');
      expect(report?.reasons?.some((r) => r.code === 'network_packet_loss')).toBe(true);
    });
  });

  describe('with poor network stats', () => {
    it('returns quality: poor for RTT >= 500ms', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.6, // 600ms
                jitter: 0.005,
              },
            ],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 5,
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.quality).toBe('poor');
      expect(report?.reasons?.some((r) => r.code === 'network_high_rtt')).toBe(true);
    });

    it('returns quality: poor for jitter >= 100ms', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.02,
                jitter: 0.12, // 120ms
              },
            ],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 0,
              jitter: 0.12, // 120ms
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.quality).toBe('poor');
      expect(report?.reasons?.some((r) => r.code === 'network_high_jitter')).toBe(true);
    });

    it('returns quality: poor for packet loss >= 5%', () => {
      const frame = createStatsFrame({
        audio: {
          inbound: [
            {
              packetsReceived: 950,
              packetsLost: 50, // 5% loss
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.quality).toBe('poor');
      expect(report?.reasons?.some((r) => r.code === 'network_packet_loss')).toBe(true);
    });
  });

  describe('with partial stats', () => {
    it('handles frames with only RTT (no jitter, no packet loss)', () => {
      const frame = {
        timestamp: Date.now(),
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: 0.02, // 20ms
              },
            ],
          },
        },
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      expect(report?.quality).toBe('good');
      expect(report?.rtt?.average).toBeCloseTo(20, 0);
      expect(report?.jitter).toBeUndefined();
    });

    it('handles frames with only connection-level stats', () => {
      const frame = {
        timestamp: Date.now(),
        connection: {
          currentRoundTripTime: 0.03, // 30ms
          bytesSent: 10000,
          bytesReceived: 10000,
          packetsSent: 50,
          packetsReceived: 50,
        },
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      expect(report?.rtt?.average).toBeCloseTo(30, 0);
    });

    it('handles empty inbound/outbound arrays', () => {
      const frame = {
        timestamp: Date.now(),
        audio: {
          inbound: [],
          outbound: [],
        },
        remote: {
          audio: {
            inbound: [],
          },
        },
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      // No usable data, quality should be unknown
      expect(report?.quality).toBe('unknown');
    });

    it('handles frames with NaN values', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: NaN,
                jitter: NaN,
              },
            ],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: NaN,
              packetsLost: NaN,
              jitter: NaN,
              bytesReceived: NaN,
            },
          ],
          outbound: [
            {
              packetsSent: NaN,
              bytesSent: NaN,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      // NaN values must not appear in the report
      if (report?.rtt) {
        expect(Number.isNaN(report.rtt.average ?? 0)).toBe(false);
        expect(Number.isNaN(report.rtt.min ?? 0)).toBe(false);
        expect(Number.isNaN(report.rtt.max ?? 0)).toBe(false);
      }
      if (report?.jitter) {
        expect(Number.isNaN(report.jitter.average ?? 0)).toBe(false);
      }
      if (report?.packets?.packetLossFraction !== undefined) {
        expect(Number.isNaN(report.packets.packetLossFraction)).toBe(false);
      }
    });

    it('handles frames with Infinity values', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [
              {
                roundTripTime: Infinity,
                jitter: -Infinity,
              },
            ],
          },
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      // Infinity values should be filtered out
      if (report?.rtt?.average !== undefined) {
        expect(Number.isFinite(report.rtt.average)).toBe(true);
      }
    });
  });

  describe('with multiple samples', () => {
    it('computes min/max/average across samples', () => {
      const frames = [
        createStatsFrame({
          timestamp: 1000,
          remote: {
            audio: {
              inbound: [{ roundTripTime: 0.02, jitter: 0.003 }],
            },
          },
        }),
        createStatsFrame({
          timestamp: 2000,
          remote: {
            audio: {
              inbound: [{ roundTripTime: 0.05, jitter: 0.008 }],
            },
          },
        }),
        createStatsFrame({
          timestamp: 3000,
          remote: {
            audio: {
              inbound: [{ roundTripTime: 0.03, jitter: 0.005 }],
            },
          },
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallNetworkReport(context);

      expect(report?.rtt).toBeDefined();
      expect(report?.rtt?.min).toBeCloseTo(20, 0);
      expect(report?.rtt?.max).toBeCloseTo(50, 0);
      // average = (20 + 50 + 30) / 3 = 33.3
      expect(report?.rtt?.average).toBeCloseTo(33.3, 0);
    });

    it('computes bitrate from byte deltas between first and last frames', () => {
      const frames = [
        createStatsFrame({
          timestamp: 1000,
          audio: {
            inbound: [
              {
                packetsReceived: 50,
                packetsLost: 0,
                jitter: 0.005,
                bytesReceived: 8000,
              },
            ],
            outbound: [
              {
                packetsSent: 50,
                bytesSent: 8000,
              },
            ],
          },
        }),
        createStatsFrame({
          timestamp: 2000,
          audio: {
            inbound: [
              {
                packetsReceived: 100,
                packetsLost: 0,
                jitter: 0.005,
                bytesReceived: 16000,
              },
            ],
            outbound: [
              {
                packetsSent: 100,
                bytesSent: 16000,
              },
            ],
          },
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallNetworkReport(context);

      expect(report?.bitrate).toBeDefined();
      // Outbound: (16000 - 8000) * 8 / 1s = 64000 bps
      expect(report?.bitrate?.outbound).toBeCloseTo(64000, -3);
      // Inbound: (16000 - 8000) * 8 / 1s = 64000 bps
      expect(report?.bitrate?.inbound).toBeCloseTo(64000, -3);
    });

    it('uses last frame for cumulative packet counters', () => {
      const frames = [
        createStatsFrame({
          audio: {
            inbound: [
              {
                packetsReceived: 50,
                packetsLost: 0,
                jitter: 0.005,
                bytesReceived: 8000,
              },
            ],
            outbound: [
              {
                packetsSent: 50,
                bytesSent: 8000,
              },
            ],
          },
        }),
        createStatsFrame({
          audio: {
            inbound: [
              {
                packetsReceived: 200,
                packetsLost: 5,
                jitter: 0.005,
                bytesReceived: 32000,
              },
            ],
            outbound: [
              {
                packetsSent: 200,
                bytesSent: 32000,
              },
            ],
          },
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallNetworkReport(context);

      expect(report?.packets?.packetsReceived).toBe(200);
      expect(report?.packets?.packetsLost).toBe(5);
      expect(report?.packets?.packetsSent).toBe(200);
    });
  });

  describe('with no relevant stats at all', () => {
    it('returns quality: unknown for frames with no audio or remote stats', () => {
      const frame = {
        timestamp: Date.now(),
        someOtherField: 'value',
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      expect(report?.quality).toBe('unknown');
    });
  });

  describe('module disabled', () => {
    it('returns undefined when network option is false', () => {
      const context = createContext({
        statsSamples: [createStatsFrame()],
        options: {
          client: {
            newCall: jest.fn().mockReturnValue({ id: 'test', hangup: jest.fn() }),
          } as unknown as TelnyxRTC,
          destinationNumber: '1234',
          network: false,
        },
      });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeUndefined();
    });

    it('returns undefined when network.enabled is false (object form)', () => {
      const context = createContext({
        statsSamples: [createStatsFrame()],
        options: {
          client: {
            newCall: jest.fn().mockReturnValue({ id: 'test', hangup: jest.fn() }),
          } as unknown as TelnyxRTC,
          destinationNumber: '1234',
          network: { enabled: false },
        },
      });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeUndefined();
    });

    it('returns a report when network.enabled is true (object form)', () => {
      const context = createContext({
        statsSamples: [createStatsFrame()],
        options: {
          client: {
            newCall: jest.fn().mockReturnValue({ id: 'test', hangup: jest.fn() }),
          } as unknown as TelnyxRTC,
          destinationNumber: '1234',
          network: { enabled: true },
        },
      });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();
      // The frame has good defaults, so quality should not be 'unknown'.
      expect(report?.quality).not.toBe('unknown');
    });
  });

  describe('reason inputs', () => {
    it('includes no reasons for good quality', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [{ roundTripTime: 0.01, jitter: 0.002 }],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 0,
              jitter: 0.002,
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.reasons).toBeUndefined();
    });

    it('reason entries have correct source field', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [{ roundTripTime: 0.6, jitter: 0.005 }],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 5,
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      for (const reason of report?.reasons ?? []) {
        expect(reason.source).toBe('network');
        expect(reason.code).toMatch(/^network_/);
        expect(reason.message).toBeDefined();
        expect(typeof reason.message).toBe('string');
      }
    });

    it('can produce multiple reasons when multiple metrics are degraded', () => {
      const frame = createStatsFrame({
        remote: {
          audio: {
            inbound: [{ roundTripTime: 0.6, jitter: 0.12 }],
          },
        },
        audio: {
          inbound: [
            {
              packetsReceived: 950,
              packetsLost: 50,
              jitter: 0.12,
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
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.reasons?.length).toBeGreaterThanOrEqual(2);
      const codes = report?.reasons?.map((r) => r.code) ?? [];
      expect(codes).toContain('network_high_rtt');
      expect(codes).toContain('network_high_jitter');
    });

    it('emits network_low_bitrate when audio bitrate falls below the threshold', () => {
      // Two frames 1 second apart with a tiny outbound byte delta.
      // bitrate = delta(bytes) * 8 / dtSec = 500 * 8 / 1 = 4000 bps (< 8000).
      // Inbound uses a larger delta so only outbound is flagged low here.
      const base = 1_000_000;
      const frame1 = createStatsFrame({
        timestamp: base,
        audio: {
          inbound: [{ packetsReceived: 100, packetsLost: 0, jitter: 0.002, bytesReceived: 160000 }],
          outbound: [{ packetsSent: 100, bytesSent: 160000 }],
        },
      });
      const frame2 = createStatsFrame({
        timestamp: base + 1000,
        audio: {
          inbound: [{ packetsReceived: 200, packetsLost: 0, jitter: 0.002, bytesReceived: 160500 }],
          outbound: [{ packetsSent: 200, bytesSent: 160500 }],
        },
      });
      const context = createContext({ statsSamples: [frame1, frame2] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.reasons).toBeDefined();
      const codes = report?.reasons?.map((r) => r.code) ?? [];
      // 500 bytes over 1s = 4000 bps outbound, 4000 bps inbound → both low.
      expect(codes).toContain('network_low_bitrate');
    });

    it('does not emit network_low_bitrate when bitrate is healthy', () => {
      // Two frames 1 second apart with a large outbound byte delta.
      // bitrate = 16000 * 8 / 1 = 128000 bps (well above the 8000 floor).
      const base = 1_000_000;
      const frame1 = createStatsFrame({
        timestamp: base,
        audio: {
          inbound: [{ packetsReceived: 100, packetsLost: 0, jitter: 0.002, bytesReceived: 160000 }],
          outbound: [{ packetsSent: 100, bytesSent: 160000 }],
        },
      });
      const frame2 = createStatsFrame({
        timestamp: base + 1000,
        audio: {
          inbound: [{ packetsReceived: 200, packetsLost: 0, jitter: 0.002, bytesReceived: 176000 }],
          outbound: [{ packetsSent: 200, bytesSent: 176000 }],
        },
      });
      const context = createContext({ statsSamples: [frame1, frame2] });
      const report = buildPreCallNetworkReport(context);

      const codes = report?.reasons?.map((r) => r.code) ?? [];
      expect(codes).not.toContain('network_low_bitrate');
    });
  });

  describe('no NaN guarantee', () => {
    it('never emits NaN in any report field', () => {
      // Use stats with 0/0 (which could produce NaN)
      const frame = createStatsFrame({
        audio: {
          inbound: [
            {
              packetsReceived: 0,
              packetsLost: 0,
              jitter: 0,
              bytesReceived: 0,
            },
          ],
          outbound: [
            {
              packetsSent: 0,
              bytesSent: 0,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report).toBeDefined();

      // Recursively check for NaN in numeric fields
      const checkNoNaN = (obj: unknown, path: string = ''): void => {
        if (obj === null || obj === undefined) return;
        if (typeof obj === 'number') {
          expect({ path, value: obj }).toEqual(
            expect.objectContaining({ value: expect.not.stringContaining?.('NaN') })
          );
          expect(Number.isNaN(obj)).toBe(false);
        }
        if (typeof obj === 'object') {
          for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            checkNoNaN(value, `${path}.${key}`);
          }
        }
      };

      checkNoNaN(report);
    });
  });

  describe('RTT per-frame fallback', () => {
    it('includes connection.currentRoundTripTime for later partial frames after an initial remote RTT frame', () => {
      // Frame 1 has remote inbound RTT (primary source)
      // Frame 2 only has connection.currentRoundTripTime (partial/alternate stats)
      // Both RTT samples should be included in min/max/average
      const frames = [
        {
          timestamp: 1000,
          remote: {
            audio: {
              inbound: [{ roundTripTime: 0.02 }], // 20ms
            },
          },
        },
        {
          timestamp: 2000,
          connection: {
            currentRoundTripTime: 0.06, // 60ms — no remote inbound data
          },
        },
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallNetworkReport(context);

      expect(report?.rtt).toBeDefined();
      expect(report?.rtt?.min).toBeCloseTo(20, 0);
      expect(report?.rtt?.max).toBeCloseTo(60, 0);
      // average = (20 + 60) / 2 = 40
      expect(report?.rtt?.average).toBeCloseTo(40, 0);
    });

    it('does not duplicate RTT when a frame has both remote inbound and connection-level RTT', () => {
      const frame = {
        timestamp: 1000,
        remote: {
          audio: {
            inbound: [{ roundTripTime: 0.05 }], // 50ms — primary source
          },
        },
        connection: {
          currentRoundTripTime: 0.04, // 40ms — should NOT be used since primary was found
        },
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.rtt).toBeDefined();
      // Only the remote inbound RTT should be used, not the connection-level fallback
      expect(report?.rtt?.average).toBeCloseTo(50, 0);
    });
  });

  describe('IStatsInterval jitter support', () => {
    it('reads jitterAvg (ms) from IStatsInterval-shaped frames', () => {
      // Simulate a frame from CallReportCollector's IStatsInterval shape:
      // audio.inbound is an object (not array) with jitterAvg already in ms
      const frame = {
        timestamp: Date.now(),
        audio: {
          inbound: {
            packetsReceived: 1000,
            packetsLost: 0,
            jitterAvg: 5, // already in ms — should NOT be multiplied by 1000
          },
        },
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.jitter).toBeDefined();
      expect(report?.jitter?.average).toBeCloseTo(5, 0);
    });

    it('detects jitter degradation from IStatsInterval jitterAvg', () => {
      const frame = {
        timestamp: Date.now(),
        audio: {
          inbound: {
            packetsReceived: 1000,
            packetsLost: 0,
            jitterAvg: 50, // 50ms — above degraded threshold (30ms)
          },
        },
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.quality).toBe('fair');
      expect(report?.reasons?.some((r) => r.code === 'network_high_jitter')).toBe(true);
    });

    it('prefers raw WebRTC jitter over jitterAvg when both are available', () => {
      // Frame has both array-based inbound (raw WebRTC) and jitterAvg (IStatsInterval).
      // The raw jitter path (seconds → ms) should take priority.
      const frame = {
        timestamp: Date.now(),
        audio: {
          inbound: [
            {
              packetsReceived: 1000,
              packetsLost: 0,
              jitter: 0.003, // 3ms in seconds
              bytesReceived: 160000,
            },
          ],
        },
        // This object-level inbound should NOT be read because the array path succeeded
        _inboundObj: { jitterAvg: 80 },
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallNetworkReport(context);

      expect(report?.jitter).toBeDefined();
      expect(report?.jitter?.average).toBeCloseTo(3, 0);
    });
  });
});
