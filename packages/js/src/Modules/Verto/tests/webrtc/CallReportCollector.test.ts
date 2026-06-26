import logger from '../../util/logger';
import {
  LOW_BYTES_RECEIVED,
  LOW_LOCAL_AUDIO,
  LOW_INBOUND_AUDIO,
} from '../../util/constants/errorCodes';
import type { ITelnyxWarning } from '../../util/constants/warnings';
import {
  CallReportCollector,
  type ICallReportPayload,
  type ILocalAudioSourceStats,
  type ILocalAudioTrackSnapshot,
  type IStatsInterval,
} from '../../webrtc/CallReportCollector';

type SendPayload = (
  payload: unknown,
  callReportId: string,
  host: string,
  voiceSdkId?: string
) => Promise<void>;

type TestableCallReportCollector = {
  peerConnection: {
    getStats?: () => Promise<RTCStatsReport>;
    getSenders: () => Array<{
      track?: Partial<MediaStreamTrack> & {
        kind?: string;
        contentHint?: string;
        getSettings?: () => Partial<MediaTrackSettings>;
      };
    }>;
  } | null;
  onFlushNeeded: (() => void) | null;
  cleanup: () => void;
  _collectStats: (isFinal?: boolean) => Promise<void>;
  flush: (
    summary: { callId: string },
    flushReason?: ICallReportPayload['flushReason']
  ) => ICallReportPayload | null;
  onWarning: ((warning: ITelnyxWarning) => void) | null;
  _withoutUndefined: <T extends Record<string, unknown>>(obj: T) => T;
  _checkQualityWarnings: (
    statsEntry: IStatsInterval,
    inboundAudio: RTCInboundRtpStreamStats | null
  ) => void;
  _getLocalAudioTrackSnapshot: () => ILocalAudioTrackSnapshot | undefined;
  _getOutboundAudioSourceStats: (
    stats: RTCStatsReport,
    outboundAudio: RTCOutboundRtpStreamStats & { mediaSourceId?: string }
  ) => ILocalAudioSourceStats | undefined;
  _getOutboundAudioLevel: (
    stats: RTCStatsReport,
    outboundAudio: RTCOutboundRtpStreamStats & { mediaSourceId?: string }
  ) => number | null;
  _getCodec: (
    stats: RTCStatsReport,
    codecId?: string
  ) =>
    | {
        type: string;
        id: string;
        mimeType?: string;
        clockRate?: number;
        channels?: number;
        sdpFmtpLine?: string;
        payloadType?: number;
      }
    | undefined;
  _logLocalAudioTrackSnapshot: (
    localAudioTrack?: ILocalAudioTrackSnapshot,
    localAudioSource?: ILocalAudioSourceStats
  ) => void;
  shouldForceRelayCandidateForRecovery: () => boolean;
  sendPayload: SendPayload;
  _sendPayload: SendPayload;
};

const createCollector = (): TestableCallReportCollector =>
  new CallReportCollector({
    enabled: true,
    interval: 5000,
  }) as unknown as TestableCallReportCollector;

const createStatsEntry = (audioLevelAvg: number): IStatsInterval => ({
  intervalStartUtc: '2026-05-15T00:00:00.000Z',
  intervalEndUtc: '2026-05-15T00:00:05.000Z',
  audio: {
    outbound: {
      audioLevelAvg,
      localTrack: {
        id: 'track-id',
        enabled: true,
        muted: false,
      },
    },
  },
});

/**
 * Create a stats entry with an inbound audioLevelAvg, simulating
 * one-way audio (RTP flowing but carrying silence/comfort-noise).
 * Outbound is set to a healthy level to isolate the inbound check.
 * bytesReceived increments across calls to simulate RTP flowing
 * (prevents LOW_BYTES_RECEIVED from firing).
 */
let _inboundBytesCounter = 1000;
const createInboundStatsEntry = (
  inboundAudioLevelAvg: number
): IStatsInterval => {
  _inboundBytesCounter += 4800; // ~100 packets * 48 bytes per 5s interval
  return {
    intervalStartUtc: '2026-05-15T00:00:00.000Z',
    intervalEndUtc: '2026-05-15T00:00:05.000Z',
    audio: {
      outbound: {
        audioLevelAvg: 0.5,
        localTrack: {
          id: 'track-id',
          enabled: true,
          muted: false,
        },
      },
      inbound: {
        audioLevelAvg: inboundAudioLevelAvg,
        bytesReceived: _inboundBytesCounter,
      },
    },
  };
};

