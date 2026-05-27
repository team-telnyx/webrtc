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
