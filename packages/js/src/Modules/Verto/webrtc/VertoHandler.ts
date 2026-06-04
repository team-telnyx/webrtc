import logger from '../util/logger';
import { createTelnyxError } from '../util/errors';
import BrowserSession from '../BrowserSession';
import Call from './Call';
import { callMarkName } from './CallEstablishmentTimings';
import { checkSubscribeResponse } from './helpers';
import { Result } from '../messages/Verto';
import {
  SwEvent,
  SESSION_NOT_REATTACHED,
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

/**
 * @ignore Hide in docs output
 */

const RETRY_REGISTER_TIME = 5;
const RETRY_CONNECT_TIME = 5;
class VertoHandler {
  public nodeId: string;

  retriedConnect = 0;

  retriedRegister = 0;

  /**
   * Session IDs (telnyx_session_id) that have already been recovered by an
   * incoming Attach during the current reattach cycle. Used to detect
   * duplicate / ambiguous Attach messages — only the first Attach for a
   * given session is recovered; later ones are ACK'd and ignored.
   *
   * Cleared when a new clientReady with reattached_sessions arrives.
   */
  private _recoveredAttachSessionIds: Set<string> = new Set();

  /**
   * Tracks whether an attach already recovered the active call during
   * the current reattach cycle. When reattached_sessions arrives after
   * the attach (common ordering), this prevents the orphan-check from
   * terminating a call that was already recovered.
   */
  private _activeCallRecoveredByAttach: boolean = false;

  constructor(public session: BrowserSession) {}

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

    // ── Reattach session handling ────────────────────────────────────────
    // When the server sends reattached_sessions on reconnect, the SDK must
    // reconcile its active calls against the server's known sessions.
    //
    // IMPORTANT: Recovery is driven by telnyx_rtc.attach, NOT by
    // reattached_sessions. The attach message often arrives before
    // reattached_sessions, so reattached_sessions cannot be used to
    // select/suppress sessions or terminate active calls.
    //
    // The ONLY case where reattached_sessions triggers action without an
    // attach is the orphan fallback: active call exists, reattached_sessions
    // is empty, and no matching attach already recovered it → debug log,
    // emit SESSION_NOT_REATTACHED, local cleanup without BYE.
    //
    if (Array.isArray(params?.reattached_sessions)) {
      const reattachedSessions: string[] = params.reattached_sessions;
      const activeCallIds = Object.keys(session.calls);
      const hasActiveCall = activeCallIds.length > 0;

      // Reset per-cycle tracking on each reattach cycle.
      // If an attach already recovered the active call in this cycle
      // (attach-before-reattached_sessions ordering), preserve that flag
      // so the orphan check below doesn't mistakenly terminate the call.
      const hadPriorAttachRecovery = this._recoveredAttachSessionIds.size > 0;
      this._recoveredAttachSessionIds.clear();
      this._activeCallRecoveredByAttach = hadPriorAttachRecovery;

      if (
        hasActiveCall &&
        reattachedSessions.length === 0 &&
        !this._activeCallRecoveredByAttach
      ) {
        // Orphan fallback: server reports no reattached sessions, and no
        // attach has already recovered the active call during this cycle.
        // This means the server lost the session — terminate locally.
        for (const callId of activeCallIds) {
          const call = session.calls[callId];
          if (!call) continue;

          const callSessionId = call.options?.telnyxSessionId;
          logger.info(
            `Session not reattached — terminating active call ${callId} ` +
              `(telnyxSessionId: ${callSessionId ?? 'unknown'}, ` +
              `reattached_sessions: [], attach_already_recovered: false, ` +
              `action: terminate_orphan_no_reattach).`
          );

          const error = createTelnyxError(SESSION_NOT_REATTACHED);
          trigger(
            SwEvent.Error,
            { error, callId, sessionId: session.sessionid },
            session.uuid
          );

          // Local cleanup only — do not send BYE because the server no
          // longer has the session.
          void call.hangup({}, false);
        }
      } else if (hasActiveCall) {
        // Active call exists with non-empty reattached_sessions, or attach
        // already recovered it. Do NOT terminate — attach drives recovery.
        // Just log for observability.
        for (const callId of activeCallIds) {
          const call = session.calls[callId];
          if (!call) continue;
          const callSessionId = call.options?.telnyxSessionId;
          logger.debug(
            `Reattach: active call ${callId} exists ` +
              `(telnyxSessionId: ${callSessionId ?? 'unknown'}, ` +
              `reattached_sessions: [${reattachedSessions.join(', ')}], ` +
              `attach_already_recovered: ${this._activeCallRecoveredByAttach}, ` +
              `action: keep_awaiting_attach).`
          );
        }
      }
      // No active call: reattached_sessions is informational only.
      // Recovery will be driven by incoming Attach messages.
    }

    if (eventType === 'channelPvtData') {
      return this._handlePvtEvent(params.pvtData);
    }

    const _buildCall = (
      recoveredCallId?: string,
      forceRelayCandidateForRecovery?: boolean
    ) => {
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
        prefetchIceCandidates: session.options.prefetchIceCandidates ?? true,
        forceRelayCandidate:
          forceRelayCandidateForRecovery ||
          session.options.forceRelayCandidate ||
          false,
        keepConnectionAliveOnSocketClose:
          session.options.keepConnectionAliveOnSocketClose ?? false,
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
        this.session.execute(messagePing);
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
        this._ack(id, method);
        break;
      }
      case VertoMethod.Attach: {
        const attachSessionId = params.telnyx_session_id;

        // ── Attach-based recovery logic ──────────────────────────────────
        // Recovery is driven by attach, not by reattached_sessions.
        // An incoming attach matches an active call by callID OR
        // telnyx_session_id.

        // Check if this attach's session was already recovered by a
        // previous attach in this cycle (duplicate / ambiguous).
        if (
          attachSessionId &&
          this._recoveredAttachSessionIds.has(attachSessionId)
        ) {
          logger.debug(
            `Attach: already recovered session ${attachSessionId} in this cycle — ACK and ignoring duplicate (callID: ${callID}).`
          );
          this._ack(id, method);
          return;
        }

        // Find an active call that matches this attach by callID or
        // telnyx_session_id.
        const activeCallIds = Object.keys(session.calls);
        let matchingActiveCall: IWebRTCCall | null = null;
        let matchingActiveCallId: string | null = null;

        for (const activeId of activeCallIds) {
          const activeCall = session.calls[activeId];
          if (!activeCall) continue;

          // Match by callID (direct)
          if (activeId === callID) {
            matchingActiveCall = activeCall;
            matchingActiveCallId = activeId;
            break;
          }

          // Match by telnyx_session_id
          const activeSessionId = activeCall.options?.telnyxSessionId;
          if (attachSessionId && activeSessionId === attachSessionId) {
            matchingActiveCall = activeCall;
            matchingActiveCallId = activeId;
            break;
          }
        }

        if (matchingActiveCall) {
          // ── Matching attach: recover the active call ───────────────────
          const recoveredCallId = matchingActiveCall.id;
          const forceRelayCandidateForRecovery =
            matchingActiveCall.shouldForceRelayCandidateForRecovery?.() ??
            false;

          if (forceRelayCandidateForRecovery) {
            logger.warn(
              `[${new Date().toISOString()}][${callID}] Attach: forcing relay candidate because recovered VPN media path is still stalled`
            );
          }

          logger.info(
            `[${new Date().toISOString()}][${callID}] Attach: recovering active call ${matchingActiveCallId} ` +
              `(telnyxSessionId: ${attachSessionId ?? 'unknown'}, recoveredCallId: ${recoveredCallId}).`
          );

          void matchingActiveCall.hangup(
            { isRecovering: true, initiator: 'sdk:attach-recovery' },
            false
          );

          const call = _buildCall(
            recoveredCallId,
            forceRelayCandidateForRecovery
          );
          call.answer();
          this._ack(id, method);

          // Track this session as recovered
          if (attachSessionId) {
            this._recoveredAttachSessionIds.add(attachSessionId);
          }
          this._activeCallRecoveredByAttach = true;
          return;
        }

        // ── No matching active call ─────────────────────────────────────
        // Check if there is ANY active call (mismatch case)
        if (activeCallIds.length > 0) {
          // Mismatching attach: active call exists but doesn't match
          // this attach's callID or telnyx_session_id. The active call
          // is orphaned — emit SESSION_NOT_REATTACHED, terminate it
          // locally without BYE, then ACK/ignore the mismatching attach.
          for (const activeId of activeCallIds) {
            const activeCall = session.calls[activeId];
            if (!activeCall) continue;

            const activeSessionId = activeCall.options?.telnyxSessionId;
            logger.debug(
              `Attach mismatch: active call ${activeId} ` +
                `(telnyxSessionId: ${activeSessionId ?? 'unknown'}) does not match ` +
                `incoming attach (callID: ${callID}, telnyxSessionId: ${attachSessionId ?? 'unknown'}). `
            );

            const error = createTelnyxError(SESSION_NOT_REATTACHED);
            trigger(
              SwEvent.Error,
              { error, callId: activeId, sessionId: session.sessionid },
              session.uuid
            );

            // Local cleanup without BYE
            void activeCall.hangup({}, false);
          }

          // ACK the mismatching attach without establishing it
          this._ack(id, method);
          return;
        }

        // ── No active call at all: first attach in this cycle ─────────────
        // Recover the first attach. If multiple attaches arrive, recover
        // the first and debug-log/ACK/ignore later ones as ambiguous.
        // (The duplicate check at the top handles subsequent attaches
        // for the same session; here we handle the case where different
        // sessions arrive.)
        if (attachSessionId) {
          this._recoveredAttachSessionIds.add(attachSessionId);
        }

        const call = _buildCall();
        call.answer();
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

      default: {
        const gateWayState = getGatewayState(msg);

        if (gateWayState) {
          switch (gateWayState) {
            // If the user is REGED tell the client that it is ready to make calls
            case GatewayStateType.REGISTER:
            case GatewayStateType.REGED: {
              if (
                session.connection.previousGatewayState !==
                  GatewayStateType.REGED &&
                session.connection.previousGatewayState !==
                  GatewayStateType.REGISTER
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
                setTimeout(() => {
                  this.session.execute(messageToCheckRegisterState);
                }, this.reconnectDelay());
                break;
              }
            case GatewayStateType.FAILED:
            case GatewayStateType.FAIL_WAIT: {
              if (
                session.connection.previousGatewayState !==
                  GatewayStateType.FAILED &&
                session.connection.previousGatewayState !==
                  GatewayStateType.FAIL_WAIT
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

                if (!this.session.hasAutoReconnect()) {
                  this.retriedConnect = 0;
                  const originalError = new ErrorResponse(
                    `Fail to connect the server, the server tried ${RETRY_CONNECT_TIME} times`,
                    'FAILED|FAIL_WAIT'
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
                  const telnyxError = createTelnyxError(
                    45003,
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
                  setTimeout(() => {
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
                  }, this.reconnectDelay());
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
