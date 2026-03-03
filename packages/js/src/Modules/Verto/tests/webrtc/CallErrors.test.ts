import { register, deRegisterAll, trigger } from '../../services/Handler';
import { SwEvent } from '../../util/constants';
import { TelnyxError } from '../../util/errors';
import Call from '../../webrtc/Call';
import Verto from '../..';

describe('Call error events', () => {
  let session: Verto;
  let call: Call;
  const defaultParams = {
    destinationNumber: 'x3599',
    remoteCallerName: 'Js Client Test',
    remoteCallerNumber: '1234',
    callerName: 'Jest Client',
    callerNumber: '5678',
  };

  beforeEach(async (done) => {
    // Clean up all handlers from previous tests to avoid leaks
    // (uuid.v4 is mocked to always return 'mocked-uuid')
    deRegisterAll(SwEvent.Error);
    deRegisterAll(SwEvent.Notification);
    deRegisterAll(SwEvent.MediaError);
    deRegisterAll(SwEvent.PeerConnectionFailureError);
    deRegisterAll(SwEvent.PeerConnectionSignalingStateClosed);

    session = new Verto({
      host: 'example.fs.telnyx',
      login: 'login',
      passwd: 'passwd',
    });
    await session.connect().catch(console.error);
    call = new Call(session, defaultParams);
    done();
  });

  afterEach(() => {
    deRegisterAll(SwEvent.Error);
    deRegisterAll(SwEvent.Notification);
    deRegisterAll(SwEvent.MediaError);
    deRegisterAll(SwEvent.PeerConnectionFailureError);
    deRegisterAll(SwEvent.PeerConnectionSignalingStateClosed);
  });

  describe('_onMediaError via SwEvent.MediaError', () => {
    it('should fire telnyx.error with code 42003 on media error', (done) => {
      const mediaError = new DOMException('Device not found', 'NotFoundError');

      const handler = (data: {
        error: TelnyxError;
        callId: string;
        sessionId: string;
      }) => {
        expect(data.error).toBeInstanceOf(TelnyxError);
        expect(data.error.code).toBe(42003);
        expect(data.error.name).toBe('MediaGetUserMediaFailed');
        expect(data.error.originalError).toBe(mediaError);
        expect(data.callId).toBe(call.id);
        expect(data.sessionId).toBe(session.sessionid);
        done();
      };

      register(SwEvent.Error, handler, session.uuid);
      trigger(SwEvent.MediaError, mediaError, call.id);
    });

    it('should also emit deprecated userMediaError notification', (done) => {
      const mediaError = new DOMException(
        'Permission denied',
        'NotAllowedError'
      );

      const notificationHandler = (data: {
        type: string;
        error: DOMException;
        errorName: string;
      }) => {
        if (data.type === 'userMediaError') {
          expect(data.error).toBe(mediaError);
          expect(data.errorName).toBe('NotAllowedError');
          done();
        }
      };

      register(SwEvent.Notification, notificationHandler, call.id);
      trigger(SwEvent.MediaError, mediaError, call.id);
    });
  });

  describe('_onPeerConnectionFailureError', () => {
    it('should fire telnyx.error with code 43001 when autoReconnect is disabled', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any)._autoReconnect = false;

      const peerError = {
        error: new Error('Peer connection failed'),
        sessionId: session.sessionid,
      };

      const handler = (data: { error: TelnyxError; callId: string }) => {
        expect(data.error).toBeInstanceOf(TelnyxError);
        expect(data.error.code).toBe(43001);
        expect(data.error.name).toBe('PeerConnectionFailed');
        expect(data.callId).toBe(call.id);
        done();
      };

      register(SwEvent.Error, handler, session.uuid);
      trigger(SwEvent.PeerConnectionFailureError, peerError, call.id);
    });

    it('should NOT fire telnyx.error when autoReconnect is enabled', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any)._autoReconnect = true;

      const peerError = {
        error: new Error('Peer connection failed'),
        sessionId: session.sessionid,
      };

      let errorEventReceived = false;
      const errorHandler = () => {
        errorEventReceived = true;
      };
      register(SwEvent.Error, errorHandler, session.uuid);

      trigger(SwEvent.PeerConnectionFailureError, peerError, call.id);

      expect(errorEventReceived).toBe(false);
    });
  });
});
