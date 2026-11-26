/**
 * Measures the level of the local (sending) audio track with Web Audio, for
 * browsers whose `media-source` stats carry no `audioLevel` /
 * `totalAudioEnergy` (Firefox: the stat exists but only has `id`, `kind`,
 * `trackIdentifier`).
 *
 * The numbers are shaped to match what Chrome reports on `media-source`, so
 * call reports read the same whatever the browser:
 *
 * - `level()` is the peak |sample| over the last window (~100 ms). libwebrtc
 *   computes `media-source.audioLevel` as the max absolute sample held over
 *   ~11 ten-millisecond frames (`audio/audio_level.cc`), not an RMS; an RMS
 *   would read 10–14 dB lower for speech and trip the SDK's low-local-audio
 *   threshold differently.
 * - `totalAudioEnergy()` / `totalSamplesDuration()` accumulate Σ(rms² × dt),
 *   which is what the spec and libwebrtc put in `totalAudioEnergy`.
 *
 * The analyser is never connected to the destination, so nothing is played
 * out. `stop()` releases the AudioContext so the browser drops the mic.
 */

export interface AudioLevelSample {
  /** Peak absolute sample in the window, 0..1. */
  peak: number;
  /** Mean of the squared samples in the window, 0..1. */
  meanSquare: number;
}

type AnalyserLike = {
  fftSize: number;
  getFloatTimeDomainData(array: Float32Array): void;
};

type AudioContextLike = {
  sampleRate?: number;
  state?: string;
  createMediaStreamSource(stream: MediaStream): {
    connect(node: unknown): unknown;
    disconnect(): void;
  };
  createAnalyser(): AnalyserLike;
  resume?: () => Promise<void>;
  close?: () => Promise<void>;
};

type AudioContextCtor = new () => AudioContextLike;

export class LocalAudioLevelMeter {
  /** Chrome refreshes its peak-hold value about every 110 ms. */
  public static readonly WINDOW_MS = 100;
  /** 4096 samples ≈ 85 ms at 48 kHz: most of each window is observed. */
  public static readonly FFT_SIZE = 4096;

  private readonly analyser: AnalyserLike;
  private readonly source: {
    connect(node: unknown): unknown;
    disconnect(): void;
  };
  private readonly buffer: Float32Array;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickMs: number;
  private currentLevel: number | null = null;
  private energy = 0;
  private duration = 0;
  private stopped = false;

  /**
   * Returns `null` where Web Audio is unavailable (no `AudioContext`, no
   * `MediaStream`), so callers can fall back to reporting nothing.
   */
  public static create(
    track: MediaStreamTrack,
    scope: Record<string, unknown> = globalThis as unknown as Record<
      string,
      unknown
    >
  ): LocalAudioLevelMeter | null {
    const Ctx = (scope.AudioContext || scope.webkitAudioContext) as
      | AudioContextCtor
      | undefined;
    const Stream = scope.MediaStream as
      | (new (tracks: MediaStreamTrack[]) => MediaStream)
      | undefined;
    if (!Ctx || !Stream) {
      return null;
    }
    return new LocalAudioLevelMeter(track, new Ctx(), new Stream([track]));
  }

  constructor(
    public readonly track: MediaStreamTrack,
    private readonly context: AudioContextLike,
    stream: MediaStream,
    private readonly now: () => number = () => Date.now()
  ) {
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = LocalAudioLevelMeter.FFT_SIZE;
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.source = context.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    // Autoplay policy can leave a fresh context suspended; the analyser then
    // reads zeros forever. Resume is a no-op when already running.
    context.resume?.().catch(() => undefined);
    this.lastTickMs = this.now();
    this.timer = setInterval(() => this.tick(), LocalAudioLevelMeter.WINDOW_MS);
  }

  /** Peak level of the last window, 0..1; `null` before the first window. */
  public level(): number | null {
    return this.currentLevel;
  }

  /** Σ(rms² × seconds) since the meter started — the `totalAudioEnergy` shape. */
  public totalAudioEnergy(): number {
    return this.energy;
  }

  /** Seconds of audio measured — the `totalSamplesDuration` shape. */
  public totalSamplesDuration(): number {
    return this.duration;
  }

  public isStopped(): boolean {
    return this.stopped;
  }

  /** Reads one window of samples and folds it into the level and energy. */
  public tick(): AudioLevelSample | null {
    if (this.stopped) {
      return null;
    }
    const nowMs = this.now();
    const dt = Math.max(0, (nowMs - this.lastTickMs) / 1000);
    this.lastTickMs = nowMs;
    let sample: AudioLevelSample;
    try {
      this.analyser.getFloatTimeDomainData(this.buffer);
      sample = LocalAudioLevelMeter.measure(this.buffer);
    } catch {
      return null;
    }
    // A disabled (muted) track feeds silence, which correctly reads as 0.
    this.currentLevel = sample.peak;
    this.energy += sample.meanSquare * dt;
    this.duration += dt;
    return sample;
  }

  public stop(): void {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    try {
      this.source.disconnect();
    } catch {
      // already gone
    }
    this.context.close?.().catch(() => undefined);
  }

  /** Peak and mean-square of a block of float samples, both clamped to 0..1. */
  public static measure(samples: Float32Array): AudioLevelSample {
    let peak = 0;
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
      sumSquares += v * v;
    }
    const n = samples.length || 1;
    return {
      peak: Math.min(1, peak),
      meanSquare: Math.min(1, sumSquares / n),
    };
  }
}
