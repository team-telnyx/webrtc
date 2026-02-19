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

let WebSocketClass: typeof WebSocket | null =
  typeof WebSocket !== 'undefined' ? WebSocket : null;
export const setWebSocket = (websocket: typeof WebSocket): void => {
  WebSocketClass = websocket;
};

const WS_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

/**
 * Safety timeout (ms) for forcing socket cleanup when ws.close()
 * gets stuck in CLOSING state during a network switch scenario.
 * Chrome can wait up to 60s before firing onclose after a network
 * interface change (e.g. WiFi → Mobile Hotspot).
 */
const CLOSE_SAFETY_TIMEOUT_MS = 5000;

export default class Connection {
  public previousGatewayState = '';
  private _wsClient: WebSocket | null = null;
  private _host: string = PROD_HOST;
  private _timers: { [id: string]: any } = {};
  private _useCanaryRtcServer: boolean = false;
  private _hasCanaryBeenUsed: boolean = false;

  private _safetyTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _isNetworkSwitch: boolean = false;
  private _reconnecting: boolean = false;

  public upDur: number = null;
  public downDur: number = null;

  constructor(public session: BaseSession) {
    const { host, env, region, useCanaryRtcServer } = session.options;

    if (env) {
      this._host = env === 'development' ? DEV_HOST : PROD_HOST;
    }

    if (host) {
      this._host = checkWebSocketHost(host);
    }

    if (region) {
      this._host = this._host.replace(/rtc(dev)?/, `${region}.rtc$1`);
    }

    if (useCanaryRtcServer) {
      this._useCanaryRtcServer = true;
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

  /**
   * Mark the connection as undergoing a network switch.
   * Called by BrowserSession when offline/online events fire.
   */
  setNetworkSwitch(value: boolean): void {
    this._isNetworkSwitch = value;
  }

  connect() {
    const websocketUrl = new URL(this._host);
    let reconnectToken = getReconnectToken();

    if (this.session.options.rtcIp && this.session.options.rtcPort) {
      reconnectToken = null;
      this._useCanaryRtcServer = false;
      websocketUrl.searchParams.set('rtc_ip', this.session.options.rtcIp);
      websocketUrl.searchParams.set(
        'rtc_port',
        this.session.options.rtcPort.toString()
      );
    }

    if (reconnectToken) {
      websocketUrl.searchParams.set('voice_sdk_id', reconnectToken);
    }

    if (this._useCanaryRtcServer) {
      websocketUrl.searchParams.set('canary', 'true');

      if (reconnectToken && !this._hasCanaryBeenUsed) {
        websocketUrl.searchParams.delete('voice_sdk_id');
        logger.debug('first canary connection. Refreshing voice_sdk_id');
      }

      this._hasCanaryBeenUsed = true;
    }

    this._wsClient = new WebSocketClass(websocketUrl.toString());
    this._registerSocketEvents(this._wsClient);
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
      // @ts-expect-error polyfill
      isFunction(this._wsClient._beginClose)
        ? // @ts-expect-error polyfill
          this._wsClient._beginClose()
        : this._wsClient.close();

      // For network switch scenarios, add a safety timeout in case
      // Chrome's onclose takes up to 60s to fire after interface change.
      if (this._isNetworkSwitch) {
        this._clearSafetyTimeout();
        this._safetyTimeoutId = setTimeout(
          () => this._handleCloseTimeout(),
          CLOSE_SAFETY_TIMEOUT_MS
        );
      } else {
        // Normal (non-network-switch) close: null immediately as before
        this._wsClient = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: socket event registration
  // ---------------------------------------------------------------------------

  private _registerSocketEvents(ws: WebSocket): void {
    ws.onopen = (event): boolean => {
      this._isNetworkSwitch = false;
      this._reconnecting = false;
      return trigger(SwEvent.SocketOpen, event, this.session.uuid);
    };

    ws.onclose = (event): boolean => {
      this._clearSafetyTimeout();
      this._wsClient = null;
      this._reconnecting = false;
      return trigger(SwEvent.SocketClose, event, this.session.uuid);
    };

    ws.onerror = (event): boolean =>
      trigger(
        SwEvent.SocketError,
        { error: event, sessionId: this.session.sessionid },
        this.session.uuid
      );

    ws.onmessage = (event): void => {
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

  private _deregisterSocketEvents(): void {
    if (!this._wsClient) return;
    this._wsClient.onopen = null;
    this._wsClient.onclose = null;
    this._wsClient.onerror = null;
    this._wsClient.onmessage = null;
  }

  // ---------------------------------------------------------------------------
  // Private: safety timeout for stuck CLOSING state
  // ---------------------------------------------------------------------------

  private _clearSafetyTimeout(): void {
    if (this._safetyTimeoutId) {
      clearTimeout(this._safetyTimeoutId);
      this._safetyTimeoutId = null;
    }
  }

  /**
   * Called when the safety timeout fires after close() during a network switch.
   * If the socket is still stuck in CLOSING, forcefully clean up and emit
   * SocketClose so the reconnection flow can proceed.
   */
  private _handleCloseTimeout(): void {
    this._safetyTimeoutId = null;

    if (!this._wsClient) return;

    const state = this._wsClient.readyState;

    if (state === WS_STATE.CLOSING) {
      logger.warn(
        'Socket close timeout after 5s — forcefully cleaning up (network switch)'
      );
      this._deregisterSocketEvents();
      this._wsClient = null;
      trigger(
        SwEvent.SocketClose,
        { code: 1006, reason: 'close_timeout', wasClean: false },
        this.session.uuid
      );
    } else if (state === WS_STATE.CLOSED) {
      // Already closed but onclose didn't fire — just clean up the reference
      logger.warn('Socket already closed but onclose handler did not fire');
      this._deregisterSocketEvents();
      this._wsClient = null;
    }
    // If OPEN or CONNECTING, something reconnected — leave it alone
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
