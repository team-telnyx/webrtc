/**
 * Tests for the media/RTP flow report module — T5 (folded into VSDK-301).
 *
 * Verifies:
 * - buildPreCallMediaReport distinguishes: no stats, no audio RTP,
 *   one-way (outbound only / inbound only), and two-way RTP.
 * - Direction detection uses packet/byte counter deltas (requires ≥2 samples).
 * - Single-sample reports show presence but flowing: false.
 * - Reason codes are namespaced with `media_*`.
 * - No NaN/Infinity values are emitted.
 * - Module reads only context.statsSamples (no peer connection access).
 * - Module returns undefined when disabled.
 * - IStatsInterval-shaped frames (object inbound/outbound) are supported.
 */

import { buildPreCallMediaReport } from '../modules/media';
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
 * Create a stats frame with audio RTP entries.
 * The standard parsed frame shape: audio.inbound[] / audio.outbound[].
 */
function createMediaFrame(
  overrides: {
    inbound?: Array<Record<string, unknown>>;
    outbound?: Array<Record<string, unknown>>;
    remoteInbound?: Array<Record<string, unknown>>;
  } = {}
): Record<string, unknown> {
  const frame: Record<string, unknown> = { timestamp: Date.now() };
  const audio: Record<string, unknown> = {};
  if (overrides.inbound !== undefined) {
    audio.inbound = overrides.inbound;
  }
  if (overrides.outbound !== undefined) {
    audio.outbound = overrides.outbound;
  }
  if (Object.keys(audio).length > 0) {
    frame.audio = audio;
  }
  if (overrides.remoteInbound !== undefined) {
    frame.remote = { audio: { inbound: overrides.remoteInbound } };
  }
  return frame;
}

// --- Tests ---

