/**
 * MediaDeviceCollector
 *
 * Captures media-device visibility information for WebRTC call reports.
 * When a customer reports "agent could not hear audio" but inbound RTP/audio
 * stats are healthy, we need to know which devices existed and changed around
 * the call.
 *
 * Events produced:
 *  - media_devices_snapshot_call_start      – full device list at call start
 *  - selected_media_devices_call_start       – which input/output was selected
 *  - media_devices_changed_during_call       – diff when devicechange fires
 *
 * Privacy: raw deviceId and groupId values are SHA-256 hashed before
 * inclusion in any report. Labels are omitted by default unless the
 * application has explicitly opted in via a permission policy.
 */

import logger from '../util/logger';

// ── Hashing utility ──────────────────────────────────────────────────

/**
 * SHA-256 hash a string value, returning the hex digest.
 * Falls back to a non-cryptographic hash when SubtleCrypto is unavailable
 * (e.g. Node test environment without a crypto polyfill).
 */
async function hashValue(value: string): Promise<string> {
  if (!value) return '';

  // SubtleCrypto available (browser + modern Node)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(value);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to simple hash
    }
  }

  // Simple non-cryptographic fallback (testing / SSR)
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ── Types ────────────────────────────────────────────────────────────

/** A single device entry in a snapshot (after hashing/redaction). */
export interface IRedactedDeviceInfo {
  /** SHA-256 hash of the raw deviceId */
  deviceIdHash: string;
  /** SHA-256 hash of the raw groupId */
  groupIdHash: string;
  /** Device kind: 'audioinput' | 'audiooutput' */
  kind: string;
  /**
   * Device label. Included only when includeLabels is enabled
   * (requires explicit permission policy).
   */
  label?: string;
}

/** Snapshot of all audio devices at a point in time. */
export interface IDeviceSnapshot {
  audioinput: IRedactedDeviceInfo[];
  audiooutput: IRedactedDeviceInfo[];
}

/** Selected device info at call start. */
export interface ISelectedDevices {
  input: {
    /** SHA-256 hash of the selected input device ID */
    deviceIdHash: string;
    /** Whether the selected input device is still present in the current snapshot */
    stillAvailable: boolean;
  } | null;
  output: {
    /**
     * SHA-256 hash of the selected output device ID, or the literal
     * string 'browser-default' / 'unknown' when the SDK cannot determine it.
     */
    deviceIdHash: string;
    /** Whether the selected output device is still present in the current snapshot */
    stillAvailable: boolean;
  } | null;
}

/** Event: media_devices_snapshot_call_start */
export interface IMediaDevicesSnapshotCallStart {
  eventName: 'media_devices_snapshot_call_start';
  timestamp: string;
  devices: IDeviceSnapshot;
}

/** Event: selected_media_devices_call_start */
export interface ISelectedMediaDevicesCallStart {
  eventName: 'selected_media_devices_call_start';
  timestamp: string;
  selected: ISelectedDevices;
}

/** Diff entry for a device change event. */
export interface IDeviceDiffEntry {
  /** SHA-256 hash of the device ID */
  deviceIdHash: string;
  /** Device kind */
  kind: string;
  /** 'added' | 'removed' */
  change: 'added' | 'removed';
}

/** Event: media_devices_changed_during_call */
export interface IMediaDevicesChangedDuringCall {
  eventName: 'media_devices_changed_during_call';
  timestamp: string;
  diff: IDeviceDiffEntry[];
  /** Whether the previously selected input device is still available */
  selectedInputStillAvailable: boolean;
  /** Whether the previously selected output device is still available */
  selectedOutputStillAvailable: boolean;
  /** Full current snapshot after the change */
  currentSnapshot: IDeviceSnapshot;
}

export type MediaDeviceEvent =
  | IMediaDevicesSnapshotCallStart
  | ISelectedMediaDevicesCallStart
  | IMediaDevicesChangedDuringCall;

