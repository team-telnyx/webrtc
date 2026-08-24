Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn().mockReturnValue({ duration: 0 }),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    now: jest.fn().mockReturnValue(Date.now()),
  },
});

import BrowserSession from '../../BrowserSession';
import Peer from '../../webrtc/Peer';
import { callMarkName } from '../../webrtc/CallEstablishmentTimings';
import { PeerType } from '../../webrtc/constants';
import { IVertoCallOptions } from '../../webrtc/interfaces';

jest.mock('../../services/Handler', () => ({
  trigger: jest.fn(),
}));

type PeerWithConnectionStateHandler = {
  handleConnectionStateChange: () => Promise<void>;
};

type PeerWithNegotiationHandler = {
  handleNegotiationNeededEvent: () => void;
};

type SessionDouble = {
  options: Record<string, never>;
  sessionid: string;
  connected: boolean;
  reportPeerFailure: jest.Mock;
  markMissingRemoteAudioElementWarned: (callId: string) => boolean;
};

describe('Peer connection state recovery', () => {
  const createPeer = (connectionState: RTCPeerConnectionState) => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'session-1',
      connected: true,
      reportPeerFailure: jest.fn(),
      markMissingRemoteAudioElementWarned: jest.fn(() => false),
    };

    const peer = new Peer(
      PeerType.Offer,
      {
        id: 'call-1',
        debug: false,
      } as IVertoCallOptions,
      session as unknown as BrowserSession,
      jest.fn(),
      jest.fn()
    );

    peer.instance = {
      connectionState,
      iceConnectionState: 'connected',
      signalingState: 'stable',
    } as RTCPeerConnection;

    return { peer, session };
  };

  it('reports peer failure for disconnected the same way as failed', async () => {
    const { peer, session } = createPeer('disconnected');

    await (
      peer as unknown as PeerWithConnectionStateHandler
    ).handleConnectionStateChange();

    expect(session.reportPeerFailure).toHaveBeenCalledWith(
      'call-1',
      'connection_failed'
    );
  });

  it('reports peer failure for failed', async () => {
    const { peer, session } = createPeer('failed');

    await (
      peer as unknown as PeerWithConnectionStateHandler
    ).handleConnectionStateChange();

    expect(session.reportPeerFailure).toHaveBeenCalledWith(
      'call-1',
      'connection_failed'
    );
  });
});

describe('Peer negotiation during ICE restart', () => {
  const createTricklePeer = (opts: Partial<IVertoCallOptions> = {}) => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'session-1',
      connected: true,
      reportPeerFailure: jest.fn(),
      markMissingRemoteAudioElementWarned: jest.fn(() => false),
    };

    const peer = new Peer(
      PeerType.Offer,
      { id: 'call-1', debug: false, ...opts } as IVertoCallOptions,
      session as unknown as BrowserSession,
      jest.fn(),
      jest.fn()
    );

    peer.instance = {
      connectionState: 'connected',
      iceConnectionState: 'connected',
      signalingState: 'stable',
    } as RTCPeerConnection;

    return { peer, session };
  };

  it('uses trickle negotiation for ICE restart on a trickle-enabled call', () => {
    const { peer } = createTricklePeer({ trickleIce: true });
    peer.isIceRestarting = true;

    const trickleSpy = jest.spyOn(peer, 'startTrickleIceNegotiation');
    const nonTrickleSpy = jest.spyOn(peer, 'startNegotiation');

    (
      peer as unknown as PeerWithNegotiationHandler
    ).handleNegotiationNeededEvent();

    expect(trickleSpy).toHaveBeenCalledTimes(1);
    expect(nonTrickleSpy).not.toHaveBeenCalled();
  });

  it('uses non-trickle negotiation for ICE restart on a non-trickle call', () => {
    const { peer } = createTricklePeer({ trickleIce: false });
    peer.isIceRestarting = true;

    const trickleSpy = jest.spyOn(peer, 'startTrickleIceNegotiation');
    const nonTrickleSpy = jest.spyOn(peer, 'startNegotiation');

    (
      peer as unknown as PeerWithNegotiationHandler
    ).handleNegotiationNeededEvent();

    expect(nonTrickleSpy).toHaveBeenCalledTimes(1);
    expect(trickleSpy).not.toHaveBeenCalled();
  });
});

