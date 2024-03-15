import { ICallOptions } from 'src/utils/interfaces';
import CallAgent from './CallAgent';
import { connection } from './Connection';
import KeepAliveAgent from './KeepAliveAgent';
import { SIPRegistrationAgent } from './SIPRegistrationAgent';
import { IClientOptions } from './interfaces';
import { deRegister, register } from './Handler';

export default class JanusClient {
  private _options: IClientOptions;
  private _sipRegistrationAgent: SIPRegistrationAgent;
  private _keepAliveAgent: KeepAliveAgent;
  private _callAgent: CallAgent;

  constructor(options?: IClientOptions) {
    this._sipRegistrationAgent = new SIPRegistrationAgent();
    this._options = options;
  }

  public get connected() {
    return connection.connected;
  }

  public async disconnect() {
    connection.disconnect();
    this._keepAliveAgent?.stop();
    await this._sipRegistrationAgent.unregister();
  }

  public async connect() {
    await connection.connect();
    this._keepAliveAgent = new KeepAliveAgent();
    this._sipRegistrationAgent = new SIPRegistrationAgent();
    this._callAgent = new CallAgent(this._options);
    this._keepAliveAgent.start();
  }

  public get registrationState() {
    return this._sipRegistrationAgent.state;
  }
  public register(options: IClientOptions) {
    return this._sipRegistrationAgent.register(options);
  }
  async newCall(options: ICallOptions) {
    const call = await this._callAgent.Outbound(options);
    return call;
  }

  public on(event: string, handler: Function) {
    // TODO change to event emitter instead
    register(event, handler);
  }
  public off(event: string, handler: Function) {
    // TODO change to event emitter instead
    deRegister(event, handler);
  }
  get calls() {
    return this._callAgent.calls;
  }
}
