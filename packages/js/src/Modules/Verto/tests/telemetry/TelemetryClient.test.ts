jest.unmock('uuid');
/* eslint-disable @typescript-eslint/no-explicit-any */

import { toErrorInfo } from '../../telemetry/sanitize';
import { createTelnyxError } from '../../util/errors';
import { BYE_SEND_FAILED } from '../../util/constants';

import CallTelemetry from '../../telemetry/CallTelemetry';
import TelemetryClient, {
  setTelemetryWebSocket,
  TELEMETRY_CONTROL_METHOD,
  TELEMETRY_LOGIN_METHOD,
  TELEMETRY_METHOD,
} from '../../telemetry/TelemetryClient';

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  sent: any[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code?: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  acceptLogin() {
    const login = this.sent.find((m) => m.method === TELEMETRY_LOGIN_METHOD);
    this.receive({ jsonrpc: '2.0', id: login.id, result: { message: 'ok' } });
  }

  /** The events under test, without the sender's own telemetry lines. */
  events() {
    return this.allEvents().filter(
      (e) => !(e.name === 'logs' && e.payload.category === 'telemetry')
    );
  }

  allEvents() {
    return this.sent
      .filter((m) => m.method === TELEMETRY_METHOD)
      .map((m) => m.params);
  }
}

const host = {
  getLoginParams: () => ({ login_token: 'secret-jwt' }),
  getVoiceSdkId: () => 'VSDK1',
  getSessionId: () => 'sess-1',
  getSocketGeneration: () => 2,
};

let clients: TelemetryClient[] = [];

const makeClient = (options = {}) => {
  const client = TelemetryClient.create({
    telemetry: { url: 'ws://localhost:9999', ...options },
  });
  client.attach(host);
  clients.push(client);
  return client;
};

const logEvent = (client: TelemetryClient, message: string) =>
  client.emit('logs', { level: 'info', category: 'general', message });

