import {
  PeerConnectionPrewarmer,
  PrewarmConfig,
} from '../../webrtc/PeerConnectionPrewarmer';

const SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.telnyx.com:3478' },
  {
    urls: 'turn:turn.telnyx.com:3478?transport=udp',
    username: 'u',
    credential: 'c',
  },
];

const config = (over: Partial<PrewarmConfig> = {}): PrewarmConfig => ({
  bundlePolicy: 'balanced' as RTCBundlePolicy,
  iceCandidatePoolSize: 10,
  iceServers: SERVERS,
  iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  ...over,
});

describe('PeerConnectionPrewarmer', () => {
  let prewarmer: PeerConnectionPrewarmer;

  beforeEach(() => {
    prewarmer = new PeerConnectionPrewarmer();
  });

  afterEach(() => {
    prewarmer.dispose();
    jest.restoreAllMocks();
  });

  it('hands over the warmed connection when the config matches', () => {
    prewarmer.prewarm(config());
    expect(prewarmer.take(config())).not.toBeNull();
  });

  it('returns null before anything has been warmed', () => {
    expect(prewarmer.take(config())).toBeNull();
  });

  it('transfers ownership, so a second take gets nothing', () => {
    prewarmer.prewarm(config());
    expect(prewarmer.take(config())).not.toBeNull();
    expect(prewarmer.take(config())).toBeNull();
  });

  // The pool is gathered under the policy the connection was built with, so a
  // call that forces relay cannot reuse candidates gathered with 'all'.
  it('refuses a call that forces relay', () => {
    prewarmer.prewarm(config());
    expect(prewarmer.take(config({ iceTransportPolicy: 'relay' }))).toBeNull();
  });

  it('refuses a call that overrides iceServers', () => {
    prewarmer.prewarm(config());
    expect(
      prewarmer.take(config({ iceServers: [{ urls: 'stun:example.com' }] }))
    ).toBeNull();
  });

  it('refuses a call with a different pool size', () => {
    prewarmer.prewarm(config());
    expect(prewarmer.take(config({ iceCandidatePoolSize: 0 }))).toBeNull();
  });

  // Handing over candidates that no longer route is worse than gathering fresh:
  // TURN allocations expire and any network change invalidates them.
  it('refuses a connection older than MAX_AGE_MS', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    prewarmer.prewarm(config());

    (Date.now as jest.Mock).mockReturnValue(
      now + PeerConnectionPrewarmer.MAX_AGE_MS + 1
    );
    expect(prewarmer.take(config())).toBeNull();
  });

  it('still hands over a connection just inside MAX_AGE_MS', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    prewarmer.prewarm(config());

    (Date.now as jest.Mock).mockReturnValue(
      now + PeerConnectionPrewarmer.MAX_AGE_MS - 1
    );
    expect(prewarmer.take(config())).not.toBeNull();
  });

  it('does not churn when re-warmed with the same config', () => {
    prewarmer.prewarm(config());
    const first = prewarmer.take(config());

    prewarmer.prewarm(config());
    prewarmer.prewarm(config());
    const second = prewarmer.take(config());

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });

  it('replaces the warmed connection when the config changes', () => {
    prewarmer.prewarm(config());
    prewarmer.prewarm(config({ iceTransportPolicy: 'relay' }));

    expect(prewarmer.take(config())).toBeNull();
    prewarmer.prewarm(config({ iceTransportPolicy: 'relay' }));
    expect(prewarmer.take(config({ iceTransportPolicy: 'relay' }))).not.toBeNull();
  });

  it('closes the connection it is holding on dispose', () => {
    prewarmer.prewarm(config());
    prewarmer.dispose();
    expect(prewarmer.take(config())).toBeNull();
  });

  // Warming is an optimisation; a browser that refuses the construction must not
  // take the client down, because the call path builds its own connection.
  it('survives a constructor that throws', () => {
    const scope = window as unknown as {
      RTCPeerConnection: typeof window.RTCPeerConnection;
    };
    const original = scope.RTCPeerConnection;
    scope.RTCPeerConnection = function RTCPeerConnectionStub() {
      throw new Error('nope');
    } as unknown as typeof window.RTCPeerConnection;

    expect(() => prewarmer.prewarm(config())).not.toThrow();
    expect(prewarmer.take(config())).toBeNull();

    scope.RTCPeerConnection = original;
  });

  describe('fingerprint', () => {
    it('ignores iceServers ordering', () => {
      expect(
        PeerConnectionPrewarmer.fingerprint(config({ iceServers: SERVERS }))
      ).toBe(
        PeerConnectionPrewarmer.fingerprint(
          config({ iceServers: [...SERVERS].reverse() })
        )
      );
    });

    it('separates different TURN credentials', () => {
      const rotated = [
        SERVERS[0],
        { ...SERVERS[1], credential: 'rotated' },
      ];
      expect(
        PeerConnectionPrewarmer.fingerprint(config())
      ).not.toBe(
        PeerConnectionPrewarmer.fingerprint(config({ iceServers: rotated }))
      );
    });

    it('treats omitted fields as their browser defaults', () => {
      expect(
        PeerConnectionPrewarmer.fingerprint({ iceServers: SERVERS })
      ).toBe(
        PeerConnectionPrewarmer.fingerprint({
          iceServers: SERVERS,
          bundlePolicy: 'balanced',
          iceTransportPolicy: 'all',
          iceCandidatePoolSize: 0,
        })
      );
    });
  });
});
