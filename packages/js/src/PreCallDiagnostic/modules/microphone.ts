/** Microphone permission, device, recording, playback, and level check. */

import type { PreCallDiagnosticContext } from '../context';
import type {
  MicrophonePermissionState,
  PreCallAudioDevice,
  PreCallDiagnosticReason,
  PreCallMicrophoneAudioLevelStats,
  PreCallMicrophoneOptions,
  PreCallMicrophoneReport,
} from '../types';

const DEFAULT_SAMPLE_DURATION_MS = 2000;
const DEFAULT_SAMPLE_INTERVAL_MS = 100;
const DEFAULT_SILENCE_THRESHOLD = 0.01;

export const MICROPHONE_RECORDING_NOTICE =
  'To check your microphone, say anything — "1, 2, 3..." ' +
  'Your voice will be recorded for a few seconds and played back ' +
  'to you so you can hear how it sounds.';

export interface AudioContextLike {
  createAnalyser(): AnalyserNodeLike;
  createMediaStreamSource(stream: MediaStream): MediaStreamSourceLike;
  close(): Promise<void>;
}

export interface AnalyserNodeLike {
  fftSize: number;
  getFloatTimeDomainData(array: Float32Array): void;
  disconnect(): void;
}

export interface MediaStreamSourceLike {
  connect(destination: AnalyserNodeLike): void;
  disconnect(): void;
}

/** Browser dependencies are injectable to keep the check easy to test. */
export interface BrowserEnv {
  permissions?: {
    query?(descriptor: PermissionDescriptor): Promise<PermissionStatus>;
  };
  mediaDevices?: {
    enumerateDevices?(): Promise<MediaDeviceInfo[]>;
    getUserMedia?(constraints: MediaStreamConstraints): Promise<MediaStream>;
  };
  AudioContext?: new () => AudioContextLike;
}

type CaptureErrorCode = NonNullable<PreCallMicrophoneReport['captureError']>;

interface ResolvedMicrophoneOptions {
  checkPermission: boolean;
  checkDeviceAvailability: boolean;
  activeCapture: boolean;
  sampleDurationMs: number;
  silenceThreshold: number;
  record: boolean;
  playback: boolean;
  onRecordingConsent?: (notice: string) => void | Promise<void>;
}

interface DeviceInfo {
  deviceCount: number;
  deviceAvailable: boolean;
  labelsAccessible: boolean;
  devices: PreCallAudioDevice[];
}

interface AudioLevelResult {
  audioLevel: number;
  audioDetected: boolean;
  audioLevelStats: PreCallMicrophoneAudioLevelStats;
}

interface RecordingResult {
  recordingDataUrl: string;
  recordingMimeType: string;
  recordingDurationMs: number;
}

const emptyAudioLevel = (): AudioLevelResult => ({
  audioLevel: 0,
  audioDetected: false,
  audioLevelStats: { peak: 0, average: 0, samples: 0 },
});

