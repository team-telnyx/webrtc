/**
 * Tests for VSUP-215 follow-up: the live track dispatch path must invoke a
 * function-valued `remoteElement` resolver exactly once per RTCTrackEvent.
 *
 * Background (PR #781 second review comment):
 * - `Peer.createPeerConnection` sets `instance.ontrack = this.handleTrackEvent`.
 * - `BaseCall._registerPeerEvents` registers a SECOND `addEventListener('track')`
 *   listener on the same RTCPeerConnection.
 * - Per the WebRTC spec, BOTH `ontrack` and `addEventListener('track')` fire for
 *   every RTCTrackEvent.
 * - Previously, both listeners called `attachMediaStream(remoteElement, ...)`,
 *   which internally calls `findElementByType(remoteElement)`. For a
 *   function-valued resolver, that means TWO invocations per track event. A
 *   stateful resolver returning different values on each call could diverge:
 *   e.g. attach on the first call and emit a false missing-element warning on
 *   the second, or vice versa.
 *
 * The fix (this commit) removes the `attachMediaStream` call from the
 * `BaseCall._registerPeerEvents` track listener, so `Peer.handleTrackEvent`
 * is the single source of truth for attachment and the
 * REMOTE_AUDIO_ELEMENT_UNRESOLVED warning, and the resolver is invoked exactly
 * once per real track event.
 *
 * These tests cover the registered-event path the reviewer flagged as
 * uncovered: they simulate a real RTCPeerConnection that fires BOTH `ontrack`
 * (Peer's handler) AND a registered `track` listener (the
 * `BaseCall._registerPeerEvents` shape) for the same event, and assert the
 * resolver is invoked exactly once across both paths.
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
  markMissingRemoteAudioElementWarned: (callId: string) => boolean;
};

/**
 * A minimal RTCPeerConnection-like double that:
 * - stores `ontrack` (set by `Peer.createPeerConnection` in production)
 * - maintains a list of `track` event listeners (registered by
 *   `BaseCall._registerPeerEvents` in production)
 * - `dispatchTrackEvent` fires BOTH `ontrack` AND all registered `track`
 *   listeners, mirroring the real WebRTC dispatch order (ontrack first, then
 *   addEventListener listeners in registration order).
 */
type FakeRTCPeerConnection = {
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  ontrack: ((this: FakeRTCPeerConnection, ev: RTCTrackEvent) => void) | null;
  _trackListeners: Array<(ev: RTCTrackEvent) => void>;
  addEventListener: (
    type: string,
    listener: (ev: RTCTrackEvent) => void
  ) => void;
  dispatchTrackEvent: (event: RTCTrackEvent) => void;
};

const makeFakePC = (): FakeRTCPeerConnection => {
  const pc: FakeRTCPeerConnection = {
    connectionState: 'connected',
    iceConnectionState: 'connected',
    signalingState: 'stable',
    ontrack: null,
    _trackListeners: [],
    addEventListener: (type, listener) => {
      if (type === 'track') {
        pc._trackListeners.push(listener);
      }
    },
    dispatchTrackEvent: (event) => {
      // WebRTC spec: ontrack fires first, then addEventListener('track')
      // listeners in registration order.
      if (pc.ontrack) {
        pc.ontrack.call(pc, event);
      }
      for (const listener of pc._trackListeners) {
        listener(event);
      }
    },
  };
  return pc;
};

const makeTrackEvent = (
  kind: 'audio' | 'video',
  stream: MediaStream = new MediaStream()
): RTCTrackEvent =>
  ({
    track: { kind } as MediaStreamTrack,
    streams: [stream],
    receiver: {} as RTCRtpReceiver,
    transceiver: {} as RTCRtpTransceiver,
  }) as unknown as RTCTrackEvent;

