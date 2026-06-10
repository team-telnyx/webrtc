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
import { trigger } from '../../services/Handler';
import { SwEvent } from '../../util/constants';
import Peer from '../../webrtc/Peer';
import { PeerType } from '../../webrtc/constants';
import { IVertoCallOptions } from '../../webrtc/interfaces';

jest.mock('../../services/Handler', () => ({
  trigger: jest.fn(),
}));

type PeerWithConnectionStateHandler = {
  handleConnectionStateChange: () => Promise<void>;
};

type PeerWithCodecSetter = {
  _setCodecs: (
    transceiver: RTCRtpTransceiver,
    codecs: RTCRtpCodecCapability[]
  ) => void;
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

describe('Peer codec preferences', () => {
  const opusCodec = { mimeType: 'audio/opus', clockRate: 48000, channels: 2 };
  const g722Codec = { mimeType: 'audio/G722', clockRate: 8000 };
  const pcmuCodec = { mimeType: 'audio/PCMU', clockRate: 8000 };

  const createPeer = (remoteSdp: string) => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'session-1',
      connected: true,
      reportPeerFailure: jest.fn(),
    };

    return new Peer(
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
  };

  const createAudioTransceiver = (setCodecPreferences = jest.fn()) =>
    ({
      receiver: { track: { kind: 'audio' } },
      sender: {},
      setCodecPreferences,
    }) as unknown as RTCRtpTransceiver;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters answer codec preferences to codecs offered by remote SDP', () => {
    const setCodecPreferences = jest.fn();
    const peer = createPeer(
      [
        'v=0',
        'm=audio 9 UDP/TLS/RTP/SAVPF 9 111',
        'a=rtpmap:9 G722/8000',
        'a=rtpmap:111 opus/48000/2',
      ].join('\r\n')
    );

    (peer as unknown as PeerWithCodecSetter)._setCodecs(
      createAudioTransceiver(setCodecPreferences),
      [opusCodec, g722Codec, pcmuCodec]
    );

    expect(setCodecPreferences).toHaveBeenCalledWith([opusCodec, g722Codec]);
    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({
        callId: 'call-1',
        sessionId: 'session-1',
        warning: expect.objectContaining({
          code: 33010,
          name: 'PREFERRED_CODECS_UNAVAILABLE',
        }),
      }),
      'call-1'
    );
  });

  it('does not set answer codec preferences when remote SDP has none of them', () => {
    const setCodecPreferences = jest.fn();
    const peer = createPeer(
      ['v=0', 'm=audio 9 UDP/TLS/RTP/SAVPF 9', 'a=rtpmap:9 G722/8000'].join(
        '\r\n'
      )
    );

    (peer as unknown as PeerWithCodecSetter)._setCodecs(
      createAudioTransceiver(setCodecPreferences),
      [opusCodec]
    );

    expect(setCodecPreferences).not.toHaveBeenCalled();
    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({
        warning: expect.objectContaining({
          code: 33010,
          name: 'PREFERRED_CODECS_UNAVAILABLE',
          message: expect.stringContaining('none are present'),
        }),
      }),
      'call-1'
    );
  });

  it('emits a warning when setCodecPreferences is unavailable', () => {
    const peer = createPeer(
      [
        'v=0',
        'm=audio 9 UDP/TLS/RTP/SAVPF 111',
        'a=rtpmap:111 opus/48000/2',
      ].join('\r\n')
    );
    const transceiver = {
      receiver: { track: { kind: 'audio' } },
      sender: {},
    } as unknown as RTCRtpTransceiver;

    (peer as unknown as PeerWithCodecSetter)._setCodecs(transceiver, [
      opusCodec,
    ]);

    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({
        warning: expect.objectContaining({
          code: 33009,
          name: 'CODEC_PREFERENCES_UNSUPPORTED',
        }),
      }),
      'call-1'
    );
  });
});
