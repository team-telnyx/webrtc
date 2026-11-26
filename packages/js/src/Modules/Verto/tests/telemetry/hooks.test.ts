jest.unmock('uuid');

import {
  setTelemetryWebSocket,
  TelemetryClient,
} from '@telnyx/webrtc-telemetry';
import TelnyxRTC from '../../../../TelnyxRTC';
import { register } from '../../services/Handler';
import { telemetryOf, triggerWarning } from '../../telemetry';
import {
  SIGNALING_RECOVERY_REQUIRED,
  SwEvent,
  UNKNOWN_REATTACHED_SESSION,
} from '../../util/constants';
import { createTelnyxWarning } from '../../util/errors';
import logger from '../../util/logger';

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
    // Pending events are ClientEvent init objects: the name is the payload case.
    expect(
      pending
        .map((e: { payload: { case: string } }) => e.payload.case)
        .slice(0, 4)
    ).toEqual([
      'sdkCreationStarted',
      'sdkCreated',
      'audioPreferencesChanged',
      'networkChanged',
    ]);
    expect(pending[0].sequence).toBe(1);
    expect(pending[0].payload.value.options.loginType).toBe('token');
    // Timestamps hold bigint seconds.
    const text = JSON.stringify(pending, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
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

  it('checkPermissions reports media_permission for each kind it asked for', async () => {
    const client = make({ login_token: 'jwt', telemetry: { url: 'ws://t' } });
    const access = jest.spyOn(telemetryOf(client), 'mediaAccess');
    await expect(client.checkPermissions(true, false)).resolves.toBe(true);
    expect(access).toHaveBeenLastCalledWith({ audio: true, video: false });
    const denied = Object.assign(new Error('denied'), {
      name: 'NotAllowedError',
    });
    const getUserMedia = jest
      .spyOn(navigator.mediaDevices, 'getUserMedia')
      .mockRejectedValueOnce(denied);
    await expect(client.checkPermissions(true, true)).resolves.toBe(false);
    expect(access).toHaveBeenLastCalledWith(
      { audio: true, video: true },
      { error: denied }
    );
    getUserMedia.mockRestore();
    access.mockRestore();
  });

  it('every telnyx.warning the SDK emits also goes to the call report, with its call ID', () => {
    const client = make({ login_token: 'jwt', telemetry: { url: 'ws://t' } });
    const telemetry = telemetryOf(client);
    const warning = jest.spyOn(telemetry, 'warning');
    const appEvents: unknown[] = [];
    register(
      SwEvent.Warning,
      (event: unknown) => appEvents.push(event),
      client.uuid
    );
    const unhealthy = createTelnyxWarning(SIGNALING_RECOVERY_REQUIRED);
    triggerWarning(client, {
      warning: unhealthy,
      reason: 'heartbeat_timeout',
      sessionId: client.sessionid,
    });
    const reattach = createTelnyxWarning(UNKNOWN_REATTACHED_SESSION);
    triggerWarning(client, {
      warning: reattach,
      callId: 'call-9',
      sessionId: client.sessionid,
    });
    expect(warning).toHaveBeenNthCalledWith(
      1,
      unhealthy,
      undefined,
      undefined,
      {
        reason: 'heartbeat_timeout',
      }
    );
    expect(warning).toHaveBeenNthCalledWith(
      2,
      reattach,
      undefined,
      'call-9',
      {}
    );
    expect(appEvents).toEqual([
      {
        warning: unhealthy,
        reason: 'heartbeat_timeout',
        sessionId: client.sessionid,
      },
      { warning: reattach, callId: 'call-9', sessionId: client.sessionid },
    ]);
    // Telemetry failing never stops the app's event.
    warning.mockImplementation(() => {
      throw new Error('boom');
    });
    triggerWarning(client, { warning: unhealthy });
    expect(appEvents).toHaveLength(3);
    warning.mockRestore();
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
});
