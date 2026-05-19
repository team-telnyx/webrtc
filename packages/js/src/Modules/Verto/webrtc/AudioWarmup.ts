import logger from '../util/logger';
import { IAudioWarmupOptions } from './interfaces';

/** Default warm-up durations */
const DEFAULT_DURATION_MS = 750;
const MAX_DURATION_MS = 3000;
const DEFAULT_FADE_IN_MS = 100;
const MAX_FADE_IN_MS = 1000;
/** Safety timeout margin added on top of durationMs */
const SAFETY_TIMEOUT_MARGIN_MS = 2000;

/**
 * Controller returned by createAudioWarmupStream.
 * - stream: the MediaStream to add to RTCPeerConnection (contains destination audio + original video)
 * - release: ramp gain from 0 to 1 (call when peer connected)
 * - cleanup: disconnect nodes, close/suspend AudioContext, clear timers
 * - active: whether the warm-up is still active (not yet released/cleaned up)
 */
export type AudioWarmupController = {
  stream: MediaStream;
  release: () => void;
  cleanup: () => void;
  active: boolean;
};

/**
 * Normalize the audioWarmup option into a resolved config, or null if disabled.
 */
export function normalizeAudioWarmupOptions(
  option: boolean | IAudioWarmupOptions | undefined
): { enabled: true; durationMs: number; fadeInMs: number } | null {
  if (option === undefined || option === false) {
    return null;
  }
  if (option === true) {
    return { enabled: true, durationMs: DEFAULT_DURATION_MS, fadeInMs: DEFAULT_FADE_IN_MS };
  }
  // Object form: enabled unless explicitly false
  if (option.enabled === false) {
    return null;
  }
  const durationMs = Math.max(0, Math.min(option.durationMs ?? DEFAULT_DURATION_MS, MAX_DURATION_MS));
  const fadeInMs = Math.max(0, Math.min(option.fadeInMs ?? DEFAULT_FADE_IN_MS, MAX_FADE_IN_MS));
  return { enabled: true, durationMs, fadeInMs };
}

/**
 * Create a WebAudio-based warm-up stream that sends initial outbound audio at
 * zero gain, then ramps to full gain on release().
 *
 * - Returns null if disabled, no audio track, AudioContext unavailable, or
 *   if any WebAudio error occurs (non-fatal fallback).
 * - Original inputStream is never mutated; a new senderStream is produced.
 * - Video tracks are passed through unchanged.
 * - microphoneLabel is preserved from the original track (set on userVariables if provided).
 */
export function createAudioWarmupStream(
  inputStream: MediaStream,
  option: boolean | IAudioWarmupOptions | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userVariables?: Record<string, any>
): AudioWarmupController | null {
  const config = normalizeAudioWarmupOptions(option);
  if (!config) {
    return null;
  }

  const audioTracks = inputStream.getAudioTracks();
  if (audioTracks.length === 0) {
    return null;
  }

  // We only handle the first audio track for warm-up
  const sourceTrack = audioTracks[0];

  // Preserve original microphone label
  const originalLabel = sourceTrack.label;
  if (userVariables && originalLabel) {
    userVariables.microphoneLabel = originalLabel;
  }

  let audioContext: AudioContext;
  try {
    audioContext = new AudioContext();
  } catch {
    logger.warn('Audio warmup fallback: AudioContext unavailable');
    return null;
  }

  try {
    const source = audioContext.createMediaStreamSource(inputStream);
    const gainNode = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();

    // Initial gain = 0 (silent)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    source.connect(gainNode);
    gainNode.connect(destination);

    const destinationAudioTrack = destination.stream.getAudioTracks()[0];

    // Build sender stream: destination audio + original video tracks
    const senderStream = new MediaStream();
    senderStream.addTrack(destinationAudioTrack);

    const videoTracks = inputStream.getVideoTracks();
    videoTracks.forEach((t) => senderStream.addTrack(t));

    let _active = true;
    let _cleanedUp = false;
    let safetyTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let released = false;

    const controller: AudioWarmupController = {
      stream: senderStream,
      active: true,
      release: () => {
        if (!_active || released) {
          return;
        }
        released = true;

        // Clear safety timeout if release triggered by connected state
        if (safetyTimeoutId !== null) {
          clearTimeout(safetyTimeoutId);
          safetyTimeoutId = null;
        }

        try {
          const now = audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(1, now + config.fadeInMs / 1000);
          logger.info('Audio warmup released');
        } catch (e) {
          logger.warn('Audio warmup fallback: gain ramp failed', e);
        }

        // Mark as no longer active after fade-in completes
        setTimeout(() => {
          _active = false;
          controller.active = false;
        }, config.fadeInMs + 50);
      },
      cleanup: () => {
        if (_cleanedUp) {
          return; // Already cleaned up
        }
        _cleanedUp = true;

        // Clear safety timeout
        if (safetyTimeoutId !== null) {
          clearTimeout(safetyTimeoutId);
          safetyTimeoutId = null;
        }

        _active = false;
        released = true;
        controller.active = false;

        try {
          source.disconnect();
          gainNode.disconnect();
        } catch {
          // Ignore disconnect errors on already-disconnected nodes
        }

        try {
          if (audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
          }
        } catch {
          // Ignore close errors
        }
      },
    };

    // Safety timeout: if connection state event is missed, release anyway
    safetyTimeoutId = setTimeout(() => {
      if (_active && !released) {
        logger.info('Audio warmup fallback: safety timeout');
        controller.release();
      }
    }, config.durationMs + SAFETY_TIMEOUT_MARGIN_MS);

    logger.info(
      `Audio warmup enabled durationMs=${config.durationMs} fadeInMs=${config.fadeInMs}`
    );

    return controller;
  } catch (e) {
    logger.warn('Audio warmup fallback: WebAudio setup failed', e);

    try {
      audioContext.close().catch(() => {});
    } catch {
      // Ignore
    }

    return null;
  }
}
