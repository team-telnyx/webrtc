import { ICallDevice, IMakeCallParams, DeepArray, ICallingRecord, IRelayCallingRecord, IRelayCallingPlay, ICallingPlay, ICallingPlayParams, ICallingCollect, IRelayCallingCollect, ICallingCollectAudio, ICallingPlayTTS, ICallingCollectTTS, ICallingDetect, IRelayCallingDetect, ICallingTapTap, ICallingTapFlat, IRelayCallingTapTap, IRelayCallingTapDevice, ICallingTapDevice, ICallingCollectRingtone, ICallingPlayRingtone, ICallingConnectParams } from '../util/interfaces'
import { CallPlayType, CallDetectState, CallDetectType } from '../util/constants/relay'
import { deepCopy, objEmpty } from '../util/helpers'

interface DeviceAccumulator {
  devices: DeepArray<ICallDevice>,
  nested: boolean
}

export const prepareConnectParams = (params: [ICallingConnectParams] | DeepArray<IMakeCallParams>, callDevice: ICallDevice): [DeepArray<ICallDevice>, IRelayCallingPlay] => {
  let devices: DeepArray<IMakeCallParams> = []
  let ringback: IRelayCallingPlay = null
  if (params.length === 1 && _isICallingConnectParams(params[0])) {
    devices = params[0].devices
    if (params[0].ringback) {
      ringback = _destructCallingPlay(params[0].ringback)
    }
  } else {
    params.forEach(p => {
      if (!_isICallingConnectParams(p)) {
        devices.push(p)
      }
    })
  }
  return [
    reduceConnectParams(devices, callDevice),
    ringback
  ]
}

export const reduceConnectParams = (peers: DeepArray<IMakeCallParams>, callDevice: ICallDevice): DeepArray<ICallDevice> => {
  const { params: { from_number: defaultFromNumber, timeout: defaultTimeout } } = callDevice
  const _reducer = (accumulator: DeviceAccumulator, peer: IMakeCallParams) => {
    let tmp: ICallDevice = null
    if (peer instanceof Array) {
      tmp = peer.reduce(_reducer, { devices: [], nested: true }).devices
    } else if (typeof peer === 'object') {
      const { type, from: from_number = defaultFromNumber, to: to_number, timeout = defaultTimeout } = peer
      if (type) {
        tmp = { type, params: { to_number, from_number, timeout } }
      }
    }
    if (tmp) {
      const castArray = accumulator.nested || peer instanceof Array
      castArray ? accumulator.devices.push(tmp) : accumulator.devices.push([tmp])
    }
    return accumulator
  }
  const { devices } = peers.reduce(_reducer, { devices: [], nested: false })
  return devices
}

export const prepareRecordParams = (params: ICallingRecord): IRelayCallingRecord => {
  const { audio = {}, type, ...flattenedParams } = params
  return { audio: { ...audio, ...flattenedParams } }
}

const _destructCallingPlay = (media: ICallingPlay | IRelayCallingPlay): IRelayCallingPlay => {
  if ('params' in media) {
    const { type, params = {}, ...flattenedParams } = media
    return { type, params: { ...params, ...flattenedParams } }
  } else {
    const { type, ...params } = media
    return { type, params }
  }
}

export const preparePlayParams = (params: [ICallingPlayParams] | (ICallingPlay | IRelayCallingPlay)[]): [IRelayCallingPlay[], number] => {
  let mediaList: (IRelayCallingPlay | ICallingPlay)[] = []
  let volume = 0
  if (params.length === 1 && _isICallingPlayParams(params[0])) {
    mediaList = params[0].media
    volume = params[0].volume || 0
  } else {
    params.forEach(p => {
      if (!_isICallingPlayParams(p)) {
        mediaList.push(p)
      }
    })
  }
  return [
    mediaList.map(_destructCallingPlay),
    volume
  ]
}

export const preparePlayAudioParams = (params: string | { url: string, volume?: number }): [string, number] => {
  if (typeof(params) === 'string') {
    return [params, 0]
  }
  const { url, volume = 0 } = params
  return [url, volume]
}