export interface IMediaDeviceCollectorOptions {
  /**
   * Include device labels in snapshots.
   * Default: false — labels can contain PII (e.g. "Bob's AirPods").
   * Only enable when the application has an explicit permission policy
   * for including labels in call reports.
   */
  includeLabels?: boolean;
}

// ── Collector ────────────────────────────────────────────────────────

export class MediaDeviceCollector {
  private options: IMediaDeviceCollectorOptions;
  private _events: MediaDeviceEvent[] = [];
  private _selectedInputDeviceId: string | null = null;
  private _selectedOutputDeviceId: string | null = null;
  private _callStartSnapshot: IDeviceSnapshot | null = null;
  private _latestSnapshot: IDeviceSnapshot | null = null;
  private _deviceChangeHandler: (() => void) | null = null;
  private _stopped: boolean = false;

  constructor(options?: IMediaDeviceCollectorOptions) {
    this.options = {
      includeLabels: false,
      ...options,
    };
  }

  /**
   * Capture the device snapshot at call start.
   * Must be called after permissions are available (i.e. after getUserMedia).
   *
   * @param peerConnection - The RTCPeerConnection for the call
   * @param outputDeviceId - The output device ID if known (via setSinkId), or null/undefined
   */
  async captureCallStart(
    peerConnection: RTCPeerConnection,
    outputDeviceId?: string | null
  ): Promise<void> {
    if (this._stopped) return;

    try {
      // 1. Enumerate all devices
      const rawDevices = await this._enumerateDevices();
      const snapshot = await this._redactDeviceList(rawDevices);
      this._callStartSnapshot = snapshot;
      this._latestSnapshot = snapshot;

      // 2. Emit snapshot event
      const snapshotEvent: IMediaDevicesSnapshotCallStart = {
        eventName: 'media_devices_snapshot_call_start',
        timestamp: new Date().toISOString(),
        devices: snapshot,
      };
      this._events.push(snapshotEvent);

      // 3. Determine selected input device from the audio sender track
      const inputDeviceId = this._getInputDeviceId(peerConnection);
      this._selectedInputDeviceId = inputDeviceId;

      // 4. Determine selected output device
      const resolvedOutputId = outputDeviceId || null;
      this._selectedOutputDeviceId = resolvedOutputId;

      // 5. Emit selected devices event
      const selectedEvent = await this._buildSelectedEvent(
        inputDeviceId,
        resolvedOutputId,
        snapshot
      );
      this._events.push(selectedEvent);

      // 6. Start listening for devicechange events
      this._startDeviceChangeListener();

      logger.info('MediaDeviceCollector: captured call-start device snapshot', {
        inputDevices: snapshot.audioinput.length,
        outputDevices: snapshot.audiooutput.length,
        selectedInput: inputDeviceId ? 'present' : 'unknown',
        selectedOutput: resolvedOutputId ? 'present' : 'browser-default',
      });
    } catch (error) {
      logger.error(
        'MediaDeviceCollector: failed to capture call-start snapshot',
        {
          error,
        }
      );
    }
  }

  /**
   * Stop the collector and clean up listeners.
   * Called when the call ends.
   */
  stop(): void {
    this._stopped = true;
    this._removeDeviceChangeListener();
  }

  /**
   * Get all collected events (for inclusion in the call report).
   */
  getEvents(): MediaDeviceEvent[] {
    return this._events;
  }