describe('CallReportCollector intermediate reports', () => {
  it('allows socket-close intermediate reports with logs but no stats', () => {
    const collector = createCollector();
    const logEntry = {
      timestamp: '2026-06-17T20:49:00.000Z',
      level: 'warn' as const,
      message: 'socket closed after safety flush',
      context: { socketGeneration: 2 },
    };
    (collector as unknown as { logCollector: unknown }).logCollector = {
      getLogCount: jest.fn(() => 1),
      drain: jest.fn(() => [logEntry]),
    };

    const payload = collector.flush(
      { callId: 'call-id' },
      {
        type: 'socket-close',
        socketClose: {
          code: 1006,
          codeName: 'ABNORMAL_CLOSURE',
          reason: 'network changed',
          wasClean: false,
        },
      }
    );

    expect(payload).toEqual(
      expect.objectContaining({
        segment: 0,
        stats: [],
        logs: [logEntry],
        flushReason: {
          type: 'socket-close',
          socketClose: {
            code: 1006,
            codeName: 'ABNORMAL_CLOSURE',
            reason: 'network changed',
            wasClean: false,
          },
        },
      })
    );
  });

  it('allows socket-close intermediate reports with metadata but no stats or logs', () => {
    const collector = createCollector();

    const payload = collector.flush(
      { callId: 'call-id' },
      {
        type: 'socket-close',
        socketClose: {
          code: 1006,
          codeName: 'ABNORMAL_CLOSURE',
          reason: 'network changed',
          wasClean: false,
        },
      }
    );

    expect(payload).toEqual(
      expect.objectContaining({
        segment: 0,
        stats: [],
        flushReason: expect.objectContaining({ type: 'socket-close' }),
      })
    );
  });

  it('logs why non-socket intermediate flushes are skipped when nothing is buffered', () => {
    const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(jest.fn());
    const collector = createCollector();

    expect(collector.flush({ callId: 'call-id' })).toBeNull();
    expect(debugSpy).toHaveBeenCalledWith(
      'CallReportCollector: Skipping intermediate flush',
      expect.objectContaining({
        reason: 'no-stats-or-logs',
        statsIntervals: 0,
        logEntries: 0,
      })
    );

    debugSpy.mockRestore();
  });

  it('includes flush reason metadata in intermediate report payloads', () => {
    const collector = createCollector();
    const statsEntry = createStatsEntry(0.5);
    (collector as unknown as { statsBuffer: IStatsInterval[] }).statsBuffer = [
      statsEntry,
    ];

    const payload = collector.flush(
      { callId: 'call-id' },
      {
        type: 'socket-close',
        socketClose: {
          code: 1006,
          codeName: 'ABNORMAL_CLOSURE',
          reason: 'network changed',
          wasClean: false,
        },
      }
    );

    expect(payload).toEqual(
      expect.objectContaining({
        segment: 0,
        stats: [statsEntry],
        flushReason: {
          type: 'socket-close',
          socketClose: {
            code: 1006,
            codeName: 'ABNORMAL_CLOSURE',
            reason: 'network changed',
            wasClean: false,
          },
        },
      })
    );
  });
});

describe('CallReportCollector no-RTP warnings', () => {
  const statsWithBytes = (
    inboundBytes: number,
    outboundBytes: number = 1000
  ): IStatsInterval => ({
    intervalStartUtc: '2026-05-22T11:21:00.000Z',
    intervalEndUtc: '2026-05-22T11:21:05.000Z',
    audio: {
      inbound: { bytesReceived: inboundBytes },
      outbound: { bytesSent: outboundBytes },
    },
  });

  const pushAndCheck = (
    collector: TestableCallReportCollector,
    statsEntry: IStatsInterval
  ) => {
    (
      collector as unknown as { statsBuffer: IStatsInterval[] }
    ).statsBuffer.push(statsEntry);
    collector._checkQualityWarnings(statsEntry, null);
  };

  it('keeps inbound no-RTP detection active across intermediate report flushes', () => {
    const collector = createCollector();
    const warningSpy = jest.fn();
    collector.onWarning = warningSpy;

    pushAndCheck(collector, statsWithBytes(1000));

    const payload = collector.flush({ callId: 'call-id' });
    expect(payload?.stats).toHaveLength(1);
    expect(
      (collector as unknown as { statsBuffer: IStatsInterval[] }).statsBuffer
    ).toHaveLength(0);

    pushAndCheck(collector, statsWithBytes(1000));
    pushAndCheck(collector, statsWithBytes(1000));
    expect(warningSpy).not.toHaveBeenCalled();

    pushAndCheck(collector, statsWithBytes(1000));
    expect(warningSpy).toHaveBeenCalledWith(
      expect.objectContaining({ code: LOW_BYTES_RECEIVED })
    );
  });
});

describe('CallReportCollector relay recovery detection', () => {
  const vpnStats = (
    overrides: Partial<IStatsInterval> = {}
  ): IStatsInterval => ({
    intervalStartUtc: '2026-05-19T21:10:00.000Z',
    intervalEndUtc: '2026-05-19T21:10:05.000Z',
    audio: {
      outbound: { bytesSent: 1000 },
      inbound: { bytesReceived: 1000 },
    },
    ice: {
      local: { candidateType: 'srflx', networkType: 'vpn' },
      writable: true,
      requestsSent: 10,
      responsesReceived: 10,
    },
    transport: { iceState: 'connected' },
    ...overrides,
  });

  it('requests relay recovery for a stalled non-relay VPN media path', () => {
    const collector = createCollector();
    (collector as unknown as { statsBuffer: IStatsInterval[] }).statsBuffer = [
      vpnStats(),
      vpnStats({
        audio: {
          outbound: { bytesSent: 2000 },
          inbound: { bytesReceived: 1000 },
        },
        ice: {
          local: { candidateType: 'srflx', networkType: 'vpn' },
          writable: false,
          requestsSent: 20,
          responsesReceived: 10,
        },
        transport: { iceState: 'disconnected' },
      }),
    ];

    expect(collector.shouldForceRelayCandidateForRecovery()).toBe(true);
  });

  it('does not request relay recovery for an already selected relay candidate', () => {
    const collector = createCollector();
    (collector as unknown as { statsBuffer: IStatsInterval[] }).statsBuffer = [
      vpnStats({
        ice: {
          local: { candidateType: 'relay', networkType: 'vpn' },
          writable: false,
        },
      }),
      vpnStats({
        ice: {
          local: { candidateType: 'relay', networkType: 'vpn' },
          writable: false,
        },
      }),
    ];

    expect(collector.shouldForceRelayCandidateForRecovery()).toBe(false);
  });

  it('does not request relay recovery for non-VPN candidate paths', () => {
    const collector = createCollector();
    (collector as unknown as { statsBuffer: IStatsInterval[] }).statsBuffer = [
      vpnStats({
        ice: {
          local: { candidateType: 'srflx', networkType: 'wifi' },
          writable: false,
        },
      }),
      vpnStats({
        ice: {
          local: { candidateType: 'srflx', networkType: 'wifi' },
          writable: false,
        },
      }),
    ];

    expect(collector.shouldForceRelayCandidateForRecovery()).toBe(false);
  });
});

