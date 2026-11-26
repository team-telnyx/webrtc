import BrowserSession from '../../BrowserSession';
import Peer from '../../webrtc/Peer';
import { PeerType } from '../../webrtc/constants';
import { getMediaConstraints, getUserMedia } from '../../webrtc/helpers';
import { IVertoCallOptions } from '../../webrtc/interfaces';

jest.mock('../../services/Handler', () => ({
  trigger: jest.fn(),
}));

jest.mock('../../webrtc/helpers', () => ({
  ...jest.requireActual<object>('../../webrtc/helpers'),
  getMediaConstraints: jest.fn(),
  getUserMedia: jest.fn(),
}));

const constraints = { audio: { deviceId: 'mic-1' }, video: false };

const makePeer = (localStream?: MediaStream) => {
  const peer = new Peer(
    PeerType.Answer,
    { id: 'call-1', debug: false, localStream } as IVertoCallOptions,
    { options: {}, sessionid: 'session-1' } as unknown as BrowserSession,
    jest.fn(),
    jest.fn()
  );
  const onMediaAccess = jest.fn();
  peer.telemetryHooks = { onMediaAccess };
  return { peer, onMediaAccess };
};

// _retrieveLocalStream is private: the Peer calls it from init().
const retrieve = (peer: Peer, afterRecovery?: boolean) =>
  (
    peer as unknown as {
      _retrieveLocalStream(afterRecovery?: boolean): Promise<MediaStream>;
    }
  )._retrieveLocalStream(afterRecovery);

/** media_permission: the Peer reports each getUserMedia answer to the call's telemetry. */
describe('Peer media access telemetry', () => {
  beforeEach(() => {
    (getMediaConstraints as jest.Mock).mockResolvedValue(constraints);
  });
  afterEach(() => jest.clearAllMocks());

  it('reports a granted getUserMedia with its constraints', async () => {
    const stream = { id: 'stream' } as unknown as MediaStream;
    (getUserMedia as jest.Mock).mockResolvedValue(stream);
    const { peer, onMediaAccess } = makePeer();
    await expect(retrieve(peer)).resolves.toBe(stream);
    expect(onMediaAccess).toHaveBeenCalledWith(constraints, undefined, false);
  });

  it('reports a denied getUserMedia with its error, then rethrows it', async () => {
    const denied = new DOMException('Permission denied', 'NotAllowedError');
    (getUserMedia as jest.Mock).mockRejectedValue(denied);
    const { peer, onMediaAccess } = makePeer();
    await expect(retrieve(peer)).rejects.toBe(denied);
    expect(onMediaAccess).toHaveBeenCalledWith(constraints, denied, false);
  });

  it("marks the recovery flow's retry", async () => {
    (getUserMedia as jest.Mock).mockResolvedValue({});
    const { peer, onMediaAccess } = makePeer();
    await retrieve(peer, true);
    expect(onMediaAccess).toHaveBeenCalledWith(constraints, undefined, true);
  });

  it('reports nothing when the call already has a live local stream', async () => {
    const live = new MediaStream();
    const { peer, onMediaAccess } = makePeer(live);
    await expect(retrieve(peer)).resolves.toBe(live);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(onMediaAccess).not.toHaveBeenCalled();
  });

  it('a throwing hook does not break getUserMedia', async () => {
    const stream = { id: 'stream' } as unknown as MediaStream;
    (getUserMedia as jest.Mock).mockResolvedValue(stream);
    const { peer, onMediaAccess } = makePeer();
    onMediaAccess.mockImplementation(() => {
      throw new Error('telemetry bug');
    });
    await expect(retrieve(peer)).resolves.toBe(stream);
  });
});
