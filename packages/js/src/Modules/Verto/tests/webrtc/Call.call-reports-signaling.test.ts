import Verto from '../..';
import Call from '../../webrtc/Call';
import { CallReportCollector } from '../../webrtc/CallReportCollector';
import { PeerType, VertoMethod } from '../../webrtc/constants';

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

describe.each([false, true])(
  'call report signaling (trickle=%s)',
  (trickle) => {
    afterEach(() => jest.restoreAllMocks());

    describe.each([
      [VertoMethod.Invite, PeerType.Offer, false],
      [VertoMethod.Answer, PeerType.Answer, false],
      [VertoMethod.Attach, PeerType.Answer, true],
    ])('%s', (method, type, attach) => {
      it.each([
        [false, 'report-token'],
        [true, 'report-token'],
        [undefined, 'report-token'],
        [undefined, undefined],
      ])('enableCallReports=%s, callReportId=%s', async (enabled, token) => {
        const session = new Verto({
          host: 'example.fs.telnyx',
          login: 'login',
          passwd: 'passwd',
          enableCallReports: enabled,
        });
        session.sessionid = 'test-session';
        session.callReportId = token ?? null;
        const execute = jest
          .spyOn(session, 'execute')
          .mockResolvedValue({ node_id: null });
        jest.spyOn(session, 'startSignalingHealthMonitor').mockImplementation();
        const postReport = jest
          .spyOn(CallReportCollector.prototype, 'postReport')
          .mockResolvedValue();
        const sendPayload = jest
          .spyOn(CallReportCollector.prototype, 'sendPayload')
          .mockResolvedValue();
        const call = new Call(session, {
          destinationNumber: 'x3599',
          trickleIce: trickle,
          attach,
        });
        const internals = call as unknown as {
          _onIceSdp: (data: RTCSessionDescriptionInit) => void;
          _onTrickleIceSdp: (data: RTCSessionDescriptionInit) => void;
          _callReportCollector: CallReportCollector | null;
          _postCallReport: () => Promise<void>;
          _flushIntermediateReport: () => void;
        };
        const sdp = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';

        try {
          internals[trickle ? '_onTrickleIceSdp' : '_onIceSdp']({ type, sdp });
          await new Promise((resolve) => setImmediate(resolve));

          expect(execute).toHaveBeenCalledTimes(1);
          // Serialize the real Invite/Answer/Attach request, as Connection does.
          const serialized = JSON.stringify(execute.mock.calls[0][0].request);
          const request = JSON.parse(serialized);
          expect(request.method).toBe(method);
          expect(request.params).toEqual({
            sessid: 'test-session',
            sdp,
            dialogParams: expect.objectContaining({
              callID: call.id,
              destination_number: 'x3599',
            }),
            'User-Agent': expect.stringMatching(/^Web-/),
            ...(trickle && { trickle: true }),
            call_reports_enabled: enabled !== false,
          });
          expect(request.params.dialogParams).not.toHaveProperty(
            'call_reports_enabled'
          );
          expect(serialized).not.toContain('report-token');

          if (enabled === false) {
            expect(internals._callReportCollector).toBeNull();
            internals._flushIntermediateReport();
            await internals._postCallReport();
            expect(internals._callReportCollector).toBeNull();
          } else {
            // A missing token is not explicit disablement.
            expect(internals._callReportCollector).not.toBeNull();
          }
          expect(postReport).not.toHaveBeenCalled();
          expect(sendPayload).not.toHaveBeenCalled();
          expect(execute).toHaveBeenCalledTimes(1);
        } finally {
          await call.hangup({}, false);
        }
      });
    });
  }
);
