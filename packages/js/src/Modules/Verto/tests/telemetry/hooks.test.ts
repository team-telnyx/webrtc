jest.unmock('uuid');

import {
  LoginType,
  setTelemetryWebSocket,
  TelemetryClient,
} from '@telnyx/webrtc-telemetry';
import TelnyxRTC from '../../../../TelnyxRTC';
import { register, trigger } from '../../services/Handler';
import { callWarning, telemetryOf } from '../../telemetry';
import { createTelnyxWarning } from '../../util/errors';
import { SwEvent } from '../../util/constants';
import logger from '../../util/logger';

type PendingEvent = {
  sequence: number;
  loginType?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: { case: string; value: any };
};
const pendingOf = (client: TelnyxRTC): PendingEvent[] =>
  (telemetryOf(client).client as unknown as { _pending: PendingEvent[] })
    ._pending;

/** The SDK's side of Call Report V2: telemetry starts with the client and its hooks reach the package. */
describe('Call Report V2 hooks', () => {
  let clients: TelnyxRTC[] = [];
  const make = (options: Record<string, unknown>) => {
    const client = new TelnyxRTC(options);
    clients.push(client);
    return client;
  };
  afterEach(() => {
    clients.forEach((client) => telemetryOf(client)?.client.close());
    clients = [];
  });

  it('is on by default, sending to the socket and printing to the console, sdk_creation_started first', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const client = make({ login_token: 'jwt' });
    const telemetry = telemetryOf(client);
    expect(telemetry.client.capture).toBe(false);
    expect((telemetry.client as any)._mirror).toBe(true); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(client.telemetry).toBe(telemetry.client);
    const pending = (telemetry.client as any)._pending; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(pending.map((e: PendingEvent) => e.payload.case)).toEqual([
      'sdkCreationStarted',
      'sdkCreated',
      'audioPreferencesChanged',
      'networkChanged',
    ]);
    expect(pending[0].sequence).toBe(1);
    expect(pending[0].loginType).toBe(LoginType.TOKEN);
    expect(pending[0].payload.value.options.loginType).toBe('token');
    expect(pending[2].payload.value).toEqual(
      expect.objectContaining({
        initial: true,
        remoteElementProvided: false,
        micIdProvided: false,
        speakerIdProvided: false,
      })
    );
    const text = JSON.stringify(pending, (_key, value) =>
      typeof value === 'bigint' ? String(value) : value
    );
    expect(text).not.toContain('"jwt"');
    log.mockRestore();
  });

  it('records nothing when telemetry is off', () => {
    const client = make({ login_token: 'jwt', telemetry: { enabled: false } });
    expect(telemetryOf(client)).toBeUndefined();
    expect(client.telemetry).toBeNull();
  });

  it('sends sdk_creation_failed before the constructor throws', () => {
    const orphan = jest.spyOn(TelemetryClient.prototype, 'orphan');
    const emit = jest.spyOn(TelemetryClient.prototype, 'emit');
    expect(() => new TelnyxRTC({ telemetry: { url: 'ws://t' } })).toThrow(
      'Invalid init options'
    );
    expect(emit.mock.calls.map((call) => call[0])).toEqual([
      'sdkCreationStarted',
      'sdkCreationFailed',
    ]);
    expect(
      (emit.mock.calls[1][1] as { error: { code: string } }).error.code
    ).toBe('46002');
    expect(orphan).toHaveBeenCalledTimes(1);
    orphan.mockRestore();
    emit.mockRestore();
  });

  it('opens the telemetry socket when created and warns the app (34002) when it rejects the credentials', () => {
    const sockets: FakeTelemetrySocket[] = [];
    class FakeTelemetrySocket {
      readyState = 0;
      bufferedAmount = 0;
      sent: Array<{ id: string; method: string }> = [];
      onopen: () => void;
      onmessage: (event: { data: string }) => void;
      onclose: (event: { code: number }) => void;
      onerror: () => void;
      constructor() {
        sockets.push(this);
      }
      send(text: string) {
        this.sent.push(JSON.parse(text));
      }
      close() {
        this.readyState = 3;
        this.onclose?.({ code: 1000 });
      }
    }
    setTelemetryWebSocket(FakeTelemetrySocket);
    try {
      const client = make({
        login: 'u',
        password: 'wrong',
        telemetry: { url: 'ws://t' },
      });
      const warning = jest.fn();
      register(SwEvent.Warning, warning, client.uuid);
      expect(sockets).toHaveLength(1); // before any connect()
      const [ws] = sockets;
      ws.readyState = 1;
      ws.onopen();
      const [login] = ws.sent;
      expect(login.method).toBe('telnyx_rtc.telemetry_login');
      ws.onmessage({
        data: JSON.stringify({
          jsonrpc: '2.0',
          id: login.id,
          error: { code: -32001, message: 'Login Incorrect' },
        }),
      });
      expect(warning).toHaveBeenCalledTimes(1);
      expect(warning.mock.calls[0][0].warning).toEqual(
        expect.objectContaining({
          code: 34002,
          name: 'TELEMETRY_CREDENTIALS_REJECTED',
        })
      );
      expect(ws.readyState).toBe(1); // the socket stays open
    } finally {
      setTelemetryWebSocket(
        typeof WebSocket !== 'undefined' ? WebSocket : null
      );
    }
  });

  it('forwards every SDK log line to the live telemetry clients', () => {
    const client = make({ login_token: 'jwt', telemetry: { url: 'ws://t' } });
    const log = jest.spyOn(telemetryOf(client).client, 'log');
    logger.setLevel('debug', false);
    logger.info('Hello', { password: 'p' });
    logger.debug('Ping received');
    logger.disableAll();
    expect(log.mock.calls.map((call) => call.slice(0, 3))).toEqual([
      ['info', 'general', 'Hello'],
    ]);
  });
  it('sends every telnyx.warning of the session as a warning event, the event fields in extra', () => {
    const client = make({ login_token: 'jwt', telemetry: { url: 'ws://t' } });
    const warning = createTelnyxWarning(34001);
    trigger(
      SwEvent.Warning,
      { warning, sessionId: 's', callId: 'call-1', activeCalls: 2 },
      client.uuid
    );
    const sent = pendingOf(client).filter((e) => e.payload.case === 'warning');
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.value).toEqual(
      expect.objectContaining({ code: 34001, name: warning.name.toLowerCase() })
    );
    expect(sent[0].payload.value.extra).toEqual(
      expect.objectContaining({ activeCalls: 2, message: warning.message })
    );
    expect(JSON.stringify(sent[0].payload.value.extra)).not.toContain(
      'sessionId'
    );
  });

  it("does not send a call's quality warning twice", () => {
    const client = make({ login_token: 'jwt', telemetry: { url: 'ws://t' } });
    const warning = createTelnyxWarning(31001);
    const onWarning = jest.fn();
    callWarning({ onWarning } as never, warning, { metric: 'rtt' });
    expect(onWarning).toHaveBeenCalledWith(warning, { metric: 'rtt' });
    trigger(
      SwEvent.Warning,
      { warning, sessionId: 's', callId: 'call-1' },
      client.uuid
    );
    expect(
      pendingOf(client).filter((e) => e.payload.case === 'warning')
    ).toHaveLength(0);
  });

  it('ignores warnings of another session', () => {
    const client = make({ login_token: 'jwt', telemetry: { url: 'ws://t' } });
    const other = make({ login_token: 'jwt', telemetry: { url: 'ws://t' } });
    trigger(
      SwEvent.Warning,
      { warning: createTelnyxWarning(34001), sessionId: 's' },
      other.uuid
    );
    expect(
      pendingOf(client).filter((e) => e.payload.case === 'warning')
    ).toHaveLength(0);
    expect(
      pendingOf(other).filter((e) => e.payload.case === 'warning')
    ).toHaveLength(1);
  });

  it('sends audio_preferences_changed when the app sets a speaker or remote element, once per flip', () => {
    const client = make({ login_token: 'jwt', telemetry: { url: 'ws://t' } });
    const prefs = () =>
      pendingOf(client)
        .filter((e) => e.payload.case === 'audioPreferencesChanged')
        .map((e) => e.payload.value);
    client.speaker = 'speaker-1';
    client.speaker = 'speaker-2'; // still provided: no flip
    const element = document.createElement('audio');
    client.remoteElement = element;
    expect(prefs()).toEqual([
      expect.objectContaining({ initial: true, speakerIdProvided: false }),
      expect.objectContaining({
        initial: false,
        speakerIdProvided: true,
        remoteElementProvided: false,
      }),
      expect.objectContaining({
        initial: false,
        speakerIdProvided: true,
        remoteElementProvided: true,
      }),
    ]);
  });
});
