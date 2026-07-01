import { ConversationMessage } from '../messages/verto/ConverstationMessage';
import { AIConversationMessage } from '../messages/verto/AIConversationMessage';
import logger from '../util/logger';
import { getDisplayMedia, setMediaElementSinkId } from '../util/webrtc';
import BaseCall from './BaseCall';
import { IVertoCallOptions } from './interfaces';
import type { FunctionCallOutputItem } from './AIConversationTypes';

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
export class Call extends BaseCall {
  public screenShare: Call;

  private _statsInterval: any = null;

  async hangup(params: any = {}, execute: boolean = true): Promise<void> {
    if (this.screenShare instanceof Call) {
      await this.screenShare.hangup(params, execute);
    }
    await super.hangup(params, execute);
  }

  /**
   * @deprecated
   * @private
   */
  async startScreenShare(opts?: IVertoCallOptions) {
    const displayStream: MediaStream = await getDisplayMedia({ video: true });
    displayStream.getTracks().forEach((t) => {
      t.addEventListener('ended', async () => {
        if (this.screenShare) {
          await this.screenShare.hangup({
            initiator: 'sdk:screenshare-track-ended',
          });
        }
      });
    });
    const { remoteCallerName, remoteCallerNumber, callerName, callerNumber } =
      this.options;
    const options: IVertoCallOptions = {
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

  /**
   * @deprecated
   * @private
   */
  async stopScreenShare() {
    if (this.screenShare instanceof Call) {
      await this.screenShare.hangup({ initiator: 'app:stopScreenShare' });
    }
  }

  sendConversationMessage = (message: string, attachments?: string[]) => {
    return this.session.execute(new ConversationMessage(message, attachments));
  };

  /**
   * Sends an AI conversation message (e.g. a `function_call_output`) over
   * the active VSP WebSocket session.
   *
   * Use this to return the result of a client-side tool execution back to
   * the AI backend after receiving a `function_call` via the
   * `telnyx.ai.conversation` event.
   *
   * This is a fire-and-forget JSON-RPC notification (no `id`): the backend
   * is not expected to ack each tool result, and the SDK does not wait for
   * a response or register a one-shot handler.
   *
   * **Requires an active WebSocket connection.** Throws if the session is
   * disconnected — callers must handle the disconnect immediately rather
   * than having the output silently queued for a future reconnect (which
   * could deliver stale results after ACA has timed out the waiter).
   *
   * @param item - The function call output item to send.
   * Must include `type: "function_call_output"`, the matching `call_id`,
   * and the `output` string.
   *
   * @throws {Error} If the session is not connected.
   *
   * @example
   * ```js
   * client.on('telnyx.ai.conversation', (event) => {
   *   if (event.params.type === 'conversation.item.created' &&
   *       event.params.item?.type === 'function_call') {
   *     const { call_id, name, arguments: argsJson } = event.params.item;
   *     // Execute the tool...
   *     call.sendAIConversationMessage({
   *       type: 'function_call_output',
   *       call_id,
   *       output: JSON.stringify({ status: 'found' }),
   *     });
   *   }
   * });
   * ```
   */
  sendAIConversationMessage = (item: FunctionCallOutputItem) => {
    if (!this.session.connected) {
      throw new Error(
        'Cannot send AI conversation message: session is not connected. ' +
          'sendAIConversationMessage requires an active WebSocket connection.'
      );
    }
    const msg = new AIConversationMessage(item);
    this.session.connection.sendRawText(JSON.stringify(msg.request));
  };
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
export default Call;
