import { SessionReportCollector } from '../../webrtc/SessionReportCollector';

describe('SessionReportCollector', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('posts session reports with session marker and call report headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const collector = new SessionReportCollector({
      enabled: true,
      maxSessionDurationMinutes: 0,
      logCollector: { enabled: false, level: 'debug', maxEntries: 10 },
    });

    collector.recordEvent('login', 'Login started');
    collector.recordError('Destination out of order', 500, 'gateway');

    await expect(
      collector.postSessionReport(
        'explicit_disconnect',
        'wss://rtc.telnyx.com',
        'session-123',
        'CRI1abc',
        'user@example.com',
        'voice-sdk-123',
        'us-east',
        'ashburn'
      )
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, request] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://rtc.telnyx.com/call_report');
    expect(request.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-session-report': 'true',
      'x-call-report-id': 'CRI1abc',
      'x-voice-sdk-id': 'voice-sdk-123',
    });

    const payload = JSON.parse(request.body);
    expect(payload).toMatchObject({
      session_report: true,
      call_report_id: 'CRI1abc',
      session_id: 'session-123',
      voice_sdk_id: 'voice-sdk-123',
      summary: {
        sessionId: 'session-123',
        callReportId: 'CRI1abc',
        userId: 'user@example.com',
        voiceSdkId: 'voice-sdk-123',
        state: 'session_only',
        hadErrors: true,
        eventCount: 1,
        errorCount: 1,
        region: 'us-east',
        dc: 'ashburn',
      },
      stats: [],
    });
    expect(payload.events).toHaveLength(1);
    expect(payload.errors).toHaveLength(1);

    collector.cleanup();
  });

  it('skips posting until call_report_id is available', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const collector = new SessionReportCollector({
      enabled: true,
      maxSessionDurationMinutes: 0,
      logCollector: { enabled: false, level: 'debug', maxEntries: 10 },
    });

    await expect(
      collector.postSessionReport(
        'socket_close',
        'wss://rtc.telnyx.com',
        'session-123'
      )
    ).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(collector.reportPosted).toBe(false);

    collector.cleanup();
  });

  it('delegates max duration posting to BaseSession context callback', () => {
    jest.useFakeTimers();
    const onMaxDurationReached = jest.fn();
    const collector = new SessionReportCollector({
      enabled: true,
      maxSessionDurationMinutes: 1,
      logCollector: { enabled: false, level: 'debug', maxEntries: 10 },
    });
    collector.onMaxDurationReached = onMaxDurationReached;

    jest.advanceTimersByTime(60_000);

    expect(onMaxDurationReached).toHaveBeenCalledTimes(1);
    collector.cleanup();
  });
});
