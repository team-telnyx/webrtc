import { IWebRTCCall } from '../webrtc/interfaces';
import { TargetParams } from '../../../utils/interfaces';

export type Environment = 'production' | 'development';
export interface IVertoOptions {
  host?: string;
  project?: string;
  token?: string;
  login?: string;
  passwd?: string;
  password?: string;
  login_token?: string;
  userVariables?: Record<string, any>;
  ringtoneFile?: string;
  ringbackFile?: string;
  env?: Environment;
  iceServers?: RTCIceServer[];
  // Only for internal use
  video?: boolean;
  /**
   * autoReconnect: Determine if the SDK has to re-connect automatically when detecting a gateway connection failure.
   * This is set to`true` as default
   * @type {boolean}
   */
  autoReconnect?: boolean;

  debug?: boolean;
  debugOutput?: 'socket' | 'file';
  /** Enable or disable prefetching ICE candidates. Defaults to true. */
  prefetchIceCandidates?: boolean;
  forceRelayCandidate?: boolean;
  trickleIce?: boolean;
  /**
   * By passing `keepConnectionAliveOnSocketClose` as `true`, the SDK will attempt to keep Peer connection alive
   * when the WebSocket connection is closed unexpectedly (e.g. network interruption, device sleep, etc).
   */
  keepConnectionAliveOnSocketClose?: boolean;
  /**
   * Controls whether the SDK attempts to send BYE for active calls during
   * browser page unload. Enabled by default to preserve graceful call cleanup,
   * but applications that handle page lifecycle themselves can disable it to
   * avoid best-effort unload BYE races.
   *
   * @default true
   */
  hangupOnBeforeUnload?: boolean;
  useCanaryRtcServer?: boolean;
  region?: string;
  /**
   * anonymous_login login options
   */
  anonymous_login?: {
    target_type: string;
    target_id: string;
    target_version_id?: string;
    target_params?: TargetParams;
  };

  /**
   * rtcIp & rtcPort options
   */
  rtcIp?: string;
  rtcPort?: number;
  mutedMicOnStart?: boolean;
  /**
   * Maximum number of automatic socket reconnection attempts after an unexpected
   * disconnect. When the limit is reached, no further automatic reconnects are
   * scheduled and a `telnyx.error` event with code `RECONNECTION_EXHAUSTED` (45003)
   * is emitted. A manual `connect()` call resets the counter and starts a fresh
   * retry sequence.
   *
   * Set to `0` to allow unlimited automatic reconnect attempts.
   * When omitted, defaults to `10`.
   * @default 10
   */
  maxReconnectAttempts?: number;

  /**
   * Enable automatic call quality reporting to voice-sdk-proxy.
   * When enabled, collects WebRTC stats and debug logs during calls.
   * @default true
   */
  enableCallReports?: boolean;
  /**
   * Interval in milliseconds for collecting call statistics after the initial
   * high-resolution startup window.
   * @default 5000 (5 seconds)
   */
  callReportInterval?: number;
  /**
   * Interval in milliseconds for submitting intermediate call reports while a call is active.
   * Set to 0 to disable time-based intermediate reports.
   * @default 180000 (3 minutes)
   */
  callReportFlushInterval?: number;
  /**
   * Minimum log level to capture for call reports.
   * @default 'debug'
   */
  debugLogLevel?: 'debug' | 'info' | 'warn' | 'error';
  /**
   * Maximum number of log entries to buffer per call.
   * @default 1000
   */
  debugLogMaxEntries?: number;
  /**
   * When reconnecting with a stored `voice_sdk_id`, append
   * `?skip_last_voice_sdk_id=true` to the WebSocket URL so VSP routes
   * the connection to a different b2bua-rtc instance instead of sticky-
   * reconnecting to the same one.
   *
   * @default false
   */
  skipLastVoiceSdkId?: boolean;

  /**
   * Maximum time, in milliseconds, that an active-call reconnection attempt
   * may take before the SDK aborts recovery and terminates the call.
   * If omitted or null, reconnection is unlimited.
   *
   * @see IClientOptions.maxTimeoutForReconnectionMs
   */
  maxTimeoutForReconnectionMs?: number | null;

  /**
   * Configuration for media permissions recovery on inbound calls.
   * When enabled and the initial `getUserMedia` call fails while answering,
   * the SDK emits a recoverable `telnyx.error` event with `resume()` and
   * `reject()` callbacks so the app can prompt the user to fix permissions
   * before the call fails.
   */
  mediaPermissionsRecovery?: {
    /** Enable the recovery flow. */
    enabled: boolean;
    /** Maximum time in ms to wait for the app to call `resume()` or `reject()`. Recommended max 25000. */
    timeout: number;
    /** Called when the retry `getUserMedia` succeeds after `resume()`. */
    onSuccess?: () => void;
    /** Called when retry fails, the timeout expires, or the app calls `reject()`. */
    onError?: (error: Error) => void;
  };
}
export interface ILoginParams {
  login?: string;
  password?: string;
  passwd?: string;
  login_token?: string;
  userVariables?: Record<string, any>;
  anonymous_login?: {
    target_type: string;
    target_id: string;
    target_version_id?: string;
    target_params?: TargetParams;
  };
}
export interface SubscribeParams {
  channels?: string[];
  protocol?: string;
  handler?: Function;
  nodeId?: string;
}
export interface BroadcastParams {
  channel?: string;
  protocol?: string;
  data?: object;
  nodeId?: string;
}
export interface IAudioSettings extends MediaTrackConstraints {
  micId?: string;
  micLabel?: string;
}
export interface IVideoSettings extends MediaTrackConstraints {
  camId?: string;
  camLabel?: string;
}
export interface INotificationEventData {
  type: string;
  call?: IWebRTCCall;
  error?: Error;
  errorName?: string;
  errorMessage?: string;
  displayName?: string;
  displayNumber?: string;
  displayDirection?: string;
}

export interface IRequestRPC {
  id: any;
  method?: any;
  params?: any;
}

export interface IResponseRPC {
  id: any;
  result?: {
    params: any;
  };
}

export interface IMessageRPC extends IRequestRPC, IResponseRPC {}
