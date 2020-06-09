import TelnyxRTC from '../TelnyxRTC';
import { setAgentName } from '../Modules/Verto/messages/blade/Connect'

export const VERSION = '1.0.3'
setAgentName(`ReactNative SDK/${VERSION}`)

export {
  TelnyxRTC
}

export * from '../Modules/Verto/util/interfaces'
export * from '../Modules/Verto/webrtc/interfaces'