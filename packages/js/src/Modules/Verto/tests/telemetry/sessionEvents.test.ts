jest.unmock('uuid');

import TelemetryClient from '../../telemetry/TelemetryClient';
import SessionTelemetry, {
  networkSnapshot,
} from '../../telemetry/sessionEvents';
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

describe('Call Report V2 session events: added fields (2026-10-06)', () => {
  const fakeSessionWith = (extra: Record<string, unknown> = {}) =>
    ({
      options: { login: 'user', password: 'hunter2' },
      signalingVsp: {},
      hasAutoReconnect: () => false,
      ...extra,
    }) as unknown as BaseSession;

  it('sdk_creation_started carries the page and browser support', () => {
    const spy = jest.spyOn(TelemetryClient.prototype, 'emit');
    const client = new TelnyxRTC({ login_token: 'jwt', telemetry: TELEMETRY });
    clients.push(client.telemetry);
    const started = emitted(spy)[0];
    expect(started.payload.page).toEqual(
      expect.objectContaining({
        origin: 'http://localhost',
        visibility_state: 'visible',
        language: expect.any(String),
        timezone: expect.any(String),
      })
    );
    expect(started.payload.browser_support).toEqual(
      expect.objectContaining({
        rtc_peer_connection: expect.any(Boolean),
        set_sink_id: expect.any(Boolean),
        network_information: expect.any(Boolean),
      })
    );
  });

  it('network_changed carries every navigator.connection field and its trigger', () => {
    const connection = {
      type: 'wifi',
      effectiveType: '4g',
      downlink: 9.3,
      downlinkMax: Infinity,
      rtt: 50,
      saveData: false,
    };
    Object.defineProperty(navigator, 'connection', {
      value: connection,
      configurable: true,
    });
    try {
      expect(networkSnapshot(false, 'connection_change')).toEqual({
        initial: false,
        network_type: 'wifi',
        online: true,
        effective_type: '4g',
        downlink_mbps: 9.3,
        trigger: 'connection_change',
        connection_type: 'wifi',
        rtt_ms: 50,
        save_data: false,
      });
    } finally {
      delete (navigator as unknown as { connection?: unknown }).connection;
    }
  });

  it('socket events carry the WebSocket details and frame counts', () => {
    const client = makeClient();
    const events = new SessionTelemetry(fakeSessionWith(), client);
    const spy = jest.spyOn(client, 'emit');
    const socket = events.socketConnectStarted({
      url: 'wss://rtc.telnyx.com',
      use_canary_server: false,
      skip_last_voice_sdk_id: false,
      skip_trailing: false,
    });
    const ws = {
      protocol: '',
      extensions: 'permessage-deflate',
      bufferedAmount: 0,
    } as unknown as WebSocket;
    events.socketOpened(socket, ws);
    events.frameSent({ jsonrpc: '2.0', id: 'p', method: 'telnyx_rtc.ping' });
    events.receivedFrameDone(
      events.frameReceived({ jsonrpc: '2.0', id: 'p', result: {} })
    );
    events.socketEnded(socket, { code: 1006, reason: '', wasClean: false });

    const byName = (name: string) =>
      emitted(spy).find((e) => e.name === name).payload;
    expect(byName('socket_connect_started')).toEqual(
      expect.objectContaining({ attempt: 1, online: true })
    );
    expect(byName('socket_connected')).toEqual(
      expect.objectContaining({
        attempt: 1,
        protocol: '',
        extensions: 'permessage-deflate',
      })
    );
    expect(byName('socket_closed')).toEqual(
      expect.objectContaining({
        close_code: 1006,
        closed_by: 'network',
        was_clean: false,
        frames_sent: 1,
        frames_received: 1,
        since_last_received_ms: expect.any(Number),
        buffered_amount: 0,
        online: true,
      })
    );
  });

  it('login and client_ready carry the server answers, without credentials', () => {
    const client = makeClient();
    const session = fakeSessionWith({ region: 'us-central', dc: 'da1' });
    const events = new SessionTelemetry(session, client);
    const spy = jest.spyOn(client, 'emit');
    events.loginStarted('login', undefined, 'rpc-7');
    events.loginSucceeded({
      message: 'logged in',
      sessid: 'sess-1',
      token: 'secret-token',
    });
    events.clientReady({
      call_report_id: 'cr-1',
      dc: 'da1',
      region: 'us-central',
      state: 'REGED',
    });
    const byName = (name: string) =>
      emitted(spy).find((e) => e.name === name).payload;
    expect(byName('login_started')).toEqual(
      expect.objectContaining({ attempt: 1, rpc_id: 'rpc-7' })
    );
    expect(byName('login_succeeded')).toEqual(
      expect.objectContaining({
        attempt: 1,
        server_result: {
          message: 'logged in',
          sessid: 'sess-1',
          token: '[REDACTED]',
        },
      })
    );
    expect(byName('client_ready')).toEqual(
      expect.objectContaining({
        call_report_id: 'cr-1',
        gateway_state: 'REGED',
        server_result: {
          call_report_id: 'cr-1',
          dc: 'da1',
          region: 'us-central',
          state: 'REGED',
        },
      })
    );
    expect(JSON.stringify(emitted(spy))).not.toContain('secret-token');
  });

  it('gateway events carry the request id, timing and source', () => {
    const client = makeClient();
    const events = new SessionTelemetry(fakeSessionWith(), client);
    const spy = jest.spyOn(client, 'emit');
    events.gatewayCheckStarted('g1');
    events.frameSent({
      jsonrpc: '2.0',
      id: 'g1',
      method: 'telnyx_rtc.gatewayState',
      params: {},
    });
    events.receivedFrameDone(
      events.frameReceived({
        jsonrpc: '2.0',
        id: 'g1',
        result: { params: { state: 'REGED' } },
      })
    );
    events.gatewayState('TRYING', 'notification');
    events.gatewayState('REGED', 'result');
    const all = emitted(spy);
    expect(all.find((e) => e.name === 'gateway_check_started').payload).toEqual(
      { check_number: 1, rpc_id: 'g1' }
    );
    expect(
      all.find((e) => e.name === 'gateway_check_succeeded').payload
    ).toEqual(
      expect.objectContaining({
        rpc_id: 'g1',
        server_result: { state: 'REGED' },
      })
    );
    const states = all.filter((e) => e.name === 'gateway_state');
    expect(states[0].payload.source).toBe('notification');
    expect(states[1].payload).toEqual(
      expect.objectContaining({
        previous_state: 'TRYING',
        since_previous_ms: expect.any(Number),
        source: 'result',
      })
    );
  });

  it('device events carry the whole list and the chosen device', async () => {
    let devices = [
      { kind: 'audioinput', label: 'Mic A', deviceId: 'mic-a', groupId: 'g1' },
      { kind: 'audiooutput', label: 'Spk A', deviceId: 'spk-a', groupId: 'g1' },
    ];
    let onChange: () => void = () => undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mediaDevices = navigator.mediaDevices as any;
    const original = {
      enumerateDevices: mediaDevices.enumerateDevices,
      addEventListener: mediaDevices.addEventListener,
      removeEventListener: mediaDevices.removeEventListener,
    };
    mediaDevices.enumerateDevices = () => Promise.resolve(devices);
    mediaDevices.addEventListener = (_: string, fn: () => void) => {
      onChange = fn;
    };
    mediaDevices.removeEventListener = jest.fn();
    try {
      const client = makeClient();
      const events = new SessionTelemetry(fakeSessionWith(), client);
      const spy = jest.spyOn(client, 'emit');
      events.created();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const created = emitted(spy).find((e) => e.name === 'sdk_created');
      expect(created.payload.devices).toEqual([
        {
          kind: 'audioinput',
          label: 'Mic A',
          device_id: 'mic-a',
          group_id: 'g1',
        },
        {
          kind: 'audiooutput',
          label: 'Spk A',
          device_id: 'spk-a',
          group_id: 'g1',
        },
      ]);

      events.inputDeviceChanged('app', 'mic-a');
      expect(
        emitted(spy).find((e) => e.name === 'input_device_changed').payload
      ).toEqual({
        by: 'app',
        device_count: 1,
        device_id: 'mic-a',
        label: 'Mic A',
        group_id: 'g1',
      });

      devices = [
        ...devices,
        { kind: 'videoinput', label: 'Cam', deviceId: 'cam', groupId: 'g2' },
        {
          kind: 'audioinput',
          label: 'Mic B',
          deviceId: 'mic-b',
          groupId: 'g3',
        },
      ];
      onChange();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const changed = emitted(spy).find(
        (e) => e.name === 'device_list_changed'
      ).payload;
      expect(changed).toEqual(
        expect.objectContaining({
          input_count: 2,
          added: 1, // audio devices only, as before
          video_input_count: 1,
        })
      );
      expect(changed.devices).toHaveLength(4);
      expect(changed.added_devices.map((d) => d.device_id)).toEqual([
        'cam',
        'mic-b',
      ]);
      events.dispose();
    } finally {
      Object.assign(mediaDevices, original);
    }
  });
});
