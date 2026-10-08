/* eslint-disable @typescript-eslint/no-explicit-any */
import TelemetryClient, {
  IDLE_CLOSE_MS,
  MAX_PENDING_EVENTS,
  TELEMETRY_CONTROL_METHOD,
  TELEMETRY_LOGIN_METHOD,
  TELEMETRY_METHOD,
} from '../sender';
import {
  browserFromBrands,
  browserFromUserAgent,
  buildClientInfo,
  cpuArchFromHints,
  detectOs,
  osVersionFromHints,
  resetClientHints,
} from '../browser';
import { stripUrlCredentials, toErrorInfo } from '../sanitize';
import { FakeSocket, host, logEvent, makeClient } from './fakes';

const messages = (ws: FakeSocket) => ws.events().map((e) => e.payload.message);

describe('TelemetryClient', () => {
  it('sends and prints by default, captures only with capture, and is off with enabled: false', () => {
    const cases: Array<[any, boolean, [boolean, boolean] | null]> = [
      // settings, allowSocket, [capture, console mirror] (null = off)
      [undefined, true, [false, true]],
      [{}, true, [false, true]],
      [{ url: 'ws://x' }, true, [false, false]],
      [{ enabled: true }, true, [false, false]],
      [{ enabled: true, console: true }, true, [false, true]],
      [{ capture: true }, true, [true, false]],
      [{ url: 'ws://x', enabled: false }, true, null],
      [{ url: 'ws://x' }, false, null], // an anonymous-only client may not log in...
      [{}, false, [true, false]], // ...but captures by default
    ];
    for (const [settings, allowSocket, expected] of cases) {
      const client = TelemetryClient.create(
        settings,
        undefined,
        '',
        allowSocket
      );
      expect(client ? [client.capture, (client as any)._mirror] : null).toEqual(
        expected
      );
      client?.close();
    }
  });

  it('prints each sent frame to the console in the default mode', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const client = makeClient({ console: true }, true);
    logEvent(client, 'hello');
    expect(messages(FakeSocket.last())).toEqual(['hello']);
    expect(
      client.capturedFrames().map((f) => JSON.parse(f).params.payload.message)
    ).toContain('hello');
    expect(log.mock.calls.some((call) => call[0] === '[CR2 telemetry]')).toBe(
      true
    );
    log.mockRestore();
  });

  it('waits for the login, then sends pending events in order with sent_at', () => {
    const client = makeClient();
    logEvent(client, 'one');
    logEvent(client, 'two');
    client.connect();
    const ws = FakeSocket.last();
    ws.open();
    const login = ws.sent[0];
    expect(login.method).toBe(TELEMETRY_LOGIN_METHOD);
    expect(login.params).toEqual(
      expect.objectContaining({
        login_token: 'secret-jwt',
        sdk_instance_id: client.sdkInstanceId,
        voice_sdk_id: 'VSDK1',
      })
    );
    expect(ws.events()).toHaveLength(0);
    ws.answerLogin();
    expect(ws.events().map((e) => [e.sequence, !!e.sent_at])).toEqual([
      [1, true],
      [2, true],
    ]);
    logEvent(client, 'three');
    const live = ws.events()[2];
    expect(live).toEqual(
      expect.objectContaining({
        schema_version: '2.1',
        sequence: client.lastSequence,
        socket_generation: 2,
        ids: {
          sdk_instance_id: client.sdkInstanceId,
          voice_sdk_id: 'VSDK1',
          session_id: 'sess-1',
        },
      })
    );
    expect(live.sent_at).toBeUndefined();
    expect('call_sequence' in live).toBe(false);
    // Notifications only: no JSON-RPC id after the login.
    expect(ws.sent.slice(1).every((m) => m.id === undefined)).toBe(true);
  });

  it('never repeats a sequence across telemetry reconnects', () => {
    jest.useFakeTimers();
    const client = makeClient({}, true);
    logEvent(client, 'a');
    FakeSocket.last().close();
    logEvent(client, 'b');
    jest.advanceTimersByTime(1500); // first retry: 1 s ± 25%
    FakeSocket.last().open();
    FakeSocket.last().answerLogin();
    logEvent(client, 'c');
    const sequences = FakeSocket.instances
      .flatMap((ws) => ws.events())
      .filter((e) => ['a', 'b', 'c'].includes(e.payload.message))
      .map((e) => e.sequence);
    expect(sequences).toHaveLength(3);
    expect(sequences).toEqual([...new Set(sequences)].sort((a, b) => a - b));
    jest.useRealTimers();
  });

  it('keeps at most 1,000 pending events (oldest dropped) and reports the drops once', () => {
    const client = makeClient();
    for (let i = 0; i < MAX_PENDING_EVENTS + 2; i += 1)
      logEvent(client, `m${i}`);
    client.connect();
    FakeSocket.last().open();
    FakeSocket.last().answerLogin();
    const ws = FakeSocket.last();
    const sent = messages(ws);
    expect(sent).toHaveLength(MAX_PENDING_EVENTS);
    expect(sent[0]).toBe('m2');
    expect(sent[sent.length - 1]).toBe(`m${MAX_PENDING_EVENTS + 1}`);
    const drops = ws
      .events(true)
      .filter((e) => e.payload.message === 'Telemetry events dropped');
    expect(drops).toHaveLength(1);
    expect(drops[0].payload.details).toEqual({
      dropped_backlog: 0,
      dropped_pending: 2,
    });
  });

  it('drops events above a 64 KB socket backlog, never queues them', () => {
    const client = makeClient({}, true);
    const ws = FakeSocket.last();
    ws.bufferedAmount = 64 * 1024 + 1;
    logEvent(client, 'dropped');
    ws.bufferedAmount = 0;
    logEvent(client, 'sent');
    expect(messages(ws)).toEqual(['sent']);
  });

  it('obeys the kill switch until switched back on', () => {
    const client = makeClient({}, true);
    const ws = FakeSocket.last();
    const control = (enabled: boolean) =>
      ws.receive({
        jsonrpc: '2.0',
        method: TELEMETRY_CONTROL_METHOD,
        params: { enabled },
      });
    control(false);
    logEvent(client, 'off');
    control(true);
    logEvent(client, 'on');
    expect(messages(ws)).toEqual(['on']);
  });

  it('copies a shared event to every active call, each copy with its own sequence', () => {
    const client = makeClient({}, true);
    const ws = FakeSocket.last();
    client.callStarted('call-a');
    client.emit(
      'call_state',
      { state: 'requesting' },
      { ids: { call_id: 'call-a' } }
    );
    client.callStarted('call-b');
    logEvent(client, 'shared');
    client.emit(
      'call_state',
      { state: 'active' },
      { ids: { call_id: 'call-b' } }
    );
    logEvent(client, 'solo');
    client.emit(
      'logs',
      { level: 'info', category: 'general', message: 'none' },
      { noActiveCall: true }
    );
    const base = ws.events()[0].sequence - 1;
    const rows = ws
      .events()
      .map((e) => [e.name, e.ids.call_id, e.sequence - base]);
    expect(rows).toEqual([
      ['call_state', 'call-a', 1],
      ['logs', 'call-a', 2],
      ['logs', 'call-b', 3],
      ['call_state', 'call-b', 4],
      ['logs', 'call-a', 5],
      ['logs', 'call-b', 6],
      ['logs', undefined, 7],
    ]);
    expect(ws.events().every((e) => !('call_sequence' in e))).toBe(true);
    // A reserved sequence goes to the first copy; the others take new ones.
    const reserved = client.reserveSequence();
    logEvent(client, 'between');
    client.emit(
      'logs',
      { level: 'info', category: 'general', message: 'reserved' },
      { sequence: reserved }
    );
    expect(
      ws
        .events()
        .filter((e) => e.payload.message === 'reserved')
        .map((e) => [e.ids.call_id, e.sequence - base])
    ).toEqual([
      ['call-a', 8],
      ['call-b', 11],
    ]);
    // An ended call's ID is dropped from later records.
    client.callEnded('call-a');
    client.emit(
      'signaling_message',
      { direction: 'received', raw: {} },
      { ids: { call_id: 'call-a' } }
    );
    expect(ws.find('signaling_message').ids.call_id).toBeUndefined();
  });

  it('never sends call_metrics without a socket, a login and a call, and spends no sequence on it', () => {
    const client = TelemetryClient.create({ url: 'ws://x' });
    client.attach({ ...host, getSocketGeneration: () => 0 });
    client.emit(
      'call_metrics',
      { interval_ms: 1000 },
      { ids: { call_id: 'c' } }
    );
    expect(client.lastSequence).toBe(0);
    client.close();
  });

  it('queues records in sequence order and drops the oldest first', () => {
    const client = makeClient();
    const reserved = client.reserveSequence();
    for (let i = 0; i < MAX_PENDING_EVENTS; i += 1) logEvent(client, `m${i}`);
    // Taken before the others: it goes first in the queue, so it is the one dropped.
    client.emit(
      'logs',
      { level: 'info', category: 'general', message: 'reserved' },
      { sequence: reserved }
    );
    client.connect();
    FakeSocket.last().open();
    FakeSocket.last().answerLogin();
    const sent = FakeSocket.last().events();
    expect(sent).toHaveLength(MAX_PENDING_EVENTS);
    expect(sent[0].payload.message).toBe('m0');
    expect(sent.some((e) => e.payload.message === 'reserved')).toBe(false);
    const sequences = sent.map((e) => e.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
  });

  it("hands a failed instance's pending events to the next live one", () => {
    const failed = makeClient();
    failed.emit('sdk_creation_failed', {
      error: { name: 'Error', message: 'x', code: '46002' },
    });
    failed.orphan();
    makeClient({}, true);
    expect(
      FakeSocket.last().find('sdk_creation_failed').ids.sdk_instance_id
    ).toBe(failed.sdkInstanceId);
  });

  it('leaves out an empty extra and the client details of the envelope', () => {
    const client = makeClient({}, true);
    const extra: Record<string, unknown> = { gone: undefined };
    client.emit('gateway_check_started', { check_number: 1, extra });
    client.emit('gateway_check_started', {
      check_number: 2,
      extra: { rpc_id: 'g' },
    });
    const [first, second] = FakeSocket.last().events();
    expect(first.payload).toEqual({ check_number: 1 });
    expect(second.payload).toEqual({ check_number: 2, extra: { rpc_id: 'g' } });
    expect(Object.keys(first.client).sort()).toEqual(
      [
        'environment',
        'os',
        'os_version',
        'sdk',
        'sdk_version',
        'user_agent',
      ].filter((key) => key in first.client)
    );
  });

  it('after -32001 keeps the socket, tells the host, and logs in again on it only with new credentials', () => {
    jest.useFakeTimers();
    let params: Record<string, unknown> = { login: 'u', passwd: 'p' };
    const onLoginRejected = jest.fn();
    const client = makeClient();
    client.attach({ ...host, getLoginParams: () => params, onLoginRejected });
    client.connect();
    const ws = FakeSocket.last();
    ws.open();
    ws.answerLogin({ code: -32001, message: 'Login Incorrect' });
    expect(onLoginRejected).toHaveBeenCalledTimes(1);
    expect(onLoginRejected.mock.calls[0][0]).toEqual(
      expect.objectContaining({ message: 'Login Incorrect' })
    );
    expect(ws.readyState).toBe(1);
    logEvent(client, 'kept');
    jest.advanceTimersByTime(60000);
    client.connect(); // same credentials: nothing
    const logins = () =>
      ws.sent.filter((m) => m.method === TELEMETRY_LOGIN_METHOD);
    expect(logins()).toHaveLength(1);
    params = { login_token: 'new-jwt' };
    client.connect();
    expect(FakeSocket.instances).toHaveLength(1);
    expect(logins()).toHaveLength(2);
    expect(logins()[1].params.login_token).toBe('new-jwt');
    ws.answerLogin();
    expect(client.ready).toBe(true);
    expect(messages(ws)).toEqual(['kept']);
    jest.useRealTimers();
  });

  it('closes the socket after 5 min with nothing to send (log lines do not count); the next event opens it again', () => {
    jest.useFakeTimers();
    const client = makeClient({}, true);
    const ws = FakeSocket.last();
    const network = () =>
      client.emit('network_changed', {
        initial: false,
        network_type: 'wifi',
        online: true,
      });
    jest.advanceTimersByTime(IDLE_CLOSE_MS - 1000);
    network(); // something to send: the countdown starts again
    jest.advanceTimersByTime(IDLE_CLOSE_MS - 1000);
    logEvent(client, 'log only');
    expect(ws.readyState).toBe(1);
    jest.advanceTimersByTime(1000);
    expect(ws.readyState).toBe(3);
    expect(TelemetryClient.liveInstanceIds()).not.toContain(
      client.sdkInstanceId
    );
    jest.advanceTimersByTime(10 * 60000); // no reconnects while closed
    expect(FakeSocket.instances).toHaveLength(1);
    network();
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.last().open();
    FakeSocket.last().answerLogin();
    expect(
      FakeSocket.last()
        .events()
        .map((e) => e.name)
    ).toEqual(['network_changed']);
    expect(TelemetryClient.liveInstanceIds()).toContain(client.sdkInstanceId);
    jest.useRealTimers();
  });

  it('closes every socket on pagehide', () => {
    const a = makeClient({}, true);
    const b = makeClient({}, true);
    window.dispatchEvent(new Event('pagehide'));
    expect(FakeSocket.instances.map((ws) => ws.readyState)).toEqual([3, 3]);
    expect(TelemetryClient.liveInstanceIds()).not.toContain(a.sdkInstanceId);
    expect(TelemetryClient.liveInstanceIds()).not.toContain(b.sdkInstanceId);
  });

  it('retries after -32003 Telemetry Unavailable, later than after a network drop', () => {
    jest.useFakeTimers();
    makeClient().connect();
    FakeSocket.last().open();
    FakeSocket.last().answerLogin({
      code: -32003,
      message: 'Telemetry Unavailable',
    });
    jest.advanceTimersByTime(15000);
    expect(FakeSocket.instances).toHaveLength(1);
    jest.advanceTimersByTime(30000);
    expect(FakeSocket.instances).toHaveLength(2);
    jest.useRealTimers();
  });
});

