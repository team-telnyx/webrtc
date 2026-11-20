import logger from '../util/logger';
import { createTelnyxError, createTelnyxWarning } from '../util/errors';
import BrowserSession from '../BrowserSession';
import Call from './Call';
import { callMarkName } from './CallEstablishmentTimings';
import { checkSubscribeResponse } from './helpers';
import { Result } from '../messages/Verto';
import {
  SwEvent,
  SESSION_NOT_REATTACHED,
  UNKNOWN_REATTACHED_SESSION,
  LOGIN_FAILED,
  GATEWAY_FAILED,
  RECONNECTION_EXHAUSTED,
  SUBSCRIBE_FAILED,
} from '../util/constants';
import {
  VertoMethod,
  NOTIFICATION_TYPE,
  GatewayStateType,
  Direction,
} from './constants';
import { trigger, deRegister } from '../services/Handler';
import { State, ConferenceAction } from './constants';
import { MCULayoutEventHandler } from './LayoutHandler';
import { IWebRTCCall, IVertoCallOptions } from './interfaces';
import { Gateway } from '../messages/verto/Gateway';
import { ErrorResponse } from './ErrorResponse';
import { getGatewayState, randomInt } from '../util/helpers';
import { Ping } from '../messages/verto/Ping';
import { takeSavedCall, takeSavedCallsNotIn } from '../util/reconnect';

/**
 * @ignore Hide in docs output
 */

const RETRY_REGISTER_TIME = 5;
const RETRY_CONNECT_TIME = 5;

/** How to rebuild a call the server re-attached after a reconnect or page reload. */
interface ICallRecovery {
  recoveredCallId: string;
  wasHeldBeforeRecovery: boolean;
  forceRelayCandidateForRecovery: boolean;
  /** Undefined uses the session default. */
  mutedMicOnStart?: boolean;
  /** Undefined uses the session-level element. */
  remoteElement?: IVertoCallOptions['remoteElement'];
  localElement?: IVertoCallOptions['localElement'];
}

class VertoHandler {
  public nodeId: string;

  retriedConnect = 0;

  retriedRegister = 0;

  /**
   * Calls the server should list in `reattached_sessions` for the current
   * connection: the calls in memory when it opened, plus calls rebuilt by an
   * Attach on it. Calls created on the new connection (an Invite, newCall())
   * are not in it. `null` once `reattached_sessions` has been handled.
   */
  private _callsAwaitingReattach: Set<string> | null = null;

  constructor(public session: BrowserSession) {}

  /**
   * Called when a new connection opens, before the login is sent: the calls
   * in memory now are the ones the server should re-attach.
   */
  trackCallsAwaitingReattach() {
    this._callsAwaitingReattach = new Set(Object.keys(this.session.calls));
  }

  private _ack(id: number, method: string): void {
    const msg = new Result(id, method);
    if (this.nodeId) {
      msg.targetNodeId = this.nodeId;
    }
    this.session.execute(msg);
  }

  private reconnectDelay() {
    return randomInt(2, 6) * 1000;
  }

