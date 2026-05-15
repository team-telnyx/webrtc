import logger from '../../util/logger';
import {
  CallReportCollector,
  ILocalAudioSourceStats,
  ILocalAudioTrackSnapshot,
} from '../../webrtc/CallReportCollector';

type TestableCallReportCollector = {
  peerConnection: {
    getSenders: () => Array<{
      track?: Partial<MediaStreamTrack> & {
        kind?: string;
        contentHint?: string;
        getSettings?: () => Partial<MediaTrackSettings>;
      };
    }>;
  } | null;
  cleanup: () => void;
  _withoutUndefined: <T extends Record<string, unknown>>(obj: T) => T;
  _getLocalAudioTrackSnapshot: () => ILocalAudioTrackSnapshot | undefined;
  _getOutboundAudioSourceStats: (
    stats: RTCStatsReport,
    outboundAudio: RTCOutboundRtpStreamStats & { mediaSourceId?: string }
  ) => ILocalAudioSourceStats | undefined;
  _logLocalAudioTrackSnapshot: (
    localAudioTrack?: ILocalAudioTrackSnapshot,
    localAudioSource?: ILocalAudioSourceStats
  ) => void;
};

const createCollector = (): TestableCallReportCollector =>
  new CallReportCollector({
    enabled: true,
    interval: 5000,
  }) as unknown as TestableCallReportCollector;

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

  it('does not slow down collection if the configured initial interval is longer than the default interval', () => {
    const collector = new CallReportCollector({
      enabled: true,
      interval: 2000,
      initialInterval: 5000,
      initialDuration: 10000,
    });
    const testable = collector as unknown as {
      callStartTime: Date;
      _collectionIntervalFor: (intervalStartTime: Date) => number;
    };

    expect(testable._collectionIntervalFor(testable.callStartTime)).toEqual(
      2000
    );
  });

  it('collects a final stats interval for calls shorter than the current cadence interval', async () => {
    jest.useFakeTimers();

    const collector = new CallReportCollector({
      enabled: true,
      interval: 5000,
      initialInterval: 1000,
      initialDuration: 10000,
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
