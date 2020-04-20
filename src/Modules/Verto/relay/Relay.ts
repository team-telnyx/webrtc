import BaseSession from '../BaseSession'
import { register } from '../services/Handler'
import Receive from '../services/Receive'

export default abstract class Relay {

  protected abstract service: string

  abstract notificationHandler(notification: any): void

  constructor(public session: BaseSession) {

  }

  async onReceive(contexts: string[], handler: Function) {
    const success = await Receive(this.session, contexts)
    if (success) {
      contexts.forEach(context => register(this.session.relayProtocol, handler, this._ctxReceiveUniqueId(context)))
    }
    return success
  }

  async onStateChange(contexts: string[], handler: Function) {
    const success = await Receive(this.session, contexts)
    if (success) {
      contexts.forEach(context => register(this.session.relayProtocol, handler, this._ctxStateUniqueId(context)))
    }
    return success
  }

  protected _ctxReceiveUniqueId(context: string): string {
    return `${this.service}.ctxReceive.${context}`
  }

  protected _ctxStateUniqueId(context: string): string {
    return `${this.service}.ctxState.${context}`
  }
}
