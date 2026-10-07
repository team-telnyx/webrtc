/* eslint-disable @typescript-eslint/no-explicit-any */
import SessionTelemetry, { networkSnapshot } from '../session';
import { forwardSdkLog } from '../logs';
import { PING_RECEIVED_LOG } from '../sanitize';
import { config, connectedSession, FakeSocket, makeSession } from './fakes';

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

let devices: Array<Record<string, string>> = [];
let onDeviceChange: () => void = () => undefined;
beforeEach(() => {
  devices = [
    { kind: 'audioinput', label: 'Mic A', deviceId: 'mic-a', groupId: 'g1' },
    { kind: 'audiooutput', label: 'Spk A', deviceId: 'spk-a', groupId: 'g1' },
  ];
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      enumerateDevices: () => Promise.resolve(devices),
      addEventListener: (_: string, fn: () => void) => (onDeviceChange = fn),
      removeEventListener: jest.fn(),
    },
  });
});

describe('SessionTelemetry', () => {
  it('starts with sdk_creation_started: options, redacted raw options, client details once', () => {
    const session = makeSession({
      options: {
        login_token: 'jwt-secret',
        iceServers: [
          { urls: 'turn:t.example', username: 'u', credential: 'c' },
        ],
        telemetry: { url: 'ws://t' },
        onReady: () => undefined,
      },
    });
    const { ws } = connectedSession(session);
    const started = ws.find('sdk_creation_started');
    expect(started.sequence).toBe(1);
    expect(started.payload.options).toEqual(
      expect.objectContaining({
        login: null,
        login_type: 'token',
        custom_ice_servers: true,
        ice_servers: [{ url: 'turn:t.example', has_credential: true }],
        telemetry: { enabled: true },
      })
    );
    expect(started.payload.raw_client_options).toEqual({
      login_token: '[REDACTED]',
      iceServers: [
        { urls: 'turn:t.example', username: 'u', credential: '[REDACTED]' },
      ],
      telemetry: { url: 'ws://t' },
      onReady: '[function]',
    });
    expect(Object.keys(started.payload.extra)).toEqual(
      expect.arrayContaining(['page', 'browser_support', 'client_details'])
    );
    expect(started.payload.extra.client_details).toEqual(
      expect.objectContaining({ sdk: 'js', sdk_version: '9.9.9' })
    );
    expect(JSON.stringify(ws.events(true))).not.toContain('jwt-secret');
  });

  it('logs in to the telemetry socket with the signaling credentials; anonymous-only only captures', () => {
    connectedSession(
      makeSession({
        options: { login: 'u', passwd: 'p', telemetry: { url: 'ws://t' } },
      })
    );
    expect(FakeSocket.last().sent[0].params).toEqual(
      expect.objectContaining({ login: 'u', passwd: 'p' })
    );
    const anonymous = SessionTelemetry.create(
      makeSession({
        options: {
          anonymous_login: { target_id: 'a' },
          telemetry: { url: 'ws://t' },
        },
      }),
      config
    );
    expect(anonymous).toBeNull();
    const off = SessionTelemetry.create(
      makeSession({ options: { telemetry: { enabled: false } } }),
      config
    );
    expect(off).toBeNull();
  });

  it('created(): sdk_created with the device list (filled in before it is sent), then the network', async () => {
    const events = SessionTelemetry.create(makeSession(), config);
    events.created();
    await flush();
    events.client.connect();
    const ws = FakeSocket.last();
    ws.open();
    ws.answerLogin();
    const created = ws.payload('sdk_created');
    expect(created.creation_duration_ms).toEqual(expect.any(Number));
    expect(created.sdk_instances).toContain(events.client.sdkInstanceId);
    expect(created.extra.devices.length).toBeGreaterThan(0);
    const network = ws.find('network_changed');
    expect(network.sequence).toBeGreaterThan(ws.find('sdk_created').sequence);
    expect(network.payload).toEqual(
      expect.objectContaining({ initial: true, extra: { trigger: 'initial' } })
    );
    events.dispose();
    events.client.close();
  });

  it('app_state_changed carries the state before it', async () => {
    const events = SessionTelemetry.create(makeSession(), config);
    events.created();
    await flush();
    const visibility = jest.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    visibility.mockRestore();
    events.client.connect();
    const ws = FakeSocket.last();
    ws.open();
    ws.answerLogin();
    expect(
      ws
        .events()
        .filter((e) => e.name === 'app_state_changed')
        .map((e) => [
          e.payload.state,
          e.payload.previous_state,
          e.payload.extra.trigger,
        ])
    ).toEqual([
      ['hidden', 'visible', 'visibilitychange'],
      ['visible', 'hidden', 'visibilitychange'],
      ['visible', 'visible', 'focus'],
    ]);
    events.dispose();
    events.client.close();
  });

  it('network_changed puts every navigator.connection field not in the contract under extra', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: {
        type: 'wifi',
        effectiveType: '4g',
        downlink: 9.3,
        downlinkMax: Infinity,
        rtt: 50,
        saveData: false,
      },
    });
    expect(networkSnapshot(false, 'connection_change')).toEqual({
      initial: false,
      network_type: 'wifi',
      online: true,
      effective_type: '4g',
      downlink_mbps: 9.3,
      extra: {
        trigger: 'connection_change',
        connection_type: 'wifi',
        rtt_ms: 50,
        save_data: false,
      },
    });
    delete (navigator as any).connection;
  });

  it('never records keepalive frames, or takes a sequence for them', () => {
    const { events, ws } = connectedSession();
    const before = events.client.lastSequence;
    events.frameSent({ jsonrpc: '2.0', id: 'p1', method: 'telnyx_rtc.ping' });
    events.receivedFrameDone(
      events.frameReceived({
        jsonrpc: '2.0',
        id: 'p1',
        result: { method: 'pong' },
      })
    );
    events.receivedFrameDone(
      events.frameReceived({ jsonrpc: '2.0', id: 7, method: 'telnyx_rtc.ping' })
    );
    events.frameSent({
      jsonrpc: '2.0',
      id: 7,
      result: { method: 'telnyx_rtc.ping' },
    });
    events.frameSent({ jsonrpc: '2.0', id: 'd1', type: 'debug_report_data' });
    events.receivedFrameDone(
      events.frameReceived({ jsonrpc: '2.0', id: 'd1', result: {} })
    );
    expect(events.client.lastSequence).toBe(before);
    expect(ws.find('signaling_message')).toBeUndefined();
  });

  it('signaling_message = { direction, raw } with credentials and a=ice-pwd removed', () => {
    const { events, ws } = connectedSession();
    events.frameSent({
      jsonrpc: '2.0',
      id: 'l1',
      method: 'login',
      params: {
        login: 'user',
        passwd: 'hunter2',
        login_token: '',
        userVariables: { a: 1 },
      },
    });
    const invite = {
      jsonrpc: '2.0',
      id: 'r1',
      method: 'telnyx_rtc.invite',
      params: {
        callID: 'call-1',
        sdp: 'v=0\r\na=ice-ufrag:uf1\r\na=ice-pwd:secret\r\na=rtpmap:0 PCMU/8000\r\n',
      },
    };
    events.frameSent(invite);
    const answer = {
      jsonrpc: '2.0',
      id: 'r1',
      result: { message: 'CALL CREATED' },
    };
    const received = events.frameReceived(answer);
    events.receivedFrameDone(received);
    const [login, sent, response] = ws
      .events()
      .filter((e) => e.name === 'signaling_message');
    expect(login.payload.raw.params).toEqual({
      login: 'user',
      passwd: '[REDACTED]',
      login_token: '',
      userVariables: { a: 1 },
    });
    expect(sent.payload.direction).toBe('sent');
    expect(sent.payload.raw.params.sdp).toBe(
      'v=0\r\na=ice-ufrag:uf1\r\na=rtpmap:0 PCMU/8000\r\n'
    );
    expect(sent.ids.call_id).toBe('call-1');
    // The answer carries its request's call ID and the sequence taken on arrival.
    expect(response.payload).toEqual({ direction: 'received', raw: answer });
    expect([response.ids.call_id, response.sequence]).toEqual([
      'call-1',
      received.sequence,
    ]);
    expect(JSON.stringify(ws.events(true))).not.toMatch(/hunter2|secret/);
  });

  it('socket events: target without its query, then connected, closed and failed with their extras', () => {
    const { events, ws, session } = connectedSession();
    session.options.region = 'us-east';
    events.socketConnectStarted(
      new URL(
        'wss://rtc.telnyx.com/?voice_sdk_id=VS0&rtc_ip=1.2.3.4&rtc_port=5061&canary=true'
      )
    );
    const signaling: any = {
      protocol: '',
      extensions: 'permessage-deflate',
      bufferedAmount: 0,
    };
    events.socketCreated(signaling);
    events.socketOpened(signaling);
    events.frameSent({ jsonrpc: '2.0', id: 'x', method: 'telnyx_rtc.info' });
    events.socketEnded(signaling, { code: 1006, reason: '', wasClean: false });
    events.socketConnectStarted(new URL('wss://rtc.telnyx.com'));
    const failing: any = {};
    events.socketCreated(failing);
    events.socketEnded(failing, { code: 1006, reason: 'refused' });
    expect(ws.payload('socket_connect_started')).toEqual({
      target: {
        url: 'wss://rtc.telnyx.com',
        use_canary_server: true,
        skip_last_voice_sdk_id: false,
        skip_trailing: false,
        region: 'us-east',
        rtc_ip: '1.2.3.4',
        rtc_port: 5061,
        resume_voice_sdk_id: 'VS0',
      },
      is_reconnect: false,
      extra: { attempt: 1, online: true },
    });
    expect(ws.payload('socket_connected')).toEqual({
      connect_duration_ms: expect.any(Number),
      extra: { attempt: 1, protocol: '', extensions: 'permessage-deflate' },
    });
    expect(ws.payload('socket_closed')).toEqual(
      expect.objectContaining({
        close_code: 1006,
        closed_by: 'network',
        will_reconnect: true,
        extra: expect.objectContaining({
          was_clean: false,
          frames_sent: 1,
          frames_received: 0,
          buffered_amount: 0,
        }),
      })
    );
    expect(ws.payload('socket_failed')).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: '45001', message: 'refused' }),
        close_code: 1006,
        attempt: 2,
        extra: expect.objectContaining({ close_reason: 'refused' }),
      })
    );
  });

  it('login and client_ready: step times, server answers without credentials, no VSP names', () => {
    const { events, ws, session } = connectedSession(
      makeSession({ remoteElement: 'el', micId: '', speaker: 'spk' })
    );
    events.connectCalled();
    events.loginStarted('login', undefined, 'rpc-7');
    events.loginSucceeded({
      sessid: 's',
      token: 'secret-token',
      b2bua_rtc_node: 'b2b-1',
    });
    session.region = 'us-central';
    events.reattachedSessions(['old-call', 7]);
    events.clientReady({ call_report_id: 'cr-1', state: 'REGED' });
    events.clientReady({}); // once per login
    events.loginStarted('login', 's', 'rpc-8');
    events.loginFailed({ code: -32001, message: 'Login Incorrect' }, false);
    expect(ws.payload('login_started')).toEqual({
      method: { login_type: 'sip_credentials', username: 'user' },
      is_reconnect: false,
      extra: { attempt: 1, rpc_id: 'rpc-7' },
    });
    expect(ws.payload('login_succeeded').extra.server_result).toEqual({
      sessid: 's',
      token: '[REDACTED]',
      b2bua_rtc_node: 'b2b-1',
    });
    const ready = ws.events().filter((e) => e.name === 'client_ready');
    expect(ready).toHaveLength(1);
    // Option B′: VSP reports its and the B2BUA-RTC's names itself.
    expect(ready[0].payload.signaling_region).toBeUndefined();
    expect(ws.payload('login_succeeded').signaling_region).toBeUndefined();
    expect(ready[0].payload).toEqual(
      expect.objectContaining({
        is_reconnect: false,
        login_attempts: 1,
        remote_element_provided: true,
        mic_id_provided: false,
        speaker_id_provided: true,
        reattached_call_ids: ['old-call'],
        extra: {
          call_report_id: 'cr-1',
          gateway_state: 'REGED',
          server_result: { call_report_id: 'cr-1', state: 'REGED' },
        },
      })
    );
    expect(ws.payload('login_failed')).toEqual(
      expect.objectContaining({
        is_reconnect: true,
        error: expect.objectContaining({
          code: '46001',
          server_code: '-32001',
          server_message: 'Login Incorrect',
        }),
        will_retry: false,
      })
    );
    expect(JSON.stringify(ws.events(true))).not.toContain('secret-token');
  });

  it('gateway: polls answered or failed, state changes with their source', () => {
    const { events, ws } = connectedSession();
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
    events.gatewayCheckStarted('g2');
    events.gatewayCheckFailed('g2', new Error('timeout'), true);
    events.gatewayState('TRYING', 'notification');
    events.gatewayState('TRYING', 'notification');
    events.gatewayState('WEIRD', 'result');
    expect(ws.payload('gateway_check_started')).toEqual({
      check_number: 1,
      extra: { rpc_id: 'g1' },
    });
    expect(ws.payload('gateway_check_succeeded')).toEqual({
      check_number: 1,
      state: 'REGED',
      raw_state: 'REGED',
      response_time_ms: expect.any(Number),
      extra: { rpc_id: 'g1', server_result: { state: 'REGED' } },
    });
    expect(ws.payload('gateway_check_failed')).toEqual(
      expect.objectContaining({ check_number: 2, will_retry: true })
    );
    const states = ws
      .events()
      .filter((e) => e.name === 'gateway_state')
      .map((e) => e.payload);
    expect(states).toEqual([
      {
        state: 'TRYING',
        raw_state: 'TRYING',
        extra: { source: 'notification' },
      },
      {
        state: 'UNKNOWN',
        raw_state: 'WEIRD',
        previous_state: 'TRYING',
        extra: { since_previous_ms: expect.any(Number), source: 'result' },
      },
    ]);
  });

  it('device events carry the list and the chosen device under extra', async () => {
    const { events, ws } = connectedSession();
    events.created();
    await flush();
    events.inputDeviceChanged('app', 'mic-a');
    events.outputDeviceChanged('sdk', null);
    devices = [
      ...devices,
      { kind: 'audioinput', label: 'Mic B', deviceId: 'mic-b', groupId: 'g3' },
    ];
    onDeviceChange();
    await flush();
    expect(ws.payload('input_device_changed')).toEqual({
      by: 'app',
      device_count: 1,
      extra: { device_id: 'mic-a', label: 'Mic A', group_id: 'g1' },
    });
    expect(ws.payload('output_device_changed')).toEqual({
      by: 'sdk',
      device_count: 1,
      extra: { device_id: 'default' },
    });
    expect(ws.payload('device_list_changed')).toEqual(
      expect.objectContaining({
        input_count: 2,
        output_count: 1,
        added: 1,
        removed: 0,
      })
    );
    expect(ws.payload('device_list_changed').extra.added_devices).toEqual([
      {
        kind: 'audioinput',
        label: 'Mic B',
        device_id: 'mic-b',
        group_id: 'g3',
      },
    ]);
    events.dispose();
  });

  it('errors: SDK-wide errors are sanitized, call errors carry a code', () => {
    const { events, ws } = connectedSession();
    events.error('sdk', new Error('boom'), false, { password: 'p', n: 1 });
    events.error('call', { message: 'gone' }, true, undefined, {
      call_id: 'c',
    });
    const [sdk, call] = ws.events().filter((e) => e.name === 'error');
    expect(sdk.payload).toEqual(
      expect.objectContaining({
        stage: 'sdk',
        is_fatal: false,
        details: { password: '[REDACTED]', n: 1 },
      })
    );
    expect(call.payload.error.code).toBe('49001');
    expect(call.ids.call_id).toBe('c');
  });

  it('never throws into the SDK', () => {
    const { events } = connectedSession();
    (events as any).client = null;
    expect(() => {
      events.created();
      events.loginStarted('login');
      events.frameSent({ id: 1, method: 'x' });
      events.gatewayState('REGED');
      events.error('sdk', null, false);
    }).not.toThrow();
  });
});