describe('capture mode', () => {
  it('sends nothing, keeps and prints every frame, redacts the login and flushes on schedule', () => {
    jest.useFakeTimers();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const frames: string[] = [];
    const flushes: string[][] = [];
    const client = TelemetryClient.create({
      capture: {
        consoleMark: '[mark]',
        flushIntervalMs: 60000,
        onFlush: (f) => flushes.push(f),
      },
      onFrame: (frame) => frames.push(frame),
    });
    client.attach({
      ...host,
      getLoginParams: () => ({ login: 'user', passwd: 'secret' }),
    });
    logEvent(client, 'before login');
    client.connect();
    jest.advanceTimersByTime(1); // the capture socket opens
    jest.advanceTimersByTime(1); // and answers the login
    logEvent(client, 'after login');
    jest.advanceTimersByTime(60000);
    logEvent(client, 'last');
    client.close();

    expect(FakeSocket.instances).toHaveLength(0);
    expect(client.capturedFrames()).toEqual(frames);
    const parsed = frames.map((frame) => JSON.parse(frame));
    expect(parsed[0].params).toEqual(
      expect.objectContaining({ login: '[REDACTED]', passwd: '[REDACTED]' })
    );
    expect(frames.join()).not.toContain('secret');
    expect(
      parsed
        .filter((f) => f.method === TELEMETRY_METHOD)
        .map((f) => f.params.payload.message)
    ).toEqual(expect.arrayContaining(['before login', 'after login', 'last']));
    expect(flushes).toHaveLength(2);
    expect(flushes.flat()).toEqual(frames);
    const marked = log.mock.calls.filter((call) => call[0] === '[mark]');
    expect(marked.some((call) => /^#\d+ logs$/.test(String(call[1])))).toBe(
      true
    );
    log.mockRestore();
    jest.useRealTimers();
  });
});

describe('client info', () => {
  it.each([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/141.0.0.0 Safari/537.36',
      { os: 'macos' },
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:150.0) Firefox/150.0',
      { os: 'macos' },
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) Safari/605',
      { os: 'macos', os_version: '10.14.6' },
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0.0.0',
      { os: 'windows' },
    ],
    [
      'Mozilla/5.0 (Windows NT 6.1) Chrome/100',
      { os: 'windows', os_version: '6.1' },
    ],
    [
      'Mozilla/5.0 (Linux; Android 10; K) Chrome/141.0.0.0 Mobile',
      { os: 'android' },
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/141.0.0.0',
      { os: 'android', os_version: '14' },
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) Mobile/15E148',
      { os: 'ios', os_version: '18.6' },
    ],
    ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)', { os: 'chromeos' }],
    ['Mozilla/5.0 (X11; Linux x86_64)', { os: 'linux' }],
    ['', { os: 'unknown' }],
  ])('leaves frozen user-agent OS versions out: %s', (ua, expected) => {
    expect(detectOs(ua)).toEqual(expected);
  });

  it.each([
    ['macos', '26.6.2', '26.6.2'],
    ['macos', '15.0.0', '15'],
    ['windows', '19.0.0', '11'],
    ['windows', '10.0.0', '10'],
    ['windows', '0.3.0', undefined],
    ['android', '14.0.0', '14'],
    ['linux', '6.1', '6.1'],
    ['ios', '18.0', undefined],
    ['macos', '', undefined],
  ])('maps the Client Hints version of %s %s', (os: any, version, expected) => {
    expect(osVersionFromHints(os, version)).toBe(expected);
  });

  it.each([
    [
      'Mozilla/5.0 (Macintosh) Chrome/148.0.0.0 Safari/537.36',
      { browser: 'chrome', browser_version: '148' },
    ],
    [
      'Mozilla/5.0 (Windows) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.3240.50',
      { browser: 'edge', browser_version: '148.0.3240.50' },
    ],
    [
      'Mozilla/5.0 (Macintosh; rv:150.0) Gecko/20100101 Firefox/150.0',
      { browser: 'firefox', browser_version: '150' },
    ],
    [
      'Mozilla/5.0 (Macintosh) Version/26.0 Safari/605.1.15',
      { browser: 'safari', browser_version: '26' },
    ],
    ['Something', { browser: 'other' }],
  ])('reads the browser from %s', (ua, expected) => {
    expect(browserFromUserAgent(ua)).toEqual(expected);
  });

  it('picks the real brand from Client Hints, names the CPU', () => {
    expect(
      browserFromBrands([
        { brand: 'Not A(Brand', version: '99' },
        { brand: 'Brave', version: '1.83.112' },
        { brand: 'Chromium', version: '148.0.7778.96' },
      ])
    ).toEqual({ browser: 'brave', browser_version: '1.83.112' });
    expect([
      cpuArchFromHints('arm', '64'),
      cpuArchFromHints('x86', '64'),
      cpuArchFromHints('x86', '32'),
      cpuArchFromHints(undefined, '64'),
    ]).toEqual(['arm64', 'x86_64', 'x86', undefined]);
  });

  it('fills the real OS version and browser details in from Client Hints', async () => {
    resetClientHints();
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: {
        mobile: false,
        getHighEntropyValues: () =>
          Promise.resolve({
            platformVersion: '26.6.2',
            architecture: 'arm',
            bitness: '64',
            model: '',
            formFactors: ['Desktop'],
            fullVersionList: [
              { brand: 'Google Chrome', version: '148.0.7778.96' },
            ],
          }),
      },
    });
    const ua = jest
      .spyOn(navigator, 'userAgent', 'get')
      .mockReturnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/141.0.0.0 Safari/537.36'
      );
    const { client, details } = buildClientInfo('1.0.0');
    expect(client.os_version).toBeUndefined();
    for (let i = 0; i < 3; i += 1) await Promise.resolve();
    expect(client).toEqual(
      expect.objectContaining({
        os: 'macos',
        os_version: '26.6.2',
        sdk_version: '1.0.0',
      })
    );
    expect(details).toEqual(
      expect.objectContaining({
        os_version: '26.6.2',
        browser: 'chrome',
        browser_version: '148.0.7778.96',
        cpu_arch: 'arm64',
        form_factor: 'desktop',
      })
    );
    expect(details.device_model).toBeUndefined();
    ua.mockRestore();
    delete (navigator as any).userAgentData;
    resetClientHints();
  });
});

