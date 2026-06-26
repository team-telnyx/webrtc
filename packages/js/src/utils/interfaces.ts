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
 * `conversation_id` is not a customer-defined correlation ID. Set it only
 * when you want the WebRTC call to join an existing Telnyx AI conversation
 * that belongs to the same project/account. Omit it to start a new AI
 * Assistant conversation.
 *
 * @example Start a new AI Assistant conversation (most common)
 * ```ts
 * anonymous_login: {
 *   target_id: 'assistant-UUID',
 *   target_type: 'ai_assistant',
 * }
 * ```
 *
 * @example Join an existing Telnyx AI conversation
 * ```ts
 * anonymous_login: {
 *   target_id: 'assistant-UUID',
 *   target_type: 'ai_assistant',
 *   target_params: {
 *     conversation_id: 'existing-telnyx-conversation-id', // → X-AI-Assistant-Conversation-ID
 *   },
 * }
 * ```
 */
export interface TargetParams {
  /**
   * Telnyx AI conversation ID to join.
   *
   * When omitted, the TeXML endpoint starts a new conversation by rendering
   * `<AIAssistant id="...">`. When provided, voice-sdk-proxy maps the value
   * to `X-AI-Assistant-Conversation-ID` on the SIP INVITE, and the TeXML
   * endpoint renders `<AIAssistant join="...">` to attach the call to that
   * existing conversation.
   *
   * Do not use this field for application session tracking or as an external
   * correlation ID. If the ID does not exist, or does not belong to the caller's
   * project/account, the join attempt fails (for example with AI Assistant
   * error code `10007`: `The conversation does not exist or does not belong to
   * this user`).
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
   * Preferred audio/video codecs for calls created by this client. When omitted,
   * audio defaults to Opus first with the remaining browser-supported codecs as
   * fallbacks.
   */
  preferred_codecs?: RTCRtpCodecCapability[];

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
   * Controls whether the SDK attempts to send BYE for active calls during
   * browser page unload. Enabled by default to preserve graceful call cleanup,
   * but applications that handle page lifecycle themselves can disable it to
   * avoid best-effort unload BYE races.
   *
   * @default true
   */
  hangupOnBeforeUnload?: boolean;

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
     * Use `target_params.conversation_id` only to join an existing Telnyx AI
     * conversation; omit it to start a new conversation.
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
   * When set to `true`, appends `skip_trailing=true` to the VSP WebSocket
   * URL so VSP skips pre-routing identity resolution (telephony-tokens
   * validation and UsersClass trailing checks) for this connection.
   *
   * This is intended for internal/test-infra usage (e.g. BBT-generated
   * credentials) where the connection should not participate in trailing
   * release routing. The actual login still goes to the upstream RTC
   * service for normal authentication — this only skips VSP's pre-routing
   * lookup used for trailing target selection.
   *
   * @default false
   */
  skipTrailing?: boolean;

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
   * Set to `0` to allow unlimited automatic reconnect attempts.
   * When omitted, defaults to `10`.
   * @default 10
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
   * Interval in milliseconds for collecting call statistics after the initial
   * high-resolution startup window. Stats are aggregated over each interval
   * and submitted as intermediate reports while the call is active.
   *
   * @default 5000 (5 seconds)
   */
  callReportInterval?: number;

  /**
   * Interval in milliseconds for submitting intermediate call reports while a call is active.
   * Set to 0 to disable time-based intermediate reports.
   *
   * @default 180000 (3 minutes)
   */
  callReportFlushInterval?: number;

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
   * Preferred codecs for the call. When omitted, audio defaults to Opus first
   * with the remaining browser-supported codecs as fallbacks.
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
