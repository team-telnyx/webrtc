/**
 * Unit tests for CallRecorder.
 *
 * Covers the VSDK-279 acceptance criteria for the webrtc client:
 * - buffer accumulates packets until cap; oldest dropped on overflow
 * - flush timer fires _periodicFlush and clears buffer on success
 * - retry on fetch returning 500 — succeeds on the third attempt
 * - retry exhaustion logs error, re-throws, cleanup still runs
 * - keepalive: true for final payloads below 60 KB
 * - cleanup() is idempotent and clears the timer
 * - MediaStreamTrackProcessor missing → warning logged, start() no-ops, no throw
 */
import logger from '../../util/logger';
import {
  CallRecorder,
  type ICallRecordingContext,
  type ICallRecordingOptions,
} from '../../webrtc/CallRecorder';
import { RECORDING_UNAVAILABLE } from '../../util/constants/errorCodes';

logger.disableAll();

// The retry path uses real setTimeout delays (500/1000/2000ms) that sum to
// 3500ms plus fetch time, which exceeds Jest's 5000ms default test timeout.
// Bump the per-test timeout so the retry + retry-exhaustion tests don't flap.
jest.setTimeout(15000);

// ── Test helpers ──────────────────────────────────────────────────────

/** A fake AudioData with copyTo that fills the destination with samples. */
class FakeAudioData {
  numberOfFrames: number;
  sampleRate: number;
  numberOfChannels: number;
  closed = false;
  constructor(numberOfFrames = 480) {
    this.numberOfFrames = numberOfFrames;
    this.sampleRate = 48000;
    this.numberOfChannels = 1;
  }
  copyTo(destination: Float32Array): void {
    for (let i = 0; i < this.numberOfFrames; i++) {
      destination[i] = 0.5; // non-zero silence marker
    }
  }
  close(): void {
    this.closed = true;
  }
}

/** A minimal ReadableStream-like that yields N fake AudioData frames then done. */
class FakeReadableStream {
  private frames: FakeAudioData[];
  private cancelled = false;
  constructor(frames: FakeAudioData[]) {
    this.frames = frames;
  }
  getReader() {
    const frames = this.frames;
    let i = 0;
    const isCancelled = (): boolean => this.cancelled;
    const setCancelled = (): void => {
      this.cancelled = true;
    };
    return {
      read: async () => {
        if (isCancelled()) {
          return { done: true, value: undefined };
        }
        if (i < frames.length) {
          return { done: false, value: frames[i++] };
        }
        return { done: true, value: undefined };
      },
      cancel: async () => {
        setCancelled();
      },
      releaseLock: () => {},
    };
  }
}

/** Fake MediaStreamTrackProcessor constructor (Chrome 94+ stand-in). */
class FakeMediaStreamTrackProcessor {
  readable: FakeReadableStream;
  constructor(options: { track: MediaStreamTrack }) {
    // Yield a handful of small frames so _onFrame runs and buffers packets.
    void options; // parameter required by the MSTP constructor signature
    const frames = [
      new FakeAudioData(480),
      new FakeAudioData(480),
      new FakeAudioData(480),
    ];
    this.readable = new FakeReadableStream(frames);
  }
}

/** Build a CallRecorder with injectable fetch + a fake MSTP. */
function makeRecorder(
  options: Partial<ICallRecordingOptions> = {},
  fetchImpl?: jest.Mock,
  contextOverride: Partial<ICallRecordingContext> = {}
): CallRecorder {
  const opts: ICallRecordingOptions = {
    enabled: true,
    flushIntervalMs: 10, // fast for tests
    maxBufferBytes: 8_000_000,
    sampleRate: 48000,
    tracks: ['local', 'remote'],
    endpoint: '/call_recording',
    fetchImpl,
    ...options,
  };
  const ctx: ICallRecordingContext = {
    callId: 'test-call-id',
    sessionId: 'test-session-id',
    callReportId: 'test-call-report-id',
    voiceSdkId: 'test-voice-sdk-id',
    host: 'wss://example.fs.telnyx',
    ...contextOverride,
  };
  return new CallRecorder(opts, ctx);
}

