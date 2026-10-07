import RegistrationTimings, {
  REGISTRATION_TIMING_MESSAGE,
} from '../../util/RegistrationTimings';
import logger, { setConsoleLoggerMinLevel } from '../../util/logger';
import { GatewayStateType, VertoMethod } from '../../webrtc/constants';
import { CallReportCollector } from '../../webrtc/CallReportCollector';
import {
  getGlobalLogCollector,
  setGlobalLogCollector,
} from '../../util/LogCollector';
import type { ILogEntry } from '../../util/LogCollector';

describe('registration timing diagnostics', () => {
  let now: number;
  let info: jest.SpyInstance;
  let debug: jest.SpyInstance;
  let table: jest.SpyInstance;
  let previousLogLevel: ReturnType<typeof logger.getLevel>;
  const summary = (timing: RegistrationTimings) =>
    timing.getLogEntry()!.context!;

  beforeEach(() => {
    previousLogLevel = logger.getLevel();
    logger.setLevel('info', false);
    setConsoleLoggerMinLevel('info');
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    debug = jest.spyOn(logger, 'debug').mockImplementation(() => undefined);
    table = jest.spyOn(console, 'table').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await Promise.resolve();
    jest.restoreAllMocks();
    logger.setLevel(previousLogLevel, false);
    setConsoleLoggerMinLevel('info');
    setGlobalLogCollector(null);
  });

  it('separates app waiting, SDK processing, overlapping requests and time to app ready', async () => {
    const timing = new RegistrationTimings('test-version');
    timing.clientId = 'client-a';
    now = 5;
    timing.mark('TelnyxRTC constructor complete');
    now = 25;
    timing.mark('client.connect() called');
    now = 26;
    timing.mark('create WebSocket');
    now = 200;
    timing.mark('WebSocket open');
    now = 202;
    timing.requestSent('login-id', 'login');
    now = 250;
    timing.responseReceived({ method: VertoMethod.ClientReady });
    now = 251;
    timing.requestSent('gateway-id', VertoMethod.GatewayState);
    now = 270;
    timing.responseReceived({ id: 'login-id' });
    now = 310;
    timing.responseReceived({
      id: 'gateway-id',
      result: { params: { state: 'REGED' } },
    });
    now = 311;
    timing.finish('session-a');

    expect(debug).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\[TelnyxRTC registration client-a\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \+5 ms \/ 5 ms total: TelnyxRTC constructor complete$/
      )
    );
    expect(info).not.toHaveBeenCalledWith(expect.stringContaining('COMPLETE:'));
    expect(table).not.toHaveBeenCalled();
    expect(summary(timing)).toMatchObject({
      event: 'registration_timing',
      schemaVersion: 1,
      scope: 'initial_registration',
      clientId: 'client-a',
      sessionId: 'session-a',
      sdkVersion: 'test-version',
      totalMs: 311,
      constructorMs: 5,
      appWaitBeforeConnectMs: 20,
      connectToReadyMs: 286,
      socketAttempts: 1,
      longestInterval: {
        from: 'create WebSocket',
        to: 'WebSocket open',
        durationMs: 174,
      },
      steps: expect.arrayContaining([
        expect.objectContaining({
          step: 'receive login',
          details: { requestId: 'login-id', requestMs: 68 },
        }),
        expect.objectContaining({
          step: 'receive telnyx_rtc.gatewayState',
          details: { requestId: 'gateway-id', requestMs: 59, state: 'REGED' },
        }),
      ]),
    });

    // Simulate expensive application ready handlers and a later reconnection.
    now = 9000;
    timing.mark('create WebSocket');
    timing.requestSent('another-login', 'login');
    timing.responseReceived({ id: 'another-login' });
    timing.finish('another-session');
    await Promise.resolve();
    expect(info).toHaveBeenCalledTimes(11);
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining(
        'COMPLETE: 311 ms total; constructor=5 ms; app wait=20 ms; connect-to-ready=286 ms; ' +
          'longest interval: create WebSocket → WebSocket open (174 ms)'
      )
    );
    expect(
      info.mock.calls.every(
        (args) => args.length === 1 && typeof args[0] === 'string'
      )
    ).toBe(true);
    expect(table).toHaveBeenCalledTimes(1);
    expect(table).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          step: 'receive telnyx_rtc.gatewayState',
          deltaMs: 40,
          elapsedMs: 310,
          details: 'requestId=gateway-id, requestMs=59 ms, state=REGED',
        }),
      ])
    );
    expect(
      table.mock.calls[0][0].every((row) =>
        Object.values(row).every((value) => typeof value !== 'object')
      )
    ).toBe(true);
    const report = timing.getLogEntry()!;
    const steps = report.context!.steps as Array<{ timestamp: string }>;
    for (const step of steps) {
      expect(step.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    }
    expect(report.context!.startedAt).toBe(steps[0].timestamp);
    expect(report.timestamp).toBe(steps[steps.length - 1].timestamp);
    expect(report.context!.timestamp).toBe(report.timestamp);
  });

  it('retains retry delay and the original connect start across socket replacement', () => {
    const timing = new RegistrationTimings('test');
    timing.mark('client.connect() called');
    timing.mark('create WebSocket');
    timing.requestSent('old-login', 'login');
    now = 30;
    timing.mark('WebSocket error');
    timing.mark('schedule WebSocket reconnect', { delayMs: 1000, attempt: 1 });
    now = 1100;
    timing.mark('WebSocket reconnect timer fired');
    timing.mark('client.connect() called');
    timing.mark('create WebSocket');
    timing.responseReceived({ id: 'old-login' });
    timing.requestSent('anonymous', 'anonymous_login');
    now = 1200;
    timing.responseReceived({ id: 'anonymous' });
    timing.finish('session');
    expect(summary(timing)).toMatchObject({
      connectToReadyMs: 1200,
      socketAttempts: 2,
    });
    const steps = summary(timing).steps as Array<{
      step: string;
      deltaMs: number;
    }>;
    expect(
      steps.find((entry) => entry.step === 'WebSocket reconnect timer fired')!
        .deltaMs
    ).toBe(1070);
    expect(steps.some((entry) => entry.step === 'receive login')).toBe(false);
    expect(
      steps.some((entry) => entry.step === 'receive anonymous_login')
    ).toBe(true);
  });

  it('bounds an indefinitely retrying trace while preserving totals and the longest interval', () => {
    const timing = new RegistrationTimings('test');
    now = 5000;
    timing.mark('WebSocket open');
    for (let index = 0; index < 1000; index++) {
      now += 1;
      timing.requestSent(`request-${index}`, 'login');
    }
    timing.finish('session');
    expect(summary(timing)).toMatchObject({
      totalMs: 6000,
      droppedSteps: 875,
      droppedRequests: 968,
      longestInterval: {
        from: 'new TelnyxRTC()',
        to: 'WebSocket open',
        durationMs: 5000,
      },
    });
    expect(summary(timing).steps).toHaveLength(128);
  });

  it('excludes payloads, unknown states, unrelated methods and unbounded IDs', () => {
    const timing = new RegistrationTimings('test');
    timing.requestSent('private-id', 'unrecognized');
    timing.requestSent('x'.repeat(10000), 'login');
    timing.requestSent('login', 'login');
    timing.responseReceived({
      id: 'login',
      error: { password: 'secret-password', token: 'secret-token' },
    });
    timing.responseReceived({ params: { state: 'secret-state' } });
    timing.responseReceived(null);
    timing.responseReceived({
      method: VertoMethod.ClientReady,
      params: { state: GatewayStateType.REGED },
    });
    timing.finish('session');
    const encoded = JSON.stringify(summary(timing));
    expect(encoded).not.toMatch(/secret|private-id|unrecognized/);
    expect(encoded).not.toContain('x'.repeat(129));
    expect(encoded).toContain('receive login error');
    expect(encoded).toContain('REGED');
  });

  it('isolates client instances and returns defensive snapshots', () => {
    const first = new RegistrationTimings('test');
    first.clientId = 'first';
    now = 10;
    const second = new RegistrationTimings('test');
    second.clientId = 'second';
    now = 30;
    first.finish('first-session');
    second.finish('second-session');
    const copy = summary(first);
    copy.totalMs = 999;
    (copy.steps as unknown[]).length = 0;
    expect(summary(first)).toMatchObject({ clientId: 'first', totalMs: 30 });
    expect(summary(second)).toMatchObject({ clientId: 'second', totalMs: 20 });
    expect(summary(first).steps).toHaveLength(2);
  });

  it('falls back to a consistent Date clock when performance.now is unavailable', () => {
    jest.spyOn(performance, 'now').mockImplementation(() => {
      throw new Error('unavailable');
    });
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    now = 10000;
    const timing = new RegistrationTimings('test');
    now += 50;
    timing.finish('session');
    expect(summary(timing)).toMatchObject({ clock: 'date', totalMs: 50 });
  });

  it('keeps intervals nonnegative if a clock moves backwards or fails mid-trace', () => {
    const timing = new RegistrationTimings('test');
    now = 50;
    timing.mark('WebSocket open');
    now = 20;
    timing.mark('login response processing started');
    now = NaN;
    timing.mark('login response processing complete');
    now = 100;
    timing.finish('session');
    expect(summary(timing)).toMatchObject({
      clockAdjusted: true,
      totalMs: 100,
    });
    expect(
      (summary(timing).steps as Array<{ deltaMs: number }>).every(
        (step) => step.deltaMs >= 0
      )
    ).toBe(true);
  });

  it('contains logging failures, including the deferred completion log', async () => {
    info.mockImplementation(() => {
      throw new Error('info sink failed');
    });
    table.mockImplementation(() => {
      throw new Error('table sink failed');
    });
    const timing = new RegistrationTimings('test');
    expect(() => timing.mark('WebSocket open')).not.toThrow();
    expect(() => timing.finish('session')).not.toThrow();
    await Promise.resolve();
    expect(info).toHaveBeenCalledTimes(3);
    expect(table).toHaveBeenCalledTimes(1);
    expect(timing.getLogEntry()).toBeDefined();
  });

  it('respects info-level filtering when printing the table', async () => {
    const timing = new RegistrationTimings('test');
    setConsoleLoggerMinLevel('warn');
    timing.finish('session');
    await Promise.resolve();
    expect(table).not.toHaveBeenCalled();
    expect(timing.getLogEntry()).toBeDefined();
  });
});

