/**
 * Microphone diagnostic module — passive preflight and active capture.
 *
 * T6 (VSDK-303) — Checks microphone permission state and device availability
 * without calling getUserMedia.
 *
 * T7 (VSDK-304, folded into VSDK-303) — Adds optional active microphone
 * capture and audio-level detection on top of the passive checks.
 *
 * This module:
 * 1. Checks microphone permission state via the browser Permissions API
 *    when available (Chrome, Edge). Falls back to 'unknown' when unavailable.
 * 2. Checks whether audio input devices are available via enumerateDevices.
 * 3. Avoids leaking device labels unless already permitted and needed by
 *    existing SDK conventions.
 * 4. When activeCapture is enabled, calls getUserMedia to verify capture
 *    works, measures audio level/energy via Web Audio APIs, and always
 *    cleans up all tracks and AudioContext resources.
 * 5. Returns structured permission/device/capture state with reason codes
 *    for the verdict module to consume.
 */

import type {
  PreCallMicrophoneReport,
  PreCallMicrophoneOptions,
  PreCallDiagnosticReason,
  MicrophonePermissionState,
  PreCallAudioDevice,
  PreCallMicrophoneAudioLevelStats,
} from '../types';
import type { PreCallDiagnosticContext } from '../context';

// --- Constants ---

/** Default duration for the audio-level sample window in milliseconds. */
const DEFAULT_SAMPLE_DURATION_MS = 2000;

/** Default RMS threshold below which audio is considered silent (0–1). */
const DEFAULT_SILENCE_THRESHOLD = 0.01;

/** Default interval between audio level samples in milliseconds. */
const DEFAULT_SAMPLE_INTERVAL_MS = 100;

/**
 * Human-readable pre-recording notice shown to the user before microphone
 * recording starts (VSDK-412 review P43WG). Exported so callers can display
 * it proactively — either via the `onRecordingConsent` callback (recommended)
 * or by reading it directly before calling `runMicrophoneCheck()`.
 */
export const MICROPHONE_RECORDING_NOTICE =
  'To check your microphone, say anything — "1, 2, 3..." ' +
  'Your voice will be recorded for a few seconds and played back ' +
  'to you so you can hear how it sounds.';

// --- Browser environment abstraction ---

/**
 * Narrow interface for the AudioContext dependencies this module needs.
 *
 * Used by BrowserEnv to inject AudioContext for testing without
 * depending on the global constructor.
 */
export interface AudioContextLike {
  createAnalyser(): AnalyserNodeLike;
  createMediaStreamSource(stream: MediaStream): MediaStreamSourceLike;
  close(): Promise<void>;
}

/**
 * Narrow interface for AnalyserNode dependencies.
 */
export interface AnalyserNodeLike {
  fftSize: number;
  getFloatTimeDomainData(array: Float32Array): void;
  disconnect(): void;
}

/**
 * Narrow interface for MediaStreamAudioSourceNode dependencies.
 */
export interface MediaStreamSourceLike {
  connect(dest: AnalyserNodeLike): void;
  disconnect(): void;
}

/**
 * Browser environment abstraction for testing.
 *
 * Provides access to the browser APIs this module needs without
 * directly importing `navigator`, so tests can inject mocks.
 */
export interface BrowserEnv {
  permissions?: {
    query?(descriptor: PermissionDescriptor): Promise<PermissionStatus>;
  };
  mediaDevices?: {
    enumerateDevices?(): Promise<MediaDeviceInfo[]>;
    getUserMedia?(constraints: MediaStreamConstraints): Promise<MediaStream>;
  };
  /** AudioContext constructor for audio-level measurement. */
  AudioContext?: new () => AudioContextLike;
}

/**
 * Get the browser environment from the global navigator object.
 * Returns a safe subset that may have undefined fields if APIs are unavailable.
 */
function getBrowserEnv(): BrowserEnv {
  if (typeof navigator === 'undefined') {
    return {};
  }

  // Resolve AudioContext constructor (standard + webkit prefix)
  const webkitAudioContext = (globalThis as Record<string, unknown>)[
    'webkitAudioContext'
  ];
  const AudioContextClass: (new () => AudioContextLike) | undefined =
    typeof AudioContext !== 'undefined'
      ? (AudioContext as unknown as new () => AudioContextLike)
      : typeof webkitAudioContext !== 'undefined'
        ? (webkitAudioContext as unknown as new () => AudioContextLike)
        : undefined;

  return {
    permissions: navigator.permissions ?? undefined,
    mediaDevices: navigator.mediaDevices
      ? {
          enumerateDevices: navigator.mediaDevices.enumerateDevices?.bind(
            navigator.mediaDevices
          ),
          getUserMedia: navigator.mediaDevices.getUserMedia?.bind(
            navigator.mediaDevices
          ),
        }
      : undefined,
    AudioContext: AudioContextClass,
  };
}

