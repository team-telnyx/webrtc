import { findElementByType } from '../helpers'

const RTCPeerConnection = (config: RTCPeerConnectionConfig) => new window.RTCPeerConnection(config)

const getUserMedia = (constraints: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(constraints)

// @ts-ignore
const getDisplayMedia = (constraints: MediaStreamConstraints) => navigator.mediaDevices.getDisplayMedia(constraints)

const enumerateDevices = () => navigator.mediaDevices.enumerateDevices()

const getSupportedConstraints = () => navigator.mediaDevices.getSupportedConstraints()

const streamIsValid = (stream: MediaStream) => stream && stream instanceof MediaStream

const attachMediaStream = (tag: any, stream: MediaStream) => {
  const element = findElementByType(tag)
  if (element === null) {
    return
  }
  if (!element.getAttribute('autoplay')) {
    element.setAttribute('autoplay', 'autoplay')
  }
  if (!element.getAttribute('playsinline')) {
    element.setAttribute('playsinline', 'playsinline')
  }

  element.srcObject = stream
}

const detachMediaStream = (tag: any) => {
  const element = findElementByType(tag)
  if (element) {
    element.srcObject = null
  }
}

const muteMediaElement = (tag: any) => {
  const element = findElementByType(tag)
  if (element) {
    element.muted = true
  }
}

const unmuteMediaElement = (tag: any) => {
  const element = findElementByType(tag)
  if (element) {
    element.muted = false
  }
}

const toggleMuteMediaElement = (tag: any) => {
  const element = findElementByType(tag)
  if (element) {
    element.muted = !element.muted
  }
}

const setMediaElementSinkId = async (tag: any, deviceId: string): Promise<boolean> => {
  const element: HTMLMediaElement = findElementByType(tag)
  if (element === null) {
    return false
  }
  try {
    // @ts-ignore
    await element.setSinkId(deviceId)
    return true
  } catch (error) {
    return false
  }
}

const sdpToJsonHack = sdp => sdp

const stopStream = (stream: MediaStream) => {
  if (streamIsValid(stream)) {
    stream.getTracks().forEach(t => t.stop())
  }
  stream = null
}

export {
  RTCPeerConnection,
  getUserMedia,
  getDisplayMedia,
  enumerateDevices,
  getSupportedConstraints,
  streamIsValid,
  attachMediaStream,
  detachMediaStream,
  sdpToJsonHack,
  stopStream,
  muteMediaElement,
  unmuteMediaElement,
  toggleMuteMediaElement,
  setMediaElementSinkId
}