  /**
   * Drain all collected events and reset the internal array.
   * Used when events are being included in an intermediate report.
   */
  drainEvents(): MediaDeviceEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }

  /**
   * Clean up resources after the call report has been posted.
   */
  cleanup(): void {
    this.stop();
    this._events = [];
    this._callStartSnapshot = null;
    this._latestSnapshot = null;
    this._selectedInputDeviceId = null;
    this._selectedOutputDeviceId = null;
  }

  // ── Internal ─────────────────────────────────────────────────────

  private async _enumerateDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.enumerateDevices === 'function'
      ) {
        return await navigator.mediaDevices.enumerateDevices();
      }
    } catch (error) {
      logger.debug('MediaDeviceCollector: enumerateDevices failed', { error });
    }
    return [];
  }

  /**
   * Get the input device ID from the audio sender track's settings.
   */
  private _getInputDeviceId(peerConnection: RTCPeerConnection): string | null {
    try {
      const sender = peerConnection
        .getSenders()
        .find((s) => s.track?.kind === 'audio');
      const track = sender?.track;
      if (!track) return null;
      const settings = track.getSettings?.();
      return settings?.deviceId || null;
    } catch (error) {
      logger.debug('MediaDeviceCollector: could not get input device ID', {
        error,
      });
      return null;
    }
  }

  /**
   * Redact a raw device list: hash IDs, optionally include labels.
   */
  private async _redactDeviceList(
    devices: MediaDeviceInfo[]
  ): Promise<IDeviceSnapshot> {
    const audioinput: IRedactedDeviceInfo[] = [];
    const audiooutput: IRedactedDeviceInfo[] = [];

    for (const device of devices) {
      if (device.kind !== 'audioinput' && device.kind !== 'audiooutput') {
        continue;
      }

      const entry: IRedactedDeviceInfo = {
        deviceIdHash: await hashValue(device.deviceId),
        groupIdHash: await hashValue(device.groupId),
        kind: device.kind,
      };

      if (this.options.includeLabels && device.label) {
        entry.label = device.label;
      }

      if (device.kind === 'audioinput') {
        audioinput.push(entry);
      } else {
        audiooutput.push(entry);
      }
    }

    return { audioinput, audiooutput };
  }

  /**
   * Build the selected devices event at call start.
   */
  private async _buildSelectedEvent(
    inputDeviceId: string | null,
    outputDeviceId: string | null,
    snapshot: IDeviceSnapshot
  ): Promise<ISelectedMediaDevicesCallStart> {
    const selected: ISelectedDevices = {
      input: null,
      output: null,
    };

    if (inputDeviceId) {
      const inputHash = await hashValue(inputDeviceId);
      const stillAvailable = snapshot.audioinput.some(
        (d) => d.deviceIdHash === inputHash
      );
      selected.input = {
        deviceIdHash: inputHash,
        stillAvailable,
      };
    }

    if (outputDeviceId) {
      const outputHash = await hashValue(outputDeviceId);
      const stillAvailable = snapshot.audiooutput.some(
        (d) => d.deviceIdHash === outputHash
      );
      selected.output = {
        deviceIdHash: outputHash,
        stillAvailable,
      };
    } else {
      // SDK cannot determine the output device
      selected.output = {
        deviceIdHash: 'browser-default',
        stillAvailable: true, // browser-default is always conceptually available
      };
    }

    return {
      eventName: 'selected_media_devices_call_start',
      timestamp: new Date().toISOString(),
      selected,
    };
  }

  /**
   * Start listening for devicechange events.
   */
  private _startDeviceChangeListener(): void {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.addEventListener !== 'function'
    ) {
      return;
    }

    this._deviceChangeHandler = () => {
      this._onDeviceChange();
    };

    navigator.mediaDevices.addEventListener(
      'devicechange',
      this._deviceChangeHandler
    );
  }

  private _removeDeviceChangeListener(): void {
    if (
      this._deviceChangeHandler &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.removeEventListener === 'function'
    ) {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        this._deviceChangeHandler
      );
    }
    this._deviceChangeHandler = null;
  }

  /**
   * Handle a devicechange event: capture new snapshot, diff against
   * the previous one, and emit a change event.
   */
  private async _onDeviceChange(): Promise<void> {
    if (this._stopped) return;

    try {
      const rawDevices = await this._enumerateDevices();
      const newSnapshot = await this._redactDeviceList(rawDevices);
      const previousSnapshot = this._latestSnapshot;

      if (!previousSnapshot) {
        this._latestSnapshot = newSnapshot;
        return;
      }

      // Compute diff
      const diff = this._computeDiff(previousSnapshot, newSnapshot);

      if (diff.length === 0) {
        // No actual changes in audio devices
        this._latestSnapshot = newSnapshot;
        return;
      }

      // Check if selected devices are still available
      const selectedInputStillAvailable = this._checkSelectedDeviceAvailable(
        this._selectedInputDeviceId,
        newSnapshot.audioinput
      );
      const selectedOutputStillAvailable =
        this._checkSelectedOutputAvailable(newSnapshot);

      const changeEvent: IMediaDevicesChangedDuringCall = {
        eventName: 'media_devices_changed_during_call',
        timestamp: new Date().toISOString(),
        diff,
        selectedInputStillAvailable,
        selectedOutputStillAvailable,
        currentSnapshot: newSnapshot,
      };

      this._events.push(changeEvent);
      this._latestSnapshot = newSnapshot;

      logger.info('MediaDeviceCollector: device change detected during call', {
        diffCount: diff.length,
        selectedInputStillAvailable,
        selectedOutputStillAvailable,
      });
    } catch (error) {
      logger.error('MediaDeviceCollector: error handling devicechange', {
        error,
      });
    }
  }

  /**
   * Compute the diff between two device snapshots.
   */
  private _computeDiff(
    previous: IDeviceSnapshot,
    current: IDeviceSnapshot
  ): IDeviceDiffEntry[] {
    const diff: IDeviceDiffEntry[] = [];

    const prevInputIds = new Set(
      previous.audioinput.map((d) => d.deviceIdHash)
    );
    const currInputIds = new Set(current.audioinput.map((d) => d.deviceIdHash));
    const prevOutputIds = new Set(
      previous.audiooutput.map((d) => d.deviceIdHash)
    );
    const currOutputIds = new Set(
      current.audiooutput.map((d) => d.deviceIdHash)
    );

    // Added inputs
    for (const device of current.audioinput) {
      if (!prevInputIds.has(device.deviceIdHash)) {
        diff.push({
          deviceIdHash: device.deviceIdHash,
          kind: 'audioinput',
          change: 'added',
        });
      }
    }

    // Removed inputs
    for (const device of previous.audioinput) {
      if (!currInputIds.has(device.deviceIdHash)) {
        diff.push({
          deviceIdHash: device.deviceIdHash,
          kind: 'audioinput',
          change: 'removed',
        });
      }
    }

    // Added outputs
    for (const device of current.audiooutput) {
      if (!prevOutputIds.has(device.deviceIdHash)) {
        diff.push({
          deviceIdHash: device.deviceIdHash,
          kind: 'audiooutput',
          change: 'added',
        });
      }
    }

    // Removed outputs
    for (const device of previous.audiooutput) {
      if (!currOutputIds.has(device.deviceIdHash)) {
        diff.push({
          deviceIdHash: device.deviceIdHash,
          kind: 'audiooutput',
          change: 'removed',
        });
      }
    }

    return diff;
  }

  /**
   * Check if a selected input device is still in the current snapshot.
   */
  private _checkSelectedDeviceAvailable(
    deviceId: string | null,
    currentDevices: IRedactedDeviceInfo[]
  ): boolean {
    if (!deviceId) return true; // No selected device = not applicable
    return currentDevices.some((d) => d.deviceIdHash === deviceId);
  }

  /**
   * Check if the selected output device is still available.
   * Handles the special 'browser-default' / 'unknown' cases.
   */
  private _checkSelectedOutputAvailable(
    currentSnapshot: IDeviceSnapshot
  ): boolean {
    if (!this._selectedOutputDeviceId) {
      // browser-default — always conceptually available
      return true;
    }
    return currentSnapshot.audiooutput.some(
      (d) => d.deviceIdHash === this._selectedOutputDeviceId
    );
  }

  // ── Test helpers ──────────────────────────────────────────────────

  /**
   * @internal Exposed for testing: simulate a devicechange event.
   */
  async _simulateDeviceChange(): Promise<void> {
    await this._onDeviceChange();
  }

  /**
   * @internal Exposed for testing: set the latest snapshot directly.
   */
  _setLatestSnapshot(snapshot: IDeviceSnapshot): void {
    this._latestSnapshot = snapshot;
  }
}
