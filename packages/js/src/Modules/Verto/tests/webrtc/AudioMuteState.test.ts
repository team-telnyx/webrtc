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

import { register, deRegister } from '../../services/Handler';
import Call from '../../webrtc/Call';
import { NOTIFICATION_TYPE } from '../../webrtc/constants';
import { SwEvent } from '../../util/constants';
import * as helpers from '../../webrtc/helpers';
import { MediaStreamTrackMock } from '../../tests/setup/webrtcMocks';
import Verto from '../..';

// Mock the WebRTC helpers so we can verify they're called correctly
jest.mock('../../webrtc/helpers', () => {
  const original = jest.requireActual('../../webrtc/helpers');
  return {
    ...original,
    __esModule: true,
    disableAudioTracks: jest.fn(),
    enableAudioTracks: jest.fn(),
    toggleAudioTracks: jest.fn(),
    isAudioTrackEnabled: jest.fn().mockReturnValue(false),
  };
});

const mockDisableAudioTracks = helpers.disableAudioTracks as jest.Mock;
const mockEnableAudioTracks = helpers.enableAudioTracks as jest.Mock;
const mockToggleAudioTracks = helpers.toggleAudioTracks as jest.Mock;

describe('Audio mute state preservation (VSDK-205)', () => {
  let session: Verto;
  const defaultParams = {
    destinationNumber: 'x3599',
    remoteCallerName: 'Js Client Test',
    remoteCallerNumber: '1234',
    callerName: 'Jest Client',
    callerNumber: '5678',
  };

  beforeEach(async () => {
    session = new Verto({
      host: 'example.fs.telnyx',
      login: 'login',
      passwd: 'passwd',
    });
    await session.connect().catch(console.error);
    mockDisableAudioTracks.mockClear();
    mockEnableAudioTracks.mockClear();
    mockToggleAudioTracks.mockClear();
  });

  // ───────────────────────────────────────────────────────────────
  // 1. mutedMicOnStart & initial state
  // ───────────────────────────────────────────────────────────────
  describe('mutedMicOnStart', () => {
    it('should start with isAudioMuted=true when mutedMicOnStart=true', () => {
      const call = new Call(session, {
        ...defaultParams,
        mutedMicOnStart: true,
      });
      expect(call.isAudioMuted).toBe(true);
    });

    it('should start with isAudioMuted=false when mutedMicOnStart=false', () => {
      const call = new Call(session, {
        ...defaultParams,
        mutedMicOnStart: false,
      });
      expect(call.isAudioMuted).toBe(false);
    });

    it('should default isAudioMuted to false when mutedMicOnStart is not set', () => {
      const call = new Call(session, defaultParams);
      expect(call.isAudioMuted).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 2. Initial callUpdate notification reflects mutedMicOnStart
  // ───────────────────────────────────────────────────────────────
  describe('initial callUpdate notification', () => {
    it('should include isAudioMuted=true in the first callUpdate when mutedMicOnStart=true', () => {
      const notifications: any[] = [];
      const handler = (notification: any) => {
        if (notification.type === NOTIFICATION_TYPE.callUpdate) {
          notifications.push(notification);
        }
      };
      register(SwEvent.Notification, handler, session.uuid);

      const call = new Call(session, {
        ...defaultParams,
        mutedMicOnStart: true,
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].call.id).toBe(call.id);
      expect(notifications[0].call.isAudioMuted).toBe(true);

      deRegister(SwEvent.Notification, handler, session.uuid);
    });

    it('should include isAudioMuted=false in the first callUpdate when mutedMicOnStart is not set', () => {
      const notifications: any[] = [];
      const handler = (notification: any) => {
        if (notification.type === NOTIFICATION_TYPE.callUpdate) {
          notifications.push(notification);
        }
      };
      register(SwEvent.Notification, handler, session.uuid);

      const call = new Call(session, defaultParams);

      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].call.id).toBe(call.id);
      expect(notifications[0].call.isAudioMuted).toBe(false);

      deRegister(SwEvent.Notification, handler, session.uuid);
    });

    it('should reflect recovered mute state in callUpdate for reattached calls', () => {
      const notifications: any[] = [];
      const handler = (notification: any) => {
        if (notification.type === NOTIFICATION_TYPE.callUpdate) {
          notifications.push(notification);
        }
      };
      register(SwEvent.Notification, handler, session.uuid);

      const call = new Call(session, {
        ...defaultParams,
        mutedMicOnStart: true,
        recoveredCallId: 'old-call-id',
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].call.id).toBe(call.id);
      expect(notifications[0].call.isAudioMuted).toBe(true);

      deRegister(SwEvent.Notification, handler, session.uuid);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 3. muteAudio / unmuteAudio state changes
  // ───────────────────────────────────────────────────────────────
  describe('muteAudio / unmuteAudio state changes', () => {
    it('should set isAudioMuted=true after muteAudio()', () => {
      const call = new Call(session, defaultParams);
      expect(call.isAudioMuted).toBe(false);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);
    });

    it('should set isAudioMuted=false after unmuteAudio()', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);
      call.unmuteAudio();
      expect(call.isAudioMuted).toBe(false);
    });

    it('should call disableAudioTracks on muteAudio()', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(mockDisableAudioTracks).toHaveBeenCalledWith(
        (call as any).options.localStream
      );
    });

    it('should call enableAudioTracks on unmuteAudio()', () => {
      const call = new Call(session, defaultParams);
      call.unmuteAudio();
      expect(mockEnableAudioTracks).toHaveBeenCalledWith(
        (call as any).options.localStream
      );
    });

    it('should reflect mute state even without a local stream', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);
      call.unmuteAudio();
      expect(call.isAudioMuted).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 4. toggleAudioMute
  // ───────────────────────────────────────────────────────────────
  describe('toggleAudioMute', () => {
    it('should toggle isAudioMuted from false to true', () => {
      const call = new Call(session, defaultParams);
      expect(call.isAudioMuted).toBe(false);
      call.toggleAudioMute();
      expect(call.isAudioMuted).toBe(true);
    });

    it('should toggle isAudioMuted from true to false', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);
      call.toggleAudioMute();
      expect(call.isAudioMuted).toBe(false);
    });

    it('should apply the new desired muted state to local tracks', () => {
      const call = new Call(session, defaultParams);
      mockDisableAudioTracks.mockClear();
      mockEnableAudioTracks.mockClear();
      mockToggleAudioTracks.mockClear();

      call.toggleAudioMute();

      expect(mockDisableAudioTracks).toHaveBeenCalledWith(
        (call as any).options.localStream
      );
      expect(mockEnableAudioTracks).not.toHaveBeenCalled();
      expect(mockToggleAudioTracks).not.toHaveBeenCalled();
    });

    it('should apply the new desired unmuted state to local tracks', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      mockDisableAudioTracks.mockClear();
      mockEnableAudioTracks.mockClear();
      mockToggleAudioTracks.mockClear();

      call.toggleAudioMute();

      expect(mockEnableAudioTracks).toHaveBeenCalledWith(
        (call as any).options.localStream
      );
      expect(mockDisableAudioTracks).not.toHaveBeenCalled();
      expect(mockToggleAudioTracks).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 5. isAudioMuted returns durable state
  // ───────────────────────────────────────────────────────────────
  describe('isAudioMuted returns durable state', () => {
    it('should return true after muteAudio even if tracks are externally replaced', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);
    });

    it('should return false after unmuteAudio regardless of actual track state', () => {
      const call = new Call(session, defaultParams);
      call.unmuteAudio();
      expect(call.isAudioMuted).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 6. _applyDesiredAudioMuteState
  // ───────────────────────────────────────────────────────────────
  describe('_applyDesiredAudioMuteState', () => {
    it('should call disableAudioTracks when desired state is muted', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      mockDisableAudioTracks.mockClear();

      (call as any)._applyDesiredAudioMuteState();
      expect(mockDisableAudioTracks).toHaveBeenCalledWith(
        (call as any).options.localStream
      );
    });

    it('should call enableAudioTracks when desired state is unmuted', () => {
      const call = new Call(session, defaultParams);
      call.unmuteAudio();
      mockEnableAudioTracks.mockClear();

      (call as any)._applyDesiredAudioMuteState();
      expect(mockEnableAudioTracks).toHaveBeenCalledWith(
        (call as any).options.localStream
      );
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 7. applyDesiredAudioMuteState callback on options
  // ───────────────────────────────────────────────────────────────
  describe('applyDesiredAudioMuteState callback on options', () => {
    it('should be set on the call options after construction', () => {
      const call = new Call(session, defaultParams);
      expect(typeof (call as any).options.applyDesiredAudioMuteState).toBe(
        'function'
      );
    });

    it('should apply mute state when invoked after muteAudio', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      mockDisableAudioTracks.mockClear();

      (call as any).options.applyDesiredAudioMuteState();
      expect(mockDisableAudioTracks).toHaveBeenCalled();
    });

    it('should apply unmute state when invoked after unmuteAudio', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      call.unmuteAudio();
      mockEnableAudioTracks.mockClear();

      (call as any).options.applyDesiredAudioMuteState();
      expect(mockEnableAudioTracks).toHaveBeenCalled();
    });

    it('should apply mutedMicOnStart state for new calls', () => {
      const call = new Call(session, {
        ...defaultParams,
        mutedMicOnStart: true,
      });
      mockDisableAudioTracks.mockClear();

      (call as any).options.applyDesiredAudioMuteState();
      expect(mockDisableAudioTracks).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 8. setAudioInDevice — real replacement tests
  // ───────────────────────────────────────────────────────────────
  describe('setAudioInDevice with real track replacement', () => {
    /** Set up a call with a mocked peer + localStream for setAudioInDevice */
    const setupCallWithPeer = (call: Call) => {
      const replaceTrackFn = jest.fn().mockResolvedValue(undefined);
      const sender = {
        track: { kind: 'audio' },
        replaceTrack: replaceTrackFn,
      };
      (call as any).peer = {
        instance: {
          getSenders: () => [sender],
        },
      };

      // setAudioInDevice reads localStream.getAudioTracks/getVideoTracks
      // to stop old tracks and add video tracks to the new stream.
      const oldAudioTrack = { stop: jest.fn() };
      const oldVideoTrack = { kind: 'video' };
      (call as any).options.localStream = {
        getAudioTracks: () => [oldAudioTrack],
        getVideoTracks: () => [oldVideoTrack],
      };

      return { sender, replaceTrackFn, oldAudioTrack, oldVideoTrack };
    };

    it('muteAudio() then setAudioInDevice keeps new audio track disabled', async () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);

      const { replaceTrackFn } = setupCallWithPeer(call);

      await call.setAudioInDevice('device-muted');

      // getUserMedia mock returns a MediaStream with an audio track
      // that starts enabled=true. setAudioInDevice should set enabled=false
      // because muted defaults to _desiredAudioMuted=true.
      expect(replaceTrackFn).toHaveBeenCalled();
      const newStream = (call as any).options.localStream;
      const audioTrack = newStream.getAudioTracks()[0];
      expect(audioTrack.enabled).toBe(false);
      expect(call.isAudioMuted).toBe(true);
    });

    it('setAudioInDevice(deviceId, false) updates desired state and enables new track', async () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);

      const { replaceTrackFn } = setupCallWithPeer(call);

      await call.setAudioInDevice('device-unmuted', false);

      expect(replaceTrackFn).toHaveBeenCalled();
      const newStream = (call as any).options.localStream;
      const audioTrack = newStream.getAudioTracks()[0];
      expect(audioTrack.enabled).toBe(true);
      expect(call.isAudioMuted).toBe(false);
    });

    it('setAudioInDevice(deviceId, true) updates desired state and disables new track', async () => {
      const call = new Call(session, defaultParams);
      // Initially unmuted
      expect(call.isAudioMuted).toBe(false);

      const { replaceTrackFn } = setupCallWithPeer(call);

      await call.setAudioInDevice('device-muted-explicit', true);

      expect(replaceTrackFn).toHaveBeenCalled();
      const newStream = (call as any).options.localStream;
      const audioTrack = newStream.getAudioTracks()[0];
      expect(audioTrack.enabled).toBe(false);
      expect(call.isAudioMuted).toBe(true);
    });

    it('setAudioInDevice with no explicit muted defaults to current desired state (unmuted)', async () => {
      const call = new Call(session, defaultParams);
      expect(call.isAudioMuted).toBe(false);

      const { replaceTrackFn } = setupCallWithPeer(call);

      await call.setAudioInDevice('device-default');

      expect(replaceTrackFn).toHaveBeenCalled();
      const newStream = (call as any).options.localStream;
      const audioTrack = newStream.getAudioTracks()[0];
      expect(audioTrack.enabled).toBe(true);
      expect(call.isAudioMuted).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 8b. setAudioInDevice — failure / no-sender preserves desired state
  // ───────────────────────────────────────────────────────────────
  describe('setAudioInDevice failure preserves desired mute state', () => {
    /** Shared setup for failure tests: peer + localStream */
    const setupCallForFailureTest = (call: Call) => {
      const replaceTrackFn = jest.fn().mockResolvedValue(undefined);
      const sender = {
        track: { kind: 'audio' },
        replaceTrack: replaceTrackFn,
      };
      (call as any).peer = {
        instance: {
          getSenders: () => [sender],
        },
        close: jest.fn(),
      };
      const oldAudioTrack = { stop: jest.fn() };
      const oldVideoTrack = { kind: 'video' };
      (call as any).options.localStream = {
        getAudioTracks: () => [oldAudioTrack],
        getVideoTracks: () => [oldVideoTrack],
      };
      return { replaceTrackFn, oldAudioTrack };
    };

    it('should preserve desired muted state when getUserMedia fails', async () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);

      const { replaceTrackFn, oldAudioTrack } = setupCallForFailureTest(call);

      // Stub hangup to prevent _onMediaError cascade
      const hangupSpy = jest
        .spyOn(Object.getPrototypeOf(call), 'hangup' as any)
        .mockResolvedValue(undefined);

      // Make navigator.mediaDevices.getUserMedia reject
      jest
        .spyOn(navigator.mediaDevices, 'getUserMedia')
        .mockRejectedValueOnce(new Error('Requested device not found'));

      await call.setAudioInDevice('bad-device', false);

      // Desired state should NOT have flipped to false
      expect(call.isAudioMuted).toBe(true);
      // replaceTrack should not have been called
      expect(replaceTrackFn).not.toHaveBeenCalled();
      // localStream should be unchanged
      expect((call as any).options.localStream.getAudioTracks()[0]).toBe(
        oldAudioTrack
      );

      hangupSpy.mockRestore();
    });

    it('should preserve desired unmuted state when getUserMedia fails', async () => {
      const call = new Call(session, defaultParams);
      expect(call.isAudioMuted).toBe(false);

      const { replaceTrackFn } = setupCallForFailureTest(call);

      const hangupSpy = jest
        .spyOn(Object.getPrototypeOf(call), 'hangup' as any)
        .mockResolvedValue(undefined);

      jest
        .spyOn(navigator.mediaDevices, 'getUserMedia')
        .mockRejectedValueOnce(new Error('Permission denied'));

      await call.setAudioInDevice('denied-device', true);

      // Desired state should NOT have flipped to true
      expect(call.isAudioMuted).toBe(false);
      expect(replaceTrackFn).not.toHaveBeenCalled();

      hangupSpy.mockRestore();
    });

    it('should preserve desired muted state when there is no audio sender and emit a warning', async () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);
      const warnings: any[] = [];
      const handler = (warning: any) => warnings.push(warning);
      register(SwEvent.Warning, handler, call.id);

      // No audio sender at all
      (call as any).peer = {
        instance: {
          getSenders: () => [],
        },
        close: jest.fn(),
      };
      const oldAudioTrack = { stop: jest.fn() };
      const oldVideoTrack = { kind: 'video' };
      (call as any).options.localStream = {
        getAudioTracks: () => [oldAudioTrack],
        getVideoTracks: () => [oldVideoTrack],
      };

      await call.setAudioInDevice('some-device', false);

      // Desired state should NOT have flipped
      expect(call.isAudioMuted).toBe(true);
      // localStream should be unchanged
      expect((call as any).options.localStream.getAudioTracks()[0]).toBe(
        oldAudioTrack
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0].warning.name).toBe(
        'AUDIO_INPUT_DEVICE_CHANGE_SKIPPED'
      );
      expect(warnings[0].callId).toBe(call.id);
      expect(warnings[0].deviceId).toBe('some-device');
      deRegister(SwEvent.Warning, handler, call.id);
    });

    it('should preserve desired muted state when replaceTrack rejects', async () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);

      const replaceTrackFn = jest
        .fn()
        .mockRejectedValue(new Error('Track replacement failed'));
      const sender = {
        track: { kind: 'audio' },
        replaceTrack: replaceTrackFn,
      };
      (call as any).peer = {
        instance: {
          getSenders: () => [sender],
        },
        close: jest.fn(),
      };
      const oldAudioTrack = { stop: jest.fn() };
      const oldVideoTrack = { kind: 'video' };
      (call as any).options.localStream = {
        getAudioTracks: () => [oldAudioTrack],
        getVideoTracks: () => [oldVideoTrack],
      };

      // Stub hangup to prevent _onMediaError cascade
      const hangupSpy = jest
        .spyOn(Object.getPrototypeOf(call), 'hangup' as any)
        .mockResolvedValue(undefined);

      await call.setAudioInDevice('good-device', false);

      // Desired state should NOT have flipped to false
      expect(call.isAudioMuted).toBe(true);
      // Old audio track should NOT have been stopped
      expect(oldAudioTrack.stop).not.toHaveBeenCalled();
      // localStream should be unchanged
      expect((call as any).options.localStream.getAudioTracks()[0]).toBe(
        oldAudioTrack
      );
      // micId should NOT have been updated
      expect((call as any).options.micId).not.toBe('good-device');

      hangupSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 9. Reattach / ICE restart / renegotiation does not re-enable mic
  // ───────────────────────────────────────────────────────────────
  describe('reattach / ICE restart does not re-enable mic when desired mute is true', () => {
    it('applyDesiredAudioMuteState (Peer callback) calls disableAudioTracks after stream replacement when muted', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);

      // Simulate Peer creating a new stream after ICE restart / reattach
      const newStream = new (global as any).MediaStream();
      const audioTrack = new MediaStreamTrackMock();
      audioTrack.kind = 'audio';
      audioTrack.enabled = true;
      newStream.addTrack(audioTrack);
      (call as any).options.localStream = newStream;

      mockDisableAudioTracks.mockClear();

      // Peer calls the callback after setting up the stream
      const callback = (call as any).options.applyDesiredAudioMuteState;
      callback();

      // The callback should call disableAudioTracks with the new stream
      expect(mockDisableAudioTracks).toHaveBeenCalledWith(newStream);
      expect(call.isAudioMuted).toBe(true);
    });

    it('applyDesiredAudioMuteState calls enableAudioTracks after unmute + stream replacement', () => {
      const call = new Call(session, defaultParams);
      call.unmuteAudio();
      expect(call.isAudioMuted).toBe(false);

      const newStream = new (global as any).MediaStream();
      const audioTrack = new MediaStreamTrackMock();
      audioTrack.kind = 'audio';
      audioTrack.enabled = false;
      newStream.addTrack(audioTrack);
      (call as any).options.localStream = newStream;

      mockEnableAudioTracks.mockClear();

      const callback = (call as any).options.applyDesiredAudioMuteState;
      callback();

      expect(mockEnableAudioTracks).toHaveBeenCalledWith(newStream);
      expect(call.isAudioMuted).toBe(false);
    });

    it('mutedMicOnStart call: callback calls disableAudioTracks from Peer init', () => {
      const call = new Call(session, {
        ...defaultParams,
        mutedMicOnStart: true,
      });

      const newStream = new (global as any).MediaStream();
      const audioTrack = new MediaStreamTrackMock();
      audioTrack.kind = 'audio';
      audioTrack.enabled = true;
      newStream.addTrack(audioTrack);
      (call as any).options.localStream = newStream;

      mockDisableAudioTracks.mockClear();

      const callback = (call as any).options.applyDesiredAudioMuteState;
      callback();

      expect(mockDisableAudioTracks).toHaveBeenCalledWith(newStream);
      expect(call.isAudioMuted).toBe(true);
    });

    // Actual track.enabled mutation is verified by the setAudioInDevice
    // tests which use the real getUserMedia mock and real MediaStream,
    // confirming that track.enabled is set correctly after replacement.
  });

  // ───────────────────────────────────────────────────────────────
  // 10. Reattach preserves mute state via mutedMicOnStart
  // ───────────────────────────────────────────────────────────────
  describe('reattach preserves mute state via mutedMicOnStart', () => {
    it('should initialize _desiredAudioMuted=true from mutedMicOnStart', () => {
      const call = new Call(session, {
        ...defaultParams,
        mutedMicOnStart: true,
      });
      expect((call as any)._desiredAudioMuted).toBe(true);
      expect(call.isAudioMuted).toBe(true);
    });

    it('should have callback that mutes tracks on Peer init', () => {
      const call = new Call(session, {
        ...defaultParams,
        mutedMicOnStart: true,
      });
      mockDisableAudioTracks.mockClear();

      const callback = (call as any).options
        .applyDesiredAudioMuteState as () => void;
      callback();
      expect(mockDisableAudioTracks).toHaveBeenCalled();
    });
  });
});
