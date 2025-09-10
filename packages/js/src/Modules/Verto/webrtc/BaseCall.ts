import { WebRTCStats } from '@peermetrics/webrtc-stats';
import { v4 as uuidv4 } from 'uuid';
import pkg from '../../../../package.json';
import BrowserSession from '../BrowserSession';
import BaseMessage from '../messages/BaseMessage';
import { Answer, Attach, Bye, Candidate, Info, Invite, Modify } from '../messages/Verto';
import { deRegister, register, trigger } from '../services/Handler';
import { SwEvent } from '../util/constants';
import { isFunction, mutateLiveArrayData, objEmpty } from '../util/helpers';
import { INotificationEventData } from '../util/interfaces';
import logger from '../util/logger';
import {
  attachMediaStream,
  getUserMedia,
  setMediaElementSinkId,
  stopStream,
} from '../util/webrtc';
import Call from './Call';
import { MCULayoutEventHandler } from './LayoutHandler';
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
} from './constants';
import {
  checkSubscribeResponse,
  createAudio,
  disableAudioTracks,
  disableVideoTracks,
  enableAudioTracks,
  enableVideoTracks,
  playAudio,
  stopAudio,
  toggleAudioTracks,
  toggleVideoTracks,
} from './helpers';
import {
  AnswerParams,
  IAudio,
  IStatsBinding,
  IVertoCallOptions,
  IWebRTCCall,
} from './interfaces';
const SDK_VERSION = pkg.version;

/**
 * @ignore Hide in docs output
 */
export default abstract class BaseCall implements IWebRTCCall {
  private _webRTCStats: WebRTCStats | null;

  /**
   * The call identifier.
   */
  public id: string = '';

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

  private _state: State = State.New;

  private _prevState: State = State.New;

  private gotAnswer: boolean = false;

  private gotEarly: boolean = false;

  private _lastSerno: number = 0;

  private _targetNodeId: string = null;

  private _iceTimeout = null;

  private _initialSdpSent: boolean = false;

  private _ringtone: IAudio;

  private _ringback: IAudio;

  private _statsBindings: IStatsBinding[] = [];

  private _statsIntervalId: any = null;

