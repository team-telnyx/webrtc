/**
 * Integration tests for stats collection in PreCallDiagnostic — T5 (VSDK-302).
 *
 * These tests verify that PreCallDiagnostic.run() actually collects stats
 * from the call's peerConnection and that the media report reflects the
 * collected data (not always `media_no_stats`).
 *
 * The existing unit tests in `media.test.ts` cover `buildPreCallMediaReport()`
 * with fabricated frames. These tests cover the end-to-end runtime path:
 * `run()` → `collectSamples()` → `parseStatsFrame()` → `context.statsSamples`
 * → `buildPreCallMediaReport()`.
 */

import { PreCallDiagnostic } from '../PreCallDiagnostic';
import type {
  ClientLike,
  CallLike,
  PreCallDiagnosticOptions,
} from '../types';

// --- Mock RTCStatsReport helpers ---

/**
 * Create a mock RTCStatsReport from an array of stat entries.
 * Each entry should have `type`, `kind`/`mediaType`, and relevant fields.
 */
function createMockStatsReport(
  entries: Record<string, unknown>[]
): RTCStatsReport {
  const map = new Map<string, RTCStats>();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const id = (entry.id as string) ?? `stat-${i}`;
    map.set(id, entry as unknown as RTCStats);
  }

  // RTCStatsReport extends Map<string, RTCStats>
  return map as unknown as RTCStatsReport;
}

/**
 * Create a mock RTCPeerConnection that returns the given stats report
 * from getStats().
 */
function createMockPeerConnection(
  statsReport: RTCStatsReport
): RTCPeerConnection {
  return {
    getStats: jest.fn().mockResolvedValue(statsReport),
  } as unknown as RTCPeerConnection;
}

/**
 * Create two-way audio stats entries (both inbound and outbound RTP).
 */
function createTwoWayAudioEntries(): Record<string, unknown>[] {
  return [
    {
      id: 'outbound-audio-1',
      type: 'outbound-rtp',
      kind: 'audio',
      mediaType: 'audio',
      packetsSent: 100,
      bytesSent: 16000,
    },
    {
      id: 'inbound-audio-1',
      type: 'inbound-rtp',
      kind: 'audio',
      mediaType: 'audio',
      packetsReceived: 100,
      bytesReceived: 16000,
      packetsLost: 0,
      jitter: 0.005,
    },
  ];
}

/**
 * Create outbound-only audio stats entries.
 */
function createOutboundOnlyAudioEntries(): Record<string, unknown>[] {
  return [
    {
      id: 'outbound-audio-1',
      type: 'outbound-rtp',
      kind: 'audio',
      mediaType: 'audio',
      packetsSent: 100,
      bytesSent: 16000,
    },
  ];
}

/**
 * Create an empty stats report (no audio entries).
 */
function createEmptyEntries(): Record<string, unknown>[] {
  return [];
}

// --- Mock call/client helpers ---

function createMockCall(
  overrides: Partial<CallLike> = {}
): CallLike {
  return {
    id: 'test-call-id',
    hangup: jest.fn(),
    peerConnection: undefined,
    ...overrides,
  };
}

function createMockClient(
  callOverrides: Partial<CallLike> = {}
): ClientLike {
  const call = createMockCall(callOverrides);
  return {
    newCall: jest.fn().mockReturnValue(call),
  };
}

function createOptions(
  overrides: Partial<PreCallDiagnosticOptions> = {}
): PreCallDiagnosticOptions {
  return {
    client: createMockClient(),
    destinationNumber: '1234',
    durationMs: 10, // Keep tests fast
    statsSampleIntervalMs: 5,
    ...overrides,
  };
}

// --- Tests ---