describe('registration timing in call reports', () => {
  const log = (clientId: string): ILogEntry => ({
    timestamp: '2026-09-18T10:00:00.000Z',
    level: 'info',
    message: REGISTRATION_TIMING_MESSAGE,
    context: { event: 'registration_timing', clientId, totalMs: 600 },
  });
  let collectors: CallReportCollector[];
  const create = (
    provider: () => ILogEntry | undefined,
    level: 'info' | 'warn' = 'info',
    enabled = true
  ) => {
    const collector = new CallReportCollector(
      { enabled, interval: 5000 },
      { enabled: true, level, maxEntries: 2 },
      provider
    );
    collectors.push(collector);
    return collector;
  };
  beforeEach(() => {
    collectors = [];
  });
  afterEach(() => {
    collectors.forEach((collector) => collector.cleanup());
    setGlobalLogCollector(null);
    jest.restoreAllMocks();
  });

  it('retains the summary across ordinary log-buffer eviction and includes it once', () => {
    const collector = create(() => log('owner'));
    const buffer = getGlobalLogCollector()!;
    for (let index = 0; index < 10; index++)
      buffer.addEntry('info', `call log ${index}`);
    const first = collector.flush({ callId: 'call' });
    expect(first!.logs).toContainEqual(log('owner'));
    buffer.addEntry('info', 'next segment');
    expect(collector.flush({ callId: 'call' })!.logs).not.toContainEqual(
      log('owner')
    );
  });

  it('uses the owning session rather than a duplicate or another client in the global log buffer', () => {
    const first = create(() => log('first'));
    const second = create(() => log('second'));
    const shared = getGlobalLogCollector()!;
    shared.addEntry('info', REGISTRATION_TIMING_MESSAGE, log('first').context);
    shared.addEntry('info', REGISTRATION_TIMING_MESSAGE, log('second').context);
    expect(first.flush({ callId: 'first-call' })!.logs).toEqual([log('first')]);
    expect(second.flush({ callId: 'second-call' })!.logs).toEqual([
      log('second'),
    ]);
  });

  it('picks up a summary completed after an early call report segment', () => {
    const state: { entry?: ILogEntry } = {};
    const collector = create(() => state.entry);
    getGlobalLogCollector()!.addEntry('info', 'call started before ready');
    collector.flush({ callId: 'call' });
    state.entry = log('owner');
    expect(collector.flush({ callId: 'call' })!.logs).toEqual([state.entry]);
  });

  it('includes registration in a final report even with no stats or buffered logs', async () => {
    const collector = create(() => log('owner'));
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, status: 202 });
    const originalFetch = global.fetch;
    global.fetch = fetchSpy;
    try {
      await collector.postReport(
        { callId: 'call' },
        'report',
        'wss://example.test',
        'voice'
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(payload.logs).toEqual([log('owner')]);
      expect(fetchSpy.mock.calls[0][0]).toBe(
        'https://example.test/call_report'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('honors log thresholds and disabled call reporting', async () => {
    const provider = jest.fn(() => log('owner'));
    const filtered = create(provider, 'warn');
    const disabled = create(provider, 'info', false);
    expect(filtered.flush({ callId: 'call' })).toBeNull();
    await disabled.postReport(
      { callId: 'call' },
      'report',
      'wss://example.test'
    );
    expect(provider).not.toHaveBeenCalled();
  });

  it('still produces ordinary reports if the diagnostic provider throws', () => {
    const collector = create(() => {
      throw new Error('diagnostic failure');
    });
    getGlobalLogCollector()!.addEntry('info', 'ordinary log');
    expect(collector.flush({ callId: 'call' })!.logs).toEqual([
      expect.objectContaining({ message: 'ordinary log' }),
    ]);
  });
});