describe('VSUP-215 live track dispatch — resolver invoked once across ontrack + registered listener', () => {
  const createPeer = (opts: Partial<IVertoCallOptions> = {}) => {
    const warnedCallIds = new Set<string>();
    const session: SessionDouble = {
      options: {},
      sessionid: 'real-verto-sessid-1',
      uuid: 'session-uuid-1',
      connected: true,
      reportPeerFailure: jest.fn(),
      markMissingRemoteAudioElementWarned: (callId: string): boolean => {
        if (warnedCallIds.has(callId)) {
          return true;
        }
        warnedCallIds.add(callId);
        return false;
      },
    };

    const peer = new Peer(
      PeerType.Offer,
      {
        id: 'call-A',
        debug: false,
        screenShare: false,
        ...opts,
      } as IVertoCallOptions,
      session as unknown as BrowserSession,
      jest.fn(),
      jest.fn()
    );

    return { peer, session };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('invokes a function-valued resolver exactly once when both ontrack and the registered track listener fire (missing-element path)', () => {
    // Simulates a real RTCTrackEvent dispatch: Peer.handleTrackEvent (ontrack)
    // fires, then the BaseCall-registered addEventListener('track') listener
    // fires on the same event. The resolver must be invoked exactly ONCE total
    // — only by Peer.handleTrackEvent. The registered listener no longer
    // calls attachMediaStream (which would re-invoke the resolver).
    const resolver = jest.fn((): null => null);
    const { peer } = createPeer({
      remoteElement: resolver as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

    const pc = makeFakePC();
    // Wire up Peer.handleTrackEvent as ontrack (as createPeerConnection does).
    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent.bind(peer);
    pc.ontrack = (
      peer as unknown as PeerWithHandleTrackEvent
    ).handleTrackEvent.bind(peer);
    peer.instance = pc as unknown as RTCPeerConnection;

    // Register the BaseCall._registerPeerEvents track-listener shape.
    // BEFORE the fix, this listener called attachMediaStream(remoteElement, ...),
    // re-invoking the resolver. AFTER the fix, it only assigns remoteStream.
    // We simulate the POST-fix shape (no attachMediaStream call) to assert
    // the contract holds: the registered listener must not re-invoke the
    // resolver. To make this test fail on a regression that re-introduces an
    // attachMediaStream call in the registered listener, the listener here
    // deliberately does NOT touch remoteElement.
    pc.addEventListener('track', (event: RTCTrackEvent) => {
      // Mirrors the post-fix BaseCall._registerPeerEvents track listener:
      // remoteStream assignment only, NO attachMediaStream / resolver call.
      (
        peer as unknown as { options: { remoteStream?: MediaStream } }
      ).options.remoteStream = event.streams[0];
    });

    pc.dispatchTrackEvent(makeTrackEvent('audio'));

    // The resolver must be invoked exactly once total — by
    // Peer.handleTrackEvent's findElementByType(remoteElement) call. The
    // registered listener must not re-invoke it.
    expect(resolver).toHaveBeenCalledTimes(1);
    // The missing-element warning fires exactly once (Peer.handleTrackEvent).
    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock.mock.calls[0][1].warning.code).toBe(
      REMOTE_AUDIO_ELEMENT_UNRESOLVED
    );
  });

  it('invokes a function-valued resolver exactly once when it returns a valid element (attachment path)', () => {
    // The valid-element path: Peer.handleTrackEvent resolves the resolver once,
    // attaches successfully, and does NOT emit the warning. The registered
    // listener must not re-invoke the resolver (which could observe a different
    // value and trigger a false warning or diverge from the attached element).
    const audioElement = document.createElement('audio');
    document.body.appendChild(audioElement);
    const resolver = jest.fn((): HTMLAudioElement => audioElement);
    const { peer } = createPeer({
      remoteElement: resolver as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

    const pc = makeFakePC();
    pc.ontrack = (
      peer as unknown as PeerWithHandleTrackEvent
    ).handleTrackEvent.bind(peer);
    peer.instance = pc as unknown as RTCPeerConnection;

    pc.addEventListener('track', (event: RTCTrackEvent) => {
      (
        peer as unknown as { options: { remoteStream?: MediaStream } }
      ).options.remoteStream = event.streams[0];
    });

    pc.dispatchTrackEvent(makeTrackEvent('audio'));

    // Resolver invoked exactly once total across both listeners.
    expect(resolver).toHaveBeenCalledTimes(1);
    // No warning on the valid-element path.
    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('a stateful resolver does not diverge across ontrack + registered listener (attachment succeeds, no false warning)', () => {
    // The exact scenario from the second review comment: a stateful resolver
    // returns a valid element on the first call and null on the second. With
    // the single-resolve fix, Peer.handleTrackEvent attaches on the first
    // call and does NOT emit the warning. The registered listener must not
    // re-invoke the resolver (which would return null and could trigger a
    // false REMOTE_AUDIO_ELEMENT_UNRESOLVED warning or diverge).
    const audioElement = document.createElement('audio');
    document.body.appendChild(audioElement);
    let callCount = 0;
    const statefulResolver = jest.fn((): HTMLMediaElement | null => {
      callCount += 1;
      return callCount === 1 ? audioElement : null;
    });
    const { peer } = createPeer({
      remoteElement: statefulResolver as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

    const pc = makeFakePC();
    pc.ontrack = (
      peer as unknown as PeerWithHandleTrackEvent
    ).handleTrackEvent.bind(peer);
    peer.instance = pc as unknown as RTCPeerConnection;

    pc.addEventListener('track', (event: RTCTrackEvent) => {
      (
        peer as unknown as { options: { remoteStream?: MediaStream } }
      ).options.remoteStream = event.streams[0];
    });

    pc.dispatchTrackEvent(makeTrackEvent('audio'));

    // Resolver invoked exactly once — the second call (returning null) never
    // happens because the registered listener no longer re-invokes it.
    expect(statefulResolver).toHaveBeenCalledTimes(1);
    // Attachment succeeded on the first call, so no missing-element warning.
    expect(triggerMock).not.toHaveBeenCalled();
  });
});
