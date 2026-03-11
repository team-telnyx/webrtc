import { isQueued } from '../../services/Handler';
import { State } from '../../webrtc/constants';
import Call from '../../webrtc/Call';
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
      expect(call.state).toEqual('destroy');
      expect(session.calls).not.toHaveProperty(call.id);
      expect(isQueued('telnyx.rtc.mediaError', call.id)).toEqual(false);
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
    it('should use USER_BUSY/17 when rejecting a ringing call', () => {
      call.setState(State.Ringing);
      call.hangup({}, false);
      expect(call.cause).toEqual('USER_BUSY');
      expect(call.causeCode).toEqual(17);
    });

    it('should use USER_BUSY/17 for a new (pre-answer) call', () => {
      // call starts in State.New
      call.hangup({}, false);
      expect(call.cause).toEqual('USER_BUSY');
      expect(call.causeCode).toEqual(17);
    });

    it('should use NORMAL_CLEARING/16 when hanging up an active call', () => {
      call.setState(State.Active);
      call.hangup({}, false);
      expect(call.cause).toEqual('NORMAL_CLEARING');
      expect(call.causeCode).toEqual(16);
    });

    it('should use NORMAL_CLEARING/16 when hanging up a held call', () => {
      call.setState(State.Active);
      call.setState(State.Held);
      call.hangup({}, false);
      expect(call.cause).toEqual('NORMAL_CLEARING');
      expect(call.causeCode).toEqual(16);
    });

    it('should respect explicit cause params regardless of state', () => {
      call.setState(State.Active);
      call.hangup({ cause: 'CUSTOM_CAUSE', causeCode: 99 }, false);
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

  describe('recovery flow (isRecovering)', () => {
    it('should set initial state to Recovering when created with isRecovering=true', () => {
      const recoveringCall = new Call(session, defaultParams, true);
      expect(recoveringCall.state).toEqual('recovering');
    });

    it('should set state to Recovering (not Hangup/Destroy) when hangup is called with isRecovering', () => {
      call.setState(State.Active);
      call.hangup({ isRecovering: true }, false);
      expect(call.state).toEqual('recovering');
    });

    it('should clear recovery flag and transition to Active on setState(Active)', () => {
      const recoveringCall = new Call(session, defaultParams, true);
      expect(recoveringCall.state).toEqual('recovering');
      recoveringCall.setState(State.Active);
      expect(recoveringCall.state).toEqual('active');
    });

    it('should preserve Recovering state through the full recovery lifecycle', () => {
      // Simulate: active call → socket drops → hangup with recovery → new call recovers → active
      call.setState(State.Active);
      expect(call.state).toEqual('active');

      // Old call receives recovery hangup
      call.hangup({ isRecovering: true }, false);
      expect(call.state).toEqual('recovering');

      // New call is created in recovering state
      const recoveredCall = new Call(session, defaultParams, true);
      expect(recoveredCall.state).toEqual('recovering');

      // After server confirms, call becomes active
      recoveredCall.setState(State.Active);
      expect(recoveredCall.state).toEqual('active');
    });

    it('should not transition to New when created with isRecovering=true', () => {
      const recoveringCall = new Call(session, defaultParams, true);
      // State should never be 'new' — it should start as 'recovering'
      expect(recoveringCall.state).not.toEqual('new');
      expect(recoveringCall.state).toEqual('recovering');
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
});