describe('CallReportCollector local audio diagnostics', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('removes undefined values without mutating the input object', () => {
    const collector = createCollector();
    const input = { id: 'track-id', label: undefined, enabled: true };

    const cleaned = collector._withoutUndefined(input);

    expect(cleaned).toEqual({ id: 'track-id', enabled: true });
    expect(cleaned).not.toBe(input);
    expect(input).toEqual({ id: 'track-id', label: undefined, enabled: true });
  });

  it('returns undefined for empty local audio track snapshots', () => {
    const collector = createCollector();
    collector.peerConnection = {
      getSenders: () => [
        {
          track: {
            kind: 'audio',
            id: undefined,
            label: undefined,
            enabled: undefined,
            muted: undefined,
            readyState: undefined,
            getSettings: () => ({}),
          },
        },
      ],
    };

    expect(collector._getLocalAudioTrackSnapshot()).toBeUndefined();
  });

  it('deduplicates local audio track logs with stable key ordering', () => {
    const debugSpy = jest.spyOn(logger, 'debug').mockImplementation();
    const collector = createCollector();

    collector._logLocalAudioTrackSnapshot({
      id: 'track-id',
      label: 'Microphone',
      settings: { sampleRate: 48000, channelCount: 1 },
    });
    collector._logLocalAudioTrackSnapshot({
      settings: { channelCount: 1, sampleRate: 48000 },
      label: 'Microphone',
      id: 'track-id',
    });

    expect(debugSpy).toHaveBeenCalledTimes(1);
  });

  it('resets local audio track log deduplication on cleanup', () => {
    const debugSpy = jest.spyOn(logger, 'debug').mockImplementation();
    const collector = createCollector();
    const snapshot = { id: 'track-id' };

    collector._logLocalAudioTrackSnapshot(snapshot);
    collector.cleanup();
    collector._logLocalAudioTrackSnapshot(snapshot);

    expect(debugSpy).toHaveBeenCalledTimes(2);
  });

  it('returns undefined for empty outbound audio media-source snapshots', () => {
    const collector = createCollector();
    const stats = new Map<string, unknown>([
      ['source-id', { type: 'media-source', kind: 'audio' }],
    ]) as unknown as RTCStatsReport;

    expect(
      collector._getOutboundAudioSourceStats(stats, {
        type: 'outbound-rtp',
        id: 'outbound-audio',
        mediaSourceId: 'source-id',
      } as RTCOutboundRtpStreamStats & { mediaSourceId?: string })
    ).toBeUndefined();
  });

  it('derives outbound audio level from local audio energy deltas', () => {
    const collector = createCollector();
    const outboundAudio = {
      type: 'outbound-rtp',
      id: 'outbound-audio',
      mediaSourceId: 'source-id',
    } as RTCOutboundRtpStreamStats & { mediaSourceId?: string };
    const firstStats = new Map<string, unknown>([
      [
        'source-id',
        {
          type: 'media-source',
          kind: 'audio',
          totalAudioEnergy: 1,
          totalSamplesDuration: 10,
        },
      ],
    ]) as unknown as RTCStatsReport;
    const secondStats = new Map<string, unknown>([
      [
        'source-id',
        {
          type: 'media-source',
          kind: 'audio',
          totalAudioEnergy: 1.000001,
          totalSamplesDuration: 11,
        },
      ],
    ]) as unknown as RTCStatsReport;

    expect(
      collector._getOutboundAudioLevel(firstStats, outboundAudio)
    ).toBeNull();
    expect(
      collector._getOutboundAudioLevel(secondStats, outboundAudio)
    ).toBeCloseTo(0.001);
  });

  it('emits low local audio warning after consecutive outbound audio breaches', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    collector.onWarning = onWarning;

    collector._checkQualityWarnings(createStatsEntry(0), null);
    collector._checkQualityWarnings(createStatsEntry(0), null);
    expect(onWarning).not.toHaveBeenCalled();

    collector._checkQualityWarnings(createStatsEntry(0), null);

    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        code: LOW_LOCAL_AUDIO,
        name: 'LOW_LOCAL_AUDIO',
      })
    );
  });

  it('does not emit low local audio warning during short silence after local audio is confirmed', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    collector.onWarning = onWarning;

    collector._checkQualityWarnings(createStatsEntry(0.01), null);
    collector._checkQualityWarnings(createStatsEntry(0), null);
    collector._checkQualityWarnings(createStatsEntry(0), null);
    collector._checkQualityWarnings(createStatsEntry(0), null);

    expect(onWarning).not.toHaveBeenCalled();
  });

  it('emits low local audio warning again only after long silence once local audio is confirmed', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    collector.onWarning = onWarning;

    collector._checkQualityWarnings(createStatsEntry(0), null);
    collector._checkQualityWarnings(createStatsEntry(0), null);
    collector._checkQualityWarnings(createStatsEntry(0), null);
    expect(onWarning).toHaveBeenCalledTimes(1);

    collector._checkQualityWarnings(createStatsEntry(0.01), null);

    for (let i = 0; i < 5; i += 1) {
      collector._checkQualityWarnings(createStatsEntry(0), null);
    }
    expect(onWarning).toHaveBeenCalledTimes(1);

    collector._checkQualityWarnings(createStatsEntry(0), null);
    expect(onWarning).toHaveBeenCalledTimes(2);

    collector._checkQualityWarnings(createStatsEntry(0), null);
    expect(onWarning).toHaveBeenCalledTimes(2);
  });

  it('does not emit low local audio warning for disabled local tracks', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    const statsEntry = createStatsEntry(0);
    if (statsEntry.audio?.outbound?.localTrack) {
      statsEntry.audio.outbound.localTrack.enabled = false;
    }
    collector.onWarning = onWarning;

    collector._checkQualityWarnings(statsEntry, null);
    collector._checkQualityWarnings(statsEntry, null);
    collector._checkQualityWarnings(statsEntry, null);

    expect(onWarning).not.toHaveBeenCalled();
  });
});

