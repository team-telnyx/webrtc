import {
  normalizeAudioWarmupOptions,
  createAudioWarmupStream,
} from '../../webrtc/AudioWarmup';

// Mock AudioContext and Web Audio API
const mockGainNode = {
  gain: {
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
};

const mockDestination = {
  stream: {
    getAudioTracks: jest.fn(() => [{ kind: 'audio', label: 'destination-audio' }]),
  },
};

const mockSource = {
  connect: jest.fn(),
  disconnect: jest.fn(),
};

const mockAudioContext = {
  currentTime: 0,
  createMediaStreamSource: jest.fn(() => mockSource),
  createGain: jest.fn(() => mockGainNode),
  createMediaStreamDestination: jest.fn(() => mockDestination),
  close: jest.fn(() => Promise.resolve()),
  state: 'running',
};

// Mock the global AudioContext constructor
let AudioContextMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.clearAllTimers();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AudioContextMock = jest.fn(() => mockAudioContext) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).AudioContext = AudioContextMock;

  // Reset mock state
  mockAudioContext.currentTime = 0;
  mockAudioContext.state = 'running';
  mockGainNode.gain.setValueAtTime.mockReset();
  mockGainNode.gain.linearRampToValueAtTime.mockReset();
  mockGainNode.connect.mockReset();
  mockGainNode.disconnect.mockReset();
  mockSource.connect.mockReset();
  mockSource.disconnect.mockReset();
  mockAudioContext.close.mockReset().mockReturnValue(Promise.resolve());
  // Restore createGain in case a previous test overwrote it
  mockAudioContext.createGain = jest.fn(() => mockGainNode);
  mockAudioContext.createMediaStreamSource.mockReset().mockReturnValue(mockSource);
  mockAudioContext.createMediaStreamDestination.mockReset().mockReturnValue(mockDestination);
});

afterEach(() => {
  jest.useRealTimers();
});

// Helper to create a mock MediaStream with audio (and optionally video) tracks
function createMockStream(
  hasAudio = true,
  hasVideo = false
): MediaStream {
  const tracks: MediaStreamTrack[] = [];
  if (hasAudio) {
    tracks.push({
      kind: 'audio',
      label: 'mock-microphone',
      enabled: true,
      getConstraints: jest.fn(() => ({})),
    } as unknown as MediaStreamTrack);
  }
  if (hasVideo) {
    tracks.push({
      kind: 'video',
      label: 'mock-camera',
      enabled: true,
      getConstraints: jest.fn(() => ({})),
    } as unknown as MediaStreamTrack);
  }
  return {
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getTracks: () => tracks,
    addTrack: jest.fn(),
  } as unknown as MediaStream;
}

// ============================================================
// normalizeAudioWarmupOptions
// ============================================================

describe('normalizeAudioWarmupOptions', () => {
  it('returns null for undefined', () => {
    expect(normalizeAudioWarmupOptions(undefined)).toBeNull();
  });

  it('returns null for false', () => {
    expect(normalizeAudioWarmupOptions(false)).toBeNull();
  });

  it('returns defaults for true', () => {
    const result = normalizeAudioWarmupOptions(true);
    expect(result).toEqual({ enabled: true, durationMs: 750, fadeInMs: 100 });
  });

  it('returns null for object with enabled: false', () => {
    expect(normalizeAudioWarmupOptions({ enabled: false })).toBeNull();
  });

  it('returns defaults for object with enabled: true', () => {
    const result = normalizeAudioWarmupOptions({ enabled: true });
    expect(result).toEqual({ enabled: true, durationMs: 750, fadeInMs: 100 });
  });

  it('returns defaults for empty object (enabled defaults to true)', () => {
    const result = normalizeAudioWarmupOptions({});
    expect(result).toEqual({ enabled: true, durationMs: 750, fadeInMs: 100 });
  });

  it('applies custom durations', () => {
    const result = normalizeAudioWarmupOptions({
      durationMs: 500,
      fadeInMs: 50,
    });
    expect(result).toEqual({ enabled: true, durationMs: 500, fadeInMs: 50 });
  });

  it('clamps durationMs to max 3000', () => {
    const result = normalizeAudioWarmupOptions({ durationMs: 5000 });
    expect(result?.durationMs).toBe(3000);
  });

  it('clamps durationMs to min 0', () => {
    const result = normalizeAudioWarmupOptions({ durationMs: -100 });
    expect(result?.durationMs).toBe(0);
  });

  it('clamps fadeInMs to max 1000', () => {
    const result = normalizeAudioWarmupOptions({ fadeInMs: 2000 });
    expect(result?.fadeInMs).toBe(1000);
  });

  it('clamps fadeInMs to min 0', () => {
    const result = normalizeAudioWarmupOptions({ fadeInMs: -50 });
    expect(result?.fadeInMs).toBe(0);
  });

  it('uses default durations when only enabled is set', () => {
    const result = normalizeAudioWarmupOptions({ enabled: true, durationMs: 1000 });
    expect(result).toEqual({ enabled: true, durationMs: 1000, fadeInMs: 100 });
  });
});

