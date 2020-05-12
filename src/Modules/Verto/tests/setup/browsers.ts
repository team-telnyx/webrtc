import * as webrtcMocks from './webrtcMocks'

declare var global: any;

if (typeof RTCPeerConnection === 'undefined') {
  global.RTCPeerConnection = webrtcMocks.RTCPeerConnectionMock
}

if (typeof MediaStream === 'undefined') {
  global.MediaStream = webrtcMocks.MediaStreamMock
}

if (typeof navigator === 'undefined') {
  global.navigator = {}
}

const SUPPORTED_CONSTRAINTS = JSON.parse('{"aspectRatio":true,"autoGainControl":true,"brightness":true,"channelCount":true,"colorTemperature":true,"contrast":true,"deviceId":true,"echoCancellation":true,"exposureCompensation":true,"exposureMode":true,"exposureTime":true,"facingMode":true,"focusDistance":true,"focusMode":true,"frameRate":true,"groupId":true,"height":true,"iso":true,"latency":true,"noiseSuppression":true,"pointsOfInterest":true,"sampleRate":true,"sampleSize":true,"saturation":true,"sharpness":true,"torch":true,"volume":true,"whiteBalanceMode":true,"width":true,"zoom":true}')
const ENUMERATED_MEDIA_DEVICES = [
  { 'deviceId': 'default', 'kind': 'audioinput', 'label': 'Default - External Microphone (Built-in)', 'groupId': '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f' },
  { 'deviceId': 'c3d0a4cb47f5efd7af14c2c3860d12f0199042db6cbdf0c690c38644a24a6ba7', 'kind': 'audioinput', 'label': 'External Microphone (Built-in)', 'groupId': '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f' },
  { 'deviceId': '9835a03c796ae6c6bf81164414340357334bf9545a87e9ec4c25f6896338a4fb', 'kind': 'audioinput', 'label': 'Unknown USB Audio Device (046d:0825)', 'groupId': '67a612f4ac80c6c9854b50d664348e69b5a11421a0ba8d68e2c00f3539992b4c' },

  { 'deviceId': '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206', 'kind': 'videoinput', 'label': 'FaceTime HD Camera', 'groupId': '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce' },
  { 'deviceId': '91429d45c2acf42ebd0f2c208aaed929517b20a57421a778cfbd7c065750b239', 'kind': 'videoinput', 'label': 'USB Camera (046d:0825)', 'groupId': '67a612f4ac80c6c9854b50d664348e69b5a11421a0ba8d68e2c00f3539992b4c' },

  { 'deviceId': 'default', 'kind': 'audiooutput', 'label': 'Default - Headphones (Built-in)', 'groupId': '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f' },
  { 'deviceId': '45a9a69e28bcf77ab14092ccff118379930d4ae1c064321a8dbd30bc7d0482f5', 'kind': 'audiooutput', 'label': 'Headphones (Built-in)', 'groupId': '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f' },
]

const _newTrack = (kind: string) => {
  const track = new webrtcMocks.MediaStreamTrackMock()
  track.kind = kind

  return track
}

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    enumerateDevices: jest.fn().mockResolvedValue(ENUMERATED_MEDIA_DEVICES),
    getSupportedConstraints: jest.fn().mockReturnValue(SUPPORTED_CONSTRAINTS),
    getUserMedia: jest.fn(constraints => {
      const stream = new global.MediaStream()
      const { audio = null, video = null } = constraints
      if (audio !== null) {
        stream.addTrack(_newTrack('audio'))
      }
      if (video !== null) {
        stream.addTrack(_newTrack('video'))
      }
      return stream
    }),
    getDisplayMedia: jest.fn(constraints => {
      const stream = new global.MediaStream()
      stream.addTrack(_newTrack('video'))
      return stream
    })
  }
})
