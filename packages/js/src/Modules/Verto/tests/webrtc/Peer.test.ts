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
import { PeerType } from '../../webrtc/constants';
import { IVertoCallOptions } from '../../webrtc/interfaces';

jest.mock('../../services/Handler', () => ({
  trigger: jest.fn(),
}));

type PeerWithConnectionStateHandler = {
  handleConnectionStateChange: () => Promise<void>;
};

type SessionDouble = {
  options: Record<string, never>;
  sessionid: string;
  connected: boolean;
  reportPeerFailure: jest.Mock;
};

describe('Peer connection state recovery', () => {
  const createPeer = (connectionState: RTCPeerConnectionState) => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'session-1',
      connected: true,
      reportPeerFailure: jest.fn(),
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

    (peer as any).handleNegotiationNeededEvent();

    expect(trickleSpy).toHaveBeenCalledTimes(1);
    expect(nonTrickleSpy).not.toHaveBeenCalled();
  });

  it('uses non-trickle negotiation for ICE restart on a non-trickle call', () => {
    const { peer } = createTricklePeer({ trickleIce: false });
    peer.isIceRestarting = true;

    const trickleSpy = jest.spyOn(peer, 'startTrickleIceNegotiation');
    const nonTrickleSpy = jest.spyOn(peer, 'startNegotiation');

    (peer as any).handleNegotiationNeededEvent();

    expect(nonTrickleSpy).toHaveBeenCalledTimes(1);
    expect(trickleSpy).not.toHaveBeenCalled();
  });
});

// ── VSDK-467: Peer RTC configuration reflects forceRelayCandidate ──
//
// The stage requires direct Peer coverage proving the replacement
// RTCPeerConnection receives iceTransportPolicy:"relay" when relay is
// preserved/forced, and "all" otherwise. A unit assertion on reconstructed
// call options does NOT prove the new peer received the relay policy
// (stage risk: "A unit assertion on reconstructed call options does not prove
// the new peer received iceTransportPolicy:'relay'"). These tests call the
// private _config() directly to verify the RTCConfiguration contract.
describe('Peer RTC configuration reflects forceRelayCandidate (VSDK-467)', () => {
  const createConfigPeer = (opts: Partial<IVertoCallOptions> = {}) => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'session-1',
      connected: true,
      reportPeerFailure: jest.fn(),
    };

    const peer = new Peer(
      PeerType.Offer,
      {
        id: 'call-relay',
        debug: false,
        ...opts,
      } as IVertoCallOptions,
      session as unknown as BrowserSession,
      jest.fn(),
      jest.fn()
    );

    return { peer };
  };

  it('sets iceTransportPolicy to "relay" when forceRelayCandidate is true', () => {
    const { peer } = createConfigPeer({ forceRelayCandidate: true });
    const config = (peer as unknown as { _config: () => RTCConfiguration })._config();
    expect(config.iceTransportPolicy).toBe('relay');
  });

  it('sets iceTransportPolicy to "all" when forceRelayCandidate is false', () => {
    const { peer } = createConfigPeer({ forceRelayCandidate: false });
    const config = (peer as unknown as { _config: () => RTCConfiguration })._config();
    expect(config.iceTransportPolicy).toBe('all');
  });

  it('sets iceTransportPolicy to "all" when forceRelayCandidate is absent (default)', () => {
    const { peer } = createConfigPeer({});
    const config = (peer as unknown as { _config: () => RTCConfiguration })._config();
    expect(config.iceTransportPolicy).toBe('all');
  });

  it('sets iceTransportPolicy to "relay" when forceRelayCandidate was preserved across recovery', () => {
    // Simulates the recovered call options after VertoHandler._buildCall
    // used the source-of-truth boolean (true) from
    // shouldForceRelayCandidateForRecovery.
    const { peer } = createConfigPeer({ forceRelayCandidate: true });
    const config = (peer as unknown as { _config: () => RTCConfiguration })._config();
    expect(config.iceTransportPolicy).toBe('relay');
  });
});
