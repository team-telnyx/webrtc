/* eslint-disable @typescript-eslint/no-explicit-any */
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

describe('Peer regatherCandidates', () => {
  const createAnswerPeer = () => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'session-1',
      connected: true,
      reportPeerFailure: jest.fn(),
    };

    const remoteSdp = [
      'v=0',
      'o=- 1 2 IN IP4 127.0.0.1',
      's=-',
      'a=candidate:1 1 UDP 2113667327 192.168.1.1 54400 typ host',
    ].join('\r\n');

    const peer = new Peer(
      PeerType.Answer,
      {
        id: 'call-1',
        debug: false,
        remoteSdp,
      } as IVertoCallOptions,
      session as unknown as BrowserSession,
      jest.fn(),
      jest.fn()
    );

    const setRemoteDescriptionMock = jest.fn().mockResolvedValue(undefined);
    const createAnswerMock = jest.fn().mockResolvedValue({
      type: 'answer',
      sdp: 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-',
    });
    const setLocalDescriptionMock = jest.fn().mockResolvedValue(undefined);

    peer.instance = {
      signalingState: 'stable',
      setRemoteDescription: setRemoteDescriptionMock,
      createAnswer: createAnswerMock,
      setLocalDescription: setLocalDescriptionMock,
      close: jest.fn(),
      getTransceivers: jest.fn().mockReturnValue([]),
      removeEventListener: jest.fn(),
    } as unknown as RTCPeerConnection;

    return {
      peer,
      session,
      setRemoteDescriptionMock,
      createAnswerMock,
      setLocalDescriptionMock,
      remoteSdp,
    };
  };

  it('should re-apply the remote offer before creating a fresh answer', async () => {
    const {
      peer,
      setRemoteDescriptionMock,
      createAnswerMock,
      remoteSdp,
    } = createAnswerPeer();

    peer.regatherCandidates();

    // Flush the microtask chain: _setRemoteDescription().then(() => _createAnswer())
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    // Should first re-apply the remote offer to transition to have-remote-offer
    expect(setRemoteDescriptionMock).toHaveBeenCalledWith({
      sdp: remoteSdp,
      type: PeerType.Offer,
    });

    // Then create a fresh answer from have-remote-offer state
    expect(createAnswerMock).toHaveBeenCalledTimes(1);
  });

  it('should not call createOffer for answer-side regather', async () => {
    const { peer, createAnswerMock } = createAnswerPeer();

    const createOfferMock = jest.fn().mockResolvedValue({ type: 'offer' });
    (peer.instance as any).createOffer = createOfferMock;

    peer.regatherCandidates();

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    // createOffer should NOT be called for answer peers
    expect(createOfferMock).not.toHaveBeenCalled();
    expect(createAnswerMock).toHaveBeenCalledTimes(1);
  });

  it('should handle setRemoteDescription rejection gracefully', async () => {
    const { peer, setRemoteDescriptionMock } = createAnswerPeer();

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    setRemoteDescriptionMock.mockRejectedValue(new Error('SDP parse failed'));

    peer.regatherCandidates();

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    // Should have attempted the remote description
    expect(setRemoteDescriptionMock).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
