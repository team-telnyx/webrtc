/**
 * Microphone active capture and audio-level report module.
 *
 * T7 (VSDK-304) — active microphone capture diagnostics.
 *
 * This module optionally uses getUserMedia({ audio: true }) to capture
 * microphone audio, measures audio level/energy during a short sample
 * window using the Web Audio API (AudioContext + AnalyserNode), and
 * always stops all created tracks in a finally block.
 *
 * Structured capture errors are returned for:
 * - permission_denied: getUserMedia was rejected (NotAllowedError)
 * - no_device: No microphone device found (NotFoundError)
 * - not_supported: getUserMedia is not available in this environment
 * - unknown: An unexpected error occurred during capture
 */

import type {
  PreCallMicrophoneReport,
  PreCallMicrophoneOptions,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

/** Default duration for the audio-level sample window in milliseconds. */
const DEFAULT_SAMPLE_DURATION_MS = 2000;

/** Default RMS threshold below which audio is considered silent (0–1). */
const DEFAULT_SILENCE_THRESHOLD = 0.01;

/**
 * Resolve PreCallMicrophoneOptions from the `microphone` field in options.
 *
 * The `microphone` option can be `true` (use defaults), `false` (disabled),
 * or a `PreCallMicrophoneOptions` object.
 */
function resolveMicrophoneOptions(
  microphoneOption: boolean | PreCallMicrophoneOptions | undefined
): PreCallMicrophoneOptions | undefined {
  if (microphoneOption === false) {
    return undefined;
  }
  if (microphoneOption === true || microphoneOption === undefined) {
    return {};
  }
  return microphoneOption;
}

/**
 * Classify a getUserMedia error into a structured capture error code.
 */
function classifyCaptureError(error: unknown): {
  captureError: 'permission_denied' | 'no_device' | 'not_supported' | 'unknown';
  captureErrorMessage: string;
} {
  if (error instanceof DOMException || (error && typeof error === 'object' && 'name' in error)) {
    const name = (error as DOMException).name;
    const message = (error as DOMException).message || String(error);

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return {
        captureError: 'permission_denied',
        captureErrorMessage: `Microphone permission denied: ${message}`,
      };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        captureError: 'no_device',
        captureErrorMessage: `No microphone device found: ${message}`,
      };
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        captureError: 'unknown',
        captureErrorMessage: `Microphone not readable: ${message}`,
      };
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return {
        captureError: 'no_device',
        captureErrorMessage: `Microphone constraint not satisfied: ${message}`,
      };
    }
    if (name === 'TypeError') {
      return {
        captureError: 'not_supported',
        captureErrorMessage: `getUserMedia not supported or invalid constraints: ${message}`,
      };
    }
    if (name === 'SecurityError') {
      return {
        captureError: 'permission_denied',
        captureErrorMessage: `Microphone access blocked by security policy: ${message}`,
      };
    }
  }

  return {
    captureError: 'unknown',
    captureErrorMessage: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Measure peak RMS audio level from an active MediaStream using the Web Audio API.
 *
 * Creates an AudioContext + AnalyserNode, reads frequency/time-domain data
 * at regular intervals over `sampleDurationMs`, and returns the peak RMS level.
 *
 * @param stream - The active MediaStream with audio tracks
 * @param sampleDurationMs - How long to sample in ms
 * @returns Peak RMS audio level (0–1) and whether it exceeded the silence threshold
 */
async function measureAudioLevel(
  stream: MediaStream,
  sampleDurationMs: number,
  silenceThreshold: number
): Promise<{ audioLevel: number; audioDetected: boolean }> {
  // AudioContext may not be available in all environments (e.g., old Node.js)
  const webkitAudioContext = (globalThis as Record<string, unknown>)['webkitAudioContext'];
  const AudioContextClass: (new () => AudioContext) | undefined =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : typeof webkitAudioContext !== 'undefined'
      ? (webkitAudioContext as unknown as typeof AudioContext)
      : undefined;

  if (!AudioContextClass) {
    // Cannot measure audio level without AudioContext — return 0 / not detected
    return { audioLevel: 0, audioDetected: false };
  }

  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  analyser.fftSize = 2048;
  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);

  let peakRms = 0;
  const sampleIntervalMs = 100; // Read every 100ms
  const startTime = Date.now();

  // Sample the audio level over the specified duration
  while (Date.now() - startTime < sampleDurationMs) {
    analyser.getFloatTimeDomainData(dataArray);

    // Calculate RMS (root mean square) of the current sample
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = dataArray[i];
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    if (rms > peakRms) {
      peakRms = rms;
    }

    // Wait before next sample
    await new Promise((resolve) => setTimeout(resolve, sampleIntervalMs));
  }

  // Cleanup AudioContext resources
  try {
    source.disconnect();
    analyser.disconnect();
    await audioContext.close();
  } catch {
    // Swallow cleanup errors
  }

  return {
    audioLevel: peakRms,
    audioDetected: peakRms >= silenceThreshold,
  };
}

