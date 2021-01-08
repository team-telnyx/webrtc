import logger from '../util/logger';
import BaseCall from './BaseCall';
import { CallOptions } from './interfaces';
import { getDisplayMedia, setMediaElementSinkId } from '../util/webrtc';

/**
 * A `Call` is the representation of an audio or video call between
 * two browsers, SIP clients or phone numbers. The `call` object is
 * created whenever a new call is initiated, either by you or the
 * remote caller. You can access and act upon calls initiated by
 * a remote caller in a `telnyx.notification` event handler.
 *
 * @examples
 *
 * To create a new call, i.e. dial:
 *
 * ```js
 * const call = client.newCall({
 *   // Destination is required and can be a phone number or SIP URI
 *   destinationNumber: '18004377950',
 *   callerNumber: '‬155531234567',
 * });
 * ```
 *
 * To answer an incoming call:
 *
 * ```js
 * client.on('telnyx.notification', (notification) => {
 *   const call = notification.call;
 *
 *   if (notification.type === 'callUpdate' && call.state === 'ringing') {
 *     call.answer();
 *   }
 * });
 * ```
 *
 * Both the outgoing and incoming call has methods that can be hooked up to your UI.
 *
 * ```js
 * // Hangup or reject an incoming call
 * call.hangup();
 *
 * // Send digits and keypresses
 * call.dtmf('1234');
 *
 * // Call states that can be toggled
 * call.hold();
 * call.muteAudio();
 * ```
 *
 * @category Call
 */
export default class Call extends BaseCall {
  public screenShare: Call;

  private _statsInterval: any = null;

  hangup(params: any = {}, execute: boolean = true) {
    if (this.screenShare instanceof Call) {
      this.screenShare.hangup(params, execute);
    }
    super.hangup(params, execute);
  }

  async startScreenShare(opts?: CallOptions) {
    const displayStream: MediaStream = await getDisplayMedia({ video: true });
    displayStream.getTracks().forEach((t) => {
      t.addEventListener('ended', () => {
        if (this.screenShare) {
          this.screenShare.hangup();
        }
      });
    });
    const {
      remoteCallerName,
      remoteCallerNumber,
      callerName,
      callerNumber,
    } = this.options;
    const options: CallOptions = {
      screenShare: true,
      localStream: displayStream,
      destinationNumber: `${this.extension}-screen`,
      remoteCallerName,
      remoteCallerNumber: `${remoteCallerNumber}-screen`,
      callerName: `${callerName} (Screen)`,
      callerNumber: `${callerNumber} (Screen)`,
      ...opts,
    };
    this.screenShare = new Call(this.session, options);
    this.screenShare.invite();
    return this.screenShare;
  }

  stopScreenShare() {
    if (this.screenShare instanceof Call) {
      this.screenShare.hangup();
    }
  }

  /**
   * Changes the audio output device (i.e. speaker) used for the call.
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * await call.setAudioOutDevice('abc123')
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * call.setAudioOutDevice('abc123').then(() => {
   *   // Do something using new audio output device
   * });
   * ```
   *
   * Usage with `.getAudioOutDevices`:
   *
   * ```js
   * let result = await client.getAudioOutDevices();
   *
   * if (result.length) {
   *   await call.setAudioOutDevice(result[1].deviceId);
   * }
   * ```
   *
   * @param deviceId The target audio output device ID
   * @returns Promise that returns a boolean
   */
  async setAudioOutDevice(deviceId: string): Promise<boolean> {
    this.options.speakerId = deviceId;
    const { remoteElement, speakerId } = this.options;
    if (remoteElement && speakerId) {
      return setMediaElementSinkId(remoteElement, speakerId);
    }
    return false;
  }

  protected _finalize() {
    this._stats(false);

    super._finalize();
  }

  private _stats(what: boolean = true) {
    if (what === false) {
      return clearInterval(this._statsInterval);
    }
    logger.setLevel(2);
    this._statsInterval = window.setInterval(async () => {
      const stats = await this.peer.instance.getStats(null);
      let statsOutput: string = '';
      const invalidReport = [
        'certificate',
        'codec',
        'peer-connection',
        'stream',
        'local-candidate',
        'remote-candidate',
      ];
      const invalidStat = ['id', 'type', 'timestamp'];
      stats.forEach((report) => {
        if (invalidReport.includes(report.type)) {
          return;
        }
        statsOutput += `\n${report.type}\n`;
        Object.keys(report).forEach((statName) => {
          if (!invalidStat.includes(statName)) {
            statsOutput += `\t${statName}: ${report[statName]}\n`;
          }
        });
      });
      logger.info(statsOutput);
    }, 2000);
  }
}
