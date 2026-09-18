jest.unmock('../services/Connection');

import { TelnyxRTC } from '../../../TelnyxRTC';
import { setWebSocket } from '../services/Connection';
import { clearQueue } from '../services/Handler';
import logger from '../util/logger';
import { VertoMethod } from '../webrtc/constants';
import { REGISTRATION_TIMING_MESSAGE } from '../util/RegistrationTimings';
import type { IClientOptions } from '../../../utils/interfaces';

class TestSocket {
  static instances: TestSocket[] = [];
  readyState = 0;
  onopen: (event: Event) => void;
  onclose: (event: CloseEvent) => void;
  onerror: (event: Event) => void;
  onmessage: (event: MessageEvent) => void;
  sent: Array<{ id: string; method: string }> = [];

  constructor() {
    TestSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  open() {
    this.readyState = 1;
    this.onopen(new Event('open'));
  }
  close() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  }
  receive(message: unknown) {
    this.onmessage(
      new MessageEvent('message', { data: JSON.stringify(message) })
    );
  }
}

describe('TelnyxRTC registration timing integration', () => {
  let client: TelnyxRTC;
  let now: number;
  let info: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    clearQueue();
    sessionStorage.clear();
    TestSocket.instances = [];
    setWebSocket(TestSocket as unknown as typeof WebSocket);
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await client?.disconnect();
    await Promise.resolve();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    clearQueue();
    sessionStorage.clear();
    setWebSocket(WebSocket);
  });

  it.each<[string, IClientOptions, string]>([
    ['password', { login: 'user', password: 'secret' }, 'login'],
    ['token', { login_token: 'secret-token' }, 'login'],
    [
      'anonymous',
      { anonymous_login: { target_id: 'target', target_type: 'ai_assistant' } },
      'anonymous_login',
    ],
  ])(
    'captures %s registration and publishes after the app event without extra signaling',
    async (_type, options, method) => {
      client = new TelnyxRTC({ ...options, debug: false });
      expect(info).toHaveBeenCalledWith(
        'Registration timing step',
        expect.objectContaining({
          step: 'TelnyxRTC constructor complete',
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
          ),
        })
      );
      const onReady = jest.fn(() => {
        expect(
          info.mock.calls.filter(
            ([message]) => message === REGISTRATION_TIMING_MESSAGE
          )
        ).toHaveLength(0);
        // A slow application handler must not count towards registration.
        now = 9000;
      });
      client.on('telnyx.ready', onReady);
      now = 23;
      await client.connect();
      const socket = TestSocket.instances[0];
      now = 195;
      socket.open();
      expect(socket.sent.map((message) => message.method)).toEqual([method]);
      now = 340;
      socket.receive({
        id: socket.sent[0].id,
        result: { sessid: 'session-a' },
      });
      for (let index = 0; index < 5; index++) await Promise.resolve();
      now = 537;
      socket.receive({
        id: 'ready',
        method: VertoMethod.ClientReady,
        params: {},
      });
      expect(socket.sent.map((message) => message.method)).toEqual([
        method,
        VertoMethod.GatewayState,
      ]);
      now = 602;
      socket.receive({
        id: socket.sent[1].id,
        result: { params: { state: 'REGED' } },
      });
      expect(onReady).toHaveBeenCalledTimes(1);
      await Promise.resolve();
      expect(info).toHaveBeenCalledWith(
        REGISTRATION_TIMING_MESSAGE,
        expect.objectContaining({
          sessionId: 'session-a',
          totalMs: 602,
          connectToReadyMs: 579,
          steps: expect.arrayContaining([
            expect.objectContaining({
              step: `receive ${method}`,
              details: expect.objectContaining({ requestMs: 145 }),
            }),
            expect.objectContaining({
              step: 'receive telnyx_rtc.gatewayState',
              details: expect.objectContaining({ requestMs: 65 }),
            }),
          ]),
        })
      );
      expect(socket.sent).toHaveLength(2);
      const entry = JSON.stringify(client._registrationTimings.getLogEntry());
      expect(entry).not.toContain('secret');
    }
  );

  it('excludes obsolete socket frames and close events from the new connection timeline', async () => {
    client = new TelnyxRTC({ login: 'user', password: 'secret' });
    await client.connect();
    const oldSocket = TestSocket.instances[0];
    now = 10;
    oldSocket.open();
    oldSocket.readyState = 3;
    now = 20;
    await client.connect();
    const socket = TestSocket.instances[1];
    now = 30;
    socket.open();
    // Simulate queued browser callbacks from the superseded socket.
    now = 40;
    oldSocket.receive({ id: 'obsolete', method: VertoMethod.ClientReady });
    oldSocket.close();
    now = 50;
    socket.receive({
      id: socket.sent[0].id,
      result: { sessid: 'new-session' },
    });
    for (let index = 0; index < 5; index++) await Promise.resolve();
    now = 60;
    socket.receive({ id: 'current', method: VertoMethod.ClientReady });
    now = 70;
    socket.receive({
      id: socket.sent[socket.sent.length - 1].id,
      result: { params: { state: 'REGED' } },
    });
    const context = client._registrationTimings.getLogEntry()!.context!;
    const steps = context.steps as Array<{ step: string; elapsedMs: number }>;
    expect(context.socketAttempts).toBe(2);
    expect(
      steps.filter((entry) => entry.step === 'receive server clientReady')
    ).toEqual([expect.objectContaining({ elapsedMs: 60 })]);
    expect(steps.some((entry) => entry.step === 'WebSocket closed')).toBe(
      false
    );
  });
});
