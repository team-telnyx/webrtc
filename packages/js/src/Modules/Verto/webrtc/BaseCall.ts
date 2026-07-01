import { WebRTCStats } from '@peermetrics/webrtc-stats';
import { v4 as uuidv4 } from 'uuid';
import pkg from '../../../../package.json';
import BrowserSession from '../BrowserSession';
import BaseMessage from '../messages/BaseMessage';

import {
  CallReportCollector,
  type IClientSummary,
  type SanitizedClientOption,
  type ICallReportFlushReason,
  type ICallReportPayload,
} from './CallReportCollector';
import { MediaDeviceCollector } from './MediaDeviceCollector';
import {
  Answer,
  Attach,
  Bye,
  Candidate,
  EndOfCandidates,
  Info,
  Invite,
  Modify,
} from '../messages/Verto';
import { deRegister, register, trigger } from '../services/Handler';
import {
  SwEvent,
  BYE_SEND_FAILED,
  HOLD_FAILED,
  ICE_RESTART_FAILED,
  SDP_SET_REMOTE_DESCRIPTION_FAILED,
  SDP_SEND_FAILED,
  ONLY_HOST_ICE_CANDIDATES,
  ANSWER_WHILE_PEER_ACTIVE,
  DUPLICATE_INBOUND_ANSWER,
  HAS_NON_HOST_ICE_CANDIDATE_REGEX,
  UNEXPECTED_ERROR,
  LOW_BYTES_RECEIVED,
  LOW_BYTES_SENT,
  AUDIO_INPUT_DEVICE_CHANGE_SKIPPED,
} from '../util/constants';
import {
  classifyMediaErrorCode,
  createTelnyxError,
  createTelnyxWarning,
  TelnyxError,
} from '../util/errors';
import { ITelnyxWarning } from '../util/constants/warnings';
import { isFunction, mutateLiveArrayData, objEmpty } from '../util/helpers';
import { INotificationEventData } from '../util/interfaces';
import { getIceCandidateErrorDetails } from '../util/debug';
import logger from '../util/logger';
import { enqueuePendingReport } from '../util/CallReportStorage';
import {
  attachMediaStream,
  detachMediaStream,
  getUserMedia,
  setMediaElementSinkId,
  stopStream,
} from '../util/webrtc';
import Call from './Call';
import { MCULayoutEventHandler } from './LayoutHandler';
import { callMarkName, clearCallMarks } from './CallEstablishmentTimings';
import Peer from './Peer';
import {
  ConferenceAction,
  DEFAULT_CALL_OPTIONS,
  Direction,
  NOTIFICATION_TYPE,
  PeerType,
  Role,
  State,
  VertoMethod,
  VertoModifyAction,
} from './constants';
import {
  checkSubscribeResponse,
  createAudio,
  disableAudioTracks,
  disableVideoTracks,
  enableAudioTracks,
  enableVideoTracks,
  getStreamTrackDebugInfo,
  getTrackDebugInfo,
  playAudio,
  stopAudio,
  toggleAudioTracks,
  toggleVideoTracks,
} from './helpers';
import {
  AnswerParams,
  IAudio,
  IHangupParams,
  IStatsBinding,
  IVertoCallOptions,
  IWebRTCCall,
} from './interfaces';
const SDK_VERSION = pkg.version;
const BYE_TIMEOUT_MS = 5000;

/**
 * @ignore Hide in docs output
 */
export default abstract class BaseCall implements IWebRTCCall {
  private _webRTCStats: WebRTCStats | null;
  private _callReportCollector: CallReportCollector | null = null;
  private _mediaDeviceCollector: MediaDeviceCollector | null = null;

  /**
   * The call identifier.
   */
  public id: string = '';

  /**
   * The call ID of the previous call that this call is recovering from.
   * Present only when the call was created as part of a reattachment/recovery
   * flow (e.g. after a network reconnection).
   *
   * Use this to match the new call object to the ended/destroyed call
   * and prevent duplicate UI elements such as dialers.
   *
   * @example
   * ```js
   * client.on('telnyx.notification', (notification) => {
   *   if (notification.type === 'callUpdate') {
   *     const call = notification.call;
   *     if (call.recoveredCallId) {
   *       // This call replaced a previous call after recovery
   *       // Remove the old dialer for call.recoveredCallId
   *       removeDialer(call.recoveredCallId);
   *     }
   *   }
   * });
   * ```
   */
  public recoveredCallId: string = '';

  /**
   * The `state` of the call.
   *
   * | Value | Description |
   * |---|---|
   * | `new` | New call has been created in the client. |
   * | `trying` | It's attempting to call someone. |
   * | `requesting` | The outbound call is being sent to the server. |
   * | `recovering` | The previous call is recovering after the page refreshes. If the user refreshes the page during a call, it will automatically join the latest call. |
   * | `ringing` | Someone is attempting to call you. |
   * | `answering` | You are attempting to answer this inbound call. |
   * | `early` | It receives the media before the call has been answered. |
   * | `active` | Call has become active. |
   * | `held` | Call has been held. |
   * | `hangup` | Call has ended. |
   * | `destroy` | Call has been destroyed. |
   * | `purge` | Call has been purged. |
   *
   */
  public state: string = State[State.New];

  /**
   * The previous state of the call.
   * See `Call.state` for all possible values.
   */
  public prevState: string = '';

  /**
   * The direction of the call.
   * Can be either `inbound` or `outbound`.
   */
  public direction: Direction;

  public peer: Peer;

  public options: IVertoCallOptions;

  public cause: string;

  public causeCode: number;

  public sipReason: string;

  public sipCode: number;

  public sipCallId: string;

  public channels: string[] = [];

  public role: string = Role.Participant;

  public extension: string = null;

  get creatingPeer(): boolean {
    return this._creatingPeer;
  }

  /**
   * Indicates if the peer connection's signaling state has transitioned to 'closed'
   * while the connection was previously active. Used to determine if the call
   * can be recovered on reconnection.
   */
  get signalingStateClosed(): boolean {
    return this._signalingStateClosed;
  }

  private _state: State = State.New;

  private _prevState: State = State.New;

  private gotAnswer: boolean = false;

  private gotEarly: boolean = false;

  private _lastSerno: number = 0;

  private _targetNodeId: string = null;

  private _iceTimeout = null;

  private _ringtone: IAudio;

  private _ringback: IAudio;

  private _statsBindings: IStatsBinding[] = [];

  private _statsIntervalId: NodeJS.Timeout | null = null;

  private _pendingIceCandidates: Array<
    RTCIceCandidateInit | RTCIceCandidate | null
  > = [];

  private _isRemoteDescriptionSet: boolean = false;

  private _signalingStateClosed: boolean = false;

  private _creatingPeer: boolean = false;

  /**
   * Durable call-level desired mute state for the microphone.
   * Initialized from `mutedMicOnStart`, then updated by muteAudio()/unmuteAudio()
   * and the explicit `muted` arg of setAudioInDevice().
   * Applied to every local audio track the SDK creates or replaces so that
   * ICE restart, device switch, reattach, and renegotiation never
   * accidentally un-mute the mic.
   */
  private _desiredAudioMuted: boolean = false;

  private _firstCandidateSent: boolean = false;

  private _firstNonHostCandidateSent: boolean = false;

  private _isRecovering: boolean = false;

