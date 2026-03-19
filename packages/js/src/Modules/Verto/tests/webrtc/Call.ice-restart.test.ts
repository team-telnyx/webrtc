// Suppress async errors from peer init lifecycle (mock RTCPeerConnection gets nulled before init completes)
process.on('uncaughtException', () => {});

import Call from '../../webrtc/Call';
import Verto from '../..';
import { VertoMethod } from '../../webrtc/constants';
import type { IVertoCallOptions } from '../../webrtc/interfaces';

const originalConsoleDebug = console.debug;
const originalConsoleLog = console.log;
const originalConsoleGroup = console.group;
const originalConsoleTable = console.table;
const originalConsoleGroupEnd = console.groupEnd;

beforeAll(() => {
  console.debug = jest.fn();
  console.log = jest.fn();
  console.group = jest.fn();
  console.table = jest.fn();
  console.groupEnd = jest.fn();
});

afterAll(() => {
  console.debug = originalConsoleDebug;
  console.log = originalConsoleLog;
  console.group = originalConsoleGroup;
  console.table = originalConsoleTable;
  console.groupEnd = originalConsoleGroupEnd;
});

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

const mockOffer = {
  type: 'offer' as RTCSdpType,
  sdp: 'v=0\no=- 1 2 IN IP4 127.0.0.1\ns=-',
  toJSON: () => ({}),
};

