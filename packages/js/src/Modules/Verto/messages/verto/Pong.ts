import { VertoMethod } from '../../webrtc/constants';
import BaseRequest from './BaseRequest';

class Pong extends BaseRequest {
  method: string = VertoMethod.Pong;

  constructor() {
    super();

    const params: any = {};

    this.buildRequest({ method: this.method, params });
  }
}

export { Pong };
