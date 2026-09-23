import { findElementByType } from '../util/helpers';
import logger from '../util/logger';
import { IWebRTCCall } from './interfaces';

type AudioKind = 'audioinput' | 'audiooutput';
type SinkElement = HTMLMediaElement & {
  sinkId?: string;
  setSinkId?: (id: string) => Promise<void>;
};
type Binding = {
  owner: MediaStreamTrack | SinkElement;
  id: string;
  physicalId: string;
  attempted: boolean;
};
const isAlias = (id: string) =>
  !id || id === 'default' || id === 'communications';

/** Logs call-local audio inventories and recovers only proven device removals. */
export class MediaDeviceCollector {
  private _rawDeviceCache: MediaDeviceInfo[] = [];
  private _deviceChangeHandler: (() => void) | null = null;
  private _stopped = false;
  private _running = false;
  private _pending = false;
  private _input?: Binding;
  private _output?: Binding;

  constructor(
    private readonly _call: IWebRTCCall,
    private readonly _recoverInput: () => Promise<void>
  ) {}

  /** Start after capture permission. Subscribe before enumeration to avoid gaps. */
  async logDevicesAtStart(): Promise<void> {
    if (this._stopped || this._deviceChangeHandler) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    this._deviceChangeHandler = () => {
      void this._onDeviceChange();
    };
    navigator.mediaDevices.addEventListener?.(
      'devicechange',
      this._deviceChangeHandler
    );
    await this._onDeviceChange();
  }

  stop(): void {
    this._stopped = true;
    if (this._deviceChangeHandler) {
      navigator.mediaDevices?.removeEventListener?.(
        'devicechange',
        this._deviceChangeHandler
      );
      this._deviceChangeHandler = null;
    }
    this._rawDeviceCache = [];
    this._input = this._output = undefined;
  }

  // Browser privacy restrictions can return empty, redacted or alias-only lists.
  // Missing a whole kind is not evidence that all devices of that kind vanished.
  private _usable(devices: MediaDeviceInfo[], kind: AudioKind): boolean {
    const entries = devices.filter((d) => d.kind === kind);
    return (
      entries.some((d) => !isAlias(d.deviceId)) &&
      entries.every((d) => Boolean(d.deviceId && d.label))
    );
  }

  private _bind(
    previous: Binding | undefined,
    owner: Binding['owner'],
    id: string,
    kind: AudioKind,
    groupId?: string
  ): Binding | undefined {
    if (!owner) return undefined;
    // An alias is bound to its original physical device, not today's OS default.
    if (previous?.owner === owner && previous.id === id) return previous;
    // A physical ID from the actual track/sink is evidence even when the
    // device disappeared since a manual switch and is absent from this scan.
    if (!isAlias(id)) {
      return { owner, id, physicalId: id, attempted: false };
    }
    const devices = this._rawDeviceCache.filter((d) => d.kind === kind);
    let physical: MediaDeviceInfo | undefined;
    if (isAlias(id)) {
      const group =
        groupId ||
        devices.find((d) => d.deviceId === (id || 'default'))?.groupId;
      const matches = devices.filter(
        (d) => group && d.groupId === group && !isAlias(d.deviceId)
      );
      if (matches.length === 1) physical = matches[0];
    }
    // Do not infer actual media from requested options or ambiguous aliases.
    return physical
      ? { owner, id, physicalId: physical.deviceId, attempted: false }
      : undefined;
  }

  private _refreshBindings(): void {
    const track = this._call.peer?.instance
      ?.getSenders()
      .find((s) => s.track?.kind === 'audio')?.track;
    try {
      const settings = track?.getSettings?.();
      this._input =
        settings && (settings.deviceId || settings.groupId)
          ? this._bind(
              this._input,
              track,
              settings.deviceId || '',
              'audioinput',
              settings.groupId
            )
          : undefined;
    } catch {
      this._input = undefined;
    }
    const element: SinkElement = findElementByType(
      this._call.options.remoteElement
    );
    this._output =
      element &&
      typeof element.setSinkId === 'function' &&
      typeof element.sinkId === 'string'
        ? this._bind(this._output, element, element.sinkId, 'audiooutput')
        : undefined;
  }

  private _removed(
    binding: Binding | undefined,
    devices: MediaDeviceInfo[],
    kind: AudioKind
  ): boolean {
    return Boolean(
      binding &&
      !binding.attempted &&
      this._usable(devices, kind) &&
      !devices.some((d) => d.kind === kind && d.deviceId === binding.physicalId)
    );
  }

  private async _scan(devices: MediaDeviceInfo[]): Promise<void> {
    const previous = this._rawDeviceCache;
    // Keep the last usable inventory independently for each kind.
    this._rawDeviceCache = (
      ['audioinput', 'audiooutput'] as AudioKind[]
    ).reduce(
      (all, kind) =>
        all.concat(
          (this._usable(devices, kind) ? devices : previous).filter(
            (d) => d.kind === kind
          )
        ),
      [] as MediaDeviceInfo[]
    );
    // Existing bindings retain their physical identity, but a newly acquired
    // alias track must bind against this fresh inventory, never a stale scan.
    this._refreshBindings();
    const input = this._input;
    const output = this._output;
    const recoverInput = this._removed(input, devices, 'audioinput');
    const recoverOutput = this._removed(output, devices, 'audiooutput');
    logger.debug('MediaDeviceCollector: audio devices during call', {
      devices: this._rawDeviceCache,
      disconnected: previous.filter(
        (d) =>
          !this._rawDeviceCache.some(
            (n) => n.kind === d.kind && n.deviceId === d.deviceId
          )
      ),
    });
    // Mark attempts before awaiting. A failed fallback is not retried on every
    // event; only a new actual track/sink establishes a new recovery candidate.
    if (recoverInput) {
      input.attempted = true;
      try {
        await this._recoverInput();
      } catch (error) {
        logger.warn('Audio input disconnect recovery failed', { error });
      }
    }
    // An event during input recovery supersedes this scan's output decision.
    if (this._stopped || this._pending) return;
    this._refreshBindings();
    if (recoverOutput && this._output === output) {
      output.attempted = true;
      try {
        const switched = await this._call.setAudioOutDevice?.('default');
        if (!this._stopped && !switched)
          logger.warn('Audio output disconnect recovery failed');
        if (switched) this._output = undefined;
      } catch (error) {
        logger.warn('Audio output disconnect recovery failed', { error });
      }
    }
    if (!this._stopped && !this._pending) this._refreshBindings();
  }

  private async _onDeviceChange(): Promise<void> {
    if (this._stopped) return;
    this._pending = true;
    if (this._running) return;
    this._running = true;
    try {
      while (this._pending && !this._stopped) {
        this._pending = false;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          // A later event supersedes this enumeration. Never apply stale removals.
          if (this._stopped) return;
          if (this._pending) continue;
          await this._scan(devices);
        } catch (error) {
          logger.debug('MediaDeviceCollector: enumerate/devices failed', {
            error,
          });
        }
      }
    } finally {
      this._running = false;
    }
  }
}
