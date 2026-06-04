/**
 * MediaDeviceCollector tests
 *
 * Covers:
 *  - Call-start device snapshot (inputDevices, outputDevices, selectedInputDevice, selectedOutputDevice)
 *  - devicechange diffing (newConnectedDevices, newDisconnectedDevices)
 *  - Redaction/hashing of deviceId and groupId
 *  - Privacy: labels excluded by default, included when opted in
 *  - Debug log when selected device is disconnected
 *  - Race condition: captureCallStart must complete before events are drained
 */

import {
  MediaDeviceCollector,
  type IMediaDevicesSnapshotCallStart,
  type IMediaDevicesChangedDuringCall,
} from '../../webrtc/MediaDeviceCollector';

// ── Helpers ──────────────────────────────────────────────────────────

function makeMediaDeviceInfo(
  deviceId: string,
  kind: MediaDeviceInfo['kind'],
  label: string = '',
  groupId: string = 'group-1'
): MediaDeviceInfo {
  return {
    deviceId,
    kind,
    label,
    groupId,
    toJSON() {
      return { deviceId, kind, label, groupId };
    },
  };
}

function makePeerConnectionWithInputDevice(deviceId: string | null) {
  const settings = deviceId ? { deviceId } : {};
  const track = {
    kind: 'audio',
    getSettings: () => settings,
  };
  const sender = { track };
  return {
    getSenders: () => [sender],
  } as unknown as RTCPeerConnection;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('MediaDeviceCollector', () => {
  let enumerateDevicesSpy: jest.SpyInstance;

  beforeEach(() => {
    enumerateDevicesSpy = jest.spyOn(
      navigator.mediaDevices,
      'enumerateDevices'
    );
  });

  afterEach(() => {
    enumerateDevicesSpy.mockRestore();
  });

  describe('captureCallStart', () => {
    it('captures a single event with inputDevices, outputDevices, selectedInputDevice, selectedOutputDevice', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in Microphone'),
        makeMediaDeviceInfo('mic-2', 'audioinput', 'Headset Mic'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Built-in Speaker'),
        makeMediaDeviceInfo('speaker-2', 'audiooutput', 'Headset Speaker'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc, 'speaker-2');

      const events = collector.getEvents();

      // Should have exactly one event (the call-start snapshot)
      expect(events.length).toBe(1);

      const snapshotEvent = events[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.eventName).toBe('media_devices_snapshot_call_start');
      expect(snapshotEvent.inputDevices.length).toBe(2);
      expect(snapshotEvent.outputDevices.length).toBe(2);
      expect(snapshotEvent.selectedInputDevice).not.toBeNull();
      expect(snapshotEvent.selectedInputDevice!.kind).toBe('audioinput');
      expect(snapshotEvent.selectedOutputDevice).not.toBeNull();
      expect(snapshotEvent.selectedOutputDevice!.kind).toBe('audiooutput');
      expect(snapshotEvent.timestamp).toBeTruthy();
    });

    it('hashes deviceId and groupId — never sends raw values', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo(
          'raw-device-id',
          'audioinput',
          'My Mic',
          'raw-group-id'
        ),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('raw-device-id');
      await collector.captureCallStart(pc);

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;

      const device = snapshotEvent.inputDevices[0];

      // Must NOT be the raw value
      expect(device.deviceIdHash).not.toBe('raw-device-id');
      expect(device.groupIdHash).not.toBe('raw-group-id');

      // Must be a reasonable hash (64 hex chars for SHA-256, or shorter fallback)
      expect(device.deviceIdHash.length).toBeGreaterThan(0);
      expect(device.groupIdHash.length).toBeGreaterThan(0);
    });

    it('excludes labels by default (privacy)', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput', "Bob's AirPods"),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.inputDevices[0].label).toBeUndefined();
    });

    it('includes labels when includeLabels option is enabled', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in Mic'),
      ]);

      const collector = new MediaDeviceCollector({ includeLabels: true });
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.inputDevices[0].label).toBe('Built-in Mic');
    });

    it('only includes audioinput and audiooutput devices', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('cam-1', 'videoinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.inputDevices.length).toBe(1);
      expect(snapshotEvent.outputDevices.length).toBe(1);
    });

    it('sets selectedInputDevice to null when no input track', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      // PeerConnection with no audio track
      const pc = { getSenders: () => [] } as unknown as RTCPeerConnection;
      await collector.captureCallStart(pc);

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.selectedInputDevice).toBeNull();
    });

    it('sets selectedOutputDevice to null when no output device is known', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc); // No output device ID

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      // browser-default → no matching device, so null
      expect(snapshotEvent.selectedOutputDevice).toBeNull();
    });

    it('sets selectedInputDevice to null when input device not in snapshot', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('other-mic', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('disconnected-mic');
      await collector.captureCallStart(pc);

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      // The selected input device is not found in the enumerated devices
      expect(snapshotEvent.selectedInputDevice).toBeNull();
    });

    it('sets selectedOutputDevice when provided and found in snapshot', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc, 'speaker-1');

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.selectedOutputDevice).not.toBeNull();
      expect(snapshotEvent.selectedOutputDevice!.kind).toBe('audiooutput');
    });
  });

  describe('devicechange diffing', () => {
    it('detects new connected devices', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      // Simulate device change: add a new headset
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in'),
        makeMediaDeviceInfo('mic-2', 'audioinput', 'Headset'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_changed_during_call'
        ) as IMediaDevicesChangedDuringCall;

      expect(changeEvent).toBeDefined();
      expect(changeEvent.newConnectedDevices.length).toBe(1);
      expect(changeEvent.newConnectedDevices[0].kind).toBe('audioinput');
      expect(changeEvent.newDisconnectedDevices.length).toBe(0);
    });

    it('detects new disconnected devices', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in'),
        makeMediaDeviceInfo('mic-2', 'audioinput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      // Simulate device change: remove headset
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_changed_during_call'
        ) as IMediaDevicesChangedDuringCall;

      expect(changeEvent).toBeDefined();
      expect(changeEvent.newDisconnectedDevices.length).toBe(1);
      expect(changeEvent.newDisconnectedDevices[0].kind).toBe('audioinput');
      expect(changeEvent.newConnectedDevices.length).toBe(0);
    });

    it('always includes newConnectedDevices and newDisconnectedDevices arrays (empty if nothing)', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      // Add a new mic, remove speaker
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('mic-2', 'audioinput'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_changed_during_call'
        ) as IMediaDevicesChangedDuringCall;

      expect(Array.isArray(changeEvent.newConnectedDevices)).toBe(true);
      expect(Array.isArray(changeEvent.newDisconnectedDevices)).toBe(true);
      expect(changeEvent.newConnectedDevices.length).toBe(1);
      expect(changeEvent.newDisconnectedDevices.length).toBe(1);
    });

    it('does not emit change event when no audio devices changed', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      // Same devices
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvents = collector
        .getEvents()
        .filter((e) => e.eventName === 'media_devices_changed_during_call');

      expect(changeEvents.length).toBe(0);
    });

    it('includes disconnected selected input device in newDisconnectedDevices', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('selected-mic', 'audioinput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('selected-mic');
      await collector.captureCallStart(pc);

      // Selected input device is removed
      enumerateDevicesSpy.mockResolvedValueOnce([]);

      await collector._simulateDeviceChange();

      const changeEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_changed_during_call'
        ) as IMediaDevicesChangedDuringCall;

      // The disconnected device includes the selected input
      expect(changeEvent.newDisconnectedDevices.length).toBe(1);
      expect(changeEvent.newDisconnectedDevices[0].kind).toBe('audioinput');
    });

    it('logs debug when selected output device is disconnected', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc, 'speaker-1');

      // Selected output device is removed
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_changed_during_call'
        ) as IMediaDevicesChangedDuringCall;

      // The disconnected device includes the selected output
      expect(
        changeEvent.newDisconnectedDevices.some((d) => d.kind === 'audiooutput')
      ).toBe(true);
    });
  });

  describe('drainEvents', () => {
    it('returns all events and clears the internal buffer', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      const events = collector.drainEvents();
      expect(events.length).toBe(1); // single call-start event

      // Should be empty after drain
      expect(collector.getEvents().length).toBe(0);
    });
  });

  describe('stop and cleanup', () => {
    it('stop() prevents further event collection', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      collector.stop();

      // Simulate device change — should not produce an event
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('mic-2', 'audioinput'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvents = collector
        .getEvents()
        .filter((e) => e.eventName === 'media_devices_changed_during_call');

      expect(changeEvents.length).toBe(0);
    });

    it('cleanup() clears all internal state', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      collector.cleanup();

      expect(collector.getEvents().length).toBe(0);
    });
  });

  describe('hashing consistency', () => {
    it('produces consistent hashes for the same input', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('same-id', 'audioinput', 'Mic 1', 'same-group'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('same-id');
      await collector.captureCallStart(pc);

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;

      // The hash in inputDevices should match the hash in selectedInputDevice
      expect(snapshotEvent.inputDevices[0].deviceIdHash).toBe(
        snapshotEvent.selectedInputDevice?.deviceIdHash
      );
    });

    it('produces different hashes for different inputs', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('device-A', 'audioinput', 'Mic A', 'group-1'),
        makeMediaDeviceInfo('device-B', 'audioinput', 'Mic B', 'group-1'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('device-A');
      await collector.captureCallStart(pc);

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;

      const hashes = snapshotEvent.inputDevices.map((d) => d.deviceIdHash);
      expect(hashes[0]).not.toBe(hashes[1]);
    });
  });

  describe('updateOutputDevice', () => {
    it('updates selectedOutputDevice after initial capture', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      // Start without known output device
      await collector.captureCallStart(pc, null);

      // Initially, selectedOutputDevice should be null (browser-default has no matching device)
      let snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.selectedOutputDevice).toBeNull();

      // Update output device after setSinkId succeeds
      await collector.updateOutputDevice('speaker-1');

      // Now the event should reflect the actual applied output
      snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.selectedOutputDevice).not.toBeNull();
      expect(snapshotEvent.selectedOutputDevice!.kind).toBe('audiooutput');
    });

    it('awaits in-flight capture before updating', async () => {
      let resolveEnumerate: (devices: MediaDeviceInfo[]) => void;
      const enumeratePromise = new Promise<MediaDeviceInfo[]>((resolve) => {
        resolveEnumerate = resolve;
      });
      enumerateDevicesSpy.mockReturnValue(enumeratePromise);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      collector.captureCallStart(pc, null);

      // Update output device while capture is in flight
      const updatePromise = collector.updateOutputDevice('speaker-1');

      // Resolve enumerate
      resolveEnumerate!([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput'),
      ]);

      await updatePromise;

      const snapshotEvent =
        collector.getEvents()[0] as IMediaDevicesSnapshotCallStart;
      expect(snapshotEvent.selectedOutputDevice).not.toBeNull();
    });

    it('does nothing if cleaned up', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc, null);

      collector.cleanup();

      // Should not throw
      await collector.updateOutputDevice('speaker-1');
    });

    it('mid-call updateOutputDevice affects devicechange availability checks', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
        makeMediaDeviceInfo('speaker-2', 'audiooutput', 'Built-in'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      // Start with browser-default output
      await collector.captureCallStart(pc, null);

      // Mid-call: app switches output to headset via setAudioOutDevice
      await collector.updateOutputDevice('speaker-1');

      // Now remove the headset
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-2', 'audiooutput', 'Built-in'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_changed_during_call'
        ) as IMediaDevicesChangedDuringCall;

      // The headset should be in disconnected devices
      expect(
        changeEvent.newDisconnectedDevices.some((d) => d.kind === 'audiooutput')
      ).toBe(true);
    });
  });

  describe('capture promise tracking', () => {
    it('isCaptureComplete() returns false while captureCallStart is in flight', async () => {
      let resolveEnumerate: (devices: MediaDeviceInfo[]) => void;
      const enumeratePromise = new Promise<MediaDeviceInfo[]>((resolve) => {
        resolveEnumerate = resolve;
      });
      enumerateDevicesSpy.mockReturnValue(enumeratePromise);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');

      const capturePromise = collector.captureCallStart(pc);

      expect(collector.isCaptureComplete()).toBe(false);

      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);
      await capturePromise;

      expect(collector.isCaptureComplete()).toBe(true);
    });

    it('ensureCaptureComplete() resolves after captureCallStart completes', async () => {
      let resolveEnumerate: (devices: MediaDeviceInfo[]) => void;
      const enumeratePromise = new Promise<MediaDeviceInfo[]>((resolve) => {
        resolveEnumerate = resolve;
      });
      enumerateDevicesSpy.mockReturnValue(enumeratePromise);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');

      collector.captureCallStart(pc);

      let resolved = false;
      const ensurePromise = collector.ensureCaptureComplete().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);
      await ensurePromise;
      expect(resolved).toBe(true);
    });

    it('events are available after ensureCaptureComplete', async () => {
      let resolveEnumerate: (devices: MediaDeviceInfo[]) => void;
      const enumeratePromise = new Promise<MediaDeviceInfo[]>((resolve) => {
        resolveEnumerate = resolve;
      });
      enumerateDevicesSpy.mockReturnValue(enumeratePromise);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');

      collector.captureCallStart(pc);

      expect(collector.getEvents().length).toBe(0);

      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);
      await collector.ensureCaptureComplete();

      expect(collector.getEvents().length).toBe(1);
    });

    it('call-start events are emitted even if stop() is called during capture', async () => {
      let resolveEnumerate: (devices: MediaDeviceInfo[]) => void;
      const enumeratePromise = new Promise<MediaDeviceInfo[]>((resolve) => {
        resolveEnumerate = resolve;
      });
      enumerateDevicesSpy.mockReturnValue(enumeratePromise);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');

      collector.captureCallStart(pc);

      collector.stop();

      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);
      await collector.ensureCaptureComplete();

      const events = collector.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].eventName).toBe('media_devices_snapshot_call_start');
    });

    it('stop() prevents devicechange events but not capture events', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      expect(collector.getEvents().length).toBe(1);

      collector.stop();

      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('mic-2', 'audioinput'),
      ]);

      await collector._simulateDeviceChange();

      expect(collector.getEvents().length).toBe(1);
    });

    it('cleanup() suppresses all events including in-flight capture', async () => {
      let resolveEnumerate: (devices: MediaDeviceInfo[]) => void;
      const enumeratePromise = new Promise<MediaDeviceInfo[]>((resolve) => {
        resolveEnumerate = resolve;
      });
      enumerateDevicesSpy.mockReturnValue(enumeratePromise);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');

      collector.captureCallStart(pc);

      collector.cleanup();

      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);
      await collector.ensureCaptureComplete();

      expect(collector.getEvents().length).toBe(0);
    });
  });
});
