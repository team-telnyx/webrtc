jest.unmock('uuid');

import TelemetryClient from '../../telemetry/TelemetryClient';
import SessionTelemetry from '../../telemetry/sessionEvents';
import { PING_RECEIVED_LOG } from '../../telemetry/filter';
import { sanitizeDetails } from '../../telemetry/sanitize';
import logger from '../../util/logger';
import TelnyxRTC from '../../../../TelnyxRTC';
import type BaseSession from '../../BaseSession';

const TELEMETRY = { url: 'ws://localhost:9999' };

let clients: TelemetryClient[] = [];

const makeClient = () => {
  const client = TelemetryClient.create({ telemetry: TELEMETRY });
  client.attach({
    getLoginParams: () => null,
    getVoiceSdkId: () => 'VSDK1',
    getSessionId: () => 'sess-1',
    getSocketGeneration: () => 1,
  });
  clients.push(client);
  return client;
};

const fakeSession = () =>
  ({
    options: { login_token: 'jwt' },
    signalingVsp: {},
    hasAutoReconnect: () => true,
  }) as unknown as BaseSession;

/** Every event the client built, in emit order. */
const emitted = (spy: jest.SpyInstance) =>
  spy.mock.results.map((r) => r.value).filter(Boolean);

afterEach(() => {
  clients.forEach((client) => client.close());
  clients = [];
  jest.restoreAllMocks();
});

