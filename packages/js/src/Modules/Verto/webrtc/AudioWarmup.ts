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
 * - scheduleRelease: called when peer connects; waits durationMs then ramps gain 0→1 over fadeInMs
 * - release: immediately ramp gain from 0 to 1 (used by safety timeout or forced release)
 * - cleanup: disconnect nodes, close/suspend AudioContext, clear timers
 * - active: whether the warm-up is still active (not yet released/cleaned up)
 */
export type AudioWarmupController = {
  stream: MediaStream;
  /** Schedule delayed release: wait durationMs then ramp gain 0→1. Call on peer connected. */
  scheduleRelease: () => void;
  /** Immediate release: ramp gain 0→1 now. Used by safety timeout or forced release. */
  release: () => void;
  /** Cleanup WebAudio nodes, close AudioContext, clear all timers. */
  cleanup: () => void;
  /** Whether warm-up gain is still at 0 (not yet released or faded in). */
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
 * Resolve the AudioContext constructor for cross-browser support.
 * Safari uses webkitAudioContext; Chrome/Firefox/Edge use AudioContext.
 */
function getAudioContextConstructor(): (new () => AudioContext) | null {
  if (typeof AudioContext !== 'undefined') {
    return AudioContext;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wkt = (window as any).webkitAudioContext;
  if (typeof wkt !== 'undefined') {
    return wkt;
  }
  return null;
}

/**
 * Create a WebAudio-based warm-up stream that sends initial outbound audio at
 * zero gain. When the peer connects, call scheduleRelease() which waits
 * durationMs then ramps gain to full over fadeInMs.
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

  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    logger.warn('Audio warmup fallback: AudioContext unavailable');
    return null;
  }

  let audioContext: AudioContext;
  try {
    audioContext = new AudioContextCtor();
  } catch {
    logger.warn('Audio warmup fallback: AudioContext constructor failed');
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
    let _releaseScheduled = false;
    let _released = false;
    let scheduleTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let safetyTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let activeCheckTimeoutId: ReturnType<typeof setTimeout> | null = null;

    /**
     * Immediately ramp gain from 0 to 1 over fadeInMs.
     * Used by scheduleRelease (after delay) and safety timeout.
     */
    const doRampRelease = () => {
      if (_released) {
        return;
      }
      _released = true;

      try {
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + config.fadeInMs / 1000);
        logger.info('Audio warmup released');
      } catch (e) {
        logger.warn('Audio warmup fallback: gain ramp failed', e);
      }

      // Mark as no longer active after fade-in completes
      activeCheckTimeoutId = setTimeout(() => {
        _active = false;
        controller.active = false;
      }, config.fadeInMs + 50);
    };

    const clearAllTimers = () => {
      if (scheduleTimeoutId !== null) {
        clearTimeout(scheduleTimeoutId);
        scheduleTimeoutId = null;
      }
      if (safetyTimeoutId !== null) {
        clearTimeout(safetyTimeoutId);
        safetyTimeoutId = null;
      }
      if (activeCheckTimeoutId !== null) {
        clearTimeout(activeCheckTimeoutId);
        activeCheckTimeoutId = null;
      }
    };

    const controller: AudioWarmupController = {
      stream: senderStream,
      active: true,

      /**
       * Schedule delayed release: wait durationMs then ramp gain 0→1.
       * Call this when peer connects (connectionState or iceConnectionState === 'connected').
       * Duplicate calls are no-ops (only the first schedules the timer).
       */
      scheduleRelease: () => {
        if (!_active || _releaseScheduled || _cleanedUp) {
          return;
        }
        _releaseScheduled = true;

        // Clear safety timeout — connected state means media path is up,
        // and we now control release timing ourselves
        if (safetyTimeoutId !== null) {
          clearTimeout(safetyTimeoutId);
          safetyTimeoutId = null;
        }

        logger.info(
          `Audio warmup release scheduled on peer connected, waiting ${config.durationMs}ms`
        );

        scheduleTimeoutId = setTimeout(() => {
          scheduleTimeoutId = null;
          doRampRelease();
        }, config.durationMs);
      },

      /**
       * Immediate release: ramp gain 0→1 now.
       * Used by safety timeout or forced release.
       */
      release: () => {
        if (!_active || _cleanedUp) {
          return;
        }

        // Clear schedule timeout if one was set
        if (scheduleTimeoutId !== null) {
          clearTimeout(scheduleTimeoutId);
          scheduleTimeoutId = null;
        }

        // Clear safety timeout
        if (safetyTimeoutId !== null) {
          clearTimeout(safetyTimeoutId);
          safetyTimeoutId = null;
        }

        doRampRelease();
      },

      cleanup: () => {
        if (_cleanedUp) {
          return; // Already cleaned up
        }
        _cleanedUp = true;

        clearAllTimers();

        _active = false;
        _released = true;
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

    // Safety timeout: if connection state event is never received, release anyway.
    // This ensures we never leave outbound audio permanently silent.
    safetyTimeoutId = setTimeout(() => {
      if (_active && !_released && !_releaseScheduled) {
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
