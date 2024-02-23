import BaseRequest from './BaseRequest';

class Login extends BaseRequest {
  method: string = 'login';

  constructor(
    login: string,
    passwd: string,
    login_token: string,
    sessionid: string,
    userVariables: Object = {}
  ) {
    super();

    // TODO: handle loginParams && userVariables
    const params: any = {
      login,
      passwd,
      login_token,
      userVariables,
      loginParams: {},
      'User-Agent': window.navigator.userAgent,
    };
    if (sessionid) {
      params.sessid = sessionid;
    }
    this.buildRequest({ method: this.method, params });
  }
}

export { Login };
