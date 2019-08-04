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
  hold(): void;
  unhold(): void;
  mute(): void;
  unmute(): void;
  dtmf(text: string): void;
  transfer(destination: string): void;
  setAudioOutDevice(sinkId: string, callback?: Function): Promise<undefined>;
}
