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
  markMissingRemoteAudioElementWarned: (callId: string) => boolean;
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
  }) as unknown as RTCTrackEvent;

describe('Peer.handleTrackEvent — VSUP-215 REMOTE_AUDIO_ELEMENT_UNRESOLVED', () => {
  /**
   * Creates a session double with a real `markMissingRemoteAudioElementWarned`
   * implementation (check-and-add Set) so tests exercise the same dedupe
   * semantics as production. Multiple peers created with the same session
   * instance share the same dedupe set, mirroring the production behavior
   * where attach-recovery replaces a Peer but the session persists.
   */
  const createSession = (
    overrides: Partial<SessionDouble> = {}
  ): SessionDouble => {
    const warnedCallIds = new Set<string>();
    return {
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
      ...overrides,
    };
  };

  const createPeer = (
    opts: Partial<IVertoCallOptions> = {},
    sharedSession?: SessionDouble
  ) => {
    const session = sharedSession ?? createSession();

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
    const { peer } = createPeer({
      remoteElement: null as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

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
      remoteElement: resolver as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
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
      remoteElement: resolver as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock.mock.calls[0][1].warning.code).toBe(
      REMOTE_AUDIO_ELEMENT_UNRESOLVED
    );
  });

  it('invokes a function-valued resolver exactly once per track event on the missing-element path', () => {
    // Regression test for the MAJOR review comment on PR #781: a
    // function-valued remoteElement must be resolved exactly once and the
    // same value used for both attachMediaStream and the missing-element
    // warning check. A second resolution call could observe a different
    // return value for a stateful/dynamic resolver, producing attachment
    // and warning inconsistencies.
    const resolver = jest.fn((): null => null);
    const { peer } = createPeer({
      remoteElement: resolver as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    // Resolver invoked exactly once across both attachMediaStream and the
    // warning check — the single resolved value is shared.
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock.mock.calls[0][1].warning.code).toBe(
      REMOTE_AUDIO_ELEMENT_UNRESOLVED
    );
  });

  it('invokes a function-valued resolver exactly once when it returns a valid element', () => {
    // The valid-element path must also resolve the resolver exactly once so
    // a stateful resolver that returns a valid element first (attachment
    // succeeds) does not get re-invoked and observe a different value that
    // would incorrectly trigger (or suppress) the warning.
    const audioElement = document.createElement('audio');
    document.body.appendChild(audioElement);
    const resolver = jest.fn((): HTMLAudioElement => audioElement);
    const { peer } = createPeer({
      remoteElement: resolver as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('uses a single resolution of a stateful resolver (no false warning on attachment success)', () => {
    // Stateful resolver returns a valid element on the first call and null on
    // the second. With the single-resolve fix, attachMediaStream attaches
    // successfully and the warning must NOT fire (the resolver is never
    // called a second time). Without the fix, the second call returns null
    // and a false REMOTE_AUDIO_ELEMENT_UNRESOLVED warning would be emitted.
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

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(statefulResolver).toHaveBeenCalledTimes(1);
    // Attachment succeeded on the first (and only) resolution — no warning.
    expect(triggerMock).not.toHaveBeenCalled();
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
      remoteElement: null as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
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
      remoteElement: null as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

    const handler = peer as unknown as PeerWithHandleTrackEvent;
    handler.handleTrackEvent(makeTrackEvent('audio'));
    handler.handleTrackEvent(makeTrackEvent('audio'));
    handler.handleTrackEvent(makeTrackEvent('audio'));

    expect(triggerMock).toHaveBeenCalledTimes(1);
  });

  it('separate concurrent calls (different call IDs on the same session) each emit their own warning', () => {
    // Both peers share the SAME session (the production scenario: two
    // concurrent calls on one client). The session-level dedupe set is keyed
    // by call ID, so different call IDs each emit independently.
    const sharedSession = createSession();
    const { peer: peer1 } = createPeer(
      {
        remoteElement: null as unknown as
          | HTMLMediaElement
          | string
          | (() => HTMLMediaElement | null),
      },
      sharedSession
    );
    const { peer: peer2 } = createPeer(
      {
        id: 'call-B',
        remoteElement: null as unknown as
          | HTMLMediaElement
          | string
          | (() => HTMLMediaElement | null),
      },
      sharedSession
    );

    (peer1 as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );
    (peer2 as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    // Different call IDs on the same session each emit their own warning.
    expect(triggerMock).toHaveBeenCalledTimes(2);
    expect(triggerMock.mock.calls[0][1].callId).toBe('call-A');
    expect(triggerMock.mock.calls[1][1].callId).toBe('call-B');
  });

  it('does NOT re-emit after attach-recovery replaces the Peer with the same call ID (once-per-call across recovery)', () => {
    // Regression test for the MAJOR review comment on PR #781: the dedupe
    // flag must survive Call/Peer replacement during in-process
    // `telnyx_rtc.attach` recovery. The original Peer emits the warning on
    // its first audio track. Recovery hangs up the matched call and
    // constructs a replacement Call/Peer with the SAME call ID. The
    // replacement Peer must NOT re-emit the warning because the call ID is
    // already in the session's dedupe set.
    const sharedSession = createSession();
    const originalCallId = 'call-recovery-1';

    // Original Peer — emits the warning once.
    const { peer: originalPeer } = createPeer(
      {
        id: originalCallId,
        remoteElement: null as unknown as
          | HTMLMediaElement
          | string
          | (() => HTMLMediaElement | null),
      },
      sharedSession
    );

    (originalPeer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );
    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock.mock.calls[0][1].callId).toBe(originalCallId);

    // Simulate attach-recovery: the original Call/Peer is hung up and a
    // replacement Peer is constructed with the SAME call ID on the SAME
    // session. The replacement Peer's per-instance state is fresh, but the
    // session-level dedupe set still has the call ID.
    const { peer: recoveredPeer } = createPeer(
      {
        id: originalCallId,
        remoteElement: null as unknown as
          | HTMLMediaElement
          | string
          | (() => HTMLMediaElement | null),
      },
      sharedSession
    );

    // The recovered Peer receives a new audio track — it must NOT re-emit.
    (recoveredPeer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).toHaveBeenCalledTimes(1); // still just the original
  });

  it('does NOT re-emit across multiple recovery cycles with the same call ID', () => {
    // Stress test: the call goes through two recovery cycles (Peer replaced
    // twice). Each replacement shares the session-level dedupe set, so the
    // warning fires exactly once across all three Peer lifetimes.
    const sharedSession = createSession();
    const callId = 'call-multi-recovery';

    for (let i = 0; i < 3; i++) {
      const { peer } = createPeer(
        {
          id: callId,
          remoteElement: null as unknown as
            | HTMLMediaElement
            | string
            | (() => HTMLMediaElement | null),
        },
        sharedSession
      );
      (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
        makeTrackEvent('audio')
      );
    }

    // Only the first Peer's track event emits; the two recovered Peers are
    // deduped by the session-level set.
    expect(triggerMock).toHaveBeenCalledTimes(1);
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
      remoteElement: resolver as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
    });

    (peer as unknown as PeerWithHandleTrackEvent).handleTrackEvent(
      makeTrackEvent('audio')
    );

    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('preserves remoteStream assignment on the call (informational, non-fatal)', () => {
    const { peer } = createPeer({
      remoteElement: null as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
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
      remoteElement: null as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
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
      remoteElement: null as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
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
      remoteElement: null as unknown as
        | HTMLMediaElement
        | string
        | (() => HTMLMediaElement | null),
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