describe('TelemetryClient', () => {
  afterEach(() => {
    clients.forEach((client) => client.close());
    clients = [];
  });

  beforeEach(() => {
    FakeSocket.instances = [];
    setTelemetryWebSocket(FakeSocket as unknown as typeof WebSocket);
  });

  it('is off without a URL or when disabled', () => {
    expect(TelemetryClient.create({})).toBeNull();
    expect(
      TelemetryClient.create({ telemetry: { url: 'ws://x', enabled: false } })
    ).toBeNull();
  });

  it('waits until logged in, then sends pending events in order with sent_at', () => {
    const client = makeClient();
    logEvent(client, 'one');
    logEvent(client, 'two');
    client.connect();
    const ws = FakeSocket.instances[0];
    ws.open();

    const login = ws.sent[0];
    expect(login.method).toBe(TELEMETRY_LOGIN_METHOD);
    expect(login.params.login_token).toBe('secret-jwt');
    expect(login.params.sdk_instance_id).toBe(client.sdkInstanceId);
    expect(ws.events()).toHaveLength(0);

    ws.acceptLogin();
    const events = ws.events();
    expect(events.map((e) => e.sequence)).toEqual([1, 2]);
    expect(events.every((e) => typeof e.sent_at === 'string')).toBe(true);
    expect(ws.sent.slice(1).every((m) => m.id === undefined)).toBe(true);

    logEvent(client, 'three');
    const live = ws.events()[2];
    expect(live.sequence).toBe(client.lastSequence);
    expect(live.sequence).toBeGreaterThan(2);
    expect(live.sent_at).toBeUndefined();
    expect(live.ids).toEqual({
      sdk_instance_id: client.sdkInstanceId,
      voice_sdk_id: 'VSDK1',
      session_id: 'sess-1',
    });
    expect(live.socket_generation).toBe(2);
    expect(live.schema_version).toBe('2.1');
    expect(live.call_sequence).toBeUndefined();
    client.close();
  });

  it('never repeats a sequence across telemetry reconnects', () => {
    jest.useFakeTimers();
    const client = makeClient();
    client.connect();
    let ws = FakeSocket.instances[0];
    ws.open();
    ws.acceptLogin();
    logEvent(client, 'a');
    ws.close();
    logEvent(client, 'b');
    jest.advanceTimersByTime(1500); // first retry: 1 s ± 25%
    ws = FakeSocket.instances[1];
    ws.open();
    ws.acceptLogin();
    logEvent(client, 'c');
    const all = FakeSocket.instances
      .flatMap((s) => s.events())
      .filter(
        (e) => e.name === 'logs' && ['a', 'b', 'c'].includes(e.payload.message)
      );
    const sequences = all.map((e) => e.sequence);
    expect(new Set(sequences).size).toBe(sequences.length);
    expect(sequences).toEqual([...sequences].sort((x, y) => x - y));
    client.close();
    jest.useRealTimers();
  });

  it('keeps at most max_pending_events, dropping the oldest', () => {
    const client = makeClient({ maxPendingEvents: 3 });
    for (let i = 0; i < 5; i += 1) logEvent(client, `m${i}`);
    expect(client.pendingCount).toBe(3);
    client.connect();
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.acceptLogin();
    const messages = ws.events().map((e) => e.payload.message);
    expect(messages.slice(0, 3)).toEqual(['m2', 'm3', 'm4']);
    // The sender reports its own drops once, under category telemetry.
    const drops = ws
      .allEvents()
      .filter((e) => e.payload.message === 'Telemetry events dropped');
    expect(drops).toHaveLength(1);
    expect(drops[0].payload.details.dropped_pending).toBe(2);
    client.close();
  });

  it('drops events while the socket backlog is above the limit', () => {
    const client = makeClient({ maxSendBacklogBytes: 100 });
    client.connect();
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.acceptLogin();
    ws.bufferedAmount = 101;
    logEvent(client, 'dropped');
    expect(ws.events()).toHaveLength(0);
    ws.bufferedAmount = 0;
    logEvent(client, 'sent');
    expect(ws.events().map((e) => e.payload.message)).toContain('sent');
    client.close();
  });

  it('obeys the kill switch until switched back on', () => {
    const client = makeClient();
    client.connect();
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.acceptLogin();
    ws.receive({
      jsonrpc: '2.0',
      method: TELEMETRY_CONTROL_METHOD,
      params: { enabled: false },
    });
    logEvent(client, 'off');
    expect(ws.events()).toHaveLength(0);
    ws.receive({
      jsonrpc: '2.0',
      method: TELEMETRY_CONTROL_METHOD,
      params: { enabled: true },
    });
    logEvent(client, 'on');
    expect(ws.events().map((e) => e.payload.message)).toContain('on');
    client.close();
  });

  it('puts the active call ID on every record and never sends call_metrics without required IDs', () => {
    const client = makeClient();
    client.connect();
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.acceptLogin();
    client.callStarted('call-1');
    logEvent(client, 'during');
    client.callEnded('call-1');
    logEvent(client, 'after');
    const [during, after] = ws.events();
    expect(during.ids.call_id).toBe('call-1');
    expect(during.call_sequence).toBe(1);
    expect(after.ids.call_id).toBeUndefined();
    expect(after.call_sequence).toBeUndefined();

    const before = client.lastSequence;
    client.emit('call_metrics', { interval_ms: 1000 });
    expect(client.lastSequence).toBe(before);
    client.close();
  });

  const connected = () => {
    const client = makeClient();
    client.connect();
    const ws = FakeSocket.instances[FakeSocket.instances.length - 1];
    ws.open();
    ws.acceptLogin();
    return { client, ws };
  };

  it('sends a shared event to every active call with one sequence and per-call call_sequence (2.1)', () => {
    const { client, ws } = connected();
    client.callStarted('call-a');
    client.emit(
      'call_state',
      { state: 'requesting' },
      { ids: { call_id: 'call-a' } }
    );
    client.callStarted('call-b');
    client.emit(
      'call_state',
      { state: 'requesting' },
      { ids: { call_id: 'call-b' } }
    );
    client.emit('socket_closed', {
      close_code: 1006,
      closed_by: 'network',
      open_duration_ms: 5000,
      will_reconnect: true,
    });

    const closed = ws.events().filter((e) => e.name === 'socket_closed');
    expect(closed).toHaveLength(2);
    expect(closed.map((e) => e.ids.call_id)).toEqual(['call-a', 'call-b']);
    expect(closed[0].sequence).toBe(closed[1].sequence);
    expect(closed[0].timestamp).toBe(closed[1].timestamp);
    expect(closed.map((e) => e.call_sequence)).toEqual([2, 2]);
    expect(client.lastSequence).toBe(closed[0].sequence);
    // emit() returns the first copy
    const first = client.emit('logs', {
      level: 'info',
      category: 'general',
      message: 'x',
    });
    expect(first.ids.call_id).toBe('call-a');
    expect(first.call_sequence).toBe(3);

    // A call's own event is never copied.
    client.emit(
      'call_state',
      { state: 'active' },
      { ids: { call_id: 'call-b' } }
    );
    const own = ws
      .events()
      .filter((e) => e.name === 'call_state' && e.payload.state === 'active');
    expect(own).toHaveLength(1);
    expect(own[0].call_sequence).toBe(4);
    // noActiveCall: once, without call_id
    client.emit(
      'logs',
      { level: 'info', category: 'general', message: 'y' },
      {
        noActiveCall: true,
      }
    );
    const y = ws.events().filter((e) => e.payload?.message === 'y');
    expect(y).toHaveLength(1);
    expect(y[0].ids.call_id).toBeUndefined();
    expect(y[0].call_sequence).toBeUndefined();
  });

  it('sends nothing with a call ID after the call ended', () => {
    const { client, ws } = connected();
    client.callStarted('call-a');
    client.emit(
      'call_state',
      { state: 'active' },
      { ids: { call_id: 'call-a' } }
    );
    client.callEnded('call-a');
    expect(client.activeCallIds).toEqual([]);
    expect(client.callSequence('call-a')).toBe(0);
    // A late frame of the ended call goes out without its call_id.
    client.emit(
      'signaling_message',
      {
        direction: 'received',
        kind: 'response',
        method: 'telnyx_rtc.bye',
        rpc_id: '1',
        size_bytes: 10,
        category: 'call',
      } as any,
      { ids: { call_id: 'call-a' } }
    );
    const late = ws.events().find((e) => e.name === 'signaling_message');
    expect(late.ids.call_id).toBeUndefined();
    expect(late.call_sequence).toBeUndefined();
  });

  it('keeps the copies of a shared event together in the pending queue and drops them together', () => {
    const client = makeClient({ maxPendingEvents: 5 });
    client.callStarted('call-a');
    client.callStarted('call-b');
    const reserved = client.reserveSequence();
    logEvent(client, 'one'); // 2 copies
    logEvent(client, 'two'); // 2 copies
    client.emit(
      'logs',
      { level: 'info', category: 'general', message: 'reserved' },
      { sequence: reserved }
    ); // 2 copies, sorted before 'one'
    // 6 messages > 5: the oldest event (reserved) is dropped with both copies.
    client.connect();
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.acceptLogin();
    const sent = ws.events().filter((e) => e.payload.category === 'general');
    expect(sent.map((e) => [e.payload.message, e.ids.call_id])).toEqual([
      ['one', 'call-a'],
      ['one', 'call-b'],
      ['two', 'call-a'],
      ['two', 'call-b'],
    ]);
    const drops = ws
      .allEvents()
      .find((e) => e.payload.message === 'Telemetry events dropped');
    expect(drops.payload.details.dropped_pending).toBe(2);
  });

  it("ends a call with call_ended as its last record, carrying the call's record count", async () => {
    const { client, ws } = connected();
    const callA = { id: 'call-a', options: {} };
    const callB = { id: 'call-b', options: {} };
    const a = CallTelemetry.create(callA as any, { telemetry: client })!;
    const b = CallTelemetry.create(callB as any, { telemetry: client })!;
    a.start();
    a.onState('requesting', 'new');
    b.start();
    logEvent(client, 'shared');
    a.onState('hangup', 'requesting');
    await a.end();
    logEvent(client, 'after a');
    b.onState('requesting', 'new');

    const ofA = ws.events().filter((e) => e.ids.call_id === 'call-a');
    const ended = ofA[ofA.length - 1];
    expect(ended.name).toBe('call_ended');
    expect(ended.call_sequence).toBe(ofA.length);
    expect(ofA.map((e) => e.call_sequence)).toEqual(ofA.map((_, i) => i + 1));
    const after = ws.events().find((e) => e.payload?.message === 'after a');
    expect(after.ids.call_id).toBe('call-b');
    expect(client.activeCallIds).toEqual(['call-b']);

    // call_state always says where it came from
    const states = ws.events().filter((e) => e.name === 'call_state');
    expect(states.every((e) => e.payload.previous_state)).toBe(true);
    await b.end();
    expect(client.activeCallIds).toEqual([]);
  });

  it("hands a failed instance's events to the next live instance", () => {
    const failed = makeClient();
    failed.emit('sdk_creation_failed', {
      error: { name: 'Error', message: 'Invalid init options', code: '44001' },
    });
    failed.orphan();

    const next = makeClient();
    next.connect();
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.acceptLogin();
    const orphan = ws.events().find((e) => e.name === 'sdk_creation_failed');
    expect(orphan.ids.sdk_instance_id).toBe(failed.sdkInstanceId);
    next.close();
  });
});

