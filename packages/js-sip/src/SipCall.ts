import { CallState } from "../../js/src/utils/types";
import { ICall } from "../../js/src/utils/interfaces";
import * as SIP from "sip.js";

/**
 * @hidden
 */
export default class SipCall implements ICall {
  constructor(
    private sip: SIP.Web.Simple,
    private session: SIP.InviteClientContext | SIP.InviteServerContext,
    private isIncoming: boolean = false
  ) {}

  get state(): CallState {
    const C = SIP.Web.Simple.C;

    if (this.isIncoming && this.sip.state === C.STATUS_NEW) {
      return "ringing";
    }

    switch (this.sip.state) {
      case C.STATUS_CONNECTING:
        return "connecting";
      case C.STATUS_CONNECTED:
        return "active";
      case C.STATUS_COMPLETED:
        return "done";
      case C.STATUS_NULL:
      case C.STATUS_NEW:
      default:
        return "new";
    }
  }

  hangup() {
    this.session.terminate();
  }

  answer() {
    (this.session as SIP.InviteServerContext).accept();
  }

  reject() {
    (this.session as SIP.InviteServerContext).reject();
  }

  hold() {
    this.session.hold();
  }

  unhold() {
    this.session.unhold();
  }

  mute() {
    this.sip.mute();
  }

  unmute() {
    this.sip.unmute();
  }

  dtmf(input: string) {
    this.session.dtmf(input);
  }

  transfer(input: string) {
    this.session.refer(input);
  }

  setAudioOutDevice(sinkId: string, callback?: Function): Promise<undefined> {
    return Promise.reject();
  }
}