describe('CallReportCollector LOW_INBOUND_AUDIO warning', () => {
  beforeEach(() => {
    _inboundBytesCounter = 1000;
  });

  it('emits low inbound audio warning after consecutive inbound audio breaches', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    collector.onWarning = onWarning;

    collector._checkQualityWarnings(createInboundStatsEntry(0), null);
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);
    expect(onWarning).not.toHaveBeenCalled();

    collector._checkQualityWarnings(createInboundStatsEntry(0), null);

    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        code: LOW_INBOUND_AUDIO,
        name: 'LOW_INBOUND_AUDIO',
      })
    );
  });

  it('does not emit low inbound audio warning when inbound audio is healthy', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    collector.onWarning = onWarning;

    for (let i = 0; i < 5; i += 1) {
      collector._checkQualityWarnings(createInboundStatsEntry(0.5), null);
    }

    expect(onWarning).not.toHaveBeenCalled();
  });

  it('does not emit low inbound audio warning on brief silence (fewer than 3 breaches)', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    collector.onWarning = onWarning;

    collector._checkQualityWarnings(createInboundStatsEntry(0), null);
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);
    // Recovery before the 3rd breach
    collector._checkQualityWarnings(createInboundStatsEntry(0.5), null);
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);

    expect(onWarning).not.toHaveBeenCalled();
  });

  it('resets breach counter when inbound audio level is unavailable', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    collector.onWarning = onWarning;

    // Two low breaches (not enough to fire)
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);

    // Interval with no inbound audioLevelAvg — should reset breach counter
    const noInboundEntry = createStatsEntry(0.5);
    collector._checkQualityWarnings(noInboundEntry, null);

    // Two more low breaches should NOT fire (counter was reset)
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);

    expect(onWarning).not.toHaveBeenCalled();

    // Third breach after reset DOES fire
    collector._checkQualityWarnings(createInboundStatsEntry(0), null);
    expect(onWarning).toHaveBeenCalledTimes(1);
  });

  it('emits low inbound audio when comfort-noise scenario: RTP bytes flow but audioLevelAvg is near-zero', () => {
    const collector = createCollector();
    const onWarning = jest.fn();
    collector.onWarning = onWarning;

    // Simulate comfort-noise: bytesReceived increasing (RTP flowing)
    // but audioLevelAvg near-zero (silence/comfort-noise content).
    // createInboundStatsEntry auto-increments bytesReceived so
    // LOW_BYTES_RECEIVED won't fire — only LOW_INBOUND_AUDIO should.
    collector._checkQualityWarnings(createInboundStatsEntry(0.0001), null);
    collector._checkQualityWarnings(createInboundStatsEntry(0.0001), null);
    collector._checkQualityWarnings(createInboundStatsEntry(0.0001), null);

    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        code: LOW_INBOUND_AUDIO,
        name: 'LOW_INBOUND_AUDIO',
      })
    );
  });
});

