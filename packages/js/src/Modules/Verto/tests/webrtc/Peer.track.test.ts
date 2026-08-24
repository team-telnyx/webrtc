/**
 * Tests for VSUP-215: REMOTE_AUDIO_ELEMENT_UNRESOLVED warning emitted by
 * `Peer.handleTrackEvent` when a remote audio track arrives for a normal
 * (non-screen-share) call but the SDK cannot resolve a call-level or
 * session-level remoteElement.
 *
 * Coverage:
 * - emits warning when remoteElement is null and audio track arrives
 * - emits warning when remoteElement is a string ID that does not resolve
 * - emits warning when remoteElement is a resolver function returning null
 * - does NOT emit on video tracks
 * - does NOT emit when screenShare is true (screen-share path)
 * - deduplicates per call across repeated track events
 * - separate concurrent calls (separate Peer instances) each emit their own warning
 * - does NOT emit when a valid per-call or session element resolves
 * - preserves remoteStream assignment and call state (informational, non-fatal)
 * - does NOT throw on null/undefined remoteElement
 */
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
import { REMOTE_AUDIO_ELEMENT_UNRESOLVED } from '../../util/constants/errorCodes';

jest.mock('../../services/Handler', () => ({
  trigger: jest.fn(),
  register: jest.fn(),
  deRegister: jest.fn(),
}));

// Import the mocked trigger for assertions.
import { trigger } from '../../services/Handler';

const triggerMock = trigger as jest.Mock;

type PeerWithHandleTrackEvent = {
  handleTrackEvent: (event: RTCTrackEvent) => void;
};

type SessionDouble = {
  options: Record<string, never>;
  sessionid: string;
  uuid: string;
  connected: boolean;
  reportPeerFailure: jest.Mock;
};

/**
 * Builds a RTCTrackEvent-like object with a track of the given kind and a
 * first MediaStream. The streams array matches the shape `handleTrackEvent`
 * destructures (`event.streams[0]`).
 */
const makeTrackEvent = (
  kind: 'audio' | 'video',
  stream: MediaStream = new MediaStream()
): RTCTrackEvent =>
  ({
    track: { kind } as MediaStreamTrack,
    streams: [stream],
    receiver: {} as RTCRtpReceiver,
    transceiver: {} as RTCRtpTransceiver,
  } as unknown as RTCTrackEvent);

