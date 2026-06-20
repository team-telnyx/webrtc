/**
 * Tests for the microphone module — T7 (VSDK-304).
 *
 * Tests cover:
 * - Active capture success: audio level detected
 * - Silence detection: audio below threshold
 * - Permission denied: NotAllowedError
 * - No device: NotFoundError
 * - Not supported: getUserMedia not available
 * - Unknown error: unexpected error types
 * - Cleanup on throw: tracks stopped even on error
 * - Disabled options: microphone: false returns undefined
 * - activeCapture: false skips capture
 * - Custom options: sampleDurationMs and silenceThreshold
 */

import { buildPreCallMicrophoneReport } from '../modules/microphone';
import type {
  PreCallDiagnosticContext,
} from '../context';
import type {
  PreCallDiagnosticOptions,
} from '../types';

// --- Mock helpers ---

function createMockContext(
  overrides: Partial<PreCallDiagnosticOptions> = {}
): PreCallDiagnosticContext {
  const options: PreCallDiagnosticOptions = {
    client: {
      newCall: jest.fn().mockReturnValue({
        id: 'test-call-id',
        hangup: jest.fn(),
        peerConnection: undefined,
      }),
    },
    destinationNumber: '1234',
    durationMs: 10,
    ...overrides,
  };

  return {
    options,
    statsSamples: [],
    timings: {
      startedAt: Date.now(),
    },
  };
}

// Mock for getUserMedia
let mockGetUserMedia: jest.Mock | undefined;
let mockTrackStop: jest.Mock;

/**
 * Set up navigator.mediaDevices.getUserMedia mock.
 */
function setupGetUserMediaMock(
  impl?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
): void {
  mockTrackStop = jest.fn();
  const mockStream = {
    getTracks: jest.fn().mockReturnValue([{ stop: mockTrackStop }]),
  };

  if (impl) {
    mockGetUserMedia = jest.fn().mockImplementation(impl);
  } else {
    mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
  }

  // Ensure navigator.mediaDevices exists
  if (typeof navigator === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test setup for global shim
    (global as any).navigator = {};
  }
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {},
      writable: true,
      configurable: true,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test setup: assigning mock to mediaDevices
  (navigator.mediaDevices as any).getUserMedia = mockGetUserMedia;
}

/**
 * Set up AudioContext mock with configurable audio level data.
 * Generates a sine wave at the given amplitude.
 */
