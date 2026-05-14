import Call from '../Modules/Verto/webrtc/Call';
import {
  Environment,
  INotificationEventData,
} from '../Modules/Verto/util/interfaces';

export interface ICredentials {
  username?: string;
  password?: string;
  token?: string;
}

/**
 * Optional parameters to pass to the target during anonymous login.
 * These are forwarded to voice-sdk-proxy and mapped to custom headers on the SIP INVITE.
 *
 * Known keys are typed explicitly for discoverability and autocomplete.
 * Unknown keys are still accepted and forwarded as-is.
 *
 * @example
 * ```ts
 * target_params: {
 *   conversation_id: 'conv-123',  // → X-AI-Assistant-Conversation-ID
 * }
 * ```
 */
export interface TargetParams {
  /**
   * The conversation ID to join an existing conversation.
   * Mapped to `X-AI-Assistant-Conversation-ID` on the SIP INVITE.
   */
  conversation_id?: string;
  /** Allow additional pass-through parameters. */
  [key: string]: unknown;
}

/**
 * IClientOptions
 * @interface IClientOptions
 */
export interface IClientOptions {
  /**
   * The JSON Web Token (JWT) to authenticate with your SIP Connection.
   * This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).
   */
  login_token?: string;
  /**
   * The `username` to authenticate with your SIP Connection.
   * `login` and `password` will take precedence over
   * `login_token` for authentication.
   */
  login?: string;
  /**
   * The `password` to authenticate with your SIP Connection.
   */
  password?: string;
  /**
   * A URL to a wav/mp3 ringtone file.
   */
  ringtoneFile?: string;
  /**
   * A URL to a wav/mp3 ringback file that will be used when you disable
   * "Generate Ringback Tone" in your SIP Connection.
   */
  ringbackFile?: string;

  /**
   * Enable debug mode for this client.
   * This will gather WebRTC debugging information.
   */
  debug?: boolean;

  /**
   * Debug output option
   */
  debugOutput?: 'socket' | 'file';

  /**
   * Enable or disable prefetching ICE candidates. Defaults to true.
   */
  prefetchIceCandidates?: boolean;

  /**
   * Force the use of a relay ICE candidate.
   */
  forceRelayCandidate?: boolean;

  /**
   * Enable or disable Trickle ICE.
   */
  trickleIce?: boolean;

  /**
   * By passing `keepConnectionAliveOnSocketClose` as `true`, the SDK will attempt to keep Peer connection alive
   * when the WebSocket connection is closed unexpectedly (e.g. network interruption, device sleep, etc).
   */
  keepConnectionAliveOnSocketClose?: boolean;

  /**
   * Region to use for the connection.
   */
  region?: string;

  /**
   * anonymous_login login options
   */
  anonymous_login?: {
    /**
     * A string indicating the target type, for now only `ai_assistant` is supported.
     */
    target_type: string;
    /**
     * The target ID to use for the anonymous login.
     * this is typically the ID of the AI assistant you want to connect to.
     */
    target_id: string;

    /**
     * The target version ID to use for the anonymous login.
     * This is optional and can be used to specify a particular version of the AI assistant.
     */
    target_version_id?: string;

    /**
     * Optional parameters to pass to the target.
     * These are forwarded to voice-sdk-proxy and mapped to custom headers on the SIP INVITE.
     * @see {@link TargetParams}
     */
    target_params?: TargetParams;
  };

  /**
   * RTC connection IP address to use instead of the default one.
   * Useful when using a custom signaling server.
   */
  rtcIp?: string;
  /**
   * RTC connection port to use instead of the default one.
   * Useful when using a custom signaling server.
   */
  rtcPort?: number;

  /**
   *  Use Telnyx's Canary RTC server
   */
  useCanaryRtcServer?: boolean;

  /**
   * When reconnecting with a stored `voice_sdk_id`, append
   * `?skip_last_voice_sdk_id=true` to the WebSocket URL so VSP routes
   * the connection to a different b2bua-rtc instance instead of sticky-
   * reconnecting to the same one. Useful when retrying after errors
   * caused by stale state on a specific b2bua-rtc node.
   *
   * @default false
   */
  skipLastVoiceSdkId?: boolean;

