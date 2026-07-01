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
  setReconnectSessionId,
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
      logger.debug('Window beforeunload triggered.');

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
      // that those calls were lost. Persist a NARROW projection of each active
      // call so that on the next SDK startup
      // VertoHandler can compare the saved markers against the server's
      // reattached_sessions and emit SESSION_NOT_REATTACHED for any call that
      // was not reattached. Persisting only this projection — rather than the
      // entire Call — keeps credentials, SDP, ICE/TURN secrets, custom header
      // values, and non-serializable host objects out of sessionStorage
      //
      // No false-positive interaction with `keepConnectionAliveOnSocketClose`:
      // that option only governs PUNT/server-initiated socket disconnects
      // (see VertoHandler PUNT case → `socketDisconnect()`), which never fire
      // `beforeunload`. This handler runs exclusively on a genuine browser
      // page-unload (close/refresh/navigation), so recovery markers are only
      // written when the page is truly going away, regardless of how the SDK
      // handles transient socket drops.
      try {
        const callIds = this.calls ? Object.keys(this.calls) : [];
        const activeCalls = callIds
          .filter((callId) => !!this.calls[callId])
          .map((callId) => this.calls[callId])
          .map((call) => ({
            id: call.id,
            customHeaders: call.options.customHeaders,
          }));

        if (!this.sessionid || activeCalls.length === 0) {
          logger.debug(
            `No sessionID ${this.sessionid} or activeCalls ${activeCalls.length} during saving calls recover marker!`
          );
          // No active calls or no session context — wipe any stale marker
          // left over from a previous page so it can't be re-consumed.
          clearActiveCallsRecoveryMarker();
          return;
        }

        logger.info(
          `Saving recovery marker for ${activeCalls.length} active call(s) before unload (sessid=${this.sessionid}): [${activeCalls
            .map((c) => c.id)
            .join(', ')}].`
        );
        setActiveCallsRecoveryMarker(activeCalls, this.sessionid);
      } catch (err) {
        // Any failure here must not break unload or normal call setup.
        const idsOnError = this.calls ? Object.keys(this.calls) : [];
        logger.debug(
          `Failed to save active-calls recovery marker before unload (active call ids: [${idsOnError.join(
            ', '
          )}]): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    });

    // Re-stamp the reconnect session-id freshness at the last moment the page
    // is reliably observable: the visibilitychange transition to `hidden`.
    //
    // The sessid the SDK sends on the next login is only accepted for reattach
    // while the persisted session-id is fresh (< RECONNECT_SESSION_ID_MAX_AGE_MS,
    // 90s), and that timestamp is otherwise only written at login/socket-close.
    // A leg connected longer than 90s (e.g. a conference host waiting for
    // participants) would therefore reload with a stale sessid and fail to
    // reattach. Per MDN guidance, `visibilitychange` → `hidden` is the last
    // event that fires reliably before a tab is backgrounded, discarded, or
    // closed — including on mobile, where `beforeunload`/`pagehide` are not
    // dependable — so it is the correct place to persist this state. The write
    // is synchronous (sessionStorage), so it completes even as the page goes
    // away, unlike async work such as a call-report POST.
    //
    // Only relevant when calls are meant to survive unload
    // (hangupOnBeforeUnload === false) and there is an active call to reattach.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden') return;
      if (
        options.hangupOnBeforeUnload !== false ||
        !this.sessionid ||
        !this.hasActiveCall()
      ) {
        return;
      }
      logger.debug(
        'visibilitychange → hidden: re-stamping reconnect session-id freshness.'
      );
      setReconnectSessionId(this.sessionid);
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
    // Start the signaling health monitor synchronously — do NOT await.
    //
    // super._onSocketOpen() only calls startSignalingHealthMonitor() which
    // is fully synchronous (sets fields + setInterval). Awaiting it wraps
    // the call in a resolved Promise and creates a microtask yield between
    // the WebSocket onopen event and the login send. During event loop
    // congestion (session transitions, heavy GC, main-thread blocking),
    // this yield delays authentication by seconds — observed 9s in
    // production (ch1, 2026-06-29) where the old session's main thread was
    // blocked for ~32s during a reconnection transition.
    //
    // By calling super._onSocketOpen() without await, the login message
    // is sent synchronously in the same call stack as the onopen handler,
    // before any microtask or macrotask can intercept.
    void super._onSocketOpen();

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