describe('TelemetryClient login rejection', () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    setTelemetryWebSocket(FakeSocket as unknown as typeof WebSocket);
  });

  it('does not retry rejected credentials, but logs in with new ones', () => {
    jest.useFakeTimers();
    let params: Record<string, unknown> = { login: 'u', passwd: 'p' };
    const client = TelemetryClient.create({
      telemetry: { url: 'ws://localhost:9999' },
    });
    client.attach({ ...host, getLoginParams: () => params });
    client.connect();
    const first = FakeSocket.instances[0];
    first.open();
    const login = first.sent.find((m) => m.method === TELEMETRY_LOGIN_METHOD);
    first.receive({
      jsonrpc: '2.0',
      id: login.id,
      error: { code: -32001, message: 'Login Incorrect' },
    });
    jest.advanceTimersByTime(60000);
    client.connect();
    expect(FakeSocket.instances).toHaveLength(1);

    params = { login_token: 'new-jwt' };
    client.connect();
    expect(FakeSocket.instances).toHaveLength(2);
    const second = FakeSocket.instances[1];
    second.open();
    second.acceptLogin();
    expect(client.ready).toBe(true);
    client.close();
    jest.useRealTimers();
  });
});

describe('toErrorInfo', () => {
  it('keeps both the SDK code and the server code of a wrapped JSON-RPC error', () => {
    const error = createTelnyxError(BYE_SEND_FAILED, {
      code: -32002,
      message: 'CALL DOES NOT EXIST',
    });
    const info = toErrorInfo(error);
    expect(info.code).toBe(String(BYE_SEND_FAILED));
    expect(info.server_code).toBe('-32002');
    expect(info.server_message).toBe('CALL DOES NOT EXIST');
  });

  it('names a bare JSON-RPC error ServerError, not Object', () => {
    const info = toErrorInfo({ code: -32001, message: 'Login Incorrect' });
    expect(info.name).toBe('ServerError');
    expect(info.server_code).toBe('-32001');
  });

  it('does not take a DOMException legacy code for an SDK or server code', () => {
    const domError = {
      name: 'NotFoundError',
      message: 'Requested device not found',
      code: 8,
    };
    const info = toErrorInfo(domError);
    expect(info.code).toBeUndefined();
    expect(info.server_code).toBeUndefined();
  });
});

