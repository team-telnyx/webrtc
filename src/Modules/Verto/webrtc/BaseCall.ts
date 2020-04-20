import { v4 as uuidv4 } from 'uuid'
import logger from '../util/logger'
import BrowserSession from '../BrowserSession'
import BaseMessage from '../messages/BaseMessage'
import { Invite, Answer, Attach, Bye, Modify, Info } from '../messages/Verto'
import Peer from './Peer'
import { SwEvent } from '../util/constants'
import { State, DEFAULT_CALL_OPTIONS, ConferenceAction, Role, PeerType, VertoMethod, NOTIFICATION_TYPE, Direction } from './constants'
import { trigger, register, deRegister } from '../services/Handler'
import { sdpStereoHack, sdpMediaOrderHack, checkSubscribeResponse, enableAudioTracks, disableAudioTracks, toggleAudioTracks, enableVideoTracks, disableVideoTracks, toggleVideoTracks } from './helpers'
import { objEmpty, mutateLiveArrayData, isFunction } from '../util/helpers'
import { CallOptions, IWebRTCCall } from './interfaces'
import { attachMediaStream, detachMediaStream, sdpToJsonHack, stopStream, getUserMedia, setMediaElementSinkId } from '../util/webrtc'
import { MCULayoutEventHandler } from './LayoutHandler'

export default abstract class BaseCall implements IWebRTCCall {
  public id: string = ''
  public state: string = State[State.New]
  public prevState: string = ''
  public direction: Direction
  public peer: Peer
  public options: CallOptions
  public cause: string
  public causeCode: number
  public channels: string[] = []
  public role: string = Role.Participant
  public extension: string = null

  private _state: State = State.New
  private _prevState: State = State.New
  private gotAnswer: boolean = false
  private gotEarly: boolean = false
  private _lastSerno: number = 0
  private _targetNodeId: string = null
  private _iceTimeout = null
  private _iceDone: boolean = false

  constructor(protected session: BrowserSession, opts?: CallOptions) {
    const { iceServers, speaker: speakerId, micId, micLabel, camId, camLabel, localElement, remoteElement, mediaConstraints: { audio, video } } = session
    this.options = Object.assign({}, DEFAULT_CALL_OPTIONS, { audio, video, iceServers, localElement, remoteElement, micId, micLabel, camId, camLabel, speakerId }, opts)

    this._onMediaError = this._onMediaError.bind(this)
    this._init()
  }

  get nodeId(): string {
    return this._targetNodeId
  }

  set nodeId(what: string) {
    this._targetNodeId = what
  }

  get localStream() {
    return this.options.localStream
  }

  get remoteStream() {
    return this.options.remoteStream
  }

  get memberChannel() {
    return `conference-member.${this.id}`
  }

  invite() {
    this.direction = Direction.Outbound
    this.peer = new Peer(PeerType.Offer, this.options)
    this._registerPeerEvents()
  }

  answer() {
    this.direction = Direction.Inbound
    this.peer = new Peer(PeerType.Answer, this.options)
    this._registerPeerEvents()
  }

  hangup(params: any = {}, execute: boolean = true) {
    this.cause = params.cause || 'NORMAL_CLEARING'
    this.causeCode = params.causeCode || 16
    this.setState(State.Hangup)
    const _close = () => {
      this.peer ? this.peer.instance.close() : null
      this.setState(State.Destroy)
    }

    if (execute) {
      const bye = new Bye({ sessid: this.session.sessionid, dialogParams: this.options })
      console.log("bye=====>", bye)
      this._execute(bye)
        .catch(error => logger.error('telnyl_rtc.bye failed!', error))
        .then(_close.bind(this))
    } else {
      _close()
    }
  }

  transfer(destination: string) {
    const msg = new Modify({ sessid: this.session.sessionid, action: 'transfer', destination, dialogParams: this.options })
    this._execute(msg)
  }

  replace(replaceCallID: string) {
    const msg = new Modify({ sessid: this.session.sessionid, action: 'replace', replaceCallID, dialogParams: this.options })
    this._execute(msg)
  }

