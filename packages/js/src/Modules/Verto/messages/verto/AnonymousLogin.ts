import BaseRequest from './BaseRequest';
import pkg from '../../../../../package.json';

class AnonymousLogin extends BaseRequest {
  method: string = 'anonymous_login';

  constructor(
    targetType: string,
    targetId: string,
    sessionid: string,
    userVariables: Object = {},
    reconnection: boolean
  ) {
    super();

    const params: any = {
      target_type: targetType,
      target_id: targetId,
      userVariables,
      reconnection,
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

export { AnonymousLogin };
