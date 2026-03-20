import {
  SilenceDetector,
  SilenceEvent,
} from '../../webrtc/SilenceDetector';

describe('SilenceDetector', () => {
  let detector: SilenceDetector;
  let firedEvents: SilenceEvent[];

  beforeEach(() => {
    firedEvents = [];
  });

  afterEach(() => {
    detector?.destroy();
  });

  function createDetector(opts = {}) {
    detector = new SilenceDetector({
      threshold: 0.01,
      durationMs: 10_000,
      pollingIntervalMs: 1000,
      ...opts,
    });
    detector.onSilenceDetected = (event) => firedEvents.push(event);
    return detector;
  }

  it('fires after 10 consecutive silent polls (10s at 1s interval)', () => {
    createDetector();

    for (let i = 0; i < 10; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }

    expect(firedEvents).toHaveLength(1);
    expect(firedEvents[0].direction).toBe('both');
    expect(firedEvents[0].durationMs).toBe(10_000);
  });

  it('does not fire before threshold polls', () => {
    createDetector();

    for (let i = 0; i < 9; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }

    expect(firedEvents).toHaveLength(0);
  });

  it('does not fire when inbound has audio', () => {
    createDetector();

    for (let i = 0; i < 15; i++) {
      detector.onAudioLevels(0.1, 0.001);
    }

    expect(firedEvents).toHaveLength(0);
  });

  it('does not fire when outbound has audio', () => {
    createDetector();

    for (let i = 0; i < 15; i++) {
      detector.onAudioLevels(0.001, 0.05);
    }

    expect(firedEvents).toHaveLength(0);
  });

  it('resets when audio resumes and fires again on second silence window', () => {
    createDetector();

    // First silence window
    for (let i = 0; i < 11; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }
    expect(firedEvents).toHaveLength(1);

    // Audio resumes — resets counter
    detector.onAudioLevels(0.1, 0.05);

    // Second silence window
    for (let i = 0; i < 11; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }
    expect(firedEvents).toHaveLength(2);
  });

  it('fires only once per silence window', () => {
    createDetector();

    for (let i = 0; i < 20; i++) {
      detector.onAudioLevels(0.0, 0.0);
    }

    expect(firedEvents).toHaveLength(1);
  });

  it('treats null levels as zero (silent)', () => {
    createDetector();

    for (let i = 0; i < 11; i++) {
      detector.onAudioLevels(null, null);
    }

    expect(firedEvents).toHaveLength(1);
    expect(firedEvents[0].direction).toBe('both');
  });

  it('respects custom threshold', () => {
    createDetector({ threshold: 0.05 });

    // Level 0.03 is below 0.05 threshold
    for (let i = 0; i < 11; i++) {
      detector.onAudioLevels(0.03, 0.03);
    }

    expect(firedEvents).toHaveLength(1);
  });

  it('respects custom duration', () => {
    createDetector({ durationMs: 5000, pollingIntervalMs: 1000 });

    // 5 polls needed
    for (let i = 0; i < 5; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }

    expect(firedEvents).toHaveLength(1);
  });

  it('does not fire after destroy', () => {
    createDetector();

    for (let i = 0; i < 5; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }

    detector.destroy();

    // Continue polling after destroy — callback was nulled
    for (let i = 0; i < 10; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }

    expect(firedEvents).toHaveLength(0);
  });

  it('interruption mid-window resets the counter', () => {
    createDetector();

    // 8 silent polls
    for (let i = 0; i < 8; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }

    // One poll with audio — resets
    detector.onAudioLevels(0.1, 0.001);

    // 8 more silent polls — total 8, not 16
    for (let i = 0; i < 8; i++) {
      detector.onAudioLevels(0.001, 0.001);
    }

    expect(firedEvents).toHaveLength(0);
  });
});
