import { connection } from './Connection';
import { trigger } from './Handler';
import { transactionManager } from './TransactionManager';
import { SwEvent } from './constants';
import { IClientOptions } from './interfaces';
import { Janus } from './messages/janus';
import { JanusResponse } from './messages/response';
import { SIPRegisterTransaction } from './transactions/SIPRegister';
import { isSipError } from './util/janus';

type RegistrationState =
  | 'unregistered'
  | 'registered'
  | 'error'
  | 'registering';

export class SIPRegistrationAgent {
  public state: RegistrationState;

  constructor() {
    this.state = 'unregistered';
  }

  private _onMessage = (msg: string) => {
    const data = JSON.parse(msg) as JanusResponse;

    if (isSipError(data)) {
      this.state = 'error';
      trigger(SwEvent.Error, new Error(data.plugindata.data.error));
      return;
    }

    if (
      data.janus === Janus.event &&
      data.plugindata.data.result.event === 'registered'
    ) {
      this._setState('registered');
      trigger(SwEvent.Ready, connection);
    }
  };

  private _setState = (state: RegistrationState) => {
    this.state = state;
    trigger(SwEvent.RegisterStateChange, this.state);
  };
  async register(options: IClientOptions): Promise<RegistrationState> {
    try {
      connection.addListener('message', this._onMessage);
      await transactionManager.execute(
        new SIPRegisterTransaction({
          ...options,
          session_id: connection.gatewaySessionId,
          handle_id: connection.gatewayHandleId,
        })
      );
      this._setState('registering');
      return this.state;
    } catch (error) {
      this._setState('error');
    }
  }

  async unregister() {
    connection.removeListener('message', this._onMessage);
  }
}