function setupAudioContextMock(audioLevel: number = 0.5): void {
  const fftSize = 2048;
  const data = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    data[i] = audioLevel * Math.sin((2 * Math.PI * i) / fftSize);
  }

  const mockAnalyser = {
    fftSize,
    getFloatTimeDomainData: jest.fn().mockImplementation((arr: Float32Array) => {
      arr.set(data);
    }),
    disconnect: jest.fn(),
  };

  const mockSource = {
    connect: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockAudioContext = {
    createAnalyser: jest.fn().mockReturnValue(mockAnalyser),
    createMediaStreamSource: jest.fn().mockReturnValue(mockSource),
    close: jest.fn().mockResolvedValue(undefined),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test setup: global AudioContext mock
  (global as any).AudioContext = jest.fn().mockReturnValue(mockAudioContext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test setup: global webkitAudioContext mock
  (global as any).webkitAudioContext = undefined;
}

/**
 * Remove navigator.mediaDevices.getUserMedia to simulate unsupported environment.
 */
function removeGetUserMediaMock(): void {
  if (navigator.mediaDevices) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test cleanup: removing mock
    delete (navigator.mediaDevices as any).getUserMedia;
  }
  mockGetUserMedia = undefined;
}

/**
 * Remove AudioContext to simulate unsupported environment.
 */
function removeAudioContextMock(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test cleanup: removing global mock
  delete (global as any).AudioContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test cleanup: removing global mock
  delete (global as any).webkitAudioContext;
}

// --- Tests ---

describe('buildPreCallMicrophoneReport', () => {
  describe('disabled options', () => {
    it('returns undefined when microphone is false', async () => {
      const context = createMockContext({ microphone: false });
      const result = await buildPreCallMicrophoneReport(context);
      expect(result).toBeUndefined();
    });
  });

  describe('not supported', () => {
    it('returns not_supported when getUserMedia is not available', async () => {
      removeGetUserMediaMock();
      removeAudioContextMock();

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.captureError).toBe('not_supported');
      expect(result?.captureErrorMessage).toContain('getUserMedia is not available');
      expect(result?.activeCapturePerformed).toBe(false);
    });
  });

  describe('active capture success', () => {
    beforeEach(() => {
      setupGetUserMediaMock();
      setupAudioContextMock(0.5);
    });

    it('returns a report with audioLevel and audioDetected when capture succeeds', async () => {
      const context = createMockContext({
        microphone: { activeCapture: true, sampleDurationMs: 50 },
      });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.activeCapturePerformed).toBe(true);
      expect(result?.permissionGranted).toBe(true);
      expect(result?.deviceAvailable).toBe(true);
      expect(typeof result?.audioLevel).toBe('number');
      expect(result?.audioLevel).toBeGreaterThan(0);
      expect(result?.audioDetected).toBe(true);
    });

    it('stops all tracks after successful capture', async () => {
      const context = createMockContext({
        microphone: { activeCapture: true, sampleDurationMs: 50 },
      });
      await buildPreCallMicrophoneReport(context);

      expect(mockTrackStop).toHaveBeenCalled();
    });

    it('closes the AudioContext after measurement', async () => {
      const context = createMockContext({
        microphone: { activeCapture: true, sampleDurationMs: 50 },
      });
      await buildPreCallMicrophoneReport(context);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test: accessing mock AudioContext constructor results
      expect(((global as any).AudioContext as jest.Mock).mock.results[0]?.value?.close).toHaveBeenCalled();
    });
  });

  describe('silence detection', () => {
    it('returns audioDetected: false when audio level is below threshold', async () => {
      setupGetUserMediaMock();
      // Very low audio level — below default threshold of 0.01
      setupAudioContextMock(0.001);

      const context = createMockContext({
        microphone: { activeCapture: true, sampleDurationMs: 50 },
      });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.activeCapturePerformed).toBe(true);
      expect(result?.audioDetected).toBe(false);
      expect(typeof result?.audioLevel).toBe('number');
    });

    it('respects custom silenceThreshold', async () => {
      setupGetUserMediaMock();
      // Audio level of 0.05 is above 0.01 threshold but below 0.1
      setupAudioContextMock(0.05);

      const context = createMockContext({
        microphone: {
          activeCapture: true,
          silenceThreshold: 0.1,
          sampleDurationMs: 50,
        },
      });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      // 0.05 < 0.1 threshold, so not detected
      expect(result?.audioDetected).toBe(false);
    });

    it('detects audio above custom threshold', async () => {
      setupGetUserMediaMock();
      setupAudioContextMock(0.5);

      const context = createMockContext({
        microphone: {
          activeCapture: true,
          silenceThreshold: 0.1,
          sampleDurationMs: 50,
        },
      });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      // 0.5 >= 0.1 threshold → detected
      expect(result?.audioDetected).toBe(true);
    });
  });

  describe('permission denied', () => {
    it('returns permission_denied when getUserMedia throws NotAllowedError', async () => {
      setupGetUserMediaMock(async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.captureError).toBe('permission_denied');
      expect(result?.captureErrorMessage).toContain('Permission denied');
      expect(result?.activeCapturePerformed).toBe(false);
      expect(result?.permissionGranted).toBe(false);
    });
  });

  describe('no device', () => {
    it('returns no_device when getUserMedia throws NotFoundError', async () => {
      setupGetUserMediaMock(async () => {
        throw new DOMException('Requested device not found', 'NotFoundError');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.captureError).toBe('no_device');
      expect(result?.captureErrorMessage).toContain('not found');
      expect(result?.activeCapturePerformed).toBe(false);
      expect(result?.permissionGranted).toBe(true);
      expect(result?.deviceAvailable).toBe(false);
    });
  });

  describe('unknown error', () => {
    it('returns unknown for unexpected errors', async () => {
      setupGetUserMediaMock(async () => {
        throw new Error('Unexpected internal error');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.captureError).toBe('unknown');
      expect(result?.captureErrorMessage).toContain('Unexpected internal error');
      expect(result?.activeCapturePerformed).toBe(false);
    });

    it('handles non-Error throws', async () => {
      setupGetUserMediaMock(async () => {
        throw 'string error';
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.captureError).toBe('unknown');
      expect(result?.captureErrorMessage).toBe('string error');
    });
  });

  describe('cleanup on throw', () => {
    it('stops tracks even when measurement fails', async () => {
      // getUserMedia succeeds (creating a stream with tracks)
      const localMockTrackStop = jest.fn();
      const localMockStream = {
        getTracks: jest.fn().mockReturnValue([{ stop: localMockTrackStop }]),
      };

      setupGetUserMediaMock(async () => localMockStream as unknown as MediaStream);

      // AudioContext constructor throws
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test setup: injecting throwing constructor
      (global as any).AudioContext = jest.fn().mockImplementation(() => {
        throw new Error('AudioContext failed');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      // Tracks should be stopped despite AudioContext failure
      expect(localMockTrackStop).toHaveBeenCalled();
      // Capture was performed (getUserMedia succeeded) but measurement failed
      expect(result?.activeCapturePerformed).toBe(false);
      expect(result?.captureError).toBe('unknown');
    });
  });

  describe('activeCapture disabled', () => {
    it('skips capture when activeCapture is false', async () => {
      setupGetUserMediaMock();
      setupAudioContextMock(0.5);

      const context = createMockContext({
        microphone: {
          activeCapture: false,
        },
      });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.activeCapturePerformed).toBeUndefined();
      expect(result?.audioLevel).toBeUndefined();
      expect(result?.audioDetected).toBeUndefined();
      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });
  });

  describe('custom options', () => {
    it('uses custom sampleDurationMs', async () => {
      setupGetUserMediaMock();
      setupAudioContextMock(0.5);

      const context = createMockContext({
        microphone: {
          activeCapture: true,
          sampleDurationMs: 50,
        },
      });

      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toBeDefined();
      expect(result?.activeCapturePerformed).toBe(true);
    });
  });

  describe('report shape', () => {
    it('includes all expected fields on success', async () => {
      setupGetUserMediaMock();
      setupAudioContextMock(0.5);

      const context = createMockContext({
        microphone: { activeCapture: true, sampleDurationMs: 50 },
      });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toHaveProperty('activeCapturePerformed');
      expect(result).toHaveProperty('permissionGranted');
      expect(result).toHaveProperty('deviceAvailable');
      expect(result).toHaveProperty('audioLevel');
      expect(result).toHaveProperty('audioDetected');
      expect(result?.captureError).toBeUndefined();
      expect(result?.captureErrorMessage).toBeUndefined();
    });

    it('includes error fields on failure', async () => {
      setupGetUserMediaMock(async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result).toHaveProperty('captureError');
      expect(result).toHaveProperty('captureErrorMessage');
      expect(result?.activeCapturePerformed).toBe(false);
    });
  });

  describe('TypeError from getUserMedia', () => {
    it('returns not_supported for TypeError from getUserMedia', async () => {
      setupGetUserMediaMock(async () => {
        throw new TypeError('malformed constraint');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result?.captureError).toBe('not_supported');
      expect(result?.captureErrorMessage).toContain('malformed constraint');
    });
  });

  describe('SecurityError from getUserMedia', () => {
    it('returns permission_denied for SecurityError', async () => {
      setupGetUserMediaMock(async () => {
        throw new DOMException('Blocked by security policy', 'SecurityError');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result?.captureError).toBe('permission_denied');
      expect(result?.captureErrorMessage).toContain('security policy');
    });
  });

  describe('OverconstrainedError from getUserMedia', () => {
    it('returns no_device for OverconstrainedError', async () => {
      setupGetUserMediaMock(async () => {
        throw new DOMException('Constraint not satisfied', 'OverconstrainedError');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result?.captureError).toBe('no_device');
      expect(result?.captureErrorMessage).toContain('constraint not satisfied');
    });
  });

  describe('NotReadableError from getUserMedia', () => {
    it('returns unknown for NotReadableError', async () => {
      setupGetUserMediaMock(async () => {
        throw new DOMException('Could not start audio source', 'NotReadableError');
      });

      const context = createMockContext({ microphone: true });
      const result = await buildPreCallMicrophoneReport(context);

      expect(result?.captureError).toBe('unknown');
      expect(result?.captureErrorMessage).toContain('not readable');
    });
  });
});