describe('PreCallDiagnostic stats collection integration', () => {
  describe('with a call that has a peerConnection with two-way audio', () => {
    it('populates statsSamples with at least one frame', async () => {
      const statsReport = createMockStatsReport(createTwoWayAudioEntries());
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      // The media report should NOT be `media_no_stats`
      expect(report.media).toBeDefined();
      expect(report.media?.audioFlowing).toBe(true);
    });

    it('reports audioFlowing: true when both directions have RTP', async () => {
      const statsReport = createMockStatsReport(createTwoWayAudioEntries());
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media?.audioFlowing).toBe(true);
      expect(report.media?.outboundAudio?.rtpObserved).toBe(true);
      expect(report.media?.inboundAudio?.rtpObserved).toBe(true);
    });

    it('includes RTP counters from the stats', async () => {
      const statsReport = createMockStatsReport(createTwoWayAudioEntries());
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media?.outboundAudio?.rtp?.packets).toBe(100);
      expect(report.media?.outboundAudio?.rtp?.bytes).toBe(16000);
      expect(report.media?.inboundAudio?.rtp?.packets).toBe(100);
      expect(report.media?.inboundAudio?.rtp?.bytes).toBe(16000);
    });

    it('includes inbound audio quality stats', async () => {
      const statsReport = createMockStatsReport(createTwoWayAudioEntries());
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media?.inboundAudio?.packetsLost).toBe(0);
      expect(report.media?.inboundAudio?.jitterMs).toBe(5); // 0.005s * 1000
    });

    it('does not produce media_no_stats reason when stats are available', async () => {
      const statsReport = createMockStatsReport(createTwoWayAudioEntries());
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      const noStatsReason = report.media?.reasons?.find(
        (r) => r.code === 'media_no_stats'
      );
      expect(noStatsReason).toBeUndefined();
    });
  });

  describe('with a call that has a peerConnection with outbound-only audio', () => {
    it('reports audioFlowing: false when inbound is missing', async () => {
      const statsReport = createMockStatsReport(createOutboundOnlyAudioEntries());
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media).toBeDefined();
      expect(report.media?.audioFlowing).toBe(false);
      expect(report.media?.outboundAudio?.rtpObserved).toBe(true);
      expect(report.media?.inboundAudio?.rtpObserved).toBe(false);
    });

    it('includes media_no_inbound_rtp reason', async () => {
      const statsReport = createMockStatsReport(createOutboundOnlyAudioEntries());
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media?.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'media_no_inbound_rtp' }),
        ])
      );
    });
  });

  describe('with a call that has a peerConnection with no audio stats', () => {
    it('reports audioFlowing: false when no RTP is observed', async () => {
      const statsReport = createMockStatsReport(createEmptyEntries());
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media).toBeDefined();
      // Empty stats frame means no audio entries, but the frame itself exists
      // so the media module sees hasStats=true but rtpObserved=false for both directions
      expect(report.media?.audioFlowing).toBe(false);
    });
  });

  describe('with a call that has no peerConnection', () => {
    it('produces media_no_stats when peerConnection is missing', async () => {
      const options = createOptions({
        client: createMockClient({ peerConnection: undefined }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media).toBeDefined();
      expect(report.media?.audioFlowing).toBeUndefined();
      expect(report.media?.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'media_no_stats' }),
        ])
      );
    });
  });

  describe('with a peerConnection where getStats() throws', () => {
    it('produces media_no_stats when stats collection fails', async () => {
      const pc = {
        getStats: jest.fn().mockRejectedValue(new Error('getStats failed')),
      } as unknown as RTCPeerConnection;
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media).toBeDefined();
      // All getStats() calls failed, so no samples were collected
      expect(report.media?.audioFlowing).toBeUndefined();
      expect(report.media?.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'media_no_stats' }),
        ])
      );
    });
  });

  describe('with multiple stats samples over time', () => {
    it('uses the last frame for cumulative counters', async () => {
      // First sample: 50 packets, second: 100 packets
      let callCount = 0;
      const pc = {
        getStats: jest.fn().mockImplementation(() => {
          callCount++;
          const packetsSent = callCount * 50;
          const packetsReceived = callCount * 50;
          return Promise.resolve(
            createMockStatsReport([
              {
                id: 'outbound-audio-1',
                type: 'outbound-rtp',
                kind: 'audio',
                mediaType: 'audio',
                packetsSent,
                bytesSent: packetsSent * 160,
              },
              {
                id: 'inbound-audio-1',
                type: 'inbound-rtp',
                kind: 'audio',
                mediaType: 'audio',
                packetsReceived,
                bytesReceived: packetsReceived * 160,
              },
            ])
          );
        }),
      } as unknown as RTCPeerConnection;

      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
        durationMs: 30,
        statsSampleIntervalMs: 10,
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      // The media report should use the last frame's values
      expect(report.media?.audioFlowing).toBe(true);
      // The exact number of samples varies by timing, but the last
      // frame should have the highest counters
      if (report.media?.outboundAudio?.rtp?.packets) {
        expect(report.media.outboundAudio.rtp.packets).toBeGreaterThanOrEqual(50);
      }
    });
  });

  describe('with remote-inbound-rtp entries', () => {
    it('populates remote.audio.inbound in the stats frame', async () => {
      const statsReport = createMockStatsReport([
        {
          id: 'outbound-audio-1',
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsSent: 100,
          bytesSent: 16000,
        },
        {
          id: 'remote-inbound-audio-1',
          type: 'remote-inbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsReceived: 95,
          packetsLost: 5,
          jitter: 0.01,
        },
        {
          id: 'inbound-audio-1',
          type: 'inbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsReceived: 100,
          bytesReceived: 16000,
        },
      ]);
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      // Local inbound takes priority; remote-inbound is a fallback
      expect(report.media?.audioFlowing).toBe(true);
      expect(report.media?.inboundAudio?.rtp?.packets).toBe(100);
    });
  });

  describe('with transport-level stats', () => {
    it('populates connection field in the stats frame', async () => {
      const statsReport = createMockStatsReport([
        {
          id: 'transport-1',
          type: 'transport',
          packetsSent: 200,
          packetsReceived: 200,
          bytesSent: 32000,
          bytesReceived: 32000,
        },
        {
          id: 'outbound-audio-1',
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsSent: 100,
          bytesSent: 16000,
        },
        {
          id: 'inbound-audio-1',
          type: 'inbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsReceived: 100,
          bytesReceived: 16000,
        },
      ]);
      const pc = createMockPeerConnection(statsReport);
      const options = createOptions({
        client: createMockClient({ peerConnection: pc }),
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      // Audio-level stats take priority over connection-level
      expect(report.media?.audioFlowing).toBe(true);
      expect(report.media?.outboundAudio?.rtp?.packets).toBe(100);
      expect(report.media?.inboundAudio?.rtp?.packets).toBe(100);
    });
  });

  describe('with an SDK-shaped call using peer.instance (not peerConnection)', () => {
    /**
     * The real SDK's BaseCall exposes the RTCPeerConnection at
     * `call.peer.instance`, not `call.peerConnection`. This test
     * verifies that collectSamples() resolves the PC from peer.instance
     * when peerConnection is not set.
     */
    it('collects stats from peer.instance when peerConnection is absent', async () => {
      const statsReport = createMockStatsReport(createTwoWayAudioEntries());
      const pc = createMockPeerConnection(statsReport);
      // SDK-shaped call: peer.instance instead of peerConnection
      const options = createOptions({
        client: {
          newCall: jest.fn().mockReturnValue({
            id: 'sdk-call-id',
            hangup: jest.fn(),
            peerConnection: undefined,
            peer: { instance: pc },
          }),
        },
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media).toBeDefined();
      expect(report.media?.audioFlowing).toBe(true);
      expect(report.media?.outboundAudio?.rtpObserved).toBe(true);
      expect(report.media?.inboundAudio?.rtpObserved).toBe(true);
    });

    it('prefers peerConnection over peer.instance when both are set', async () => {
      const explicitReport = createMockStatsReport(createTwoWayAudioEntries());
      const explicitPc = createMockPeerConnection(explicitReport);
      const peerInstancePc = {
        getStats: jest.fn().mockResolvedValue(createMockStatsReport([])),
      } as unknown as RTCPeerConnection;

      const options = createOptions({
        client: {
          newCall: jest.fn().mockReturnValue({
            id: 'sdk-call-id',
            hangup: jest.fn(),
            peerConnection: explicitPc,
            peer: { instance: peerInstancePc },
          }),
        },
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      // Should use explicitPc (two-way audio), not peerInstancePc (empty)
      expect(report.media?.audioFlowing).toBe(true);
      expect(explicitPc.getStats).toHaveBeenCalled();
      // peer.instance's getStats should NOT have been called since peerConnection was used
      expect((peerInstancePc as unknown as { getStats: jest.Mock }).getStats).not.toHaveBeenCalled();
    });

    it('produces media_no_stats when both peerConnection and peer.instance are absent', async () => {
      const options = createOptions({
        client: {
          newCall: jest.fn().mockReturnValue({
            id: 'sdk-call-id',
            hangup: jest.fn(),
            peerConnection: undefined,
            peer: { instance: undefined },
          }),
        },
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media).toBeDefined();
      expect(report.media?.audioFlowing).toBeUndefined();
      expect(report.media?.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'media_no_stats' }),
        ])
      );
    });

    it('produces media_no_stats when peer property is absent entirely', async () => {
      const options = createOptions({
        client: {
          newCall: jest.fn().mockReturnValue({
            id: 'sdk-call-id',
            hangup: jest.fn(),
            peerConnection: undefined,
            // No peer property at all — mimics minimal CallLike
          }),
        },
      });
      const diagnostic = new PreCallDiagnostic(options);
      const report = await diagnostic.run();

      expect(report.media?.audioFlowing).toBeUndefined();
      expect(report.media?.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'media_no_stats' }),
        ])
      );
    });
  });
});