  /**
   *  Environment to use for the connection.
   *  So far this property is only for internal purposes.
   */
  env?: Environment;

  /**
   * ICE Servers to use for all calls within the client connection. Overrides the default ones.
   */
  iceServers?: RTCIceServer[];

  /**
   * Disabled microphone by default when the call starts or adding a new audio source.
   */
  mutedMicOnStart?: boolean;

  /**
   * Maximum number of automatic socket reconnection attempts after an unexpected
   * disconnect. When the limit is reached, no further automatic reconnects are
   * scheduled and a `telnyx.error` event with code `RECONNECTION_EXHAUSTED` (45003)
   * is emitted. A manual `connect()` call resets the counter and starts a fresh
   * retry sequence.
   *
   * Set to `0` or omit to allow unlimited automatic reconnect attempts (default).
   * @default 0 (unlimited)
   */
  maxReconnectAttempts?: number;

  /**
   * Enable automatic call quality reporting to voice-sdk-proxy.
   * When enabled, WebRTC stats are collected periodically during calls
   * and posted to the voice-sdk-proxy /call_report endpoint when the call ends.
   *
   * @default true
   */
  enableCallReports?: boolean;

  /**
   * Interval in milliseconds for collecting call statistics.
   * Stats are aggregated over each interval and stored locally until call end.
   *
   * @default 5000 (5 seconds)
   */
  callReportInterval?: number;

  /**
   * Configuration for media permissions recovery on inbound calls.
   * When enabled and the initial `getUserMedia` call fails while answering,
   * the SDK emits a recoverable `telnyx.error` event with `resume()` and
   * `reject()` callbacks so the app can prompt the user to fix permissions
   * before the call fails.
   *
   * Recovery is attempted only for inbound calls. If the app calls
   * `resume()`, the SDK retries `getUserMedia`. If the app calls `reject()`
   * or does not respond before `timeout`, recovery fails and the call is
   * terminated with the usual media error flow.
   *
   * @example
   * ```js
   * import {isMediaRecoveryErrorEvent} from "@telnyx/webrtc"
   *
   * const client = new TelnyxRTC({
   *   login_token: '...',
   *   mediaPermissionsRecovery: {
   *     enabled: true,
   *     timeout: 20000,
   *     onSuccess: () => console.log('Media recovered'),
   *     onError: (err) => console.error('Recovery failed', err),
   *   },
   * });
   *
   * client.on('telnyx.error', (event) => {
   *   if (isMediaRecoveryErrorEvent(event)) {
   *     showPermissionDialog({
   *       onContinue: () => event.resume(),
   *       onCancel: () => event.reject?.(),
   *     });
   *   }
   * });
   * ```
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

/**
 * ICallOptions
 * @interface ICallOptions
 */
export interface ICallOptions {
  /**
   * Phone number or SIP URI to dial.
   */
  destinationNumber?: string;
  /**
   * Number to use as the caller ID when dialing out to a destination. A valid phone number is required for dials out to PSTN numbers.
   */
  callerNumber?: string;
  /**
   * Name to use as the caller ID name when dialing out to a destination.
   */
  callerName?: string;
  /**
   * Custom ID to identify the call. This will be used as the `callID` in place of the UUID generated by the client.
   */
  id?: string;
  /**
   * Telnyx Call Control ID, if using Call Control services.
   */
  telnyxCallControlId?: string;
  /**
   * Telnyx call session ID, if using Call Control services.
   */
  telnyxSessionId?: string;
  /**
   * Telnyx call leg ID, if using Call Control services.
   */
  telnyxLegId?: string;
  /**
   *
   * Telnyx's Call Control client_state. Can be used with Connections with Advanced -> Events enabled.
   * `clientState` string should be base64 encoded.
   */
  clientState?: string;
  /**
   * If set, the call will use this stream instead of retrieving a new one.
   */
  localStream?: MediaStream;
  /**
   * If set, the call will use this stream instead of retrieving a new one.
   */
  remoteStream?: MediaStream;
  /**
   * Overrides client's default `localElement`.
   */
  localElement?: HTMLMediaElement | string;
  /**
   * Overrides client's default `remoteElement`.
   */
  remoteElement?: HTMLMediaElement | string;
  /**
   * Overrides client's default `iceServers` to use for certain call.
   */
  iceServers?: RTCIceServer[];
  /**
   * Overrides client's default audio constraints. Defaults to `true`
   */
  audio?: boolean | MediaTrackConstraints;
  /**
   * Overrides client's default video constraints. Defaults to `false`
   */
  video?: boolean;
  /**
   * Uses stereo audio instead of mono.
   */
  useStereo?: boolean;
  /**
   * `deviceId` to use as microphone. Overrides the client's default one.
   */
  micId?: string;
  /**
   * `deviceId` to use as webcam. Overrides the client's default one.
   */
  camId?: string;
  /**
   * `deviceId` to use as speaker. Overrides the client's default one.
   */
  speakerId?: string;
  /**
   * Overrides client's default `telnyx.notification` handler for this call.
   */
  onNotification?: Function;

