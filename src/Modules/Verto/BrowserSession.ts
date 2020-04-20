import logger from './util/logger'
import BaseSession from './BaseSession'
import { ICacheDevices, IAudioSettings, IVideoSettings, BroadcastParams, SubscribeParams } from './util/interfaces'
import { registerOnce, trigger } from './services/Handler'
import { SwEvent, SESSION_ID } from './util/constants'
import { State, DeviceType } from './webrtc/constants'
import { getDevices, scanResolutions, removeUnsupportedConstraints, checkDeviceIdConstraints, destructSubscribeResponse, getUserMedia, assureDeviceId } from './webrtc/helpers'
import { findElementByType } from './util/helpers'
import { Unsubscribe, Subscribe, Broadcast } from './messages/Verto'
import { localStorage } from './util/storage/'
import { stopStream } from './util/webrtc'
import { IWebRTCCall } from './webrtc/interfaces'

export default abstract class BrowserSession extends BaseSession {
  public calls: { [callId: string]: IWebRTCCall } = {}
  public micId: string
  public micLabel: string
  public camId: string
  public camLabel: string
  public autoRecoverCalls: boolean = true

  private _iceServers: RTCIceServer[] = []
  private _localElement: HTMLMediaElement = null
  private _remoteElement: HTMLMediaElement = null

  protected _jwtAuth: boolean = true
  protected _devices: ICacheDevices = {}
  protected _audioConstraints: boolean | MediaTrackConstraints = true
  protected _videoConstraints: boolean | MediaTrackConstraints = false
  protected _speaker: string = null

  get reconnectDelay() {
    return 1000
  }

  async connect(): Promise<void> {
    this.sessionid = await localStorage.getItem(SESSION_ID)
    super.connect()
  }

  /**
   * Check if the browser has the permission to access mic and/or webcam
   */
  async checkPermissions(audio: boolean = true, video: boolean = true): Promise<boolean> {
    try {
      const stream = await getUserMedia({ audio, video })
      stopStream(stream)
      return true
    } catch {
      return false
    }
  }

  /**
   * Alias for .disconnect()
   * @deprecated
   */
  logout() {
    this.disconnect()
  }

  /**
   * Disconnect all active calls
   */
  async disconnect() {
    Object.keys(this.calls).forEach(k => this.calls[k].setState(State.Purge))
    this.calls = {}

    await super.disconnect()
  }

  speedTest(bytes: number) {
    return new Promise((resolve, reject) => {
      registerOnce(SwEvent.SpeedTest, speedTestResult => {
        const { upDur, downDur } = speedTestResult
        const upKps = upDur ? (((bytes * 8) / (upDur / 1000)) / 1024) : 0
        const downKps = downDur ? (((bytes * 8) / (downDur / 1000)) / 1024) : 0
        resolve({ upDur, downDur, upKps: upKps.toFixed(0), downKps: downKps.toFixed(0) })
      }, this.uuid)

      bytes = Number(bytes)
      if (!bytes) {
        return reject(`Invalid parameter 'bytes': ${bytes}`)
      }

      this.executeRaw(`#SPU ${bytes}`)
      let loops = bytes / 1024
      if (bytes % 1024) {
        loops++
      }
      const dots = '.'.repeat(1024)
      for (let i = 0; i < loops; i++) {
        this.executeRaw(`#SPB ${dots}`)
      }
      this.executeRaw('#SPE')
    })
  }