  hold() {
    const msg = new Modify({ sessid: this.session.sessionid, action: 'hold', dialogParams: this.options })
    return this._execute(msg)
      .then(this._handleChangeHoldStateSuccess.bind(this))
      .catch(this._handleChangeHoldStateError.bind(this))
  }

  unhold() {
    const msg = new Modify({ sessid: this.session.sessionid, action: 'unhold', dialogParams: this.options })
    return this._execute(msg)
      .then(this._handleChangeHoldStateSuccess.bind(this))
      .catch(this._handleChangeHoldStateError.bind(this))
  }

  toggleHold() {
    const msg = new Modify({ sessid: this.session.sessionid, action: 'toggleHold', dialogParams: this.options })
    return this._execute(msg)
      .then(this._handleChangeHoldStateSuccess.bind(this))
      .catch(this._handleChangeHoldStateError.bind(this))
  }

  dtmf(dtmf: string) {
    const msg = new Info({ sessid: this.session.sessionid, dtmf, dialogParams: this.options })
    this._execute(msg)
  }

  message(to: string, body: string) {
    const msg = { from: this.session.options.login, to, body }
    const info = new Info({ sessid: this.session.sessionid, msg, dialogParams: this.options })
    this._execute(info)
  }

  muteAudio() {
    disableAudioTracks(this.options.localStream)
  }

  unmuteAudio() {
    enableAudioTracks(this.options.localStream)
  }

  toggleAudioMute() {
    toggleAudioTracks(this.options.localStream)
  }

  async setAudioInDevice(deviceId: string): Promise<void> {
    const { instance } = this.peer
    const sender = instance.getSenders().find(({ track: { kind } }: RTCRtpSender) => kind === 'audio')
    if (sender) {
      const newStream = await getUserMedia({ audio: { deviceId: { exact: deviceId } } })
      const audioTrack = newStream.getAudioTracks()[0]
      sender.replaceTrack(audioTrack)
      this.options.micId = deviceId

      const { localStream } = this.options
      localStream.getAudioTracks().forEach(t => t.stop())
      localStream.getVideoTracks().forEach(t => newStream.addTrack(t))
      this.options.localStream = newStream
    }
  }

  muteVideo() {
    disableVideoTracks(this.options.localStream)
  }

  unmuteVideo() {
    enableVideoTracks(this.options.localStream)
  }

  toggleVideoMute() {
    toggleVideoTracks(this.options.localStream)
  }

  async setVideoDevice(deviceId: string): Promise<void> {
    const { instance } = this.peer
    const sender = instance.getSenders().find(({ track: { kind } }: RTCRtpSender) => kind === 'video')
    if (sender) {
      const newStream = await getUserMedia({ video: { deviceId: { exact: deviceId } } })
      const videoTrack = newStream.getVideoTracks()[0]
      sender.replaceTrack(videoTrack)
      const { localElement, localStream } = this.options
      attachMediaStream(localElement, newStream)
      this.options.camId = deviceId

      localStream.getAudioTracks().forEach(t => newStream.addTrack(t))
      localStream.getVideoTracks().forEach(t => t.stop())
      this.options.localStream = newStream
    }
  }

  deaf() {
    disableAudioTracks(this.options.remoteStream)
  }

  undeaf() {
    enableAudioTracks(this.options.remoteStream)
  }

  toggleDeaf() {
    toggleAudioTracks(this.options.remoteStream)
  }

  setState(state: State) {
    this._prevState = this._state
    this._state = state
    this.state = State[this._state].toLowerCase()
    this.prevState = State[this._prevState].toLowerCase()
    logger.info(`Call ${this.id} state change from ${this.prevState} to ${this.state}`)

    this._dispatchNotification({ type: NOTIFICATION_TYPE.callUpdate, call: this })

    switch (state) {
      case State.Purge:
        this.hangup({ cause: 'PURGE', causeCode: '01' }, false)
        break
      case State.Active: {
        setTimeout(() => {
          const { remoteElement, speakerId } = this.options
          if (remoteElement && speakerId) {
            setMediaElementSinkId(remoteElement, speakerId)
          }
        }, 0)
        break
      }
      case State.Destroy:
        this._finalize()
        break
    }
  }

