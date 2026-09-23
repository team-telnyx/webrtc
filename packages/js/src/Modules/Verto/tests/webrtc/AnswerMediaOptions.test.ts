import Verto from '../..';
import Call from '../../webrtc/Call';
import Peer from '../../webrtc/Peer';
import { State } from '../../webrtc/constants';
import { AnswerParams, IVertoCallOptions } from '../../webrtc/interfaces';
import { assureDeviceId } from '../../webrtc/helpers';
import { clearQueue } from '../../services/Handler';
import { MediaStreamTrackMock } from '../setup/webrtcMocks';

Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn().mockReturnValue({ duration: 0 }),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    now: jest.fn().mockReturnValue(0),
  },
});

const device = (deviceId: string, kind: MediaDeviceKind, label = deviceId) => ({
  deviceId,
  kind,
  label,
  groupId: deviceId,
  toJSON: () => ({}),
});
const devices = [
  device('mic-a', 'audioinput'),
  device('mic-b', 'audioinput'),
  device('cam-a', 'videoinput'),
  device('cam-b', 'videoinput'),
];
const streamFor = ({ audio, video }: MediaStreamConstraints) => {
  const stream = new MediaStream();
  for (const kind of ['audio', 'video']) {
    if (kind === 'audio' ? audio : video) {
      const track = new MediaStreamTrackMock();
      track.kind = kind;
      stream.addTrack(track);
    }
  }
  return stream;
};

const answer = (call: Call, params: AnswerParams = {}) => call.answer(params);

