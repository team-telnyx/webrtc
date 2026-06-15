import BaseSession from '../BaseSession';
import {
  DEV_HOST,
  PROD_HOST,
  SwEvent,
  WS_CLOSE_CODES,
  WEBSOCKET_CONNECTION_FAILED,
  WEBSOCKET_ERROR,
} from '../util/constants';
import {
  createTelnyxError,
  RequestTimeoutError,
  StaleRequestError,
} from '../util/errors';
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
import { deRegister, registerOnce, trigger } from './Handler';

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
 * gets stuck in CLOSING state. Sockets can get stuck due to various
 * reasons including network changes, browser bugs, or system sleep.
 */
const CLOSE_SAFETY_TIMEOUT_MS = 5000;

export default class Connection {
  public previousGatewayState = '';
  /** Timestamp (Date.now()) of the last inbound WS message — any parsed message, not just pongs. */
  public lastInboundAt: number = 0;
  /**
   * Monotonically increasing generation counter, incremented each time a new
   * WebSocket is created. Used to detect stale request timeouts from a
   * previous socket that should not affect the current connection.
   */
  public socketGeneration: number = 0;
  private _wsClient: WebSocket | null = null;
  private _host: string = PROD_HOST;
  private _timers: { [id: string]: ReturnType<typeof setTimeout> } = {};
  private _useCanaryRtcServer: boolean = false;
  private _hasCanaryBeenUsed: boolean = false;

  private _safetyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Set of request IDs with pending one-shot handlers registered via
   * registerOnce(). Cleaned up on socket close so stale responses or
   * timeouts from a previous connection cannot affect the current one.
   */
  private _pendingRequestIds: Set<string> = new Set();
  private _pendingRequestTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();
  private _pendingRequestRejecters: Map<
    string,
    { reject: (reason?: unknown) => void; generation: number }
  > = new Map();

  public upDur: number | null = null;
  public downDur: number | null = null;