describe('buildPreCallMediaReport', () => {
  describe('module disabled', () => {
    it('returns undefined when media module is explicitly disabled', () => {
      const context = createContext({
        options: {
          ...createContext().options,
          media: false,
        },
        statsSamples: [createMediaFrame()],
      });
      const report = buildPreCallMediaReport(context);
      expect(report).toBeUndefined();
    });

    it('returns undefined when media.enabled is false (object form)', () => {
      const context = createContext({
        options: {
          ...createContext().options,
          media: { enabled: false },
        },
        statsSamples: [createMediaFrame()],
      });
      const report = buildPreCallMediaReport(context);
      expect(report).toBeUndefined();
    });

    it('returns a report when media.enabled is true (object form)', () => {
      const context = createContext({
        options: {
          ...createContext().options,
          media: { enabled: true },
        },
        statsSamples: [createMediaFrame()],
      });
      const report = buildPreCallMediaReport(context);
      expect(report).toBeDefined();
    });
  });

  describe('no stats samples', () => {
    it('returns audioFlowing: false with media_no_stats reason when samples is empty', () => {
      const context = createContext({ statsSamples: [] });
      const report = buildPreCallMediaReport(context);

      expect(report).toBeDefined();
      expect(report?.audioFlowing).toBe(false);
      expect(report?.outboundAudioFlowing).toBe(false);
      expect(report?.inboundAudioFlowing).toBe(false);
      expect(report?.sampleCount).toBe(0);
      expect(report?.reasons).toEqual([
        expect.objectContaining({ code: 'media_no_stats', source: 'media' }),
      ]);
    });

    it('returns audioFlowing: false when statsSamples is undefined/not an array', () => {
      const context = createContext({
        statsSamples: undefined as unknown as unknown[],
      });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(false);
      expect(report?.reasons?.[0]?.code).toBe('media_no_stats');
    });
  });

  describe('no audio RTP entries', () => {
    it('returns media_no_audio_rtp when frames exist but have no audio RTP', () => {
      // Frame with only connection stats, no audio
      const frames = [
        { timestamp: Date.now(), connection: { bytesSent: 100 } },
        { timestamp: Date.now(), connection: { bytesSent: 200 } },
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(false);
      expect(report?.sampleCount).toBe(2);
      expect(report?.reasons?.[0]?.code).toBe('media_no_audio_rtp');
      expect(report?.reasons?.[0]?.source).toBe('media');
    });

    it('returns media_no_audio_rtp when frames have no audio entries at all', () => {
      // Simulate frames that were already parsed and have no audio key
      // (e.g. only connection/video stats). The media module sees no
      // audio RTP entries and returns media_no_audio_rtp.
      const framesNoAudio = [
        { timestamp: Date.now(), connection: { bytesSent: 100 } },
        { timestamp: Date.now(), connection: { bytesSent: 200 } },
      ];
      const context = createContext({ statsSamples: framesNoAudio });
      const report = buildPreCallMediaReport(context);

      expect(report?.reasons?.[0]?.code).toBe('media_no_audio_rtp');
    });
  });

  describe('single sample (no delta possible)', () => {
    it('reports outbound present but flowing: false with single sample', () => {
      const frames = [
        createMediaFrame({
          outbound: [{ packetsSent: 100, bytesSent: 16000 }],
          inbound: [{ packetsReceived: 100, bytesReceived: 16000 }],
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(false);
      expect(report?.outboundAudioFlowing).toBe(false);
      expect(report?.inboundAudioFlowing).toBe(false);
      expect(report?.sampleCount).toBe(1);
      // Both directions present but not flowing (insufficient samples)
      expect(
        report?.reasons?.some((r) => r.code === 'media_outbound_not_flowing')
      ).toBe(true);
      expect(
        report?.reasons?.some((r) => r.code === 'media_inbound_not_flowing')
      ).toBe(true);
      // Counters should still be reported
      expect(report?.rtp?.outbound?.packets).toBe(100);
      expect(report?.rtp?.outbound?.bytes).toBe(16000);
      expect(report?.rtp?.inbound?.packets).toBe(100);
      expect(report?.rtp?.inbound?.bytes).toBe(16000);
    });

    it('reports no_outbound_audio when only inbound present in single sample', () => {
      const frames = [
        createMediaFrame({
          inbound: [{ packetsReceived: 50, bytesReceived: 8000 }],
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.outboundAudioFlowing).toBe(false);
      expect(
        report?.reasons?.some((r) => r.code === 'media_no_outbound_audio')
      ).toBe(true);
      expect(
        report?.reasons?.some((r) => r.code === 'media_inbound_not_flowing')
      ).toBe(true);
    });
  });

  describe('two-way RTP (both directions flowing)', () => {
    it('detects audioFlowing: true when both outbound and inbound counters increase', () => {
      const frames = [
        createMediaFrame({
          outbound: [{ packetsSent: 100, bytesSent: 16000 }],
          inbound: [{ packetsReceived: 100, bytesReceived: 16000 }],
        }),
        createMediaFrame({
          outbound: [{ packetsSent: 200, bytesSent: 32000 }],
          inbound: [{ packetsReceived: 200, bytesReceived: 32000 }],
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(true);
      expect(report?.outboundAudioFlowing).toBe(true);
      expect(report?.inboundAudioFlowing).toBe(true);
      expect(report?.sampleCount).toBe(2);
      // No reasons when both are flowing
      expect(report?.reasons).toBeUndefined();
      // Deltas should be reported
      expect(report?.rtp?.outbound?.packetsDelta).toBe(100);
      expect(report?.rtp?.outbound?.bytesDelta).toBe(16000);
      expect(report?.rtp?.inbound?.packetsDelta).toBe(100);
      expect(report?.rtp?.inbound?.bytesDelta).toBe(16000);
      // Last-frame counters
      expect(report?.rtp?.outbound?.packets).toBe(200);
      expect(report?.rtp?.inbound?.packets).toBe(200);
    });

    it('detects flowing using byte delta when packets are equal', () => {
      const frames = [
        createMediaFrame({
          outbound: [{ packetsSent: 100, bytesSent: 16000 }],
          inbound: [{ packetsReceived: 100, bytesReceived: 16000 }],
        }),
        createMediaFrame({
          outbound: [{ packetsSent: 100, bytesSent: 32000 }], // same packets, more bytes
          inbound: [{ packetsReceived: 100, bytesReceived: 16000 }], // no change
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      // Outbound flowing via bytes (packets didn't increase)
      expect(report?.outboundAudioFlowing).toBe(true);
      // Inbound not flowing (neither packets nor bytes increased)
      expect(report?.inboundAudioFlowing).toBe(false);
      expect(report?.audioFlowing).toBe(false);
      expect(
        report?.reasons?.some((r) => r.code === 'media_inbound_not_flowing')
      ).toBe(true);
    });
  });

  describe('one-way RTP', () => {
    it('detects outbound-only flowing (inbound missing)', () => {
      const frames = [
        createMediaFrame({
          outbound: [{ packetsSent: 100, bytesSent: 16000 }],
        }),
        createMediaFrame({
          outbound: [{ packetsSent: 200, bytesSent: 32000 }],
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.outboundAudioFlowing).toBe(true);
      expect(report?.inboundAudioFlowing).toBe(false);
      expect(report?.audioFlowing).toBe(false);
      expect(
        report?.reasons?.some((r) => r.code === 'media_no_inbound_audio')
      ).toBe(true);
    });

    it('detects inbound-only flowing (outbound missing)', () => {
      const frames = [
        createMediaFrame({
          inbound: [{ packetsReceived: 100, bytesReceived: 16000 }],
        }),
        createMediaFrame({
          inbound: [{ packetsReceived: 200, bytesReceived: 32000 }],
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.inboundAudioFlowing).toBe(true);
      expect(report?.outboundAudioFlowing).toBe(false);
      expect(report?.audioFlowing).toBe(false);
      expect(
        report?.reasons?.some((r) => r.code === 'media_no_outbound_audio')
      ).toBe(true);
    });

    it('detects outbound present but not flowing (counters flat)', () => {
      const frames = [
        createMediaFrame({
          outbound: [{ packetsSent: 100, bytesSent: 16000 }],
          inbound: [{ packetsReceived: 100, bytesReceived: 16000 }],
        }),
        createMediaFrame({
          outbound: [{ packetsSent: 100, bytesSent: 16000 }], // no increase
          inbound: [{ packetsReceived: 200, bytesReceived: 32000 }],
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.outboundAudioFlowing).toBe(false);
      expect(report?.inboundAudioFlowing).toBe(true);
      expect(report?.audioFlowing).toBe(false);
      expect(
        report?.reasons?.some((r) => r.code === 'media_outbound_not_flowing')
      ).toBe(true);
    });
  });

  describe('IStatsInterval-shaped frames (object inbound/outbound)', () => {
    it('supports IStatsInterval shape where inbound/outbound are objects', () => {
      // IStatsInterval: audio.inbound / audio.outbound are objects, not arrays
      const frames = [
        {
          timestamp: Date.now(),
          audio: {
            inbound: { packetsReceived: 100, bytesReceived: 16000 },
            outbound: { packetsSent: 100, bytesSent: 16000 },
          },
        },
        {
          timestamp: Date.now(),
          audio: {
            inbound: { packetsReceived: 200, bytesReceived: 32000 },
            outbound: { packetsSent: 200, bytesSent: 32000 },
          },
        },
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.audioFlowing).toBe(true);
      expect(report?.outboundAudioFlowing).toBe(true);
      expect(report?.inboundAudioFlowing).toBe(true);
      expect(report?.rtp?.outbound?.packets).toBe(200);
      expect(report?.rtp?.inbound?.packets).toBe(200);
    });

    it('supports mixed IStatsInterval shape with flowing detection', () => {
      const frames = [
        {
          timestamp: Date.now(),
          audio: {
            outbound: { packetsSent: 50, bytesSent: 8000 },
          },
        },
        {
          timestamp: Date.now(),
          audio: {
            outbound: { packetsSent: 60, bytesSent: 9600 },
          },
        },
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      expect(report?.outboundAudioFlowing).toBe(true);
      expect(report?.inboundAudioFlowing).toBe(false);
      expect(
        report?.reasons?.some((r) => r.code === 'media_no_inbound_audio')
      ).toBe(true);
    });
  });

  describe('safety: no NaN/Infinity values', () => {
    it('does not emit NaN or Infinity in deltas', () => {
      const frames = [
        createMediaFrame({
          outbound: [{ packetsSent: 100, bytesSent: 16000 }],
          inbound: [{ packetsReceived: 100, bytesReceived: 16000 }],
        }),
        createMediaFrame({
          outbound: [{ packetsSent: 200, bytesSent: 32000 }],
          inbound: [{ packetsReceived: 200, bytesReceived: 32000 }],
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      const allValues = [
        report?.rtp?.outbound?.packets,
        report?.rtp?.outbound?.bytes,
        report?.rtp?.outbound?.packetsDelta,
        report?.rtp?.outbound?.bytesDelta,
        report?.rtp?.inbound?.packets,
        report?.rtp?.inbound?.bytes,
        report?.rtp?.inbound?.packetsDelta,
        report?.rtp?.inbound?.bytesDelta,
      ];

      for (const v of allValues) {
        if (v !== undefined) {
          expect(Number.isNaN(v)).toBe(false);
          expect(Number.isFinite(v)).toBe(true);
        }
      }
    });

    it('handles partial stats (missing packets, only bytes)', () => {
      const frames = [
        createMediaFrame({
          outbound: [{ bytesSent: 16000 }], // no packetsSent
          inbound: [{ bytesReceived: 16000 }],
        }),
        createMediaFrame({
          outbound: [{ bytesSent: 32000 }],
          inbound: [{ bytesReceived: 32000 }],
        }),
      ];
      const context = createContext({ statsSamples: frames });
      const report = buildPreCallMediaReport(context);

      // Flowing via bytes even without packets
      expect(report?.outboundAudioFlowing).toBe(true);
      expect(report?.inboundAudioFlowing).toBe(true);
      expect(report?.audioFlowing).toBe(true);
      expect(report?.rtp?.outbound?.packets).toBeUndefined();
      expect(report?.rtp?.outbound?.bytes).toBe(32000);
      expect(report?.rtp?.outbound?.bytesDelta).toBe(16000);
    });
  });

  describe('reason code namespace', () => {
    it('all media reasons use the media_ prefix and source: media', () => {
      const context = createContext({ statsSamples: [] });
      const report = buildPreCallMediaReport(context);

      for (const reason of report?.reasons ?? []) {
        expect(reason.code.startsWith('media_')).toBe(true);
        expect(reason.source).toBe('media');
      }
    });
  });
});