  handleMessage(msg: any) {
    const { method, params } = msg
    switch (method) {
      case VertoMethod.Answer: {
        this.gotAnswer = true
        if (this._state >= State.Active) {
          return
        }
        if (this._state >= State.Early) {
          this.setState(State.Active)
        }
        if (!this.gotEarly) {
          this._onRemoteSdp(params.sdp)
        }
        break
      }
      case VertoMethod.Media: {
        if (this._state >= State.Early) {
          return
        }
        this.gotEarly = true
        this._onRemoteSdp(params.sdp)
        break
      }
      case VertoMethod.Display:
      case VertoMethod.Attach: {
        // TODO: manage caller_id_name, caller_id_number, callee_id_name, callee_id_number
        const { display_name: displayName, display_number: displayNumber, display_direction } = params
        this.extension = displayNumber
        const displayDirection = display_direction === Direction.Inbound ? Direction.Outbound : Direction.Inbound
        const notification = { type: NOTIFICATION_TYPE[method], call: this, displayName, displayNumber, displayDirection }
        if (!trigger(SwEvent.Notification, notification, this.id)) {
          trigger(SwEvent.Notification, notification, this.session.uuid)
        }
        break
      }
      case VertoMethod.Info:
      case VertoMethod.Event: {
        const notification = { ...params, type: NOTIFICATION_TYPE.generic, call: this }
        if (!trigger(SwEvent.Notification, notification, this.id)) {
          trigger(SwEvent.Notification, notification, this.session.uuid)
        }
        break
      }
      case VertoMethod.Bye:
        this.hangup(params, false)
        break
    }
  }

  async handleConferenceUpdate(packet: any, initialPvtData: any) {
    // FIXME: 'reorder' - changepage' - 'heartbeat' methods not implemented
    if (!this._checkConferenceSerno(packet.wireSerno) && packet.name !== initialPvtData.laName) {
      logger.error('ConferenceUpdate invalid wireSerno or packet name:', packet)
      return 'INVALID_PACKET'
    }
    const { action, data, hashKey: callId = String(this._lastSerno), arrIndex: index } = packet
    switch (action) {
      case 'bootObj': {
        this._lastSerno = 0
        const { chatID, chatChannel, infoChannel, modChannel, laName, conferenceMemberID, role } = initialPvtData
        this._dispatchConferenceUpdate({ action: ConferenceAction.Join, conferenceName: laName, participantId: Number(conferenceMemberID), role })
        if (chatChannel) {
          await this._subscribeConferenceChat(chatChannel)
        }
        if (infoChannel) {
          await this._subscribeConferenceInfo(infoChannel)
        }
        if (modChannel && role === Role.Moderator) {
          await this._subscribeConferenceModerator(modChannel)
        }
        const participants = []
        for (const i in data) {
          participants.push({ callId: data[i][0], index: Number(i), ...mutateLiveArrayData(data[i][1]) })
        }
        this._dispatchConferenceUpdate({ action: ConferenceAction.Bootstrap, participants })
        break
      }
      case 'add': {
        this._dispatchConferenceUpdate({ action: ConferenceAction.Add, callId, index, ...mutateLiveArrayData(data) })
        break
      }
      case 'modify':
        this._dispatchConferenceUpdate({ action: ConferenceAction.Modify, callId, index, ...mutateLiveArrayData(data) })
        break
      case 'del':
        this._dispatchConferenceUpdate({ action: ConferenceAction.Delete, callId, index, ...mutateLiveArrayData(data) })
        break
      case 'clear':
        this._dispatchConferenceUpdate({ action: ConferenceAction.Clear })
        break
      // case 'reorder':
      //   break
      default:
        this._dispatchConferenceUpdate({ action, data, callId, index })
        break
    }
  }