// These tests use the real Call -> Peer -> constraints/fallback pipeline;
// only the browser media APIs and native RTCPeerConnection are test doubles.
describe('answer media/device options', () => {
  let session: Verto;
  let capture: jest.SpyInstance;
  let enumerate: jest.SpyInstance;
  const calls: Call[] = [];
  const inbound = (options: IVertoCallOptions = {}) => {
    const call = new Call(session, {
      // The shared Jest UUID mock returns one constant; calls need distinct IDs.
      id: `answer-call-${calls.length}`,
      remoteSdp: 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
      ...options,
    });
    calls.push(call);
    return call;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    session = new Verto({ login: 'test', passwd: 'test' });
    capture = jest
      .spyOn(navigator.mediaDevices, 'getUserMedia')
      .mockReset()
      .mockImplementation(async (constraints) => streamFor(constraints));
    enumerate = jest
      .spyOn(navigator.mediaDevices, 'enumerateDevices')
      .mockReset()
      .mockResolvedValue(devices);
  });

  afterEach(async () => {
    for (const call of calls.splice(0)) {
      await call.peer?.close();
      call.setState(State.Destroy);
    }
    jest.clearAllTimers();
    clearQueue();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('uses overrides on the initial call capture and matches newCall without replacement capture', async () => {
    const params: AnswerParams = {
      micId: 'mic-b',
      micLabel: 'mic-b',
      speakerId: 'speaker-b',
      camId: 'cam-b',
      camLabel: 'cam-b',
      audio: { echoCancellation: false, sampleRate: { ideal: 48000 } },
      video: { width: { ideal: 1280 } },
    };
    const call = inbound({ micId: 'mic-a', camId: 'cam-a' });
    await answer(call, params);
    const expected = {
      audio: {
        ...(params.audio as MediaTrackConstraints),
        deviceId: { exact: 'mic-b' },
      },
      video: {
        ...(params.video as MediaTrackConstraints),
        deviceId: { exact: 'cam-b' },
      },
    };
    expect(call.options).toMatchObject(params);
    // Existing device discovery acquires and stops a permission stream per kind.
    const expectedCaptures = [
      [{ audio: true, video: false }],
      [{ audio: false, video: true }],
      [expected],
    ];
    expect(capture.mock.calls).toEqual(expectedCaptures);
    expect(call.localStream.getAudioTracks()).toHaveLength(1);
    expect(call.localStream.getVideoTracks()).toHaveLength(1);

    capture.mockClear();
    const init = jest.spyOn(Peer.prototype, 'init');
    calls.push(session.newCall({ destinationNumber: '1234', ...params }));
    await init.mock.results[0].value;
    expect(capture.mock.calls).toEqual(expectedCaptures);
  });

  it.each([
    {},
    {
      micId: undefined,
      micLabel: undefined,
      speakerId: undefined,
      camId: undefined,
      camLabel: undefined,
      audio: undefined,
      video: undefined,
    },
  ])(
    'retains inherited options for omitted or undefined fields: %p',
    async (params) => {
      session.micId = 'mic-a';
      session.micLabel = 'mic-a';
      session.camId = 'cam-a';
      session.camLabel = 'cam-a';
      session.speaker = 'speaker-a';
      const call = inbound({ audio: { echoCancellation: true }, video: true });
      const defaults = { ...call.options };
      await answer(call, params);
      for (const key of [
        'micId',
        'micLabel',
        'speakerId',
        'camId',
        'camLabel',
        'audio',
        'video',
      ]) {
        expect(call.options[key]).toEqual(defaults[key]);
      }
      expect(capture).toHaveBeenLastCalledWith({
        audio: { echoCancellation: true, deviceId: { exact: 'mic-a' } },
        video: { deviceId: { exact: 'cam-a' } },
      });
    }
  );

  it('preserves explicit false despite inherited microphone and camera IDs', async () => {
    const call = inbound({
      micId: 'mic-a',
      camId: 'cam-a',
      receiveOnlyAudio: true,
    });
    await answer(call, { audio: false, video: false });
    expect(call.options.audio).toBe(false);
    expect(call.options.video).toBe(false);
    expect(capture).not.toHaveBeenCalled();
    expect(enumerate).not.toHaveBeenCalled();
    expect(call.peer.instance).not.toBeNull();
  });

  it('leaves explicit false inherited from call options disabled', async () => {
    const call = inbound({
      audio: false,
      video: false,
      receiveOnlyAudio: true,
    });
    await answer(call, { micId: 'mic-b', camId: 'cam-b' });
    expect(capture).not.toHaveBeenCalled();
    expect(enumerate).not.toHaveBeenCalled();
    expect(call.options).toMatchObject({
      micId: 'mic-b',
      camId: 'cam-b',
      audio: false,
      video: false,
    });
  });

  it('preserves headers and elements and routes the speaker through the active-call output path', async () => {
    const remoteElement = document.createElement('audio');
    const localElement = document.createElement('video');
    const sink = jest.fn().mockResolvedValue(undefined);
    Object.assign(remoteElement, { setSinkId: sink });
    const customHeaders = [{ name: 'X-Test', value: 'answer' }];
    const call = inbound();
    await answer(call, {
      micId: 'mic-b',
      speakerId: 'speaker-b',
      remoteElement,
      localElement,
      customHeaders,
    });
    expect(call.options.customHeaders).toEqual(customHeaders);
    expect(call.options.remoteElement).toBe(remoteElement);
    expect(call.options.localElement).toBe(localElement);
    expect(localElement.srcObject).toBe(call.localStream);
    expect(sink).not.toHaveBeenCalled();
    call.setState(State.Active);
    jest.advanceTimersByTime(0);
    expect(sink).toHaveBeenCalledWith('speaker-b');
  });

  it('ignores duplicate answers before and after initial media setup without changing options', async () => {
    const call = inbound();
    const first = answer(call, { micId: 'mic-a', speakerId: 'speaker-a' });
    await answer(call, {
      micId: 'mic-b',
      speakerId: 'speaker-b',
      audio: false,
    });
    await first;
    const stream = call.localStream;
    await answer(call, { micId: 'mic-b', audio: false });
    expect(call.options).toMatchObject({
      micId: 'mic-a',
      speakerId: 'speaker-a',
      audio: true,
    });
    expect(call.localStream).toBe(stream);
    expect(capture.mock.calls).toEqual([
      [{ audio: true, video: false }],
      [{ audio: { deviceId: { exact: 'mic-a' } }, video: false }],
    ]);
  });

  it('keeps client defaults, another call, and caller-owned nested constraints unchanged', async () => {
    const audio = {
      echoCancellation: true,
      sampleRate: { ideal: 48000 },
      advanced: [{ channelCount: 1 }],
    };
    const video = { width: { ideal: 640 }, advanced: [{ frameRate: 15 }] };
    jest
      .spyOn(session, 'mediaConstraints', 'get')
      .mockReturnValue({ audio, video });
    session.micId = 'mic-a';
    const original = JSON.parse(JSON.stringify({ audio, video }));
    const first = inbound();
    const second = inbound();
    await Promise.all([
      answer(first, { micId: 'mic-b', camId: 'cam-b', audio, video }),
      answer(second, { micId: 'mic-a', camId: 'cam-a' }),
    ]);
    expect({ audio, video }).toEqual(original);
    expect(session.mediaConstraints).toEqual(original);
    expect(session.micId).toBe('mic-a');
    expect(first.options.micId).toBe('mic-b');
    expect(second.options.micId).toBe('mic-a');
    expect(capture.mock.calls).toEqual(
      expect.arrayContaining([
        [
          {
            audio: { ...audio, deviceId: { exact: 'mic-b' } },
            video: { ...video, deviceId: { exact: 'cam-b' } },
          },
        ],
        [
          {
            audio: { ...audio, deviceId: { exact: 'mic-a' } },
            video: { ...video, deviceId: { exact: 'cam-a' } },
          },
        ],
      ])
    );
    expect(capture).toHaveBeenCalledTimes(6);
  });

  it('reuses a valid localStream without acquiring replacement devices', async () => {
    const localStream = streamFor({ audio: true });
    const stop = jest.spyOn(localStream.getAudioTracks()[0], 'stop');
    const call = inbound({ localStream });
    await answer(call, {
      micId: 'mic-b',
      camId: 'cam-b',
      audio: false,
      video: false,
    });
    expect(call.localStream).toBe(localStream);
    expect(stop).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    expect(enumerate).not.toHaveBeenCalled();
  });

  it('uses the existing fallback after a selected microphone becomes unavailable at capture', async () => {
    const error = Object.assign(new Error('Microphone was unplugged'), {
      name: 'OverconstrainedError',
    });
    capture
      .mockResolvedValueOnce(streamFor({ audio: true })) // discovery
      .mockRejectedValueOnce(error);
    const call = inbound();
    await answer(call, { micId: 'mic-b', audio: { echoCancellation: false } });
    expect(capture.mock.calls).toEqual([
      [{ audio: true, video: false }],
      [
        {
          audio: { echoCancellation: false, deviceId: { exact: 'mic-b' } },
          video: false,
        },
      ],
      [{ audio: { echoCancellation: false }, video: false }],
    ]);
    expect(call.localStream.getAudioTracks()).toHaveLength(1);
  });

  it('falls back for an invalid exact mic constraint without mutating the supplied constraint', async () => {
    const audio = { deviceId: { exact: 'missing' }, echoCancellation: false };
    const error = Object.assign(new Error('Unknown device'), {
      name: 'NotFoundError',
    });
    capture.mockRejectedValueOnce(error);
    await answer(inbound(), { audio });
    expect(capture.mock.calls).toEqual([
      [{ audio, video: false }],
      [{ audio: { echoCancellation: false }, video: false }],
    ]);
    expect(audio.deviceId).toEqual({ exact: 'missing' });
  });

  it('resolves a rotated microphone ID by label with existing permission discovery', async () => {
    await answer(inbound(), { micId: 'old-id', micLabel: 'mic-b' });
    expect(capture.mock.calls).toEqual([
      [{ audio: true, video: false }],
      [{ audio: { deviceId: { exact: 'mic-b' } }, video: false }],
    ]);
  });

  it('does not retry a permission-denied capture as a device fallback', async () => {
    capture.mockRejectedValueOnce(
      Object.assign(new Error('Permission denied'), {
        name: 'NotAllowedError',
      })
    );
    const call = inbound();
    const hangup = jest.spyOn(call, 'hangup').mockResolvedValue(undefined);
    const audio = { deviceId: { exact: 'mic-b' } };
    await answer(call, { audio });
    expect(capture.mock.calls).toEqual([[{ audio, video: false }]]);
    expect(hangup).toHaveBeenCalled();
  });

  it('does not resolve or reacquire input devices for a speaker-only override', async () => {
    const call = inbound();
    await answer(call, { speakerId: 'speaker-b' });
    expect(call.options.speakerId).toBe('speaker-b');
    expect(capture.mock.calls).toEqual([[{ audio: true, video: false }]]);
    expect(enumerate).not.toHaveBeenCalled();
  });

  it('keeps no-argument answer defaults', async () => {
    await inbound().answer();
    expect(capture.mock.calls).toEqual([[{ audio: true, video: false }]]);
  });

  it('retains permission discovery before enumerating device identities', async () => {
    expect(await assureDeviceId('old-id', 'mic-b', 'audioinput')).toBe('mic-b');
    expect(capture).toHaveBeenCalledTimes(1);
    expect(enumerate).toHaveBeenCalledTimes(1);
  });
});
