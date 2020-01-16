import { CallState } from '../utils/types';
import { ICall } from '../utils/interfaces';
import ITelnyxRTCDialog from './ITelnyxRTCDialog';
import { TelnyxRTCCallState } from '../TelnyxRTC/Enum';

/**
 * @hidden
 */
export default class TelnyxRTCCall implements ICall {
  constructor(private call: ITelnyxRTCDialog) {}

  get state(): CallState {
    switch (this.call.state) {
      case TelnyxRTCCallState.requesting:
      case TelnyxRTCCallState.recovering:
      case TelnyxRTCCallState.trying:
      case TelnyxRTCCallState.early:
        return 'connecting';
      case TelnyxRTCCallState.active:
        return 'active';
      case TelnyxRTCCallState.held:
        return 'held';
      case TelnyxRTCCallState.hangup:
      case TelnyxRTCCallState.destroy:
        return 'done';
      case TelnyxRTCCallState.answering:
        return 'ringing';
      default:
        return 'new';
    }
  }

  get isMuted(): Boolean {
    return this.call.getMute();
  }

  get isHeld(): Boolean {
    return this.state === 'held';
  }

  hangup() {
    this.call.hangup();
  }

  answer() {
    this.call.answer();
  }

  reject() {
    this.call.hangup();
  }

  hold() {
    this.call.hold();
  }

  unhold() {
    this.call.unhold();
  }

  mute() {
    this.call.mute();
  }

  unmute() {
    this.call.unmute();
  }

  dtmf(input: string) {
    this.call.dtmf(input);
  }

  transfer(input: string, params?: any) {
    this.call.transfer(input);
  }

  setAudioOutDevice(sinkId: string, callback?: Function): Promise<undefined> {
    return this.call.setAudioOutDevice(sinkId, callback);
  }
}
