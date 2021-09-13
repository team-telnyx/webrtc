import { VertoMethod } from '../../webrtc/constants';
import BaseRequest from './BaseRequest';

class Gateway extends BaseRequest {
  method: string = VertoMethod.GatewayState;

  constructor() {
    super();

    const params: any = {
      method: VertoMethod.GatewayState,
      jsonrpc: '2.0',
      params: {},
    };

    this.buildRequest({ method: this.method, params });
  }
}

export { Gateway };
