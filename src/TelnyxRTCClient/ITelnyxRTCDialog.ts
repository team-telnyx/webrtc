import { TelnyxRTCCallState } from '../Modules/TelnyxRTC/Enum';

/**
 * @hidden
 * @TODO Remove once TelnyxRTC is converted to TypeScript.
 */
export default interface ITelnyxRTCCall {
  state: TelnyxRTCCallState;

  getMute(): Boolean;
  hangup(): void;
  answer(): void;
  hold(params?: any): void;
  unhold(params?: any): void;
  mute(): void;
  unmute(): void;
  dtmf(text: string): void;
  transfer(destination: string, params?: any): void;
  setAudioOutDevice(
    sinkId: string,
    callback?: Function,
    arg?: any
  ): Promise<undefined>;
}
