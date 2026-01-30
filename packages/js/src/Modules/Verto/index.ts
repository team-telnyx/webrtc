import BrowserSession from './BrowserSession';
import {
  SubscribeParams,
  BroadcastParams,
  IVertoOptions,
  ILoginParams,
} from './util/interfaces';
import { IVertoCallOptions } from './webrtc/interfaces';
import Call from './webrtc/Call';
import VertoHandler from './webrtc/VertoHandler';
import {
  isValidAnonymousLoginOptions,
  isValidLoginOptions,
} from './util/helpers';
import logger from './util/logger';

export const VERTO_PROTOCOL = 'verto-protocol';

export default class Verto extends BrowserSession {
  public relayProtocol: string = VERTO_PROTOCOL;

  public timeoutErrorCode = -329990; // fake verto timeout error code.

  constructor(options: IVertoOptions) {
    super(options);
    // hang up current call when browser closes or refreshes.
    window.addEventListener('beforeunload', (e) => {
      if (this.calls) {
        Object.keys(this.calls).forEach((callId) => {
          if (this.calls[callId]) {
            logger.info(`Hanging up call due to window unload: ${callId}`);
            this.calls[callId].hangup({}, true);
          }
        });
      }
    });
  }

  validateOptions() {
    return (
      isValidLoginOptions(this.options) ||
      isValidAnonymousLoginOptions(this.options)
    );
  }

  newCall(options: IVertoCallOptions) {
    if (!this.validateCallOptions(options)) {
      throw new Error('Verto.newCall() error: destinationNumber is required.');
    }
    performance.mark('new-call-start');
    const call = new Call(this, options);
    call.invite();
    performance.mark('new-call-end');
    return call;
  }

  broadcast(params: BroadcastParams) {
    return this.vertoBroadcast(params);
  }

  subscribe(params: SubscribeParams) {
    return this.vertoSubscribe(params);
  }

  unsubscribe(params: SubscribeParams) {
    return this.vertoUnsubscribe(params);
  }

  private handleLoginOnSocketOpen = async () => {
    this._idle = false;
    const { autoReconnect = true } = this.options;

    await this.login({
      onSuccess: () => {
        this._autoReconnect = autoReconnect;
      },
    });
  };

  private handleAnonymousLoginOnSocketOpen = async () => {
    this._idle = false;
    await this.login();
  };

  private validateCallOptions(options: IVertoCallOptions) {
    if (isValidAnonymousLoginOptions(this.options)) {
      return true;
    }
    return Boolean(options.destinationNumber);
  }

  protected async _onSocketOpen() {
    if (isValidLoginOptions(this.options)) {
      return this.handleLoginOnSocketOpen();
    }
    if (isValidAnonymousLoginOptions(this.options)) {
      return this.handleAnonymousLoginOnSocketOpen();
    }
  }

  protected _onSocketMessage(msg: any) {
    const handler = new VertoHandler(this);
    handler.handleMessage(msg);
  }
}
