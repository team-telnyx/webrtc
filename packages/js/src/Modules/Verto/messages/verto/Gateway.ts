import { VertoMethod } from '../../webrtc/constants';
import BaseRequest from './BaseRequest';

class Gateway extends BaseRequest {
  method: string = VertoMethod.GatewayState;

  constructor(voice_sdk_id?: string | null) {
    super();

    const params: any = {};

    this.buildRequest({ method: this.method, voice_sdk_id, params });
  }
}

export { Gateway };