describe('Call Report V2 session events', () => {
  it('sdk_creation_started is sequence 1', () => {
    const spy = jest.spyOn(TelemetryClient.prototype, 'emit');
    const client = new TelnyxRTC({
      login_token: 'jwt',
      telemetry: TELEMETRY,
    });
    clients.push(client.telemetry);

    const events = emitted(spy);
    expect(events[0].name).toBe('sdk_creation_started');
    expect(events[0].sequence).toBe(1);
    expect(events[0].payload.options.custom_ice_servers).toBe(false);
    expect(events[0].payload.options.ice_servers.length).toBeGreaterThan(0);
    expect(JSON.stringify(events[0])).not.toContain('jwt');
    expect(events[0].payload.options).toMatchObject({
      login: null,
      login_type: 'token',
      debug: false,
      explicit_rtc_provided: false,
      use_canary: null,
      skip_trailing: false,
    });
    expect(events[0].payload.raw_client_options).toMatchObject({
      login_token: '[REDACTED]',
      telemetry: TELEMETRY,
    });
    const names = events.map((e) => e.name);
    expect(names).toContain('sdk_created');
    expect(names.indexOf('network_changed')).toBeGreaterThan(
      names.indexOf('sdk_created')
    );
  });

  it('sdk_creation_failed is emitted before the constructor throws', () => {
    const spy = jest.spyOn(TelemetryClient.prototype, 'emit');
    const orphan = jest.spyOn(TelemetryClient.prototype, 'orphan');
    expect(() => new TelnyxRTC({ telemetry: TELEMETRY })).toThrow();
    const events = emitted(spy);
    expect(events.map((e) => e.name)).toEqual([
      'sdk_creation_started',
      'sdk_creation_failed',
    ]);
    expect(events[1].payload.error.code).toBe('46002');
    expect(orphan).toHaveBeenCalled();
  });

  it('does not record ping frames or their responses', () => {
    const client = makeClient();
    const events = new SessionTelemetry(fakeSession(), client);
    const spy = jest.spyOn(client, 'emit');
    const before = client.lastSequence;

    const ping = { jsonrpc: '2.0', id: 'p1', method: 'telnyx_rtc.ping' };
    events.frameSent(ping);
    const pong = { jsonrpc: '2.0', id: 'p1', result: { method: 'pong' } };
    events.receivedFrameDone(events.frameReceived(pong));
    const serverPing = { jsonrpc: '2.0', id: 7, method: 'telnyx_rtc.ping' };
    events.receivedFrameDone(events.frameReceived(serverPing));
    const debug = { jsonrpc: '2.0', id: 'd1', type: 'debug_report_data' };
    events.frameSent(debug);
    events.receivedFrameDone(
      events.frameReceived({ jsonrpc: '2.0', id: 'd1', result: {} })
    );

    expect(spy).not.toHaveBeenCalled();
    expect(client.lastSequence).toBe(before);
  });

  it('resends each frame as it is, with only its direction and the call ID', () => {
    const client = makeClient();
    const events = new SessionTelemetry(fakeSession(), client);
    const spy = jest.spyOn(client, 'emit');

    const invite = {
      jsonrpc: '2.0',
      id: 'r1',
      method: 'telnyx_rtc.invite',
      params: {
        callID: 'call-1',
        sdp: 'v=0\r\na=ice-ufrag:uf1\r\na=ice-pwd:secret\r\na=rtpmap:111 opus/48000/2\r\n',
      },
    };
    events.frameSent(invite);
    const answer = {
      jsonrpc: '2.0',
      id: 'r1',
      result: { message: 'CALL CREATED', callID: 'call-1' },
    };
    const received = events.frameReceived(answer);
    events.receivedFrameDone(received);

    const [sent, response] = emitted(spy);
    expect(Object.keys(sent.payload)).toEqual(['direction', 'raw']);
    expect(sent.payload.direction).toBe('sent');
    expect(sent.payload.raw.method).toBe('telnyx_rtc.invite');
    expect(sent.payload.raw.params.sdp).toContain('a=rtpmap:111 opus/48000/2');
    expect(sent.payload.raw.params.sdp).toContain('a=ice-ufrag:uf1');
    expect(JSON.stringify(sent)).not.toContain('secret');
    expect(sent.ids.call_id).toBe('call-1');
    expect(response.payload).toEqual({ direction: 'received', raw: answer });
    expect(response.ids.call_id).toBe('call-1');
    // The sequence was taken when the frame arrived.
    expect(response.sequence).toBe(received.sequence);
  });

  it('sends the login frame without its password or token', () => {
    const client = makeClient();
    const events = new SessionTelemetry(fakeSession(), client);
    const spy = jest.spyOn(client, 'emit');
    const login = {
      jsonrpc: '2.0',
      id: 'l1',
      method: 'login',
      params: {
        login: 'user',
        passwd: 'hunter2',
        login_token: 'eyJhbGciOi.payload.sig',
        userVariables: { push_when_active: false },
      },
    };
    events.frameSent(login);
    const raw = emitted(spy)[0].payload.raw;
    expect(raw.params).toEqual({
      login: 'user',
      passwd: '[REDACTED]',
      login_token: '[REDACTED]',
      userVariables: { push_when_active: false },
    });
    expect(JSON.stringify(emitted(spy))).not.toContain('hunter2');
  });

  it('the logger forwards every line whole, except keepalive', () => {
    logger.setLevel('debug', false);
    const client = makeClient();
    const log = jest.spyOn(client, 'log');

    logger.debug(PING_RECEIVED_LOG);
    logger.debug(
      'SEND: \n',
      JSON.stringify(
        { jsonrpc: '2.0', id: 'p', method: 'telnyx_rtc.ping' },
        null,
        2
      ),
      '\n'
    );
    logger.debug(
      'SEND: \n',
      JSON.stringify(
        {
          jsonrpc: '2.0',
          id: 'l',
          method: 'login',
          params: { login: 'u', passwd: 'hunter2' },
        },
        null,
        2
      ),
      '\n'
    );
    logger.info('[CallTimings][outbound][trickle] Call Start');
    const big = {
      list: Array.from({ length: 200 }, (_, i) => ({
        i,
        deep: { a: { b: { c: { d: i } } } },
      })),
    };
    logger.debug('Big object', big);

    const messages = log.mock.calls.map((call) => call[2]);
    expect(messages).not.toContain(PING_RECEIVED_LOG);
    expect(messages.filter((m) => String(m).startsWith('SEND:'))).toHaveLength(
      1
    );
    expect(messages).toContain('[CallTimings][outbound][trickle] Call Start');
    expect(JSON.stringify(log.mock.calls)).toContain('hunter2'); // the raw arg; redacted when sanitized
    logger.disableAll();

    // What leaves the SDK: the whole object, and no password.
    const sent = JSON.stringify(
      sanitizeDetails({ args: log.mock.calls[0][3] })
    );
    expect(sent).not.toContain('hunter2');
    const whole = sanitizeDetails(big) as {
      list: { deep: { a: { b: { c: { d: number } } } } }[];
    };
    expect(whole.list).toHaveLength(200);
    expect(whole.list[199].deep.a.b.c.d).toBe(199);
  });

  it('puts the ICE candidate line into the log message', () => {
    logger.setLevel('debug', false);
    const client = makeClient();
    const log = jest.spyOn(client, 'log');
    logger.debug('RTCPeer Candidate:', {
      candidate:
        'candidate:842163049 1 udp 1677729535 203.0.113.7 61087 typ srflx raddr 0.0.0.0 rport 0 generation 0',
      sdpMid: '0',
      sdpMLineIndex: 0,
    });
    expect(log).toHaveBeenCalledWith(
      'debug',
      'ice',
      'RTCPeer Candidate: candidate:842163049 1 udp 1677729535 203.0.113.7 61087 typ srflx raddr 0.0.0.0 rport 0 generation 0',
      { sdpMid: '0', sdpMLineIndex: 0 }
    );
    logger.disableAll();
  });
});
