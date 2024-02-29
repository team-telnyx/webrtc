import JanusConnection from './Connection';
import { trigger } from './Handler';
import { Janus } from './Request';
import { JanusResponse } from './Response';
import { TransactionManager } from './Transaction';
import { SwEvent } from './util/constants';

type RegistrationState =
  | 'unregistered'
  | 'registering'
  | 'registered'
  | 'failed';

type RegisterParams = {
  username: string;
  password: string;
  session_id: number;
  handle_id: number;
};

export class SIPRegistrationAgent {
  private _connection: JanusConnection;
  private _state: RegistrationState = 'unregistered';
  private _transactionManager: TransactionManager;

  constructor(connection: JanusConnection) {
    this._connection = connection;
    this._transactionManager = new TransactionManager(connection);
    this._connection.addListener('message', this._onMessage);
    this._connection.addListener('close', this._onConnectionClose);
  }

  private _onMessage = (message: string) => {
    const data = JSON.parse(message) as JanusResponse;
    if (
      data.janus === Janus.event &&
      data.plugindata.plugin === 'janus.plugin.sip'
    ) {
      const event = data.plugindata.data.result.event;
      switch (event) {
        case 'registering': {
          this._state = 'registering';
          break;
        }
        case 'registered': {
          this._state = 'registered';
          // TODO pass ids
          trigger(SwEvent.Ready, { session_id: 0, handle_id: 0 });
        }
      }
    }
  };

  private _onConnectionClose = () => {
    this._connection.removeListener('message', this._onMessage);
    this._connection.removeListener('close', this._onConnectionClose);
  };

  public register = async (params: RegisterParams) => {
    this._state = 'registering';
    try {
      await this._transactionManager.execute(
        {
          janus: Janus.message,
          session_id: params.session_id,
          handle_id: params.handle_id,
          body: {
            request: 'register',
            username: params.username,
            secret: params.password,
            proxy: 'sip:sip.telnyx.com:5060',
          },
        },
        (msg) => {
          // This transaction should resolve when the plugin is registering
          return (
            msg.janus === Janus.event &&
            msg.plugindata.data.result.event === 'registering'
          );
        }
      );
    } catch (error) {
      this._state = 'failed';
    }
  };
  get state() {
    return this._state;
  }
}
