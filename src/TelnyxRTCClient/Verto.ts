import BrowserSession from '../Modules/Verto/BrowserSession'
import { SubscribeParams, BroadcastParams } from '../Modules/Verto/util/interfaces'
import { CallOptions } from '../Modules/Verto/webrtc/interfaces'
import { Login } from '../Modules/Verto/messages/Verto'
import Call from '../Modules/Verto/webrtc/Call'
import { SwEvent, SESSION_ID } from '../Modules/Verto/util/constants'
import { trigger } from '../Modules/Verto/services/Handler'
import { localStorage } from '../Modules/Verto/util/storage/'
import VertoHandler from '../Modules/Verto/webrtc/VertoHandler'

export const VERTO_PROTOCOL = 'verto-protocol'
export default class Verto extends BrowserSession {

  public relayProtocol: string = VERTO_PROTOCOL
  public timeoutErrorCode = -329990 // fake verto timeout error code.

  validateOptions() {
    const { host, login, passwd, password } = this.options
    return Boolean(host) && Boolean(login && (passwd || password))
  }

  newCall(options: CallOptions) {
    const { destinationNumber = null } = options
    if (!destinationNumber) {
      throw new Error('Verto.newCall() error: destinationNumber is required.')
    }
    const call = new Call(this, options)
    call.invite()
    return call
  }

  broadcast(params: BroadcastParams) {
    return this.vertoBroadcast(params)
  }

  subscribe(params: SubscribeParams) {
    return this.vertoSubscribe(params)
  }

  unsubscribe(params: SubscribeParams) {
    return this.vertoUnsubscribe(params)
  }

  protected async _onSocketOpen() {
    this._idle = false
    const { login, password, passwd, userVariables } = this.options
    if (this.sessionid) {
      const sessidLogin = new Login(undefined, undefined, this.sessionid, undefined)
      await this.execute(sessidLogin).catch(console.error)
    }
    const msg = new Login(login, (password || passwd), this.sessionid, userVariables)
    const response = await this.execute(msg).catch(this._handleLoginError)
    if (response) {
      this._autoReconnect = true
      this.sessionid = response.sessid
      localStorage.setItem(SESSION_ID, this.sessionid)
      trigger(SwEvent.Ready, this, this.uuid)
    }
  }

  protected _onSocketMessage(msg: any) {
    const handler = new VertoHandler(this)
    handler.handleMessage(msg)
  }
}
