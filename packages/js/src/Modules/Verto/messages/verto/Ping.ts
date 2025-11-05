import { VertoMethod } from '../../webrtc/constants';
import BaseRequest from './BaseRequest';

class Ping extends BaseRequest {
  method: string = VertoMethod.Ping;

  constructor(voice_sdk_id?: string | null) {
    super();

    const params: any = {};

    this.buildRequest({ method: this.method, voice_sdk_id, params });
  }
}

export { Ping };
