/**
 * MediaDeviceCollector
 *
 * Captures media-device visibility information for WebRTC call reports.
 * When a customer reports "agent could not hear audio" but inbound RTP/audio
 * stats are healthy, we need to know which devices existed and changed around
 * the call.
 *
 * Events produced:
 *  - media_devices_snapshot_call_start  – device list + selected devices at call start
 *  - media_devices_changed_during_call  – connected/disconnected devices on devicechange
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

/** Event: media_devices_snapshot_call_start */
export interface IMediaDevicesSnapshotCallStart {
  eventName: 'media_devices_snapshot_call_start';
  timestamp: string;
  inputDevices: IRedactedDeviceInfo[];
  outputDevices: IRedactedDeviceInfo[];
  selectedInputDevice: IRedactedDeviceInfo | null;
  selectedOutputDevice: IRedactedDeviceInfo | null;
}

/** Event: media_devices_changed_during_call */
export interface IMediaDevicesChangedDuringCall {
  eventName: 'media_devices_changed_during_call';
  timestamp: string;
  newConnectedDevices: IRedactedDeviceInfo[];
  newDisconnectedDevices: IRedactedDeviceInfo[];
}

export type MediaDeviceEvent =
  | IMediaDevicesSnapshotCallStart
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
   * Hash of the selected input device ID.
   */
  private _selectedInputDeviceIdHash: string | null = null;
  /**
   * Hash of the selected output device ID.
   * Special sentinel values: 'browser-default' | 'unknown'
   */
  private _selectedOutputDeviceIdHash: string | null = null;
  /**
   * Raw device ID of the selected input, stored for debug logging
   * when the device is disconnected.
   */
  private _selectedInputDeviceRawId: string | null = null;
  /**
   * Raw device ID of the selected output, stored for debug logging
   * when the device is disconnected.
   */
  private _selectedOutputDeviceRawId: string | null = null;
  private _latestSnapshot: IRedactedDeviceInfo[] | null = null;
  /** Cache of raw MediaDeviceInfo from last enumerateDevices call. Used for devicechange diff logging. */
  private _rawDeviceCache: MediaDeviceInfo[] = [];
  private _deviceChangeHandler: (() => void) | null = null;

  /**
   * When true, no new devicechange events will be processed.
   */
  private _listenersStopped: boolean = false;

  /**
   * Promise tracking the in-flight captureCallStart() call.
   */
  private _capturePromise: Promise<void> | null = null;

  /**
   * Whether cleanup() has been called.
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
   * @param peerConnection - The RTCPeerConnection for the call
   * @param outputDeviceId - The output device ID that was *actually applied*
   *   via setSinkId. Pass null/undefined if setSinkId was not called or failed.
   */
  captureCallStart(
    peerConnection: RTCPeerConnection,
    outputDeviceId?: string | null
  ): Promise<void> {
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
    if (this._cleanedUp) return;

    try {
      // 1. Enumerate all devices
      const rawDevices = await this._enumerateDevices();
      const redacted = await this._redactDeviceList(rawDevices);

      // 2. Determine selected input device from the audio sender track
      const inputDeviceId = this._getInputDeviceId(peerConnection);

      // 3. Find the redacted entry for the selected input device
      let selectedInputDevice: IRedactedDeviceInfo | null = null;
      if (inputDeviceId) {
        this._selectedInputDeviceRawId = inputDeviceId;
        this._selectedInputDeviceIdHash = await hashValue(inputDeviceId);
        selectedInputDevice =
          redacted.find(
            (d) =>
              d.kind === 'audioinput' &&
              d.deviceIdHash === this._selectedInputDeviceIdHash
          ) ?? null;
      }

      // 4. Determine selected output device
      let selectedOutputDevice: IRedactedDeviceInfo | null = null;
      if (outputDeviceId) {
        this._selectedOutputDeviceRawId = outputDeviceId;
        this._selectedOutputDeviceIdHash = await hashValue(outputDeviceId);
        selectedOutputDevice =
          redacted.find(
            (d) =>
              d.kind === 'audiooutput' &&
              d.deviceIdHash === this._selectedOutputDeviceIdHash
          ) ?? null;
      } else {
        this._selectedOutputDeviceRawId = null;
        this._selectedOutputDeviceIdHash = 'browser-default';
        // 'browser-default' is a sentinel — no matching device entry
      }

      if (this._cleanedUp) return;

      const inputDevices = redacted.filter((d) => d.kind === 'audioinput');
      const outputDevices = redacted.filter((d) => d.kind === 'audiooutput');

      // 5. Emit single call-start event with devices + selected
      const snapshotEvent: IMediaDevicesSnapshotCallStart = {
        eventName: 'media_devices_snapshot_call_start',
        timestamp: new Date().toISOString(),
        inputDevices,
        outputDevices,
        selectedInputDevice,
        selectedOutputDevice,
      };
      this._events.push(snapshotEvent);

      // 6. Store for devicechange diffing
      this._latestSnapshot = redacted;

      // 7. Start listening for devicechange events
      if (!this._listenersStopped && !this._cleanedUp) {
        this._startDeviceChangeListener();
      }

      this._capturePromise = null;

      // Cache raw devices for devicechange diff logging
      this._rawDeviceCache = rawDevices.filter(
        (d) => d.kind === 'audioinput' || d.kind === 'audiooutput'
      );

      // Log all devices at call start (debug level, raw fields)
      logger.debug('MediaDeviceCollector: media devices at call start', {
        devices: this._rawDeviceCache.map((d) => ({
          deviceId: d.deviceId,
          groupId: d.groupId,
          kind: d.kind,
          label: d.label,
        })),
      });
    } catch (error) {
      logger.error(
        'MediaDeviceCollector: failed to capture call-start snapshot',
        { error }
      );
    }
  }

  /**
   * Await the in-flight captureCallStart() promise before posting a report.
   */
  async ensureCaptureComplete(): Promise<void> {
    if (this._capturePromise) {
      await this._capturePromise;
      this._capturePromise = null;
    }
  }

  /**
   * Returns true if captureCallStart() has completed.
   */
  isCaptureComplete(): boolean {
    return this._capturePromise === null;
  }

  /**
   * Update the selected output device after setSinkId completes.
   *
   * @param deviceId - The output device ID that was successfully applied
   */
  updateOutputDevice(deviceId: string): Promise<void> {
    // Just store the hash for future devicechange diffing.
    // No event mutation needed — the call-start snapshot is immutable.
    const promise = this._doUpdateOutputDevice(deviceId);
    this._capturePromise = this._capturePromise || promise;
    return promise;
  }

  private async _doUpdateOutputDevice(deviceId: string): Promise<void> {
    // If capture hasn't completed, wait for it
    if (this._capturePromise) {
      await this._capturePromise;
      this._capturePromise = null;
    }

    if (this._cleanedUp) return;

    this._selectedOutputDeviceRawId = deviceId;
    this._selectedOutputDeviceIdHash = await hashValue(deviceId);

    // Update the call-start event's selectedOutputDevice if found
    const snapshotEvent = this._events.find(
      (e) => e.eventName === 'media_devices_snapshot_call_start'
    ) as IMediaDevicesSnapshotCallStart | undefined;

    if (snapshotEvent && this._latestSnapshot) {
      snapshotEvent.selectedOutputDevice =
        this._latestSnapshot.find(
          (d) =>
            d.kind === 'audiooutput' &&
            d.deviceIdHash === this._selectedOutputDeviceIdHash
        ) ?? null;
    }
  }

  /**
   * Stop listening for devicechange events.
   */
  stop(): void {
    this._listenersStopped = true;
    this._removeDeviceChangeListener();
  }

  /**
   * Get all collected events.
   */
  getEvents(): MediaDeviceEvent[] {
    return this._events;
  }

  /**
   * Drain all collected events and reset the internal array.
   */
  drainEvents(): MediaDeviceEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }

  /**
   * Clean up all resources after the call report has been posted.
   */
  cleanup(): void {
    this._listenersStopped = true;
    this._cleanedUp = true;
    this._removeDeviceChangeListener();
    this._events = [];
    this._capturePromise = null;
    this._latestSnapshot = null;
    this._selectedInputDeviceIdHash = null;
    this._selectedOutputDeviceIdHash = null;
    this._selectedInputDeviceRawId = null;
    this._selectedOutputDeviceRawId = null;
    this._rawDeviceCache = [];
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
  ): Promise<IRedactedDeviceInfo[]> {
    const result: IRedactedDeviceInfo[] = [];

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

      result.push(entry);
    }

    return result;
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
   * Handle a devicechange event: enumerate current devices, diff against
   * the previous snapshot, and emit a change event.
   */
  private async _onDeviceChange(): Promise<void> {
    if (this._listenersStopped || this._cleanedUp) return;

    try {
      const rawDevices = await this._enumerateDevices();
      const newRedacted = await this._redactDeviceList(rawDevices);
      const previous = this._latestSnapshot;

      if (!previous) {
        this._latestSnapshot = newRedacted;
        this._rawDeviceCache = rawDevices.filter(
          (d) => d.kind === 'audioinput' || d.kind === 'audiooutput'
        );
        return;
      }

      // Compute connected (in new but not in previous) and disconnected (in previous but not in new)
      const prevIds = new Set(previous.map((d) => d.deviceIdHash));
      const currIds = new Set(newRedacted.map((d) => d.deviceIdHash));

      const newConnectedDevices: IRedactedDeviceInfo[] = newRedacted.filter(
        (d) => !prevIds.has(d.deviceIdHash)
      );

      const newDisconnectedDevices: IRedactedDeviceInfo[] = previous.filter(
        (d) => !currIds.has(d.deviceIdHash)
      );

      if (this._listenersStopped || this._cleanedUp) return;

      // Debug log when selected device is disconnected
      for (const device of newDisconnectedDevices) {
        const isSelectedInput =
          this._selectedInputDeviceIdHash &&
          device.kind === 'audioinput' &&
          device.deviceIdHash === this._selectedInputDeviceIdHash;
        const isSelectedOutput =
          this._selectedOutputDeviceIdHash &&
          this._selectedOutputDeviceIdHash !== 'browser-default' &&
          this._selectedOutputDeviceIdHash !== 'unknown' &&
          device.kind === 'audiooutput' &&
          device.deviceIdHash === this._selectedOutputDeviceIdHash;
        if (isSelectedInput || isSelectedOutput) {
          logger.debug('Selected input/output device was disconnected', {
            device,
          });
        }
      }

      const changeEvent: IMediaDevicesChangedDuringCall = {
        eventName: 'media_devices_changed_during_call',
        timestamp: new Date().toISOString(),
        newConnectedDevices,
        newDisconnectedDevices,
      };

      this._events.push(changeEvent);
      this._latestSnapshot = newRedacted;

      // Diff raw devices against cache for logging
      const audioDevices = rawDevices.filter(
        (d) => d.kind === 'audioinput' || d.kind === 'audiooutput'
      );
      const cachedIds = new Set(this._rawDeviceCache.map((d) => d.deviceId));
      const currentIds = new Set(audioDevices.map((d) => d.deviceId));

      const connectedRaw = audioDevices.filter(
        (d) => !cachedIds.has(d.deviceId)
      );
      const disconnectedRaw = this._rawDeviceCache.filter(
        (d) => !currentIds.has(d.deviceId)
      );

      // Log only changed devices (debug level, raw fields)
      if (connectedRaw.length > 0 || disconnectedRaw.length > 0) {
        logger.debug(
          'MediaDeviceCollector: media devices changed during call',
          {
            connected: connectedRaw.map((d) => ({
              deviceId: d.deviceId,
              groupId: d.groupId,
              kind: d.kind,
              label: d.label,
            })),
            disconnected: disconnectedRaw.map((d) => ({
              deviceId: d.deviceId,
              groupId: d.groupId,
              kind: d.kind,
              label: d.label,
            })),
          }
        );
      }

      // Update raw device cache
      this._rawDeviceCache = audioDevices;
    } catch (error) {
      logger.error('MediaDeviceCollector: error handling devicechange', {
        error,
      });
    }
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
  _setLatestSnapshot(snapshot: IRedactedDeviceInfo[]): void {
    this._latestSnapshot = snapshot;
  }
}
