import TelnyxRTC from "../../js/src/TelnyxRTC";
import { setAgentName } from "../../js/src/Modules/Verto/messages/blade/Connect";

export const VERSION = "1.0.7";
setAgentName(`ReactNative SDK/${VERSION}`);

export { TelnyxRTC };

export * from "../../js/src/Modules/Verto/util/interfaces";
export * from "../../js/src/Modules/Verto/webrtc/interfaces";
