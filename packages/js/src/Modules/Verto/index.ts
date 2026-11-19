import BrowserSession from './BrowserSession';
import {
  SubscribeParams,
  BroadcastParams,
  IVertoOptions,
} from './util/interfaces';
import { IVertoCallOptions, IWebRTCCall } from './webrtc/interfaces';
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
  type IStoredActiveCall,
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

    window.addEventListener('beforeunload', () => {
      logger.debug('Window beforeunload triggered.');

      if (options.hangupOnBeforeUnload !== false) {
        // Default: hang up the calls and forget the reconnect token, so there
        // is nothing to recover after the reload.
        clearReconnectToken();
        Object.entries(this.calls ?? {}).forEach(([callId, call]) => {
          logger.info(`Hanging up call due to window unload: ${callId}`);
          void call.hangup({ initiator: 'sdk:beforeunload' }, true);
        });
        return;
      }

      // The calls stay up on the server so they can be recovered after the
      // reload. Save them before flushing call reports: the flush clears the
      // evidence the relay policy is evaluated from.
      this._saveRecoveryMarker();
      this._flushCallReportsOnUnload();
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

  /**
   * Save the active calls to the recovery marker so they can be recovered
   * after a page reload, or remove the marker when there is nothing to
   * recover. A failure is logged and ignored so it cannot break the unload.
   */
  private _saveRecoveryMarker() {
    try {
      const calls = this.getActiveCalls();
      if (!this.sessionid || calls.length === 0) {
        logger.debug(
          `No sessionID ${this.sessionid} or activeCalls ${calls.length} during saving calls recover marker!`
        );
        clearActiveCallsRecoveryMarker();
        return;
      }

      const storedCalls = calls.map((call) => this._toStoredCall(call));
      logger.info(
        `Saving recovery marker for ${storedCalls.length} active call(s) before unload (sessid=${this.sessionid}): [${storedCalls
          .map((c) => c.id)
          .join(', ')}].`
      );
      setActiveCallsRecoveryMarker(storedCalls, this.sessionid);
    } catch (err) {
      logger.debug(
        `Failed to save active-calls recovery marker before unload: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * The plain values the recovery marker keeps for a call. Credentials, SDP,
   * streams and DOM elements are never stored (VSDK-316).
   */
  private _toStoredCall(call: IWebRTCCall): IStoredActiveCall {
    // Media elements are stored by element id only. A call that uses the
    // session-level element stores the session's element id (VSDK-408).
    const elementId = (
      callElement: unknown,
      sessionElement: unknown,
      sessionElementId: string | null
    ) => {
      if (typeof callElement === 'string') return callElement;
      if (sessionElementId && callElement === sessionElement) {
        return sessionElementId;
      }
      return undefined;
    };

    return {
      id: call.id,
      customHeaders: call.options.customHeaders,
      wasHeld: call.state === 'held',
      audioMuted: call.isAudioMuted === true,
      forceRelayCandidate: call.shouldForceRelayCandidateForRecovery(),
      remoteElement: elementId(
        call.options.remoteElement,
        this.remoteElement,
        this.remoteElementId
      ),
      localElement: elementId(
        call.options.localElement,
        this.localElement,
        this.localElementId
      ),
    };
  }

  /** Send each active call's report so far before the page goes away. */
  private _flushCallReportsOnUnload() {
    this.getActiveCalls().forEach((call) => {
      if (!call.flushIntermediateCallReport) return;
      try {
        logger.debug(`beforeunload: flushing call report for ${call.id}.`);
        call.flushIntermediateCallReport({ type: 'page-unload' });
      } catch (err) {
        logger.debug(
          `beforeunload: failed to flush call report for ${call.id}: ${
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

    // Before the login: Attach and reattached_sessions follow it.
    this._vertoHandler.trackCallsAwaitingReattach();

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