describe('CallReportCollector cadence', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('collects every second for the full call duration', () => {
    const collector = new CallReportCollector({
      enabled: true,
      interval: 5000,
    });
    const testable = collector as unknown as {
      _collectionIntervalFor: () => number;
    };

    expect(testable._collectionIntervalFor()).toEqual(1000);
  });

  it('does not slow down collection if the configured default interval is shorter than the initial cadence', () => {
    const collector = new CallReportCollector({
      enabled: true,
      interval: 500,
    });
    const testable = collector as unknown as {
      _collectionIntervalFor: () => number;
    };

    expect(testable._collectionIntervalFor()).toEqual(500);
  });

  it('collects a final stats interval for calls shorter than the current cadence interval', async () => {
    jest.useFakeTimers();

    const collector = new CallReportCollector({
      enabled: true,
      interval: 5000,
    });
    const peerConnection = {
      getStats: jest.fn().mockResolvedValue(new Map()),
    } as unknown as RTCPeerConnection;

    collector.start(peerConnection);
    await collector.stop();

    expect(peerConnection.getStats).toHaveBeenCalledTimes(1);
    expect(collector.getStatsBuffer()).toHaveLength(1);
  });

  it('records selected ICE pair ids, candidate URL, and RTT source from getStats', async () => {
    const selectedPair = {
      id: 'CP_selected',
      type: 'candidate-pair',
      state: 'succeeded',
      nominated: true,
      localCandidateId: 'local_srflx',
      remoteCandidateId: 'remote_media',
      currentRoundTripTime: 0.42,
      requestsSent: 7,
      responsesReceived: 7,
    };
    const stats = new Map<string, unknown>([
      [
        'transport_0',
        {
          id: 'transport_0',
          type: 'transport',
          iceState: 'connected',
          selectedCandidatePairId: 'CP_selected',
          selectedCandidatePairChanges: 1,
        },
      ],
      [
        'CP_old',
        {
          id: 'CP_old',
          type: 'candidate-pair',
          state: 'succeeded',
          nominated: true,
          localCandidateId: 'local_old',
          remoteCandidateId: 'remote_old',
          currentRoundTripTime: 0.01,
        },
      ],
      ['CP_selected', selectedPair],
      [
        'local_srflx',
        {
          id: 'local_srflx',
          type: 'local-candidate',
          address: '203.0.113.10',
          port: 50000,
          candidateType: 'srflx',
          protocol: 'udp',
          networkType: 'wifi',
          url: 'stun:stun.telnyx.com:3478',
        },
      ],
      [
        'remote_media',
        {
          id: 'remote_media',
          type: 'remote-candidate',
          address: '64.16.248.141',
          port: 20000,
          candidateType: 'host',
          protocol: 'udp',
        },
      ],
    ]);
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    expect(
      (collector as unknown as CallReportCollector).getStatsBuffer()[0]
    ).toEqual(
      expect.objectContaining({
        connection: expect.objectContaining({
          currentRoundTripTime: 0.42,
          roundTripTimeSource: 'candidate-pair.currentRoundTripTime',
        }),
        ice: expect.objectContaining({
          id: 'CP_selected',
          localCandidateId: 'local_srflx',
          remoteCandidateId: 'remote_media',
          currentRoundTripTime: 0.42,
          local: expect.objectContaining({
            id: 'local_srflx',
            candidateType: 'srflx',
            url: 'stun:stun.telnyx.com:3478',
          }),
          remote: expect.objectContaining({
            id: 'remote_media',
            address: '64.16.248.141',
          }),
        }),
        transport: expect.objectContaining({
          selectedCandidatePairId: 'CP_selected',
          selectedCandidatePairChanges: 1,
        }),
      })
    );
  });
});

describe('CallReportCollector outbound RTP fields', () => {
  it('collects additional outbound-rtp fields (retransmission, headers, nack, targetBitrate, totalPacketSendDelay, active)', async () => {
    const outboundRtp = {
      id: 'outbound-audio',
      type: 'outbound-rtp',
      kind: 'audio',
      mediaType: 'audio',
      ssrc: 1234,
      timestamp: Date.now(),
      packetsSent: 100,
      bytesSent: 4800,
      retransmittedPacketsSent: 3,
      retransmittedBytesSent: 144,
      headerBytesSent: 800,
      nackCount: 1,
      targetBitrate: 32000,
      totalPacketSendDelay: 0.5,
      active: true,
    };
    const stats = new Map<string, unknown>([['outbound-audio', outboundRtp]]);
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    const outbound = (
      collector as unknown as CallReportCollector
    ).getStatsBuffer()[0].audio?.outbound;

    // New fields are collected with their expected values.
    expect(outbound).toEqual(
      expect.objectContaining({
        retransmittedPacketsSent: 3,
        retransmittedBytesSent: 144,
        headerBytesSent: 800,
        nackCount: 1,
        targetBitrate: 32000,
        totalPacketSendDelay: 0.5,
        active: true,
      })
    );

    // Existing fields are still present.
    expect(outbound).toEqual(
      expect.objectContaining({
        packetsSent: 100,
        bytesSent: 4800,
      })
    );
    expect(outbound).toHaveProperty('audioLevelAvg');
    expect(outbound).toHaveProperty('bitrateAvg');
  });

  it('does not set the new outbound-rtp fields when the report omits them', async () => {
    const outboundRtp = {
      id: 'outbound-audio',
      type: 'outbound-rtp',
      kind: 'audio',
      mediaType: 'audio',
      ssrc: 1234,
      timestamp: Date.now(),
      packetsSent: 50,
      bytesSent: 2400,
    };
    const stats = new Map<string, unknown>([['outbound-audio', outboundRtp]]);
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    const outbound = (
      collector as unknown as CallReportCollector
    ).getStatsBuffer()[0].audio?.outbound;

    expect(outbound).toEqual(
      expect.objectContaining({
        packetsSent: 50,
        bytesSent: 2400,
      })
    );
    expect(outbound).not.toHaveProperty('retransmittedPacketsSent');
    expect(outbound).not.toHaveProperty('retransmittedBytesSent');
    expect(outbound).not.toHaveProperty('headerBytesSent');
    expect(outbound).not.toHaveProperty('nackCount');
    expect(outbound).not.toHaveProperty('targetBitrate');
    expect(outbound).not.toHaveProperty('totalPacketSendDelay');
    expect(outbound).not.toHaveProperty('active');
  });
});