  /**
   * `reattached_sessions` lists the calls the server re-attached to this
   * session after a reconnect or page reload. Every call the SDK knew before
   * the reconnect that is missing from the list was not re-attached and gets
   * SESSION_NOT_REATTACHED:
   * - a call in memory awaiting reattach is ended locally (no BYE: the server
   *   no longer has it)
   * - a call saved before a page reload is removed from the recovery marker
   * Calls created on the new connection are left alone, and so are listed
   * calls the SDK does not know (their Attach warns).
   */
  private _endCallsNotReattached(reattachedIds: string[]) {
    const { session } = this;
    const reattached = new Set(reattachedIds);
    const awaitingReattach = this._callsAwaitingReattach ?? new Set<string>();
    this._callsAwaitingReattach = null;

    // An app listener that throws must not stop the other calls from being
    // handled, so each emit is guarded.
    const emitNotReattached = (callId: string, details?: object) => {
      try {
        trigger(
          SwEvent.Error,
          {
            error: createTelnyxError(SESSION_NOT_REATTACHED),
            callId,
            sessionId: session.sessionid,
            ...details,
          },
          session.uuid
        );
      } catch (err) {
        logger.error(
          `[${callId}] A SESSION_NOT_REATTACHED listener threw: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    };

    for (const [callId, call] of Object.entries(session.calls)) {
      if (!awaitingReattach.has(callId) || reattached.has(callId)) continue;
      logger.info(
        `[${callId}] Call was not re-attached after reconnect, ending it locally.`
      );
      emitNotReattached(callId);
      void call.hangup({ initiator: 'sdk:session-not-reattached' }, false);
    }

    const savedCalls = takeSavedCallsNotIn(reattached, session.sessionid);
    for (const savedCall of savedCalls) {
      logger.info(
        `[${savedCall.id}] Call saved before page reload was not re-attached.`
      );
      emitNotReattached(savedCall.id, {
        customHeaders: savedCall.customHeaders,
      });
    }
  }

  /** How to rebuild a call that is still in memory (reconnect within the page). */
  private _recoveryFromCallInMemory(call: IWebRTCCall): ICallRecovery {
    const recovery: ICallRecovery = {
      recoveredCallId: call.id,
      wasHeldBeforeRecovery: call.state === 'held',
      forceRelayCandidateForRecovery:
        call.shouldForceRelayCandidateForRecovery(),
      mutedMicOnStart: call.isAudioMuted,
      remoteElement: call.options.remoteElement,
      localElement: call.options.localElement,
    };

    if (recovery.forceRelayCandidateForRecovery) {
      logger.warn(
        `[${new Date().toISOString()}][${call.id}] Attach: forcing relay candidate for recovery`
      );
    }
    logger.info(
      `[${call.id}] Attach: recovering the call from memory (held=${recovery.wasHeldBeforeRecovery}, muted=${recovery.mutedMicOnStart}).`
    );
    return recovery;
  }

  /**
   * How to rebuild a call saved before a page reload, or null when the call
   * was not saved for this session. Takes the call's record out of the
   * recovery marker, so the call is recovered once.
   */
  private _recoveryFromSavedCall(callId: string): ICallRecovery | null {
    const saved = takeSavedCall(callId, this.session.sessionid);
    if (!saved) {
      return null;
    }

    const recovery: ICallRecovery = {
      recoveredCallId: saved.id,
      wasHeldBeforeRecovery: saved.wasHeld === true,
      forceRelayCandidateForRecovery: saved.forceRelayCandidate === true,
      // Markers from older SDK versions have no mute state.
      mutedMicOnStart:
        typeof saved.audioMuted === 'boolean' ? saved.audioMuted : undefined,
      remoteElement: saved.remoteElement,
      localElement: saved.localElement,
    };

    logger.info(
      `[${callId}] Attach: recovering the call saved before page reload (held=${recovery.wasHeldBeforeRecovery}, muted=${
        recovery.mutedMicOnStart ?? '<session default>'
      }, forceRelayCandidate=${recovery.forceRelayCandidateForRecovery}, remoteElement=${
        saved.remoteElement ?? '<none>'
      }, localElement=${saved.localElement ?? '<none>'}).`
    );
    return recovery;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleMessage(msg: any) {
    const { session } = this;

    // Any inbound message proves the WebSocket is alive — reset keepalive timer
    // to prevent false "No ping/pong received" warnings when server pings and
    // client PONG responses drift out of sync with the 35s keepalive interval.
    session.setPingReceived();

    const { id, method, params = {}, voice_sdk_id } = msg;

    const callID = params?.callID;
    const eventChannel = params?.eventChannel;
    const eventType = params?.eventType;

    const existingCall = session.calls[callID];
    const isPeerConnectionAlive = existingCall?.peer?.isConnectionHealthy();

    if (Array.isArray(params?.reattached_sessions)) {
      this._endCallsNotReattached(params.reattached_sessions);
    }

    if (eventType === 'channelPvtData') {
      return this._handlePvtEvent(params.pvtData);
    }

    const _buildCall = ({
      recoveredCallId,
      forceRelayCandidateForRecovery,
      mutedMicOnStart,
      remoteElement,
      localElement,
      wasHeldBeforeRecovery,
    }: Partial<ICallRecovery> = {}) => {
      const callOptions: IVertoCallOptions = {
        audio: true,
        // So far, if SIP configuration supports video, then we will always get video section in SDP.
        // So we will determine is video call or not based on "video" client option .
        video: session.options.video,
        remoteSdp: params.sdp,
        destinationNumber: params.callee_id_number,
        remoteCallerName: params.caller_id_name,
        remoteCallerNumber: params.caller_id_number,
        callerName: params.callee_id_name,
        callerNumber: params.callee_id_number,
        attach: method === VertoMethod.Attach,
        mediaSettings: params.mediaSettings,
        debug: session.options.debug ?? false,
        debugOutput: session.options.debugOutput ?? 'socket',
        trickleIce: session.options.trickleIce ?? false,
        prefetchIceCandidates: session.options.prefetchIceCandidates ?? false,
        // An evaluated recovery value takes precedence over the session default.
        forceRelayCandidate:
          typeof forceRelayCandidateForRecovery === 'boolean'
            ? forceRelayCandidateForRecovery
            : (session.options.forceRelayCandidate ?? false),
        keepConnectionAliveOnSocketClose:
          session.options.keepConnectionAliveOnSocketClose ?? false,
        mutedMicOnStart: mutedMicOnStart ?? session.options.mutedMicOnStart,
      };

      if (callID) {
        callOptions.id = callID;
      }

      if (params.telnyx_call_control_id) {
        callOptions.telnyxCallControlId = params.telnyx_call_control_id;
      }

      if (params.telnyx_session_id) {
        callOptions.telnyxSessionId = params.telnyx_session_id;
      }

      if (params.telnyx_leg_id) {
        callOptions.telnyxLegId = params.telnyx_leg_id;
      }

      if (params.client_state) {
        callOptions.clientState = params.client_state;
      }

      if (
        params.dialogParams &&
        params.dialogParams.custom_headers &&
        params.dialogParams.custom_headers.length
      ) {
        callOptions.customHeaders = params.dialogParams.custom_headers;
      }

      if (recoveredCallId) {
        callOptions.recoveredCallId = recoveredCallId;
      }

      // Carry held intent onto the replacement call.
      if (wasHeldBeforeRecovery) {
        callOptions.wasHeldBeforeRecovery = wasHeldBeforeRecovery;
      }

      // Restore per-call media elements on attach-recovery. Only set when
      // provided, so the call otherwise uses the session-level element.
      if (remoteElement !== undefined) {
        callOptions.remoteElement = remoteElement;
      }
      if (localElement !== undefined) {
        callOptions.localElement = localElement;
      }

      performance.mark(callMarkName(callOptions.id, 'new-call-start'));
      const call = new Call(session, callOptions);
      call.nodeId = this.nodeId;
      return call;
    };

    const messageToCheckRegisterState = new Gateway(voice_sdk_id);
    const messagePing = new Ping(voice_sdk_id);

    switch (method) {
      case VertoMethod.Answer:
      case VertoMethod.Display:
      case VertoMethod.Candidate:
      case VertoMethod.Ringing:
      case VertoMethod.Bye:
      case VertoMethod.Media:
        if (!callID || !existingCall) {
          logger.error(`Received ${method} for non existing call:`, params);
          return;
        }
        existingCall.handleMessage(msg);
        this._ack(id, method);
        break;

      // used to keep websocket connection opened when SDK is in an idle state
      case VertoMethod.Ping: {
        this.session.setPingReceived();
        // Nothing awaits this reply. A reconnect settles it with
        // StaleRequestError, and execute() has already reported a
        // RequestTimeoutError to signaling health before rethrowing.
        this.session.execute(messagePing).catch((error) => {
          logger.debug('Ping reply was not acknowledged', error);
        });
        break;
      }
      case VertoMethod.Punt:
        if (
          session.options.keepConnectionAliveOnSocketClose &&
          isPeerConnectionAlive
        ) {
          logger.info(
            '[punt] Received PUNT from server. keepConnectionAliveOnSocketClose=true — disconnecting socket only, keeping calls alive.'
          );
          session.socketDisconnect();
          this._ack(id, method);
        } else {
          logger.info(
            '[punt] Received PUNT from server — calling serverDisconnect() to purge all calls without BYE.'
          );
          session.serverDisconnect();
        }
        break;
      case VertoMethod.Invite: {
        const call = _buildCall();
        call.direction = Direction.Inbound;
        call.playRingtone();
        call.setState(State.Ringing);

        // Emit warning if there are already active calls in this session.
        // Note: this could be a false positive if the client rejects the
        // inbound call — the warning fires at ring time, not at answer time.
        this.session.emitMultipleActiveCallsWarning(call.id);

        this._ack(id, method);
        break;
      }
      case VertoMethod.Attach: {
        // The server re-attached a call to this session after a reconnect or
        // a page reload. Recover it when the SDK knows the call, else warn.
        const recovery = existingCall
          ? this._recoveryFromCallInMemory(existingCall)
          : this._recoveryFromSavedCall(callID);

        if (!recovery) {
          logger.warn(
            `[${callID}] Attach: unknown call, neither in memory nor saved for session ${session.sessionid}. Not recovering it.`
          );
          trigger(
            SwEvent.Warning,
            {
              warning: createTelnyxWarning(UNKNOWN_REATTACHED_SESSION),
              callId: callID,
              params,
              sessionId: session.sessionid,
            },
            session.uuid
          );
          this._ack(id, method);
          break;
        }

        if (existingCall) {
          // The rebuilt call takes over this call's ID: end the old one
          // locally, without a BYE, since the server keeps the call.
          void existingCall.hangup(
            { isRecovering: true, initiator: 'sdk:attach-recovery' },
            false
          );
        }

        const call = _buildCall(recovery);
        call.answer();
        // A rebuilt call was known before the reconnect, so the server must
        // list it in `reattached_sessions`.
        this._callsAwaitingReattach?.add(call.id);

        // Emit warning if there are other active calls (recovered calls are active calls too)
        this.session.emitMultipleActiveCallsWarning(call.id);

        this._ack(id, method);
        break;
      }
      case VertoMethod.Event:
      case 'webrtc.event':
        if (!eventChannel) {
          logger.error('Verto received an unknown event:', params);
          return;
        }
        const protocol = session.relayProtocol;
        const firstValue = eventChannel.split('.')[0];
        if (session._existsSubscription(protocol, eventChannel)) {
          trigger(protocol, params, eventChannel);
        } else if (eventChannel === session.sessionid) {
          this._handleSessionEvent(params.eventData);
        } else if (session._existsSubscription(protocol, firstValue)) {
          trigger(protocol, params, firstValue);
        } else if (session.calls.hasOwnProperty(eventChannel)) {
          session.calls[eventChannel].handleMessage(msg);
        } else {
          trigger(SwEvent.Notification, params, session.uuid);
        }
        break;
      case VertoMethod.Info:
        params.type = NOTIFICATION_TYPE.generic;
        trigger(SwEvent.Notification, params, session.uuid);
        break;

      case VertoMethod.ClientReady:
        // We need to send a GatewayState to make sure that the user is registered
        // to avoid GATEWAY_DOWN when the user tries to make a new call
        this.session.execute(messageToCheckRegisterState);
        break;

      case 'ai_conversation': {
        // Emit a dedicated event for AI conversation messages (e.g. function_call
        // items from ACA). Consumers no longer need to parse raw SocketMessage
        // events to handle these.
        trigger(
          SwEvent.AIConversationMessage,
          {
            method: 'ai_conversation',
            params,
            voice_sdk_id,
          },
          session.uuid
        );
        break;
      }

      default: {
        const gateWayState = getGatewayState(msg);

        if (gateWayState) {
          switch (gateWayState) {
            // If the user is REGED tell the client that it is ready to make calls
            case GatewayStateType.REGISTER:
            case GatewayStateType.REGED: {
              if (
                !this.isDuplicateGatewayState(gateWayState, [
                  GatewayStateType.REGED,
                  GatewayStateType.REGISTER,
                ])
              ) {
                this.session._triggerKeepAliveTimeoutCheck();
                this.retriedRegister = 0;

                // Only reset reconnect attempts on confirmed healthy
                // registration (REGED). REGISTER alone does not guarantee
                // the session is fully established — the socket could
                // still close before REGED, masking an unhealthy
                // reconnect loop if we reset too early.
                if (gateWayState === GatewayStateType.REGED) {
                  this.session.resetReconnectAttempts();
                }

                // Capture call_report_id for SDK call reporting
                const callReportId = msg?.result?.params?.call_report_id;
                if (callReportId) {
                  session.callReportId = callReportId;
                  logger.debug(
                    'Captured call_report_id from REGED:',
                    callReportId
                  );
                }

                const dc = msg?.result?.params?.dc;
                if (dc) {
                  session.dc = dc;
                }

                const region = msg?.result?.params?.region;
                if (region) {
                  session.region = region;
                }

                logger.info(
                  `Connected to Telnyx — region: ${session.region ?? 'unknown'}, dc: ${session.dc ?? 'unknown'}`
                );

                params.type = NOTIFICATION_TYPE.vertoClientReady;
                session._registrationTimings?.finish(session.sessionid);
                trigger(SwEvent.Ready, params, session.uuid);
              }
              break;
            }

            /*
              If the server returns NOREG it can be that the server is registering the user,
              or it can mean that the user can not be registered for some reason, 
              to make sure the reason we try to check if the user is registered 3 times, 
              after that, we send a Telnyx.Error.
            */
            case GatewayStateType.UNREGED:
            case GatewayStateType.NOREG:
              this.retriedRegister += 1;

              if (this.retriedRegister === RETRY_REGISTER_TIME) {
                this.retriedRegister = 0;
                const originalError = new ErrorResponse(
                  `Fail to register the user, the server tried ${RETRY_REGISTER_TIME} times`,
                  'UNREGED|NOREG'
                );
                const telnyxError = createTelnyxError(
                  LOGIN_FAILED,
                  originalError
                );
                trigger(
                  SwEvent.Error,
                  {
                    error: telnyxError,
                    sessionId: session.sessionid,
                  },
                  session.uuid
                );
                break;
              } else {
                const delayMs = this.reconnectDelay();
                session._registrationTimings?.mark(
                  'schedule gateway state retry',
                  {
                    state: gateWayState,
                    attempt: this.retriedRegister,
                    delayMs,
                  }
                );
                setTimeout(() => {
                  session._registrationTimings?.mark(
                    'gateway state retry timer fired'
                  );
                  this.session.execute(messageToCheckRegisterState);
                }, delayMs);
                break;
              }
            case GatewayStateType.FAILED:
            case GatewayStateType.FAIL_WAIT:
            case GatewayStateType.TIMEOUT: {
              if (
                !this.isDuplicateGatewayState(gateWayState, [
                  GatewayStateType.FAILED,
                  GatewayStateType.FAIL_WAIT,
                  GatewayStateType.TIMEOUT,
                ])
              ) {
                // Emit gateway failure on first occurrence
                const gatewayError = createTelnyxError(
                  GATEWAY_FAILED,
                  new Error(`Gateway state: ${gateWayState}`)
                );
                trigger(
                  SwEvent.Error,
                  {
                    error: gatewayError,
                    sessionId: session.sessionid,
                  },
                  session.uuid
                );

                // Avoid sticky reconnect to the same b2bua-rtc target by
                // requesting a different instance on the next connect().
                session.options.skipLastVoiceSdkId = true;
                logger.debug(
                  `Set skipLastVoiceSdkId=true on session options to avoid sticky reconnect to same b2bua-rtc instance (sessionId=${session.sessionid})`
                );

                if (!this.session.hasAutoReconnect()) {
                  this.retriedConnect = 0;
                  const originalError = new ErrorResponse(
                    `Fail to connect the server, the server tried ${RETRY_CONNECT_TIME} times`,
                    'FAILED|FAIL_WAIT|TIMEOUT'
                  );
                  // Local-only teardown of active calls before declaring
                  // reconnection exhausted. The socket is already dead, so
                  // sending BYE would only generate noise (BYE_SEND_FAILED).
                  // (VSDK-318 Step 4.d)
                  this.session._terminateActiveCallsLocally(
                    'sdk:gateway-failed'
                  );
                  const telnyxError = createTelnyxError(
                    RECONNECTION_EXHAUSTED,
                    originalError
                  );
                  trigger(
                    SwEvent.Error,
                    {
                      error: telnyxError,
                      sessionId: session.sessionid,
                    },
                    session.uuid
                  );
                  break;
                }

                this.retriedConnect += 1;
                if (this.retriedConnect === RETRY_CONNECT_TIME) {
                  this.retriedConnect = 0;
                  // Local-only teardown of active calls before declaring
                  // reconnection exhausted (see above). (VSDK-318 Step 4.d)
                  this.session._terminateActiveCallsLocally(
                    'sdk:gateway-retry-exhausted'
                  );
                  const telnyxError = createTelnyxError(
                    RECONNECTION_EXHAUSTED,
                    new Error('Connection Retry Failed')
                  );
                  trigger(
                    SwEvent.Error,
                    {
                      error: telnyxError,
                      sessionId: session.sessionid,
                    },
                    session.uuid
                  );
                  break;
                } else {
                  const delayMs = this.reconnectDelay();
                  session._registrationTimings?.mark(
                    'schedule gateway reconnect',
                    {
                      state: gateWayState,
                      attempt: this.retriedConnect,
                      delayMs,
                    }
                  );
                  setTimeout(() => {
                    session._registrationTimings?.mark(
                      'gateway reconnect timer fired'
                    );
                    logger.debug(
                      `Reconnecting... Retry ${this.retriedConnect} of ${RETRY_CONNECT_TIME}`
                    );

                    if (this.session.options.keepConnectionAliveOnSocketClose) {
                      // Check if any call has a recoverable peer connection (signalingStateClosed === false)
                      const hasRecoverablePeer = Object.values(
                        session.calls
                      ).some(
                        (call) =>
                          call.peer?.instance && !call.signalingStateClosed
                      );

                      if (hasRecoverablePeer) {
                        logger.debug(
                          'Reconnecting by keeping the existing session due to keepConnectionAliveOnSocketClose option being set.'
                        );
                        this.session.socketDisconnect(); // This triggers SocketClose → onNetworkClose → connect()
                        return;
                      } else {
                        logger.debug(
                          'keepConnectionAliveOnSocketClose is set but all peer connections have signalingState closed, doing full reconnect'
                        );
                      }
                    }

                    this.session.disconnect().then(() => {
                      this.session.clearConnection();
                      this.session.connect();
                    });
                  }, delayMs);
                }
              }
              break;
            }
            default:
              logger.warn('GatewayState message unknown method:', msg);
              break;
          }
          break;
        }
        logger.debug('Verto message unknown method:', msg);
        break;
      }
    }
  }

  /**
   * Checks whether the previous gateway state matches any of the states in the
   * given bucket (e.g. [FAILED, FAIL_WAIT, TIMEOUT] or [REGED, REGISTER]).
   * Logs a debug message when a duplicate/overlapping state is detected so the
   * guard condition is visible in session/call reports.
   */
  private isDuplicateGatewayState(
    currentState: GatewayStateType,
    states: GatewayStateType[]
  ): boolean {
    const { previousGatewayState } = this.session.connection;
    const isDuplicate = states.includes(
      previousGatewayState as GatewayStateType
    );

    if (isDuplicate) {
      logger.debug(
        `Gateway state '${currentState}' received but previous state was '${previousGatewayState}' — ` +
          `guard condition met, skipping re-emission (sessionId=${this.session.sessionid})`
      );
    }

    return isDuplicate;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _retrieveCallId(packet: any, laChannel: string) {
    const callIds = Object.keys(this.session.calls);
    if (packet.action === 'bootObj') {
      const me = packet.data.find((pr: [string, []]) =>
        callIds.includes(pr[0])
      );
      if (me instanceof Array) {
        return me[0];
      }
    } else {
      return callIds.find((id: string) =>
        this.session.calls[id].channels.includes(laChannel)
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _handlePvtEvent(pvtData: any) {
    const { session } = this;
    const protocol = session.relayProtocol;
    const {
      action,
      laChannel,
      laName,
      chatChannel,
      infoChannel,
      modChannel,
      conferenceMemberID,
      role,
      callID,
    } = pvtData;
    switch (action) {
      case 'conference-liveArray-join': {
        const _liveArrayBootstrap = () => {
          session.vertoBroadcast({
            nodeId: this.nodeId,
            channel: laChannel,
            data: {
              liveArray: {
                command: 'bootstrap',
                context: laChannel,
                name: laName,
              },
            },
          });
        };
        const tmp = {
          nodeId: this.nodeId,
          channels: [laChannel],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          handler: ({ data: packet }: any) => {
            const id = callID || this._retrieveCallId(packet, laChannel);
            if (id && session.calls.hasOwnProperty(id)) {
              const call = session.calls[id];
              call._addChannel(laChannel);
              call.extension = laName;
              call.handleConferenceUpdate(packet, pvtData).then((error) => {
                if (error === 'INVALID_PACKET') {
                  _liveArrayBootstrap();
                }
              });
            }
          },
        };
        const result = await session.vertoSubscribe(tmp).catch((error) => {
          logger.error('liveArray subscription error:', error);
          const telnyxError = createTelnyxError(SUBSCRIBE_FAILED, error);
          trigger(
            SwEvent.Error,
            { error: telnyxError, sessionId: session.sessionid },
            session.uuid
          );
        });
        if (checkSubscribeResponse(result, laChannel)) {
          _liveArrayBootstrap();
        }
        break;
      }
      case 'conference-liveArray-part': {
        // trigger Notification at a Call or Session level.
        // deregister Notification callback at the Call level.
        // Cleanup subscriptions for all channels
        let call: IWebRTCCall = null;
        if (laChannel && session._existsSubscription(protocol, laChannel)) {
          const { callId = null } = session.subscriptions[protocol][laChannel];
          call = session.calls[callId] || null;
          if (callId !== null) {
            const notification = {
              type: NOTIFICATION_TYPE.conferenceUpdate,
              action: ConferenceAction.Leave,
              conferenceName: laName,
              participantId: Number(conferenceMemberID),
              role,
            };
            if (!trigger(SwEvent.Notification, notification, callId, false)) {
              trigger(SwEvent.Notification, notification, session.uuid);
            }
            if (call === null) {
              deRegister(SwEvent.Notification, null, callId);
            }
          }
        }
        const channels = [laChannel, chatChannel, infoChannel, modChannel];
        session
          .vertoUnsubscribe({ nodeId: this.nodeId, channels })
          .then(({ unsubscribedChannels = [] }) => {
            if (call) {
              call.channels = call.channels.filter(
                (c) => !unsubscribedChannels.includes(c)
              );
            }
          })
          .catch((error) => {
            logger.error('liveArray unsubscribe error:', error);
          });
        break;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _handleSessionEvent(eventData: any) {
    switch (eventData.contentType) {
      case 'layout-info':
      case 'layer-info':
        MCULayoutEventHandler(this.session, eventData);
        break;
      case 'logo-info': {
        const notification = {
          type: NOTIFICATION_TYPE.conferenceUpdate,
          action: ConferenceAction.LogoInfo,
          logo: eventData.logoURL,
        };
        trigger(SwEvent.Notification, notification, this.session.uuid);
        break;
      }
    }
  }
}

export default VertoHandler;
