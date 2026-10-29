import {
  prepareConnection,
  signalingHttpUrl,
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
