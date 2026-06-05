/**
 * MediaDeviceCollector
 *
 * Logs media device state for debugging WebRTC audio issues.
 * When a customer reports "agent could not hear audio" but inbound RTP
 * stats are healthy, device logs help identify whether the right
 * mic/speaker was available and whether devices changed mid-call.
 *
 * Behaviour:
 *  - On call start: logs all enumerated audio devices (debug level)
 *  - On devicechange: logs connected/disconnected devices (debug level)
 */

import logger from '../util/logger';

export class MediaDeviceCollector {
  private _rawDeviceCache: MediaDeviceInfo[] = [];
  private _deviceChangeHandler: (() => void) | null = null;
  private _stopped: boolean = false;

  /**
   * Log all audio devices at call start.
   * Should be called after getUserMedia permissions are granted.
   */
  async logDevicesAtStart(): Promise<void> {
    try {
      const devices = await this._enumerateAudioDevices();
      this._rawDeviceCache = devices;

      logger.debug('MediaDeviceCollector: devices at call start', {
        devices: devices.map((d) => ({
          deviceId: d.deviceId,
          groupId: d.groupId,
          kind: d.kind,
          label: d.label,
        })),
      });

      this._startDeviceChangeListener();
    } catch (error) {
      logger.debug('MediaDeviceCollector: failed to log devices at start', {
        error,
      });
    }
  }

  /**
   * Stop listening for device changes.
   */
  stop(): void {
    this._stopped = true;
    this._removeDeviceChangeListener();
  }

  // ── Internal ─────────────────────────────────────────────────────

  private async _enumerateAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.enumerateDevices === 'function'
      ) {
        const all = await navigator.mediaDevices.enumerateDevices();
        return all.filter(
          (d) => d.kind === 'audioinput' || d.kind === 'audiooutput'
        );
      }
    } catch (error) {
      logger.debug('MediaDeviceCollector: enumerateDevices failed', { error });
    }
    return [];
  }

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

  private async _onDeviceChange(): Promise<void> {
    if (this._stopped) return;

    try {
      const currentDevices = await this._enumerateAudioDevices();

      const cachedIds = new Set(this._rawDeviceCache.map((d) => d.deviceId));
      const currentIds = new Set(currentDevices.map((d) => d.deviceId));

      const connected = currentDevices.filter(
        (d) => !cachedIds.has(d.deviceId)
      );
      const disconnected = this._rawDeviceCache.filter(
        (d) => !currentIds.has(d.deviceId)
      );

      if (connected.length > 0 || disconnected.length > 0) {
        logger.debug('MediaDeviceCollector: devices changed during call', {
          connected: connected.map((d) => ({
            deviceId: d.deviceId,
            groupId: d.groupId,
            kind: d.kind,
            label: d.label,
          })),
          disconnected: disconnected.map((d) => ({
            deviceId: d.deviceId,
            groupId: d.groupId,
            kind: d.kind,
            label: d.label,
          })),
        });
      }

      this._rawDeviceCache = currentDevices;
    } catch (error) {
      logger.debug('MediaDeviceCollector: error handling devicechange', {
        error,
      });
    }
  }
}
