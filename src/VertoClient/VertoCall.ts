import { CallState } from '../utils/types';
import { ICall } from '../utils/interfaces';
import IVertoDialog from './IVertoDialog';
import { VertoCallState } from '../Verto/Enum';

/**
 * @hidden
 */
export default class VertoCall implements ICall {
  constructor(private call: IVertoDialog) {}

  get state(): CallState {
    switch (this.call.state) {
      case VertoCallState.requesting:
      case VertoCallState.recovering:
      case VertoCallState.trying:
      case VertoCallState.early:
        return 'connecting';
      case VertoCallState.active:
        return 'active';
      case VertoCallState.held:
        return 'held';
      case VertoCallState.hangup:
      case VertoCallState.destroy:
        return 'done';
      case VertoCallState.answering:
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