// --- Passive check helpers ---

/**
 * Check the microphone permission state using the Permissions API.
 *
 * Returns:
 * - 'granted' if the user has already granted microphone permission.
 * - 'denied' if the user has permanently denied microphone permission.
 * - 'prompt' if the user has not yet been asked (permission will be requested on getUserMedia).
 * - 'unknown' if the Permissions API is not available, query fails, or returns an unexpected state.
 */
async function checkMicrophonePermission(
  env: BrowserEnv
): Promise<MicrophonePermissionState> {
  if (!env.permissions || typeof env.permissions.query !== 'function') {
    return 'unknown';
  }

  try {
    const result = await env.permissions.query({
      name: 'microphone' as PermissionName,
    });

    switch (result.state) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'prompt':
        return 'prompt';
      default:
        // Unknown state — could be a browser-specific extension
        return 'unknown';
    }
  } catch {
    // The Permissions API may throw if 'microphone' is not a recognized
    // permission name (e.g., Firefox does not support it).
    return 'unknown';
  }
}

/**
 * Check audio input device availability via enumerateDevices.
 *
 * Returns information about the number of audio input devices and
 * whether their labels are accessible (which implies permission was granted).
 *
 * Also returns the full device list (label, deviceId) so callers can
 * show the user all available microphones — not just a count.
 *
 * Returns undefined if enumerateDevices is not available.
 */
async function checkDeviceAvailability(env: BrowserEnv): Promise<
  | {
      deviceCount: number;
      deviceAvailable: boolean;
      labelsAccessible: boolean;
      devices: PreCallAudioDevice[];
    }
  | undefined
> {
  if (
    !env.mediaDevices ||
    typeof env.mediaDevices.enumerateDevices !== 'function'
  ) {
    return undefined;
  }

  try {
    const devices = await env.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(
      (device) => device.kind === 'audioinput'
    );

    // If at least one device has a non-empty label, permission was granted.
    // Without permission, labels are empty strings.
    const labelsAccessible = audioInputs.some(
      (device) => device.label && device.label.length > 0
    );

    // Build the full device list for the report.
    const deviceList: PreCallAudioDevice[] = audioInputs.map((d) => ({
      label: d.label || '',
      deviceId: d.deviceId || '',
      kind: 'audioinput' as const,
    }));

    return {
      deviceCount: audioInputs.length,
      deviceAvailable: audioInputs.length > 0,
      labelsAccessible,
      devices: deviceList,
    };
  } catch {
    // enumerateDevices can fail in some environments
    return undefined;
  }
}

// --- Active capture helpers ---

/**
 * Classify a getUserMedia error into a structured capture error code.
 */
