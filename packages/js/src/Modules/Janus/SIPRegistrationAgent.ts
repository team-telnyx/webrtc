import { Connection } from './Connection';
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
  | 'registering'
  | 'registered'
  | 'error';

type ISipRegistrationAgent = {
  options: IClientOptions;
  connection: Connection;
  sessionId: number;
  handleId: number;
};
export class SIPRegistrationAgent {
  private _connection: Connection;
  private _options: IClientOptions;
  private _sessionId: number;
  private _handleId: number;
  public state: RegistrationState;

  constructor({
    connection,
    options,
    sessionId,
    handleId,
  }: ISipRegistrationAgent) {
    this._options = options;
    this.state = 'unregistered';
    this._handleId = handleId;
    this._sessionId = sessionId;

    this._connection = connection;
    this._connection.addListener('message', this._onMessage);
  }

  private _onMessage(msg: string) {
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
      this.state = 'registered';
      trigger(SwEvent.Ready, {
        session_id: this._sessionId,
        handle_id: this._handleId,
      });
    }
  }

  async register() {
    try {
      this.state = 'unregistered';
      await transactionManager.execute(
        new SIPRegisterTransaction({
          ...this._options,
          session_id: this._sessionId,
          handle_id: this._handleId,
        })
      );
      this.state = 'registering';
    } catch (error) {
      this.state = 'error';
      trigger(SwEvent.Error, error);
    }
  }

  async unregister() {}
}
