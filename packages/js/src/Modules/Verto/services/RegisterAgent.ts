import BaseSession from '../BaseSession';
import { Gateway } from '../messages/verto/Gateway';
import {
  deferredPromise,
  DeferredPromise,
  getGatewayState,
} from '../util/helpers';
import { getReconnectToken } from '../util/reconnect';
import { GatewayStateType } from '../webrtc/constants';

/**
 * @private
 */
export class RegisterAgent {
  private session: BaseSession;
  private gatewayStateTask: DeferredPromise<GatewayStateType | ''>;
  private pendingRequestId: string | null = null;

  constructor(session: BaseSession) {
    this.session = session;
    this.gatewayStateTask = deferredPromise<GatewayStateType>({});
    this.session.on('telnyx.socket.message', this.onSocketMessage);
  }

  public onSocketMessage = async (response) => {
    if (response.id === this.pendingRequestId) {
      this.gatewayStateTask.resolve(getGatewayState(response));
    }
  };

  public getIsRegistered = async () => {
    const message = new Gateway(getReconnectToken());
    this.pendingRequestId = message.request.id;
    this.gatewayStateTask = deferredPromise<GatewayStateType>({});

    this.session.execute(message);
    const state = await this.gatewayStateTask.promise;
    if (!state) {
      return false;
    }
    return [GatewayStateType.REGISTER, GatewayStateType.REGED].includes(state);
  };
}