  private _captureHangupCallerStack(): string[] {
    const stack = new Error('Call.hangup caller').stack;

    if (!stack) {
      return [];
    }

    return stack
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1, 11);
  }

  constructor(
    protected session: BrowserSession,
    opts?: IVertoCallOptions
  ) {
    const {
      iceServers,
      speaker: speakerId,
      micId,
      micLabel,
      camId,
      camLabel,
      localElement,
      remoteElement,
      options,
      mediaConstraints: { audio, video },
      ringtoneFile,
      ringbackFile,
    } = session;
    this.options = Object.assign(
      {},
      DEFAULT_CALL_OPTIONS,
      {
        audio,
        video,
        iceServers:
          opts?.iceServers && Array.isArray(opts.iceServers)
            ? opts.iceServers
            : iceServers,
        localElement,
        remoteElement,
        micId,
        micLabel,
        camId,
        camLabel,
        speakerId,
        ringtoneFile,
        ringbackFile,
        debug: options.debug,
        debugOutput: options.debugOutput,
        trickleIce: options.trickleIce,
        prefetchIceCandidates: options.prefetchIceCandidates,
        forceRelayCandidate: options.forceRelayCandidate,
        keepConnectionAliveOnSocketClose:
          options.keepConnectionAliveOnSocketClose,
        mutedMicOnStart: options.mutedMicOnStart,
      },
      opts
    );

    this._onMediaError = this._onMediaError.bind(this);
    this._onPeerConnectionFailureError =
      this._onPeerConnectionFailureError.bind(this);
    this._onPeerConnectionSignalingStateClosed =
      this._onPeerConnectionSignalingStateClosed.bind(this);
    this._onTrickleIceSdp = this._onTrickleIceSdp.bind(this);
    this._registerPeerEvents = this._registerPeerEvents.bind(this);
    // Initialize desired mute state BEFORE _init() so that the first
    // callUpdate notification (dispatched inside _init -> setState)
    // already reflects mutedMicOnStart correctly.
    this._desiredAudioMuted = Boolean(this.options.mutedMicOnStart);

    // Expose the callback so Peer can apply the desired mute state
    // whenever it creates or replaces local audio tracks.
    this.options.applyDesiredAudioMuteState =
      this._applyDesiredAudioMuteState.bind(this);

    this._init();

    // Create _rings HTMLAudioElement
    if (this.options) {
      this._ringtone = createAudio(this.options.ringtoneFile, '_ringtone');
      this._ringback = createAudio(this.options.ringbackFile, '_ringback');
    }
  }

  get nodeId(): string {
    return this._targetNodeId;
  }

  set nodeId(what: string) {
    this._targetNodeId = what;
  }

  get isVideoCall(): boolean {
    return !!this.options.video;
  }

  /**
   *
   * Gets Telnyx call IDs, if using Telnyx Call Control services.
   * You can use these IDs to identify specific calls in your application code.
   *
   * @examples
   *
   * ```js
   * const { telnyxCallControlId, telnyxSessionId, telnyxLegId } = call.telnyxIDs;
   * ```
   */
  get telnyxIDs() {
    return {
      telnyxCallControlId: this.options.telnyxCallControlId,
      telnyxSessionId: this.options.telnyxSessionId,
      telnyxLegId: this.options.telnyxLegId,
    };
  }

  /**
   * Gets the local stream of the call.
   * This can be used in a video/audio element to play the local media.
   * See [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
   *
   * @examples
   *
   * ```js
   * const stream = call.localStream;
   * document.querySelector('audio').srcObject = stream;
   * ```
   */
  get localStream() {
    return this.options.localStream;
  }

  /**
   * Gets the remote stream of the call.
   * This can be used in a video/audio element to play the remote media.
   * See [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
   *
   * @examples
   *
   * ```js
   * const stream = call.remoteStream;
   * document.querySelector('audio').srcObject = stream;
   * ```
   */
  get remoteStream() {
    return this.options.remoteStream;
  }

  get memberChannel() {
    return `conference-member.${this.id}`;
  }

  /**
   * Returns the call-level desired mute state for the microphone.
   * Unlike checking individual track.enabled values, this persists across
   * track replacements (device switch, reattach, ICE restart) so callers
   * always see a consistent value.
   *
   * @examples
   *
   * ```js
   * call.isAudioMuted();
   * ```
   */
  get isAudioMuted(): boolean {
    return this._desiredAudioMuted;
  }

  private _getLocalAudioTrackId(): string | undefined {
    return this.options.localStream?.getAudioTracks()[0]?.id;
  }

  private _hasActiveUnmutedLocalAudioTrack(): boolean {
    const localStream = this.options.localStream;
    if (!localStream?.getAudioTracks) {
      return false;
    }

    return localStream
      .getAudioTracks()
      .some(
        (track) =>
          track.enabled === true &&
          track.muted !== true &&
          track.readyState === 'live'
      );
  }

  shouldForceRelayCandidateForRecovery(): boolean {
    if (this.options.forceRelayCandidate) {
      return false;
    }

    if (!this.recoveredCallId) {
      return false;
    }

    return (
      this._callReportCollector?.shouldForceRelayCandidateForRecovery() ?? false
    );
  }

  async invite() {
    this._creatingPeer = true;
    this.direction = Direction.Outbound;
    if (this.options.trickleIce) {
      this._resetTrickleIceCandidateState();
    }
    performance.mark(callMarkName(this.id, 'new-peer'));
    this.peer = new Peer(
      PeerType.Offer,
      this.options,
      this.session,
      this._onTrickleIceSdp,
      this._registerPeerEvents
    );
    try {
      await this.peer.init();
    } catch (error) {
      logger.error('Peer init failed, aborting call', error);
      this._creatingPeer = false;
      const telnyxError =
        error instanceof TelnyxError
          ? error
          : createTelnyxError(
              UNEXPECTED_ERROR,
              error instanceof Error ? error : undefined
            );
      trigger(
        SwEvent.Error,
        {
          error: telnyxError,
          callId: this.id,
          sessionId: this.session.sessionid,
          recoverable: false,
        },
        this.session.uuid
      );
      void this.hangup({ initiator: 'sdk:peer-init-failed' }, false);
      return;
    }
    this._creatingPeer = false;
  }
  /**
   * Starts the process to answer the incoming call.
   *
   * @examples
   *
   * ```js
   * call.answer()
   * ```
   */
  async answer(params: AnswerParams = {}) {
    // Debug log for answering an inbound call while *other* active calls exist.
    // The MULTIPLE_ACTIVE_CALLS_DETECTED warning fires at ring time, but the
    // client may reject the call — this log confirms the call was actually answered.
    // Filter this.id out so a normal single inbound call doesn't trigger a
    // misleading multi-call diagnostic.
    const otherActiveCalls = (this.session.getActiveCalls?.() ?? []).filter(
      (call) => call.id !== this.id
    );
    if (otherActiveCalls.length > 0) {
      logger.debug(
        `[${this.id}] answer(): answering inbound call while ${otherActiveCalls.length} other active call(s) exist in session ${this.session.sessionid}`
      );
    }

    if (
      this._creatingPeer ||
      (this.peer?.instance && this.peer.instance.signalingState !== 'closed')
    ) {
      const warning = createTelnyxWarning(ANSWER_WHILE_PEER_ACTIVE);
      trigger(
        SwEvent.Warning,
        { warning, callId: this.id, sessionId: this.session.sessionid },
        this.session.uuid
      );
      logger.warn(
        `[${this.id}] answer() ignored: peer connection already exists or is being created (signalingState: ${this.peer?.instance?.signalingState ?? 'creating'})`
      );
      return;
    }

    if (!this._registerInboundAnswerAttempt()) {
      return;
    }

    performance.mark(callMarkName(this.id, 'answer-called'));
    this._creatingPeer = true;
    this.stopRingtone();

    this.direction = Direction.Inbound;

    if (params?.customHeaders?.length > 0) {
      this.options = {
        ...this.options,
        customHeaders: params.customHeaders,
      };
    }

    if (this.options.trickleIce) {
      this._resetTrickleIceCandidateState();
    }
    performance.mark(callMarkName(this.id, 'new-peer'));
    this.peer = new Peer(
      PeerType.Answer,
      this.options,
      this.session,
      this._onTrickleIceSdp,
      this._registerPeerEvents
    );
    try {
      await this.peer.init();
    } catch (error) {
      logger.error('Peer init failed, aborting call', error);
      this._creatingPeer = false;
      const telnyxError =
        error instanceof TelnyxError
          ? error
          : createTelnyxError(
              UNEXPECTED_ERROR,
              error instanceof Error ? error : undefined
            );
      trigger(
        SwEvent.Error,
        {
          error: telnyxError,
          callId: this.id,
          sessionId: this.session.sessionid,
          recoverable: false,
        },
        this.session.uuid
      );
      await this.hangup({ initiator: 'sdk:peer-init-failed' }, true);
      return;
    }
    this._creatingPeer = false;
  }

  playRingtone() {
    playAudio(this._ringtone);
  }

  stopRingtone() {
    stopAudio(this._ringtone);
  }

  playRingback() {
    playAudio(this._ringback);
  }

  stopRingback() {
    stopAudio(this._ringback);
  }

  /**
   * Hangs up the call.
   *
   * @examples
   *
   * ```js
   * call.hangup()
   * ```
   */
  hangup(): Promise<void>;
  /**
   * @internal
   */
  hangup(hangupParams: IHangupParams, hangupExecute: boolean): Promise<void>;
  /**
   * @internal
   * @param hangupParams _For internal use_ Specify custom hangup cause and call ID
   * @param hangupExecute _For internal use_ Allow or prevent execution of `Bye`
   */
  async hangup(
    hangupParams?: IHangupParams,
    hangupExecute?: boolean
  ): Promise<void> {
    const params = hangupParams || {};
    const execute = hangupExecute === false ? false : true;
    const stateBeforeHangup = this.state;
    const prevStateBeforeHangup = this.prevState;
    const callerStack = this._captureHangupCallerStack();
    const initiator = params.initiator || 'app:call.hangup';

    // State-dependent default cause code:
    // - Pre-answer states (never answered) → USER_BUSY/17 (signals rejection, prevents TeXML retries)
    // - Post-answer states (active call) → NORMAL_CLEARING/16
    const defaults =
      this._state < State.Active
        ? { cause: 'USER_BUSY', causeCode: 17 }
        : { cause: 'NORMAL_CLEARING', causeCode: 16 };

    this.cause = params.cause || defaults.cause;
    this.causeCode = params.causeCode || defaults.causeCode;
    this.sipCode = params.sipCode || null;
    this.sipReason = params.sipReason || null;
    this.sipCallId = params.sip_call_id || null;
    this.options.customHeaders = [
      ...(this.options.customHeaders ?? []),
      ...(params?.dialogParams?.customHeaders ?? []),
    ];

    logger.debug(`[${this.id}] hangup() invoked`, {
      callId: this.id,
      execute,
      state: stateBeforeHangup,
      prevState: prevStateBeforeHangup,
      cause: this.cause,
      causeCode: this.causeCode,
      initiator,
      sipCode: this.sipCode,
      sipReason: this.sipReason,
      sipCallId: this.sipCallId,
      isRecovering: Boolean(params.isRecovering),
      hasDialogCustomHeaders: Boolean(
        params.dialogParams?.customHeaders?.length
      ),
      callerStack,
    });

    // If recovering from attach, set Recovering state and skip Bye
    if (params.isRecovering) {
      this._isRecovering = true;
      this.setState(State.Recovering);
      this._finalize();
      return;
    }

    this.setState(State.Hangup);

    this.stopRingtone();
    this.stopRingback();
    if (execute) {
      const bye = new Bye({
        sipCode: this.sipCode,
        sip_call_id: this.sipCallId,
        sessid: this.session.sessionid,
        dialogParams: this.options,
        cause: this.cause,
        causeCode: this.causeCode,
      });
      // Timeout guard: if the BYE execution hangs (e.g. socket stalled,
      // server unresponsive), proceed to Destroy after 5s so the call is
      // always cleaned up.
      let byeTimeout: ReturnType<typeof setTimeout> | undefined;

      try {
        await Promise.race([
          this._execute(bye),
          new Promise<void>((resolve) => {
            byeTimeout = setTimeout(() => {
              logger.warn(
                `[${this.id}] BYE execution timed out after ${BYE_TIMEOUT_MS}ms — proceeding to destroy.`
              );
              resolve();
            }, BYE_TIMEOUT_MS);
          }),
        ]);
      } catch (error) {
        logger.error('telnyx_rtc.bye failed!', error);
        const telnyxError = createTelnyxError(BYE_SEND_FAILED, error);
        trigger(
          SwEvent.Error,
          {
            error: telnyxError,
            callId: this.id,
            sessionId: this.session.sessionid,
          },
          this.session.uuid
        );
      } finally {
        // Always clear the timeout — whether BYE resolved, rejected, or timed out
        if (byeTimeout) {
          clearTimeout(byeTimeout);
        }
      }
    }

    logger.debug(`[${this.id}] Closing peer from hangup`);
    this.peer?.close();
    this.setState(State.Destroy);
  }

  /**
   * Holds the call.
   *
   * @returns Promise that resolves or rejects based on server response
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * await call.hold()
   * console.log(call.state) // => 'held'
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * call.hold().then(() => {
   *   console.log(call.state) // => 'held'
   * });
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hold(): Promise<any> {
    const msg = new Modify({
      sessid: this.session.sessionid,
      action: VertoModifyAction.Hold,
      dialogParams: this.options,
    });
    return this._execute(msg)
      .then(this._handleChangeHoldStateSuccess.bind(this))
      .catch(this._handleChangeHoldStateError.bind(this));
  }

  /**
   * Removes hold from the call.
   *
   * @returns Promise that resolves or rejects based on server response
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * await call.unhold()
   * console.log(call.state) // => 'active'
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * call.unhold().then(() => {
   *   console.log(call.state) // => 'active'
   * });
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unhold(): Promise<any> {
    const msg = new Modify({
      sessid: this.session.sessionid,
      action: VertoModifyAction.Unhold,
      dialogParams: this.options,
    });
    return this._execute(msg)
      .then(this._handleChangeHoldStateSuccess.bind(this))
      .catch(this._handleChangeHoldStateError.bind(this));
  }

  /**
   * Toggles hold state of the call.
   *
   * @returns Promise that resolves or rejects based on server response
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * await call.toggleHold()
   * console.log(call.state) // => 'held'
   *
   * await call.toggleHold()
   * console.log(call.state) // => 'active'
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toggleHold(): Promise<any> {
    const msg = new Modify({
      sessid: this.session.sessionid,
      action: VertoModifyAction.ToggleHold,
      dialogParams: this.options,
    });
    return this._execute(msg)
      .then(this._handleChangeHoldStateSuccess.bind(this))
      .catch(this._handleChangeHoldStateError.bind(this));
  }

  /**
   * Sends dual-tone multi-frequency (DTMF) signal
   *
   * @param dtmf Single DTMF key
   *
   * @examples
   *
   * ```js
   * call.dtmf('0');
   * call.dtmf('1');
   * call.dtmf('*');
   * call.dtmf('#');
   * ```
   */
  dtmf(dtmf: string) {
    const msg = new Info({
      sessid: this.session.sessionid,
      dtmf,
      dialogParams: this.options,
    });
    this._execute(msg);
  }

  message(to: string, body: string) {
    const msg = { from: this.session.options.login, to, body };
    const info = new Info({
      sessid: this.session.sessionid,
      msg,
      dialogParams: this.options,
    });
    this._execute(info);
  }

  /**
   * Turns off audio output, i.e. makes it so other
   * call participants cannot hear your audio.
   *
   * @examples
   *
   * ```js
   * call.muteAudio();
   * ```
   */
  muteAudio(): void {
    logger.debug('muteAudio called', {
      callId: this.id,
      previousAudioState: this._desiredAudioMuted,
      audioTrackId: this._getLocalAudioTrackId(),
    });
    this._desiredAudioMuted = true;
    disableAudioTracks(this.options.localStream);
  }

  /**
   * Turns on audio output, i.e. makes it so other
   * call participants can hear your audio.
   *
   * @examples
   *
   * ```js
   * call.unmuteAudio();
   * ```
   */
  unmuteAudio(): void {
    logger.debug('unmuteAudio called', {
      callId: this.id,
      previousAudioState: this._desiredAudioMuted,
      audioTrackId: this._getLocalAudioTrackId(),
    });
    this._desiredAudioMuted = false;
    enableAudioTracks(this.options.localStream);
  }

  /**
   * Apply the current desired mute state to all local audio tracks.
   * Called internally after track creation/replacement (Peer init,
   * setAudioInDevice, setVideoDevice, reattach, ICE restart) to
   * ensure the mic stays muted when the SDK creates or replaces
   * local audio tracks.
   */
  _applyDesiredAudioMuteState(): void {
    logger.debug('applyDesiredAudioMuteState called', {
      callId: this.id,
      previousAudioState: this._desiredAudioMuted,
      audioTrackId: this._getLocalAudioTrackId(),
    });
    if (this._desiredAudioMuted) {
      disableAudioTracks(this.options.localStream);
    } else {
      enableAudioTracks(this.options.localStream);
    }
  }

  /**
   * Toggles the audio output on/off.
   *
   * @examples
   *
   * ```js
   * call.toggleAudioMute();
   * ```
   */
  toggleAudioMute() {
    logger.debug('toggleAudioMute called', {
      callId: this.id,
      previousAudioState: this._desiredAudioMuted,
      audioTrackId: this._getLocalAudioTrackId(),
    });
    this._desiredAudioMuted = !this._desiredAudioMuted;
    this._applyDesiredAudioMuteState();
  }

  /**
   * Changes the audio input device (i.e. microphone) used for the call.
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * await call.setAudioInDevice('abc123')
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * call.setAudioInDevice('abc123').then(() => {
   *   // Do something using new audio input device
   * });
   * ```
   *
   * Usage with `.getAudioInDevices`:
   *
   * ```js
   * let result = await client.getAudioInDevices();
   *
   * if (result.length) {
   *   call.setAudioInDevice(result[1].deviceId);
   * }
   * ```
   *
   * @param deviceId The target audio input device ID
   * @param muted Whether the audio track should be muted. Defaults to the current desired mute state.
   * @returns Promise that resolves if the audio input device has been updated
   */
  async setAudioInDevice(
    deviceId: string,
    muted = this._desiredAudioMuted
  ): Promise<void> {
    const newDesiredMuted = Boolean(muted);

    const { instance } = this.peer;
    const sender = instance
      .getSenders()
      .find(({ track: { kind } }: RTCRtpSender) => kind === 'audio');

    if (!sender) {
      // No audio sender — nothing to replace. Keep the current desired state.
      logger.warn('Skipping audio input device change: no audio sender found', {
        callId: this.id,
        deviceId,
        audioMuted: this._desiredAudioMuted,
        audioTrackId: this._getLocalAudioTrackId(),
      });
      trigger(
        SwEvent.Warning,
        {
          warning: createTelnyxWarning(AUDIO_INPUT_DEVICE_CHANGE_SKIPPED),
          callId: this.id,
          deviceId,
          sessionId: this.session.sessionid,
        },
        this.options?.id || this.id
      );
      return;
    }

    logger.debug('Starting audio input device change', {
      callId: this.id,
      state: this.state,
      deviceId,
      previousDesiredAudioMuted: this._desiredAudioMuted,
      newDesiredMuted,
      currentSenderTrack: getTrackDebugInfo(sender.track),
      localTracks: getStreamTrackDebugInfo(this.options.localStream),
    });

    let newStream: MediaStream;
    try {
      newStream = await getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
    } catch (error) {
      // getUserMedia failed (missing device / permission error).
      // Don't change the desired mute state — the old track is still active.
      const telnyxError = createTelnyxError(
        classifyMediaErrorCode(error),
        error
      );
      trigger(SwEvent.MediaError, telnyxError, this.options?.id || this.id);
      return;
    }

    const audioTrack = newStream.getAudioTracks()[0];
    audioTrack.enabled = !newDesiredMuted;

    try {
      await sender.replaceTrack(audioTrack);
    } catch (error) {
      // replaceTrack rejected — the RTP sender did not switch tracks.
      // Don't commit any state changes. Keep the old stream and desired
      // mute state. Surface the failure as a media error.
      const telnyxError = createTelnyxError(
        classifyMediaErrorCode(error),
        error
      );
      trigger(SwEvent.MediaError, telnyxError, this.options?.id || this.id);
      // Stop the new stream we acquired but didn't use
      newStream.getTracks().forEach((t) => t.stop());
      return;
    }

    // Only commit the new desired mute state after getUserMedia + sender
    // replacement succeeds. This prevents isAudioMuted from flipping on
    // failure while the actual audio track stays unchanged.
    this._desiredAudioMuted = newDesiredMuted;
    this.options.micId = deviceId;

    const { localStream } = this.options;
    localStream.getAudioTracks().forEach((t) => t.stop());
    localStream.getVideoTracks().forEach((t) => newStream.addTrack(t));
    this.options.localStream = newStream;

    logger.debug('Finished audio input device change', {
      callId: this.id,
      state: this.state,
      deviceId,
      desiredAudioMuted: this._desiredAudioMuted,
      senderTrack: getTrackDebugInfo(sender.track),
      localTracks: getStreamTrackDebugInfo(this.options.localStream),
    });
  }

  /**
   * Turns off the video output, i.e. hides
   * video from other call participants.
   *
   * @examples
   *
   * ```js
   * call.muteVideo();
   * ```
   * @deprecated
   */
  muteVideo() {
    disableVideoTracks(this.options.localStream);
  }

  /**
   * Turns on the video output, i.e. makes
   * video visible to other call participants.
   *
   * @examples
   *
   * ```js
   * call.unmuteVideo();
   * ```
   * @deprecated
   */
  unmuteVideo() {
    enableVideoTracks(this.options.localStream);
  }

  /**
   * Toggles the video output on/off.
   *
   * @examples
   *
   * ```js
   * call.toggleVideoMute();
   * ```
   * @deprecated
   */
  toggleVideoMute() {
    toggleVideoTracks(this.options.localStream);
  }

  /**
   * Changes the video device (i.e. webcam) used for the call.
   *
   * @examples
   *
   * Using async/await:
   *
   * ```js
   * await call.setVideoDevice('abc123')
   * ```
   *
   * Using ES6 `Promises`:
   *
   * ```js
   * call.setVideoDevice('abc123').then(() => {
   *   // Do something using new video device
   * });
   * ```
   *
   * Usage with `.getVideoDevices`:
   *
   * ```js
   * let result = await client.getVideoDevices();
   *
   * if (result.length) {
   *   await call.setVideoDevice(result[1].deviceId);
   * }
   * ```
   *
   * @param deviceId the target video device ID
   * @returns Promise that resolves if the video device has been updated
   * @deprecated
   */
  async setVideoDevice(deviceId: string): Promise<void> {
    const { instance } = this.peer;
    const sender = instance
      .getSenders()
      .find(({ track: { kind } }: RTCRtpSender) => kind === 'video');
    if (sender) {
      const newStream = await getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      const videoTrack = newStream.getVideoTracks()[0];
      sender.replaceTrack(videoTrack);
      const { localElement, localStream } = this.options;
      attachMediaStream(localElement, newStream);
      this.options.camId = deviceId;

      localStream.getAudioTracks().forEach((t) => newStream.addTrack(t));
      localStream.getVideoTracks().forEach((t) => t.stop());
      this.options.localStream = newStream;

      // Preserve audio mute state after stream replacement
      this._applyDesiredAudioMuteState();
    }
  }

  /**
   * Turns off the remote stream audio.
   *
   * @examples
   *
   * ```js
   * call.deaf()
   * ```
   */
  deaf() {
    disableAudioTracks(this.options.remoteStream);
  }

  /**
   * Turns on the remote stream audio.
   *
   * @examples
   *
   * ```js
   * call.undeaf()
   * ```
   */
  undeaf() {
    enableAudioTracks(this.options.remoteStream);
  }

  /**
   * Toggles the remote stream audio.
   *
   * @examples
   *
   * ```js
   * call.toggleDeaf()
   * ```
   */
  toggleDeaf() {
    toggleAudioTracks(this.options.remoteStream);
  }

  async setBandwidthEncodingsMaxBps(max: number, _kind: string) {
    if (!this || !this.peer) {
      logger.error(
        'Could not set bandwidth (reason: no peer connection). Dynamic bandwidth can only be set when there is a call running - is there any call running?)'
      );
      return;
    }

    const { instance } = this.peer;
    const senders = instance.getSenders();
    if (!senders) {
      logger.error(
        'Could not set bandwidth (reason: no senders). Dynamic bandwidth can only be set when there is a call running - is there any call running?)'
      );
      return;
    }

    const sender = senders.find(
      ({ track: { kind } }: RTCRtpSender) => kind === _kind
    );

    if (sender) {
      const p = sender.getParameters();
      const parameters = p as RTCRtpSendParameters;
      if (!parameters.encodings) {
        parameters.encodings = [{ rid: 'h' }];
      }
      logger.info('Parameters: ', parameters);
      logger.info(
        'Setting max ',
        _kind === 'audio' ? 'audio' : 'video',
        ' bandwidth to: ',
        max,
        ' [bps]'
      );

      parameters.encodings[0].maxBitrate = max;

      await sender
        .setParameters(parameters)
        .then(() => {
          logger.info(
            _kind === 'audio' ? 'New audio' : 'New video',
            ' bandwidth settings in use: ',
            sender.getParameters()
          );
        })
        .catch((e) => logger.error(e));
    } else {
      logger.error(
        'Could not set bandwidth (reason: no ' +
          _kind +
          ' sender). Dynamic bandwidth can only be set when there is a call running - is there any call running?)'
      );
    }
  }

  setAudioBandwidthEncodingsMaxBps(max: number) {
    this.setBandwidthEncodingsMaxBps(max, 'audio');
  }

  setVideoBandwidthEncodingsMaxBps(max: number) {
    this.setBandwidthEncodingsMaxBps(max, 'video');
  }

  private _isTerminatingOrTerminated(): boolean {
    return [State.Hangup, State.Destroy, State.Purge].includes(this._state);
  }

  /**
   * Registers callback for stats.
   *
   * @param callback
   * @param constraints
   * @returns
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-explicit-any
  getStats(callback: Function, constraints: any) {
    if (!callback) {
      return;
    }
    const binding: IStatsBinding = {
      callback: callback,
      constraints: constraints,
    };
    this._statsBindings.push(binding);

    if (!this._statsIntervalId) {
      const STATS_INTERVAL = 2000;
      this._startStats(STATS_INTERVAL);
    }
  }

  setState(state: State): void {
    this._prevState = this._state;
    this._state = state;
    this.state = State[this._state].toLowerCase();
    this.prevState = State[this._prevState].toLowerCase();
    logger.debug(
      `Call ${this.id} state change from ${this.prevState} to ${this.state}`
    );

    this._dispatchNotification({
      type: NOTIFICATION_TYPE.callUpdate,
      call: this,
    });

    switch (state) {
      case State.Purge: {
        logger.info(`[${this.id}] Entering Purge state.`);
        break;
      }
      case State.Active: {
        performance.mark(callMarkName(this.id, 'call-active'));
        this.peer?.tryCollectTimings();

        // Clear recovery flag when call becomes active again
        if (this._isRecovering) {
          this._isRecovering = false;
          logger.debug(`[${this.id}] Recovery complete, call is active`);
        }

        // Start signaling health monitor for active calls
        this.session.startSignalingHealthMonitor();

        setTimeout(() => {
          const { remoteElement, speakerId } = this.options;
          if (remoteElement && speakerId) {
            setMediaElementSinkId(remoteElement, speakerId);
          }
        }, 0);

        // Start collecting call stats when call becomes active
        // Only start if call_report_id is available (returned from voice-sdk-proxy)
        if (
          this._callReportCollector &&
          this.peer?.instance &&
          this.session.callReportId
        ) {
          this._callReportCollector.start(this.peer.instance);
        }

        // Start logging media devices for debugging
        this._mediaDeviceCollector = new MediaDeviceCollector();
        this._mediaDeviceCollector.logDevicesAtStart();
        break;
      }
      case State.Destroy:
        this._finalize();
        break;
    }
  }

  // Handle messages from Server to Client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleMessage(msg: any) {
    const { method, params } = msg;

    switch (method) {
      case VertoMethod.Answer: {
        performance.mark(callMarkName(this.id, 'telnyx-rtc-answer'));
        this.gotAnswer = true;
        if (params.telnyx_call_control_id) {
          this.options.telnyxCallControlId = params.telnyx_call_control_id;
        }
        if (params.telnyx_session_id) {
          this.options.telnyxSessionId = params.telnyx_session_id;
        }
        if (params.telnyx_leg_id) {
          this.options.telnyxLegId = params.telnyx_leg_id;
        }
        if (this._state >= State.Active) {
          return;
        }
        if (this._state >= State.Early) {
          this.setState(State.Active);
        }
        if (!this.gotEarly) {
          this._onRemoteSdp(params.sdp);
        }
        this.stopRingback();
        this.stopRingtone();
        break;
      }
      case VertoMethod.Media: {
        performance.mark(callMarkName(this.id, 'telnyx-rtc-media'));
        // Media is an early-media event for the pre-Answer phase only.
        // After Early state (including mid-call ICE restart), the answer SDP
        // is delivered via Modify responses or the telnyx_rtc.modify path,
        // not through Media. Applying it here would call setRemoteDescription
        // twice and break the ICE restart flow.
        if (this._state >= State.Early) {
          return;
        }
        this.gotEarly = true;
        this._onRemoteSdp(params.sdp);
        break;
      }
      case VertoMethod.Display: {
        // TODO: manage caller_id_name, caller_id_number, callee_id_name, callee_id_number
        const {
          display_name: displayName,
          display_number: displayNumber,
          display_direction,
        } = params;
        this.extension = displayNumber;
        const displayDirection =
          display_direction === Direction.Inbound
            ? Direction.Outbound
            : Direction.Inbound;
        const notification: INotificationEventData = {
          type: NOTIFICATION_TYPE[method],
          call: this,
          displayName,
          displayNumber,
          displayDirection,
        };
        if (!trigger(SwEvent.Notification, notification, this.id)) {
          trigger(SwEvent.Notification, notification, this.session.uuid);
        }
        break;
      }
      case VertoMethod.Candidate: {
        this._addIceCandidate(params);
        break;
      }
      case VertoMethod.Info:
      case VertoMethod.Event: {
        const notification: INotificationEventData = {
          ...params,
          type: NOTIFICATION_TYPE.generic,
          call: this,
        };
        if (!trigger(SwEvent.Notification, notification, this.id)) {
          trigger(SwEvent.Notification, notification, this.session.uuid);
        }
        break;
      }
      case VertoMethod.Ringing: {
        performance.mark(callMarkName(this.id, 'ringing'));
        this.playRingback();
        if (params.telnyx_call_control_id) {
          this.options.telnyxCallControlId = params.telnyx_call_control_id;
        }

        if (params.telnyx_session_id) {
          this.options.telnyxSessionId = params.telnyx_session_id;
        }

        if (params.telnyx_leg_id) {
          this.options.telnyxLegId = params.telnyx_leg_id;
        }
        break;
      }
      case VertoMethod.Bye:
        const byeClientState = params.client_state || params.clientState;

        if (!!byeClientState) {
          this.options.clientState = byeClientState;
        }

        this.stopRingback();
        this.stopRingtone();
        void this.hangup(
          { ...params, initiator: 'remote:telnyx_rtc.bye' },
          false
        );
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleConferenceUpdate(packet: any, initialPvtData: any) {
    // FIXME: 'reorder' - changepage' - 'heartbeat' methods not implemented
    if (
      !this._checkConferenceSerno(packet.wireSerno) &&
      packet.name !== initialPvtData.laName
    ) {
      logger.error(
        'ConferenceUpdate invalid wireSerno or packet name:',
        packet
      );
      return 'INVALID_PACKET';
    }
    const {
      action,
      data,
      hashKey: callId = String(this._lastSerno),
      arrIndex: index,
    } = packet;
    switch (action) {
      case 'bootObj': {
        this._lastSerno = 0;
        const {
          chatChannel,
          infoChannel,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          modChannel,
          laName,
          conferenceMemberID,
          role,
        } = initialPvtData;
        this._dispatchConferenceUpdate({
          action: ConferenceAction.Join,
          conferenceName: laName,
          participantId: Number(conferenceMemberID),
          role,
        });
        if (chatChannel) {
          await this._subscribeConferenceChat(chatChannel);
        }
        if (infoChannel) {
          await this._subscribeConferenceInfo(infoChannel);
        }
        const participants = [];
        for (const i in data) {
          participants.push({
            callId: data[i][0],
            index: Number(i),
            ...mutateLiveArrayData(data[i][1]),
          });
        }
        this._dispatchConferenceUpdate({
          action: ConferenceAction.Bootstrap,
          participants,
        });
        break;
      }
      case 'add': {
        this._dispatchConferenceUpdate({
          action: ConferenceAction.Add,
          callId,
          index,
          ...mutateLiveArrayData(data),
        });
        break;
      }
      case 'modify':
        this._dispatchConferenceUpdate({
          action: ConferenceAction.Modify,
          callId,
          index,
          ...mutateLiveArrayData(data),
        });
        break;
      case 'del':
        this._dispatchConferenceUpdate({
          action: ConferenceAction.Delete,
          callId,
          index,
          ...mutateLiveArrayData(data),
        });
        break;
      case 'clear':
        this._dispatchConferenceUpdate({ action: ConferenceAction.Clear });
        break;
      // case 'reorder':
      //   break
      default:
        this._dispatchConferenceUpdate({ action, data, callId, index });
        break;
    }
  }

  _addChannel(channel: string): void {
    if (!this.channels.includes(channel)) {
      this.channels.push(channel);
    }
    const protocol = this.session.relayProtocol;
    if (this.session._existsSubscription(protocol, channel)) {
      this.session.subscriptions[protocol][channel] = {
        ...this.session.subscriptions[protocol][channel],
        callId: this.id,
      };
    }
  }

  private async _subscribeConferenceChat(channel: string) {
    const tmp = {
      nodeId: this.nodeId,
      channels: [channel],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: (params: any) => {
        const {
          direction,
          from: participantNumber,
          fromDisplay: participantName,
          message: messageText,
          type: messageType,
        } = params.data;
        this._dispatchConferenceUpdate({
          action: ConferenceAction.ChatMessage,
          direction,
          participantNumber,
          participantName,
          messageText,
          messageType,
          messageId: params.eventSerno,
        });
      },
    };
    const response = await this.session.vertoSubscribe(tmp).catch((error) => {
      logger.error('ConfChat subscription error:', error);
    });
    if (checkSubscribeResponse(response, channel)) {
      this._addChannel(channel);
      Object.defineProperties(this, {
        sendChatMessage: {
          configurable: true,
          value: (message: string, type: string) => {
            this.session.vertoBroadcast({
              nodeId: this.nodeId,
              channel,
              data: { action: 'send', message, type },
            });
          },
        },
      });
    }
  }

  private async _subscribeConferenceInfo(channel: string) {
    const tmp = {
      nodeId: this.nodeId,
      channels: [channel],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: (params: any) => {
        const { eventData } = params;
        switch (eventData.contentType) {
          case 'layout-info':
            // FIXME: workaround to fix missing callID on payload
            eventData.callID = this.id;
            MCULayoutEventHandler(this.session, eventData);
            break;
          default:
            logger.error('Conference-Info unknown contentType', params);
        }
      },
    };
    const response = await this.session.vertoSubscribe(tmp).catch((error) => {
      logger.error('ConfInfo subscription error:', error);
    });
    if (checkSubscribeResponse(response, channel)) {
      this._addChannel(channel);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _confControl(channel: string, params: any = {}) {
    const data = {
      application: 'conf-control',
      callID: this.id,
      value: null,
      ...params,
    };
    this.session.vertoBroadcast({ nodeId: this.nodeId, channel, data });
  }

  private _handleChangeHoldStateSuccess(response) {
    response.holdState === 'active'
      ? this.setState(State.Active)
      : this.setState(State.Held);
    return true;
  }

  private _handleChangeHoldStateError(error) {
    logger.error(`Failed to ${error.action} on call ${this.id}`);
    const telnyxError = createTelnyxError(HOLD_FAILED, error);
    trigger(
      SwEvent.Error,
      {
        error: telnyxError,
        callId: this.id,
        sessionId: this.session.sessionid,
      },
      this.session.uuid
    );
    return false;
  }

  private _sendIceRestartModify(
    sdp: string,
    options: { trickle?: boolean } = {}
  ) {
    const modifyMsg = new Modify({
      sessid: this.session.sessionid,
      action: VertoModifyAction.UpdateMedia,
      callID: this.options.id,
      sdp,
      ...(options.trickle ? { trickle: true } : {}),
      dialogParams: this.options,
    });
    logger.info(
      `ICE restart: sending ${options.trickle ? 'trickle ' : ''}Modify with new offer SDP`
    );

    // Note: We do NOT set a separate manual timeout here. During active
    // calls, session.execute() already applies Connection.DEFAULT_REQUEST_TIMEOUT_MS
    // (10s) to the underlying Connection.send() call. If that timeout fires,
    // the promise rejects with RequestTimeoutError and we handle it in the
    // .catch() below. Adding a second manual timer would cause double
    // calls to _onIceRestartFailed / onSignalingRequestTimeout.

    this._execute(modifyMsg)
      .then(async (response) => {
        if (response?.sdp) {
          logger.info('ICE restart Modify response received');
          this.peer?.finishIceRestart();
          await this._onRemoteSdp(response.sdp);
        } else {
          this._onIceRestartFailed('ICE restart Modify response missing SDP');
        }
      })
      .catch((error) => {
        this._onIceRestartFailed('ICE restart Modify failed', error);
        // If the error is a RequestTimeoutError (from execute()'s active-call
        // timeout), trigger signaling health recovery. execute() already called
        // onSignalingRequestTimeout before re-throwing, so we only call
        // _onIceRestartFailed here for ICE-restart-specific cleanup.
      });
  }

  private _onIceRestartFailed(message: string, error?: unknown) {
    logger.error(message, error);
    this.peer?.finishIceRestart();
    const telnyxError = createTelnyxError(ICE_RESTART_FAILED, error);
    // fatal: false (registry default) — SignalingHealth will decide on recovery.
    trigger(
      SwEvent.Error,
      {
        error: telnyxError,
        callId: this.id,
        sessionId: this.session.sessionid,
      },
      this.session.uuid
    );

    // Notify SignalingHealth that ICE restart failed. The Signaling service
    // decides what to do next (it may trigger socket recovery, or it may take
    // a different action). This handoff keeps recovery logic in one place.
    this.session.reportIceRestartFailed?.(this.id);
  }

  private async _onRemoteSdp(remoteSdp: string) {
    const sdp = new RTCSessionDescription({
      sdp: remoteSdp,
      type: PeerType.Answer,
    });

    await this.peer.instance
      .setRemoteDescription(sdp)
      .then(() => {
        performance.mark(callMarkName(this.id, 'set-remote-description'));
        if (this.options.trickleIce) {
          this._isRemoteDescriptionSet = true;
          this._flushPendingTrickleIceCandidates();
        }
        if (this.gotEarly) {
          this.setState(State.Early);
        }
        if (this.gotAnswer) {
          this.setState(State.Active);
        }
      })
      .catch(async (error) => {
        logger.error('Call setRemoteDescription Error: ', error);
        const telnyxError = createTelnyxError(
          SDP_SET_REMOTE_DESCRIPTION_FAILED,
          error
        );
        trigger(
          SwEvent.Error,
          {
            error: telnyxError,
            callId: this.id,
            sessionId: this.session.sessionid,
          },
          this.session.uuid
        );
        // Temporarily use USER_BUSY for setRemoteDescription failure
        try {
          await this.hangup(
            {
              cause: 'USER_BUSY',
              causeCode: 17,
              initiator: 'sdk:set-remote-description-failure',
            },
            true
          );
        } catch (hangupError) {
          logger.error(
            'Error during hangup after setRemoteDescription failure:',
            hangupError
          );
        }
      });
  }

  private _requestAnotherLocalDescription() {
    if (isFunction(this.peer.onSdpReadyTwice)) {
      const telnyxError = createTelnyxError(
        SDP_SEND_FAILED,
        new Error('SDP without candidates for the second time!')
      );
      trigger(
        SwEvent.Error,
        { error: telnyxError, sessionId: this.session.sessionid },
        this.session.uuid
      );
      return;
    }
    Object.defineProperty(this.peer, 'onSdpReadyTwice', {
      value: this._onIceSdp.bind(this),
    });
    this.peer.iceDone = false;
    this.peer.startNegotiation();
  }

  private _onIceSdp(data: RTCSessionDescription | null) {
    if (this._iceTimeout) {
      clearTimeout(this._iceTimeout);
    }
    this._iceTimeout = null;
    if (this.peer) {
      this.peer.iceDone = true;
    }

    if (!data) {
      logger.warn(
        'localDescription is null — PeerConnection may have been closed during ICE gathering'
      );
      return;
    }

    const { sdp, type } = data;

    if (sdp.indexOf('candidate') === -1) {
      logger.info('No candidate - retry \n');
      this._requestAnotherLocalDescription();
      return;
    }

    this.peer?.instance?.removeEventListener('icecandidate', this._onIce);

    // W5d: Check for host-only ICE candidates (non-trickle path)
    if (!HAS_NON_HOST_ICE_CANDIDATE_REGEX.test(sdp)) {
      const warning = createTelnyxWarning(ONLY_HOST_ICE_CANDIDATES);
      logger.warn(`[${this.id}] Warning ${warning.code}: ${warning.message}`);
      trigger(
        SwEvent.Warning,
        { warning, callId: this.id, sessionId: this.session.sessionid },
        this.session.uuid
      );
    }

    performance.mark(callMarkName(this.id, 'ice-gathering-end'));
    let msg = null;

    const tmpParams = {
      sessid: this.session.sessionid,
      sdp,
      dialogParams: this.options,
      'User-Agent': `Web-${SDK_VERSION}`,
    };

    // ICE restart: send Modify with new SDP regardless of original call direction
    if (this.peer?.isIceRestarting) {
      this._sendIceRestartModify(sdp);
      return;
    }

    switch (type) {
      case PeerType.Offer:
        this.setState(State.Requesting);
        msg = new Invite(tmpParams);
        break;
      case PeerType.Answer:
        // Keep state as recovering to make sure that client can relay on it
        if (!this._isRecovering) {
          this.setState(State.Answering);
        }
        msg =
          this.options.attach === true
            ? new Attach(tmpParams)
            : new Answer(tmpParams);
        break;
      default:
        logger.error(`${this.id} - Unknown local SDP type:`, data);
        void this.hangup({ initiator: 'sdk:unknown-local-sdp-type' }, false);
        return;
    }
    performance.mark(callMarkName(this.id, 'send-sdp'));
    this._execute(msg)
      .then((response) => {
        if (this._isTerminatingOrTerminated()) {
          logger.debug(
            `[${this.id}] Ignoring ${type} response because call is ${this.state}`
          );
          return;
        }
        const { node_id = null } = response;
        this._targetNodeId = node_id;
        if (type === PeerType.Offer) {
          this.setState(State.Trying);
        } else {
          this.setState(State.Active);
        }
      })
      .catch(async (error) => {
        logger.error(`${this.id} - Sending ${type} error:`, error);
        const telnyxError = createTelnyxError(SDP_SEND_FAILED, error);
        trigger(
          SwEvent.Error,
          {
            error: telnyxError,
            callId: this.id,
            sessionId: this.session.sessionid,
          },
          this.session.uuid
        );
        // Temporarily use USER_BUSY for any SDP send failure
        try {
          await this.hangup(
            {
              cause: 'USER_BUSY',
              causeCode: 17,
              initiator: 'sdk:sdp-send-failure',
            },
            true
          );
        } catch (hangupError) {
          logger.error(
            'Error during hangup after SDP send failure:',
            hangupError
          );
        }
      });
  }

  private _onTrickleIceSdp(data: RTCSessionDescription) {
    if (!data) {
      logger.error('No SDP data provided');
      void this.hangup({ initiator: 'sdk:missing-local-sdp' }, false);
      return;
    }

    const { sdp, type } = data;

    let msg = null;

    const tmpParams = {
      sessid: this.session.sessionid,
      sdp,
      dialogParams: this.options,
      trickle: true,
      'User-Agent': `Web-${SDK_VERSION}`,
    };

    // ICE restart: send a trickle Modify with the new offer SDP; subsequent
    // candidates/end-of-candidates flow through the normal trickle path.
    if (this.peer?.isIceRestarting) {
      this._sendIceRestartModify(sdp, { trickle: true });
      return;
    }

    switch (type) {
      case PeerType.Offer:
        this.setState(State.Requesting);
        msg = new Invite(tmpParams);
        break;
      case PeerType.Answer:
        // Keep state as recovering to make sure that client can relay on it
        if (!this._isRecovering) {
          this.setState(State.Answering);
        }
        msg =
          this.options.attach === true
            ? new Attach(tmpParams)
            : new Answer(tmpParams);
        break;
      default:
        logger.error(`${this.id} - Unknown local SDP type:`, data);
        void this.hangup({ initiator: 'sdk:unknown-local-sdp-type' }, false);
        return;
    }

    performance.mark(callMarkName(this.id, 'send-sdp'));
    this._execute(msg)
      .then((response) => {
        if (this._isTerminatingOrTerminated()) {
          logger.debug(
            `[${this.id}] Ignoring ${type} response because call is ${this.state}`
          );
          return;
        }
        const { node_id = null } = response;
        this._targetNodeId = node_id;
        if (type === PeerType.Offer) {
          this.setState(State.Trying);
        } else {
          this.setState(State.Active);
        }
      })
      .catch(async (error) => {
        logger.error(`${this.id} - Sending ${type} error:`, error);
        const telnyxError = createTelnyxError(SDP_SEND_FAILED, error);
        trigger(
          SwEvent.Error,
          {
            error: telnyxError,
            callId: this.id,
            sessionId: this.session.sessionid,
          },
          this.session.uuid
        );
        // Temporarily use USER_BUSY for any SDP send failure
        try {
          await this.hangup(
            {
              cause: 'USER_BUSY',
              causeCode: 17,
              initiator: 'sdk:sdp-send-failure',
            },
            true
          );
        } catch (hangupError) {
          logger.error(
            'Error during hangup after SDP send failure:',
            hangupError
          );
        }
      });
  }

  private _onIce(event: RTCPeerConnectionIceEvent) {
    const { instance } = this.peer;
    if (this._iceTimeout === null) {
      // Use a longer timeout for attach (reconnection) to allow full ICE
      // gathering — b2bua-rtc requires a complete SDP for attach.
      const timeoutMs = this.options.attach ? 5000 : 1000;
      this._iceTimeout = setTimeout(
        () => this._onIceSdp(instance.localDescription),
        timeoutMs
      );
    }

    if (event.candidate) {
      logger.debug('RTCPeer Candidate:', event.candidate);
      this.peer?.incrementGatheredCandidates();
      this._trackCandidateMarks(event.candidate);
    } else {
      this._onIceSdp(instance.localDescription);
    }
  }

  private _onTrickleIce(event: RTCPeerConnectionIceEvent) {
    if (event.candidate && event.candidate.candidate) {
      logger.debug('RTCPeer Candidate:', event.candidate);
      this.peer?.incrementGatheredCandidates();
      this._trackCandidateMarks(event.candidate);
      this._sendIceCandidate(event.candidate);
    } else {
      this._sendEndOfCandidates();
    }
  }

  private _sendIceCandidate(candidate: RTCIceCandidate) {
    const msg = new Candidate({
      sessid: this.session.sessionid,
      // https://www.w3.org/TR/webrtc/#dom-peerconnection-addicecandidate
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
      dialogParams: this.options,
    });
    this._execute(msg);
  }

  private _addIceCandidate(
    candidate: RTCIceCandidate | RTCIceCandidateInit | null
  ) {
    if (!this._isRemoteDescriptionSet) {
      logger.debug(
        'Remote description not set. Queued ICE candidate.',
        candidate
      );
      this._pendingIceCandidates.push(candidate);
      return;
    }

    this._addIceCandidateToPeer(candidate);
  }

  private _addIceCandidateToPeer(
    candidate: RTCIceCandidate | RTCIceCandidateInit | null
  ) {
    const addCandidateResult = this.peer.instance.addIceCandidate(candidate);

    Promise.resolve(addCandidateResult)
      .then(() => {
        logger.debug('Successfully added ICE candidate:', candidate);
      })
      .catch((error) => {
        logger.error('Failed to add ICE candidate:', error, candidate);
      });
  }

  private _sendEndOfCandidates() {
    const msg = new EndOfCandidates({
      sessid: this.session.sessionid,
      endOfCandidates: true,
      dialogParams: this.options,
    });
    this._execute(msg);
  }

  /**
   * Track first candidate and first non-host candidate performance marks.
   * Called from both _onIce and _onTrickleIce.
   */
  private _trackCandidateMarks(candidate: RTCIceCandidate) {
    if (!this._firstCandidateSent) {
      performance.mark(callMarkName(this.id, 'first-candidate'));
      this._firstCandidateSent = true;
    }

    if (!this._firstNonHostCandidateSent) {
      const candidateType = candidate.candidate.match(/typ (\w+)/)?.[1];
      if (candidateType && candidateType !== 'host') {
        performance.mark(callMarkName(this.id, 'first-non-host-candidate'));
        this._firstNonHostCandidateSent = true;
      }
    }
  }

  private _resetTrickleIceCandidateState() {
    this._pendingIceCandidates = [];
    this._isRemoteDescriptionSet = false;
    this._firstCandidateSent = false;
    this._firstNonHostCandidateSent = false;
  }

  private _flushPendingTrickleIceCandidates() {
    if (!this._pendingIceCandidates.length) {
      return;
    }

    const queuedCandidates = [...this._pendingIceCandidates];
    this._pendingIceCandidates = [];

    queuedCandidates.forEach((queuedCandidate) => {
      this._addIceCandidateToPeer(queuedCandidate);
    });
  }

  /**
   * Register peer connection event handlers.
   *
   * The onicecandidate handler chooses the trickle vs non-trickle path from
   * the call configuration. ICE restart follows the same configured path:
   * trickle-enabled calls send restart candidates as Candidate/EndOfCandidates
   * after the Modify offer; non-trickle calls wait for complete SDP before
   * Modify. b2bua-rtc now supports trickled Modify candidates, so the
   * `isIceRestarting` flag no longer forces the non-trickle path.
   */
  private _registerPeerEvents(instance: RTCPeerConnection) {
    instance.onicecandidate = (event) => {
      if (this.options.trickleIce) {
        this._onTrickleIce(event);
        return;
      }

      if (this.peer?.iceDone) {
        return;
      }
      this._onIce(event);
    };

    instance.onicegatheringstatechange = (event) => {
      logger.debug(
        'ICE gathering state changed:',
        instance.iceGatheringState,
        event
      );
      if (instance.iceGatheringState === 'complete') {
        logger.debug('Finished gathering candidates');
        performance.mark(callMarkName(this.id, 'ice-gathering-completed'));
      }
    };

    instance.onicecandidateerror = (event: RTCPeerConnectionIceErrorEvent) => {
      logger.debug('ICE candidate error:', event);
      if (this.peer?.statsReporter) {
        const details = getIceCandidateErrorDetails(event, instance);
        this.peer.statsReporter.reportIceCandidateError(details);
      }
    };

    //@ts-expect-error MediaStreamEvent is not defined
    instance.addEventListener('addstream', (event: MediaStreamEvent) => {
      this.options.remoteStream = event.stream;
    });
    instance.addEventListener('track', (event: RTCTrackEvent) => {
      this.options.remoteStream = event.streams[0];
      const { remoteElement, remoteStream, screenShare } = this.options;
      if (screenShare === false) {
        attachMediaStream(remoteElement, remoteStream);
      }
    });
  }

  private _checkConferenceSerno = (serno: number) => {
    const check =
      serno < 0 ||
      !this._lastSerno ||
      (this._lastSerno && serno === this._lastSerno + 1);
    if (check && serno >= 0) {
      this._lastSerno = serno;
    }
    return check;
  };

  private _onMediaError(error: TelnyxError) {
    const errorName = error?.name || 'UnknownError';
    const errorMessage = error?.message || 'Unknown media error';

    // Use the original error for the deprecated notification to preserve
    // the shape consumers expect (raw DOMException, not TelnyxError wrapper)
    const notificationError = (error?.originalError || error) as Error;
    this._dispatchNotification({
      type: NOTIFICATION_TYPE.userMediaError,
      error: notificationError,
      call: this,
      errorName,
      errorMessage,
    });
    logger.error(`Media error (${errorName}): ${errorMessage}`, error);

    // Emit structured error event (error is a TelnyxError from Peer.ts)
    trigger(
      SwEvent.Error,
      { error, callId: this.id, sessionId: this.session.sessionid },
      this.session.uuid
    );

    void this.hangup({ initiator: 'sdk:media-error' }, false);
  }

  private _onPeerConnectionFailureError(data: {
    warning: ITelnyxWarning;
    error: Error;
    sessionId: string;
  }) {
    this._dispatchNotification({
      type: NOTIFICATION_TYPE.peerConnectionFailureError,
      error: data.error,
    });
    logger.error('Peer connection failure error');

    // Emit structured warning event (warning is an ITelnyxWarning from Peer.ts)
    if (data.warning) {
      trigger(
        SwEvent.Warning,
        {
          warning: data.warning,
          callId: this.id,
          sessionId: this.session.sessionid,
        },
        this.session.uuid
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _onPeerConnectionSignalingStateClosed(data: any) {
    this._signalingStateClosed = true;
    this._dispatchNotification({
      type: NOTIFICATION_TYPE.signalingStateClosed,
      ...data,
    });
    logger.debug(
      'Peer connection signaling state closed, call is not recoverable'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _dispatchConferenceUpdate(params: any) {
    this._dispatchNotification({
      type: NOTIFICATION_TYPE.conferenceUpdate,
      call: this,
      ...params,
    });
  }

  private _dispatchNotification(notification: INotificationEventData) {
    if (this.options.screenShare === true) {
      return;
    }
    if (!trigger(SwEvent.Notification, notification, this.id, false)) {
      trigger(SwEvent.Notification, notification, this.session.uuid);
    }
  }

  private _execute(msg: BaseMessage) {
    if (this.nodeId) {
      msg.targetNodeId = this.nodeId;
    }
    return this.session.execute(msg);
  }

  private _registerInboundAnswerAttempt(): boolean {
    if (this.options.attach || this._isRecovering) {
      return true;
    }

    for (const existingCall of this._getSessionInboundAnswerCalls()) {
      if (existingCall.id === this.id) {
        continue;
      }

      if (!existingCall._isBlockingInboundAnswer()) {
        continue;
      }

      const warning = createTelnyxWarning(DUPLICATE_INBOUND_ANSWER);
      trigger(
        SwEvent.Warning,
        {
          warning,
          callId: this.id,
          activeCallId: existingCall.id,
          sessionId: this.session.sessionid,
          activeSessionId: existingCall.session.sessionid,
        },
        this.session.uuid
      );
      logger.warn(
        `[${this.id}] answer() ignored: inbound call ${existingCall.id} is already answering or active`
      );
      return false;
    }

    return true;
  }

  private _getSessionInboundAnswerCalls(): BaseCall[] {
    return (Object.values(this.session.calls) as Array<BaseCall | null>)
      .filter((call): call is BaseCall => Boolean(call))
      .filter(
        (call) =>
          !call.options.attach &&
          !call._isRecovering &&
          call.direction === Direction.Inbound
      );
  }

  private _isBlockingInboundAnswer(): boolean {
    if ([State.Hangup, State.Destroy, State.Purge].includes(this._state)) {
      return false;
    }

    const isAnsweringOrActive = [
      State.Answering,
      State.Early,
      State.Active,
      State.Held,
    ].includes(this._state);

    if (!this._creatingPeer && !isAnsweringOrActive) {
      return false;
    }

    if (this._creatingPeer && !this.peer?.instance) {
      return true;
    }

    return this._hasUsablePeerConnection();
  }

  private _hasUsablePeerConnection(): boolean {
    const peerConnection = this.peer?.instance;

    if (!peerConnection) {
      return false;
    }

    if (peerConnection.signalingState === 'closed') {
      return false;
    }

    if (peerConnection.connectionState === 'closed') {
      return false;
    }

    if (peerConnection.iceConnectionState === 'closed') {
      return false;
    }

    return true;
  }

  private _init() {
    const {
      id,
      userVariables,
      remoteCallerNumber,
      onNotification,
      recoveredCallId,
    } = this.options;
    if (id) {
      this.options.id = id.toString();
    } else {
      this.options.id = uuidv4();
    }
    this.id = this.options.id;

    if (recoveredCallId) {
      this.recoveredCallId = recoveredCallId;
      this._isRecovering = true;
    }

    if (!userVariables || objEmpty(userVariables)) {
      this.options.userVariables = this.session.options.userVariables || {};
    }
    if (!remoteCallerNumber) {
      this.options.remoteCallerNumber = this.options.destinationNumber;
    }
    this.session.calls[this.id] = this;

    register(SwEvent.MediaError, this._onMediaError, this.id);
    register(
      SwEvent.PeerConnectionFailureError,
      this._onPeerConnectionFailureError,
      this.id
    );
    register(
      SwEvent.PeerConnectionSignalingStateClosed,
      this._onPeerConnectionSignalingStateClosed,
      this.id
    );
    if (isFunction(onNotification)) {
      register(SwEvent.Notification, onNotification.bind(this), this.id);
    }

    // Initialize call report collector (stats + debug logs)
    const enableCallReports = this.session.options.enableCallReports !== false; // Default: true
    const callReportInterval = this.session.options.callReportInterval || 5000; // Default: 5 seconds
    const callReportFlushInterval =
      this.session.options.callReportFlushInterval ?? 180_000; // Default: 3 minutes
    const debugLogLevel = this.session.options.debugLogLevel || 'debug';
    const debugLogMaxEntries = this.session.options.debugLogMaxEntries || 1000;

    if (enableCallReports) {
      this._callReportCollector = new CallReportCollector(
        {
          enabled: true,
          interval: callReportInterval,
          intermediateReportInterval: callReportFlushInterval,
        },
        {
          enabled: true, // Debug logs enabled when call reports are enabled
          level: debugLogLevel,
          maxEntries: debugLogMaxEntries,
        }
      );

      // Wire up size-aware early flush: when the payload approaches the
      // server's 2 MB limit, send an intermediate segment immediately
      // so the buffer can keep collecting for the rest of the call.
      this._callReportCollector.onFlushNeeded = () => {
        this._flushIntermediateReport();
      };

      this._callReportCollector.onWarning = (warning) => {
        trigger(
          SwEvent.Warning,
          {
            warning,
            callId: this.id,
            sessionId: this.session.sessionid,
          },
          this.session.uuid
        );

        // No-RTP detection: when inbound or outbound bytes stop
        // flowing while media should be active, report to the
        // signaling health monitor. This is strong evidence that
        // the media path is broken (unlike low audio level which
        // is ambiguous).
        if (warning.code === LOW_BYTES_RECEIVED) {
          this.session.reportNoRtp?.(this.id, 'inbound');
        } else if (
          warning.code === LOW_BYTES_SENT &&
          this._hasActiveUnmutedLocalAudioTrack()
        ) {
          this.session.reportNoRtp?.(this.id, 'outbound');
        }
      };
    }

    if (this._isRecovering) {
      this.setState(State.Recovering);
    } else {
      this.setState(State.New);
    }
    logger.info(
      `New Call — region: ${this.session.region ?? 'unknown'}, dc: ${this.session.dc ?? 'unknown'}`,
      this.options
    );
  }

  protected _finalize() {
    this._stopStats();
    this._mediaDeviceCollector?.stop();
    this._mediaDeviceCollector = null;

    // Clear call marks at the call lifecycle level so cleanup runs even when
    // no peer was created (e.g. inbound invite rejected before answer()).
    // Peer.close() also clears marks as defense-in-depth.
    clearCallMarks(this.id);

    logger.debug(`[${this.id}] Closing peer from _finalize`);
    this.peer?.close();
    const { remoteStream, localStream, remoteElement, localElement } =
      this.options;
    stopStream(remoteStream);
    stopStream(localStream);
    detachMediaStream(remoteElement, remoteStream);
    detachMediaStream(localElement, localStream);
    deRegister(SwEvent.MediaError, null, this.id);
    deRegister(SwEvent.PeerConnectionFailureError, null, this.id);
    deRegister(SwEvent.PeerConnectionSignalingStateClosed, null, this.id);
    this.session.calls[this.id] = null;
    delete this.session.calls[this.id];

    // Post call report after cleanup. The upload runs in the background,
    // but the session tracks it so disconnect() can wait instead of racing
    // teardown against the final BYE-triggered report POST.
    const callReportUpload = this._postCallReport().catch((error) => {
      logger.error('Unexpected error in _postCallReport', { error });
    });
    this.session.trackCallReportUpload(callReportUpload);
  }

  private _getCallReportVoiceSdkId(): string | undefined {
    return this.session.callReportVoiceSdkId || undefined;
  }

  private _getClientSummary(): IClientSummary {
    const options = this.session.options;
    const anonymousLogin = options.anonymous_login;

    return {
      authentication: {
        type: this._getAuthenticationType(),
        ...(anonymousLogin
          ? {
              anonymousLogin: {
                targetType: anonymousLogin.target_type,
                targetId: anonymousLogin.target_id,
                targetVersionId: anonymousLogin.target_version_id,
                targetParams: this._sanitizeClientOption(
                  anonymousLogin.target_params
                ),
              },
            }
          : {}),
      },
      connection: {
        env: options.env,
        host: options.host,
        project: options.project,
        region: this.session.region ?? options.region,
        dc: this.session.dc,
        rtcIp: options.rtcIp,
        rtcPort: options.rtcPort,
        autoReconnect: options.autoReconnect ?? true,
        maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
        keepConnectionAliveOnSocketClose:
          options.keepConnectionAliveOnSocketClose ?? false,
        hangupOnBeforeUnload: options.hangupOnBeforeUnload !== false,
        useCanaryRtcServer: options.useCanaryRtcServer ?? false,
        skipLastVoiceSdkId: options.skipLastVoiceSdkId ?? false,
        skipTrailing: options.skipTrailing ?? false,
      },
      media: {
        audio: this._sanitizeClientOption(this.options.audio),
        video: this._sanitizeClientOption(this.options.video),
        mutedMicOnStart: this.options.mutedMicOnStart ?? false,
        prefetchIceCandidates: this.options.prefetchIceCandidates ?? true,
        forceRelayCandidate: this.options.forceRelayCandidate ?? false,
        trickleIce: this.options.trickleIce ?? false,
        iceServers: this._sanitizeIceServers(this.options.iceServers),
      },
      callReports: {
        enabled: options.enableCallReports !== false,
        intervalMs: options.callReportInterval || 5000,
        flushIntervalMs: options.callReportFlushInterval ?? 180_000,
        debugLogLevel: options.debugLogLevel || 'debug',
        debugLogMaxEntries: options.debugLogMaxEntries || 1000,
      },
    };
  }

  private _getAuthenticationType(): NonNullable<
    IClientSummary['authentication']
  >['type'] {
    const options = this.session.options;

    if (options.anonymous_login) return 'anonymous_login';
    if (options.login_token) return 'login_token';
    if (options.login && (options.password || options.passwd)) {
      return 'login_password';
    }
    if (options.token) return 'token';

    return 'unknown';
  }

  private _sanitizeIceServers(
    iceServers?: RTCIceServer[]
  ): NonNullable<IClientSummary['media']>['iceServers'] {
    if (!iceServers || iceServers.length === 0) return undefined;

    return iceServers.map(({ urls, username, credential }) => ({
      urls,
      hasUsername: Boolean(username),
      hasCredential: Boolean(credential),
    }));
  }

  private _sanitizeClientOption(
    value: unknown,
    depth = 0
  ): SanitizedClientOption | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number')
      return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'function') return undefined;
    if (depth >= 4) return '[truncated]';

    if (Array.isArray(value)) {
      return value
        .map((item) => this._sanitizeClientOption(item, depth + 1))
        .filter((item): item is SanitizedClientOption => item !== undefined);
    }

    if (typeof value === 'object') {
      const sanitizedEntries = Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !this._isSensitiveClientOptionKey(key))
        .map(
          ([key, childValue]) =>
            [key, this._sanitizeClientOption(childValue, depth + 1)] as const
        )
        .filter(
          (entry): entry is readonly [string, SanitizedClientOption] =>
            entry[1] !== undefined
        );

      return Object.fromEntries(sanitizedEntries);
    }

    return undefined;
  }

  private _isSensitiveClientOptionKey(key: string): boolean {
    return /(password|passwd|credential|secret|token|authorization|auth|api[_-]?key)/i.test(
      key
    );
  }

  /**
   * Flush an intermediate call report segment mid-call.
   * Used for periodic, size-limit, and socket-close safety flushes without
   * falsely finalizing the call.
   */
  public flushIntermediateCallReport(
    flushReason: ICallReportFlushReason = { type: 'manual' }
  ) {
    this._flushIntermediateReport(flushReason);
  }

  private _flushIntermediateReport(
    flushReason: ICallReportFlushReason = { type: 'buffer-limit' }
  ) {
    if (!this._callReportCollector) return;

    // Generate a synthetic call_report_id when the server hasn't assigned one
    // yet (e.g. socket closed before REGED/login completed, or the SDK
    // reconnected and lost the prior session's call_report_id). A synthetic
    // ID prefixed with "gen-" lets voice-sdk-debug distinguish
    // client-generated IDs from server-assigned ones.
    let callReportId = this.session.callReportId;
    if (!callReportId) {
      callReportId = `gen-${uuidv4()}`;
      this.session.callReportId = callReportId;
      logger.info(
        'Generated synthetic call_report_id for intermediate flush (socket never connected or ID lost)',
        { callReportId, callId: this.id, flushReason: flushReason.type }
      );
    }

    // Prefer the live connection host, fall back to the configured host so
    // we can still POST even when the socket is closed / never connected.
    const host = this.session.connection?.host ?? this.session.options.host;
    if (!host) {
      logger.debug(
        'Cannot flush intermediate report: no host available (connection or options)'
      );
      return;
    }

    const summary = {
      callId: this.id,
      destinationNumber: this.options.destinationNumber,
      callerNumber: this.options.callerNumber,
      direction: (this.direction === Direction.Inbound
        ? 'inbound'
        : 'outbound') as 'inbound' | 'outbound',
      state: this.state,
      telnyxSessionId: this.options.telnyxSessionId,
      telnyxLegId: this.options.telnyxLegId,
      sdkVersion: SDK_VERSION,
      clientSummary: this._getClientSummary(),
    };

    const payload = this._callReportCollector.flush(summary, flushReason);
    if (!payload) return;

    logger.info('Flushing intermediate call report', {
      callId: this.id,
      flushReason,
      segment: payload.segment,
    });

    const callReportVoiceSdkId = this._getCallReportVoiceSdkId();

    // Fire-and-forget — don't block the stats collection interval,
    // but track the upload so disconnect() can drain in-flight reports.
    const upload = this._callReportCollector
      .sendPayload(payload, callReportId, host, callReportVoiceSdkId)
      .catch((error) => {
        logger.error('Failed to post intermediate call report segment', {
          error,
        });
        // Persist to browser storage so the report can be retried after the
        // socket re-establishes or on the next session startup. The payload
        // has already been drained from the collector's buffers, so if we
        // don't persist it here it is permanently lost.
        const persisted = enqueuePendingReport({
          payload,
          callReportId,
          host,
          voiceSdkId: callReportVoiceSdkId,
          queuedAt: Date.now(),
        });
        if (persisted) {
          logger.info(
            'Persisted failed intermediate report to browser storage for retry',
            { callId: this.id, callReportId, segment: payload.segment }
          );
        }
      });
    this.session.trackCallReportUpload(upload);
  }

  private async _postCallReport() {
    if (!this._callReportCollector) {
      logger.warn('Call report collector not initialized');
      return;
    }

    // Await stop() so the final stats collection (including partial
    // intervals for short calls) completes before we post the report.
    await this._callReportCollector.stop();

    // Generate a synthetic call_report_id when the server hasn't assigned
    // one (socket never connected, REGED never received, or ID lost on
    // reconnect). This ensures reports are submitted even when the socket
    // failed to connect entirely.
    let callReportId = this.session.callReportId;
    if (!callReportId) {
      callReportId = `gen-${uuidv4()}`;
      this.session.callReportId = callReportId;
      logger.info(
        'Generated synthetic call_report_id for final report (socket never connected or ID lost)',
        { callReportId, callId: this.id }
      );
    }

    const summary = {
      callId: this.id,
      destinationNumber: this.options.destinationNumber,
      callerNumber: this.options.callerNumber,
      direction: (this.direction === Direction.Inbound
        ? 'inbound'
        : 'outbound') as 'inbound' | 'outbound',
      state: this.state,
      telnyxSessionId: this.options.telnyxSessionId,
      telnyxLegId: this.options.telnyxLegId,
      sdkVersion: SDK_VERSION,
      clientSummary: this._getClientSummary(),
    };

    // Build the payload via buildFinalPayload so we have a reference to
    // persist if the POST fails. Fall back to the configured host so we
    // can still POST even when the socket is closed / never connected.
    const host = this.session.connection?.host ?? this.session.options.host;
    if (!host) {
      logger.error('Cannot post call report: no host available (connection or options)');
      this._callReportCollector.cleanup();
      return;
    }

    const callReportVoiceSdkId = this._getCallReportVoiceSdkId();

    const payload = this._callReportCollector.buildFinalPayload(summary);
    if (!payload) {
      // No stats or logs collected, or reports disabled — nothing to send.
      this._callReportCollector.cleanup();
      return;
    }

    try {
      await this._callReportCollector.sendPayload(
        payload,
        callReportId,
        host,
        callReportVoiceSdkId
      );
    } catch (error) {
      logger.error('Failed to post call report', { error });
      // Persist the final report to browser storage so it can be retried
      // after the socket re-establishes or on the next session startup.
      // The payload is already built and the collector is about to be
      // cleaned up, so if we don't persist it here it is permanently lost.
      const persisted = enqueuePendingReport({
        payload,
        callReportId,
        host,
        voiceSdkId: callReportVoiceSdkId,
        queuedAt: Date.now(),
      });
      if (persisted) {
        logger.info(
          'Persisted failed final report to browser storage for retry',
          { callId: this.id, callReportId }
        );
      }
    } finally {
      // Clean up log collector resources
      this._callReportCollector?.cleanup();
    }
  }

  private _startStats(interval: number) {
    this._statsIntervalId = setInterval(this._doStats, interval);
    logger.info('Stats started');
  }

  private _stopStats() {
    if (this._statsIntervalId) {
      clearInterval(this._statsIntervalId);
      this._statsIntervalId = null;
    }
    logger.debug('Stats stopped');
  }

  private _doStats = () => {
    if (!this.peer || !this.peer.instance) {
      // cannot get stats
      return;
    }

    if (this._statsBindings.length === 0) {
      // nothing to do
      return;
    }

    this.peer.instance.getStats().then((res) => {
      res.forEach((report) => {
        this._statsBindings.forEach((binding) => {
          if (!binding.callback) {
            return;
          }
          if (binding.constraints) {
            for (const key in binding.constraints) {
              if (
                binding.constraints.hasOwnProperty(key) &&
                binding.constraints[key] !== report[key]
              ) {
                return;
              }
            }
          }
          binding.callback(report);
        });
      });
    });
  };

  static setStateTelnyx = (call: Call) => {
    if (!call) {
      return;
    }
    switch (call._state) {
      case State.Recovering:
        call.state = 'recovering';
        break;
      case State.Requesting:
      case State.Trying:
      case State.Early:
        call.state = 'connecting';
        break;
      case State.Active:
        call.state = 'active';
        break;
      case State.Held:
        call.state = 'held';
        break;
      case State.Hangup:
      case State.Destroy:
        call.state = 'done';
        break;
      case State.Answering:
        call.state = 'ringing';
        break;
      case State.New:
        call.state = 'new';
        break;
      default:
        break;
    }

    return call;
  };
}