describe('CallReportCollector intermediate flushes', () => {
  it('requests time-based intermediate flushes while a call is active', async () => {
    const collector = new CallReportCollector({
      enabled: true,
      interval: 5000,
      intermediateReportInterval: 10000,
    }) as unknown as TestableCallReportCollector;
    const flushSpy = jest.fn();
    collector.onFlushNeeded = flushSpy;
    collector.peerConnection = {
      getStats: () => Promise.resolve(new Map() as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);
    (
      collector as unknown as { _lastIntermediateFlushTime: Date }
    )._lastIntermediateFlushTime = new Date(Date.now() - 10000);

    await collector._collectStats(true);

    expect(flushSpy).toHaveBeenCalledTimes(1);
  });
});

describe('CallReportCollector call report uploads', () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((callback: () => void) => {
        callback();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as unknown as { fetch?: typeof fetch }).fetch;
    }
    jest.restoreAllMocks();
  });

  const payload = {
    summary: {
      callId: 'call-id',
      direction: 'outbound' as const,
      state: 'hangup',
      startTimestamp: '2026-05-14T15:07:52.000Z',
      endTimestamp: '2026-05-14T15:12:37.000Z',
    },
    stats: [],
  };

  it('retries non-2xx responses so proxy forwarding failures are not silently accepted', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: () => Promise.resolve('forward failed'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        text: () => Promise.resolve(''),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const collector = createCollector();
    await collector._sendPayload(
      payload,
      'call-report-id',
      'wss://rtc.telnyx.com',
      'voice-sdk-id'
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries network failures and eventually succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('ERR_SOCKET_NOT_CONNECTED'))
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        text: () => Promise.resolve(''),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const collector = createCollector();
    await collector._sendPayload(
      payload,
      'call-report-id',
      'wss://rtc.telnyx.com',
      'voice-sdk-id'
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws and logs after exhausting upload retries', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve('forward failed'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const collector = createCollector();
    await expect(
      collector._sendPayload(
        payload,
        'call-report-id',
        'wss://rtc.telnyx.com',
        'voice-sdk-id'
      )
    ).rejects.toThrow('Call report POST failed with status 502');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(errorSpy).toHaveBeenCalledWith(
      'CallReportCollector: Exhausted retries posting final report',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('uses keepalive for small final reports during BYE/disconnect shutdown', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: () => Promise.resolve(''),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const collector = createCollector();
    await collector._sendPayload(
      payload,
      'call-report-id',
      'wss://rtc.telnyx.com',
      'voice-sdk-id'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://rtc.telnyx.com/call_report',
      expect.objectContaining({ keepalive: true })
    );
  });

  it('does not use keepalive for intermediate reports during active calls', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: () => Promise.resolve(''),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const collector = createCollector();
    await collector.sendPayload(
      { ...payload, segment: 0 },
      'call-report-id',
      'wss://rtc.telnyx.com',
      'voice-sdk-id'
    );

    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('keepalive');
  });
});

describe('CallReportCollector media-playout stats', () => {
  it('collects playout delay and synthesized sample indicators from media-playout stats', async () => {
    const stats = new Map<string, unknown>([
      [
        'outbound_audio',
        {
          id: 'outbound_audio',
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsSent: 100,
          bytesSent: 4800,
        },
      ],
      [
        'MP_audio',
        {
          id: 'MP_audio',
          type: 'media-playout',
          kind: 'audio',
          synthesizedSamples: 1500,
          synthesizedDuration: 0.03,
          totalPlayoutDelay: 0.12,
          totalSampleCount: 48000,
        },
      ],
    ]);
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    expect(
      (collector as unknown as CallReportCollector).getStatsBuffer()[0]
    ).toEqual(
      expect.objectContaining({
        mediaPlayout: {
          synthesizedSamples: 1500,
          synthesizedDuration: 0.03,
          totalPlayoutDelay: 0.12,
          totalSampleCount: 48000,
        },
      })
    );
  });

  it('omits mediaPlayout when no media-playout stat is present', async () => {
    const stats = new Map<string, unknown>([
      [
        'outbound_audio',
        {
          id: 'outbound_audio',
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsSent: 100,
          bytesSent: 4800,
        },
      ],
    ]);
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    const entry = (
      collector as unknown as CallReportCollector
    ).getStatsBuffer()[0];
    expect(entry).toBeDefined();
    expect(entry.mediaPlayout).toBeUndefined();
  });
});