describe('TelemetryClient when telemetry is unavailable', () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    setTelemetryWebSocket(FakeSocket as unknown as typeof WebSocket);
  });

  it('retries after -32003 Telemetry Unavailable, later than after a network drop', () => {
    jest.useFakeTimers();
    const client = TelemetryClient.create({
      telemetry: { url: 'ws://localhost:9999' },
    });
    client.attach(host);
    client.connect();
    const first = FakeSocket.instances[0];
    first.open();
    const login = first.sent.find((m) => m.method === TELEMETRY_LOGIN_METHOD);
    first.receive({
      jsonrpc: '2.0',
      id: login.id,
      error: { code: -32003, message: 'Telemetry Unavailable' },
    });
    jest.advanceTimersByTime(15000);
    expect(FakeSocket.instances).toHaveLength(1);
    jest.advanceTimersByTime(30000);
    expect(FakeSocket.instances).toHaveLength(2);
    client.close();
    jest.useRealTimers();
  });
});

describe('TelemetryClient capture mode', () => {
  it('sends nothing, keeps every frame in order, and redacts the login credentials', () => {
    jest.useFakeTimers();
    FakeSocket.instances = [];
    setTelemetryWebSocket(FakeSocket as unknown as typeof WebSocket);
    const frames: string[] = [];
    const client = TelemetryClient.create({
      telemetry: { capture: true, onFrame: (frame) => frames.push(frame) },
    });
    client.attach({
      ...host,
      getLoginParams: () => ({ login: 'user', passwd: 'secret' }),
    });
    logEvent(client, 'before login');
    client.connect();
    jest.runAllTimers();
    logEvent(client, 'after login');

    expect(FakeSocket.instances).toHaveLength(0);
    expect(client.capturedFrames()).toEqual(frames);
    const parsed = frames.map((frame) => JSON.parse(frame));
    expect(parsed[0].method).toBe(TELEMETRY_LOGIN_METHOD);
    expect(parsed[0].params.passwd).toBe('[REDACTED]');
    expect(parsed[0].params.login).toBe('[REDACTED]');
    expect(frames.join('\n')).not.toContain('secret');
    const messages = parsed
      .filter((f) => f.method === TELEMETRY_METHOD)
      .map((f) => f.params.payload.message);
    expect(messages).toContain('before login');
    expect(messages).toContain('after login');
    client.close();
    jest.useRealTimers();
  });
});

