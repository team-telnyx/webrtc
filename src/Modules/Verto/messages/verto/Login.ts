import BaseRequest from './BaseRequest'

class Login extends BaseRequest {
  method: string = 'login'

  constructor(login: string, passwd: string, sessionid: string, userVariables: Object = {}) {
    super()

    // TODO: handle loginParams && userVariables
    const params: any = { login, passwd, userVariables, loginParams: {} }
    if (sessionid) {
      params.sessid = sessionid
    }
    this.buildRequest({ method: this.method, params })
  }
}

export { Login }