describe('CallReportCollector additional inbound RTP fields (VSDK-387)', () => {
  const buildInboundStats = (extra?: Record<string, unknown>) => {
    const inboundAudio = {
      id: 'inbound-audio',
      type: 'inbound-rtp',
      kind: 'audio',
      mediaType: 'audio',
      packetsReceived: 100,
      bytesReceived: 4800,
      packetsLost: 1,
      packetsDiscarded: 0,
      jitterBufferDelay: 0.1,
      jitterBufferEmittedCount: 100,
      totalSamplesReceived: 48000,
      concealedSamples: 50,
      concealmentEvents: 5,
      ...extra,
    };
    return inboundAudio;
  };

  const buildOutboundStats = () => ({
    id: 'outbound-audio',
    type: 'outbound-rtp',
    kind: 'audio',
    mediaType: 'audio',
    packetsSent: 100,
    bytesSent: 4800,
  });

  const runCollect = async (
    inboundAudio: Record<string, unknown>
  ): Promise<IStatsInterval> => {
    const stats = new Map<string, unknown>([
      ['inbound-audio', inboundAudio],
      ['outbound-audio', buildOutboundStats()],
    ]);
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    return (collector as unknown as CallReportCollector).getStatsBuffer()[0];
  };

  it('collects nack, header bytes, FEC, jitter-buffer, decode, and energy fields from inbound-rtp', async () => {
    const entry = await runCollect(
      buildInboundStats({
        nackCount: 5,
        headerBytesReceived: 1200,
        fecPacketsReceived: 10,
        fecPacketsDiscarded: 2,
        jitterBufferTargetDelay: 0.05,
        jitterBufferMinimumDelay: 0.02,
        totalSamplesDecoded: 48000,
        samplesDecodedWithSilence: 100,
        samplesDecodedWithConcealment: 200,
        totalAudioEnergy: 1.5,
        totalSamplesDuration: 1.0,
      })
    );

    expect(entry.audio?.inbound).toEqual(
      expect.objectContaining({
        // Existing fields still present
        packetsReceived: 100,
        bytesReceived: 4800,
        packetsLost: 1,
        packetsDiscarded: 0,
        jitterBufferDelay: 0.1,
        jitterBufferEmittedCount: 100,
        totalSamplesReceived: 48000,
        concealedSamples: 50,
        concealmentEvents: 5,
        // New inbound RTP fields
        nackCount: 5,
        headerBytesReceived: 1200,
        fecPacketsReceived: 10,
        fecPacketsDiscarded: 2,
        jitterBufferTargetDelay: 0.05,
        jitterBufferMinimumDelay: 0.02,
        totalSamplesDecoded: 48000,
        samplesDecodedWithSilence: 100,
        samplesDecodedWithConcealment: 200,
        totalAudioEnergy: 1.5,
        totalSamplesDuration: 1.0,
      })
    );
  });

  it('omits the additional inbound fields when not reported by getStats', async () => {
    const entry = await runCollect(buildInboundStats());

    const inbound = entry.audio?.inbound;
    expect(inbound).toEqual(
      expect.objectContaining({
        packetsReceived: 100,
        bytesReceived: 4800,
      })
    );
    // New optional fields should NOT be present when undefined
    expect(inbound).not.toHaveProperty('nackCount');
    expect(inbound).not.toHaveProperty('headerBytesReceived');
    expect(inbound).not.toHaveProperty('fecPacketsReceived');
    expect(inbound).not.toHaveProperty('fecPacketsDiscarded');
    expect(inbound).not.toHaveProperty('jitterBufferTargetDelay');
    expect(inbound).not.toHaveProperty('jitterBufferMinimumDelay');
    expect(inbound).not.toHaveProperty('totalSamplesDecoded');
    expect(inbound).not.toHaveProperty('samplesDecodedWithSilence');
    expect(inbound).not.toHaveProperty('samplesDecodedWithConcealment');
    expect(inbound).not.toHaveProperty('totalAudioEnergy');
    expect(inbound).not.toHaveProperty('totalSamplesDuration');
  });
});

describe('CallReportCollector remote RTCP stats', () => {
  // Helper: wire up a collector with the given RTCStatsReport and run one
  // final (isFinal=true) collection so a single stats entry lands in the
  // buffer regardless of how short the interval is.
  const collectOnce = async (
    stats: RTCStatsReport
  ): Promise<IStatsInterval> => {
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    const buffer = (collector as unknown as CallReportCollector).getStatsBuffer();
    expect(buffer).toHaveLength(1);
    return buffer[0];
  };

  it('parses remote-inbound-rtp and remote-outbound-rtp audio stats into remoteRtcp', async () => {
    const stats = new Map<string, unknown>([
      [
        'OB_audio',
        {
          id: 'OB_audio',
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsSent: 1000,
          bytesSent: 48000,
        },
      ],
      [
        'RIB_audio',
        {
          id: 'RIB_audio',
          type: 'remote-inbound-rtp',
          kind: 'audio',
          // NOTE: no mediaType field on remote RTCP reports.
          jitter: 0.02, // seconds -> ~20ms
          packetsLost: 3,
          packetsReceived: 997,
          fractionLost: 0.01,
          roundTripTime: 0.15, // seconds — media-path RTT
          totalRoundTripTime: 1.5,
          roundTripTimeMeasurements: 10,
          nackCount: 2,
          reportsReceived: 10,
          packetsDiscarded: 1,
          localId: 'OB_audio',
        },
      ],
      [
        'ROB_audio',
        {
          id: 'ROB_audio',
          type: 'remote-outbound-rtp',
          kind: 'audio',
          packetsSent: 500,
          bytesSent: 24000,
          reportsCount: 10,
          roundTripTime: 0.12,
          totalPacketSendDelay: 1.2,
          localId: 'IB_audio',
          remoteId: 'RIB_audio',
        },
      ],
    ]) as unknown as RTCStatsReport;

    const entry = await collectOnce(stats);

    // remote-inbound-rtp -> remoteRtcp.inbound (outbound quality as seen by
    // the remote peer). jitter converted to ms; roundTripTimeAvg derived
    // from totalRoundTripTime / roundTripTimeMeasurements.
    expect(entry.remoteRtcp?.inbound).toEqual(
      expect.objectContaining({
        packetsLost: 3,
        packetsReceived: 997,
        fractionLost: 0.01,
        roundTripTime: 0.15,
        totalRoundTripTime: 1.5,
        roundTripTimeMeasurements: 10,
        nackCount: 2,
        reportsReceived: 10,
        packetsDiscarded: 1,
      })
    );
    expect(entry.remoteRtcp?.inbound?.jitter).toBeCloseTo(20, 5);
    expect(entry.remoteRtcp?.inbound?.roundTripTimeAvg).toBeCloseTo(0.15, 5);

    // remote-outbound-rtp -> remoteRtcp.outbound (remote Sender Report).
    expect(entry.remoteRtcp?.outbound).toEqual(
      expect.objectContaining({
        packetsSent: 500,
        bytesSent: 24000,
        reportsCount: 10,
      })
    );
  });

  it('omits roundTripTimeAvg when roundTripTimeMeasurements is missing or zero', async () => {
    const stats = new Map<string, unknown>([
      [
        'RIB_audio',
        {
          id: 'RIB_audio',
          type: 'remote-inbound-rtp',
          kind: 'audio',
          jitter: 0.03,
          roundTripTime: 0.2,
          totalRoundTripTime: 0.6,
          // roundTripTimeMeasurements intentionally absent.
        },
      ],
    ]) as unknown as RTCStatsReport;

    const entry = await collectOnce(stats);

    expect(entry.remoteRtcp?.inbound).toBeDefined();
    expect(entry.remoteRtcp?.inbound?.roundTripTimeAvg).toBeUndefined();
    // Other passthrough fields are still captured.
    expect(entry.remoteRtcp?.inbound?.roundTripTime).toBe(0.2);
    expect(entry.remoteRtcp?.inbound?.totalRoundTripTime).toBe(0.6);
    // No remote-outbound-rtp in this report -> outbound block absent.
    expect(entry.remoteRtcp?.outbound).toBeUndefined();
  });

  it('does not set remoteRtcp when no remote RTCP reports are present', async () => {
    const stats = new Map<string, unknown>([
      [
        'OB_audio',
        {
          id: 'OB_audio',
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          packetsSent: 1,
          bytesSent: 48,
        },
      ],
    ]) as unknown as RTCStatsReport;

    const entry = await collectOnce(stats);

    expect(entry.remoteRtcp).toBeUndefined();
  });
});