export const preparePromptParams = (params: ICallingCollect, mediaList: (ICallingPlay | IRelayCallingPlay)[] = []): [IRelayCallingCollect, IRelayCallingPlay[], number] => {
  const collect: IRelayCallingCollect = {}
  const { initial_timeout, partial_results, type, media = mediaList, volume = 0 } = params

  let { digits, speech } = params
  if (!digits) {
    const { digits_max: max, digits_terminators: terminators, digits_timeout: digit_timeout } = params
    digits = deepCopy({ max, terminators, digit_timeout })
  }
  if (!speech) {
    const { end_silence_timeout, speech_timeout, speech_language: language, speech_hints: hints } = params
    speech = deepCopy({ end_silence_timeout, speech_timeout, language, hints })
  }

  if (initial_timeout) {
    collect.initial_timeout = initial_timeout
  }
  if (partial_results) {
    collect.partial_results = partial_results
  }
  if (!objEmpty(digits) || (type === 'digits' || type === 'both')) {
    collect.digits = digits
  }

  if (!objEmpty(speech) || (type === 'speech' || type === 'both')) {
    collect.speech = speech
  }
  const [play, __volume] = preparePlayParams(media)
  return [collect, play, volume]
}

export const preparePromptAudioParams = (params: ICallingCollectAudio, urlDeprecated: string = ''): IRelayCallingCollect => {
  const { url = urlDeprecated, ...flattenedParams } = params
  flattenedParams.media = [
    { type: CallPlayType.Audio, params: { url } }
  ]

  return flattenedParams
}

export const preparePromptTTSParams = (params: ICallingCollectTTS, ttsOptions: ICallingPlayTTS = { text: '' }): IRelayCallingCollect => {
  const { text, gender, language, ...flattenedParams } = params
  if (text) {
    ttsOptions.text = text
  }
  if (gender) {
    ttsOptions.gender = gender
  }
  if (language) {
    ttsOptions.language = language
  }
  flattenedParams.media = [
    { type: CallPlayType.TTS, params: ttsOptions }
  ]

  return flattenedParams
}

export const preparePromptRingtoneParams = (params: ICallingCollectRingtone): IRelayCallingCollect => {
  const { name, duration, ...flattenedParams } = params
  const mediaParams: ICallingPlayRingtone = { name }
  if (duration) {
    mediaParams.duration = duration
  }
  flattenedParams.media = [
    { type: CallPlayType.Ringtone, params: mediaParams }
  ]

  return flattenedParams
}

export const prepareTapParams = (params: ICallingTapTap | ICallingTapFlat, device: ICallingTapDevice = {}): { tap: IRelayCallingTapTap, device: IRelayCallingTapDevice } => {
  const tap: IRelayCallingTapTap = { type: 'audio', params: { } }
  if ('direction' in params) {
    tap.params.direction = params.direction
  } else if ('audio_direction' in params) {
    tap.params.direction = params.audio_direction
  }

  let targetType = ''
  if ('target_type' in params) {
    targetType = params.target_type
  }
  const { type = targetType, ...deviceParams } = device
  const newDevice: IRelayCallingTapDevice = { type, params: {} }
  if ('target_addr' in params) {
    deviceParams.addr = params.target_addr
  }
  if ('target_port' in params) {
    deviceParams.port = params.target_port
  }
  if ('target_ptime' in params) {
    deviceParams.ptime = params.target_ptime
  }
  if ('target_uri' in params) {
    deviceParams.uri = params.target_uri
  }
  if ('rate' in params) {
    deviceParams.rate = params.rate
  }
  if ('codec' in params) {
    deviceParams.codec = params.codec
  }
  newDevice.params = deviceParams

  return { tap, device: newDevice }
}

const _isICallingPlayParams = (params: ICallingPlayParams | IRelayCallingPlay | ICallingPlay): params is ICallingPlayParams => {
  return (params as ICallingPlayParams).media !== undefined
}

const _isICallingConnectParams = (params: ICallingConnectParams | DeepArray<IMakeCallParams> | IMakeCallParams): params is ICallingConnectParams => {
  return (params as ICallingConnectParams).devices !== undefined
}
