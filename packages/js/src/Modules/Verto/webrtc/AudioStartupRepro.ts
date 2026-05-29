import logger from '../util/logger';
import { IAudioStartupReproOptions } from './interfaces';

const DEFAULT_FREQUENCY_HZ = 440;
const MIN_FREQUENCY_HZ = 20;
const MAX_FREQUENCY_HZ = 4000;
const DEFAULT_GAIN = 0.2;
const MIN_GAIN = 0;
const MAX_GAIN = 1;

export type AudioStartupReproController = {
  /** Stream to add to RTCPeerConnection: generated audio + original video tracks. */
  stream: MediaStream;
  /** Stop generated audio and close WebAudio resources. */
  cleanup: () => void;
};

export function normalizeAudioStartupReproOptions(
  option: boolean | IAudioStartupReproOptions | undefined
): { enabled: true; frequencyHz: number; gain: number } | null {
  if (option === undefined || option === false) {
    return null;
  }

  if (option === true) {
    return {
      enabled: true,
      frequencyHz: DEFAULT_FREQUENCY_HZ,
      gain: DEFAULT_GAIN,
    };
  }

  if (option.enabled === false) {
    return null;
  }

  const frequencyHz = Math.max(
    MIN_FREQUENCY_HZ,
    Math.min(option.frequencyHz ?? DEFAULT_FREQUENCY_HZ, MAX_FREQUENCY_HZ)
  );
  const gain = Math.max(
    MIN_GAIN,
    Math.min(option.gain ?? DEFAULT_GAIN, MAX_GAIN)
  );

  return { enabled: true, frequencyHz, gain };
}

function getAudioContextConstructor(): (new () => AudioContext) | null {
  if (typeof AudioContext !== 'undefined') {
    return AudioContext;
  }

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webkitAudioContext = (window as any).webkitAudioContext;
    if (typeof webkitAudioContext !== 'undefined') {
      return webkitAudioContext;
    }
  }

  return null;
}

/**
 * Create an SDK-level deterministic outbound audio source for startup repros.
 *
 * This is intentionally not a mitigation: oscillator audio starts immediately
 * when the sender stream is created, so the far end receives meaningful audio
 * as early as the peer/media path allows. Use it to compare against warm-up or
 * delayed-audio branches while keeping the app/demo code unchanged.
 */
export function createAudioStartupReproStream(
  inputStream: MediaStream,
  option: boolean | IAudioStartupReproOptions | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userVariables?: Record<string, any>
): AudioStartupReproController | null {
  const config = normalizeAudioStartupReproOptions(option);
  if (!config) {
    return null;
  }

  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    logger.warn('Audio startup repro disabled: AudioContext unavailable');
    return null;
  }

  let audioContext: AudioContext;
  try {
    audioContext = new AudioContextCtor();
  } catch (e) {
    logger.warn(
      'Audio startup repro disabled: AudioContext constructor failed',
      e
    );
    return null;
  }

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();

    oscillator.type = 'sine';
    oscillator.frequency.value = config.frequencyHz;
    gainNode.gain.setValueAtTime(config.gain, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(destination);
    oscillator.start(0);

    const destinationAudioTrack = destination.stream.getAudioTracks()[0];
    const senderStream = new MediaStream();
    senderStream.addTrack(destinationAudioTrack);
    inputStream
      .getVideoTracks()
      .forEach((track) => senderStream.addTrack(track));

    const originalAudioTrack = inputStream.getAudioTracks()[0];
    if (userVariables && originalAudioTrack?.label) {
      userVariables.microphoneLabel = originalAudioTrack.label;
    }

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;

      try {
        oscillator.stop();
      } catch {
        // Ignore: oscillator may already be stopped by browser teardown.
      }

      try {
        oscillator.disconnect();
        gainNode.disconnect();
      } catch {
        // Ignore disconnect errors on already-disconnected nodes.
      }

      try {
        if (audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
      } catch {
        // Ignore close errors.
      }
    };

    logger.info(
      `Audio startup repro enabled frequencyHz=${config.frequencyHz} gain=${config.gain}`
    );

    return { stream: senderStream, cleanup };
  } catch (e) {
    logger.warn('Audio startup repro disabled: WebAudio setup failed', e);
    try {
      audioContext.close().catch(() => {});
    } catch {
      // Ignore.
    }
    return null;
  }
}