describe('Peer call-establishment timings', () => {
  it('retains the regular call timeline after clearing performance marks', () => {
    const marks = new Map<string, number>();
    let now = 0;
    Object.defineProperty(global, 'performance', {
      writable: true,
      value: {
        mark: jest.fn((name: string) => {
          marks.set(name, now++);
        }),
        clearMarks: jest.fn((name: string) => marks.delete(name)),
        getEntriesByName: jest.fn((name: string) => {
          const startTime = marks.get(name);
          return startTime === undefined ? [] : [{ startTime }];
        }),
        getEntriesByType: jest.fn().mockReturnValue([]),
        measure: jest.fn(),
        clearMeasures: jest.fn(),
        now: jest.fn(() => now),
      },
    });

    const callId = 'timed-call';
    performance.mark(callMarkName(callId, 'new-call-start'));
    performance.mark(callMarkName(callId, 'new-peer'));
    performance.mark(callMarkName(callId, 'ringing'));
    performance.mark(callMarkName(callId, 'call-active'));

    const peer = new Peer(
      PeerType.Offer,
      {
        id: callId,
        debug: false,
        trickleIce: true,
      } as IVertoCallOptions,
      {
        options: {},
      } as BrowserSession,
      jest.fn(),
      jest.fn()
    );
    peer.instance = {
      connectionState: 'connected',
    } as RTCPeerConnection;

    peer.tryCollectTimings();

    expect(peer.callEstablishmentTimings).toEqual({
      mode: 'trickle',
      direction: 'outbound',
      steps: [
        { label: 'Peer object created', fromStart: 1, delta: 1 },
        { label: 'Remote side ringing', fromStart: 2, delta: 1 },
        { label: 'Call is active', fromStart: 3, delta: 1 },
      ],
    });
    expect(
      performance.getEntriesByName(
        callMarkName(callId, 'new-call-start'),
        'mark'
      )
    ).toEqual([]);
  });
});

describe('Peer relay policy', () => {
  it.each([
    [true, 'relay'],
    [false, 'all'],
  ])('maps forceRelayCandidate=%s to %s', (forceRelayCandidate, expected) => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'session-1',
      connected: true,
      reportPeerFailure: jest.fn(),
      markMissingRemoteAudioElementWarned: jest.fn(() => false),
    };
    const peer = new Peer(
      PeerType.Offer,
      {
        id: 'call-1',
        debug: false,
        forceRelayCandidate,
      } as IVertoCallOptions,
      session as unknown as BrowserSession,
      jest.fn(),
      jest.fn()
    );

    expect(
      (peer as unknown as { _config: () => RTCConfiguration })._config()
        .iceTransportPolicy
    ).toBe(expected);
  });
});

describe('Peer ICE candidate pool', () => {
  const poolSizeFor = (prefetchIceCandidates: boolean) => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'session-1',
      connected: true,
      reportPeerFailure: jest.fn(),
      markMissingRemoteAudioElementWarned: jest.fn(() => false),
    };
    const peer = new Peer(
      PeerType.Offer,
      {
        id: 'call-1',
        debug: false,
        prefetchIceCandidates,
      } as IVertoCallOptions,
      session as unknown as BrowserSession,
      jest.fn(),
      jest.fn()
    );

    return (peer as unknown as { _config: () => RTCConfiguration })._config()
      .iceCandidatePoolSize;
  };

  it('pre-gathers a single component set when prefetching is on', () => {
    // Deliberately asserts 1 rather than "greater than 0": the cost of the pool
    // is pool x local interfaces x ICE servers, so a regression back to the
    // original 10 is what this guards against.
    expect(poolSizeFor(true)).toBe(1);
  });

  it('pre-gathers nothing when prefetching is off', () => {
    expect(poolSizeFor(false)).toBe(0);
  });
});
