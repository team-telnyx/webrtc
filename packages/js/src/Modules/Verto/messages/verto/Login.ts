import BaseRequest from './BaseRequest';
import pkg from '../../../../../package.json';

class Login extends BaseRequest {
  method: string = 'login';

  constructor(
    login: string,
    passwd: string,
    login_token: string,
    sessionid: string,
    userVariables: Record<string, any> = {},
    reconnection: boolean
  ) {
    super();

    // TODO: handle loginParams && userVariables
    const params: any = {
      login,
      passwd,
      login_token,
      userVariables,
      reconnection,
      loginParams: {},
      'User-Agent': {
        sdkVersion: pkg.version,
        data: navigator.userAgent,
      },
    };
    if (sessionid) {
      params.sessid = sessionid;
    }
    this.buildRequest({ method: this.method, params });
  }
}

export { Login };