describe('TelemetryClient capture output', () => {
  it('prints each frame with a mark and flushes to onFlush every interval and on close', () => {
    jest.useFakeTimers();
    FakeSocket.instances = [];
    setTelemetryWebSocket(FakeSocket as unknown as typeof WebSocket);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const flushes: string[][] = [];
    const client = TelemetryClient.create({
      telemetry: {
        capture: {
          consoleMark: '[test mark]',
          flushIntervalMs: 60000,
          onFlush: (frames) => flushes.push(frames),
        },
      },
    });
    client.attach({ ...host, getLoginParams: () => ({ login_token: 'jwt' }) });
    client.connect();
    jest.advanceTimersByTime(10);
    logEvent(client, 'first');
    jest.advanceTimersByTime(60000);
    expect(flushes).toHaveLength(1);
    // the login frame plus the events captured so far
    expect(flushes[0].length).toBeGreaterThanOrEqual(2);
    logEvent(client, 'second');
    client.close();
    expect(flushes).toHaveLength(2);
    expect(flushes[1].some((f) => f.includes('second'))).toBe(true);

    const marked = log.mock.calls.filter((call) => call[0] === '[test mark]');
    expect(marked.length).toBeGreaterThanOrEqual(3);
    expect(marked.some((call) => /#\d+ logs/.test(String(call[1])))).toBe(true);
    expect(JSON.stringify(log.mock.calls)).not.toContain('"jwt"');
    log.mockRestore();
    jest.useRealTimers();
  });
});