function getBrowserEnv(): BrowserEnv {
  if (typeof navigator === 'undefined') return {};

  const webkitAudioContext = (globalThis as Record<string, unknown>)[
    'webkitAudioContext'
  ];
  const AudioContextClass =
    typeof AudioContext !== 'undefined'
      ? (AudioContext as unknown as new () => AudioContextLike)
      : typeof webkitAudioContext === 'function'
        ? (webkitAudioContext as new () => AudioContextLike)
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

function resolveOptions(
  options: boolean | PreCallMicrophoneOptions | undefined
): ResolvedMicrophoneOptions {
  const configured =
    options && typeof options === 'object' ? options : undefined;

  return {
    checkPermission: options !== false && configured?.checkPermission !== false,
    checkDeviceAvailability:
      options !== false && configured?.checkDeviceAvailability !== false,
    activeCapture: configured?.activeCapture === true,
    sampleDurationMs: Math.max(
      0,
      configured?.sampleDurationMs ?? DEFAULT_SAMPLE_DURATION_MS
    ),
    silenceThreshold: Math.min(
      1,
      Math.max(0, configured?.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD)
    ),
    record: configured?.record === true,
    playback: configured?.playback === true,
    onRecordingConsent: configured?.onRecordingConsent,
  };
}

async function checkPermission(
  env: BrowserEnv
): Promise<MicrophonePermissionState> {
  if (typeof env.permissions?.query !== 'function') return 'unknown';

  try {
    const status = await env.permissions.query({
      name: 'microphone',
    } as unknown as PermissionDescriptor);
    return status.state === 'granted' ||
      status.state === 'denied' ||
      status.state === 'prompt'
      ? status.state
      : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function listDevices(env: BrowserEnv): Promise<DeviceInfo | undefined> {
  if (typeof env.mediaDevices?.enumerateDevices !== 'function') {
    return undefined;
  }

  try {
    const devices = (await env.mediaDevices.enumerateDevices())
      .filter(({ kind }) => kind === 'audioinput')
      .map<PreCallAudioDevice>(({ deviceId, label }) => ({
        deviceId: deviceId || '',
        label: label || '',
        kind: 'audioinput',
      }));

    return {
      devices,
      deviceCount: devices.length,
      deviceAvailable: devices.length > 0,
      labelsAccessible: devices.some(({ label }) => label.length > 0),
    };
  } catch {
    return undefined;
  }
}

function applyDeviceInfo(
  report: PreCallMicrophoneReport,
  deviceInfo: DeviceInfo | undefined
): void {
  if (!deviceInfo) return;
  report.devices = deviceInfo.devices;
  report.deviceCount = deviceInfo.deviceCount;
  report.deviceAvailable = deviceInfo.deviceAvailable;
  report.labelsAccessible = deviceInfo.labelsAccessible;
}

const wait = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

async function measureAudioLevel(
  stream: MediaStream,
  durationMs: number,
  silenceThreshold: number,
  env: BrowserEnv
): Promise<AudioLevelResult> {
  if (!env.AudioContext) return emptyAudioLevel();

  let context: AudioContextLike | undefined;
  let analyser: AnalyserNodeLike | undefined;
  let source: MediaStreamSourceLike | undefined;

  try {
    context = new env.AudioContext();
    analyser = context.createAnalyser();
    source = context.createMediaStreamSource(stream);
    analyser.fftSize = 2048;
    source.connect(analyser);

    const samples = new Float32Array(analyser.fftSize);
    const deadline = Date.now() + durationMs;
    let peak = 0;
    let total = 0;
    let count = 0;

    do {
      analyser.getFloatTimeDomainData(samples);
      let sumOfSquares = 0;
      for (const sample of samples) sumOfSquares += sample * sample;

      const rms = Math.sqrt(sumOfSquares / samples.length);
      peak = Math.max(peak, rms);
      total += rms;
      count += 1;

      const remainingMs = deadline - Date.now();
      if (remainingMs > 0) {
        await wait(Math.min(DEFAULT_SAMPLE_INTERVAL_MS, remainingMs));
      }
    } while (Date.now() < deadline);

    return {
      audioLevel: peak,
      audioDetected: peak >= silenceThreshold,
      audioLevelStats: {
        peak,
        average: count > 0 ? total / count : 0,
        samples: count,
      },
    };
  } catch {
    return emptyAudioLevel();
  } finally {
    try {
      source?.disconnect();
    } catch {
      // Cleanup is best effort.
    }
    try {
      analyser?.disconnect();
    } catch {
      // Cleanup is best effort.
    }
    try {
      await context?.close();
    } catch {
      // The stream is stopped by the caller even if context cleanup fails.
    }
  }
}

function recordingMimeType(): string | undefined {
  const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm'];
  return preferredTypes.find(
    (type) =>
      typeof MediaRecorder.isTypeSupported !== 'function' ||
      MediaRecorder.isTypeSupported(type)
  );
}

function blobToDataUrl(blob: Blob): Promise<string | undefined> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    } catch {
      resolve(undefined);
    }
  });
}

