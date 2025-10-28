import BaseSession from '../BaseSession';
import { DEV_HOST, PROD_HOST, SwEvent } from '../util/constants';
import {
  checkWebSocketHost,
  destructResponse,
  getGatewayState,
  isFunction,
  safeParseJson,
} from '../util/helpers';
import logger from '../util/logger';
import { getReconnectToken, setReconnectToken } from '../util/reconnect';
import { GatewayStateType } from '../webrtc/constants';
import { registerOnce, trigger } from './Handler';
import { TelnyxWebSocketError } from '../../../utils/TelnyxError';

let WebSocketClass: any = typeof WebSocket !== 'undefined' ? WebSocket : null;
export const setWebSocket = (websocket: any): void => {
  WebSocketClass = websocket;
};

const WS_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};
const TIMEOUT_MS = 10 * 1000;

export default class Connection {
  public previousGatewayState = '';
  private _wsClient: any = null;
  private _host: string = PROD_HOST;
  private _timers: { [id: string]: any } = {};

  public upDur: number = null;
  public downDur: number = null;

  constructor(public session: BaseSession) {
    const { host, env, region } = session.options;

    if (env) {
      this._host = env === 'development' ? DEV_HOST : PROD_HOST;
    }

    if (host) {
      this._host = checkWebSocketHost(host);
    }

    if (region) {
      this._host = this._host.replace(/rtc(dev)?/, `${region}.rtc$1`);
    }
  }

  get connected(): boolean {
    return this._wsClient && this._wsClient.readyState === WS_STATE.OPEN;
  }

  get connecting(): boolean {
    return this._wsClient && this._wsClient.readyState === WS_STATE.CONNECTING;
  }

  get closing(): boolean {
    return this._wsClient && this._wsClient.readyState === WS_STATE.CLOSING;
  }

  get closed(): boolean {
    return this._wsClient && this._wsClient.readyState === WS_STATE.CLOSED;
  }

  get isAlive(): boolean {
    return this.connecting || this.connected;
  }

  get isDead(): boolean {
    return this.closing || this.closed;
  }

  connect() {
    const websocketUrl = new URL(this._host);
    const reconnectToken = getReconnectToken();

    if (reconnectToken) {
      websocketUrl.searchParams.set('voice_sdk_id', reconnectToken);
    }

    this._wsClient = new WebSocketClass(websocketUrl.toString());
    this._wsClient.onopen = (event): boolean =>
      trigger(SwEvent.SocketOpen, event, this.session.uuid);
    this._wsClient.onclose = (event): boolean => {
      // Create enhanced WebSocket error for close events
      const wsError = new TelnyxWebSocketError('WebSocket connection closed', {
        code: 'WEBSOCKET_CLOSED',
        wsCode: event.code,
        wsReason: event.reason,
        wsReadyState: this._wsClient?.readyState,
        context: {
          sessionId: this.session.sessionid,
          url: websocketUrl.toString(),
          wasClean: event.wasClean,
        },
      });
      
      // Trigger both the original close event and enhanced error
      trigger(SwEvent.SocketClose, event, this.session.uuid);
      if (event.code !== 1000) { // Don't trigger error for normal closure
        trigger(SwEvent.SocketError, { error: wsError, sessionId: this.session.sessionid }, this.session.uuid);
      }
      return true;
    };
    this._wsClient.onerror = (event): boolean => {
      // Create enhanced WebSocket error for error events
      const wsError = new TelnyxWebSocketError('WebSocket connection error', {
        code: 'WEBSOCKET_ERROR',
        wsReadyState: this._wsClient?.readyState,
        context: {
          sessionId: this.session.sessionid,
          url: websocketUrl.toString(),
          event: event,
        },
      });
      
      return trigger(
        SwEvent.SocketError,
        { error: wsError, sessionId: this.session.sessionid },
        this.session.uuid
      );
    };
    this._wsClient.onmessage = (event): void => {
      const msg: any = safeParseJson(event.data);
      if (typeof msg === 'string') {
        this._handleStringResponse(msg);
        return;
      }

      if (msg.voice_sdk_id) {
        setReconnectToken(msg.voice_sdk_id);
      }
      this._unsetTimer(msg.id);
      logger.debug('RECV: \n', JSON.stringify(msg, null, 2), '\n');

      /**
       * GatewayStateType
       * It was necesary to dispatch the VertoHandler to check
       * GatewayState messages with result prop inside the JSON-RPC
       */
      if (
        GatewayStateType[`${msg?.result?.params?.state}`] ||
        !trigger(msg.id, msg)
      ) {
        // If there is not an handler for this message, dispatch an incoming!
        const gateWayState = getGatewayState(msg);

        trigger(SwEvent.SocketMessage, msg, this.session.uuid);

        // save previous gate state
        if (Boolean(gateWayState)) {
          this.previousGatewayState = gateWayState;
        }
      }
    };
  }

  sendRawText(request: string): void {
    this._wsClient.send(request);
  }

  send(bladeObj: any): Promise<any> {
    const { request } = bladeObj;
    const promise = new Promise<void>((resolve, reject) => {
      if (request.hasOwnProperty('result')) {
        return resolve();
      }
      registerOnce(request.id, (response: any) => {
        const { result, error } = destructResponse(response);
        return error ? reject(error) : resolve(result);
      });
    });
    logger.debug('SEND: \n', JSON.stringify(request, null, 2), '\n');
    this._wsClient.send(JSON.stringify(request));

    return promise;
  }

  close() {
    if (this._wsClient) {
      isFunction(this._wsClient._beginClose)
        ? this._wsClient._beginClose()
        : this._wsClient.close();
    }
    this._wsClient = null;
  }

  private _unsetTimer(id: string) {
    clearTimeout(this._timers[id]);
    delete this._timers[id];
  }

  private _handleStringResponse(response: string) {
    if (/^#SP/.test(response)) {
      switch (response[3]) {
        case 'U':
          this.upDur = parseInt(response.substring(4));
          break;
        case 'D':
          this.downDur = parseInt(response.substring(4));
          trigger(
            SwEvent.SpeedTest,
            { upDur: this.upDur, downDur: this.downDur },
            this.session.uuid
          );
          break;
      }
    } else {
      logger.warn('Unknown message from socket', response);
    }
  }
}
