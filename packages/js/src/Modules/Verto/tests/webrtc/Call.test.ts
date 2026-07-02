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
import { PeerType, State, Direction } from '../../webrtc/constants';
import {
  ANSWER_WHILE_PEER_ACTIVE,
  DUPLICATE_INBOUND_ANSWER,
  SwEvent,
} from '../../util/constants';
import logger from '../../util/logger';
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

  describe('hangup caller instrumentation', () => {
    it('should log caller stack and state metadata when hangup is invoked', async () => {
      const debugSpy = jest
        .spyOn(logger, 'debug')
        .mockImplementation(jest.fn());

      call.setState(State.Active);
      await call.hangup({ cause: 'NORMAL_CLEARING', causeCode: 16 }, false);

      expect(debugSpy).toHaveBeenCalledWith(
        `[${call.id}] hangup() invoked`,
        expect.objectContaining({
          callId: call.id,
          execute: false,
          state: 'active',
          prevState: 'new',
          cause: 'NORMAL_CLEARING',
          causeCode: 16,
          initiator: 'app:call.hangup',
          isRecovering: false,
          hasDialogCustomHeaders: false,
          callerStack: expect.any(Array),
        })
      );

      const hangupLog = debugSpy.mock.calls.find(
        ([message]) => message === `[${call.id}] hangup() invoked`
      );
      const hangupLogContext = hangupLog?.[1] as { callerStack: string[] };
      expect(hangupLogContext.callerStack.length).toBeGreaterThan(0);
      expect(hangupLogContext.callerStack.join('\n')).toContain('hangup');

      debugSpy.mockRestore();
    });

    it('should log explicit hangup initiator metadata', async () => {
      const debugSpy = jest
        .spyOn(logger, 'debug')
        .mockImplementation(jest.fn());

      await call.hangup({ initiator: 'sdk:sdp-send-failure' }, false);

      expect(debugSpy).toHaveBeenCalledWith(
        `[${call.id}] hangup() invoked`,
        expect.objectContaining({
          initiator: 'sdk:sdp-send-failure',
        })
      );

      debugSpy.mockRestore();
    });
  });

  describe('call report uploads', () => {
    it('uses the owning session voice_sdk_id when posting the report', async () => {
      (session.connection as unknown as { host?: string }).host =
        'wss://rtc.telnyx.com';
      session.callReportId = 'call-report-id';
      session.callReportVoiceSdkId = 'owning-session-voice-sdk-id';
      (
        call as unknown as {
          options: {
            audio: unknown;
            iceServers: RTCIceServer[];
          };
        }
      ).options.audio = {
        deviceId: 'microphone-device-id',
        password: 'media-secret',
        nested: { token: 'nested-token', kept: true },
      };
      (
        call as unknown as {
          options: {
            audio: unknown;
            iceServers: RTCIceServer[];
          };
        }
      ).options.iceServers = [
        {
          urls: ['turn:example.com'],
          username: 'turn-user',
          credential: 'turn-password',
        },
      ];

      const collector = {
        stop: jest.fn().mockResolvedValue(undefined),
        postReport: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn(),
      };
      (
        call as unknown as { _callReportCollector: typeof collector }
      )._callReportCollector = collector;

      await (
        call as unknown as { _postCallReport: () => Promise<void> }
      )._postCallReport();

      expect(collector.postReport).toHaveBeenCalledWith(
        expect.objectContaining({ callId: call.id }),
        'call-report-id',
        'wss://rtc.telnyx.com',
        'owning-session-voice-sdk-id'
      );
      const submittedSummary = collector.postReport.mock.calls[0][0];
      expect(submittedSummary.clientSummary).toEqual(
        expect.objectContaining({
          authentication: expect.objectContaining({
            type: 'login_password',
          }),
          callReports: expect.objectContaining({
            enabled: true,
            intervalMs: 5000,
            flushIntervalMs: 180000,
          }),
          media: expect.objectContaining({
            audio: {
              deviceId: 'microphone-device-id',
              nested: { kept: true },
            },
            iceServers: [
              {
                urls: ['turn:example.com'],
                hasUsername: true,
                hasCredential: true,
              },
            ],
          }),
        })
      );
      const serializedClientSummary = JSON.stringify(
        submittedSummary.clientSummary
      );
      expect(serializedClientSummary).not.toContain('passwd');
      expect(serializedClientSummary).not.toContain('media-secret');
      expect(serializedClientSummary).not.toContain('nested-token');
      expect(serializedClientSummary).not.toContain('turn-password');
      expect(collector.cleanup).toHaveBeenCalled();
    });

    it('submits and tracks intermediate reports with the owning session voice_sdk_id', () => {
      (session.connection as unknown as { host?: string }).host =
        'wss://rtc.telnyx.com';
      session.callReportId = 'call-report-id';
      session.callReportVoiceSdkId = 'owning-session-voice-sdk-id';
      const payload = {
        summary: { callId: call.id },
        stats: [
          {
            intervalStartUtc: '2026-05-18T14:00:00.000Z',
            intervalEndUtc: '2026-05-18T14:00:05.000Z',
          },
        ],
        segment: 0,
      };
      const collector = {
        flush: jest.fn().mockReturnValue(payload),
        sendPayload: jest.fn().mockResolvedValue(undefined),
      };
      const trackSpy = jest.spyOn(session, 'trackCallReportUpload');
      (
        call as unknown as { _callReportCollector: typeof collector }
      )._callReportCollector = collector;

      (
        call as unknown as { _flushIntermediateReport: () => void }
      )._flushIntermediateReport();

      expect(collector.flush).toHaveBeenCalledWith(
        expect.objectContaining({
          callId: call.id,
          clientSummary: expect.objectContaining({
            authentication: expect.objectContaining({
              type: 'login_password',
            }),
          }),
        }),
        expect.any(Object)
      );
      expect(collector.sendPayload).toHaveBeenCalledWith(
        payload,
        'call-report-id',
        'wss://rtc.telnyx.com',
        'owning-session-voice-sdk-id'
      );
      expect(trackSpy).toHaveBeenCalledTimes(1);
      expect(trackSpy.mock.calls[0][0]).toHaveProperty(
        'then',
        expect.any(Function)
      );
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

  describe('outbound invite response races', () => {
    it('should not move a hung up outbound call back to trying when invite ACK arrives late', async () => {
      let resolveInvite: (response: { node_id: string }) => void;
      const inviteResponse = new Promise<{ node_id: string }>((resolve) => {
        resolveInvite = resolve;
      });
      jest.spyOn(session, 'execute').mockReturnValue(inviteResponse);
      const onTrickleIceSdp = (
        Reflect.get(call, '_onTrickleIceSdp') as (
          this: Call,
          data: RTCSessionDescriptionInit
        ) => void
      ).bind(call);

      onTrickleIceSdp({
        type: PeerType.Offer,
        sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-',
      });
      expect(call.state).toEqual('requesting');

      call.setState(State.Hangup);
      resolveInvite({ node_id: 'late-node' });
      await inviteResponse;
      await Promise.resolve();

      expect(call.state).toEqual('hangup');
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

      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:peer-init-failed' },
        false
      );
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

      expect(hangupSpy).toHaveBeenCalledWith(
        { initiator: 'sdk:peer-init-failed' },
        true
      );
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
          connectionState: 'closed',
          iceConnectionState: 'closed',
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

    it('should ignore another inbound answer in the same session when there is an answering call with usable peer connection', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'first-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const duplicateCall = new Call(session, {
        ...defaultParams,
        id: 'duplicate-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

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
      deRegister(SwEvent.Warning, undefined, session.uuid);
    });

    it('should ignore another inbound answer when previous call has a failed peer connection', async () => {
      const initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);

      const firstCall = new Call(session, {
        ...defaultParams,
        id: 'failed-peer-first-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const duplicateCall = new Call(session, {
        ...defaultParams,
        id: 'failed-peer-second-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });

      const warningHandler = jest.fn();
      register(SwEvent.Warning, warningHandler, session.uuid);

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

      expect(initSpy).toHaveBeenCalledTimes(1);
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
      deRegister(SwEvent.Warning, undefined, session.uuid);
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

  describe('answer() multi-call debug log', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should NOT log a multi-call diagnostic when answering a single inbound call', async () => {
      // Clean up the default call from beforeEach so only the inbound call exists
      call.setState(State.Purge);
      delete session.calls[call.id];

      const answerCall = new Call(session, {
        ...defaultParams,
        id: 'single-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      answerCall.direction = Direction.Inbound;
      answerCall.setState(State.Ringing);

      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

      await answerCall.answer();

      // The debug log for "answering inbound call while N other active call(s) exist"
      // should NOT fire when the only active call is the one being answered.
      const multiCallLog = debugSpy.mock.calls.find(
        (args: string[]) => /answer\(\): answering inbound call while \d+ other active call/.test(args[0])
      );
      expect(multiCallLog).toBeUndefined();

      await answerCall.hangup({}, false);
    });

    it('should log a multi-call diagnostic when answering while another call is active', async () => {
      // The default call from beforeEach is in 'new' state (counts as active),
      // so the debug log should fire because at least one other active call exists.
      const answerCall = new Call(session, {
        ...defaultParams,
        id: 'second-inbound-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      answerCall.direction = Direction.Inbound;
      answerCall.setState(State.Ringing);

      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

      await answerCall.answer();

      // The debug log should fire because at least one other active call exists.
      const multiCallLog = debugSpy.mock.calls.find(
        (args: string[]) => /answer\(\): answering inbound call while \d+ other active call/.test(args[0])
      );
      expect(multiCallLog).toBeDefined();
      // The log should NOT count the call being answered itself
      expect(multiCallLog![0]).not.toContain('0 other active call');

      await answerCall.hangup({}, false);
    });
  });

  describe('answer() per-call element override (VSUP-121)', () => {
    let initSpy: jest.SpyInstance;

    beforeEach(() => {
      // Prevent real RTCPeerConnection setup so answer() completes in tests.
      initSpy = jest
        .spyOn(Peer.prototype, 'init')
        .mockResolvedValue(undefined);
    });

    afterEach(() => {
      initSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should override remoteElement from answer() params', async () => {
      // Purge the default call so only the inbound call exists (avoids the
      // duplicate-answer guard from VSUP-122, which is out of scope here).
      call.setState(State.Purge);
      delete session.calls[call.id];

      const remoteElementA = document.createElement('audio');
      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-override-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      await inbound.answer({ remoteElement: remoteElementA });

      // The per-call remoteElement passed to answer() must land on this.options
      expect(inbound.options.remoteElement).toBe(remoteElementA);

      await inbound.hangup({}, false);
    });

    it('should override localElement from answer() params', async () => {
      call.setState(State.Purge);
      delete session.calls[call.id];

      const localElementA = document.createElement('audio');
      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-override-local-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      await inbound.answer({ localElement: localElementA });

      expect(inbound.options.localElement).toBe(localElementA);

      await inbound.hangup({}, false);
    });

    it('should override both remoteElement and localElement from answer() params', async () => {
      call.setState(State.Purge);
      delete session.calls[call.id];

      const remoteElementB = document.createElement('video');
      const localElementB = document.createElement('video');
      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-override-both-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      await inbound.answer({
        remoteElement: remoteElementB,
        localElement: localElementB,
      });

      expect(inbound.options.remoteElement).toBe(remoteElementB);
      expect(inbound.options.localElement).toBe(localElementB);

      await inbound.hangup({}, false);
    });

    it('should fall back to existing options.remoteElement when answer() omits it (backward compat)', async () => {
      call.setState(State.Purge);
      delete session.calls[call.id];

      // Pre-set a remoteElement on the call (simulating session-level default
      // applied at construction via newCall).
      const sessionDefaultElement = document.createElement('audio');
      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-no-override-call',
        remoteElement: sessionDefaultElement,
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      // answer() with no element params — must keep the pre-existing element
      await inbound.answer({});

      expect(inbound.options.remoteElement).toBe(sessionDefaultElement);

      await inbound.hangup({}, false);
    });

    it('should not mutate options when answer() params omit both elements', async () => {
      call.setState(State.Purge);
      delete session.calls[call.id];

      const inbound = new Call(session, {
        ...defaultParams,
        id: 'answer-omits-elements-call',
        remoteSdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n',
      });
      inbound.direction = Direction.Inbound;
      inbound.setState(State.Ringing);

      const optionsBefore = { ...inbound.options };

      await inbound.answer({ customHeaders: [{ name: 'X-Test', value: '1' }] });

      // Elements unchanged (undefined stays undefined — no spurious override)
      expect(inbound.options.remoteElement).toBe(optionsBefore.remoteElement);
      expect(inbound.options.localElement).toBe(optionsBefore.localElement);
      // customHeaders still applied (proves the merge block before ours ran)
      expect(inbound.options.customHeaders).toEqual([
        { name: 'X-Test', value: '1' },
      ]);

      await inbound.hangup({}, false);
    });
  });

  describe('newCall per-call element (VSUP-121)', () => {
    it('should set remoteElement per-call from new Call() options', () => {
      const remoteElement = document.createElement('audio');
      const perCall = new Call(session, {
        ...defaultParams,
        id: 'newcall-remote-element',
        remoteElement,
      });
      // BaseCall constructor spreads options at construction, so the per-call
      // remoteElement is honored without any answer()-time override.
      expect(perCall.options.remoteElement).toBe(remoteElement);
    });

    it('should set localElement per-call from new Call() options', () => {
      const localElement = document.createElement('video');
      const perCall = new Call(session, {
        ...defaultParams,
        id: 'newcall-local-element',
        localElement,
      });
      expect(perCall.options.localElement).toBe(localElement);
    });

    it('should default to the session-level element (null when none set) when not provided per-call (backward compat)', () => {
      const perCall = new Call(session, {
        ...defaultParams,
        id: 'newcall-no-element',
      });
      // BaseCall merges the session-level localElement/remoteElement (which
      // default to null in BrowserSession when no element is set). The per-call
      // default is the session default, not undefined.
      expect(perCall.options.remoteElement).toBeNull();
      expect(perCall.options.localElement).toBeNull();
    });
  });

  describe('multi-call independent remoteElement (VSUP-121 AC)', () => {
    it('two concurrent calls keep distinct remoteElements and hangup detaches only the hung-up call', () => {
      // Construct two calls, each with its own remoteElement.
      const remoteElementA = document.createElement('audio');
      const remoteElementB = document.createElement('audio');
      const streamA = new MediaStream();
      const streamB = new MediaStream();

      const callA = new Call(session, {
        ...defaultParams,
        id: 'multi-call-A',
        remoteElement: remoteElementA,
      });
      const callB = new Call(session, {
        ...defaultParams,
        id: 'multi-call-B',
        remoteElement: remoteElementB,
      });

      // Simulate both calls having attached their streams to their own elements.
      callA.options.remoteStream = streamA;
      callB.options.remoteStream = streamB;
      remoteElementA.srcObject = streamA;
      remoteElementB.srcObject = streamB;

      // AC: each call has its own element with independent playout
      expect(remoteElementA.srcObject).toBe(streamA);
      expect(remoteElementB.srcObject).toBe(streamB);
      expect(callA.options.remoteElement).toBe(remoteElementA);
      expect(callB.options.remoteElement).toBe(remoteElementB);

      // Hang up call A — only call A's element should be detached (smart-detach
      // from VSDK-199 ensures call B's element is untouched).
      callA['_finalize']();
      expect(remoteElementA.srcObject).toBeNull();
      // AC: call B's remote media continues uninterrupted
      expect(remoteElementB.srcObject).toBe(streamB);

      // Cleanup call B
      callB['_finalize']();
      expect(remoteElementB.srcObject).toBeNull();
    });

    it('connecting a second call does NOT overwrite the first call remoteElement', () => {
      const remoteElementA = document.createElement('audio');
      const remoteElementB = document.createElement('audio');
      const streamA = new MediaStream();

      const callA = new Call(session, {
        ...defaultParams,
        id: 'multi-call-no-overwrite-A',
        remoteElement: remoteElementA,
      });
      callA.options.remoteStream = streamA;
      remoteElementA.srcObject = streamA;

      // A second call constructed with a *different* remoteElement must not
      // touch call A's element or stream.
      const callB = new Call(session, {
        ...defaultParams,
        id: 'multi-call-no-overwrite-B',
        remoteElement: remoteElementB,
      });

      expect(callA.options.remoteElement).toBe(remoteElementA);
      expect(callB.options.remoteElement).toBe(remoteElementB);
      // call A's attachment is intact
      expect(remoteElementA.srcObject).toBe(streamA);
    });
  });

  describe('_finalize() conditional detach', () => {
    it('should detach media elements when srcObject matches the call stream', () => {
      const remoteStream = new MediaStream();
      const localStream = new MediaStream();
      const remoteElement = document.createElement('audio');
      const localElement = document.createElement('audio');
      remoteElement.srcObject = remoteStream;
      localElement.srcObject = localStream;

      call.options.remoteStream = remoteStream;
      call.options.localStream = localStream;
      call.options.remoteElement = remoteElement;
      call.options.localElement = localElement;

      call['_finalize']();

      expect(remoteElement.srcObject).toBeNull();
      expect(localElement.srcObject).toBeNull();
    });

    it('should NOT detach media elements when srcObject has been reattached to a different stream', () => {
      const callStream = new MediaStream();
      const otherStream = new MediaStream();
      const remoteElement = document.createElement('audio');
      const localElement = document.createElement('audio');
      // Element now points to a different stream (e.g., a new active call)
      remoteElement.srcObject = otherStream;
      localElement.srcObject = otherStream;

      call.options.remoteStream = callStream;
      call.options.localStream = callStream;
      call.options.remoteElement = remoteElement;
      call.options.localElement = localElement;

      call['_finalize']();

      // The element should NOT have been cleared — it belongs to a different call
      expect(remoteElement.srcObject).toBe(otherStream);
      expect(localElement.srcObject).toBe(otherStream);
    });
  });
});
