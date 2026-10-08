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
    reconnection: boolean,
    earlySdpAnswer: boolean = false,
    sdkInstanceId?: string
  ) {
    super();

    const params: any = {
      login,
      passwd,
      login_token,
      userVariables,
      reconnection,
      loginParams: { early_sdp_answer: earlySdpAnswer },
      'User-Agent': {
        sdkVersion: pkg.version,
        data: navigator.userAgent,
      },
    };
    if (sessionid) {
      params.sessid = sessionid;
    }
    // Call Report V2: joins the signaling VSP's vsp_session record to this SDK instance.
    if (sdkInstanceId) {
      params.sdk_instance_id = sdkInstanceId;
    }
    this.buildRequest({ method: this.method, params });
  }
}

export { Login };