/**
 * Stop all tracks in a MediaStream.
 *
 * Safe to call with undefined — does nothing.
 */
function stopAllTracks(stream: MediaStream | undefined): void {
  if (!stream) return;
  try {
    const tracks = stream.getTracks();
    for (const track of tracks) {
      track.stop();
    }
  } catch {
    // Swallow cleanup errors — tracks may already be stopped
  }
}

/**
 * Build the microphone report section from the diagnostic context.
 *
 * When `activeCapture` is enabled (default), this function:
 * 1. Calls getUserMedia({ audio: true }) to capture microphone audio
 * 2. Measures audio level/energy using the Web Audio API during a sample window
 * 3. Stops all created tracks in a finally block
 * 4. Returns structured capture errors for known failure modes
 *
 * When `activeCapture` is disabled, returns only the basic report fields
 * (permissionGranted, deviceAvailable) without performing capture.
 */
export async function buildPreCallMicrophoneReport(
  context: PreCallDiagnosticContext
): Promise<PreCallMicrophoneReport | undefined> {
  const { options } = context;
  const micOptions = resolveMicrophoneOptions(options.microphone);

  // Module is disabled
  if (micOptions === undefined) {
    return undefined;
  }

  const activeCapture = micOptions.activeCapture !== false;
  const sampleDurationMs = micOptions.sampleDurationMs ?? DEFAULT_SAMPLE_DURATION_MS;
  const silenceThreshold = micOptions.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD;

  const report: PreCallMicrophoneReport = {};

  // Check if getUserMedia is available
  const hasGetUserMedia =
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  if (!hasGetUserMedia) {
    // Cannot perform any checks without getUserMedia
    if (activeCapture) {
      report.activeCapturePerformed = false;
      report.captureError = 'not_supported';
      report.captureErrorMessage = 'getUserMedia is not available in this environment';
    }
    return report;
  }

  // If activeCapture is not requested, just return a basic report
  if (!activeCapture) {
    return report;
  }

  // Perform active microphone capture
  let stream: MediaStream | undefined;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Successfully captured — permission is granted, device is available
    report.permissionGranted = true;
    report.deviceAvailable = true;
    report.activeCapturePerformed = true;

    // Measure audio level
    const { audioLevel, audioDetected } = await measureAudioLevel(
      stream,
      sampleDurationMs,
      silenceThreshold
    );

    report.audioLevel = audioLevel;
    report.audioDetected = audioDetected;
  } catch (error) {
    // Classify the error
    const { captureError, captureErrorMessage } = classifyCaptureError(error);
    report.activeCapturePerformed = false;
    report.captureError = captureError;
    report.captureErrorMessage = captureErrorMessage;

    // Set permission/device fields based on the error type
    if (captureError === 'permission_denied') {
      report.permissionGranted = false;
    } else if (captureError === 'no_device') {
      report.permissionGranted = true;
      report.deviceAvailable = false;
    }
  } finally {
    // Always stop all tracks — even on error
    stopAllTracks(stream);
  }

  return report;
}