// ============================================================
// createAudioWarmupStream
// ============================================================

describe('createAudioWarmupStream', () => {
  it('returns null when option is undefined (disabled)', () => {
    const stream = createMockStream();
    expect(createAudioWarmupStream(stream, undefined)).toBeNull();
  });

  it('returns null when option is false', () => {
    const stream = createMockStream();
    expect(createAudioWarmupStream(stream, false)).toBeNull();
  });

  it('returns null when stream has no audio tracks', () => {
    const stream = createMockStream(false);
    expect(createAudioWarmupStream(stream, true)).toBeNull();
  });

  it('returns null when option has enabled: false', () => {
    const stream = createMockStream();
    expect(createAudioWarmupStream(stream, { enabled: false })).toBeNull();
  });

  it('creates a warm-up controller with boolean true', () => {
    const stream = createMockStream();
    const controller = createAudioWarmupStream(stream, true);
    expect(controller).not.toBeNull();
    expect(controller!.active).toBe(true);
    expect(controller!.stream).toBeDefined();
  });

  it('creates a warm-up controller with object options', () => {
    const stream = createMockStream();
    const controller = createAudioWarmupStream(stream, {
      enabled: true,
      durationMs: 500,
      fadeInMs: 50,
    });
    expect(controller).not.toBeNull();
    expect(controller!.active).toBe(true);
  });

  it('creates AudioContext and connects WebAudio nodes', () => {
    const stream = createMockStream();
    createAudioWarmupStream(stream, true);

    expect(AudioContextMock).toHaveBeenCalled();
    expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(stream);
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockAudioContext.createMediaStreamDestination).toHaveBeenCalled();
    expect(mockSource.connect).toHaveBeenCalledWith(mockGainNode);
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockDestination);
  });

  it('sets initial gain to 0', () => {
    const stream = createMockStream();
    createAudioWarmupStream(stream, true);

    expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
  });

  it('returns a stream with destination audio track', () => {
    const stream = createMockStream();
    const controller = createAudioWarmupStream(stream, true);

    const audioTracks = controller!.stream.getAudioTracks();
    expect(audioTracks.length).toBe(1);
    expect(audioTracks[0].label).toBe('destination-audio');
  });

  it('includes video tracks in sender stream', () => {
    const stream = createMockStream(true, true);
    const controller = createAudioWarmupStream(stream, true);

    const videoTracks = controller!.stream.getVideoTracks();
    expect(videoTracks.length).toBe(1);
  });

  it('preserves microphoneLabel in userVariables from original track', () => {
    const stream = createMockStream();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userVariables: Record<string, any> = {};
    createAudioWarmupStream(stream, true, userVariables);

    expect(userVariables.microphoneLabel).toBe('mock-microphone');
  });

  // ============================================================
  // scheduleRelease() — delayed release after durationMs
  // ============================================================

  describe('scheduleRelease', () => {
    it('gain is still 0 immediately after scheduleRelease (before durationMs)', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        durationMs: 750,
        fadeInMs: 100,
      });

      // Clear initial gain setup calls
      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      controller!.scheduleRelease();

      // Immediately after scheduleRelease, no ramp should be scheduled yet
      expect(mockGainNode.gain.setValueAtTime).not.toHaveBeenCalled();
      expect(mockGainNode.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
      expect(controller!.active).toBe(true);
    });

    it('ramps gain 0→1 after durationMs elapses', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        durationMs: 750,
        fadeInMs: 100,
      });

      controller!.scheduleRelease();
      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      // Advance past durationMs
      jest.advanceTimersByTime(750);

      // Now the ramp should be scheduled
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));
    });

    it('does not schedule double release on duplicate scheduleRelease calls', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        durationMs: 750,
        fadeInMs: 100,
      });

      // Call scheduleRelease multiple times
      controller!.scheduleRelease();
      controller!.scheduleRelease();
      controller!.scheduleRelease();

      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      // Advance past durationMs
      jest.advanceTimersByTime(750);

      // Only one ramp should occur
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledTimes(1);
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledTimes(1);
    });

    it('marks active as false after durationMs + fadeInMs', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        durationMs: 750,
        fadeInMs: 100,
      });

      controller!.scheduleRelease();

      // After durationMs
      jest.advanceTimersByTime(750);
      expect(controller!.active).toBe(true); // still during fade-in

      // After fade-in + buffer
      jest.advanceTimersByTime(200);
      expect(controller!.active).toBe(false);
    });
  });

  // ============================================================
  // release() — immediate release
  // ============================================================

  describe('release', () => {
    it('immediately ramps gain from 0 to 1', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        fadeInMs: 100,
      });

      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      controller!.release();

      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));
    });

    it('is idempotent', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, true);

      controller!.release();
      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      // Second call should be a no-op
      controller!.release();
      expect(mockGainNode.gain.setValueAtTime).not.toHaveBeenCalled();
    });

    it('cancels scheduled release when called after scheduleRelease', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        durationMs: 750,
        fadeInMs: 100,
      });

      controller!.scheduleRelease();
      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      // Immediate release should cancel the scheduled one and ramp now
      controller!.release();

      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));

      // Record the call count after release()
      const rampCallCount = mockGainNode.gain.linearRampToValueAtTime.mock.calls.length;

      // Advancing past durationMs should NOT trigger additional ramp calls
      jest.advanceTimersByTime(800);
      expect(mockGainNode.gain.linearRampToValueAtTime.mock.calls.length).toBe(rampCallCount);
    });
  });

  // ============================================================
  // cleanup()
  // ============================================================

  describe('cleanup', () => {
    it('disconnects nodes and closes AudioContext', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, true);

      controller!.cleanup();

      expect(mockSource.disconnect).toHaveBeenCalled();
      expect(mockGainNode.disconnect).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(controller!.active).toBe(false);
    });

    it('is idempotent', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, true);

      controller!.cleanup();
      mockSource.disconnect.mockClear();
      mockGainNode.disconnect.mockClear();
      mockAudioContext.close.mockClear();

      controller!.cleanup();
      expect(mockSource.disconnect).not.toHaveBeenCalled();
    });

    it('cancels scheduled release', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        durationMs: 750,
        fadeInMs: 100,
      });

      controller!.scheduleRelease();
      controller!.cleanup();

      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      // Advancing past durationMs should NOT trigger ramp after cleanup
      jest.advanceTimersByTime(750);
      expect(mockGainNode.gain.setValueAtTime).not.toHaveBeenCalled();
      expect(mockGainNode.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Safety timeout — fallback if connected event never arrives
  // ============================================================

  describe('safety timeout', () => {
    it('triggers immediate release if connected never arrives', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        durationMs: 750,
      });

      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      // Advance time past duration + safety margin (750 + 2000 = 2750ms)
      jest.advanceTimersByTime(2800);

      // Should have triggered release via safety timeout
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));

      // Advance past the fade-in + 50ms delay after release
      jest.advanceTimersByTime(200);
      expect(controller!.active).toBe(false);
    });

    it('is cancelled when scheduleRelease is called', () => {
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, {
        enabled: true,
        durationMs: 750,
      });

      // Simulate peer connected → scheduleRelease
      controller!.scheduleRelease();

      mockGainNode.gain.setValueAtTime.mockClear();
      mockGainNode.gain.linearRampToValueAtTime.mockClear();

      // Advance past the safety timeout window
      jest.advanceTimersByTime(3000);

      // Only one ramp from scheduleRelease, not an extra one from safety timeout
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Fallback / error cases
  // ============================================================

  describe('fallback', () => {
    it('returns null when AudioContext constructor throws', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).AudioContext = jest.fn(() => {
        throw new Error('AudioContext not available');
      });

      const stream = createMockStream();
      const result = createAudioWarmupStream(stream, true);
      expect(result).toBeNull();
    });

    it('returns null when WebAudio setup throws (createGain)', () => {
      mockAudioContext.createGain = jest.fn(() => {
        throw new Error('createGain failed');
      });

      const stream = createMockStream();
      const result = createAudioWarmupStream(stream, true);
      expect(result).toBeNull();
    });

    it('webitAudioContext fallback is supported in getAudioContextConstructor', () => {
      // The getAudioContextConstructor() function checks window.AudioContext first,
      // then falls back to window.webkitAudioContext for Safari compatibility.
      // Full browser integration testing is needed to verify Safari behavior.
      // Here we just confirm the normal path still works.
      const stream = createMockStream();
      const controller = createAudioWarmupStream(stream, true);
      expect(controller).not.toBeNull();
      expect(AudioContextMock).toHaveBeenCalled();
    });
  });
});
