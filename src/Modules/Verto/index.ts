import BrowserSession from './BrowserSession'
import { SubscribeParams, BroadcastParams, ISignalWireOptions } from './util/interfaces'
import { CallOptions } from './webrtc/interfaces'
import { Login } from './messages/Verto'
import Call from './webrtc/Call'
import { SwEvent, SESSION_ID } from './util/constants'
import { trigger } from './services/Handler'
import { localStorage } from './util/storage'
import VertoHandler from './webrtc/VertoHandler'

export const VERTO_PROTOCOL = 'verto-protocol'
export default class Verto extends BrowserSession {

  public relayProtocol: string = VERTO_PROTOCOL
  public timeoutErrorCode = -329990 // fake verto timeout error code.

  private _STUN_SERVER = { urls: 'stun:stun.telnyx.com:3843' };
  private _TURN_SERVER = {
    urls: 'turn:turn.telnyx.com:3478?transport=tcp',
    username: 'testuser',
    credential: 'testpassword',
  };

  constructor(public options: ISignalWireOptions) {
    super(options);
    this.iceServers = [this._TURN_SERVER, this._STUN_SERVER];
    this.ringFile = options.ringFile;
  }

  validateOptions() {
    const { login, passwd, password } = this.options
    return Boolean(login && (passwd || password))
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