function classifyCaptureError(error: unknown): {
  captureError: 'permission_denied' | 'no_device' | 'not_supported' | 'unknown';
  captureErrorMessage: string;
} {
  if (
    error instanceof DOMException ||
    (error && typeof error === 'object' && 'name' in error)
  ) {
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
    if (
      name === 'OverconstrainedError' ||
      name === 'ConstraintNotSatisfiedError'
    ) {
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
 * Measure peak RMS and average RMS audio level from an active MediaStream
 * using the Web Audio API.
 *
 * Creates an AudioContext + AnalyserNode, reads time-domain data
 * at regular intervals over `sampleDurationMs`, and returns the peak RMS
 * level, average RMS level, and number of samples.
 *
 * If the AudioContext is not available (via env.AudioContext), returns
 * { audioLevel: 0, audioDetected: false, audioLevelStats: { peak: 0, average: 0, samples: 0 } }
 * to indicate measurement was not possible.
 *
 * @param stream - The active MediaStream with audio tracks
 * @param sampleDurationMs - How long to sample in ms
 * @param silenceThreshold - RMS threshold for silence detection
 * @param env - Browser environment with AudioContext constructor
 * @returns Peak RMS audio level (0–1), whether it exceeded the silence
 *   threshold, and structured stats (peak, average, samples)
 */
async function measureAudioLevel(
  stream: MediaStream,
  sampleDurationMs: number,
  silenceThreshold: number,
  env: BrowserEnv
): Promise<{
  audioLevel: number;
  audioDetected: boolean;
  audioLevelStats: PreCallMicrophoneAudioLevelStats;
}> {
  const AudioContextClass = env.AudioContext;

  if (!AudioContextClass) {
    // Cannot measure audio level without AudioContext
    return {
      audioLevel: 0,
      audioDetected: false,
      audioLevelStats: { peak: 0, average: 0, samples: 0 },
    };
  }

  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  analyser.fftSize = 2048;
  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);

  let peakRms = 0;
  let totalRms = 0;
  let sampleCount = 0;
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
    totalRms += rms;
    sampleCount++;

    // Wait before next sample
    await new Promise((resolve) =>
      setTimeout(resolve, DEFAULT_SAMPLE_INTERVAL_MS)
    );
  }

  // Cleanup AudioContext resources
  try {
    source.disconnect();
    analyser.disconnect();
    await audioContext.close();
  } catch {
    // Swallow cleanup errors
  }

  const averageRms = sampleCount > 0 ? totalRms / sampleCount : 0;

  return {
    audioLevel: peakRms,
    audioDetected: peakRms >= silenceThreshold,
    audioLevelStats: {
      peak: peakRms,
      average: averageRms,
      samples: sampleCount,
    },
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
 * Record audio from a MediaStream for a given duration using MediaRecorder.
 *
 * Returns a data URL (base64-encoded) of the recording, the MIME type,
 * and the duration in ms. Returns undefined values when MediaRecorder is
 * not available or recording fails.
 */
async function recordAudio(
  stream: MediaStream,
  durationMs: number
): Promise<{
  recordingDataUrl?: string;
  recordingMimeType?: string;
  recordingDurationMs?: number;
}> {
  // Check if MediaRecorder is available
  if (typeof MediaRecorder === 'undefined') {
    return {};
  }

  let recorder: MediaRecorder | undefined;
  try {
    // Pick a supported MIME type
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }
    }

    recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const startTime = Date.now();

    return new Promise((resolve) => {
      recorder!.onstop = () => {
        const duration = Date.now() - startTime;
        const blob = new Blob(chunks, {
          type: recorder!.mimeType || mimeType || 'audio/webm',
        });

        // Convert to data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            recordingDataUrl: reader.result as string,
            recordingMimeType: recorder!.mimeType || mimeType || 'audio/webm',
            recordingDurationMs: duration,
          });
        };
        reader.onerror = () => {
          resolve({
            recordingDurationMs: duration,
            recordingMimeType: recorder!.mimeType || mimeType || 'audio/webm',
          });
        };
        reader.readAsDataURL(blob);
      };

      recorder!.start();
      setTimeout(() => {
        if (recorder!.state !== 'inactive') {
          recorder!.stop();
        }
      }, durationMs);
    });
  } catch {
    return {};
  }
}

/**
 * Play back an audio data URL through the speakers.
 *
 * Creates a temporary <audio> element, sets the src, and plays it.
 * Returns `true` if playback completed successfully (via `onended`),
 * `false` on any error/rejection (e.g. autoplay policy, load failure,
 * constructor error). The caller must set `playbackPerformed` from the
 * actual return value — never assume success (VSDK-412 round-6 review:
 * "playback failures are reported as success").
 */
function playAudioDataUrl(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const settle = (ok: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(ok);
      }
    };
    try {
      const audio = new Audio(dataUrl);
      audio.onended = () => settle(true);
      audio.onerror = () => settle(false);
      audio.play().catch(() => settle(false));
    } catch {
      settle(false);
    }
  });
}

// --- Reason building ---

/**
 * Build reason entries from the microphone check results.
 *
 * Produces reasons for problematic states only:
 * - Passive: denied permission, no device
 * - Active capture: capture errors, silent audio
 */
function buildReasons(
  permissionState: MicrophonePermissionState | undefined,
  deviceAvailable: boolean | undefined,
  captureError?:
    | 'permission_denied'
    | 'no_device'
    | 'not_supported'
    | 'unknown',
  audioDetected?: boolean
): PreCallDiagnosticReason[] {
  const reasons: PreCallDiagnosticReason[] = [];

  // Passive check reasons
  if (permissionState === 'denied') {
    reasons.push({
      code: 'microphone_permission_denied',
      message: 'Microphone permission has been denied by the user.',
      source: 'microphone',
    });
  }

  if (deviceAvailable === false) {
    reasons.push({
      code: 'microphone_no_device',
      message: 'No audio input device is available.',
      source: 'microphone',
    });
  }

  // Active capture reasons
  if (captureError === 'permission_denied') {
    reasons.push({
      code: 'microphone_capture_permission_denied',
      message: 'Active microphone capture was denied permission.',
      source: 'microphone',
    });
  } else if (captureError === 'no_device') {
    reasons.push({
      code: 'microphone_capture_no_device',
      message: 'No microphone device found for active capture.',
      source: 'microphone',
    });
  } else if (captureError === 'not_supported') {
    reasons.push({
      code: 'microphone_capture_not_supported',
      message: 'getUserMedia is not available for active microphone capture.',
      source: 'microphone',
    });
  } else if (captureError === 'unknown') {
    reasons.push({
      code: 'microphone_capture_failed',
      message: 'Active microphone capture failed with an unexpected error.',
      source: 'microphone',
    });
  }

  // Silent audio after successful capture
  if (captureError === undefined && audioDetected === false) {
    reasons.push({
      code: 'microphone_silent',
      message:
        'No audio was detected above the silence threshold during active capture.',
      source: 'microphone',
    });
  }

  return reasons;
}

