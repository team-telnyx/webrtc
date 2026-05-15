import logger from '../../util/logger';
import { LOW_LOCAL_AUDIO } from '../../util/constants/errorCodes';
import type { ITelnyxWarning } from '../../util/constants/warnings';
import {
  CallReportCollector,
  type ILocalAudioSourceStats,
  type ILocalAudioTrackSnapshot,
  type IStatsInterval,
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

describe('CallReportCollector local audio diagnostics', () => {
  afterEach(() => {
    jest.restoreAllMocks();
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