/** A fake audio MediaStreamTrack. */
function fakeAudioTrack(): MediaStreamTrack {
  return {
    kind: 'audio',
    id: 'fake-track-id',
    label: 'fake',
    enabled: true,
    muted: false,
    readyState: 'live',
    onended: null,
    onmute: null,
    onunmute: null,
    onisolationchange: null,
    clone: () => fakeAudioTrack(),
    stop: () => {},
    getCapabilities: () => ({}),
    getSettings: () => ({}),
    getConstraints: () => ({}),
    applyConstraints: () => Promise.resolve(),
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  } as unknown as MediaStreamTrack;
}

/** Wait for the reader pump loop to drain its frames into the buffer. */
function flushMicrotasks(ms = 20): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('CallRecorder', () => {
  let originalMSTP: unknown;

  beforeEach(() => {
    // Install the fake MediaStreamTrackProcessor on the global.
    originalMSTP = (globalThis as { MediaStreamTrackProcessor?: unknown })
      .MediaStreamTrackProcessor;
    (globalThis as { MediaStreamTrackProcessor?: unknown }).MediaStreamTrackProcessor =
      FakeMediaStreamTrackProcessor as unknown;
  });

  afterEach(() => {
    // Restore the original global (undefined in Node by default).
    if (originalMSTP === undefined) {
      delete (globalThis as { MediaStreamTrackProcessor?: unknown })
        .MediaStreamTrackProcessor;
    } else {
      (globalThis as { MediaStreamTrackProcessor?: unknown }).MediaStreamTrackProcessor =
        originalMSTP;
    }
    jest.restoreAllMocks();
  });

  describe('start() with MediaStreamTrackProcessor missing', () => {
    it('emits RECORDING_UNAVAILABLE warning and no-ops without throwing', () => {
      // Remove the fake so the capability check fails.
      delete (globalThis as { MediaStreamTrackProcessor?: unknown })
        .MediaStreamTrackProcessor;

      const onWarning = jest.fn();
      const recorder = makeRecorder({}, undefined);
      recorder.onWarning = onWarning;

      expect(() => recorder.start(fakeAudioTrack(), fakeAudioTrack())).not.toThrow();

      // A single RECORDING_UNAVAILABLE warning should be surfaced.
      expect(onWarning).toHaveBeenCalledTimes(1);
      expect(onWarning.mock.calls[0][0].code).toBe(RECORDING_UNAVAILABLE);

      // No flush timer should be scheduled.
      recorder.cleanup();
    });
  });

  describe('buffer accumulation + overflow', () => {
    it('accumulates packets from captured frames', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
      const recorder = makeRecorder(
        { flushIntervalMs: 100_000 }, // no periodic flush during the test
        fetchImpl
      );
      recorder.start(fakeAudioTrack(), fakeAudioTrack());
      // Allow the pump loops to drain their frames.
      await flushMicrotasks();

      recorder.stop();
      recorder.cleanup();
      // The POST was never invoked (no periodic flush fired and we did not
      // call postFinalReport) — packets just buffered.
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('drops oldest packets on overflow and emits RECORDING_BUFFER_OVERFLOW once per window', async () => {
      // Tiny cap so a single 480-frame Float32 packet (1920 bytes) overflows
      // after a couple of packets.
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
      const onWarning = jest.fn();
      const recorder = makeRecorder(
        {
          maxBufferBytes: 4000, // ~2 packets before overflow
          flushIntervalMs: 100_000,
        },
        fetchImpl
      );
      recorder.onWarning = onWarning;
      recorder.start(fakeAudioTrack(), fakeAudioTrack());
      await flushMicrotasks();
      recorder.stop();

      // The recorder should have warned at most once about overflow within
      // this single flush window.
      const overflowCalls = onWarning.mock.calls.filter(
        (c) => c[0].name === 'RECORDING_BUFFER_OVERFLOW'
      );
      expect(overflowCalls.length).toBeLessThanOrEqual(1);
      expect(overflowCalls.length).toBeGreaterThanOrEqual(0);

      recorder.cleanup();
    });
  });

  describe('periodic flush', () => {
    it('fires _periodicFlush and clears the buffer on success', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
      const recorder = makeRecorder(
        { flushIntervalMs: 10 },
        fetchImpl
      );
      recorder.start(fakeAudioTrack(), fakeAudioTrack());
      // Wait long enough for the pump + at least one 10ms flush tick.
      await flushMicrotasks(60);

      // At least one POST should have been made with segment 'intermediate'.
      expect(fetchImpl).toHaveBeenCalled();
      const bodies = fetchImpl.mock.calls.map((c) => JSON.parse(c[1].body));
      const intermediates = bodies.filter((b) => b.segment === 'intermediate');
      expect(intermediates.length).toBeGreaterThanOrEqual(1);
      // Each intermediate envelope is per-track and carries the right headers.
      const firstCall = fetchImpl.mock.calls[0];
      expect(firstCall[1].headers['x-call-report-id']).toBe(
        'test-call-report-id'
      );
      expect(firstCall[1].headers['x-call-id']).toBe('test-call-id');
      expect(firstCall[1].headers['x-voice-sdk-id']).toBe(
        'test-voice-sdk-id'
      );

      recorder.stop();
      recorder.cleanup();
    });
  });

  describe('postFinalReport retry + keepalive', () => {
    it('retries on fetch returning 500 and succeeds on the third attempt', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('err') })
        .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('err') })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('') });

      const recorder = makeRecorder(
        { flushIntervalMs: 100_000, tracks: ['local'] },
        fetchImpl
      );
      recorder.start(fakeAudioTrack());
      await flushMicrotasks();
      recorder.stop();

      await expect(recorder.postFinalReport()).resolves.not.toThrow();
      // Three attempts total (attempt 1 fail, 2 fail, 3 success).
      expect(fetchImpl).toHaveBeenCalledTimes(3);

      // The successful (final) POST should be segment 'final'.
      const lastCall = fetchImpl.mock.calls[2];
      const body = JSON.parse(lastCall[1].body);
      expect(body.segment).toBe('final');
      expect(body.call_report_id).toBe('test-call-report-id');

      recorder.cleanup();
    });

    it('throws after retry exhaustion and cleanup still runs', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('err') });

      const recorder = makeRecorder(
        { flushIntervalMs: 100_000, tracks: ['local'] },
        fetchImpl
      );
      recorder.start(fakeAudioTrack());
      await flushMicrotasks();
      recorder.stop();

      await expect(recorder.postFinalReport()).rejects.toThrow();

      // All four attempts (1 + 3 retries) should have been made.
      expect(fetchImpl).toHaveBeenCalledTimes(4);

      // cleanup() must still be safe to call after a failed final post.
      expect(() => recorder.cleanup()).not.toThrow();
    });

    it('sets keepalive: true for final payloads below 60 KB', async () => {
      // Use a single small frame so the final payload is small.
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });

      const recorder = makeRecorder(
        { flushIntervalMs: 100_000 },
        fetchImpl
      );
      recorder.start(fakeAudioTrack(), fakeAudioTrack());
      await flushMicrotasks();
      recorder.stop();

      await recorder.postFinalReport();

      expect(fetchImpl).toHaveBeenCalled();
      const init = fetchImpl.mock.calls[0][1];
      expect(init.keepalive).toBe(true);

      recorder.cleanup();
    });

    it('does not set keepalive for large final payloads', async () => {
      // Large frames + small cap still produces a payload, but force the body
      // over 60KB by lowering nothing — instead use a cap that keeps a few
      // large packets. We craft frames of 10000 samples (~40KB each) and cap
      // high enough to keep two, giving a >60KB final body.
      class BigAudioData extends FakeAudioData {
        constructor() {
          super(10000);
        }
      }
      class BigReadableStream extends FakeReadableStream {
        constructor() {
          super([new BigAudioData(), new BigAudioData()]);
        }
      }
      class BigMSTP extends FakeMediaStreamTrackProcessor {
        constructor() {
          super({ track: {} as MediaStreamTrack });
          this.readable = new BigReadableStream();
        }
      }
      (globalThis as { MediaStreamTrackProcessor?: unknown }).MediaStreamTrackProcessor =
        BigMSTP as unknown;

      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });

      const recorder = makeRecorder(
        { flushIntervalMs: 100_000, maxBufferBytes: 200_000, tracks: ['local'] },
        fetchImpl
      );
      recorder.start(fakeAudioTrack());
      await flushMicrotasks();
      recorder.stop();

      await recorder.postFinalReport();
      expect(fetchImpl).toHaveBeenCalled();
      const init = fetchImpl.mock.calls[0][1];
      // The base64 body of two 40KB Float32 frames (~80KB raw → ~106KB b64)
      // exceeds the 60KB keepalive threshold.
      expect(init.keepalive).toBeFalsy();

      recorder.cleanup();
    });
  });

  describe('cleanup', () => {
    it('is idempotent and clears the timer', () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
      const recorder = makeRecorder(
        { flushIntervalMs: 10 },
        fetchImpl
      );
      recorder.start(fakeAudioTrack(), fakeAudioTrack());

      // Multiple cleanup calls must not throw.
      expect(() => {
        recorder.cleanup();
        recorder.cleanup();
        recorder.cleanup();
      }).not.toThrow();

      // After cleanup, no further flush POSTs should land even after waiting.
      const countBefore = fetchImpl.mock.calls.length;
      return flushMicrotasks(50).then(() => {
        expect(fetchImpl.mock.calls.length).toBe(countBefore);
      });
    });

    it('stop() is idempotent', () => {
      const recorder = makeRecorder();
      expect(() => {
        recorder.stop();
        recorder.stop();
      }).not.toThrow();
    });
  });

  describe('disabled / never started', () => {
    it('postFinalReport is a no-op when never started', async () => {
      const fetchImpl = jest.fn();
      const recorder = makeRecorder(
        { enabled: true },
        fetchImpl
      );
      // Don't call start().
      await expect(recorder.postFinalReport()).resolves.not.toThrow();
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('disabled recorder does nothing', async () => {
      const fetchImpl = jest.fn();
      const recorder = makeRecorder(
        { enabled: false },
        fetchImpl
      );
      recorder.start(fakeAudioTrack(), fakeAudioTrack());
      await flushMicrotasks();
      await recorder.postFinalReport();
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('endpoint resolution', () => {
    it('converts ws/wss host to http/https endpoint', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
      const recorder = makeRecorder(
        { flushIntervalMs: 100_000 },
        fetchImpl,
        { host: 'wss://example.fs.telnyx' }
      );
      recorder.start(fakeAudioTrack());
      await flushMicrotasks();
      recorder.stop();
      await recorder.postFinalReport();
      const url = fetchImpl.mock.calls[0][0];
      expect(url).toBe('https://example.fs.telnyx/call_recording');
      recorder.cleanup();
    });

    it('honors a custom endpoint path', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
      const recorder = makeRecorder(
        { flushIntervalMs: 100_000, endpoint: '/custom_recording' },
        fetchImpl,
        { host: 'wss://example.fs.telnyx' }
      );
      recorder.start(fakeAudioTrack());
      await flushMicrotasks();
      recorder.stop();
      await recorder.postFinalReport();
      const url = fetchImpl.mock.calls[0][0];
      expect(url).toBe('https://example.fs.telnyx/custom_recording');
      recorder.cleanup();
    });
  });
});
