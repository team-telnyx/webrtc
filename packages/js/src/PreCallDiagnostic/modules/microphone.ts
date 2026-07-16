/** Microphone permission, device, recording, playback, and level check. */

import type { PreCallDiagnosticContext } from '../context';
import type {
  PreCallAudioDevice,
  PreCallDiagnosticReason,
  PreCallMicrophoneOptions,
  PreCallMicrophoneReport,
} from '../types';

const DEFAULT_SAMPLE_DURATION_MS = 2000;
const DEFAULT_SAMPLE_INTERVAL_MS = 100;
const DEFAULT_SILENCE_THRESHOLD = 0.01;

export const MICROPHONE_RECORDING_NOTICE =
  'To check your microphone, we will be recorded your voice for a few seconds and played back to you so you can hear how it sounds.';

type CaptureErrorCode = NonNullable<PreCallMicrophoneReport['captureError']>;
type DeviceInfo = Pick<
  PreCallMicrophoneReport,
  'deviceAvailable' | 'deviceCount' | 'devices' | 'labelsAccessible'
>;
type AudioLevelResult = Pick<
  PreCallMicrophoneReport,
  'audioLevel' | 'audioDetected' | 'audioLevelStats'
>;
type RecordingResult = Required<
  Pick<
    PreCallMicrophoneReport,
    'recordingDataUrl' | 'recordingMimeType' | 'recordingDurationMs'
  >
>;

function resolveOptions(
  options: boolean | PreCallMicrophoneOptions | undefined
): PreCallMicrophoneOptions {
  const configured =
    options && typeof options === 'object' ? options : undefined;

  return {
    sampleDurationMs: Math.max(
      0,
      configured?.sampleDurationMs ?? DEFAULT_SAMPLE_DURATION_MS
    ),
    silenceThreshold: Math.min(
      1,
      Math.max(0, configured?.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD)
    ),
    record: configured?.record === true,
    warnOnRecording: configured?.warnOnRecording,
  };
}

async function checkPermission(): Promise<PermissionState | 'unknown'> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.permissions?.query !== 'function'
  ) {
    return 'unknown';
  }

  try {
    const status = await navigator.permissions.query({
      name: 'microphone',
    } as unknown as PermissionDescriptor);
    return status.state;
  } catch {
    return 'unknown';
  }
}

async function listDevices(): Promise<DeviceInfo | undefined> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.mediaDevices?.enumerateDevices !== 'function'
  ) {
    return undefined;
  }

  try {
    const devices = (await navigator.mediaDevices.enumerateDevices())
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

async function getUserMedia(): Promise<{
  report: Partial<PreCallMicrophoneReport>;
  stream: MediaStream | undefined;
}> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.mediaDevices?.getUserMedia !== 'function'
  ) {
    return {
      report: {
        activeCapturePerformed: false,
        captureError: 'not_supported',
        captureErrorMessage:
          'getUserMedia is not available in this environment',
      },
      stream: undefined,
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return {
      report: {
        deviceAvailable: true,
      },
      stream,
    };
  } catch (error) {
    const { captureError, captureErrorMessage } = classifyCaptureError(error);
    return {
      report: {
        activeCapturePerformed: false,
        captureError,
        captureErrorMessage,
        deviceAvailable: false,
      },
      stream: undefined,
    };
  }
}

