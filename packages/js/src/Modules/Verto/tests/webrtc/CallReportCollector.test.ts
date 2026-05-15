import logger from '../../util/logger';
import {
  CallReportCollector,
  ILocalAudioSourceStats,
  ILocalAudioTrackSnapshot,
} from '../../webrtc/CallReportCollector';

type SendPayload = (
  payload: unknown,
  callReportId: string,
  host: string,
  voiceSdkId?: string
) => Promise<void>;

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
  _sendPayload: SendPayload;
};

const createCollector = (): TestableCallReportCollector =>
  new CallReportCollector({
    enabled: true,
    interval: 5000,
  }) as unknown as TestableCallReportCollector;

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
});
