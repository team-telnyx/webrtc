import {
  DEFAULT_DEV_ICE_SERVERS,
  DEFAULT_PROD_ICE_SERVERS,
  getDefaultIceServers,
  regionalTurnUrl,
} from '../util/constants';
import { Region } from '../../../Region';

describe('regionalTurnUrl', () => {
  it.each([
    [
      'turn:turn.telnyx.com:3478?transport=udp',
      'turn:eu.turn.telnyx.com:3478?transport=udp',
    ],
    [
      'turn:turn.telnyx.com:3478?transport=tcp',
      'turn:eu.turn.telnyx.com:3478?transport=tcp',
    ],
    ['turns:turn.telnyx.com:443', 'turns:eu.turn.telnyx.com:443'],
    [
      'turn:turndev.telnyx.com:3478?transport=udp',
      'turn:eu.turndev.telnyx.com:3478?transport=udp',
    ],
    ['turns:turndev.telnyx.com:443', 'turns:eu.turndev.telnyx.com:443'],
  ])('rewrites %s', (url, expected) => {
    expect(regionalTurnUrl(url, 'eu')).toBe(expected);
  });

  it.each([
    'stun:stun.telnyx.com:3478',
    'stun:stundev.telnyx.com:3478',
    'stun:stun.l.google.com:19302',
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
    'regionalizes only the TURN entries for %s',
    (region) => {
      const servers = getDefaultIceServers(undefined, region);

      expect(servers).toHaveLength(DEFAULT_PROD_ICE_SERVERS.length);
      expect(servers.map((s) => s.urls)).toEqual([
        'stun:stun.telnyx.com:3478',
        'stun:stun.l.google.com:19302',
        `turn:${region}.turn.telnyx.com:3478?transport=udp`,
        `turn:${region}.turn.telnyx.com:3478?transport=tcp`,
        `turns:${region}.turn.telnyx.com:443`,
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
      'turn:eu.turn.telnyx.com:3478?transport=udp',
      'stun:stun.telnyx.com:3478',
    ]);
  });
});
