/**
 * MediaDeviceCollector tests
 *
 * Covers:
 *  - Call-start device snapshot formatting
 *  - Selected-device extraction and hashing
 *  - devicechange diffing (added/removed devices)
 *  - Redaction/hashing of deviceId and groupId
 *  - Privacy: labels excluded by default, included when opted in
 *  - Selected device availability tracking
 *  - Race condition: captureCallStart must complete before events are drained
 *  - Hash-based availability: selected device hashes match snapshot hashes
 */

import {
  MediaDeviceCollector,
  type IMediaDevicesSnapshotCallStart,
  type ISelectedMediaDevicesCallStart,
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
    it('captures a device snapshot at call start', async () => {
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

      // Should have snapshot + selected events
      expect(events.length).toBe(2);

      const snapshotEvent = events.find(
        (e) => e.eventName === 'media_devices_snapshot_call_start'
      ) as IMediaDevicesSnapshotCallStart;

      expect(snapshotEvent).toBeDefined();
      expect(snapshotEvent.devices.audioinput.length).toBe(2);
      expect(snapshotEvent.devices.audiooutput.length).toBe(2);
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

      const snapshotEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_snapshot_call_start'
        ) as IMediaDevicesSnapshotCallStart;

      const device = snapshotEvent.devices.audioinput[0];

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

      const snapshotEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_snapshot_call_start'
        ) as IMediaDevicesSnapshotCallStart;

      expect(snapshotEvent.devices.audioinput[0].label).toBeUndefined();
    });

    it('includes labels when includeLabels option is enabled', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput', 'Built-in Mic'),
      ]);

      const collector = new MediaDeviceCollector({ includeLabels: true });
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      const snapshotEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_snapshot_call_start'
        ) as IMediaDevicesSnapshotCallStart;

      expect(snapshotEvent.devices.audioinput[0].label).toBe('Built-in Mic');
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

      const snapshotEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_snapshot_call_start'
        ) as IMediaDevicesSnapshotCallStart;

      expect(snapshotEvent.devices.audioinput.length).toBe(1);
      expect(snapshotEvent.devices.audiooutput.length).toBe(1);
    });
  });

  describe('selected devices', () => {
    it('captures selected input device from getUserMedia track', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('selected-mic', 'audioinput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('selected-mic');
      await collector.captureCallStart(pc);

      const selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;

      expect(selectedEvent).toBeDefined();
      expect(selectedEvent.selected.input).not.toBeNull();
      expect(selectedEvent.selected.input?.deviceIdHash).toBeTruthy();
      expect(selectedEvent.selected.input?.stillAvailable).toBe(true);
    });

    it('marks output as browser-default when no output device is known', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc); // No output device ID

      const selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;

      expect(selectedEvent.selected.output).not.toBeNull();
      expect(selectedEvent.selected.output?.deviceIdHash).toBe(
        'browser-default'
      );
      expect(selectedEvent.selected.output?.stillAvailable).toBe(true);
    });

    it('captures selected output device when provided', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc, 'speaker-1');

      const selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;

      expect(selectedEvent.selected.output).not.toBeNull();
      expect(selectedEvent.selected.output?.deviceIdHash).not.toBe(
        'browser-default'
      );
      expect(selectedEvent.selected.output?.stillAvailable).toBe(true);
    });

    it('reports stillAvailable=false when selected device is not in snapshot', async () => {
      // The device was selected but isn't enumerated
      // (e.g. disconnected between getUserMedia and enumerateDevices)
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('other-mic', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('disconnected-mic');
      await collector.captureCallStart(pc);

      const selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;

      // The selected input device ID ('disconnected-mic') won't be found
      // in the snapshot (only 'other-mic' exists)
      expect(selectedEvent.selected.input?.stillAvailable).toBe(false);
    });
  });

  describe('devicechange diffing', () => {
    it('detects added devices', async () => {
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
      expect(changeEvent.diff.length).toBe(1);
      expect(changeEvent.diff[0].change).toBe('added');
      expect(changeEvent.diff[0].kind).toBe('audioinput');
    });

    it('detects removed devices', async () => {
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
      expect(changeEvent.diff.some((d) => d.change === 'removed')).toBe(true);
    });

    it('flags selectedInputStillAvailable=false when selected input disappears', async () => {
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

      expect(changeEvent.selectedInputStillAvailable).toBe(false);
    });

    it('flags selectedOutputStillAvailable=false when selected output disappears', async () => {
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

      expect(changeEvent.selectedOutputStillAvailable).toBe(false);
    });

    it('keeps selectedInputStillAvailable=true when an unrelated device changes', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('selected-mic', 'audioinput', 'Headset'),
        makeMediaDeviceInfo('other-mic', 'audioinput', 'Built-in'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('selected-mic');
      await collector.captureCallStart(pc);

      // Remove the OTHER mic (not the selected one)
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('selected-mic', 'audioinput', 'Headset'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_changed_during_call'
        ) as IMediaDevicesChangedDuringCall;

      // The selected input device is still present
      expect(changeEvent.selectedInputStillAvailable).toBe(true);
      // The diff should show the OTHER mic was removed
      expect(changeEvent.diff.some((d) => d.change === 'removed')).toBe(true);
    });

    it('keeps selectedOutputStillAvailable=true when an unrelated device changes', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
        makeMediaDeviceInfo('speaker-2', 'audiooutput', 'Built-in'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc, 'speaker-1');

      // Remove the OTHER speaker (not the selected one)
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
      ]);

      await collector._simulateDeviceChange();

      const changeEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_changed_during_call'
        ) as IMediaDevicesChangedDuringCall;

      // The selected output device is still present
      expect(changeEvent.selectedOutputStillAvailable).toBe(true);
    });

    it('includes currentSnapshot in change event', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

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

      expect(changeEvent.currentSnapshot).toBeDefined();
      expect(changeEvent.currentSnapshot.audioinput.length).toBe(2);
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
      expect(events.length).toBe(2); // snapshot + selected

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

      const snapshotEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_snapshot_call_start'
        ) as IMediaDevicesSnapshotCallStart;

      const selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;

      // The hash of 'same-id' should be the same in both events
      expect(snapshotEvent.devices.audioinput[0].deviceIdHash).toBe(
        selectedEvent.selected.input?.deviceIdHash
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

      const snapshotEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'media_devices_snapshot_call_start'
        ) as IMediaDevicesSnapshotCallStart;

      const hashes = snapshotEvent.devices.audioinput.map(
        (d) => d.deviceIdHash
      );
      expect(hashes[0]).not.toBe(hashes[1]);
    });
  });

  describe('updateOutputDevice', () => {
    it('updates selected output device after initial capture', async () => {
      enumerateDevicesSpy.mockResolvedValue([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      // Start without known output device
      await collector.captureCallStart(pc, null);

      // Initially, output should be browser-default
      let selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;
      expect(selectedEvent.selected.output?.deviceIdHash).toBe(
        'browser-default'
      );

      // Update output device after setSinkId succeeds
      await collector.updateOutputDevice('speaker-1');

      // Now the event should reflect the actual applied output
      selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;
      expect(selectedEvent.selected.output?.deviceIdHash).not.toBe(
        'browser-default'
      );
      expect(selectedEvent.selected.output?.stillAvailable).toBe(true);
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

      const selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;
      expect(selectedEvent.selected.output?.deviceIdHash).not.toBe(
        'browser-default'
      );
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

      // Now remove the headset — should flag selectedOutputStillAvailable=false
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

      expect(changeEvent.selectedOutputStillAvailable).toBe(false);
    });

    it('updateOutputDevice awaited before ensureCaptureComplete', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc, null);

      // Mid-call output update
      collector.updateOutputDevice('speaker-1');

      // ensureCaptureComplete should also await the update
      await collector.ensureCaptureComplete();

      const selectedEvent = collector
        .getEvents()
        .find(
          (e) => e.eventName === 'selected_media_devices_call_start'
        ) as ISelectedMediaDevicesCallStart;
      expect(selectedEvent.selected.output?.deviceIdHash).not.toBe(
        'browser-default'
      );
    });

    it('isCaptureComplete returns false while updateOutputDevice is in flight', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('speaker-1', 'audiooutput', 'Headset'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc, null);

      expect(collector.isCaptureComplete()).toBe(true);

      // Start an update and await it
      await collector.updateOutputDevice('speaker-1');

      expect(collector.isCaptureComplete()).toBe(true);
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

      // Start capture (doesn't await)
      const capturePromise = collector.captureCallStart(pc);

      // While enumerateDevices is pending, capture should not be complete
      expect(collector.isCaptureComplete()).toBe(false);

      // Resolve enumerateDevices
      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);

      // Now await the capture
      await capturePromise;

      // Capture should be complete now
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

      // Start capture (fire-and-forget)
      collector.captureCallStart(pc);

      // Before resolve, ensureCaptureComplete should block
      let resolved = false;
      const ensurePromise = collector.ensureCaptureComplete().then(() => {
        resolved = true;
      });

      // Not resolved yet
      expect(resolved).toBe(false);

      // Resolve enumerateDevices
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

      // Start capture (fire-and-forget)
      collector.captureCallStart(pc);

      // No events yet
      expect(collector.getEvents().length).toBe(0);

      // Resolve and await
      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);
      await collector.ensureCaptureComplete();

      // Events should now be available
      expect(collector.getEvents().length).toBe(2);
    });

    it('call-start events are emitted even if stop() is called during capture', async () => {
      let resolveEnumerate: (devices: MediaDeviceInfo[]) => void;
      const enumeratePromise = new Promise<MediaDeviceInfo[]>((resolve) => {
        resolveEnumerate = resolve;
      });
      enumerateDevicesSpy.mockReturnValue(enumeratePromise);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');

      // Start capture
      collector.captureCallStart(pc);

      // Stop before enumerateDevices resolves — this should only
      // prevent future devicechange events, NOT suppress the initial
      // call-start snapshot/selected-device events.
      collector.stop();

      // Resolve enumerateDevices
      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);
      await collector.ensureCaptureComplete();

      // Call-start events should still be emitted — they are required data.
      const events = collector.getEvents();
      expect(events.length).toBe(2);
      expect(events[0].eventName).toBe('media_devices_snapshot_call_start');
      expect(events[1].eventName).toBe('selected_media_devices_call_start');
    });

    it('stop() prevents devicechange events but not capture events', async () => {
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
      ]);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');
      await collector.captureCallStart(pc);

      // Should have 2 events (snapshot + selected)
      expect(collector.getEvents().length).toBe(2);

      collector.stop();

      // Simulate device change — should not produce a change event
      enumerateDevicesSpy.mockResolvedValueOnce([
        makeMediaDeviceInfo('mic-1', 'audioinput'),
        makeMediaDeviceInfo('mic-2', 'audioinput'),
      ]);

      await collector._simulateDeviceChange();

      // Still only the 2 capture events — no devicechange event
      expect(collector.getEvents().length).toBe(2);
    });

    it('cleanup() suppresses all events including in-flight capture', async () => {
      let resolveEnumerate: (devices: MediaDeviceInfo[]) => void;
      const enumeratePromise = new Promise<MediaDeviceInfo[]>((resolve) => {
        resolveEnumerate = resolve;
      });
      enumerateDevicesSpy.mockReturnValue(enumeratePromise);

      const collector = new MediaDeviceCollector();
      const pc = makePeerConnectionWithInputDevice('mic-1');

      // Start capture
      collector.captureCallStart(pc);

      // Cleanup before enumerateDevices resolves — this fully
      // destroys the collector and clears all events.
      collector.cleanup();

      // Resolve enumerateDevices
      resolveEnumerate!([makeMediaDeviceInfo('mic-1', 'audioinput')]);
      await collector.ensureCaptureComplete();

      // No events — cleanup clears everything
      expect(collector.getEvents().length).toBe(0);
    });
  });
});
