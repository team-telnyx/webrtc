import { v4 as uuidv4 } from 'uuid';
import BrowserSession from './BrowserSession';
import {
  SubscribeParams,
  BroadcastParams,
  IVertoOptions,
} from './util/interfaces';
import { IVertoCallOptions } from './webrtc/interfaces';
import { callMarkName } from './webrtc/CallEstablishmentTimings';
import Call from './webrtc/Call';
import VertoHandler from './webrtc/VertoHandler';
import {
  isValidAnonymousLoginOptions,
  isValidLoginOptions,
} from './util/helpers';
import logger from './util/logger';
import { createTelnyxError } from './util/errors';
import { clearReconnectToken } from './util/reconnect';
import { INVALID_CALL_PARAMETERS, MULTIPLE_ACTIVE_CALLS_DETECTED } from './util/constants/errorCodes';
import { SDK_WARNINGS } from './util/constants/warnings';

export const VERTO_PROTOCOL = 'verto-protocol';

export default class Verto extends BrowserSession {
  public relayProtocol: string = VERTO_PROTOCOL;

  public timeoutErrorCode = -329990; // fake verto timeout error code.

  private _vertoHandler: VertoHandler;

  constructor(options: IVertoOptions) {
    super(options);
    this._vertoHandler = new VertoHandler(this);

    if (options.hangupOnBeforeUnload !== false) {
      // hang up current call when browser closes or refreshes.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      window.addEventListener('beforeunload', (_e) => {
        clearReconnectToken();
        if (this.calls) {
          Object.keys(this.calls).forEach((callId) => {
            if (this.calls[callId]) {
              logger.info(`Hanging up call due to window unload: ${callId}`);
              void this.calls[callId].hangup(
                { initiator: 'sdk:beforeunload' },
                true
              );
            }
          });
        }
      });
    }
  }

  validateOptions() {
    return (
      isValidLoginOptions(this.options) ||
      isValidAnonymousLoginOptions(this.options)
    );
  }

  newCall(options: IVertoCallOptions) {
    if (!this.validateCallOptions(options)) {
      const telnyxError = createTelnyxError(
        INVALID_CALL_PARAMETERS,
        undefined,
        'Error: destinationNumber is required'
      );
      throw telnyxError;
    }

    // Ensure the call has an ID before emitting the warning.
    // BaseCall._init() would generate one via uuidv4() if options.id is
    // not supplied, but we need it here for the warning payload.
    if (!options.id) {
      options.id = uuidv4();
    }

    // Emit warning if there are already active calls in this session
    this.emitMultipleActiveCallsWarning(options.id);

    const call = new Call(this, options);
    performance.mark(callMarkName(call.id, 'new-call-start'));

    // If the warning was emitted (other active calls exist), also record it
    // in the new call's report for persistence.
    if (this.getActiveCalls().length > 1) {
      const warningEntry = SDK_WARNINGS[MULTIPLE_ACTIVE_CALLS_DETECTED];
      call.recordSessionWarning(
        MULTIPLE_ACTIVE_CALLS_DETECTED,
        warningEntry.name,
        warningEntry.message,
        this.getActiveCalls()
          .filter((c) => c.id !== call.id)
          .map((c) => c.id)
      );
    }

    call.invite();
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
    // Let BaseSession resume signaling health monitor for active calls
    await super._onSocketOpen();

    if (isValidLoginOptions(this.options)) {
      return this.handleLoginOnSocketOpen();
    }
    if (isValidAnonymousLoginOptions(this.options)) {
      return this.handleAnonymousLoginOnSocketOpen();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _onSocketMessage(msg: any) {
    this._vertoHandler.handleMessage(msg);
  }
}