describe('Call ICE Restart on Failure', () => {
  let session: any;
  let call: Call;
  const defaultParams: IVertoCallOptions = {
    destinationNumber: 'x3599',
    remoteCallerName: 'Js Client Test',
    remoteCallerNumber: '1234',
    callerName: 'Jest Client',
    callerNumber: '5678',
    trickleIce: true,
  };

  beforeEach(async (done) => {
    session = new Verto({
      host: 'example.fs.telnyx',
      login: 'login',
      passwd: 'passwd',
      trickleIce: true,
    });
    await session.connect().catch(console.error);
    call = new Call(session, defaultParams);
    // invite() is async but we only need peer.instance to exist
    call.invite();
    jest.clearAllMocks();
    done();
  });

  describe('scheduling logic', () => {
    it('should schedule ICE restart for trickle ICE calls', () => {
      expect((call as any)._iceRestartTimer).toBeNull();

      (call as any)._scheduleIceRestart();

      expect((call as any)._iceRestartTimer).not.toBeNull();

      // Cleanup
      clearTimeout((call as any)._iceRestartTimer);
      (call as any)._iceRestartTimer = null;
    });

    it('should not schedule ICE restart for non-trickle calls', () => {
      (call as any).options.trickleIce = false;

      (call as any)._scheduleIceRestart();

      expect((call as any)._iceRestartTimer).toBeNull();
    });

    it('should not schedule ICE restart for inbound calls (no perfect negotiation)', () => {
      (call as any).direction = 'inbound';

      (call as any)._scheduleIceRestart();

      expect((call as any)._iceRestartTimer).toBeNull();
    });

    it('should not schedule when max attempts reached', () => {
      (call as any)._iceRestartAttempts = 3;

      (call as any)._scheduleIceRestart();

      expect((call as any)._iceRestartTimer).toBeNull();
    });

    it('should not create duplicate timers', () => {
      (call as any)._scheduleIceRestart();
      const first = (call as any)._iceRestartTimer;

      (call as any)._scheduleIceRestart();
      const second = (call as any)._iceRestartTimer;

      expect(first).toBe(second);

      // Cleanup
      clearTimeout((call as any)._iceRestartTimer);
      (call as any)._iceRestartTimer = null;
    });

    it('should cancel pending restart via _cancelIceRestart', () => {
      (call as any)._scheduleIceRestart();
      expect((call as any)._iceRestartTimer).not.toBeNull();

      (call as any)._cancelIceRestart();

      expect((call as any)._iceRestartTimer).toBeNull();
    });

    it('should cancel restart timer on _finalize', () => {
      (call as any)._scheduleIceRestart();
      expect((call as any)._iceRestartTimer).not.toBeNull();

      (call as any)._finalize();

      expect((call as any)._iceRestartTimer).toBeNull();
    });
  });

  describe('execution logic', () => {
    it('should skip restart if connection recovered (connected)', async () => {
      const createOfferSpy = jest.spyOn(call.peer.instance, 'createOffer');

      Object.defineProperty(call.peer.instance, 'connectionState', {
        get: () => 'connected',
        configurable: true,
      });

      await (call as any)._executeIceRestart();

      expect(createOfferSpy).not.toHaveBeenCalled();
    });

    it('should skip restart if signaling state is closed', async () => {
      const createOfferSpy = jest.spyOn(call.peer.instance, 'createOffer');

      Object.defineProperty(call.peer.instance, 'connectionState', {
        get: () => 'failed',
        configurable: true,
      });

      Object.defineProperty(call.peer.instance, 'signalingState', {
        get: () => 'closed',
        configurable: true,
      });

      await (call as any)._executeIceRestart();

      expect(createOfferSpy).not.toHaveBeenCalled();
    });

    it('should create offer with iceRestart: true', async () => {
      const createOfferSpy = jest
        .spyOn(call.peer.instance, 'createOffer')
        .mockImplementation((() => Promise.resolve(mockOffer)) as any);

      jest
        .spyOn(call.peer.instance, 'setLocalDescription')
        .mockResolvedValue();

      jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ node_id: 'test-node' });

      Object.defineProperty(call.peer.instance, 'connectionState', {
        get: () => 'failed',
        configurable: true,
      });

      Object.defineProperty(call.peer.instance, 'signalingState', {
        get: () => 'stable',
        configurable: true,
      });

      await (call as any)._executeIceRestart();

      expect(createOfferSpy).toHaveBeenCalledWith(
        expect.objectContaining({ iceRestart: true })
      );
    });

    it('should send telnyx_rtc.invite with iceRestart flag', async () => {
      jest
        .spyOn(call.peer.instance, 'createOffer')
        .mockImplementation((() => Promise.resolve(mockOffer)) as any);

      jest
        .spyOn(call.peer.instance, 'setLocalDescription')
        .mockResolvedValue();

      const executeSpy = jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ node_id: 'test-node' });

      Object.defineProperty(call.peer.instance, 'connectionState', {
        get: () => 'failed',
        configurable: true,
      });

      Object.defineProperty(call.peer.instance, 'signalingState', {
        get: () => 'stable',
        configurable: true,
      });

      await (call as any)._executeIceRestart();

      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: VertoMethod.Invite,
            params: expect.objectContaining({
              trickle: true,
              iceRestart: true,
            }),
          }),
        })
      );
    });

    it('should increment attempt counter', async () => {
      jest
        .spyOn(call.peer.instance, 'createOffer')
        .mockImplementation((() => Promise.resolve(mockOffer)) as any);

      jest
        .spyOn(call.peer.instance, 'setLocalDescription')
        .mockResolvedValue();

      jest
        .spyOn((call as any).session, 'execute')
        .mockResolvedValue({ node_id: 'test-node' });

      Object.defineProperty(call.peer.instance, 'connectionState', {
        get: () => 'failed',
        configurable: true,
      });

      Object.defineProperty(call.peer.instance, 'signalingState', {
        get: () => 'stable',
        configurable: true,
      });

      expect((call as any)._iceRestartAttempts).toBe(0);
      await (call as any)._executeIceRestart();
      expect((call as any)._iceRestartAttempts).toBe(1);
      await (call as any)._executeIceRestart();
      expect((call as any)._iceRestartAttempts).toBe(2);
    });

    it('should handle createOffer failure gracefully', async () => {
      jest
        .spyOn(call.peer.instance, 'createOffer')
        .mockRejectedValue(new Error('createOffer failed'));

      Object.defineProperty(call.peer.instance, 'connectionState', {
        get: () => 'failed',
        configurable: true,
      });

      Object.defineProperty(call.peer.instance, 'signalingState', {
        get: () => 'stable',
        configurable: true,
      });

      await expect(
        (call as any)._executeIceRestart()
      ).resolves.toBeUndefined();
    });

    it('should abort if peer instance is null', async () => {
      call.peer.instance = null;

      // Should not throw
      await expect(
        (call as any)._executeIceRestart()
      ).resolves.toBeUndefined();
    });
  });

  describe('connectionstatechange listener in trickle ICE', () => {
    it('should register connectionstatechange listener', () => {
      const addEventListenerSpy = jest.spyOn(
        call.peer.instance,
        'addEventListener'
      );

      (call as any)._registerTrickleIcePeerEvents(call.peer.instance);

      const connectionStateCall = addEventListenerSpy.mock.calls.find(
        ([event]) => event === 'connectionstatechange'
      );
      expect(connectionStateCall).toBeDefined();
    });
  });
});