async function recordAudio(
  stream: MediaStream,
  durationMs: number
): Promise<RecordingResult | undefined> {
  if (typeof MediaRecorder === 'undefined') return undefined;

  try {
    const mimeType = recordingMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const startedAt = Date.now();

    return await new Promise((resolve) => {
      let settled = false;

      const settle = (result?: RecordingResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(stopTimer);
        clearTimeout(fallbackTimer);
        resolve(result);
      };

      recorder.ondataavailable = ({ data }) => {
        if (data.size > 0) chunks.push(data);
      };
      recorder.onerror = () => settle();
      recorder.onstop = async () => {
        const recordingMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const recordingDataUrl = await blobToDataUrl(
          new Blob(chunks, { type: recordingMimeType })
        );

        settle(
          recordingDataUrl
            ? {
                recordingDataUrl,
                recordingMimeType,
                recordingDurationMs: Date.now() - startedAt,
              }
            : undefined
        );
      };

      const stopTimer = setTimeout(() => {
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch {
          settle();
        }
      }, durationMs);
      const fallbackTimer = setTimeout(() => settle(), durationMs + 1000);
      recorder.start();
    });
  } catch {
    return undefined;
  }
}

function playRecording(
  dataUrl: string,
  maxDurationMs: number
): Promise<boolean> {
  if (typeof Audio === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    let audio: HTMLAudioElement | undefined;
    let settled = false;

    const timeout = setTimeout(() => settle(false), maxDurationMs);
    const settle = (played: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        if (!audio.paused) audio.pause();
        audio.src = '';
      }
      resolve(played);
    };

    try {
      audio = new Audio(dataUrl);
      audio.onended = () => settle(true);
      audio.onerror = () => settle(false);
      audio.play().catch(() => settle(false));
    } catch {
      settle(false);
    }
  });
}

function classifyCaptureError(error: unknown): {
  captureError: CaptureErrorCode;
  captureErrorMessage: string;
} {
  const name =
    error && typeof error === 'object' && 'name' in error
      ? String((error as { name: unknown }).name)
      : '';
  const message = error instanceof Error ? error.message : String(error);

  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError'
  ) {
    return {
      captureError: 'permission_denied',
      captureErrorMessage: `Microphone permission denied: ${message}`,
    };
  }
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError' ||
    name === 'ConstraintNotSatisfiedError'
  ) {
    return {
      captureError: 'no_device',
      captureErrorMessage: `No microphone device found: ${message}`,
    };
  }
  if (name === 'TypeError') {
    return {
      captureError: 'not_supported',
      captureErrorMessage: `Microphone capture is not supported: ${message}`,
    };
  }

  return { captureError: 'unknown', captureErrorMessage: message };
}

function stopTracks(stream: MediaStream | undefined): void {
  try {
    stream?.getTracks().forEach((track) => track.stop());
  } catch {
    // Tracks may already have ended.
  }
}

function buildReasons(
  report: PreCallMicrophoneReport
): PreCallDiagnosticReason[] {
  const reasons: PreCallDiagnosticReason[] = [];
  const add = (code: string, message: string) =>
    reasons.push({ code, message, source: 'microphone' });

  if (report.permissionState === 'denied') {
    add(
      'microphone_permission_denied',
      'Microphone permission has been denied by the user.'
    );
  }
  if (report.deviceAvailable === false) {
    add('microphone_no_device', 'No audio input device is available.');
  }

  const captureReasons: Partial<Record<CaptureErrorCode, [string, string]>> = {
    permission_denied: [
      'microphone_capture_permission_denied',
      'Active microphone capture was denied permission.',
    ],
    no_device: [
      'microphone_capture_no_device',
      'No microphone device was found for active capture.',
    ],
    not_supported: [
      'microphone_capture_not_supported',
      'Active microphone capture is not supported.',
    ],
    unknown: ['microphone_capture_failed', 'Active microphone capture failed.'],
  };
  const captureReason = report.captureError
    ? captureReasons[report.captureError]
    : undefined;
  if (captureReason) add(...captureReason);

  if (report.activeCapturePerformed && report.audioDetected === false) {
    add(
      'microphone_silent',
      'No audio was detected above the silence threshold during active capture.'
    );
  }

  return reasons;
}

