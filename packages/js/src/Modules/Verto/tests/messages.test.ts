import { Login, Invite, Answer, Bye, Modify, Info } from '../messages/Verto';
import { Ping } from '../messages/verto/Ping';
import { version } from '../../../../package.json';

const userAgent = JSON.stringify({
  data: 'mock user agent',
  sdkVersion: version,
});

describe('Messages', function () {
  beforeAll(() => {
    // Mocking the user agent for consistency
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'mock user agent' },
    });
  });
  describe('Verto', function () {
    describe('Login', function () {
      it('should match struct', function () {
        const message = new Login(
          'login',
          'password',
          'dskbksdjbfkjsdf234y67234kjrwe98',
          null!
        ).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"login","params":{"User-Agent": ${userAgent},"login":"login","passwd":"password","login_token": "dskbksdjbfkjsdf234y67234kjrwe98","loginParams":{},"userVariables":{}}}`
        );
        expect(message).toEqual(res);
      });

      it('should match struct with sessid', function () {
        const message = new Login(
          'login',
          'password',
          'dskbksdjbfkjsdf234y67234kjrwe98',
          '123456789'
        ).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"login","params":{"User-Agent": ${userAgent},"login":"login","passwd":"password","login_token": "dskbksdjbfkjsdf234y67234kjrwe98","sessid":"123456789","loginParams":{},"userVariables":{}}}`
        );
        expect(message).toEqual(res);
      });

      it('Should pass User-Agent to the backend', () => {
        const req = new Login('login', 'password', 'token', 'session').request;
        expect(req).toEqual(
          expect.objectContaining({
            params: expect.objectContaining({
              'User-Agent': expect.anything(),
            }),
          })
        );
      });
    });

    describe('Invite', function () {
      it('should match struct', function () {
        const message = new Invite({
          sessid: '123456789',
          sdp: '<SDP>',
          dialogParams: { remoteSdp: '<SDP>', callerId: 'test' },
        }).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.invite","params":{"sessid":"123456789","sdp":"<SDP>","dialogParams":{"callerId":"test"}}}`
        );
        expect(message).toEqual(res);
      });
    });

    describe('Answer', function () {
      it('should match struct', function () {
        const message = new Answer({
          sessid: '123456789',
          sdp: '<SDP>',
          dialogParams: { remoteSdp: '<SDP>', callerId: 'test' },
        }).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.answer","params":{"sessid":"123456789","sdp":"<SDP>","dialogParams":{"callerId":"test"}}}`
        );
        expect(message).toEqual(res);
      });
    });

    describe('Bye', function () {
      it('should match struct', function () {
        const message = new Bye({
          sessid: '123456789',
          dialogParams: { remoteSdp: '<SDP>', callerId: 'test' },
        }).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.bye","params":{"sessid":"123456789","dialogParams":{"callerId":"test"}}}`
        );
        expect(message).toEqual(res);
      });
    });

    describe('Modify', function () {
      it('should match struct', function () {
        const message = new Modify({
          sessid: '123456789',
          action: 'hold',
          dialogParams: { remoteSdp: '<SDP>', callerId: 'test' },
        }).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.modify","params":{"sessid":"123456789","action":"hold","dialogParams":{"callerId":"test"}}}`
        );
        expect(message).toEqual(res);
      });
    });

    describe('Info', function () {
      it('should match struct', function () {
        const message = new Info({
          sessid: '123456789',
          dtmf: '0',
          dialogParams: { remoteSdp: '<SDP>', callerId: 'test' },
        }).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.info","params":{"sessid":"123456789","dtmf":"0","dialogParams":{"callerId":"test"}}}`
        );
        expect(message).toEqual(res);
      });
    });

    describe('Ping', function () {
      it('should match struct', function () {
        const message = new Ping().request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.ping","params":{}}`
        );
        expect(message).toEqual(res);
      });
    });
  });
});
