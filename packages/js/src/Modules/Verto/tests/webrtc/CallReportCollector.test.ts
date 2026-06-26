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

  it('defaults to 1 second intervals during the first 10 seconds, then the default interval', () => {
    const collector = new CallReportCollector({
      enabled: true,
      interval: 5000,
    });
    const testable = collector as unknown as {
      callStartTime: Date;
      _collectionIntervalFor: (intervalStartTime: Date) => number;
    };
    const callStart = testable.callStartTime.getTime();

    expect(testable._collectionIntervalFor(new Date(callStart))).toEqual(1000);
    expect(testable._collectionIntervalFor(new Date(callStart + 9000))).toEqual(
      1000
    );
    expect(
      testable._collectionIntervalFor(new Date(callStart + 10000))
    ).toEqual(5000);
  });

  it('does not slow down collection if the configured default interval is shorter than the initial cadence', () => {
    const collector = new CallReportCollector({
      enabled: true,
      interval: 500,
    });
    const testable = collector as unknown as {
      callStartTime: Date;
      _collectionIntervalFor: (intervalStartTime: Date) => number;
    };

    expect(testable._collectionIntervalFor(testable.callStartTime)).toEqual(
      500
    );
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