async function captureMicrophone(
  report: PreCallMicrophoneReport,
  options: ResolvedMicrophoneOptions,
  env: BrowserEnv
): Promise<void> {
  if (typeof env.mediaDevices?.getUserMedia !== 'function') {
    report.activeCapturePerformed = false;
    report.captureError = 'not_supported';
    report.captureErrorMessage =
      'getUserMedia is not available in this environment';
    return;
  }

  let stream: MediaStream | undefined;
  let recording: RecordingResult | undefined;
  try {
    stream = await env.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    Object.assign(report, classifyCaptureError(error));
    report.activeCapturePerformed = false;
    if (report.captureError === 'permission_denied') {
      report.permissionState = 'denied';
      report.permissionGranted = false;
    } else if (report.captureError === 'no_device') {
      report.deviceAvailable = false;
    }
    return;
  }

  try {
    report.activeCapturePerformed = true;
    report.permissionState = 'granted';
    report.permissionGranted = true;
    report.deviceAvailable = true;

    let shouldRecord = options.record;
    if (shouldRecord) {
      report.recordingNotice = MICROPHONE_RECORDING_NOTICE;
      try {
        await options.onRecordingConsent?.(MICROPHONE_RECORDING_NOTICE);
      } catch {
        shouldRecord = false;
        report.recordingPerformed = false;
      }
    }

    const result = await Promise.all([
      measureAudioLevel(
        stream,
        options.sampleDurationMs,
        options.silenceThreshold,
        env
      ),
      shouldRecord
        ? recordAudio(stream, options.sampleDurationMs)
        : Promise.resolve(undefined),
    ]);
    const [level, recordingResult] = result;
    recording = recordingResult;

    report.audioLevel = level.audioLevel;
    report.audioDetected = level.audioDetected;
    report.audioLevelStats = level.audioLevelStats;

    if (shouldRecord) {
      report.recordingPerformed = Boolean(recording);
      if (recording) {
        report.recordingDataUrl = recording.recordingDataUrl;
        report.recordingMimeType = recording.recordingMimeType;
        report.recordingDurationMs = recording.recordingDurationMs;
      }
    }
  } finally {
    stopTracks(stream);
  }

  if (recording && options.playback) {
    report.playbackPerformed = await playRecording(
      recording.recordingDataUrl,
      recording.recordingDurationMs + 5000
    );
  }

  if (options.checkDeviceAvailability) {
    applyDeviceInfo(report, await listDevices(env));
  }
}

/** Run the microphone check and return its report section. */
export async function buildPreCallMicrophoneReport(
  context: PreCallDiagnosticContext,
  env: BrowserEnv = getBrowserEnv()
): Promise<PreCallMicrophoneReport | undefined> {
  const options = resolveOptions(context.options.microphone);
  const report: PreCallMicrophoneReport = {};

  if (options.checkPermission) {
    report.permissionState = await checkPermission(env);
    report.permissionGranted =
      report.permissionState === 'granted'
        ? true
        : report.permissionState === 'denied'
          ? false
          : undefined;
  }

  if (options.checkDeviceAvailability) {
    applyDeviceInfo(report, await listDevices(env));
  }

  if (options.activeCapture) {
    await captureMicrophone(report, options, env);
  }

  const reasons = buildReasons(report);
  if (reasons.length > 0) report.reasons = reasons;

  return Object.keys(report).length > 0 ? report : undefined;
}
