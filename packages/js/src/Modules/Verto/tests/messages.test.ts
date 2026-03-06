import {
  Login,
  Invite,
  Answer,
  Attach,
  Bye,
  Modify,
  Info,
} from '../messages/Verto';
import { Ping } from '../messages/verto/Ping';
import { version } from '../../../../package.json';

const userAgent = JSON.stringify({
  data: 'mock user agent',
  sdkVersion: version,
});

/**
 * Build a mock HTMLAudioElement with circular parent/child refs,
 * mimicking real DOM nodes that cause JSON.stringify to throw
 * "Converting circular structure to JSON".
 */
function createMockHTMLElement(
  tag = 'AUDIO',
  id = 'local-audio'
): Record<string, unknown> {
  const parent: Record<string, unknown> = {
    tagName: 'DIV',
    id: 'container',
    nodeType: 1,
  };
  const el: Record<string, unknown> = {
    tagName: tag,
    id,
    className: 'telnyx-video',
    nodeType: 1,
    autoplay: true,
    muted: false,
    playsInline: true,
    srcObject: null,
    offsetWidth: 640,
    offsetHeight: 480,
    parentNode: parent, // circular: el → parent → children → el
  };
  parent.children = [el];
  parent.firstChild = el;
  return el;
}

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

    /**
     * Regression: #450 — dialogParams containing HTMLElements (localElement /
     * remoteElement) caused JSON.stringify to throw "Converting circular
     * structure to JSON" because DOM nodes have cyclic parent/child refs.
     *
     * BaseRequest must strip these properties so the request is always
     * JSON-serializable.
     */
    describe('Cyclic dialogParams (#450 regression)', function () {
      it('should replace cyclic elements with JSON-safe summaries in Invite dialogParams', function () {
        const localEl = createMockHTMLElement('AUDIO', 'local-audio');
        const remoteEl = createMockHTMLElement('AUDIO', 'remote-audio');

        // Sanity: the mock elements ARE cyclic
        expect(() => JSON.stringify(localEl)).toThrow();

        const invite = new Invite({
          sessid: 'sess-1',
          sdp: '<SDP>',
          dialogParams: {
            remoteSdp: '<SDP>',
            localElement: localEl,
            remoteElement: remoteEl,
            callerId: 'regression-test',
            destinationNumber: '+15551234567',
          },
        });

        // Must not throw — the whole point of the fix
        expect(() => JSON.stringify(invite.request)).not.toThrow();

        const dp = invite.request.params.dialogParams;
        // Elements replaced with JSON-safe summaries
        expect(dp.localElement).toEqual(
          expect.objectContaining({ tag: 'audio', id: 'local-audio' })
        );
        expect(dp.remoteElement).toEqual(
          expect.objectContaining({ tag: 'audio', id: 'remote-audio' })
        );
        expect(dp.remoteSdp).toBeUndefined();
        // Non-cyclic params survive (with key mapping applied)
        expect(dp.callerId).toBe('regression-test');
        expect(dp.destination_number).toBe('+15551234567');
      });

      it('should replace cyclic elements with JSON-safe summaries in Answer dialogParams', function () {
        const answer = new Answer({
          sessid: 'sess-2',
          sdp: '<SDP>',
          dialogParams: {
            localElement: createMockHTMLElement('AUDIO', 'local-audio'),
            remoteElement: createMockHTMLElement('AUDIO', 'remote-audio'),
            callerId: 'answer-test',
          },
        });

        expect(() => JSON.stringify(answer.request)).not.toThrow();
        expect(answer.request.params.dialogParams.localElement).toEqual(
          expect.objectContaining({ tag: 'audio' })
        );
        expect(answer.request.params.dialogParams.remoteElement).toEqual(
          expect.objectContaining({ tag: 'audio' })
        );
      });

      it('should replace cyclic elements with JSON-safe summaries in Attach dialogParams', function () {
        const attach = new Attach({
          sessid: 'sess-3',
          dialogParams: {
            localElement: createMockHTMLElement(),
            remoteElement: createMockHTMLElement(),
          },
        });

        expect(() => JSON.stringify(attach.request)).not.toThrow();
        expect(attach.request.params.dialogParams.localElement).toEqual(
          expect.objectContaining({ tag: 'audio' })
        );
        expect(attach.request.params.dialogParams.remoteElement).toEqual(
          expect.objectContaining({ tag: 'audio' })
        );
      });

      it('should handle dialogParams with no elements gracefully', function () {
        const invite = new Invite({
          sessid: 'sess-4',
          sdp: '<SDP>',
          dialogParams: {
            callerId: 'no-elements',
          },
        });

        expect(() => JSON.stringify(invite.request)).not.toThrow();
        expect(invite.request.params.dialogParams.callerId).toBe('no-elements');
      });
    });
  });
});
