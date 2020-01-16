import { TelnyxRTCCallState } from '../TelnyxRTC/Enum';

/**
 * @hidden
 * @TODO Remove once TelnyxRTC is converted to TypeScript.
 */
export default interface ITelnyxRTCCall {
  state: TelnyxRTCCallState;

  getMute(): Boolean;
  hangup(): void;
  answer(): void;
  hold(): void;
  unhold(): void;
  mute(): void;
  unmute(): void;
  dtmf(text: string): void;
  transfer(destination: string): void;
  setAudioOutDevice(sinkId: string, callback?: Function): Promise<undefined>;
}