  _addChannel(channel: string): void {
    if (!this.channels.includes(channel)) {
      this.channels.push(channel)
    }
    const protocol = this.session.relayProtocol
    if (this.session._existsSubscription(protocol, channel)) {
      this.session.subscriptions[protocol][channel] = {
        ...this.session.subscriptions[protocol][channel], callId: this.id
      }
    }
  }

  private async _subscribeConferenceChat(channel: string) {
    const tmp = {
      nodeId: this.nodeId,
      channels: [channel],
      handler: (params: any) => {
        const { direction, from: participantNumber, fromDisplay: participantName, message: messageText, type: messageType } = params.data
        this._dispatchConferenceUpdate({ action: ConferenceAction.ChatMessage, direction, participantNumber, participantName, messageText, messageType, messageId: params.eventSerno })
      }
    }
    const response = await this.session.vertoSubscribe(tmp)
      .catch(error => {
        logger.error('ConfChat subscription error:', error)
      })
    if (checkSubscribeResponse(response, channel)) {
      this._addChannel(channel)
      Object.defineProperties(this, {
        sendChatMessage: {
          configurable: true,
          value: (message: string, type: string) => {
            this.session.vertoBroadcast({ nodeId: this.nodeId, channel, data: { action: 'send', message, type } })
          }
        }
      })
    }
  }

  private async _subscribeConferenceInfo(channel: string) {
    const tmp = {
      nodeId: this.nodeId,
      channels: [channel],
      handler: (params: any) => {
        const { eventData } = params
        switch (eventData.contentType) {
          case 'layout-info':
            // FIXME: workaround to fix missing callID on payload
            eventData.callID = this.id
            MCULayoutEventHandler(this.session, eventData)
            break
          default:
            logger.error('Conference-Info unknown contentType', params)
        }
      }
    }
    const response = await this.session.vertoSubscribe(tmp)
      .catch(error => {
        logger.error('ConfInfo subscription error:', error)
      })
    if (checkSubscribeResponse(response, channel)) {
      this._addChannel(channel)
    }
  }

  private _confControl(channel: string, params: any = {}) {
    const data = {
      application: 'conf-control',
      callID: this.id,
      value: null,
      ...params
    }
    this.session.vertoBroadcast({ nodeId: this.nodeId, channel, data })
  }

