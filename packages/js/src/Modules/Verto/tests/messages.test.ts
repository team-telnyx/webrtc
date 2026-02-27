import { Login, Invite, Answer, Bye, Modify, Info } from '../messages/Verto';
import { Ping } from '../messages/verto/Ping';
import { AnonymousLogin } from '../messages/verto/AnonymousLogin';
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
          null!,
          {},
          false
        ).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"login","params":{"User-Agent": ${userAgent},"login":"login","passwd":"password", "reconnection": false,"login_token": "dskbksdjbfkjsdf234y67234kjrwe98","loginParams":{},"userVariables":{}}}`
        );
        expect(message).toEqual(res);
      });

      it('should match struct with sessid', function () {
        const message = new Login(
          'login',
          'password',
          'dskbksdjbfkjsdf234y67234kjrwe98',
          '123456789',
          {},
          false
        ).request;
        const res = JSON.parse(
          `{"jsonrpc":"2.0","id":"${message.id}","method":"login","params":{"User-Agent": ${userAgent},"login":"login","passwd":"password","reconnection": false, "login_token": "dskbksdjbfkjsdf234y67234kjrwe98","sessid":"123456789","loginParams":{},"userVariables":{}}}`
        );
        expect(message).toEqual(res);
      });

      it('Should pass User-Agent to the backend', () => {
        const req = new Login(
          'login',
          'password',
          'token',
          'session',
          {},
          false
        ).request;
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

    describe('AnonymousLogin', function () {
      it('should match struct without conversation_id', function () {
        const message = new AnonymousLogin({
          target_type: 'ai_assistant',
          target_id: 'asst_123',
          target_version_id: 'v1',
          userVariables: { key: 'value' },
          reconnection: false,
        }).request;

        expect(message.method).toEqual('anonymous_login');
        expect(message.params.target_type).toEqual('ai_assistant');
        expect(message.params.target_id).toEqual('asst_123');
        expect(message.params.target_version_id).toEqual('v1');
        expect(message.params.userVariables).toEqual({ key: 'value' });
        expect(message.params.reconnection).toEqual(false);
        expect(message.params.conversation_id).toBeUndefined();
      });

      it('should match struct with conversation_id', function () {
        const message = new AnonymousLogin({
          target_type: 'ai_assistant',
          target_id: 'asst_456',
          target_version_id: 'v2',
          conversation_id: 'conv-789-xyz',
          userVariables: {},
          reconnection: true,
        }).request;

        expect(message.method).toEqual('anonymous_login');
        expect(message.params.target_type).toEqual('ai_assistant');
        expect(message.params.target_id).toEqual('asst_456');
        expect(message.params.target_version_id).toEqual('v2');
        expect(message.params.conversation_id).toEqual('conv-789-xyz');
        expect(message.params.reconnection).toEqual(true);
      });

      it('should include sessid when sessionId is provided', function () {
        const message = new AnonymousLogin({
          target_type: 'ai_assistant',
          target_id: 'asst_123',
          sessionId: 'session-abc-123',
          conversation_id: 'conv-existing',
        }).request;

        expect(message.params.sessid).toEqual('session-abc-123');
        expect(message.params.conversation_id).toEqual('conv-existing');
      });

      it('should pass User-Agent to the backend', function () {
        const message = new AnonymousLogin({
          target_type: 'ai_assistant',
          target_id: 'asst_123',
        }).request;

        expect(message.params['User-Agent']).toBeDefined();
        expect(message.params['User-Agent'].sdkVersion).toEqual(version);
      });
    });
  });
});
