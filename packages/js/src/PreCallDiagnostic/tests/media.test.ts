/**
 * Tests for the RTP/media flow report module — T5 (VSDK-302).
 *
 * Verifies:
 * - buildPreCallMediaReport produces typed output with RTP counters
 * - Audio flow detection: two-way, one-way, no-way, no-stats
 * - Outbound/inbound RTP counters are extracted correctly
 * - Audio stats (packetsLost, jitterMs) are included when available
 * - Missing stats are safe (undefined, never NaN or 0-as-missing)
 * - Reason inputs are generated for no-stats, no-outbound, no-inbound
 * - Module returns undefined when disabled
 */

import { buildPreCallMediaReport } from '../modules/media';
import type {
  PreCallDiagnosticContext,
} from '../context';
import type {
  PreCallDiagnosticOptions,
} from '../types';

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
    },
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
 * Create a two-way audio stats frame with both inbound and outbound RTP.
 * No connection-level fallbacks by default — tests must explicitly add them.
 */
function createTwoWayFrame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    audio: {
      inbound: [
        {
          kind: 'audio',
          mediaType: 'audio',
          packetsReceived: 100,
          packetsLost: 0,
          jitter: 0.005, // 5ms
          bytesReceived: 16000,
        },
      ],
      outbound: [
        {
          kind: 'audio',
          mediaType: 'audio',
          packetsSent: 100,
          bytesSent: 16000,
        },
      ],
    },
    ...overrides,
  };
}

/**
 * Create an outbound-only audio stats frame (no inbound RTP).
 */
function createOutboundOnlyFrame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    audio: {
      inbound: [],
      outbound: [
        {
          kind: 'audio',
          mediaType: 'audio',
          packetsSent: 100,
          bytesSent: 16000,
        },
      ],
    },
    ...overrides,
  };
}

/**
 * Create an inbound-only audio stats frame (no outbound RTP).
 */
function createInboundOnlyFrame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    audio: {
      inbound: [
        {
          kind: 'audio',
          mediaType: 'audio',
          packetsReceived: 100,
          packetsLost: 2,
          jitter: 0.005,
          bytesReceived: 16000,
        },
      ],
      outbound: [],
    },
    ...overrides,
  };
}

/**
 * Create a no-RTP stats frame (both directions empty).
 */
function createNoRtpFrame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    audio: {
      inbound: [],
      outbound: [],
    },
    ...overrides,
  };
}

// --- Tests ---