describe('CallReportCollector codec identity collection', () => {
  it('collects codec identity for outbound and inbound audio from getStats', async () => {
    const codecStat = {
      id: 'C_audio',
      type: 'codec',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
      payloadType: 111,
      sdpFmtpLine: 'minptime=10;useinbandfec=1',
    };
    const stats = new Map<string, unknown>([
      [
        'OB_audio',
        {
          id: 'OB_audio',
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          ssrc: 1111,
          codecId: 'C_audio',
          packetsSent: 100,
          bytesSent: 4800,
        },
      ],
      [
        'IB_audio',
        {
          id: 'IB_audio',
          type: 'inbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          ssrc: 2222,
          codecId: 'C_audio',
          packetsReceived: 90,
          bytesReceived: 4320,
        },
      ],
      ['C_audio', codecStat],
    ]);
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    const entry = (
      collector as unknown as CallReportCollector
    ).getStatsBuffer()[0];
    expect(entry.audio?.outbound?.codec).toEqual(
      expect.objectContaining({
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        payloadType: 111,
        codecId: 'C_audio',
      })
    );
    expect(entry.audio?.outbound?.codec?.sdpFmtpLine).toBeTruthy();
    expect(entry.audio?.inbound?.codec).toEqual(
      expect.objectContaining({
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        payloadType: 111,
        codecId: 'C_audio',
      })
    );
    expect(entry.audio?.inbound?.codec?.sdpFmtpLine).toBeTruthy();
  });

  it('omits codec identity when the rtp stream has no codecId', async () => {
    const stats = new Map<string, unknown>([
      [
        'OB_audio',
        {
          id: 'OB_audio',
          type: 'outbound-rtp',
          kind: 'audio',
          mediaType: 'audio',
          ssrc: 1111,
          packetsSent: 100,
          bytesSent: 4800,
        },
      ],
    ]);
    const collector = createCollector();
    collector.peerConnection = {
      getStats: jest.fn().mockResolvedValue(stats as unknown as RTCStatsReport),
      getSenders: () => [],
    };
    (collector as unknown as { intervalStartTime: Date }).intervalStartTime =
      new Date(Date.now() - 5000);

    await collector._collectStats(true);

    const entry = (
      collector as unknown as CallReportCollector
    ).getStatsBuffer()[0];
    expect(entry.audio?.outbound?.codec).toBeUndefined();
  });

  it('resolves a codec stat by id and validates its type', () => {
    const collector = createCollector();
    const stats = new Map<string, unknown>([
      ['C_audio', { id: 'C_audio', type: 'codec', mimeType: 'audio/opus' }],
      ['not-a-codec', { id: 'not-a-codec', type: 'transport' }],
    ]) as unknown as RTCStatsReport;

    expect(collector._getCodec(stats, 'C_audio')).toEqual(
      expect.objectContaining({ mimeType: 'audio/opus', type: 'codec' })
    );
    expect(collector._getCodec(stats, 'not-a-codec')).toBeUndefined();
    expect(collector._getCodec(stats, undefined)).toBeUndefined();
    expect(collector._getCodec(stats, 'missing')).toBeUndefined();
  });
});
