import { VertoMethod } from '../../webrtc/constants';
import BaseRequest from './BaseRequest';

class Gateway extends BaseRequest {
  method: string = VertoMethod.GatewayState;

  constructor() {
    super();

    const params: any = {};

    this.buildRequest({ method: this.method, params });
  }
}

export { Gateway };
