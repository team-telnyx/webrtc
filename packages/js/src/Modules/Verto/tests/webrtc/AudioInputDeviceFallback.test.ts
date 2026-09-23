import Verto from '../..';
import { clearQueue, register } from '../../services/Handler';
import { SwEvent } from '../../util/constants';
import {
  AUDIO_INPUT_DEVICE_CHANGE_SKIPPED,
  MEDIA_DEVICE_NOT_FOUND,
  MEDIA_GET_USER_MEDIA_FAILED,
  MEDIA_MICROPHONE_PERMISSION_DENIED,
} from '../../util/constants/errorCodes';
import Call from '../../webrtc/Call';
import Peer from '../../webrtc/Peer';
import { MediaStreamTrackMock } from '../setup/webrtcMocks';

const makeTrack = (kind: string, deviceId?: string) => {
  const track = new MediaStreamTrackMock();
  track.kind = kind;
  track.getSettings = () => (deviceId ? { deviceId } : {});
  jest.spyOn(track, 'stop');
  return track;
};

const makeStream = (...tracks: MediaStreamTrack[]) => {
  const stream = new MediaStream();
  tracks.forEach((track) => stream.addTrack(track));
  return stream;
};

// Exercise the real helpers.getUserMedia and util/webrtc wrapper; only browser
// capture and the RTP sender are mocked, not the fallback policy itself.
describe('setAudioInDevice fallback (VSDK-647)', () => {
  let call: Call;
  let oldAudio: MediaStreamTrackMock;
  let video: MediaStreamTrackMock;
  let oldStream: MediaStream;
  let newAudio: MediaStreamTrackMock;
  let newStream: MediaStream;
  let sender: { track: MediaStreamTrack; replaceTrack: jest.Mock };
  let capture: jest.SpyInstance;
  let mediaError: jest.Mock;
  let warning: jest.Mock;

  beforeEach(() => {
    const session = new Verto({
      host: 'example.fs.telnyx',
      login: 'login',
      passwd: 'passwd',
    });
    oldAudio = makeTrack('audio', 'old-mic');
    video = makeTrack('video', 'camera');
    oldStream = makeStream(oldAudio, video);
    call = new Call(session, {
      destinationNumber: '1234',
      micId: 'old-mic',
      localStream: oldStream,
    });
    // Preserve the existing event error contract without tearing down the
    // fixture through the normal media-error hangup handler.
    jest.spyOn(call, 'hangup').mockResolvedValue(undefined);
    sender = {
      track: oldAudio,
      replaceTrack: jest.fn().mockImplementation(async (track) => {
        sender.track = track;
      }),
    };
    call.peer = {
      instance: { getSenders: () => [sender] },
    } as unknown as Peer;
    newAudio = makeTrack('audio', 'effective-mic');
    newStream = makeStream(newAudio);
    capture = jest
      .spyOn(navigator.mediaDevices, 'getUserMedia')
      .mockReset()
      .mockResolvedValue(newStream);
    mediaError = jest.fn();
    warning = jest.fn();
    register(SwEvent.MediaError, mediaError, call.id);
    register(SwEvent.Warning, warning, call.id);
  });

  afterEach(() => {
    clearQueue();
    jest.restoreAllMocks();
  });

  const expectOldState = (muted = true) => {
    expect(call.options.localStream).toBe(oldStream);
    expect(call.options.micId).toBe('old-mic');
    expect(call.isAudioMuted).toBe(muted);
    expect(sender.track).toBe(oldAudio);
    expect(oldAudio.enabled).toBe(!muted);
    expect(oldAudio.stop).not.toHaveBeenCalled();
    expect(video.stop).not.toHaveBeenCalled();
  };

  const expectNewState = (muted: boolean, deviceId = 'effective-mic') => {
    expect(sender.replaceTrack).toHaveBeenCalledTimes(1);
    expect(sender.replaceTrack).toHaveBeenCalledWith(newAudio);
    expect(sender.track).toBe(newAudio);
    expect(newAudio.enabled).toBe(!muted);
    expect(call.isAudioMuted).toBe(muted);
    expect(call.options.micId).toBe(deviceId);
    expect(call.options.localStream).toBe(newStream);
    expect(newStream.getAudioTracks()).toEqual([newAudio]);
    expect(newStream.getVideoTracks()).toEqual([video]);
    expect(oldAudio.stop).toHaveBeenCalledTimes(1);
    expect(video.stop).not.toHaveBeenCalled();
    expect(newAudio.stop).not.toHaveBeenCalled();
    expect(mediaError).not.toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
  };

  it('requests the exact microphone and commits its actual device ID', async () => {
    await expect(
      call.setAudioInDevice('requested-mic')
    ).resolves.toBeUndefined();

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith({
      audio: { deviceId: { exact: 'requested-mic' } },
    });
    expectNewState(false);
  });

  it.each(['NotFoundError', 'NotReadableError', 'OverconstrainedError'])(
    'retries %s once without deviceId and preserves muted audio and video',
    async (name) => {
      call.muteAudio();
      capture.mockRejectedValueOnce(
        new DOMException('Device unavailable', name)
      );

      await expect(
        call.setAudioInDevice('missing-mic')
      ).resolves.toBeUndefined();

      expect(capture).toHaveBeenCalledTimes(2);
      expect(capture).toHaveBeenNthCalledWith(1, {
        audio: { deviceId: { exact: 'missing-mic' } },
      });
      expect(capture).toHaveBeenNthCalledWith(2, {
        audio: true,
        video: undefined,
      });
      expectNewState(true);
    }
  );

  it.each([{}, { deviceId: '' }, undefined])(
    'records default after fallback when track settings are %p',
    async (settings) => {
      newAudio.getSettings = () => settings;
      capture.mockRejectedValueOnce(new DOMException('', 'NotFoundError'));

      await call.setAudioInDevice('missing-mic');

      expect(capture).toHaveBeenCalledTimes(2);
      expectNewState(false, 'default');
    }
  );

  it.each([true, false])(
    'honors explicit muted=%s after fallback',
    async (muted) => {
      if (!muted) call.muteAudio();
      capture.mockRejectedValueOnce(new DOMException('', 'NotReadableError'));

      await call.setAudioInDevice('missing-mic', muted);

      expect(capture).toHaveBeenCalledTimes(2);
      expectNewState(muted);
    }
  );

  it('does not retry permission denial and reports it through the media event', async () => {
    call.muteAudio();
    const error = new DOMException('Permission denied', 'NotAllowedError');
    capture.mockRejectedValueOnce(error);

    await expect(
      call.setAudioInDevice('denied-mic', false)
    ).resolves.toBeUndefined();

    expect(capture).toHaveBeenCalledTimes(1);
    expect(sender.replaceTrack).not.toHaveBeenCalled();
    expectOldState();
    expect(mediaError).toHaveBeenCalledTimes(1);
    expect(mediaError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: MEDIA_MICROPHONE_PERMISSION_DENIED,
        originalError: error,
      })
    );
  });

  it('keeps old state and emits the original error when the fallback also fails', async () => {
    call.muteAudio();
    const error = new DOMException('Device missing', 'NotFoundError');
    capture
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(
        new DOMException('Default missing', 'NotFoundError')
      );

    await expect(
      call.setAudioInDevice('missing-mic', false)
    ).resolves.toBeUndefined();

    expect(capture).toHaveBeenCalledTimes(2);
    expect(sender.replaceTrack).not.toHaveBeenCalled();
    expectOldState();
    expect(mediaError).toHaveBeenCalledTimes(1);
    expect(mediaError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: MEDIA_DEVICE_NOT_FOUND,
        originalError: error,
      })
    );
  });

  it('disposes fallback tracks and keeps old state when replacement rejects', async () => {
    call.muteAudio();
    capture.mockRejectedValueOnce(new DOMException('', 'NotFoundError'));
    const error = new Error('Replacement rejected');
    sender.replaceTrack.mockRejectedValueOnce(error);
    const extraAudio = makeTrack('audio');
    newStream.addTrack(extraAudio);

    await expect(
      call.setAudioInDevice('missing-mic', false)
    ).resolves.toBeUndefined();

    expect(capture).toHaveBeenCalledTimes(2);
    expect(sender.replaceTrack).toHaveBeenCalledWith(newAudio);
    expectOldState();
    expect(newAudio.stop).toHaveBeenCalledTimes(1);
    expect(extraAudio.stop).toHaveBeenCalledTimes(1);
    expect(mediaError).toHaveBeenCalledTimes(1);
    expect(mediaError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: MEDIA_GET_USER_MEDIA_FAILED,
        originalError: error,
      })
    );
  });

  it('does not commit state until capture and replacement have both completed', async () => {
    call.muteAudio();
    let acquired: (stream: MediaStream) => void;
    capture.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          acquired = resolve;
        })
    );
    let replaced: () => void;
    const replacing = new Promise<void>((resolve) => {
      sender.replaceTrack.mockImplementationOnce(() => {
        resolve();
        return new Promise<void>((done) => {
          replaced = () => {
            sender.track = newAudio;
            done();
          };
        });
      });
    });

    const switching = call.setAudioInDevice('requested-mic', false);
    expectOldState();
    acquired(newStream);
    await replacing;
    expectOldState();
    expect(newAudio.enabled).toBe(true);
    replaced();
    await switching;
    expectNewState(false);
  });

  it('retains the no-sender warning without acquiring media or changing state', async () => {
    call.muteAudio();
    jest.spyOn(call.peer.instance, 'getSenders').mockReturnValue([]);

    await expect(
      call.setAudioInDevice('requested-mic', false)
    ).resolves.toBeUndefined();

    expect(capture).not.toHaveBeenCalled();
    expect(sender.replaceTrack).not.toHaveBeenCalled();
    expectOldState();
    expect(mediaError).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: call.id,
        deviceId: 'requested-mic',
        warning: expect.objectContaining({
          code: AUDIO_INPUT_DEVICE_CHANGE_SKIPPED,
        }),
      })
    );
  });
});
