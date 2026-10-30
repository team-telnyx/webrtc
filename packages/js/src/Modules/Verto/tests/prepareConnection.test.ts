import {
  prepareConnection,
  keepConnectionWarm,
  signalingHttpUrl,
  DEFAULT_KEEP_WARM_INTERVAL_MS,
} from '../util/prepareConnection';
import { resolveSignalingHost } from '../util/helpers';
import { TelnyxRTC } from '../../../TelnyxRTC';

describe('resolveSignalingHost', () => {
  it('defaults to production', () => {
    expect(resolveSignalingHost({})).toEqual('wss://rtc.telnyx.com');
  });

  it('uses the development host for env development', () => {
    expect(resolveSignalingHost({ env: 'development' })).toEqual(
      'wss://rtcdev.telnyx.com'
    );
  });

  it('pins a region on both environments', () => {
    expect(resolveSignalingHost({ region: 'eu' })).toEqual(
      'wss://eu.rtc.telnyx.com'
    );
    expect(resolveSignalingHost({ env: 'development', region: 'eu' })).toEqual(
      'wss://eu.rtcdev.telnyx.com'
    );
  });

  it('honours a host override with or without protocol', () => {
    expect(resolveSignalingHost({ host: 'localhost:8080' })).toEqual(
      'wss://localhost:8080'
    );
    expect(resolveSignalingHost({ host: 'ws://localhost:8080' })).toEqual(
      'ws://localhost:8080'
    );
  });
});

describe('signalingHttpUrl', () => {
  it('swaps the WebSocket scheme for HTTP(S) and keeps the host', () => {
    expect(signalingHttpUrl()).toEqual('https://rtc.telnyx.com');
    expect(signalingHttpUrl({ region: 'eu' })).toEqual(
      'https://eu.rtc.telnyx.com'
    );
    expect(signalingHttpUrl({ env: 'development' })).toEqual(
      'https://rtcdev.telnyx.com'
    );
    expect(signalingHttpUrl({ host: 'ws://localhost:8080' })).toEqual(
      'http://localhost:8080'
    );
  });
});

const env = globalThis as { fetch?: typeof fetch };

describe('prepareConnection', () => {
  const originalFetch = env.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ type: 'opaque', status: 0 });
    env.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    env.fetch = originalFetch;
  });

  it('sends one no-cors HEAD request to the signaling host', async () => {
    await expect(prepareConnection()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://rtc.telnyx.com', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
    });
  });

  it('targets the pinned region and environment', async () => {
    await prepareConnection({ region: 'eu' });
    await prepareConnection({ env: 'development', region: 'us-east' });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'https://eu.rtc.telnyx.com',
      'https://us-east.rtcdev.telnyx.com',
    ]);
  });

  it('resolves false instead of rejecting when the host is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(prepareConnection()).resolves.toBe(false);
  });

  it('is a no-op without fetch', async () => {
    env.fetch = undefined;
    await expect(prepareConnection()).resolves.toBe(false);
  });

  it('is reachable as a static on TelnyxRTC without constructing a client', async () => {
    await expect(TelnyxRTC.prepareConnection({ region: 'eu' })).resolves.toBe(
      true
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://eu.rtc.telnyx.com',
      expect.objectContaining({ method: 'HEAD', mode: 'no-cors' })
    );
  });
});

describe('keepConnectionWarm', () => {
  const originalFetch = env.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn().mockResolvedValue({ type: 'opaque', status: 0 });
    env.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    env.fetch = originalFetch;
  });

  it('warms up now and again every interval until stopped', () => {
    const stop = keepConnectionWarm({ region: 'eu', intervalMs: 50_000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(50_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(100_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    stop();
    jest.advanceTimersByTime(500_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    expect(new Set(fetchMock.mock.calls.map((c) => c[0]))).toEqual(
      new Set(['https://eu.rtc.telnyx.com'])
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://eu.rtc.telnyx.com',
      expect.objectContaining({ method: 'HEAD', mode: 'no-cors' })
    );
  });

  it('repeats every 50 s by default, under the browser DNS cache', () => {
    expect(DEFAULT_KEEP_WARM_INTERVAL_MS).toBe(50_000);
    const stop = keepConnectionWarm();
    jest.advanceTimersByTime(49_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stop();
  });

  it('never repeats faster than once a second', () => {
    const stop = keepConnectionWarm({ intervalMs: 1 });
    jest.advanceTimersByTime(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stop();
  });

  it('keeps going when a warm-up fails', () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const stop = keepConnectionWarm({ intervalMs: 1_000 });
    jest.advanceTimersByTime(2_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    stop();
  });

  it('schedules nothing without fetch and returns a no-op', () => {
    env.fetch = undefined;
    const stop = keepConnectionWarm();
    expect(jest.getTimerCount()).toBe(0);
    expect(() => stop()).not.toThrow();
  });

  it('is reachable as a static on TelnyxRTC without constructing a client', () => {
    const stop = TelnyxRTC.keepConnectionWarm({ env: 'development' });
    jest.advanceTimersByTime(DEFAULT_KEEP_WARM_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://rtcdev.telnyx.com',
      expect.objectContaining({ method: 'HEAD' })
    );
    stop();
    expect(jest.getTimerCount()).toBe(0);
  });
});
