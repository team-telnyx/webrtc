import Verto from '../..';
import { clearQueue, register, trigger } from '../../services/Handler';
import { createTelnyxError } from '../../util/errors';
import { MEDIA_GET_USER_MEDIA_FAILED } from '../../util/constants/errorCodes';
import { SwEvent } from '../../util/constants';
import { State } from '../../webrtc/constants';
import logger from '../../util/logger';
import Call from '../../webrtc/Call';
import Peer from '../../webrtc/Peer';
import { MediaStreamTrackMock } from '../setup/webrtcMocks';

const device = (kind: MediaDeviceKind, deviceId: string, groupId = deviceId) =>
  ({ kind, deviceId, groupId, label: deviceId }) as MediaDeviceInfo;
const mic = device('audioinput', 'headset-mic', 'headset');
const speaker = device('audiooutput', 'headset-out', 'headset');
const builtIn = [
  device('audioinput', 'internal-mic'),
  device('audiooutput', 'internal-out'),
];
const inventory = [mic, speaker, ...builtIn];
const track = (kind: string, deviceId: string) => {
  const result = new MediaStreamTrackMock();
  result.kind = kind;
  result.getSettings = () => ({ deviceId });
  jest.spyOn(result, 'stop');
  return result;
};
const stream = (...tracks: MediaStreamTrack[]) => {
  const result = new MediaStream();
  tracks.forEach((t) => result.addTrack(t));
  return result;
};
const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const deferred = <T>() => {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve: (value: T) => resolve(value) };
};

