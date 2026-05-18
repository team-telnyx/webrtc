import logger from '../../util/logger';
import { LOW_LOCAL_AUDIO } from '../../util/constants/errorCodes';
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
      bytesSent: 1000,
      localTrack: {
        id: 'track-id',
        enabled: true,
        muted: false,
      },
    },
  },
});

describe('CallReportCollector intermediate reports', () => {
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
