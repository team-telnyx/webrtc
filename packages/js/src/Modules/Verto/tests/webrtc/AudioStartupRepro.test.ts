import {
  createAudioStartupReproStream,
  normalizeAudioStartupReproOptions,
} from '../../webrtc/AudioStartupRepro';

const mockOscillator = {
  frequency: { value: 0 },
  type: 'sine',
  connect: jest.fn(),
  disconnect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};

const mockGainNode = {
  gain: {
    value: 0,
    setValueAtTime: jest.fn(),
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
};

const mockDestinationTrack = {
  kind: 'audio',
  label: 'audio-startup-repro-tone',
};

const mockDestination = {
  stream: {
    getAudioTracks: jest.fn(() => [mockDestinationTrack]),
  },
};

const mockAudioContext = {
  currentTime: 0,
  createOscillator: jest.fn(() => mockOscillator),
  createGain: jest.fn(() => mockGainNode),
  createMediaStreamDestination: jest.fn(() => mockDestination),
  close: jest.fn(() => Promise.resolve()),
  state: 'running',
};

let AudioContextMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  AudioContextMock = jest.fn(() => mockAudioContext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).AudioContext = AudioContextMock;

  mockAudioContext.currentTime = 0;
  mockAudioContext.state = 'running';
  mockOscillator.frequency.value = 0;
  mockOscillator.type = 'sine';
  mockGainNode.gain.value = 0;
});

function createMockStream(hasVideo = false): MediaStream {
  const videoTracks: MediaStreamTrack[] = hasVideo
    ? [
        {
          kind: 'video',
          label: 'mock-camera',
          enabled: true,
          getConstraints: jest.fn(() => ({})),
        } as unknown as MediaStreamTrack,
      ]
    : [];

  return {
    getAudioTracks: () => [
      {
        kind: 'audio',
        label: 'mock-microphone',
        enabled: true,
        getConstraints: jest.fn(() => ({})),
      } as unknown as MediaStreamTrack,
    ],
    getVideoTracks: () => videoTracks,
    getTracks: () => [...videoTracks],
    addTrack: jest.fn(),
  } as unknown as MediaStream;
}

describe('normalizeAudioStartupReproOptions', () => {
  it('returns null when disabled or undefined', () => {
    expect(normalizeAudioStartupReproOptions(undefined)).toBeNull();
    expect(normalizeAudioStartupReproOptions(false)).toBeNull();
    expect(normalizeAudioStartupReproOptions({ enabled: false })).toBeNull();
  });

  it('uses deterministic tone defaults when enabled', () => {
    expect(normalizeAudioStartupReproOptions(true)).toEqual({
      enabled: true,
      frequencyHz: 440,
      gain: 0.2,
    });
  });

  it('clamps frequency and gain to safe repro ranges', () => {
    expect(
      normalizeAudioStartupReproOptions({ frequencyHz: 12000, gain: 5 })
    ).toEqual({ enabled: true, frequencyHz: 4000, gain: 1 });

    expect(
      normalizeAudioStartupReproOptions({ frequencyHz: -1, gain: -1 })
    ).toEqual({ enabled: true, frequencyHz: 20, gain: 0 });
  });
});

describe('createAudioStartupReproStream', () => {
  it('returns null when disabled', () => {
    expect(
      createAudioStartupReproStream(createMockStream(), undefined)
    ).toBeNull();
    expect(createAudioStartupReproStream(createMockStream(), false)).toBeNull();
  });

  it('creates and starts a tone immediately', () => {
    const controller = createAudioStartupReproStream(createMockStream(), {
      frequencyHz: 880,
      gain: 0.35,
    });

    expect(controller).not.toBeNull();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockAudioContext.createMediaStreamDestination).toHaveBeenCalled();
    expect(mockOscillator.frequency.value).toBe(880);
    expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(
      0.35,
      mockAudioContext.currentTime
    );
    expect(mockOscillator.start).toHaveBeenCalledWith(0);
  });

  it('returns sender stream with generated audio and original video tracks', () => {
    const sourceStream = createMockStream(true);
    const controller = createAudioStartupReproStream(sourceStream, true);

    expect(controller).not.toBeNull();
    expect(controller!.stream.getAudioTracks()[0]).toBe(mockDestinationTrack);
    expect(controller!.stream.getVideoTracks()[0].label).toBe('mock-camera');
  });

  it('preserves original microphone label in user variables for diagnostics', () => {
    const userVariables: Record<string, unknown> = {};

    createAudioStartupReproStream(createMockStream(), true, userVariables);

    expect(userVariables.microphoneLabel).toBe('mock-microphone');
  });

  it('cleans up oscillator and audio context', () => {
    const controller = createAudioStartupReproStream(createMockStream(), true);

    controller!.cleanup();

    expect(mockOscillator.stop).toHaveBeenCalled();
    expect(mockOscillator.disconnect).toHaveBeenCalled();
    expect(mockGainNode.disconnect).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
});