// --- Option resolution ---

/**
 * Resolve the effective microphone options from the diagnostic context.
 *
 * Handles the `boolean | PreCallMicrophoneOptions` union type:
 * - `true` or `undefined` → enable with defaults
 * - `false` → disabled (should not reach this function)
 * - `PreCallMicrophoneOptions` → use individual option flags
 */
function resolveMicrophoneOptions(
  options: boolean | PreCallMicrophoneOptions | undefined
): {
  checkPermission: boolean;
  checkDeviceAvailability: boolean;
  activeCapture: boolean;
  sampleDurationMs: number;
  silenceThreshold: number;
  record: boolean;
  playback: boolean;
  onRecordingConsent?: () => Promise<void>;
} {
  if (options === false) {
    // Should not happen — caller should have already skipped
    return {
      checkPermission: false,
      checkDeviceAvailability: false,
      activeCapture: false,
      sampleDurationMs: DEFAULT_SAMPLE_DURATION_MS,
      silenceThreshold: DEFAULT_SILENCE_THRESHOLD,
      record: false,
      playback: false,
      onRecordingConsent: undefined,
    };
  }

  if (options === true || options === undefined) {
    return {
      checkPermission: true,
      checkDeviceAvailability: true,
      activeCapture: false,
      sampleDurationMs: DEFAULT_SAMPLE_DURATION_MS,
      silenceThreshold: DEFAULT_SILENCE_THRESHOLD,
      record: false,
      playback: false,
      onRecordingConsent: undefined,
    };
  }

  return {
    checkPermission: options.checkPermission !== false,
    checkDeviceAvailability: options.checkDeviceAvailability !== false,
    activeCapture: options.activeCapture === true,
    sampleDurationMs: options.sampleDurationMs ?? DEFAULT_SAMPLE_DURATION_MS,
    silenceThreshold: options.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD,
    record: options.record === true,
    playback: options.playback === true,
    onRecordingConsent: options.onRecordingConsent,
  };
}

// --- Main module builder ---

/**
 * Build the microphone report section from the diagnostic context.
 *
 * This function is called by PreCallDiagnostic.getMicrophoneReport()
 * when the microphone module is enabled (options.microphone !== false).
 *
 * Passive checks (always run unless individually disabled):
 * 1. Microphone permission state (via Permissions API when available)
 * 2. Audio input device availability (via enumerateDevices)
 * 3. Whether device labels are accessible (implies permission granted)
 *
 * Active capture (only when activeCapture: true):
 * 4. Calls getUserMedia({ audio: true }) to verify capture works
 * 5. Measures audio level/energy using the Web Audio API during a sample window
 * 6. Classifies capture errors into structured codes
 * 7. Always stops all created tracks in a finally block
 * 8. Closes/cleans up AudioContext resources after measurement
 *
 * @param context - The diagnostic context with options and call state
 * @param env - Optional browser environment override for testing.
 *              When not provided, the real browser environment is used.
 */
