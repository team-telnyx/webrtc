import { isQueued } from '../../services/Handler';
import { State } from '../../webrtc/constants';
import Call from '../../webrtc/Call';
import Verto from '../..';

function getBitrate(call, kind) {
  if (!call || !call.peer) {
    return 0;
  }

  const { instance } = call.peer;
  const senders = instance.getSenders();
  if (!senders) {
    return 0;
  }

  const sender = senders.find(
    ({ track: { kind } }: RTCRtpSender) => kind === kind
  );

  if (sender) {
    let p = sender.getParameters();
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

  describe('setStateTelnyx', () => {
    it('should return null if call is null', () => {
      // @ts-ignore
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
      expect(call.state).toEqual('connecting');

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

  describe('.setVideoBandwidthEncodingsMaxBps()', () => {
    it('if video is used it should set video max bitrate to 300 kbits/s', () => {
      const maxBitsPerSecond = 300000;
      if (call.options.video && call.peer) {
        call.setVideoBandwidthEncodingsMaxBps(maxBitsPerSecond);
        expect(getBitrate(call, 'video')).toEqual(maxBitsPerSecond);
      }
    });
  });
});