  /**
   * Configures media (audio/video) in a call.
   */
  mediaSettings?: {
    useSdpASBandwidthKbps?: boolean;
    sdpASBandwidthKbps?: number;
  };

  /**
   * Add custom headers to the INVITE and ANSWER request.
   */
  customHeaders?: { name: string; value: string }[];

  /**
   * Enable debug mode for this call.
   */
  debug?: boolean;

  /**
   * Output debug logs to a file.
   */
  debugOutput?: 'socket' | 'file';

  /**
   * Preferred codecs for the call.
   */
  preferred_codecs?: RTCRtpCodecCapability[];

  /**
   * Enable or disable ICE Candidate Prefetching. Defaults to true.
   */
  prefetchIceCandidates?: boolean;

  /**
   * Force the use of a relay ICE candidate.
   */
  forceRelayCandidate?: boolean;

  /**
   * Enable or disable Trickle ICE.
   */
  trickleIce?: boolean;

  /**
   * @deprecated Use only IClientOptions.keepConnectionAliveOnSocketClose
   * By passing `keepConnectionAliveOnSocketClose` as `true`, the SDK will attempt to keep Peer connection alive
   * when the WebSocket connection is closed unexpectedly (e.g. network interruption, device sleep, etc).
   */
  keepConnectionAliveOnSocketClose?: boolean;
}

/**
 *
 * An event dispatched by Telnyx to notify the client of changes to the session or call.
 *
 * The conditions of the event can be identified by the `type` property.
 *
 * | `type` | Description | Additional properties |
 * |---|---|---|
 * | `callUpdate` | A call has changed state | `call` |
 * | `userMediaError` | The browser does not have permission to access media devices | `error` |
 *
 * @examples
 *
 * Usage with TelnyxRTC Client `.on`:
 * ```js
 * client.on('telnyx.notification', (notification) => {
 *   if (notification.type === 'callUpdate') {
 *     console.log(notification.call);
 *
 *     // Do something with the call and update UI accordingly
 *   } else if (notification.type === 'userMediaError') {
 *     console.log(notification.error);
 *
 *     // Handle the error and update UI accordingly
 *   }
 * });
 * ```
 *
 * ### Data structure
 *
 * The notification structure is determined by its `type`.
 *
 * #### `callUpdate`
 *
 * ```js
 * {
 *   type: 'callUpdate',
 *   call: Call // current call
 * }
 * ```
 *
 * #### `userMediaError`
 *
 * ```js
 * {
 *   type: 'userMediaError',
 *   error: Error
 * }
 * ```
 *
 * @category Notification
 * @apialias Notification
 * @internalnote {see NOTIFICATION_TYPE}
 */
export interface INotification extends Omit<INotificationEventData, 'call'> {
  /**
   * Identifies the event case.
   */
  type: string;
  /**
   * The current call. Reference this call state to update your UI.
   * See `Call` documentation.
   */
  call?: Call;
  /**
   * Error from the `userMediaError` event.
   * Check your `audio` and `video` constraints for browser support.
   */
  error?: Error;
}