async function measureAudioLevel(
  stream: MediaStream,
  durationMs: number,
  silenceThreshold: number
): Promise<AudioLevelResult | null> {
  if (typeof AudioContext === 'undefined') return null;

  let context: AudioContext | undefined;
  let analyser: AnalyserNode | undefined;
  let source: MediaStreamAudioSourceNode | undefined;

  try {
    context = new AudioContext();
    analyser = context.createAnalyser();
    source = context.createMediaStreamSource(stream);
    analyser.fftSize = 2048;
    source.connect(analyser);

    const samples = new Float32Array(analyser.fftSize);
    const deadline = Date.now() + durationMs;
    let peak = 0;
    let total = 0;
    let count = 0;

    while (Date.now() < deadline) {
      analyser.getFloatTimeDomainData(samples);
      let sumOfSquares = 0;
      for (const sample of samples) sumOfSquares += sample * sample;

      const rms = Math.sqrt(sumOfSquares / samples.length);
      peak = Math.max(peak, rms);
      total += rms;
      count += 1;

      const remainingMs = deadline - Date.now();
      if (remainingMs > 0) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, Math.min(DEFAULT_SAMPLE_INTERVAL_MS, remainingMs))
        );
      }
    }

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
    return null;
  } finally {
    try {
      source?.disconnect();
      analyser?.disconnect();
      await context?.close();
    } catch {
      // Cleanup is best effort.
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

function buildReasons(
  report: PreCallMicrophoneReport
): PreCallDiagnosticReason[] {
  const reasons: PreCallDiagnosticReason[] = [];
  const add = (code: string, message: string) =>
    reasons.push({ code, message, source: 'microphone' });

  if (report.currentPermissionState === 'denied') {
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

async function recordMicrophone(
  report: PreCallMicrophoneReport,
  stream: MediaStream,
  options: PreCallMicrophoneOptions
): Promise<RecordingResult | undefined> {
  report.activeCapturePerformed = true;
  report.recordingPerformed = options.record;

  if (options.record && options.warnOnRecording) {
    options.warnOnRecording(MICROPHONE_RECORDING_NOTICE);
  }

  const [level, recording] = await Promise.all([
    measureAudioLevel(
      stream,
      options.sampleDurationMs ?? DEFAULT_SAMPLE_DURATION_MS,
      options.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD
    ),
    options.record
      ? recordAudio(
          stream,
          options.sampleDurationMs ?? DEFAULT_SAMPLE_DURATION_MS
        )
      : Promise.resolve(undefined),
  ]);

  if (level) {
    report.audioLevel = level.audioLevel;
    report.audioDetected = level.audioDetected;
    report.audioLevelStats = level.audioLevelStats;
  }

  if (recording) {
    report.recordingDataUrl = recording.recordingDataUrl;
    report.recordingMimeType = recording.recordingMimeType;
    report.recordingDurationMs = recording.recordingDurationMs;
    report.recordingPerformed = true;
  }

  return recording;
}

/** Run the microphone check and return its report section. */
export async function buildPreCallMicrophoneReport(
  context: PreCallDiagnosticContext
): Promise<PreCallMicrophoneReport | undefined> {
  const options = resolveOptions(context.options.microphone);

  const permissionState = await checkPermission();
  const { report: userMediaReport, stream } = await getUserMedia();
  const listInfo = await listDevices();
  const currentPermissionState = stream
    ? 'granted'
    : userMediaReport.captureError === 'permission_denied'
      ? 'denied'
      : permissionState;

  const report: PreCallMicrophoneReport = {
    currentPermissionState,
    isPermissionGrantedCurrently: currentPermissionState === 'granted',
    isGetUserMediaFailed: !stream,
    deviceAvailable:
      listInfo?.deviceAvailable || userMediaReport.deviceAvailable || false,
    deviceCount: listInfo?.deviceCount ?? 0,
    devices: listInfo?.devices ?? [],
    labelsAccessible: listInfo?.labelsAccessible,
    captureError: userMediaReport.captureError,
    captureErrorMessage: userMediaReport.captureErrorMessage,
    activeCapturePerformed: userMediaReport.activeCapturePerformed,
  };

  if (stream) {
    try {
      const recording = await recordMicrophone(report, stream, options);
      if (recording) {
        report.playbackPerformed = await playRecording(
          recording.recordingDataUrl,
          recording.recordingDurationMs + 5000
        );
      }
    } finally {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        // Tracks may already have ended.
      }
    }
  }

  const reasons = buildReasons(report);
  if (reasons.length > 0) report.reasons = reasons;

  return Object.keys(report).length > 0 ? report : undefined;
}
