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
  /**
   * Hash of the selected input device ID. Stored as hash so that
   * availability checks against hashed snapshot IDs work correctly.
   */
  private _selectedInputDeviceIdHash: string | null = null;
  /**
   * Hash of the selected output device ID. Stored as hash so that
   * availability checks against hashed snapshot IDs work correctly.
   * Special sentinel values: 'browser-default' | 'unknown'
   */
  private _selectedOutputDeviceIdHash: string | null = null;
  private _callStartSnapshot: IDeviceSnapshot | null = null;
  private _latestSnapshot: IDeviceSnapshot | null = null;
  private _deviceChangeHandler: (() => void) | null = null;

  /**
   * When true, no new devicechange events will be processed.
   * This is set by stop() to disable the devicechange listener
   * without discarding the initial capture results.
   *
   * The initial captureCallStart() always emits its events
   * regardless of this flag — the call-start snapshot and
   * selected-device events are required data for the report.
   */
  private _listenersStopped: boolean = false;

  /**
   * Promise tracking any in-flight updateOutputDevice() call.
   * Must be awaited before posting any report to avoid races where
   * the output device update hasn't completed before events are drained.
   */
  private _updatePromise: Promise<void> | null = null;

  /**
   * Promise tracking the in-flight captureCallStart() call.
   * Must be awaited before posting any report to avoid races where
   * a short call ends before enumerateDevices + hashing completes.
   */
  private _capturePromise: Promise<void> | null = null;

  /**
   * Whether cleanup() has been called. Once cleaned up, no further
   * operations are allowed — captureCallStart will not emit events,
   * and drainEvents/getEvents will return empty.
   */
  private _cleanedUp: boolean = false;

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
   * The call-start snapshot and selected-device events are always emitted
   * even if stop() is called during the async capture — this data is
   * required for call reports. Only devicechange events are suppressed
   * after stop().
   *
   * @param peerConnection - The RTCPeerConnection for the call
   * @param outputDeviceId - The output device ID that was *actually applied*
   *   via setSinkId. Pass null/undefined if setSinkId was not called or failed.
   */
  captureCallStart(
    peerConnection: RTCPeerConnection,
    outputDeviceId?: string | null
  ): Promise<void> {
    // If already cleaned up, don't start a new capture
    if (this._cleanedUp) {
      return Promise.resolve();
    }
    const promise = this._doCaptureCallStart(peerConnection, outputDeviceId);
    this._capturePromise = promise;
    return promise;
  }

  private async _doCaptureCallStart(
    peerConnection: RTCPeerConnection,
    outputDeviceId?: string | null
  ): Promise<void> {
    // Don't start if already cleaned up
    if (this._cleanedUp) return;

    try {
      // 1. Enumerate all devices
      const rawDevices = await this._enumerateDevices();
      const snapshot = await this._redactDeviceList(rawDevices);
      this._callStartSnapshot = snapshot;
      this._latestSnapshot = snapshot;

      // 2. Emit snapshot event — always emit even if stop() was called
      //    during the async gap. The call-start snapshot is required data.
      //    Only skip if cleanup() was called (collector is being destroyed).
      if (!this._cleanedUp) {
        const snapshotEvent: IMediaDevicesSnapshotCallStart = {
          eventName: 'media_devices_snapshot_call_start',
          timestamp: new Date().toISOString(),
          devices: snapshot,
        };
        this._events.push(snapshotEvent);
      }

      // 3. Determine selected input device from the audio sender track
      const inputDeviceId = this._getInputDeviceId(peerConnection);

      // 4. Hash the selected IDs and store the hashes for later availability checks
      if (inputDeviceId) {
        this._selectedInputDeviceIdHash = await hashValue(inputDeviceId);
      } else {
        this._selectedInputDeviceIdHash = null;
      }

      // outputDeviceId is the *actually applied* sink ID (after setSinkId succeeds).
      // If null/undefined, the SDK cannot determine the output → 'browser-default'.
      if (outputDeviceId) {
        this._selectedOutputDeviceIdHash = await hashValue(outputDeviceId);
      } else {
        this._selectedOutputDeviceIdHash = 'browser-default';
      }

      // 5. Emit selected devices event — always emit even if stop() was called
      //    during the async gap. The selected-device data is required for reports.
      //    Only skip if cleanup() was called.
      if (!this._cleanedUp) {
        const selectedEvent = this._buildSelectedEvent(snapshot);
        this._events.push(selectedEvent);
      }

      // 6. Start listening for devicechange events.
      //    Only if not stopped (stop() disables future devicechange events)
      //    and not cleaned up, and capture is still relevant.
      if (!this._listenersStopped && !this._cleanedUp) {
        this._startDeviceChangeListener();
      }

      // Mark capture as complete
      this._capturePromise = null;

      logger.info('MediaDeviceCollector: captured call-start device snapshot', {
        inputDevices: snapshot.audioinput.length,
        outputDevices: snapshot.audiooutput.length,
        selectedInput: inputDeviceId ? 'present' : 'unknown',
        selectedOutput: outputDeviceId ? 'present' : 'browser-default',
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
   * Await the in-flight captureCallStart() promise and any pending
   * updateOutputDevice() promise before posting a report.
   * Prevents races where a short call ends before enumerateDevices +
   * hashing completes, or where a mid-call output device change
   * hasn't been reflected in the events yet.
   */
  async ensureCaptureComplete(): Promise<void> {
    if (this._capturePromise) {
      await this._capturePromise;
      this._capturePromise = null;
    }
    if (this._updatePromise) {
      await this._updatePromise;
      this._updatePromise = null;
    }
  }

  /**
   * Returns true if captureCallStart() has completed AND no output
   * device update is in flight.
   */
  isCaptureComplete(): boolean {
    return this._capturePromise === null && this._updatePromise === null;
  }

  /**
   * Update the selected output device after setSinkId completes.
   * Called from the deferred setTimeout in BaseCall when the actual
   * applied sink ID becomes known, or from Call#setAudioOutDevice()
   * on mid-call device changes.
   *
   * If the initial capture hasn't completed yet, this queues the
   * update to be applied after capture finishes.
   *
   * @param deviceId - The output device ID that was successfully applied
   */
  updateOutputDevice(deviceId: string): Promise<void> {
    const promise = this._doUpdateOutputDevice(deviceId);
    this._updatePromise = promise;
    return promise;
  }

  private async _doUpdateOutputDevice(deviceId: string): Promise<void> {
    const newHash = await hashValue(deviceId);

    // If capture hasn't completed, wait for it so we can
    // update the selected event properly.
    if (this._capturePromise) {
      await this._capturePromise;
      this._capturePromise = null;
    }

    // If cleaned up after await, skip
    if (this._cleanedUp) {
      this._updatePromise = null;
      return;
    }

    // Update the stored hash
    this._selectedOutputDeviceIdHash = newHash;

    // Update the existing selected_media_devices_call_start event
    // so the final report reflects the actual applied output device.
    const selectedEvent = this._events.find(
      (e) => e.eventName === 'selected_media_devices_call_start'
    ) as ISelectedMediaDevicesCallStart | undefined;

    if (selectedEvent && this._latestSnapshot) {
      const stillAvailable = this._latestSnapshot.audiooutput.some(
        (d) => d.deviceIdHash === newHash
      );
      selectedEvent.selected.output = {
        deviceIdHash: newHash,
        stillAvailable,
      };
    }

    this._updatePromise = null;
  }

  /**
   * Stop listening for devicechange events.
   * Called when the call ends. No new devicechange events will be processed.
   *
   * Important: this does NOT suppress the initial call-start snapshot
   * or selected-device events. If captureCallStart() is in flight when
   * stop() is called, the capture will still complete and emit those
   * events — they are required data for the call report.
   */
  stop(): void {
    this._listenersStopped = true;
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
   * Clean up all resources after the call report has been posted.
   * After cleanup, no further operations are possible.
   */
  cleanup(): void {
    this._listenersStopped = true;
    this._cleanedUp = true;
    this._removeDeviceChangeListener();
    this._events = [];
    this._capturePromise = null;
    this._updatePromise = null;
    this._callStartSnapshot = null;
    this._latestSnapshot = null;
    this._selectedInputDeviceIdHash = null;
    this._selectedOutputDeviceIdHash = null;
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
   * Uses the already-hashed stored values for consistency with
   * devicechange availability checks.
   */
  private _buildSelectedEvent(
    snapshot: IDeviceSnapshot
  ): ISelectedMediaDevicesCallStart {
    const selected: ISelectedDevices = {
      input: null,
      output: null,
    };

    if (this._selectedInputDeviceIdHash) {
      const stillAvailable = snapshot.audioinput.some(
        (d) => d.deviceIdHash === this._selectedInputDeviceIdHash
      );
      selected.input = {
        deviceIdHash: this._selectedInputDeviceIdHash,
        stillAvailable,
      };
    }

    if (this._selectedOutputDeviceIdHash) {
      // 'browser-default' is a sentinel, not a real hash
      const isSentinel =
        this._selectedOutputDeviceIdHash === 'browser-default' ||
        this._selectedOutputDeviceIdHash === 'unknown';
      const stillAvailable = isSentinel
        ? true
        : snapshot.audiooutput.some(
            (d) => d.deviceIdHash === this._selectedOutputDeviceIdHash
          );
      selected.output = {
        deviceIdHash: this._selectedOutputDeviceIdHash,
        stillAvailable,
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
    if (this._listenersStopped || this._cleanedUp) return;

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

      // Check if selected devices are still available using stored hashes
      const selectedInputStillAvailable =
        this._checkSelectedInputAvailable(newSnapshot);
      const selectedOutputStillAvailable =
        this._checkSelectedOutputAvailable(newSnapshot);

      // Only emit if not stopped/cleaned up during async gap
      if (this._listenersStopped || this._cleanedUp) return;

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
   * Check if the selected input device is still available in the snapshot.
   * Compares the stored hash against hashed snapshot IDs.
   */
  private _checkSelectedInputAvailable(
    currentSnapshot: IDeviceSnapshot
  ): boolean {
    if (!this._selectedInputDeviceIdHash) {
      // No selected input device → not applicable
      return true;
    }
    return currentSnapshot.audioinput.some(
      (d) => d.deviceIdHash === this._selectedInputDeviceIdHash
    );
  }

  /**
   * Check if the selected output device is still available in the snapshot.
   * Compares the stored hash against hashed snapshot IDs.
   * Handles sentinel values 'browser-default' / 'unknown'.
   */
  private _checkSelectedOutputAvailable(
    currentSnapshot: IDeviceSnapshot
  ): boolean {
    if (!this._selectedOutputDeviceIdHash) {
      return true;
    }

    // Sentinel values are always conceptually available
    if (
      this._selectedOutputDeviceIdHash === 'browser-default' ||
      this._selectedOutputDeviceIdHash === 'unknown'
    ) {
      return true;
    }

    return currentSnapshot.audiooutput.some(
      (d) => d.deviceIdHash === this._selectedOutputDeviceIdHash
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