describe('toErrorInfo', () => {
  it.each([
    [
      'the SDK code and the server answer of a wrapped JSON-RPC error',
      Object.assign(new Error('Bye failed'), {
        code: 44003,
        originalError: { code: -32002, message: 'CALL DOES NOT EXIST' },
      }),
      {
        code: '44003',
        server_code: '-32002',
        server_message: 'CALL DOES NOT EXIST',
      },
    ],
    [
      'a bare JSON-RPC error as a ServerError',
      { code: -32001, message: 'Login Incorrect' },
      { name: 'ServerError', server_code: '-32001' },
    ],
    [
      'no code from a DOMException legacy code',
      { name: 'NotFoundError', message: 'm', code: 8 },
      { name: 'NotFoundError' },
    ],
    [
      'credentials scrubbed from the message',
      new Error('token eyJa.b.c'),
      { message: 'token [REDACTED]' },
    ],
  ])('keeps %s', (_, error, expected) => {
    expect(toErrorInfo(error)).toEqual(expect.objectContaining(expected));
    if (!('code' in expected)) expect(toErrorInfo(error).code).toBeUndefined();
  });
});

describe('stripUrlCredentials', () => {
  it('removes user:password@ from URLs, leaves the rest', () => {
    expect(
      stripUrlCredentials(
        'turn:x turns://u:p@turn.telnyx.com:443?transport=tcp ok'
      )
    ).toBe('turn:x turns://turn.telnyx.com:443?transport=tcp ok');
    expect(
      stripUrlCredentials('see https://example.com/a@b and wss://user@host')
    ).toBe('see https://example.com/a@b and wss://user@host');
  });

  it('stays fast on crafted input', () => {
    const crafted = 'a://' + '!:'.repeat(200000) + ' ' + 'a'.repeat(200000);
    const started = Date.now();
    stripUrlCredentials(crafted);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
