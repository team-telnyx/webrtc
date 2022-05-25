import { VertoMethod } from '../../webrtc/constants';
import BaseRequest from './BaseRequest';

class Ping extends BaseRequest {
  method: string = VertoMethod.Ping;

  constructor() {
    super();

    const params: any = {};

    this.buildRequest({ method: this.method, params });
  }
}

export { Ping };
