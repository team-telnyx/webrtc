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

import Call from '../../webrtc/Call';
import * as helpers from '../../webrtc/helpers';
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

  describe('mutedMicOnStart', () => {
    it('should start with isAudioMuted=true when mutedMicOnStart=true', () => {
      const call = new Call(session, { ...defaultParams, mutedMicOnStart: true });
      expect(call.isAudioMuted).toBe(true);
    });

    it('should start with isAudioMuted=false when mutedMicOnStart=false', () => {
      const call = new Call(session, { ...defaultParams, mutedMicOnStart: false });
      expect(call.isAudioMuted).toBe(false);
    });

    it('should default isAudioMuted to false when mutedMicOnStart is not set', () => {
      const call = new Call(session, defaultParams);
      expect(call.isAudioMuted).toBe(false);
    });
  });

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

    it('should call toggleAudioTracks', () => {
      const call = new Call(session, defaultParams);
      call.toggleAudioMute();
      expect(mockToggleAudioTracks).toHaveBeenCalledWith(
        (call as any).options.localStream
      );
    });
  });

  describe('isAudioMuted returns durable state', () => {
    it('should return true after muteAudio even if tracks are externally replaced', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      // The desired state persists regardless of external changes
      expect(call.isAudioMuted).toBe(true);
    });

    it('should return false after unmuteAudio regardless of actual track state', () => {
      const call = new Call(session, defaultParams);
      call.unmuteAudio();
      expect(call.isAudioMuted).toBe(false);
    });
  });

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

  describe('setAudioInDevice default muted param', () => {
    it('should default to current desired mute state (true)', () => {
      const call = new Call(session, defaultParams);
      call.muteAudio();
      expect((call as any)._desiredAudioMuted).toBe(true);
    });

    it('should default to current desired mute state (false)', () => {
      const call = new Call(session, defaultParams);
      expect((call as any)._desiredAudioMuted).toBe(false);
    });
  });

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