export async function buildPreCallMicrophoneReport(
  context: PreCallDiagnosticContext,
  env?: BrowserEnv
): Promise<PreCallMicrophoneReport | undefined> {
  const browserEnv = env ?? getBrowserEnv();
  const { options } = context;
  const micOptions = resolveMicrophoneOptions(options.microphone);

  const report: PreCallMicrophoneReport = {};

  // --- Passive preflight checks ---

  // 1. Check microphone permission state
  if (micOptions.checkPermission) {
    const permissionState = await checkMicrophonePermission(browserEnv);
    report.permissionState = permissionState;
    report.permissionGranted = permissionState === 'granted';
  }

  // 2. Check device availability
  if (micOptions.checkDeviceAvailability) {
    const deviceInfo = await checkDeviceAvailability(browserEnv);
    if (deviceInfo !== undefined) {
      report.deviceAvailable = deviceInfo.deviceAvailable;
      report.deviceCount = deviceInfo.deviceCount;
      report.labelsAccessible = deviceInfo.labelsAccessible;
      report.devices = deviceInfo.devices;
    }
  }

  // --- Active capture checks (T7, opt-in) ---

  if (micOptions.activeCapture) {
    // Check if getUserMedia is available
    const hasGetUserMedia =
      browserEnv.mediaDevices &&
      typeof browserEnv.mediaDevices.getUserMedia === 'function';

    if (!hasGetUserMedia) {
      report.activeCapturePerformed = false;
      report.captureError = 'not_supported';
      report.captureErrorMessage =
        'getUserMedia is not available in this environment';
    } else {
      // Perform active microphone capture
      let stream: MediaStream | undefined;

      try {
        stream = await browserEnv.mediaDevices!.getUserMedia!({ audio: true });

        // Successfully captured — permission is granted, device is available
        report.permissionGranted = true;
        report.deviceAvailable = true;
        report.activeCapturePerformed = true;

        // Recording notice: warn the user that their voice will be recorded
        // (VSDK-412 review P43WG: "this does not warn the user before
        // recording"). The notice is always populated on the report when
        // recording is enabled, but the recommended pattern is to pass
        // `onRecordingConsent` — the module awaits it BEFORE calling
        // `MediaRecorder.start()` so the caller can display the warning
        // and get user consent before capture begins.
        let recordingEnabled = micOptions.record;
        if (recordingEnabled) {
          report.recordingNotice = MICROPHONE_RECORDING_NOTICE;

          // Await the consent callback before starting recording. If the
          // caller rejects (user declined), recording is skipped — but the
          // rest of the microphone check (audio level measurement) still runs.
          if (micOptions.onRecordingConsent) {
            try {
              await micOptions.onRecordingConsent();
            } catch {
              // Consent declined — skip recording but continue with the
              // rest of the microphone check.
              recordingEnabled = false;
              report.recordingPerformed = false;
            }
          }
        }

        // Start recording in parallel with audio level measurement
        // when recording is enabled (and consent was granted).
        let recordingPromise: Promise<{
          recordingDataUrl?: string;
          recordingMimeType?: string;
          recordingDurationMs?: number;
        }> = Promise.resolve({});

        if (recordingEnabled) {
          recordingPromise = recordAudio(stream, micOptions.sampleDurationMs);
        }

        // Measure audio level
        const { audioLevel, audioDetected, audioLevelStats } =
          await measureAudioLevel(
            stream,
            micOptions.sampleDurationMs,
            micOptions.silenceThreshold,
            browserEnv
          );

        report.audioLevel = audioLevel;
        report.audioLevelStats = audioLevelStats;
        report.audioDetected = audioDetected;

        // Wait for recording to complete and populate recording fields
        if (recordingEnabled) {
          const recordingResult = await recordingPromise;
          if (recordingResult.recordingDataUrl) {
            report.recordingPerformed = true;
            report.recordingDataUrl = recordingResult.recordingDataUrl;
            report.recordingMimeType = recordingResult.recordingMimeType;
            report.recordingDurationMs = recordingResult.recordingDurationMs;

            // Play back the recording if `playback: true` so the user
            // hears their own voice (VSDK-412 Review 18, point 2).
            if (micOptions.playback) {
              const playbackOk = await playAudioDataUrl(
                recordingResult.recordingDataUrl
              );
              report.playbackPerformed = playbackOk;
            }
          } else {
            report.recordingPerformed = false;
          }
        }

        // Re-enumerate devices after permission grant to get labels
        // (labels are empty before permission is granted)
        if (micOptions.checkDeviceAvailability) {
          const deviceInfoAfter = await checkDeviceAvailability(browserEnv);
          if (deviceInfoAfter !== undefined) {
            report.deviceCount = deviceInfoAfter.deviceCount;
            report.deviceAvailable = deviceInfoAfter.deviceAvailable;
            report.labelsAccessible = deviceInfoAfter.labelsAccessible;
            report.devices = deviceInfoAfter.devices;
          }
        }
      } catch (error) {
        // Classify the error
        const { captureError, captureErrorMessage } =
          classifyCaptureError(error);
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
    }
  }

  // --- Build reasons for problematic states ---

  const reasons = buildReasons(
    report.permissionState,
    report.deviceAvailable,
    report.captureError,
    report.audioDetected
  );
  if (reasons.length > 0) {
    report.reasons = reasons;
  }

  // If we couldn't determine anything, return undefined to avoid
  // producing an empty report with no useful information
  if (
    report.permissionState === undefined &&
    report.deviceAvailable === undefined &&
    report.activeCapturePerformed === undefined
  ) {
    return undefined;
  }

  return report;
}