describe('call-local audio device disconnect recovery (VSDK-645)', () => {
  let call: Call;
  let audio: MediaStreamTrackMock;
  let video: MediaStreamTrackMock;
  let replacement: MediaStreamTrackMock;
  let sender: { track: MediaStreamTrack; replaceTrack: jest.Mock };
  let element: HTMLAudioElement & { sinkId: string; setSinkId: jest.Mock };
  let enumerate: jest.SpyInstance;
  let capture: jest.SpyInstance;
  let listeners: Set<EventListener>;
  let mediaError: jest.Mock;
  let hangup: jest.SpyInstance;
  const fire = () =>
    listeners.forEach((listener) => listener(new Event('devicechange')));
  const change = async (devices: MediaDeviceInfo[]) => {
    enumerate.mockResolvedValue(devices);
    fire();
    await flush();
  };
  const start = async () => {
    call.setState(State.Active);
    jest.runOnlyPendingTimers();
    await flush();
    element.setSinkId.mockClear();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    Object.assign(performance, {
      mark: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      getEntriesByName: jest.fn(() => []),
    });
    listeners = new Set();
    Object.assign(navigator.mediaDevices, {
      addEventListener: jest.fn((_name, handler) => listeners.add(handler)),
      removeEventListener: jest.fn((_name, handler) =>
        listeners.delete(handler)
      ),
    });
    enumerate = jest
      .spyOn(navigator.mediaDevices, 'enumerateDevices')
      .mockReset()
      .mockResolvedValue(inventory);
    const session = new Verto({
      host: 'example.fs.telnyx',
      login: 'login',
      passwd: 'passwd',
    });
    jest
      .spyOn(session, 'startSignalingHealthMonitor')
      .mockImplementation(() => {});
    audio = track('audio', mic.deviceId);
    video = track('video', 'camera');
    replacement = track('audio', 'internal-mic');
    element = document.createElement('audio') as typeof element;
    element.sinkId = speaker.deviceId;
    element.setSinkId = jest.fn(async (id) => {
      element.sinkId = id;
    });
    call = new Call(session, {
      destinationNumber: '1234',
      localStream: stream(audio, video),
      remoteElement: element,
      micId: 'stale-requested-mic',
      speakerId: speaker.deviceId,
    });
    sender = {
      track: audio,
      replaceTrack: jest.fn(async (t) => {
        sender.track = t;
      }),
    };
    call.peer = {
      instance: { getSenders: () => [sender], close: jest.fn() },
      tryCollectTimings: jest.fn(),
      close: jest.fn(),
    } as unknown as Peer;
    capture = jest
      .spyOn(navigator.mediaDevices, 'getUserMedia')
      .mockReset()
      .mockResolvedValue(stream(replacement));
    mediaError = jest.fn();
    register(SwEvent.MediaError, mediaError, call.id);
    hangup = jest.spyOn(call, 'hangup').mockResolvedValue(undefined);
    jest.spyOn(logger, 'warn');
  });
  afterEach(() => {
    call.setState(State.Destroy);
    clearQueue();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('recovers a manually selected microphone removed before the next scan', async () => {
    await start();
    await call.setAudioInDevice('internal-mic');
    capture.mockClear().mockResolvedValue(stream(track('audio', mic.deviceId)));
    await change(inventory.filter((d) => d.deviceId !== 'internal-mic'));
    expect(capture).toHaveBeenCalledTimes(1);
    expect(call.options.micId).toBe(mic.deviceId);
  });

  it('recovers a manually selected speaker removed before the next scan', async () => {
    await start();
    await call.setAudioOutDevice('internal-out');
    element.setSinkId.mockClear();
    await change(inventory.filter((d) => d.deviceId !== 'internal-out'));
    expect(element.setSinkId).toHaveBeenCalledWith('default');
    expect(capture).not.toHaveBeenCalled();
  });

  it('binds a new default track using the inventory after pending recovery', async () => {
    await start();
    const pending = deferred<MediaStream>();
    capture.mockReturnValueOnce(pending.promise);
    const firstDefault = device('audioinput', 'default', 'internal-mic');
    await change([speaker, ...builtIn, firstDefault]);
    const nextMic = device('audioinput', 'next-mic');
    const nextDefault = device('audioinput', 'default', 'next-mic');
    await change([speaker, ...builtIn, nextMic, nextDefault]);
    replacement.getSettings = () => ({ deviceId: 'default' });
    pending.resolve(stream(replacement));
    await flush();
    expect(capture).toHaveBeenCalledTimes(1);
    capture.mockResolvedValue(stream(track('audio', 'internal-mic')));
    await change([speaker, ...builtIn, firstDefault]);
    expect(capture).toHaveBeenCalledTimes(2);
  });

  it('recovers the actual sender microphone, preserving mute and video', async () => {
    await start();
    call.muteAudio();
    await change(inventory.filter((d) => d !== mic));
    expect(capture).toHaveBeenCalledWith({
      audio: { deviceId: { exact: 'default' } },
    });
    expect(sender.track).toBe(replacement);
    expect(replacement.enabled).toBe(false);
    expect(call.isAudioMuted).toBe(true);
    expect(call.options.localStream.getVideoTracks()).toEqual([video]);
    expect(video.stop).not.toHaveBeenCalled();
    expect(element.setSinkId).not.toHaveBeenCalled();
    expect(call.options.micId).toBe('internal-mic');
  });
  it('recovers only the actual output sink without recapturing media', async () => {
    await start();
    call.options.speakerId = 'stale-requested-speaker';
    await change(inventory.filter((d) => d !== speaker));
    expect(element.setSinkId).toHaveBeenCalledWith('default');
    expect(call.options.speakerId).toBe('default');
    expect(capture).not.toHaveBeenCalled();
  });
  it('recovers both sides of a disconnected headset once and never switches back', async () => {
    await start();
    await change(builtIn);
    await change(builtIn);
    await change(inventory);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(element.setSinkId).toHaveBeenCalledTimes(1);
    expect(sender.track).toBe(replacement);
  });
  it('ignores unrelated removal and addition, even with stale requested IDs', async () => {
    await start();
    await change([mic, speaker]);
    await change(inventory);
    expect(capture).not.toHaveBeenCalled();
    expect(element.setSinkId).not.toHaveBeenCalled();
  });
  it.each(['default', 'communications'])(
    'resolves %s aliases using the previous physical group',
    async (alias) => {
      audio.getSettings = () => ({ deviceId: alias });
      element.sinkId = alias;
      call.options.speakerId = alias;
      enumerate.mockResolvedValue([
        ...inventory,
        device('audioinput', alias, 'headset'),
        device('audiooutput', alias, 'headset'),
      ]);
      await start();
      await change([
        ...builtIn,
        device('audioinput', alias, 'internal-mic'),
        device('audiooutput', alias, 'internal-out'),
      ]);
      expect(capture).toHaveBeenCalledTimes(1);
      expect(element.setSinkId).toHaveBeenCalledWith('default');
    }
  );
  it('retains the bound physical default identity when OS default changes without removal', async () => {
    audio.getSettings = () => ({ deviceId: 'default' });
    enumerate.mockResolvedValue([
      ...inventory,
      device('audioinput', 'default', 'headset'),
    ]);
    await start();
    await change([
      ...inventory,
      device('audioinput', 'default', 'internal-mic'),
    ]);
    expect(capture).not.toHaveBeenCalled();
    await change([
      ...builtIn,
      speaker,
      device('audioinput', 'default', 'internal-mic'),
    ]);
    expect(capture).toHaveBeenCalledTimes(1);
  });
  it.each(['missing', 'throwing', 'ambiguous'])(
    'does not guess the microphone when settings are %s',
    async (mode) => {
      if (mode === 'missing') audio.getSettings = undefined;
      if (mode === 'throwing')
        audio.getSettings = () => {
          throw new Error('unsupported');
        };
      if (mode === 'ambiguous')
        audio.getSettings = () => ({ deviceId: 'default' });
      await start();
      await change(builtIn);
      expect(capture).not.toHaveBeenCalled();
    }
  );
  it.each(
    [
      [],
      [speaker],
      [device('audioinput', '')],
      [device('audioinput', 'default')],
    ].map((devices) => [devices])
  )(
    'does not treat incomplete inventory %p as proof of removal',
    async (devices) => {
      await start();
      await change(devices);
      expect(capture).not.toHaveBeenCalled();
      await change([speaker, ...builtIn]);
      expect(capture).toHaveBeenCalledTimes(1);
    }
  );
  it('retains the previous inventory across enumeration failures', async () => {
    await start();
    enumerate.mockRejectedValueOnce(new Error('enumeration failed'));
    fire();
    await flush();
    expect(capture).not.toHaveBeenCalled();
    await change([speaker, ...builtIn]);
    expect(capture).toHaveBeenCalledTimes(1);
  });
  it('discards a stale enumeration when a newer event arrives', async () => {
    await start();
    const pending = deferred<MediaDeviceInfo[]>();
    enumerate.mockImplementationOnce(() => pending.promise);
    fire();
    fire();
    pending.resolve(builtIn);
    await flush();
    expect(capture).not.toHaveBeenCalled();
    expect(element.setSinkId).not.toHaveBeenCalled();
  });
  it('coalesces repeated events while acquisition is in flight', async () => {
    await start();
    const pending = deferred<MediaStream>();
    capture.mockImplementationOnce(() => pending.promise);
    await change(builtIn);
    fire();
    fire();
    await flush();
    expect(capture).toHaveBeenCalledTimes(1);
    pending.resolve(stream(replacement));
    await flush();
    expect(capture).toHaveBeenCalledTimes(1);
    expect(element.setSinkId).toHaveBeenCalledTimes(1);
  });
  it.each(['capture', 'replacement'])(
    'reports %s failure without retry loops or hanging up working media',
    async (phase) => {
      await start();
      const globalMediaError = jest.fn();
      register(SwEvent.MediaError, globalMediaError);
      if (phase === 'capture')
        capture.mockRejectedValue(
          new DOMException('Denied', 'NotAllowedError')
        );
      else
        sender.replaceTrack.mockRejectedValue(new Error('replacement failed'));
      await change([speaker, ...builtIn]);
      await change([speaker, ...builtIn]);
      expect(capture).toHaveBeenCalledTimes(1);
      expect(mediaError).toHaveBeenCalledTimes(1);
      expect(globalMediaError).toHaveBeenCalledTimes(1);
      expect(globalMediaError).toHaveBeenCalledWith(
        mediaError.mock.calls[0][0]
      );
      if (phase === 'replacement') expect(replacement.stop).toHaveBeenCalled();
      expect(hangup).not.toHaveBeenCalled();
      expect(sender.track).toBe(audio);
      expect(audio.stop).not.toHaveBeenCalled();
      expect(video.stop).not.toHaveBeenCalled();
    }
  );
  it('does not commit a failed output switch or loop on it', async () => {
    await start();
    element.setSinkId.mockRejectedValue(new Error('sink failed'));
    await change([mic, ...builtIn]);
    await change([mic, ...builtIn]);
    expect(element.setSinkId).toHaveBeenCalledTimes(1);
    expect(call.options.speakerId).toBe(speaker.deviceId);
    expect(logger.warn).toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
  it('skips unsupported sink routing', async () => {
    await start();
    element.setSinkId = undefined;
    await change([mic, ...builtIn]);
    expect(call.options.speakerId).toBe(speaker.deviceId);
    expect(capture).not.toHaveBeenCalled();
  });
  it('does not route an output from an obsolete inventory while input recovery awaits capture', async () => {
    await start();
    const pending = deferred<MediaStream>();
    capture.mockImplementationOnce(() => pending.promise);
    await change(builtIn);
    await change(inventory);
    pending.resolve(stream(replacement));
    await flush();
    expect(capture).toHaveBeenCalledTimes(1);
    expect(element.setSinkId).not.toHaveBeenCalled();
  });
  it('does not suppress unrelated media failures while recovery is acquiring', async () => {
    await start();
    const pending = deferred<MediaStream>();
    capture.mockImplementationOnce(() => pending.promise);
    await change([speaker, ...builtIn]);
    const error = createTelnyxError(
      MEDIA_GET_USER_MEDIA_FAILED,
      new Error('unrelated peer failure')
    );
    trigger(SwEvent.MediaError, error, call.id);
    expect(hangup).toHaveBeenCalledTimes(1);
    pending.resolve(stream(replacement));
    await flush();
  });
  it('keeps one listener across held/active and removes it on teardown', async () => {
    await start();
    call.setState(State.Held);
    call.setState(State.Active);
    await flush();
    expect(listeners.size).toBe(1);
    call.setState(State.Destroy);
    expect(listeners.size).toBe(0);
  });
  it('does not install a late listener after teardown during initial enumeration', async () => {
    const pending = deferred<MediaDeviceInfo[]>();
    enumerate.mockImplementationOnce(() => pending.promise);
    call.setState(State.Active);
    call.setState(State.Destroy);
    pending.resolve(inventory);
    await flush();
    expect(listeners.size).toBe(0);
  });
  it.each(['capture', 'replacement'])(
    'disposes new media without committing after teardown during %s',
    async (phase) => {
      await start();
      const acquiring = deferred<MediaStream>();
      const replacing = deferred<void>();
      if (phase === 'capture')
        capture.mockImplementationOnce(() => acquiring.promise);
      else sender.replaceTrack.mockImplementationOnce(() => replacing.promise);
      const oldStream = call.options.localStream;
      await change(builtIn);
      call.setState(State.Destroy);
      acquiring.resolve(stream(replacement));
      replacing.resolve(undefined);
      await flush();
      expect(replacement.stop).toHaveBeenCalled();
      expect(call.options.localStream).toBe(oldStream);
      expect(call.options.micId).toBe('stale-requested-mic');
      if (phase === 'capture')
        expect(sender.replaceTrack).not.toHaveBeenCalled();
      expect(element.setSinkId).not.toHaveBeenCalled();
    }
  );
});