  constructor(protected session: BrowserSession, opts?: IVertoCallOptions) {
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
        iceServers,
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
      },
      opts
    );

    this._onMediaError = this._onMediaError.bind(this);
    this._init();

    // Create _rings HTMLAudioElement
    if (this.options) {
      this._ringtone = createAudio(this.options.ringtoneFile, '_ringtone');
      this._ringback = createAudio(this.options.ringbackFile, '_ringback');
    }
  }

  private get performanceMetrics() {
    const peerCreation = performance.measure(
      'peer-creation',
      'peer-creation-start',
      'peer-creation-end'
    );

    const iceGathering = performance.measure(
      'ice-gathering',
      'ice-gathering-start',
      'ice-gathering-end'
    );

    const sdpSend = performance.measure(
      'sdp-send',
      'sdp-send-start',
      'sdp-send-end'
    );

    const totalDuration = performance.measure(
      'total-duration',
      'peer-creation-start',
      'sdp-send-end'
    );

    const formatDuration = (dur: number) => `${dur.toFixed(2)}ms`;
    return {
      'Peer Creation': {
        duration: formatDuration(peerCreation.duration),
      },
      'ICE Gathering': {
        duration: formatDuration(iceGathering.duration),
      },
      'SDP Send': {
        duration: formatDuration(sdpSend.duration),
      },
      'Total Duration': {
        duration: formatDuration(totalDuration.duration),
      },
    };
  }
  get nodeId(): string {
    return this._targetNodeId;
  }

  set nodeId(what: string) {
    this._targetNodeId = what;
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

  invite() {
    this.direction = Direction.Outbound;
    performance.mark(`peer-creation-start`);
    this.peer = new Peer(PeerType.Offer, this.options, this.session);
    this._registerPeerEvents();
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
  answer(params: AnswerParams = {}) {
    this.stopRingtone();

    this.options.video = params.video ?? this.options.video ?? false;
    this.direction = Direction.Inbound;

    if (params?.customHeaders?.length > 0) {
      this.options = {
        ...this.options,
        customHeaders: params.customHeaders,
      };
    }
    if (params.preferred_codecs?.length > 0) {
      this.options.preferred_codecs = params.preferred_codecs;
    }

    this.peer = new Peer(PeerType.Answer, this.options, this.session);
    this._registerPeerEvents();
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
  hangup(): void;
  /**
   * @internal
   */
  hangup(hangupParams, hangupExecute): void;
  /**
   * @internal
   * @param hangupParams _For internal use_ Specify custom hangup cause and call ID
   * @param hangupExecute _For internal use_ Allow or prevent execution of `Bye`
   */
  hangup(hangupParams?: any, hangupExecute?: boolean): void {
    let params = hangupParams || {};
    let execute = hangupExecute === false ? false : true;

    this.cause = params.cause || 'NORMAL_CLEARING';
    this.causeCode = params.causeCode || 16;
    this.sipCode = params.sipCode || null;
    this.sipReason = params.sipReason || null;
    this.sipCallId = params.sip_call_id || null;
    this.options.customHeaders = [
      ...(this.options.customHeaders ?? []),
      ...(params?.dialogParams?.customHeaders ?? []),
    ];
    this.setState(State.Hangup);

    const _close = () => {
      this.peer?.close();
      return this.setState(State.Destroy);
    };

    this.stopRingtone();
    this.stopRingback();
    if (execute) {
      const bye = new Bye({
        sessid: this.session.sessionid,
        dialogParams: this.options,
        cause: 'USER_BUSY',
        causeCode: 17,
      });
      this._execute(bye)
        .catch((error) => {
          logger.error('telnyx_rtc.bye failed!', error);
          trigger(
            SwEvent.Error,
            { error, sessionId: this.session.sessionid },
            this.session.uuid
          );
        })
        .then(_close.bind(this));
    } else {
      _close();
    }
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
  hold(): Promise<any> {
    const msg = new Modify({
      sessid: this.session.sessionid,
      action: 'hold',
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
  unhold(): Promise<any> {
    const msg = new Modify({
      sessid: this.session.sessionid,
      action: 'unhold',
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
  toggleHold(): Promise<any> {
    const msg = new Modify({
      sessid: this.session.sessionid,
      action: 'toggleHold',
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
    enableAudioTracks(this.options.localStream);
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
    toggleAudioTracks(this.options.localStream);
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
   * @returns Promise that resolves if the audio input device has been updated
   */
  async setAudioInDevice(deviceId: string): Promise<void> {
    const { instance } = this.peer;
    const sender = instance
      .getSenders()
      .find(({ track: { kind } }: RTCRtpSender) => kind === 'audio');
    if (sender) {
      const newStream = await getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      const audioTrack = newStream.getAudioTracks()[0];
      sender.replaceTrack(audioTrack);
      this.options.micId = deviceId;

      const { localStream } = this.options;
      localStream.getAudioTracks().forEach((t) => t.stop());
      localStream.getVideoTracks().forEach((t) => newStream.addTrack(t));
      this.options.localStream = newStream;
    }
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
      let p = sender.getParameters();
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
        .catch((e) => console.error(e));
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

  /**
   * Registers callback for stats.
   *
   * @param callback
   * @param constraints
   * @returns
   */
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

  setState(state: State) {
    this._prevState = this._state;
    this._state = state;
    this.state = State[this._state].toLowerCase();
    this.prevState = State[this._prevState].toLowerCase();
    logger.info(
      `Call ${this.id} state change from ${this.prevState} to ${this.state}`
    );

    this._dispatchNotification({
      type: NOTIFICATION_TYPE.callUpdate,
      call: this,
    });

    switch (state) {
      case State.Purge:
        this.hangup({ cause: 'PURGE', causeCode: '01' }, false);
        break;
      case State.Active: {
        setTimeout(() => {
          const { remoteElement, speakerId } = this.options;
          if (remoteElement && speakerId) {
            setMediaElementSinkId(remoteElement, speakerId);
          }
        }, 0);
        break;
      }
      case State.Destroy:
        this._finalize();
        break;
    }
  }

  // Handle messages from Server to Client
  handleMessage(msg: any) {
    const { method, params } = msg;

    switch (method) {
      case VertoMethod.Answer: {
        this.gotAnswer = true;
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
        if (this._state >= State.Early) {
          return;
        }
        this.gotEarly = true;
        this._onRemoteSdp(params.sdp);
        break;
      }
      case VertoMethod.Display:
      case VertoMethod.Attach: {
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
        this.hangup(params, false);
        break;
    }
  }

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
        if (modChannel && role === Role.Moderator) {
          await this._subscribeConferenceModerator(modChannel);
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

  private _confControl(channel: string, params: any = {}) {
    const data = {
      application: 'conf-control',
      callID: this.id,
      value: null,
      ...params,
    };
    this.session.vertoBroadcast({ nodeId: this.nodeId, channel, data });
  }

  private async _subscribeConferenceModerator(channel: string) {
    const _modCommand = (
      command: string,
      memberID: any = null,
      value: any = null
    ): void => {
      const id = parseInt(memberID) || null;
      this._confControl(channel, { command, id, value });
    };

    const _videoRequired = (): void => {
      const { video } = this.options;
      if (
        (typeof video === 'boolean' && !video) ||
        (typeof video === 'object' && objEmpty(video))
      ) {
        throw `Conference ${this.id} has no video!`;
      }
    };

    const tmp = {
      nodeId: this.nodeId,
      channels: [channel],
      handler: (params: any) => {
        const { data } = params;
        switch (data['conf-command']) {
          case 'list-videoLayouts':
            if (data.responseData) {
              const tmp = JSON.stringify(data.responseData).replace(
                /IDS"/g,
                'Ids"'
              );
              // TODO: revert layouts JSON structure
              this._dispatchConferenceUpdate({
                action: ConferenceAction.LayoutList,
                layouts: JSON.parse(tmp),
              });
            }
            break;
          default:
            this._dispatchConferenceUpdate({
              action: ConferenceAction.ModCmdResponse,
              command: data['conf-command'],
              response: data.response,
            });
        }
      },
    };
    const response = await this.session.vertoSubscribe(tmp).catch((error) => {
      logger.error('ConfMod subscription error:', error);
    });
    if (checkSubscribeResponse(response, channel)) {
      this.role = Role.Moderator;
      this._addChannel(channel);
      Object.defineProperties(this, {
        listVideoLayouts: {
          configurable: true,
          value: () => {
            _modCommand('list-videoLayouts');
          },
        },
        playMedia: {
          configurable: true,
          value: (file: string) => {
            _modCommand('play', null, file);
          },
        },
        stopMedia: {
          configurable: true,
          value: () => {
            _modCommand('stop', null, 'all');
          },
        },
        deaf: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('deaf', memberID);
          },
        },
        undeaf: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('undeaf', memberID);
          },
        },
        startRecord: {
          configurable: true,
          value: (file: string) => {
            _modCommand('recording', null, ['start', file]);
          },
        },
        stopRecord: {
          configurable: true,
          value: () => {
            _modCommand('recording', null, ['stop', 'all']);
          },
        },
        snapshot: {
          configurable: true,
          value: (file: string) => {
            _videoRequired();
            _modCommand('vid-write-png', null, file);
          },
        },
        setVideoLayout: {
          configurable: true,
          value: (layout: string, canvasID: number) => {
            _videoRequired();
            const value = canvasID ? [layout, canvasID] : layout;
            _modCommand('vid-layout', null, value);
          },
        },
        kick: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('kick', memberID);
          },
        },
        muteMic: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('tmute', memberID);
          },
        },
        muteVideo: {
          configurable: true,
          value: (memberID: number | string) => {
            _videoRequired();
            _modCommand('tvmute', memberID);
          },
        },
        presenter: {
          configurable: true,
          value: (memberID: number | string) => {
            _videoRequired();
            _modCommand('vid-res-id', memberID, 'presenter');
          },
        },
        videoFloor: {
          configurable: true,
          value: (memberID: number | string) => {
            _videoRequired();
            _modCommand('vid-floor', memberID, 'force');
          },
        },
        banner: {
          configurable: true,
          value: (memberID: number | string, text: string) => {
            _videoRequired();
            _modCommand('vid-banner', memberID, encodeURI(text));
          },
        },
        volumeDown: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('volume_out', memberID, 'down');
          },
        },
        volumeUp: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('volume_out', memberID, 'up');
          },
        },
        gainDown: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('volume_in', memberID, 'down');
          },
        },
        gainUp: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('volume_in', memberID, 'up');
          },
        },
        transfer: {
          configurable: true,
          value: (memberID: number | string, exten: string) => {
            _modCommand('transfer', memberID, exten);
          },
        },
      });
    }
  }

  private _handleChangeHoldStateSuccess(response) {
    response.holdState === 'active'
      ? this.setState(State.Active)
      : this.setState(State.Held);
    return true;
  }

  private _handleChangeHoldStateError(error) {
    logger.error(`Failed to ${error.action} on call ${this.id}`);
    return false;
  }

  private async _onRemoteSdp(remoteSdp: string) {
    const sdp = new RTCSessionDescription({ sdp: remoteSdp, type: 'answer' });

    await this.peer.instance
      .setRemoteDescription(sdp)
      .then(() => {
        if (this.gotEarly) {
          this.setState(State.Early);
        }
        if (this.gotAnswer) {
          this.setState(State.Active);
        }
      })
      .catch((error) => {
        logger.error('Call setRemoteDescription Error: ', error);
        this.hangup();
      });
  }

  private _onIceSdp(data: RTCSessionDescription) {
    this._initialSdpSent = true;
    const { sdp, type } = data;

    let msg = null;

    const tmpParams = {
      sessid: this.session.sessionid,
      sdp,
      dialogParams: this.options,
      'User-Agent': `Web-${SDK_VERSION}`,
    };

    switch (type) {
      case PeerType.Offer:
        this.setState(State.Requesting);
        msg = new Invite(tmpParams);
        break;
      case PeerType.Answer:
        this.setState(State.Answering);
        msg =
          this.options.attach === true
            ? new Attach(tmpParams)
            : new Answer(tmpParams);
        break;
      default:
        logger.error(`${this.id} - Unknown local SDP type:`, data);
        return this.hangup({}, false);
    }

    performance.mark('sdp-send-start');
    this._execute(msg)
      .then((response) => {
        const { node_id = null } = response;
        this._targetNodeId = node_id;
        type === PeerType.Offer
          ? this.setState(State.Trying)
          : this.setState(State.Active);
      })
      .catch((error) => {
        logger.error(`${this.id} - Sending ${type} error:`, error);
        this.hangup();
      })
      .finally(() => {
        performance.mark('sdp-send-end');
        console.group('Performance Metrics');
        console.table(this.performanceMetrics);
        console.groupEnd();

        performance.clearMarks();
      });
  }

  private _onIce(event: RTCPeerConnectionIceEvent) {
    const { instance } = this.peer;

    if (event.candidate) {
      if (event.candidate.type === 'host' && event.candidate.candidate !== '') return;

      logger.debug('RTCPeer Candidate:', event.candidate);
      
      // Handle end-of-candidates indication (empty string per RFC8838)
      if (event.candidate.candidate === '') {
        logger.debug('End-of-candidates received (empty string candidate)');
        if (this._initialSdpSent) {
          this._sendIceCandidate(event.candidate);
        }
        return;
      }

      if (!this._initialSdpSent) {
        this._onIceSdp(instance.localDescription);
      } else {
        this._sendIceCandidate(event.candidate);
      }
    }
  }

  private _sendIceCandidate(candidate: RTCIceCandidate) {
    const msg = new Candidate({
      sessid: this.session.sessionid,
      candidate: { // https://www.w3.org/TR/webrtc/#dom-peerconnection-addicecandidate
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
        usernameFragment: candidate.usernameFragment
      },
      dialogParams: this.options,
    });
    this._execute(msg);
  }

  private _addIceCandidate(candidate: RTCIceCandidate) {
    try {
      this.peer.instance.addIceCandidate(candidate)
        .then(() => {
          logger.debug('Successfully added ICE candidate:', candidate);
        })
        .catch((error) => {
          logger.error('Failed to add ICE candidate:', error, candidate);
        });
    } catch (error) {
      logger.error('Invalid ICE candidate format:', error, candidate);
    }
  }

  private _sendEndOfCandidates() {
    const msg = new Info({
      sessid: this.session.sessionid,
      endOfCandidates: true,
      dialogParams: this.options,
    });
    this._execute(msg);
  }

  private _registerPeerEvents() {
    const { instance } = this.peer;
    this._initialSdpSent = false;
    instance.onicecandidate = (event) => {
      if (this._initialSdpSent) {
        return;
      }
      this._onIce(event);
    };

    instance.onicegatheringstatechange = (event) => {
      logger.debug('ICE gathering state changed:', instance.iceGatheringState);
      if (instance.iceGatheringState === 'complete') {
        if (!this._initialSdpSent) {
          logger.warn('ICE gathering completed but no candidates were sent', event);
        } else {
          logger.debug('Finished gathering candidates');
        }

        performance.mark('ice-gathering-end');
        this._sendEndOfCandidates();
        instance.removeEventListener('icecandidate', this._onIce);
      }
    };

    instance.onicecandidateerror = (event) => {
      logger.error('ICE candidate error:', event);
    };

    //@ts-ignore
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

  private _onMediaError(error: any) {
    this._dispatchNotification({
      type: NOTIFICATION_TYPE.userMediaError,
      error,
    });
    this.hangup({}, false);
  }

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

  private _init() {
    const { id, userVariables, remoteCallerNumber, onNotification } =
      this.options;
    if (!id) {
      this.options.id = uuidv4();
    }
    this.id = this.options.id;

    if (!userVariables || objEmpty(userVariables)) {
      this.options.userVariables = this.session.options.userVariables || {};
    }
    if (!remoteCallerNumber) {
      this.options.remoteCallerNumber = this.options.destinationNumber;
    }
    this.session.calls[this.id] = this;

    register(SwEvent.MediaError, this._onMediaError, this.id);
    if (isFunction(onNotification)) {
      register(SwEvent.Notification, onNotification.bind(this), this.id);
    }

    this.setState(State.New);
    logger.info('New Call with Options:', this.options);
  }

  protected _finalize() {
    this._stopStats();
    if (this.peer && this.peer.instance) {
      this.peer.instance.close();
      this.peer = null;
    }
    const { remoteStream, localStream } = this.options;
    stopStream(remoteStream);
    stopStream(localStream);
    deRegister(SwEvent.MediaError, null, this.id);
    this.session.calls[this.id] = null;
    delete this.session.calls[this.id];
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
    logger.info('Stats stopped');
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
            for (var key in binding.constraints) {
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
      case State.Requesting:
      case State.Recovering:
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
