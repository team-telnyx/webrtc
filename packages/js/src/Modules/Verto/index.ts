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
import {
  clearReconnectToken,
  clearActiveCallsRecoveryMarker,
  setActiveCallsRecoveryMarker,
  IActiveCallRecoveryMarker,
} from './util/reconnect';
import { INVALID_CALL_PARAMETERS } from './util/constants/errorCodes';

export const VERTO_PROTOCOL = 'verto-protocol';

export default class Verto extends BrowserSession {
  public relayProtocol: string = VERTO_PROTOCOL;

  public timeoutErrorCode = -329990; // fake verto timeout error code.

  private _vertoHandler: VertoHandler;

  constructor(options: IVertoOptions) {
    super(options);
    this._vertoHandler = new VertoHandler(this);

    // Single beforeunload handler for both hangup and recovery-marker paths.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    window.addEventListener('beforeunload', (_e) => {
      logger.info('Window beforeunload triggered.');

      if (options.hangupOnBeforeUnload !== false) {
        // Default / true: hang up current calls when the browser closes or
        // refreshes, and clear the reconnect token. There is nothing to
        // recover from, so no recovery marker is written.
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
        return;
      }

      // hangupOnBeforeUnload === false: the SDK does NOT hang up active calls
      // before unload, so the server may still know about them. After a page
      // reload the SDK starts with a fresh in-memory cache and may not detect
      // that those calls were lost. Persist a minimal, safe metadata record
      // for each active call — only the explicit safe fields
      // (callId, sessid, storedAt, telnyxSessionId, telnyxCallControlId) — so
      // that on the next SDK startup VertoHandler can compare the saved
      // markers against the server's reattached_sessions and emit
      // SESSION_NOT_REATTACHED for any call that was not reattached.
      // No SDP, ICE candidates, peer connection, session, media streams, or
      // other internal/host state is ever persisted.
      try {
        const callIds = this.calls ? Object.keys(this.calls) : [];
        const activeCallIds = callIds.filter(
          (callId) => !!this.calls[callId]
        );

        if (!this.sessionid || activeCallIds.length === 0) {
          // No active calls or no session context — wipe any stale marker
          // left over from a previous page so it can't be re-consumed.
          clearActiveCallsRecoveryMarker();
          return;
        }

        // Explicitly project only the safe identifier fields from each Call.
        // This avoids serializing the entire Call object (SDP, ICE, peer
        // connection, session, internal state) and avoids any
        // JSON.parse(JSON.stringify(...)) round-trip on the constrained
        // beforeunload path.
        const storedAt = Date.now();
        const markers: IActiveCallRecoveryMarker[] = activeCallIds.map(
          (callId) => {
            const call = this.calls[callId];
            return {
              callId: call.id,
              sessid: this.sessionid,
              storedAt,
              ...(call.options?.telnyxSessionId !== undefined
                ? { telnyxSessionId: call.options.telnyxSessionId }
                : {}),
              ...(call.options?.telnyxCallControlId !== undefined
                ? { telnyxCallControlId: call.options.telnyxCallControlId }
                : {}),
            };
          }
        );

        logger.info(
          `Saving recovery marker for ${markers.length} active call(s) before unload (sessid=${this.sessionid}).`
        );
        setActiveCallsRecoveryMarker(markers, this.sessionid);
      } catch (err) {
        // Any failure here must not break unload or normal call setup.
        logger.debug(
          `Failed to save active-calls recovery marker before unload: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
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
      const telnyxError = createTelnyxError(
        INVALID_CALL_PARAMETERS,
        undefined,
        'Error: destinationNumber is required'
      );
      throw telnyxError;
    }

    const call = new Call(this, options);

    // Emit warning if there are already active calls in this session.
    // The call ID is available after Call construction, even if the
    // application did not supply one (BaseCall._init generates it).
    if (!options.id) {
      logger.debug(
        `newCall: callId was not provided in options, SDK-generated ID: ${call.id}`
      );
    }
    this.emitMultipleActiveCallsWarning(call.id);
    performance.mark(callMarkName(call.id, 'new-call-start'));
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
