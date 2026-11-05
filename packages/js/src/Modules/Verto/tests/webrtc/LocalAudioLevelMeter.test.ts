import { LocalAudioLevelMeter } from '../../webrtc/LocalAudioLevelMeter';
import { CallReportCollector } from '../../webrtc/CallReportCollector';

type FakeAnalyser = {
  fftSize: number;
  getFloatTimeDomainData: (array: Float32Array) => void;
};

/** A fake AudioContext whose analyser plays back the sample blocks we hand it. */
function fakeContext(blocks: Float32Array[]) {
  let index = 0;
  const analyser: FakeAnalyser = {
    fftSize: 0,
    getFloatTimeDomainData: (array: Float32Array) => {
      const block = blocks[Math.min(index, blocks.length - 1)];
      index += 1;
      array.fill(0);
      array.set(block.subarray(0, array.length));
    },
  };
  const source = { connect: jest.fn(), disconnect: jest.fn() };
  const context = {
    sampleRate: 48000,
    state: 'running',
    createAnalyser: () => analyser,
    createMediaStreamSource: jest.fn(() => source),
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  };
  return { context, analyser, source };
}

const block = (values: number[]) => Float32Array.from(values);
const track = {
  kind: 'audio',
  id: 't1',
  enabled: true,
} as unknown as MediaStreamTrack;

