import { IClientOptions } from 'src/utils/interfaces';
import JanusConnection from './Connection';
import { deRegister, register } from './Handler';
import { Janus } from './Request';
import { TransactionManager } from './Transaction';
import { SwEvent } from './util/constants';
import { JANUS_SIP_PLUGIN } from './util/constants/plugins';
import { SIPRegistrationAgent } from './SIPRegistrationAgent';

export default class JanusClient {
  public connection: JanusConnection;
  private _transactionManager: TransactionManager;
  private gatewaySessionId: number | null = null;
  private gatewayHandleId: number | null = null;
  private _clientOptions: IClientOptions;
  private _sipRegistrationAgent: SIPRegistrationAgent;

  constructor(options: IClientOptions) {
    this._clientOptions;
    this.connection = new JanusConnection();
    this._transactionManager = new TransactionManager(this.connection);
    this._sipRegistrationAgent = new SIPRegistrationAgent(this.connection);
    this._createSession();
  }

  public get connected(): boolean {
    return this.connection.connected;
  }
  public connect() {
    return this.connection.connect();
  }

  private _createSession = async () => {
    try {
      const sessionResponse = await this._transactionManager.execute({
        janus: Janus.create,
      });

      this.gatewaySessionId = sessionResponse.data.id;

      const pluginResponse = await this._transactionManager.execute({
        janus: Janus.attach,
        plugin: JANUS_SIP_PLUGIN,
        session_id: this.gatewaySessionId,
      });

      this.gatewayHandleId = pluginResponse.data.id;

      await this._sipRegistrationAgent.register({
        username: 'sip:haythem@sip.telnyx.com',
        password: 'Testpassword1.',
        session_id: this.gatewaySessionId,
        handle_id: this.gatewayHandleId,
      });
    } catch (error) {
      console.error(error);
    }
  };

  public on(event: SwEvent, cb: (data: any) => void) {
    register(event, cb);
  }

  public disconnect() {
    this.connection.close();
  }

  public off(event: SwEvent, cb: (data: any) => void) {
    deRegister(event, cb);
  }
  public disableWebcam() {
    return true;
  }
  public enableWebcam() {
    return true;
  }
}
