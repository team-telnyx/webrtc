/* eslint-disable @typescript-eslint/no-explicit-any */
import SessionTelemetry, { type SessionHost } from '../session';
import TelemetryClient, {
  setTelemetryWebSocket,
  TELEMETRY_LOGIN_METHOD,
  TELEMETRY_METHOD,
} from '../sender';

/** The telemetry socket: keeps what was sent; the test opens it and answers the login. */
export class FakeSocket {
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

  static last(): FakeSocket {
    return FakeSocket.instances[FakeSocket.instances.length - 1];
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

  answerLogin(error?: { code: number; message: string }) {
    const login = this.sent
      .filter((m) => m.method === TELEMETRY_LOGIN_METHOD)
      .pop();
    this.receive({
      jsonrpc: '2.0',
      id: login.id,
      ...(error ? { error } : { result: {} }),
    });
  }

  /** Every event sent, the sender's own lines (category telemetry) left out unless `all`. */
  events(all = false): any[] {
    return this.sent
      .filter((m) => m.method === TELEMETRY_METHOD)
      .map((m) => m.params)
      .filter(
        (e) => all || !(e.name === 'logs' && e.payload.category === 'telemetry')
      );
  }

  find(name: string): any {
    return this.events().find((e) => e.name === name);
  }

  payload(name: string): any {
    return this.find(name)?.payload;
  }
}

export const config = {
  sdkVersion: '9.9.9',
  defaultIceServers: {
    production: [{ urls: 'stun:stun.telnyx.com:3478' }],
    development: [{ urls: 'stun:stundev.telnyx.com:3478' }],
  },
  readCallMarks: jest.fn((): Record<string, number> => ({})),
  observeCallMarks: jest.fn(() => () => undefined),
};

export const host = {
  getLoginParams: () => ({ login_token: 'secret-jwt' }),
  getVoiceSdkId: () => 'VSDK1',
  getSessionId: () => 'sess-1',
  getSocketGeneration: () => 2,
};

const live: Array<{ close(): void }> = [];

beforeEach(() => {
  FakeSocket.instances = [];
  setTelemetryWebSocket(FakeSocket);
});

afterEach(() => {
  live.splice(0).forEach((client) => client.close());
});

/** A sender with the fake host; `open` = connected and logged in. */
export function makeClient(telemetry: any = {}, open = false): TelemetryClient {
  const client = TelemetryClient.create({
    url: 'ws://localhost:9999',
    ...telemetry,
  });
  client.attach(host);
  live.push(client);
  if (open) {
    client.connect();
    FakeSocket.last().open();
    FakeSocket.last().answerLogin();
  }
  return client;
}

export const logEvent = (client: TelemetryClient, message: string) =>
  client.emit('logs', { level: 'info', category: 'general', message });

export type FakeSession = SessionHost & Record<string, any>;

export const makeSession = (extra: Record<string, any> = {}): FakeSession => ({
  options: { login: 'user', password: 'hunter2', telemetry: { url: 'ws://t' } },
  sessionid: 'sess-1',
  callReportVoiceSdkId: 'VSDK1',
  region: null,
  dc: null,
  hasAutoReconnect: () => true,
  ...extra,
});

/** Session telemetry whose socket is up: every event goes straight to the FakeSocket. */
export function connectedSession(session: FakeSession = makeSession()) {
  const events = SessionTelemetry.create(session, config);
  live.push(events.client);
  events.client.connect();
  const ws = FakeSocket.last();
  ws.open();
  ws.answerLogin();
  return { events, ws, session };
}
