/**
 * Unit tests for the microphone module (VSDK-412 round-6 review fixes).
 *
 * Covers:
 * - sampleDurationMs honored from options.durationMs (round-6 review:
 *   "durationMs is ignored in microphone-only mode")
 * - playbackPerformed reflects actual playback success/failure (round-6:
 *   "playback failures are reported as success")
 *
 * Mocks: AudioContext, MediaRecorder, Audio, Blob, FileReader, navigator.mediaDevices.
 */
import { buildPreCallMicrophoneReport } from './microphone';
import type { BrowserEnv } from './microphone';
import type { PreCallDiagnosticContext } from '../context';

// --- Mock helpers ---

function makeMockStream(): MediaStream {
  return {
    getTracks: () => [{ stop: jest.fn() }],
  } as unknown as MediaStream;
}

function makeMockAudioContext(): {
  constructor: jest.Mock;
  instances: unknown[];
} {
  const instances: unknown[] = [];
  const constructor = jest.fn().mockImplementation(() => {
    const inst = {
      createAnalyser: () => ({
        fftSize: 0,
        getFloatTimeDomainData: () => {},
      }),
      createMediaStreamSource: () => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    instances.push(inst);
    return inst;
  });
  return { constructor, instances };
}

function makeMockMediaRecorder(): typeof MediaRecorder {
  const MR = jest.fn().mockImplementation(() => {
    const recorder: Record<string, unknown> = {
      mimeType: 'audio/webm',
      state: 'recording',
      start: jest.fn(),
    };
    recorder.stop = jest.fn(() => {
      // Fire ondataavailable then onstop
      const da = recorder.ondataavailable as
        | ((e: { data: { size: number } }) => void)
        | undefined;
      if (da) {
        da({ data: { size: 100 } });
      }
      const os = recorder.onstop as (() => void) | undefined;
      if (os) {
        os();
      }
    });
    return recorder;
  });
  (MR as unknown as { isTypeSupported: () => boolean }).isTypeSupported = () =>
    true;
  return MR as unknown as typeof MediaRecorder;
}

function makeMockFileReader(result: string): typeof FileReader {
  const FR = jest.fn().mockImplementation(() => {
    const reader: Record<string, unknown> = {
      result: result,
      readAsDataURL: jest.fn(() => {
        // Simulate async load completion
        const fn = reader.onloadend as (() => void) | undefined;
        if (fn) {
          setTimeout(fn, 0);
        }
      }),
    };
    return reader;
  });
  return FR as unknown as typeof FileReader;
}

function makeMockAudio(onended: boolean, onerror: boolean): typeof Audio {
  const AudioCtor = jest.fn().mockImplementation(() => {
    const el: Record<string, unknown> = {
      paused: false,
      pause: jest.fn(),
    };
    el.play = jest.fn().mockImplementation(() => {
      return new Promise<void>((resolve, reject) => {
        if (onerror) {
          // play() rejects (autoplay policy) — .catch() in playAudioDataUrl
          // will call settle(false)
          reject(new Error('play() rejected'));
        } else {
          resolve();
        }
      })
        .catch(() => {
          // play() rejection handled by .catch(settle(false))
        })
        .then(() => {
          if (onended) {
            setTimeout(() => {
              const fn = el.onended as (() => void) | undefined;
              if (fn) {
                fn();
              }
            }, 0);
          } else if (onerror) {
            // Also fire onerror event (some browsers fire onerror instead of
            // rejecting play())
            setTimeout(() => {
              const fn = el.onerror as (() => void) | undefined;
              if (fn) {
                fn();
              }
            }, 0);
          }
        });
    });
    return el;
  });
  return AudioCtor as unknown as typeof Audio;
}

function makeBrowserEnv(audioContextCtor?: jest.Mock): BrowserEnv {
  return {
    permissions: {
      query: jest.fn().mockResolvedValue({ state: 'granted' }),
    },
    mediaDevices: {
      enumerateDevices: jest.fn().mockResolvedValue([
        {
          kind: 'audioinput',
          deviceId: 'default',
          label: 'Default Mic',
          groupId: 'group1',
        },
      ]),
      getUserMedia: jest.fn().mockResolvedValue(makeMockStream()),
    },
    AudioContext: audioContextCtor as unknown as BrowserEnv['AudioContext'],
  };
}

function makeContext(micOptions: unknown): PreCallDiagnosticContext {
  return {
    options: {
      client: {} as never,
      mode: 'microphone-only',
      ice: false,
      network: false,
      media: false,
      microphone: micOptions as never,
      durationMs: 10,
    },
    statsSamples: [],
  } as PreCallDiagnosticContext;
}

// --- Tests ---

describe('PreCallMicrophone — sampleDurationMs honored (VSDK-412 round-6)', () => {
  const origMediaRecorder = globalThis.MediaRecorder;
  const origFileReader = globalThis.FileReader;
  const origAudio = globalThis.Audio;
  const origBlob = globalThis.Blob;

  afterEach(() => {
    (globalThis as Record<string, unknown>).MediaRecorder = origMediaRecorder;
    (globalThis as Record<string, unknown>).FileReader = origFileReader;
    (globalThis as Record<string, unknown>).Audio = origAudio;
    (globalThis as Record<string, unknown>).Blob = origBlob;
  });

  it('uses options.sampleDurationMs instead of default when provided', async () => {
    const mockAC = makeMockAudioContext();
    const env = makeBrowserEnv(mockAC.constructor);

    const context = makeContext({
      activeCapture: true,
      sampleDurationMs: 1,
      record: false,
      playback: false,
    });

    const report = await buildPreCallMicrophoneReport(context, env);

    // If sampleDurationMs were ignored (default 2000ms), this test would
    // take ~2s. With 1ms it completes quickly. The report should have
    // audioLevelStats from the short sampling window.
    expect(report.audioLevelStats).toBeDefined();
    expect(report.activeCapturePerformed).toBe(true);
  });
});

describe('PreCallMicrophone — playbackPerformed reflects actual outcome (VSDK-412 round-6)', () => {
  const origMediaRecorder = globalThis.MediaRecorder;
  const origFileReader = globalThis.FileReader;
  const origAudio = globalThis.Audio;
  const origBlob = globalThis.Blob;

  afterEach(() => {
    (globalThis as Record<string, unknown>).MediaRecorder = origMediaRecorder;
    (globalThis as Record<string, unknown>).FileReader = origFileReader;
    (globalThis as Record<string, unknown>).Audio = origAudio;
    (globalThis as Record<string, unknown>).Blob = origBlob;
  });

  async function runWithPlayback(
    audioOnended: boolean,
    audioOnerror: boolean
  ): Promise<{ playbackPerformed?: boolean; recordingPerformed?: boolean }> {
    const mockAC = makeMockAudioContext();
    const env = makeBrowserEnv(mockAC.constructor);

    const MR = makeMockMediaRecorder();
    (globalThis as Record<string, unknown>).MediaRecorder = MR;

    (globalThis as Record<string, unknown>).Blob = jest
      .fn()
      .mockImplementation(() => ({
        size: 100,
      }));

    const FR = makeMockFileReader('data:audio/webm;base64,AAA');
    (globalThis as Record<string, unknown>).FileReader = FR;

    const AudioCtor = makeMockAudio(audioOnended, audioOnerror);
    (globalThis as Record<string, unknown>).Audio = AudioCtor;

    const context = makeContext({
      activeCapture: true,
      sampleDurationMs: 1,
      record: true,
      playback: true,
    });

    return buildPreCallMicrophoneReport(context, env) as Promise<{
      playbackPerformed?: boolean;
      recordingPerformed?: boolean;
    }>;
  }

  it('sets playbackPerformed=true when playback succeeds (onended)', async () => {
    const report = await runWithPlayback(true, false);
    expect(report.recordingPerformed).toBe(true);
    expect(report.playbackPerformed).toBe(true);
  });

  it('sets playbackPerformed=false when playback fails (play() rejection)', async () => {
    const report = await runWithPlayback(false, true);
    expect(report.recordingPerformed).toBe(true);
    expect(report.playbackPerformed).toBe(false);
  });
});

/**
 * Tests for the playback terminal bound (VSDK-412 round-7 review:
 * "playback has no terminal bound"). When `audio.play()` resolves but
 * the element stalls without firing `ended` or `error`, the promise
 * must still settle (via the timeout) so the caller's `finally` block
 * that stops microphone tracks can run.
 */
describe('PreCallMicrophone — playback settles on timeout when stalled (VSDK-412 round-7)', () => {
  const origMediaRecorder = globalThis.MediaRecorder;
  const origFileReader = globalThis.FileReader;
  const origAudio = globalThis.Audio;
  const origBlob = globalThis.Blob;

  afterEach(() => {
    (globalThis as Record<string, unknown>).MediaRecorder = origMediaRecorder;
    (globalThis as Record<string, unknown>).FileReader = origFileReader;
    (globalThis as Record<string, unknown>).Audio = origAudio;
    (globalThis as Record<string, unknown>).Blob = origBlob;
  });

  it('settles playback on timeout when play() resolves but no ended/error fires', async () => {
    const mockAC = makeMockAudioContext();
    const env = makeBrowserEnv(mockAC.constructor);

    const MR = makeMockMediaRecorder();
    (globalThis as Record<string, unknown>).MediaRecorder = MR;

    (globalThis as Record<string, unknown>).Blob = jest
      .fn()
      .mockImplementation(() => ({ size: 100 }));

    const FR = makeMockFileReader('data:audio/webm;base64,AAA');
    (globalThis as Record<string, unknown>).FileReader = FR;

    // Stalled audio: play() resolves, but onended/onerror never fire.
    const AudioCtor = jest.fn().mockImplementation(() => {
      const el: Record<string, unknown> = {
        paused: false,
        pause: jest.fn(),
        play: jest.fn().mockImplementation(() => Promise.resolve()),
      };
      return el;
    });
    (globalThis as Record<string, unknown>).Audio = AudioCtor;

    const context = makeContext({
      activeCapture: true,
      sampleDurationMs: 1,
      record: true,
      playback: true,
    });

    // The playback timeout = recordingDurationMs(~0) + 5000ms margin = ~5001ms.
    // Wait for it with real timers (increase the Jest per-test timeout).
    const report = (await buildPreCallMicrophoneReport(context, env)) as {
      playbackPerformed?: boolean;
    };
    expect(report.playbackPerformed).toBe(false);
  }, 15000); // 15s Jest timeout (playback timeout is ~5s)
});
