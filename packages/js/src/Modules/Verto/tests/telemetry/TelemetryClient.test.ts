jest.unmock('uuid');

import { toErrorInfo } from '../../telemetry/sanitize';
import { createTelnyxError } from '../../util/errors';
import { BYE_SEND_FAILED } from '../../util/constants';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    expect(live.schema_version).toBe('2.0');
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
    jest.advanceTimersByTime(1000);
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
    expect(after.ids.call_id).toBeUndefined();

    const before = client.lastSequence;
    client.emit('call_metrics', { interval_ms: 1000 });
    expect(client.lastSequence).toBe(before);
    client.close();
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