  private async _subscribeConferenceModerator(channel: string) {
    const _modCommand = (command: string, memberID: any = null, value: any = null): void => {
      const id = parseInt(memberID) || null
      this._confControl(channel, { command, id, value })
    }

    const _videoRequired = (): void => {
      const { video } = this.options
      if ((typeof video === 'boolean' && !video) || (typeof video === 'object' && objEmpty(video))) {
        throw `Conference ${this.id} has no video!`
      }
    }

    const tmp = {
      nodeId: this.nodeId,
      channels: [channel],
      handler: (params: any) => {
        const { data } = params
        switch (data['conf-command']) {
          case 'list-videoLayouts':
            if (data.responseData) {
              const tmp = JSON.stringify(data.responseData).replace(/IDS"/g, 'Ids"')
              // TODO: revert layouts JSON structure
              this._dispatchConferenceUpdate({ action: ConferenceAction.LayoutList, layouts: JSON.parse(tmp) })
            }
            break
          default:
            this._dispatchConferenceUpdate({ action: ConferenceAction.ModCmdResponse, command: data['conf-command'], response: data.response })
        }
      }
    }
    const response = await this.session.vertoSubscribe(tmp)
      .catch(error => {
        logger.error('ConfMod subscription error:', error)
      })
    if (checkSubscribeResponse(response, channel)) {
      this.role = Role.Moderator
      this._addChannel(channel)
      Object.defineProperties(this, {
        listVideoLayouts: {
          configurable: true,
          value: () => {
            _modCommand('list-videoLayouts')
          }
        },
        playMedia: {
          configurable: true,
          value: (file: string) => {
            _modCommand('play', null, file)
          }
        },
        stopMedia: {
          configurable: true,
          value: () => {
            _modCommand('stop', null, 'all')
          }
        },
        deaf: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('deaf', memberID)
          }
        },
        undeaf: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('undeaf', memberID)
          }
        },
        startRecord: {
          configurable: true,
          value: (file: string) => {
            _modCommand('recording', null, ['start', file])
          }
        },
        stopRecord: {
          configurable: true,
          value: () => {
            _modCommand('recording', null, ['stop', 'all'])
          }
        },
        snapshot: {
          configurable: true,
          value: (file: string) => {
            _videoRequired()
            _modCommand('vid-write-png', null, file)
          }
        },
        setVideoLayout: {
          configurable: true,
          value: (layout: string, canvasID: number) => {
            _videoRequired()
            const value = canvasID ? [layout, canvasID] : layout
            _modCommand('vid-layout', null, value)
          }
        },
        kick: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('kick', memberID)
          }
        },
        muteMic: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('tmute', memberID)
          }
        },
        muteVideo: {
          configurable: true,
          value: (memberID: number | string) => {
            _videoRequired()
            _modCommand('tvmute', memberID)
          }
        },
        presenter: {
          configurable: true,
          value: (memberID: number | string) => {
            _videoRequired()
            _modCommand('vid-res-id', memberID, 'presenter')
          }
        },
        videoFloor: {
          configurable: true,
          value: (memberID: number | string) => {
            _videoRequired()
            _modCommand('vid-floor', memberID, 'force')
          }
        },
        banner: {
          configurable: true,
          value: (memberID: number | string, text: string) => {
            _videoRequired()
            _modCommand('vid-banner', memberID, encodeURI(text))
          }
        },
        volumeDown: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('volume_out', memberID, 'down')
          }
        },
        volumeUp: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('volume_out', memberID, 'up')
          }
        },
        gainDown: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('volume_in', memberID, 'down')
          }
        },
        gainUp: {
          configurable: true,
          value: (memberID: number | string) => {
            _modCommand('volume_in', memberID, 'up')
          }
        },
        transfer: {
          configurable: true,
          value: (memberID: number | string, exten: string) => {
            _modCommand('transfer', memberID, exten)
          }
        }
      })
    }
  }

  private _handleChangeHoldStateSuccess(response) {
    response.holdState === 'active' ? this.setState(State.Active) : this.setState(State.Held)
    return true
  }

  private _handleChangeHoldStateError(error) {
    logger.error(`Failed to ${error.action} on call ${this.id}`)
    return false
  }

  private _onRemoteSdp(remoteSdp: string) {
    let sdp = sdpMediaOrderHack(remoteSdp, this.peer.instance.localDescription.sdp)
    if (this.options.useStereo) {
      sdp = sdpStereoHack(sdp)
    }
    const sessionDescr: RTCSessionDescription = sdpToJsonHack({ sdp, type: PeerType.Answer })
    this.peer.instance.setRemoteDescription(sessionDescr)
      .then(() => {
        if (this.gotEarly) {
          this.setState(State.Early)
        }
        if (this.gotAnswer) {
          this.setState(State.Active)
        }
      })
      .catch(error => {
        logger.error('Call setRemoteDescription Error: ', error)
        this.hangup()
      })
  }

  private _requestAnotherLocalDescription() {
    if (isFunction(this.peer.onSdpReadyTwice)) {
      trigger(SwEvent.Error, new Error('SDP without candidates for the second time!'), this.session.uuid)
      return
    }
    Object.defineProperty(this.peer, 'onSdpReadyTwice', { value: this._onIceSdp.bind(this) })
    this._iceDone = false
    this.peer.startNegotiation()
  }

  private _onIceSdp(data: RTCSessionDescription) {
    if (this._iceTimeout) {
      clearTimeout(this._iceTimeout)
    }
    this._iceTimeout = null
    this._iceDone = true
    const { sdp, type } = data
    if (sdp.indexOf('candidate') === -1) {
      this._requestAnotherLocalDescription()
      return
    }
    let msg = null
    const tmpParams = { sessid: this.session.sessionid, sdp, dialogParams: this.options }
    switch (type) {
      case PeerType.Offer:
        this.setState(State.Requesting)
        msg = new Invite(tmpParams)
        break
      case PeerType.Answer:
        this.setState(State.Answering)
        msg = this.options.attach === true ? new Attach(tmpParams) : new Answer(tmpParams)
        break
      default:
        logger.error(`${this.id} - Unknown local SDP type:`, data)
        return this.hangup({}, false)
    }
    this._execute(msg)
      .then(response => {
        const { node_id = null } = response
        this._targetNodeId = node_id
        type === PeerType.Offer ? this.setState(State.Trying) : this.setState(State.Active)
      })
      .catch(error => {
        logger.error(`${this.id} - Sending ${type} error:`, error)
        this.hangup()
      })
  }

  private _registerPeerEvents() {
    const { instance } = this.peer
    this._iceDone = false
    instance.onicecandidate = event => {
      if (this._iceDone) {
        return
      }
      if (this._iceTimeout === null) {
        this._iceTimeout = setTimeout(() => this._onIceSdp(instance.localDescription), 1000)
      }
      if (event.candidate) {
        logger.info('IceCandidate:', event.candidate)
      } else {
        this._onIceSdp(instance.localDescription)
      }
    }

    instance.addEventListener('addstream', (event: MediaStreamEvent) => {
      console.log("ENTROU===REMOTE===> addstream", this.options, event.stream)
      this.options.remoteStream = event.stream
    })

    instance.addEventListener('track', (event: RTCTrackEvent) => {
      this.options.remoteStream = event.streams[0]
      const { remoteElement, remoteStream, screenShare } = this.options
      console.log("ENTROU===REMOTE===> track", remoteElement, event.streams[0])
      if (screenShare === false) {
        attachMediaStream(remoteElement, remoteStream)
      }
    })
  }

  private _checkConferenceSerno = (serno: number) => {
    const check = (serno < 0) || (!this._lastSerno || (this._lastSerno && serno === (this._lastSerno + 1)))
    if (check && serno >= 0) {
      this._lastSerno = serno
    }
    return check
  }

  private _onMediaError(error: any) {
    this._dispatchNotification({ type: NOTIFICATION_TYPE.userMediaError, error })
    this.hangup({}, false)
  }

  private _dispatchConferenceUpdate(params: any) {
    this._dispatchNotification({ type: NOTIFICATION_TYPE.conferenceUpdate, call: this, ...params })
  }

  private _dispatchNotification(notification: any) {
    if (this.options.screenShare === true) {
      return
    }
    if (!trigger(SwEvent.Notification, notification, this.id, false)) {
      trigger(SwEvent.Notification, notification, this.session.uuid)
    }
  }

  private _execute(msg: BaseMessage) {
    if (this.nodeId) {
      msg.targetNodeId = this.nodeId
    }
    return this.session.execute(msg)
  }

  private _init() {
    const { id, userVariables, remoteCallerNumber, onNotification } = this.options
    if (!id) {
      this.options.id = uuidv4()
    }
    this.id = this.options.id

    if (!userVariables || objEmpty(userVariables)) {
      this.options.userVariables = this.session.options.userVariables || {}
    }
    if (!remoteCallerNumber) {
      this.options.remoteCallerNumber = this.options.destinationNumber
    }
    this.session.calls[this.id] = this

    register(SwEvent.MediaError, this._onMediaError, this.id)
    if (isFunction(onNotification)) {
      register(SwEvent.Notification, onNotification.bind(this), this.id)
    }

    this.setState(State.New)
    logger.info('New Call with Options:', this.options)
  }

  protected _finalize() {
    const { remoteStream, localStream, remoteElement, localElement } = this.options
    stopStream(remoteStream)
    stopStream(localStream)
    if (this.options.screenShare !== true) {
      detachMediaStream(remoteElement)
      detachMediaStream(localElement)
    }
    deRegister(SwEvent.MediaError, null, this.id)
    this.peer = null
    this.session.calls[this.id] = null
    delete this.session.calls[this.id]
  }
}