  /**
   * Return the device list supported by the browser
   */
  getDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices().catch(error => {
      trigger(SwEvent.MediaError, error, this.uuid)
      return []
    })
  }

  /**
   * Return the device list supported by the browser
   */
  getVideoDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.Video).catch(error => {
      trigger(SwEvent.MediaError, error, this.uuid)
      return []
    })
  }

  /**
   * Return the device list supported by the browser
   */
  getAudioInDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.AudioIn).catch(error => {
      trigger(SwEvent.MediaError, error, this.uuid)
      return []
    })
  }

  /**
   * Return the device list supported by the browser
   */
  getAudioOutDevices(): Promise<MediaDeviceInfo[]> {
    return getDevices(DeviceType.AudioOut).catch(error => {
      trigger(SwEvent.MediaError, error, this.uuid)
      return []
    })
  }

  validateDeviceId(id: string, label: string, kind: MediaDeviceInfo['kind']): Promise<string> {
    return assureDeviceId(id, label, kind)
  }

  /**
   * Refresh the device list doing an enumerateDevices
   * @deprecated
   */
  async refreshDevices() {
    logger.warn('This method has been deprecated. Use getDevices() instead.')
    const cache = {};
    ['videoinput', 'audioinput', 'audiooutput'].map((kind: string) => {
      cache[kind] = {}
      Object.defineProperty(cache[kind], 'toArray', {
        value: function () {
          return Object.keys(this).map(k => this[k])
        }
      })
    })
    const devices = await this.getDevices()
    devices.forEach((t: MediaDeviceInfo) => {
      if (cache.hasOwnProperty(t.kind)) {
        cache[t.kind][t.deviceId] = t
      }
    })

    this._devices = cache
    return this.devices
  }

  /**
   * @deprecated
   */
  get devices() {
    return this._devices || {}
  }

  /**
   * Return supported resolution for the given webcam.
   */
  async getDeviceResolutions(deviceId: string) {
    try {
      return await scanResolutions(deviceId)
    } catch (error) {
      throw error
    }
  }

  /**
   * @deprecated
   */
  get videoDevices() {
    logger.warn('This property has been deprecated. Use getVideoDevices() instead.')
    return this._devices.videoinput || {}
  }

  /**
   * @deprecated
   */
  get audioInDevices() {
    logger.warn('This property has been deprecated. Use getAudioInDevices() instead.')
    return this._devices.audioinput || {}
  }

  /**
   * @deprecated
   */
  get audioOutDevices() {
    logger.warn('This property has been deprecated. Use getAudioOutDevices() instead.')
    return this._devices.audiooutput || {}
  }

  get mediaConstraints() {
    return { audio: this._audioConstraints, video: this._videoConstraints }
  }

  async setAudioSettings(settings: IAudioSettings) {
    const { micId, micLabel, ...constraints } = settings
    removeUnsupportedConstraints(constraints)
    this._audioConstraints = await checkDeviceIdConstraints(micId, micLabel, 'audioinput', constraints)
    this.micId = micId
    this.micLabel = micLabel
    return this._audioConstraints
  }

  disableMicrophone() {
    this._audioConstraints = false
  }

  enableMicrophone() {
    this._audioConstraints = true
  }

  async setVideoSettings(settings: IVideoSettings) {
    const { camId, camLabel, ...constraints } = settings
    removeUnsupportedConstraints(constraints)
    this._videoConstraints = await checkDeviceIdConstraints(camId, camLabel, 'videoinput', constraints)
    this.camId = camId
    this.camLabel = camLabel
    return this._videoConstraints
  }

  disableWebcam() {
    this._videoConstraints = false
  }

  enableWebcam() {
    this._videoConstraints = true
  }

  set iceServers(servers: RTCIceServer[] | boolean) {
    if (typeof servers === 'boolean') {
      this._iceServers = servers ? [{ urls: ['stun:stun.l.google.com:19302'] }] : []
    } else {
      this._iceServers = servers
    }
  }

  get iceServers() {
    return this._iceServers
  }

  set speaker(deviceId: string) {
    this._speaker = deviceId
  }

  get speaker() {
    return this._speaker
  }

  set localElement(tag: HTMLMediaElement | string | Function) {
    this._localElement = findElementByType(tag)
  }

  get localElement() {
    return this._localElement
  }

  set remoteElement(tag: HTMLMediaElement | string | Function) {
    this._remoteElement = findElementByType(tag)
  }

  get remoteElement() {
    return this._remoteElement
  }

  vertoBroadcast({ nodeId, channel: eventChannel = '', data }: BroadcastParams) {
    if (!eventChannel) {
      throw new Error('Invalid channel for broadcast: ' + eventChannel)
    }
    const msg = new Broadcast({ sessid: this.sessionid, eventChannel, data })
    if (nodeId) {
      msg.targetNodeId = nodeId
    }
    this.execute(msg).catch(error => error)
  }

  async vertoSubscribe({ nodeId, channels: eventChannel = [], handler }: SubscribeParams) {
    eventChannel = eventChannel.filter(channel => channel && !this._existsSubscription(this.relayProtocol, channel))
    if (!eventChannel.length) {
      return {}
    }
    const msg = new Subscribe({ sessid: this.sessionid, eventChannel })
    if (nodeId) {
      msg.targetNodeId = nodeId
    }
    const response = await this.execute(msg)
    const { unauthorized = [], subscribed = [] } = destructSubscribeResponse(response)
    if (unauthorized.length) {
      unauthorized.forEach(channel => this._removeSubscription(this.relayProtocol, channel))
    }
    subscribed.forEach(channel => this._addSubscription(this.relayProtocol, handler, channel))
    return response
  }

  async vertoUnsubscribe({ nodeId, channels: eventChannel = [] }: SubscribeParams) {
    eventChannel = eventChannel.filter(channel => channel && this._existsSubscription(this.relayProtocol, channel))
    if (!eventChannel.length) {
      return {}
    }
    const msg = new Unsubscribe({ sessid: this.sessionid, eventChannel })
    if (nodeId) {
      msg.targetNodeId = nodeId
    }
    const response = await this.execute(msg)
    const { unsubscribed = [], notSubscribed = [] } = destructSubscribeResponse(response)
    unsubscribed.forEach(channel => this._removeSubscription(this.relayProtocol, channel))
    notSubscribed.forEach(channel => this._removeSubscription(this.relayProtocol, channel))
    return response
  }
}
