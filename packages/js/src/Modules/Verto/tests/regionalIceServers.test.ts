import {
  COUNTRY_TURN_HOSTS,
  DEFAULT_DEV_ICE_SERVERS,
  DEFAULT_PROD_ICE_SERVERS,
  getDefaultIceServers,
  regionalTurnHost,
  regionalTurnUrl,
} from '../util/constants';
import { Region } from '../../../Region';

describe('regionalTurnHost', () => {
  it.each([
    ['eu', 'turn.telnyx.eu'],
    ['ca-central', 'turn.telnyx.ca'],
    ['asia', 'turn.telnyx.asia'],
    ['me', 'turn.telnyx.me'],
    ['au', 'turn.telnyx.com.au'],
  ])('uses the country host for %s', (region, host) => {
    expect(regionalTurnHost(region)).toBe(host);
    expect(COUNTRY_TURN_HOSTS[region]).toBe(host);
  });

  it.each(['us-east', 'us-central', 'us-west', 'apac', 'south-asia'])(
    'falls back to <region>.turn.telnyx.com for %s',
    (region) => {
      expect(regionalTurnHost(region)).toBe(`${region}.turn.telnyx.com`);
    }
  );

  it('never uses a country host in development', () => {
    expect(regionalTurnHost('eu', true)).toBe('eu.turndev.telnyx.com');
    expect(regionalTurnHost('apac', true)).toBe('apac.turndev.telnyx.com');
  });
});

describe('regionalTurnUrl', () => {
  it.each([
    [
      'turn:turn.telnyx.com:3478?transport=udp',
      'turn:turn.telnyx.eu:3478?transport=udp',
    ],
    [
      'turn:turn.telnyx.com:3478?transport=tcp',
      'turn:turn.telnyx.eu:3478?transport=tcp',
    ],
    [
      'turn:turndev.telnyx.com:3478?transport=udp',
      'turn:eu.turndev.telnyx.com:3478?transport=udp',
    ],
  ])('rewrites %s', (url, expected) => {
    expect(regionalTurnUrl(url, 'eu')).toBe(expected);
  });

  it.each([
    [
      'apac',
      'turn:turn.telnyx.com:3478?transport=udp',
      'turn:apac.turn.telnyx.com:3478?transport=udp',
    ],
    [
      'me',
      'turn:turn.telnyx.com:3478?transport=tcp',
      'turn:turn.telnyx.me:3478?transport=tcp',
    ],
    [
      'ca-central',
      'turn:turn.telnyx.com:3478?transport=udp',
      'turn:turn.telnyx.ca:3478?transport=udp',
    ],
  ])('for %s rewrites %s', (region, url, expected) => {
    expect(regionalTurnUrl(url, region)).toBe(expected);
  });

  it.each([
    'stun:stun.telnyx.com:3478',
    'stun:stundev.telnyx.com:3478',
    'stun:stun.l.google.com:19302',
    // TURNS stays on the flat name: the TURN certificate only covers it.
    'turns:turn.telnyx.com:443',
    'turns:turndev.telnyx.com:443',
    'turns:turn2.telnyx.com:443',
    'turn:turn.example.com:3478',
    'turn:turn.telnyx.company.com:3478',
  ])('leaves %s unchanged', (url) => {
    expect(regionalTurnUrl(url, 'eu')).toBe(url);
  });
});

describe('getDefaultIceServers', () => {
  it('returns the environment defaults when no region is pinned', () => {
    expect(getDefaultIceServers()).toBe(DEFAULT_PROD_ICE_SERVERS);
    expect(getDefaultIceServers('production', null)).toBe(
      DEFAULT_PROD_ICE_SERVERS
    );
    expect(getDefaultIceServers('development', '')).toBe(
      DEFAULT_DEV_ICE_SERVERS
    );
  });

  it.each(Object.values(Region))(
    'regionalizes only the plain TURN entries for %s',
    (region) => {
      const servers = getDefaultIceServers(undefined, region);

      expect(servers).toHaveLength(DEFAULT_PROD_ICE_SERVERS.length);
      const host = regionalTurnHost(region);
      expect(servers.map((s) => s.urls)).toEqual([
        'stun:stun.telnyx.com:3478',
        'stun:stun.l.google.com:19302',
        `turn:${host}:3478?transport=udp`,
        `turn:${host}:3478?transport=tcp`,
        'turns:turn.telnyx.com:443',
      ]);
    }
  );

  it('keeps TURN credentials and does not mutate the defaults', () => {
    const before = JSON.stringify(DEFAULT_PROD_ICE_SERVERS);
    const [, , udp] = getDefaultIceServers(undefined, 'apac');

    expect(udp).toEqual({
      urls: 'turn:apac.turn.telnyx.com:3478?transport=udp',
      username: 'testuser',
      credential: 'testpassword',
    });
    expect(JSON.stringify(DEFAULT_PROD_ICE_SERVERS)).toBe(before);
  });

  it('handles servers that list several urls', () => {
    const [server] = getDefaultIceServers(undefined, 'eu').slice(0, 1);
    expect(server.urls).toBe('stun:stun.telnyx.com:3478');

    const multi = {
      urls: [
        'turn:turn.telnyx.com:3478?transport=udp',
        'stun:stun.telnyx.com:3478',
      ],
    };
    expect(
      [multi].map((s) => ({
        ...s,
        urls: s.urls.map((u) => regionalTurnUrl(u, 'eu')),
      }))[0].urls
    ).toEqual([
      'turn:turn.telnyx.eu:3478?transport=udp',
      'stun:stun.telnyx.com:3478',
    ]);
  });
});
