import logger from '../util/logger';
import BrowserSession from '../BrowserSession';
import pkg from '../../../../package.json';
import Call from './Call';
import { checkSubscribeResponse } from './helpers';
import { Attach, Result } from '../messages/Verto';
import { SwEvent } from '../util/constants';
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
const SDK_VERSION = pkg.version;

/**
 * @ignore Hide in docs output
 */

const RETRY_REGISTER_TIME = 5;
const RETRY_CONNECT_TIME = 5;
class VertoHandler {
  public nodeId: string;

  static retriedConnect = 0;

  static retriedRegister = 0;

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

  handleMessage(msg: any) {
    const { session } = this;
    const { id, method, params = {}, voice_sdk_id } = msg;

    const callID = params?.callID;
    const eventChannel = params?.eventChannel;
    const eventType = params?.eventType;

    const attach = method === VertoMethod.Attach;
    let keepConnectionOnAttach = false;

    if (eventType === 'channelPvtData') {
      return this._handlePvtEvent(params.pvtData);
    }

    if (callID && session.calls.hasOwnProperty(callID)) {
      if (attach) {
        keepConnectionOnAttach =
          session.options.keepConnectionAliveOnSocketClose ||
          session.calls[callID].options.keepConnectionAliveOnSocketClose;

        if (keepConnectionOnAttach) {
          logger.info(
            'Recovering peer connection and call with ATTACH. callID:',
            callID
          );
        } else {
          session.calls[callID].hangup({}, false);
          logger.info('Hanging up the call due to ATTACH. callID:', callID);
        }
      } else {
        session.calls[callID].handleMessage(msg);
        this._ack(id, method);
        return;
      }
    }

    const _buildCall = () => {
      const callOptions: IVertoCallOptions = {
        id: callID,
        remoteSdp: params.sdp,
        destinationNumber: params.callee_id_number,
        remoteCallerName: params.caller_id_name,
        remoteCallerNumber: params.caller_id_number,
        callerName: params.callee_id_name,
        callerNumber: params.callee_id_number,
        attach,
        mediaSettings: params.mediaSettings,
        debug: session.options.debug ?? false,
        debugOutput: session.options.debugOutput ?? 'socket',
        prefetchIceCandidates: session.options.prefetchIceCandidates ?? false,
        forceRelayCandidate: session.options.forceRelayCandidate ?? false,
        keepConnectionAliveOnSocketClose:
          session.options.keepConnectionAliveOnSocketClose ?? false,
      };

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

      const call = new Call(session, callOptions);
      call.nodeId = this.nodeId;
      return call;
    };

    const messageToCheckRegisterState = new Gateway(voice_sdk_id);
    const messagePing = new Ping(voice_sdk_id);

    switch (method) {
      // used to keep websocket connection opened when SDK is in an idle state
      case VertoMethod.Ping: {
        this.session.setPingReceived();
        this.session.execute(messagePing);
        break;
      }
      case VertoMethod.Punt:
        session.disconnect();
        break;
      case VertoMethod.Invite: {
        const call = _buildCall();
        call.playRingtone();
        call.setState(State.Ringing);
        call.direction = Direction.Inbound;
        this._ack(id, method);
        break;
      }
      case VertoMethod.Attach: {
        if (keepConnectionOnAttach) {
          // If we are keeping the connection alive on attach, we need to re-attach first.
          this.session.execute(
            new Attach({
              sessid: this.session.sessionid,
              // reuse the same sdp to re-attach
              sdp: this.session.calls[callID].peer?.instance.localDescription
                .sdp,
              dialogParams: this.session.calls[callID].options,
              'User-Agent': `Web-${SDK_VERSION}`,
            })
          );
          return;
        }
        const call = _buildCall();
        if (this.session.autoRecoverCalls) {
          call.answer();
        } else {
          call.setState(State.Recovering);
        }
        call.handleMessage(msg);
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
          // eslint-disable-next-line no-case-declarations
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
                VertoHandler.retriedRegister = 0;
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
              VertoHandler.retriedRegister += 1;

              if (VertoHandler.retriedRegister === RETRY_REGISTER_TIME) {
                VertoHandler.retriedRegister = 0;
                trigger(
                  SwEvent.Error,
                  {
                    error: new ErrorResponse(
                      `Fail to register the user, the server tried ${RETRY_REGISTER_TIME} times`,
                      'UNREGED|NOREG'
                    ),
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
                if (!this.session.hasAutoReconnect()) {
                  VertoHandler.retriedConnect = 0;
                  trigger(
                    SwEvent.Error,
                    {
                      error: new ErrorResponse(
                        `Fail to connect the server, the server tried ${RETRY_CONNECT_TIME} times`,
                        'FAILED|FAIL_WAIT'
                      ),
                      sessionId: session.sessionid,
                    },
                    session.uuid
                  );
                  break;
                }

                VertoHandler.retriedConnect += 1;
                if (VertoHandler.retriedConnect === RETRY_CONNECT_TIME) {
                  VertoHandler.retriedConnect = 0;
                  trigger(
                    SwEvent.Error,
                    {
                      error: new Error('Connection Retry Failed'),
                      sessionId: session.sessionid,
                    },
                    session.uuid
                  );
                  break;
                } else {
                  setTimeout(() => {
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
