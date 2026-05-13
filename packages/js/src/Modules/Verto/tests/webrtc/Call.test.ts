Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn().mockReturnValue({ duration: 0 }),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    now: jest.fn().mockReturnValue(Date.now()),
  },
});

import { isQueued, register, deRegister } from '../../services/Handler';
import { State } from '../../webrtc/constants';
import {
  ANSWER_WHILE_PEER_ACTIVE,
  DUPLICATE_INBOUND_ANSWER,
  SwEvent,
} from '../../util/constants';
import Call from '../../webrtc/Call';
import Peer from '../../webrtc/Peer';
import Verto from '../..';

function getBitrate(call: Call, trackKind: string) {
  if (!call || !call.peer) {
    return 0;
  }

  const { instance } = call.peer;
  const senders = instance.getSenders();
  if (!senders) {
    return 0;
  }

  const sender = senders.find(
    ({ track: { kind } }: RTCRtpSender) => kind === trackKind
  );

  if (sender) {
    const p = sender.getParameters();
    const parameters = p as RTCRtpSendParameters;
    if (!parameters.encodings) {
      return 0;
    }

    return parameters.encodings[0].maxBitrate;
  }
}

describe('Call', () => {
  let session: Verto;
  let call: Call;
  const defaultParams = {
    destinationNumber: 'x3599',
    remoteCallerName: 'Js Client Test',
    remoteCallerNumber: '1234',
    callerName: 'Jest Client',
    callerNumber: '5678',
  };
  const noop = (): void => {};

  beforeEach(async (done) => {
    session = new Verto({
      host: 'example.fs.telnyx',
      login: 'login',
      passwd: 'passwd',
    });
    await session.connect().catch(console.error);
    call = new Call(session, defaultParams);
    done();
  });

  describe('with required parameters', () => {
    it('should instantiate the default listeners', () => {
      expect(isQueued('telnyx.rtc.mediaError', call.id)).toEqual(true);
      expect(call.state).toEqual('new');
      expect(session.calls).toHaveProperty(call.id);
    });
  });

  describe('specifying an ID', () => {
    it('should use the ID as callId', () => {
      call = new Call(session, { ...defaultParams, id: 'test-id-example' });
      expect(call.id).toEqual('test-id-example');
      expect(session.calls).toHaveProperty('test-id-example');
    });
  });

  describe('specifying onNotification callback', () => {
    it('should set a listener for the notifications', () => {
      call = new Call(session, { ...defaultParams, onNotification: noop });
      expect(isQueued('telnyx.notification', call.id)).toEqual(true);
    });
  });

  describe('.setState()', () => {
    beforeEach(() => {
      call = new Call(session, { ...defaultParams, onNotification: noop });
      expect(call.prevState).toEqual(call.state);
    });

    it('set state to Requesting', () => {
      call.setState(State.Requesting);
      expect(call.state).toEqual('requesting');
    });

    it('set state to Trying', () => {
      call.setState(State.Trying);
      expect(call.state).toEqual('trying');
    });

    it('set state to Recovering', () => {
      call.setState(State.Recovering);
      expect(call.state).toEqual('recovering');
    });

    it('set state to Ringing', () => {
      call.setState(State.Ringing);
      expect(call.state).toEqual('ringing');
    });

    it('set state to Answering', () => {
      call.setState(State.Answering);
      expect(call.state).toEqual('answering');
    });

    it('set state to Early', () => {
      call.setState(State.Early);
      expect(call.state).toEqual('early');
    });

    it('set state to Active', () => {
      call.setState(State.Active);
      expect(call.state).toEqual('active');
    });

    it('set state to Held', () => {
      call.setState(State.Held);
      expect(call.state).toEqual('held');
    });

    it('set state to Hangup', () => {
      call.setState(State.Hangup);
      expect(call.state).toEqual('hangup');
    });

    it('set state to Destroy', () => {
      call.setState(State.Destroy);
      expect(call.state).toEqual('destroy');
      expect(session.calls).not.toHaveProperty(call.id);
      expect(isQueued('telnyx.rtc.mediaError', call.id)).toEqual(false);
    });

    it('set state to Purge', () => {
      call.setState(State.Purge);
      expect(call.state).toEqual('purge');
    });

    it('set prevState', () => {
      call.setState(State.Ringing);
      expect(call.prevState).toEqual('new');
      call.setState(State.Active);
      expect(call.prevState).toEqual('ringing');
      call.setState(State.Hangup);
      expect(call.prevState).toEqual('active');
    });
  });

  describe('hangup cause codes', () => {
    it('should use USER_BUSY/17 when rejecting a ringing call', async () => {
      call.setState(State.Ringing);
      await call.hangup({}, false);
      expect(call.cause).toEqual('USER_BUSY');
      expect(call.causeCode).toEqual(17);
    });

    it('should use USER_BUSY/17 for a new (pre-answer) call', async () => {
      // call starts in State.New
      await call.hangup({}, false);
      expect(call.cause).toEqual('USER_BUSY');
      expect(call.causeCode).toEqual(17);
    });

    it('should use NORMAL_CLEARING/16 when hanging up an active call', async () => {
      call.setState(State.Active);
      await call.hangup({}, false);
      expect(call.cause).toEqual('NORMAL_CLEARING');
      expect(call.causeCode).toEqual(16);
    });

    it('should use NORMAL_CLEARING/16 when hanging up a held call', async () => {
      call.setState(State.Active);
      call.setState(State.Held);
      await call.hangup({}, false);
      expect(call.cause).toEqual('NORMAL_CLEARING');
      expect(call.causeCode).toEqual(16);
    });

    it('should respect explicit cause params regardless of state', async () => {
      call.setState(State.Active);
      await call.hangup({ cause: 'CUSTOM_CAUSE', causeCode: 99 }, false);
      expect(call.cause).toEqual('CUSTOM_CAUSE');
      expect(call.causeCode).toEqual(99);
    });
  });

  describe('setStateTelnyx', () => {
    it('should return null if call is null', () => {
      const localCall = Call.setStateTelnyx(undefined);
      expect(localCall).toEqual(undefined);
    });

    it('should return call without change', () => {
      const localCall = Call.setStateTelnyx(call);
      expect(localCall).toEqual(call);
    });
    it('set telnyx state call', () => {
      call.setState(State.Recovering);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('recovering');

      call.setState(State.Trying);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('connecting');

      call.setState(State.Early);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('connecting');

      call.setState(State.Hangup);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('done');

      call.setState(State.Destroy);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('done');

      call.setState(State.Answering);
      Call.setStateTelnyx(call);
      expect(call.state).toEqual('ringing');
    });
  });

  describe('.setAudioBandwidthEncodingsMaxBps()', () => {
    it('if audio is used it should set audio max bitrate to 200 kbits/s', () => {
      const maxBitsPerSecond = 200000;
      if (call.options.audio && call.peer) {
        call.setAudioBandwidthEncodingsMaxBps(maxBitsPerSecond);
        expect(getBitrate(call, 'audio')).toEqual(maxBitsPerSecond);
      }
    });
  });

  describe('media failure handling', () => {
    const mediaError = new DOMException('Permission denied', 'NotAllowedError');

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('invite() should call hangup and not proceed with negotiation when media fails', async () => {
      jest
        .spyOn(
          Peer.prototype as unknown as {
            _retrieveLocalStream: () => Promise<MediaStream>;
          },
          '_retrieveLocalStream'
        )
        .mockRejectedValue(mediaError);
      const startNegotiationSpy = jest
        .spyOn(Peer.prototype, 'startNegotiation')
        .mockImplementation(() => {});
      const hangupSpy = jest.spyOn(call, 'hangup').mockResolvedValue(undefined);

      await call.invite();

      expect(hangupSpy).toHaveBeenCalledWith({}, false);
      expect(startNegotiationSpy).not.toHaveBeenCalled();
    });

    it('answer() should call hangup and not proceed with negotiation when media fails', async () => {
      jest
        .spyOn(
          Peer.prototype as unknown as {
            _retrieveLocalStream: () => Promise<MediaStream>;
          },
          '_retrieveLocalStream'
        )
        .mockRejectedValue(mediaError);
      const startNegotiationSpy = jest
        .spyOn(Peer.prototype, 'startNegotiation')
        .mockImplementation(() => {});

      const answerCall = new Call(session, {
        ...defaultParams,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      const hangupSpy = jest
        .spyOn(answerCall, 'hangup')
        .mockResolvedValue(undefined);

      await answerCall.answer();

      expect(hangupSpy).toHaveBeenCalledWith();
      expect(startNegotiationSpy).not.toHaveBeenCalled();
    });

    it('invite() should not abort early when media succeeds', async () => {
      // Default getUserMedia mock returns a valid stream — no override needed.
      // Verify invite() does not throw and _creatingPeer is reset (media-failure
      // try/catch path was not hit).
      await expect(call.invite()).resolves.toBeUndefined();
      expect(call['_creatingPeer']).toBe(false);
    });

    it('answer() with receiveOnlyAudio should not throw on getUserMedia failure', async () => {
      // For receive-only peers (no local audio), media failure is expected and
      // should NOT cause createPeerConnection to throw. We verify this by
      // asserting answer() resolves without throwing, and that _creatingPeer
      // is reset (i.e., the media-abort branch was not hit).
      jest
        .spyOn(
          Peer.prototype as unknown as {
            _retrieveLocalStream: () => Promise<MediaStream>;
          },
          '_retrieveLocalStream'
        )
        .mockRejectedValue(mediaError);

      const receiveOnlyCall = new Call(session, {
        ...defaultParams,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
        receiveOnlyAudio: true,
        audio: false,
      });

      await expect(receiveOnlyCall.answer()).resolves.toBeUndefined();
      // _creatingPeer false means we reached the end of answer() normally,
      // not via the media-error early-return path
      expect(receiveOnlyCall['_creatingPeer']).toBe(false);
      await receiveOnlyCall.hangup({}, false);
    });
  });

  describe('double answer prevention', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should ignore second answer() when peer connection already exists', async () => {
      const answerCall = new Call(session, {
        ...defaultParams,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      // Mock a peer with an active (non-closed) RTCPeerConnection
      answerCall.peer = {
        instance: {
          signalingState: 'stable',
        },
      } as unknown as Peer;

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await answerCall.answer();

      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({
            code: ANSWER_WHILE_PEER_ACTIVE,
            name: 'ANSWER_WHILE_PEER_ACTIVE',
          }),
          callId: answerCall.id,
        })
      );

      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should allow answer() when peer connection is closed', async () => {
      const answerCall = new Call(session, {
        ...defaultParams,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      // Mock a peer with a closed RTCPeerConnection
      answerCall.peer = {
        instance: {
          signalingState: 'closed',
        },
      } as unknown as Peer;

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

      await answerCall.answer();

      // Warning should NOT fire — a closed peer is allowed to be replaced
      expect(warningHandler).not.toHaveBeenCalled();

      await answerCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should ignore another inbound answer when same credential has an answering call with usable peer connection', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'first-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const duplicateSession = new Verto({
        host: 'example.fs.telnyx',
        login: 'login',
        passwd: 'passwd',
      });
      const duplicateCall = new Call(duplicateSession, {
        ...defaultParams,
        id: 'duplicate-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, duplicateSession.uuid);

      await firstCall.answer();
      firstCall.setState(State.Answering);
      firstCall.peer = {
        close: jest.fn(),
        instance: {
          signalingState: 'stable',
          connectionState: 'connecting',
          iceConnectionState: 'checking',
        },
      } as unknown as Peer;
      await duplicateCall.answer();

      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(warningHandler).toHaveBeenCalledTimes(1);
      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({
            code: DUPLICATE_INBOUND_ANSWER,
            name: 'DUPLICATE_INBOUND_ANSWER',
          }),
          callId: duplicateCall.id,
          activeCallId: firstCall.id,
        })
      );

      await firstCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, duplicateSession.uuid);
    });

    it('should allow another inbound answer when same credential call has a failed peer connection', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'failed-peer-first-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const duplicateSession = new Verto({
        host: 'example.fs.telnyx',
        login: 'login',
        passwd: 'passwd',
      });
      const duplicateCall = new Call(duplicateSession, {
        ...defaultParams,
        id: 'failed-peer-second-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, duplicateSession.uuid);

      await firstCall.answer();
      firstCall.setState(State.Active);
      firstCall.peer = {
        close: jest.fn(),
        instance: {
          signalingState: 'stable',
          connectionState: 'failed',
          iceConnectionState: 'failed',
        },
      } as unknown as Peer;

      await duplicateCall.answer();

      expect(initSpy).toHaveBeenCalledTimes(2);
      expect(warningHandler).not.toHaveBeenCalled();

      await firstCall.hangup({}, false);
      await duplicateCall.hangup({}, false);
      deRegister(SwEvent.Warning, undefined, duplicateSession.uuid);
    });

    it('should release duplicate answer guard after the active call is destroyed', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'released-first-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      const secondCall = new Call(session, {
        ...defaultParams,
        id: 'released-second-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      await firstCall.answer();
      await firstCall.hangup({}, false);
      await secondCall.answer();

      expect(initSpy).toHaveBeenCalledTimes(2);

      await secondCall.hangup({}, false);
    });
  });
});