describe('buildPreCallMediaReport', () => {
  describe('with no stats samples', () => {
    it('returns audioFlowing: undefined when statsSamples is empty', () => {
      const context = createContext({ statsSamples: [] });
      const report = buildPreCallMediaReport(context);

      expect(report).toBeDefined();
      expect(report?.audioFlowing).toBeUndefined();
    });

    it('includes a media_no_stats reason', () => {
      const context = createContext({ statsSamples: [] });
      const report = buildPreCallMediaReport(context);

      expect(report?.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'media_no_stats',
            source: 'media',
          }),
        ])
      );
    });

    it('does not include directional audio when no stats', () => {
      const context = createContext({ statsSamples: [] });
      const report = buildPreCallMediaReport(context);

      expect(report?.outboundAudio).toBeUndefined();
      expect(report?.inboundAudio).toBeUndefined();
    });
  });

  describe('with two-way media (both directions observed)', () => {
    it('returns audioFlowing: true', () => {
      const frame = createTwoWayFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(true);
    });

    it('has no reasons when both directions are working', () => {
      const frame = createTwoWayFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.reasons).toBeUndefined();
    });

    it('includes outbound RTP counters', () => {
      const frame = createTwoWayFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.outboundAudio).toBeDefined();
      expect(report?.outboundAudio?.rtpObserved).toBe(true);
      expect(report?.outboundAudio?.rtp?.packets).toBe(100);
      expect(report?.outboundAudio?.rtp?.bytes).toBe(16000);
    });

    it('includes inbound RTP counters with quality stats', () => {
      const frame = createTwoWayFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.inboundAudio).toBeDefined();
      expect(report?.inboundAudio?.rtpObserved).toBe(true);
      expect(report?.inboundAudio?.rtp?.packets).toBe(100);
      expect(report?.inboundAudio?.rtp?.bytes).toBe(16000);
      expect(report?.inboundAudio?.packetsLost).toBe(0);
      expect(report?.inboundAudio?.jitterMs).toBe(5); // 0.005s * 1000
    });
  });

  describe('with one-way media (outbound only)', () => {
    it('returns audioFlowing: false', () => {
      const frame = createOutboundOnlyFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(false);
    });

    it('includes a media_no_inbound_rtp reason', () => {
      const frame = createOutboundOnlyFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'media_no_inbound_rtp',
            source: 'media',
          }),
        ])
      );
    });

    it('does not include media_no_outbound_rtp reason', () => {
      const frame = createOutboundOnlyFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      const noOutboundReason = report?.reasons?.find(
        (r) => r.code === 'media_no_outbound_rtp'
      );
      expect(noOutboundReason).toBeUndefined();
    });
  });

  describe('with one-way media (inbound only)', () => {
    it('returns audioFlowing: false', () => {
      const frame = createInboundOnlyFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(false);
    });

    it('includes a media_no_outbound_rtp reason', () => {
      const frame = createInboundOnlyFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'media_no_outbound_rtp',
            source: 'media',
          }),
        ])
      );
    });
  });

  describe('with no-way media (neither direction observed)', () => {
    it('returns audioFlowing: false', () => {
      const frame = createNoRtpFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(false);
    });

    it('includes both no_outbound and no_inbound reasons', () => {
      const frame = createNoRtpFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      const codes = report?.reasons?.map((r) => r.code) ?? [];
      expect(codes).toContain('media_no_outbound_rtp');
      expect(codes).toContain('media_no_inbound_rtp');
    });
  });

  describe('with zero packets sent/received', () => {
    it('treats zero outbound packets as no RTP observed', () => {
      const frame = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 100,
              bytesReceived: 16000,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 0,
              bytesSent: 0,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.outboundAudio?.rtpObserved).toBe(false);
      expect(report?.audioFlowing).toBe(false);
    });

    it('treats zero inbound packets as no RTP observed', () => {
      const frame = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 0,
              bytesReceived: 0,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 100,
              bytesSent: 16000,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.inboundAudio?.rtpObserved).toBe(false);
      expect(report?.audioFlowing).toBe(false);
    });
  });

  describe('with partial stats (connection-level fallback)', () => {
    it('uses connection-level counters when audio-level stats are missing', () => {
      // No audio-level stats, but connection-level counters exist
      const frame = createNoRtpFrame({
        connection: {
          packetsSent: 50,
          packetsReceived: 50,
          bytesSent: 8000,
          bytesReceived: 8000,
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.outboundAudio?.rtpObserved).toBe(true);
      expect(report?.outboundAudio?.rtp?.packets).toBe(50);
      expect(report?.inboundAudio?.rtpObserved).toBe(true);
      expect(report?.inboundAudio?.rtp?.packets).toBe(50);
      expect(report?.audioFlowing).toBe(true);
    });
  });

  describe('with remote inbound fallback', () => {
    it('uses remote.audio.inbound when local audio.inbound is missing', () => {
      const frame = createOutboundOnlyFrame({
        remote: {
          audio: {
            inbound: [
              {
                packetsReceived: 80,
                packetsLost: 2,
                jitter: 0.01, // 10ms
                bytesReceived: 12800,
              },
            ],
          },
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.inboundAudio?.rtpObserved).toBe(true);
      expect(report?.inboundAudio?.rtp?.packets).toBe(80);
      expect(report?.inboundAudio?.packetsLost).toBe(2);
      expect(report?.inboundAudio?.jitterMs).toBe(10); // 0.01s * 1000
      expect(report?.audioFlowing).toBe(true);
    });
  });

  describe('with multiple stats samples', () => {
    it('uses the last frame for cumulative counters', () => {
      const frame1 = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 50,
              bytesReceived: 8000,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 50,
              bytesSent: 8000,
            },
          ],
        },
      });
      const frame2 = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 100,
              bytesReceived: 16000,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 100,
              bytesSent: 16000,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame1, frame2] });
      const report = buildPreCallMediaReport(context);

      // Should use last frame values
      expect(report?.outboundAudio?.rtp?.packets).toBe(100);
      expect(report?.inboundAudio?.rtp?.packets).toBe(100);
    });
  });

  describe('with NaN/invalid values in stats', () => {
    it('omits NaN values from the report', () => {
      const frame = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 100,
              bytesReceived: NaN,
              packetsLost: NaN,
              jitter: NaN,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 100,
              bytesSent: NaN,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      // NaN bytes should be omitted, but valid packet counts still reported
      expect(report?.outboundAudio?.rtp?.packets).toBe(100);
      expect(report?.outboundAudio?.rtp?.bytes).toBeUndefined();
      expect(report?.inboundAudio?.rtp?.packets).toBe(100);
      expect(report?.inboundAudio?.rtp?.bytes).toBeUndefined();
      expect(report?.inboundAudio?.packetsLost).toBeUndefined();
      expect(report?.inboundAudio?.jitterMs).toBeUndefined();
    });

    it('omits Infinity values from the report', () => {
      const frame = {
        timestamp: Date.now(),
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: Infinity,
              bytesReceived: 16000,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 100,
              bytesSent: 16000,
            },
          ],
        },
      };
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      // Infinity packetsReceived is not safe, so it's omitted
      expect(report?.inboundAudio?.rtp?.packets).toBeUndefined();
      // But bytesReceived is valid
      expect(report?.inboundAudio?.rtp?.bytes).toBe(16000);
    });
  });

  describe('when disabled', () => {
    it('returns undefined when media option is false', () => {
      const frame = createTwoWayFrame();
      const context = createContext({
        statsSamples: [frame],
        options: {
          client: {
            newCall: jest.fn().mockReturnValue({
              id: 'test-call',
              hangup: jest.fn(),
            }),
          },
          destinationNumber: '1234',
          media: false,
        },
      });
      const report = buildPreCallMediaReport(context);

      expect(report).toBeUndefined();
    });
  });

  describe('reason codes', () => {
    it('media_no_stats has correct structure', () => {
      const context = createContext({ statsSamples: [] });
      const report = buildPreCallMediaReport(context);

      const reason = report?.reasons?.find((r) => r.code === 'media_no_stats');
      expect(reason).toBeDefined();
      expect(reason?.source).toBe('media');
      expect(typeof reason?.message).toBe('string');
      expect(reason?.message.length).toBeGreaterThan(0);
    });

    it('media_no_outbound_rtp has correct structure', () => {
      const frame = createInboundOnlyFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      const reason = report?.reasons?.find((r) => r.code === 'media_no_outbound_rtp');
      expect(reason).toBeDefined();
      expect(reason?.source).toBe('media');
      expect(typeof reason?.message).toBe('string');
    });

    it('media_no_inbound_rtp has correct structure', () => {
      const frame = createOutboundOnlyFrame();
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      const reason = report?.reasons?.find((r) => r.code === 'media_no_inbound_rtp');
      expect(reason).toBeDefined();
      expect(reason?.source).toBe('media');
      expect(typeof reason?.message).toBe('string');
    });
  });

  describe('jitter conversion', () => {
    it('converts inbound jitter from seconds to milliseconds', () => {
      const frame = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 100,
              jitter: 0.025, // 25ms
              bytesReceived: 16000,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 100,
              bytesSent: 16000,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.inboundAudio?.jitterMs).toBe(25);
    });

    it('handles zero jitter', () => {
      const frame = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 100,
              jitter: 0,
              bytesReceived: 16000,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 100,
              bytesSent: 16000,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.inboundAudio?.jitterMs).toBe(0);
    });
  });

  describe('packetsLost on inbound', () => {
    it('includes packetsLost when available', () => {
      const frame = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 100,
              packetsLost: 5,
              jitter: 0.005,
              bytesReceived: 16000,
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 100,
              bytesSent: 16000,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.inboundAudio?.packetsLost).toBe(5);
    });

    it('omits packetsLost when not available', () => {
      const frame = createTwoWayFrame({
        audio: {
          inbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsReceived: 100,
              bytesReceived: 16000,
              // no packetsLost field
            },
          ],
          outbound: [
            {
              kind: 'audio',
              mediaType: 'audio',
              packetsSent: 100,
              bytesSent: 16000,
            },
          ],
        },
      });
      const context = createContext({ statsSamples: [frame] });
      const report = buildPreCallMediaReport(context);

      expect(report?.inboundAudio?.packetsLost).toBeUndefined();
    });
  });
});