describe('the SDK log sink', () => {
  it('sends every line whole (only credentials removed) except keepalive', () => {
    const { ws } = connectedSession();
    const big = {
      list: Array.from({ length: 200 }, (_, i) => ({
        deep: { a: { b: { c: { d: i } } } },
      })),
    };
    forwardSdkLog('debug', [PING_RECEIVED_LOG]);
    forwardSdkLog('debug', [
      'SEND: \n',
      JSON.stringify({ id: 'p', method: 'telnyx_rtc.ping' }),
      '\n',
    ]);
    forwardSdkLog('debug', [
      'SEND: \n',
      JSON.stringify({
        id: 'l',
        method: 'login',
        params: { passwd: 'hunter2' },
      }),
      '\n',
    ]);
    forwardSdkLog('debug', ['Big object', big]);
    forwardSdkLog('debug', [
      'RTCPeer Candidate:',
      {
        candidate:
          'candidate:1 1 udp 1677729535 203.0.113.7 61087 typ srflx raddr 0.0.0.0 rport 0',
        sdpMid: '0',
        sdpMLineIndex: 0,
      },
    ]);
    forwardSdkLog('warn', ['ICE candidate error', { errorCode: 701 }]);
    forwardSdkLog('log', ['not a level']);
    const logs = ws
      .events()
      .filter((e) => e.name === 'logs')
      .map((e) => e.payload);
    expect(
      logs.map((l) => [l.level, l.category, l.message.split('\n')[0]])
    ).toEqual([
      ['debug', 'general', 'SEND: '],
      ['debug', 'general', 'Big object'],
      [
        'debug',
        'ice',
        'RTCPeer Candidate: candidate:1 1 udp 1677729535 203.0.113.7 61087 typ srflx raddr 0.0.0.0 rport 0',
      ],
      ['warn', 'ice_candidate_error', 'ICE candidate error'],
    ]);
    expect(logs[0].details.args[0]).toContain('[REDACTED]');
    expect(logs[1].details.list[199].deep.a.b.c.d).toBe(199);
    expect(logs[2].details).toEqual({ sdpMid: '0', sdpMLineIndex: 0 });
    expect(JSON.stringify(ws.events(true))).not.toContain('hunter2');
  });
});
