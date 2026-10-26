import { hostnameOf, hostsToPrefetch, prefetchDns } from '../util/dnsPrefetch';
import { resolveSignalingHost } from '../util/helpers';

const links = () =>
  Array.from(document.head.querySelectorAll('link[rel="dns-prefetch"]')).map(
    (l) => l.getAttribute('href')
  );

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

describe('hostnameOf', () => {
  it('reads WebSocket, ICE and bare hosts', () => {
    expect(hostnameOf('wss://rtc.telnyx.com')).toEqual('rtc.telnyx.com');
    expect(hostnameOf('wss://eu.rtc.telnyx.com:443/path')).toEqual(
      'eu.rtc.telnyx.com'
    );
    expect(hostnameOf('turn:turn.telnyx.com:3478?transport=udp')).toEqual(
      'turn.telnyx.com'
    );
    expect(hostnameOf('turns:turn2.telnyx.com:443')).toEqual(
      'turn2.telnyx.com'
    );
    expect(hostnameOf('stun:stun.telnyx.com:3478')).toEqual('stun.telnyx.com');
    expect(hostnameOf('rtc.telnyx.com')).toEqual('rtc.telnyx.com');
    expect(hostnameOf('')).toBeNull();
  });
});

describe('hostsToPrefetch', () => {
  it('lists the signaling host and the default ICE hosts once each', () => {
    const hosts = hostsToPrefetch({});
    expect(hosts[0]).toEqual('rtc.telnyx.com');
    expect(hosts).toContain('turn.telnyx.com');
    expect(hosts).toContain('stun.telnyx.com');
    expect(new Set(hosts).size).toEqual(hosts.length);
  });

  it('follows the pinned region for signaling and TURN', () => {
    const hosts = hostsToPrefetch({ region: 'eu' });
    expect(hosts[0]).toEqual('eu.rtc.telnyx.com');
    expect(hosts).toContain('eu.turn.telnyx.com');
  });

  it('uses custom ICE servers when given', () => {
    const hosts = hostsToPrefetch({
      iceServers: [{ urls: ['turn:turn.example.com:3478'] }],
    });
    expect(hosts).toEqual(['rtc.telnyx.com', 'turn.example.com']);
  });
});

describe('prefetchDns', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('inserts one dns-prefetch link per host', () => {
    prefetchDns(['rtc.telnyx.com', 'turn.telnyx.com']);
    expect(links()).toEqual(['//rtc.telnyx.com', '//turn.telnyx.com']);
  });

  it('is idempotent', () => {
    prefetchDns(['rtc.telnyx.com']);
    prefetchDns(['rtc.telnyx.com']);
    expect(links()).toEqual(['//rtc.telnyx.com']);
  });
});