describe('Peer.handleTrackEvent — VSUP-215 REMOTE_AUDIO_ELEMENT_UNRESOLVED', () => {
  const createPeer = (opts: Partial<IVertoCallOptions> = {}) => {
    const session: SessionDouble = {
      options: {},
      sessionid: 'real-verto-sessid-1',
      uuid: 'session-uuid-1',
      connected: true,
      reportPeerFailure: jest.fn(),
    };

    const peer = new Peer(
      PeerType.Offer,
      {
        id: 'call-A',
        debug: false,
        // screenShare defaults to false for normal calls; tests that need
        // screen-share will explicitly pass screenShare: true.
        screenShare: false,
        ...opts,
      } as IVertoCallOptions,
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any DOM elements created during the test so they don't leak
    // across test cases and affect findElementByType resolution.
    document.body.innerHTML = '';
  });

  it('emits REMOTE_AUDIO_ELEMENT_UNRESOLVED when remoteElement is null and an audio track arrives', () => {
    const { peer } = createPeer({ remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null) });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).toHaveBeenCalledTimes(1);
    const [eventName, payload, eventTarget] = triggerMock.mock.calls[0];
    expect(eventName).toBe('telnyx.warning');
    expect(payload.warning.code).toBe(REMOTE_AUDIO_ELEMENT_UNRESOLVED);
    expect(payload.warning.name).toBe('REMOTE_AUDIO_ELEMENT_UNRESOLVED');
    expect(payload.callId).toBe('call-A');
    expect(payload.sessionId).toBe('real-verto-sessid-1');
    // The event-bus trigger target is the session UUID so consumers listening
    // via client.on('telnyx.warning') on the right session receive it.
    expect(eventTarget).toBe('session-uuid-1');
  });

  it('emits warning when remoteElement is a string ID that does not resolve to a DOM element', () => {
    // No element with this ID exists in the DOM.
    const { peer } = createPeer({ remoteElement: 'missing-element-id' });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock.mock.calls[0][1].warning.code).toBe(
      REMOTE_AUDIO_ELEMENT_UNRESOLVED
    );
  });

  it('emits warning when remoteElement resolver function returns null', () => {
    const resolver = (): null => null;
    const { peer } = createPeer({
      remoteElement: resolver as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock.mock.calls[0][1].warning.code).toBe(
      REMOTE_AUDIO_ELEMENT_UNRESOLVED
    );
  });

  it('emits warning when remoteElement resolver function returns undefined', () => {
    const resolver = (): undefined => undefined;
    const { peer } = createPeer({
      remoteElement: resolver as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock.mock.calls[0][1].warning.code).toBe(
      REMOTE_AUDIO_ELEMENT_UNRESOLVED
    );
  });

  it('does NOT emit on a video-only track', () => {
    const { peer } = createPeer({ remoteElement: null });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('video')
    );

    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('does NOT emit when screenShare is true (screen-share path)', () => {
    const { peer } = createPeer({
      remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
      screenShare: true,
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    // The screen-share path does not call attachMediaStream at all, and the
    // REMOTE_AUDIO_ELEMENT_UNRESOLVED warning must not fire for screen-share.
    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('deduplicates per call across repeated audio track events', () => {
    const { peer } = createPeer({
      remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });

    const handler = peer as unknown as PeerWithHandleTrackEvent;
    handler.handleTrackEvent(makeTrackEvent('audio'));
    handler.handleTrackEvent(makeTrackEvent('audio'));
    handler.handleTrackEvent(makeTrackEvent('audio'));

    expect(triggerMock).toHaveBeenCalledTimes(1);
  });

  it('separate concurrent calls (separate Peer instances) each emit their own warning', () => {
    const { peer: peer1 } = createPeer({
      remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });
    const { peer: peer2 } = createPeer({
      id: 'call-B',
      remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });

    (peer1 as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );
    (peer2 as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    // Each Peer has its own dedupe flag, so both emit.
    expect(triggerMock).toHaveBeenCalledTimes(2);
    expect(triggerMock.mock.calls[0][1].callId).toBe('call-A');
    expect(triggerMock.mock.calls[1][1].callId).toBe('call-B');
  });

  it('does NOT emit when a valid per-call remoteElement (HTMLMediaElement) resolves', () => {
    const audioElement = document.createElement('audio');
    document.body.appendChild(audioElement);
    const { peer } = createPeer({ remoteElement: audioElement });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('does NOT emit when a valid session-level remoteElement (string ID) resolves', () => {
    // Create a real DOM element with the matching ID.
    const audioElement = document.createElement('audio');
    audioElement.id = 'remoteMedia';
    document.body.appendChild(audioElement);
    const { peer } = createPeer({ remoteElement: 'remoteMedia' });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('does NOT emit when a per-call resolver function returns a valid element', () => {
    const audioElement = document.createElement('audio');
    document.body.appendChild(audioElement);
    const resolver = (): HTMLAudioElement => audioElement;
    const { peer } = createPeer({
      remoteElement: resolver as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('preserves remoteStream assignment on the call (informational, non-fatal)', () => {
    const { peer } = createPeer({
      remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });
    const remoteStream = new MediaStream();

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio', remoteStream)
    );

    // remoteStream must still be stored on the options — the warning does
    // not interrupt media reception or change call state.
    expect(
      (peer as unknown as { options: IVertoCallOptions }).options.remoteStream
    ).toBe(remoteStream);
  });

  it('does NOT throw on null remoteElement (null-safe path)', () => {
    const { peer } = createPeer({
      remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });

    expect(() =>
      (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
        makeTrackEvent('audio')
      )
    ).not.toThrow();
  });

  it('does NOT throw on undefined remoteElement (null-safe path)', () => {
    const { peer } = createPeer({ remoteElement: undefined });

    expect(() =>
      (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
        makeTrackEvent('audio')
      )
    ).not.toThrow();
  });

  it('emits warning only once across audio + video track events mixed per call', () => {
    const { peer } = createPeer({
      remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });

    const handler = peer as unknown as PeerWithHandleTrackEvent;
    // Video first (must not set the dedupe flag), then audio (fires warning),
    // then another audio (deduped).
    handler.handleTrackEvent(makeTrackEvent('video'));
    handler.handleTrackEvent(makeTrackEvent('audio'));
    handler.handleTrackEvent(makeTrackEvent('audio'));

    expect(triggerMock).toHaveBeenCalledTimes(1);
  });

  it('warning payload includes advisory causes/solutions covering both SDK-managed and app-managed attachment', () => {
    const { peer } = createPeer({
      remoteElement: null as unknown as HTMLMediaElement | string | (() => HTMLMediaElement | null),
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    const { warning } = triggerMock.mock.calls[0][1];
    // Advisory wording must cover BOTH paths: configuring a remoteElement AND
    // intentional application-managed call.remoteStream attachment.
    expect(warning.causes.some((c: string) => /null/i.test(c))).toBe(true);
    expect(
      warning.solutions.some((s: string) => /call\.remoteStream/i.test(s))
    ).toBe(true);
    expect(
      warning.solutions.some((s: string) => /remoteElement/i.test(s))
    ).toBe(true);
    // Must not assert definite playout failure (advisory wording).
    expect(warning.description).toMatch(/advisory/);
  });
});
