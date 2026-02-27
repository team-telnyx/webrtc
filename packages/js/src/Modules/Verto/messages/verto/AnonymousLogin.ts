import BaseRequest from './BaseRequest';
import pkg from '../../../../../package.json';

type AnonymousLoginConstructorParams = {
  target_id: string;
  target_type: string;
  target_version_id?: string;
  target_params?: Record<string, unknown>;
  sessionId?: string;
  userVariables?: Record<string, any>;
  reconnection?: boolean;
};

class AnonymousLogin extends BaseRequest {
  method: string = 'anonymous_login';

  constructor(payload: AnonymousLoginConstructorParams) {
    super();

    const {
      target_type,
      target_id,
      target_version_id,
      target_params,
      userVariables,
      sessionId,
      reconnection,
    } = payload;

    const params: any = {
      target_type,
      target_id,
      userVariables,
      reconnection,
      'User-Agent': {
        sdkVersion: pkg.version,
        data: navigator.userAgent,
      },
    };

    if (sessionId) {
      params.sessid = sessionId;
    }

    if (target_version_id) {
      params.target_version_id = target_version_id;
    }

    if (target_params) {
      params.target_params = target_params;
    }

    this.buildRequest({ method: this.method, params });
  }
}

export { AnonymousLogin };
