import { Call } from './Call';
import { Connection } from './Connection';
import { deRegister, register } from './Handler';
import KeepAliveAgent from './KeepAliveAgent';
import { SIPRegistrationAgent } from './SIPRegistrationAgent';
import { transactionManager } from './TransactionManager';
import { Environment } from './constants';
import { IClientOptions } from './interfaces';
import { AttachSipPluginTransaction } from './transactions/AttachSIPPlugin';
import { CreateSessionTransaction } from './transactions/CreateSession';
import CallAgent from './CallAgent';
import { ICallOptions } from 'src/utils/interfaces';

export default class JanusClient {
  private _gatewaySessionId: number | null = null;
  private _gatewayHandleId: number | null = null;
  private _connection: Connection;
  private _options: IClientOptions;
  private _sipRegistrationAgent: SIPRegistrationAgent;
  private _keepAliveAgent: KeepAliveAgent;
  private _callAgent: CallAgent;

  static telnyxStateCall(call: Call) {
    return call;
  }
  constructor(options: IClientOptions) {
    this._connection = new Connection({
      environment: Environment.production,
    });
    this._options = options;
  }

  public async connect() {
    this._connection.connect();

    const { sessionId } = await transactionManager.execute(
      new CreateSessionTransaction()
    );

    this._gatewaySessionId = sessionId;

    const { handleId } = await transactionManager.execute(
      new AttachSipPluginTransaction({
        sessionId: this._gatewaySessionId,
      })
    );
    this._gatewayHandleId = handleId;

    this._keepAliveAgent = new KeepAliveAgent({
      connection: this._connection,
      gatewaySessionId: this._gatewaySessionId,
    });

    this._sipRegistrationAgent = new SIPRegistrationAgent({
      connection: this._connection,
      options: this._options,
      sessionId: this._gatewaySessionId,
      handleId: this._gatewayHandleId,
    });

    this._callAgent = new CallAgent({
      gatewayHandleId: this._gatewayHandleId,
      gatewaySessionId: this._gatewaySessionId,
      connection: this._connection,
    });

    await this._sipRegistrationAgent.register();
    this._keepAliveAgent.start();
  }

  async newCall(options: ICallOptions) {
    const call = await this._callAgent.Outbound({
      ...options,
      handleId: this._gatewayHandleId,
      sessionId: this._gatewaySessionId,
    });
    return call;
  }

  get calls() {
    return this._callAgent.calls;
  }
  public disconnect() {
    // TODO - implement
  }

  public enableWebcam() {
    // TODO - implement
    return true;
  }
  public disableWebcam() {
    // TODO - implement
    return true;
  }

  set remoteElement(
    element: HTMLMediaElement | string | (() => HTMLMediaElement)
  ) {
    this._callAgent.remoteElement = element;
  }

  on(eventName: string, callback: Function) {
    register(eventName, callback);
  }
  off(eventName: string, callback: Function) {
    deRegister(eventName, callback);
  }
}
