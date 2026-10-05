/**
 * VSUP-215: REMOTE_AUDIO_ELEMENT_UNRESOLVED emitted by `Peer.handleTrackEvent`
 * when a configured remoteElement does not resolve to a media element.
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

type RemoteElement = IVertoCallOptions['remoteElement'];

type SessionDouble = {
  options: Record<string, never>;
  sessionid: string;
  uuid: string;
  connected: boolean;
  remoteElement: HTMLMediaElement | null;
  remoteElementId: string | null;
  markMissingRemoteAudioElementWarned: (callId: string) => boolean;
};

const createSession = (
  overrides: Partial<SessionDouble> = {}
): SessionDouble => {
  const warnedCallIds = new Set<string>();
  return {
    options: {},
    sessionid: 'verto-sessid-1',
    uuid: 'session-uuid-1',
    connected: true,
    remoteElement: null,
    remoteElementId: null,
    markMissingRemoteAudioElementWarned: (callId) => {
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
  remoteElement: RemoteElement,
  {
    id = 'call-A',
    screenShare = false,
    session = createSession(),
  }: { id?: string; screenShare?: boolean; session?: SessionDouble } = {}
) =>
  new Peer(
    PeerType.Offer,
    { id, debug: false, screenShare, remoteElement } as IVertoCallOptions,
    session as unknown as BrowserSession,
    jest.fn(),
    jest.fn()
  );

const dispatchTrack = (
  peer: Peer,
  kind: 'audio' | 'video' = 'audio',
  stream: MediaStream = new MediaStream()
) =>
  (
    peer as unknown as { handleTrackEvent: (event: RTCTrackEvent) => void }
  ).handleTrackEvent({
    track: { kind },
    streams: [stream],
  } as unknown as RTCTrackEvent);

const unresolvedWarnings = () =>
  triggerMock.mock.calls.filter(
    ([, payload]) => payload?.warning?.code === REMOTE_AUDIO_ELEMENT_UNRESOLVED
  );

const appendElement = <K extends 'audio' | 'div'>(tag: K, id?: string) => {
  const element = document.createElement(tag);
  if (id) {
    element.id = id;
  }
  document.body.appendChild(element);
  return element;
};

describe('Peer.handleTrackEvent — REMOTE_AUDIO_ELEMENT_UNRESOLVED', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('emits when a configured remoteElement does not resolve', () => {
    it.each<[string, () => RemoteElement]>([
      ['a string ID with no matching element', () => 'missing-element-id'],
      [
        'a string ID of a non-media element',
        () => appendElement('div', 'd').id,
      ],
      ['a resolver returning null', () => () => null],
      ['a resolver returning undefined', () => () => undefined],
      [
        'a resolver returning a non-media element',
        () => () => appendElement('div'),
      ],
    ])('%s', (_, makeRemoteElement) => {
      const stream = new MediaStream();
      const peer = createPeer(makeRemoteElement());

      expect(() => dispatchTrack(peer, 'audio', stream)).not.toThrow();

      expect(unresolvedWarnings()).toHaveLength(1);
      // Informational only: the stream is still exposed on the call.
      expect(
        (peer as unknown as { options: IVertoCallOptions }).options.remoteStream
      ).toBe(stream);
    });

    it('a session-level string ID that did not resolve when set', () => {
      const session = createSession({ remoteElementId: 'missing-element-id' });
      const peer = createPeer(null, { session });

      dispatchTrack(peer);

      expect(unresolvedWarnings()).toHaveLength(1);
    });

    it('with call and session identifiers in the payload', () => {
      const peer = createPeer('missing-element-id');

      dispatchTrack(peer);

      expect(triggerMock).toHaveBeenCalledWith(
        'telnyx.warning',
        {
          warning: expect.objectContaining({
            code: REMOTE_AUDIO_ELEMENT_UNRESOLVED,
            name: 'REMOTE_AUDIO_ELEMENT_UNRESOLVED',
          }),
          callId: 'call-A',
          sessionId: 'verto-sessid-1',
        },
        'session-uuid-1'
      );
    });
  });

  describe('does not emit', () => {
    it.each([null, undefined])(
      'when remoteElement is %s (app plays call.remoteStream itself)',
      (remoteElement) => {
        const stream = new MediaStream();
        const peer = createPeer(remoteElement);

        expect(() => dispatchTrack(peer, 'audio', stream)).not.toThrow();

        expect(unresolvedWarnings()).toHaveLength(0);
        expect(
          (peer as unknown as { options: IVertoCallOptions }).options
            .remoteStream
        ).toBe(stream);
      }
    );

    it('when a call opts out with null while the session element resolved', () => {
      const session = createSession({
        remoteElement: appendElement('audio', 'remoteMedia'),
        remoteElementId: 'remoteMedia',
      });
      const peer = createPeer(null, { session });

      dispatchTrack(peer);

      expect(unresolvedWarnings()).toHaveLength(0);
    });

    it.each<[string, () => RemoteElement]>([
      ['an element', () => appendElement('audio')],
      ['a string ID', () => appendElement('audio', 'remoteMedia').id],
      ['a resolver', () => () => appendElement('audio')],
    ])('when %s resolves to a media element', (_, makeRemoteElement) => {
      dispatchTrack(createPeer(makeRemoteElement()));

      expect(unresolvedWarnings()).toHaveLength(0);
    });

    it('on a video track', () => {
      dispatchTrack(createPeer('missing-element-id'), 'video');

      expect(unresolvedWarnings()).toHaveLength(0);
    });

    it('on a screen-share call', () => {
      dispatchTrack(createPeer('missing-element-id', { screenShare: true }));

      expect(unresolvedWarnings()).toHaveLength(0);
    });
  });

  describe('element resolution', () => {
    it('invokes a resolver once and attaches the element it returned', () => {
      const audio = appendElement('audio');
      // Returns null on any second call, which would cause a false warning.
      const resolver = jest
        .fn<HTMLMediaElement | null, []>()
        .mockReturnValueOnce(audio)
        .mockReturnValue(null);
      const stream = new MediaStream();

      dispatchTrack(createPeer(resolver), 'audio', stream);

      expect(resolver).toHaveBeenCalledTimes(1);
      expect(audio.srcObject).toBe(stream);
      expect(unresolvedWarnings()).toHaveLength(0);
    });

    it('attaches a media element owned by another window', () => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const audio = iframe.contentDocument.createElement('audio');
      const stream = new MediaStream();

      dispatchTrack(
        createPeer(() => audio),
        'audio',
        stream
      );

      expect(audio.srcObject).toBe(stream);
      expect(unresolvedWarnings()).toHaveLength(0);
    });
  });

  describe('deduplication', () => {
    it('emits once per call across repeated track events', () => {
      const peer = createPeer('missing-element-id');

      dispatchTrack(peer, 'video');
      dispatchTrack(peer);
      dispatchTrack(peer);

      expect(unresolvedWarnings()).toHaveLength(1);
    });

    it('emits separately for concurrent calls on the same session', () => {
      const session = createSession();

      dispatchTrack(
        createPeer('missing-element-id', { id: 'call-A', session })
      );
      dispatchTrack(
        createPeer('missing-element-id', { id: 'call-B', session })
      );

      expect(unresolvedWarnings().map(([, payload]) => payload.callId)).toEqual(
        ['call-A', 'call-B']
      );
    });

    it('does not re-emit when attach recovery replaces the Peer', () => {
      const session = createSession();

      for (let i = 0; i < 3; i++) {
        dispatchTrack(createPeer('missing-element-id', { session }));
      }

      expect(unresolvedWarnings()).toHaveLength(1);
    });
  });
});