  /**
   * Default timeout (ms) for signaling-critical JSON-RPC requests during
   * active calls. When exceeded, the promise rejects and the session is
   * notified so it can trigger signaling-health recovery.
   * Can be overridden per-request via `send(bladeObj, timeoutMs)`.
   */
  public static DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

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
    return !!this._wsClient && this._wsClient.readyState === WS_STATE.OPEN;
  }

  get connecting(): boolean {
    return (
      !!this._wsClient && this._wsClient.readyState === WS_STATE.CONNECTING
    );
  }

  get closing(): boolean {
    return !!this._wsClient && this._wsClient.readyState === WS_STATE.CLOSING;
  }

  get closed(): boolean {
    return !!this._wsClient && this._wsClient.readyState === WS_STATE.CLOSED;
  }

  get isAlive(): boolean {
    return this.connecting || this.connected;
  }

  get isDead(): boolean {
    return this.closing || this.closed;
  }

  get host(): string {
    return this._host;
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

    // Snapshot the owning session's voice_sdk_id for call report uploads.
    this.session.callReportVoiceSdkId =
      websocketUrl.searchParams.get('voice_sdk_id');

    // When explicitly requested and reconnecting with a voice_sdk_id,
    // ask VSP to route to a different b2bua-rtc instance instead of
    // sticky-reconnecting to the same one.
    if (
      this.session.options.skipLastVoiceSdkId &&
      websocketUrl.searchParams.has('voice_sdk_id')
    ) {
      websocketUrl.searchParams.set('skip_last_voice_sdk_id', 'true');
    }

    // When skipTrailing is set, tell VSP to skip pre-routing identity
    // resolution (telephony-tokens validation and UsersClass trailing
    // checks) for this connection. Used by internal/test-infra (e.g. BBT)
    // where the connection should not participate in trailing routing.
    if (this.session.options.skipTrailing) {
      websocketUrl.searchParams.set('skip_trailing', 'true');
    }

    try {
      const previousSocketGeneration = this.socketGeneration;
      this._wsClient = new WebSocketClass(websocketUrl.toString());
      this.socketGeneration += 1;
      logger.debug('WebSocket connection created', {
        sessionId: this.session.sessionid,
        voiceSdkId: this.session.callReportVoiceSdkId,
        socketGeneration: this.socketGeneration,
        reconnectCount: previousSocketGeneration,
      });
      this.lastInboundAt = 0;
      this._cleanupPendingRequests();
      this._registerSocketEvents(this._wsClient);
    } catch (error) {
      logger.error('WebSocket connection failed:', error);
      const telnyxError = createTelnyxError(WEBSOCKET_CONNECTION_FAILED, error);
      trigger(
        SwEvent.Error,
        { error: telnyxError, sessionId: this.session.sessionid },
        this.session.uuid
      );
    }
  }

  sendRawText(request: string): void {
    this._wsClient?.send(request);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(bladeObj: any, timeoutMs?: number): Promise<any> {
    const { request } = bladeObj;
    const currentGeneration = this.socketGeneration;
    const method = request.method || '';

    const promise = new Promise<void>((resolve, reject) => {
      if (request.hasOwnProperty('result')) {
        return resolve();
      }

      let timedOut = false;
      let timerId: ReturnType<typeof setTimeout> | null = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (response: any) => {
        if (timerId !== null) {
          clearTimeout(timerId);
          this._pendingRequestTimers.delete(request.id);
          timerId = null;
        }
        this._pendingRequestIds.delete(request.id);
        this._pendingRequestRejecters.delete(request.id);
        if (timedOut) {
          // Response arrived after timeout — discard silently
          return;
        }
        const { result, error } = destructResponse(response);
        return error ? reject(error) : resolve(result);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerOnce(request.id, handler as any);
      this._pendingRequestIds.add(request.id);
      this._pendingRequestRejecters.set(request.id, {
        reject,
        generation: currentGeneration,
      });

      if (timeoutMs && timeoutMs > 0) {
        timerId = setTimeout(() => {
          timedOut = true;
          timerId = null;
          this._pendingRequestTimers.delete(request.id);
          this._pendingRequestRejecters.delete(request.id);
          // Remove the handler from the queue so a late response
          // doesn't call into a stale closure.
          deRegister(request.id, handler);
          this._pendingRequestIds.delete(request.id);

          // If the socket has been replaced since this request was sent,
          // the timeout is stale — settle the promise with a
          // StaleRequestError so callers never hang forever, but do NOT
          // trigger signaling recovery (the new socket is healthy).
          if (this.socketGeneration !== currentGeneration) {
            logger.debug(
              `Stale request timeout for ${request.id} (gen ${currentGeneration}, current ${this.socketGeneration}) — settling with StaleRequestError`
            );
            reject(
              new StaleRequestError(
                request.id,
                currentGeneration,
                this.socketGeneration
              )
            );
            return;
          }

          reject(new RequestTimeoutError(request.id, timeoutMs, method));
        }, timeoutMs);
        this._pendingRequestTimers.set(request.id, timerId);
      }
    });
    logger.debug('SEND: \n', JSON.stringify(request, null, 2), '\n');
    this._wsClient?.send(JSON.stringify(request));

    return promise;
  }

  close() {
    if (!this._wsClient || this.closing) return;

    // Clean up pending request handlers before initiating close
    this._cleanupPendingRequests();

    // Capture socket reference for timeout handler (prevent race condition)
    const closingSocket = this._wsClient;

    // Call close
    // @ts-expect-error polyfill
    isFunction(this._wsClient._beginClose)
      ? // @ts-expect-error polyfill
        this._wsClient._beginClose()
      : this._wsClient.close();

    if (this._safetyTimeoutId) return;

    this._safetyTimeoutId = setTimeout(
      () => this._handleCloseTimeout(closingSocket),
      CLOSE_SAFETY_TIMEOUT_MS
    );
  }

  private _registerSocketEvents(ws: WebSocket): void {
    // Capture the generation at registration time — when this socket's
    // event handlers are being attached — not at event-dispatch time.
    // If a reconnect creates a new socket (incrementing socketGeneration)
    // before this old socket's close/error handler runs, reading
    // this.socketGeneration inside the handler would return the new
    // generation, causing onNetworkClose to treat the stale event as a
    // new reconnect attempt.
    const registeredGeneration = this.socketGeneration;

    ws.onopen = (event): boolean => {
      return trigger(SwEvent.SocketOpen, event, this.session.uuid);
    };

    ws.onclose = (event): boolean => {
      this._clearSafetyTimeout();
      this._safetyCleanupSocket(ws, 'close');
      const enriched = Object.assign({}, event, {
        socketGeneration: registeredGeneration,
      });
      return trigger(SwEvent.SocketClose, enriched, this.session.uuid);
    };

    ws.onerror = (event): boolean => {
      this._clearSafetyTimeout();
      this._safetyCleanupSocket(ws, 'error');

      // Emit structured error alongside the legacy SocketError
      const telnyxError = createTelnyxError(WEBSOCKET_ERROR);
      trigger(
        SwEvent.Error,
        { error: telnyxError, sessionId: this.session.sessionid },
        this.session.uuid
      );

      return trigger(
        SwEvent.SocketError,
        {
          error: event,
          sessionId: this.session.sessionid,
          socketGeneration: registeredGeneration,
        },
        this.session.uuid
      );
    };

    ws.onmessage = (event): void => {
      // Track ALL inbound WS message activity BEFORE parsing.
      //
      // Intentional: any bytes arriving on the WebSocket (even malformed
      // or unexpected payloads) prove TCP liveness of the socket. The
      // signaling health monitor uses this to detect half-dead sockets
      // where the WS reports OPEN but no frames arrive at all.
      //
      // If we only marked activity after JSON parse, a stream of
      // non-JSON frames (e.g. speed test strings like "#SPU123") would
      // not resolve health probes, even though the socket is clearly
      // alive. Since any inbound frame proves the transport is working,
      // pre-parse activity tracking is correct.
      this.lastInboundAt = Date.now();

      // Emit internal activity event so BaseSession can use it for
      // signaling health monitoring without relying on SwEvent.SocketMessage
      // (which is only triggered for unhandled/unrouted messages).
      trigger(
        SwEvent.SocketActivity,
        { timestamp: this.lastInboundAt },
        this.session.uuid
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg: any = safeParseJson(event.data);
      if (typeof msg === 'string') {
        this._handleStringResponse(msg);
        return;
      }

      if (msg.voice_sdk_id) {
        this.session.callReportVoiceSdkId = msg.voice_sdk_id;
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
        GatewayStateType[
          `${msg?.result?.params?.state as keyof typeof GatewayStateType}`
        ] ||
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

  private _deregisterSocketEvents(ws: WebSocket): void {
    ws.onopen = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
  }

  /**
   * Called when the safety timeout fires after close().
   * If the socket is still stuck in CLOSING, forcefully clean up and emit
   * SocketClose so the reconnection flow can proceed.
   * @param closingSocket The socket that was being closed when timeout was set
   */
  private _handleCloseTimeout(closingSocket: WebSocket): void {
    this._safetyTimeoutId = null;

    if (!closingSocket || closingSocket.readyState === WS_STATE.CLOSED) {
      logger.warn(
        'Safety timeout fired but socket is already closed or cleaned up'
      );
      return;
    }

    logger.warn('Socket stuck in CLOSING after 5s — forcefully cleaning up');
    this._deregisterSocketEvents(closingSocket);
    this._safetyCleanupSocket(closingSocket, 'timeout');

    if (!this._wsClient || this._wsClient === closingSocket) {
      trigger(
        SwEvent.SocketClose,
        {
          code: WS_CLOSE_CODES.ABNORMAL_CLOSURE,
          reason:
            'STUCK_WS_TIMEOUT: Socket got stuck in CLOSING state and was forcefully cleaned up by safety timeout',
          wasClean: false,
          socketGeneration: this.socketGeneration,
        },
        this.session.uuid
      );
    }
  }

  private _clearSafetyTimeout(): void {
    if (this._safetyTimeoutId) {
      logger.debug('Clearing safety timeout');
      clearTimeout(this._safetyTimeoutId);
      this._safetyTimeoutId = null;
    }
  }

  /**
   * Safely cleanup socket reference only if it matches the current socket.
   * This prevents race conditions where old socket events null out new sockets.
   * @param ws The WebSocket to cleanup
   * @param reason Why the cleanup is happening ('close', 'error', or 'timeout')
   */
  private _safetyCleanupSocket(
    ws: WebSocket,
    reason: 'close' | 'error' | 'timeout'
  ): void {
    if (this._wsClient === ws) {
      logger.debug(`Nulling socket reference (reason: ${reason})`);
      this._wsClient = null;
    } else {
      logger.debug(
        `Skipping socket cleanup - old socket already replaced (reason: ${reason})`
      );
    }
  }

  /**
   * Remove all pending request handlers from the global handler queue.
   * Called on socket close and before a new connection is established
   * to ensure stale responses/timeouts from a previous socket cannot
   * affect the current connection.
   */
  private _cleanupPendingRequests(): void {
    Array.from(this._pendingRequestIds).forEach((id) => {
      deRegister(id);
      const timerId = this._pendingRequestTimers.get(id);
      const pending = this._pendingRequestRejecters.get(id);

      if (timerId) {
        clearTimeout(timerId);
        this._pendingRequestTimers.delete(id);

        // Only timeout-managed requests are rejected here. Legacy fire-and-forget
        // requests without a timeout may intentionally have no rejection handler;
        // rejecting them on close/reconnect would create unhandled rejections.
        if (pending) {
          pending.reject(
            new StaleRequestError(id, pending.generation, this.socketGeneration)
          );
        }
      }

      this._pendingRequestRejecters.delete(id);
    });
    this._pendingRequestIds.clear();
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