describe('LocalAudioLevelMeter', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('measure', () => {
    it('returns the peak |sample| and the mean square, clamped to 0..1', () => {
      const m = LocalAudioLevelMeter.measure(block([0.5, -0.25, 0.1]));
      expect(m.peak).toBeCloseTo(0.5, 6);
      expect(m.meanSquare).toBeCloseTo((0.25 + 0.0625 + 0.01) / 3, 6);
      expect(LocalAudioLevelMeter.measure(block([2, -3]))).toEqual({
        peak: 1,
        meanSquare: 1,
      });
      expect(LocalAudioLevelMeter.measure(block([]))).toEqual({
        peak: 0,
        meanSquare: 0,
      });
    });
  });

  it('reports the peak of the last window and accumulates energy over time', () => {
    jest.useFakeTimers();
    let now = 1_000;
    const { context } = fakeContext([
      block([0.2, -0.4, 0.1]),
      block([0.05, 0.05]),
      block([0, 0, 0]),
    ]);
    const meter = new LocalAudioLevelMeter(
      track,
      context as never,
      {} as MediaStream,
      () => now
    );
    expect(meter.level()).toBeNull();

    now += 100;
    const first = meter.tick();
    expect(first?.peak).toBeCloseTo(0.4, 6);
    // the fake analyser pads the block to FFT_SIZE samples with zeros
    const n = LocalAudioLevelMeter.FFT_SIZE;
    expect(first?.meanSquare).toBeCloseTo((0.04 + 0.16 + 0.01) / n, 9);
    expect(meter.level()).toBeCloseTo(0.4, 6);
    expect(meter.totalSamplesDuration()).toBeCloseTo(0.1);
    expect(meter.totalAudioEnergy()).toBeCloseTo(
      ((0.04 + 0.16 + 0.01) / n) * 0.1,
      9
    );

    now += 100;
    meter.tick();
    expect(meter.level()).toBeCloseTo(0.05, 6); // peak-hold is per window, not a running max
    now += 100;
    meter.tick();
    expect(meter.level()).toBe(0); // a muted/disabled track feeds zeros
    expect(meter.totalSamplesDuration()).toBeCloseTo(0.3);
    meter.stop();
  });

  it('ticks on its own timer and stops cleanly', () => {
    jest.useFakeTimers();
    const { context, source } = fakeContext([block([0.3])]);
    const meter = new LocalAudioLevelMeter(
      track,
      context as never,
      {} as MediaStream
    );
    expect(context.createMediaStreamSource).toHaveBeenCalledTimes(1);
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(LocalAudioLevelMeter.WINDOW_MS);
    expect(meter.level()).toBeCloseTo(0.3, 6);

    meter.stop();
    expect(meter.isStopped()).toBe(true);
    expect(source.disconnect).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(meter.tick()).toBeNull();
    jest.advanceTimersByTime(LocalAudioLevelMeter.WINDOW_MS * 5);
    expect(meter.level()).toBeCloseTo(0.3, 6); // no more updates after stop
    meter.stop(); // idempotent
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it('create() returns null where Web Audio is unavailable', () => {
    expect(LocalAudioLevelMeter.create(track, {})).toBeNull();
    expect(
      LocalAudioLevelMeter.create(track, { AudioContext: class {} })
    ).toBeNull();
  });

  it('create() builds the meter from the scope’s AudioContext and MediaStream', () => {
    jest.useFakeTimers();
    const { context } = fakeContext([block([0.6])]);
    const scope = {
      AudioContext: jest.fn(() => context),
      MediaStream: jest.fn(function (
        this: unknown,
        tracks: MediaStreamTrack[]
      ) {
        return { tracks };
      }),
    };
    const meter = LocalAudioLevelMeter.create(track, scope as never);
    expect(meter).not.toBeNull();
    expect(scope.MediaStream).toHaveBeenCalledWith([track]);
    jest.advanceTimersByTime(LocalAudioLevelMeter.WINDOW_MS);
    expect(meter?.level()).toBeCloseTo(0.6, 6);
    meter?.stop();
  });
});

describe('CallReportCollector outbound level source', () => {
  type Testable = {
    _getOutboundAudioLevel: (
      stats: RTCStatsReport,
      outbound: RTCOutboundRtpStreamStats & { mediaSourceId?: string }
    ) => number | null;
    _withLocalMeterEnergy: (
      source?: Record<string, unknown>
    ) => Record<string, unknown> | undefined;
    localLevelMeter: LocalAudioLevelMeter | null;
    localLevelMeterUnavailable: boolean;
    outboundLevelSource: string | null;
    peerConnection: unknown;
    _stopped: boolean;
  };

  const outbound = {
    type: 'outbound-rtp',
    id: 'out',
    mediaSourceId: 'src',
  } as RTCOutboundRtpStreamStats & { mediaSourceId?: string };

  const statsWith = (mediaSource: Record<string, unknown>) =>
    new Map<string, unknown>([
      ['src', { type: 'media-source', kind: 'audio', ...mediaSource }],
    ]) as unknown as RTCStatsReport;

  const collector = () =>
    new CallReportCollector({
      enabled: true,
      interval: 5000,
    }) as unknown as Testable;

  afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as Record<string, unknown>).AudioContext;
    delete (globalThis as Record<string, unknown>).MediaStream;
  });

  it('uses the media-source level on browsers that report it and never starts a meter', () => {
    const c = collector();
    c.peerConnection = { getSenders: () => [{ track }] };
    expect(
      c._getOutboundAudioLevel(statsWith({ audioLevel: 0.42 }), outbound)
    ).toBe(0.42);
    expect(c.outboundLevelSource).toBe('media-source');
    expect(c.localLevelMeter).toBeNull();
  });

  it('does not start a meter when the browser reports energy counters without a level', () => {
    const c = collector();
    c.peerConnection = { getSenders: () => [{ track }] };
    const first = statsWith({ totalAudioEnergy: 1, totalSamplesDuration: 10 });
    expect(c._getOutboundAudioLevel(first, outbound)).toBeNull(); // first sample: no delta yet
    expect(c.localLevelMeter).toBeNull();
    const second = statsWith({
      totalAudioEnergy: 1.09,
      totalSamplesDuration: 11,
    });
    expect(c._getOutboundAudioLevel(second, outbound)).toBeCloseTo(0.3);
    expect(c.outboundLevelSource).toBe('media-source');
  });

  it('measures the sending track itself when the media-source stat carries no level (Firefox)', () => {
    jest.useFakeTimers();
    const { context } = fakeContext([block([0.25, -0.5])]);
    (globalThis as Record<string, unknown>).AudioContext = jest.fn(
      () => context
    );
    (globalThis as Record<string, unknown>).MediaStream = jest.fn(() => ({}));
    const c = collector();
    c.peerConnection = { getSenders: () => [{ track }] };

    const firefox = statsWith({ trackIdentifier: '{t1}' });
    // First sample starts the meter; no window has been read yet.
    expect(c._getOutboundAudioLevel(firefox, outbound)).toBeNull();
    expect(c.localLevelMeter).not.toBeNull();
    expect(c.outboundLevelSource).toBeNull();

    jest.advanceTimersByTime(LocalAudioLevelMeter.WINDOW_MS);
    expect(c._getOutboundAudioLevel(firefox, outbound)).toBeCloseTo(0.5, 6);
    expect(c.outboundLevelSource).toBe('analyser');

    // The interval's media-source snapshot gains the meter's energy counters.
    const source = c._withLocalMeterEnergy({
      id: 'src',
      trackIdentifier: '{t1}',
    });
    expect(source).toMatchObject({ id: 'src', trackIdentifier: '{t1}' });
    expect(typeof source?.totalSamplesDuration).toBe('number');
    expect(typeof source?.totalAudioEnergy).toBe('number');
    expect(source?.totalSamplesDuration).toBeGreaterThanOrEqual(0);

    // Browser-provided counters are never overwritten.
    expect(c._withLocalMeterEnergy({ totalAudioEnergy: 3 })).toEqual({
      totalAudioEnergy: 3,
    });
  });

  it('gives up quietly where Web Audio is missing and keeps the field absent', () => {
    const c = collector();
    c.peerConnection = { getSenders: () => [{ track }] };
    expect(c._getOutboundAudioLevel(statsWith({}), outbound)).toBeNull();
    expect(c.localLevelMeter).toBeNull();
    expect(c.localLevelMeterUnavailable).toBe(true);
    expect(c.outboundLevelSource).toBeNull();
    // and does not retry on every sample
    expect(c._getOutboundAudioLevel(statsWith({}), outbound)).toBeNull();
  });

  it('tears the meter down on stop() and cleanup()', async () => {
    jest.useFakeTimers();
    const { context } = fakeContext([block([0.1])]);
    (globalThis as Record<string, unknown>).AudioContext = jest.fn(
      () => context
    );
    (globalThis as Record<string, unknown>).MediaStream = jest.fn(() => ({}));
    const real = new CallReportCollector({ enabled: true, interval: 5000 });
    const c = real as unknown as Testable;
    c.peerConnection = {
      getSenders: () => [{ track }],
      getStats: jest.fn().mockResolvedValue(new Map()),
    };
    c._getOutboundAudioLevel(statsWith({}), outbound);
    const meter = c.localLevelMeter as LocalAudioLevelMeter;
    expect(meter).not.toBeNull();
    real.cleanup();
    expect(meter.isStopped()).toBe(true);
    expect(c.localLevelMeter).toBeNull();
    expect(context.close).toHaveBeenCalledTimes(1);
  });
});
