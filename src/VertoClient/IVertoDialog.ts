import { VertoCallState } from '../Verto/Enum';

/**
 * @hidden
 * @TODO Remove once Verto is converted to TypeScript.
 */
export default interface IVertoCall {
  state: VertoCallState;

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
