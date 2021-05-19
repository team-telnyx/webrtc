import { findElementByType } from '../helpers';
import logger from '../logger';

const RTCPeerConnection = (config: RTCPeerConnectionConfig) =>
  new window.RTCPeerConnection(config);

const getUserMedia = (constraints: MediaStreamConstraints) =>
  navigator.mediaDevices.getUserMedia(constraints);

// @ts-ignore
const getDisplayMedia = (constraints: MediaStreamConstraints) => navigator.mediaDevices.getDisplayMedia(constraints)

const enumerateDevices = () => navigator.mediaDevices.enumerateDevices();

const enumerateDevicesByKind = async (filterByKind: string = null) => {
  let devices: MediaDeviceInfo[] = await enumerateDevices().catch(
    (error) => []
  );
  if (filterByKind) {
    devices = devices.filter(({ kind }) => kind === filterByKind);
  }
  return devices;
};

const getSupportedConstraints = () =>
  navigator.mediaDevices.getSupportedConstraints();

const streamIsValid = (stream: MediaStream) =>
  stream && stream instanceof MediaStream;

const attachMediaStream = (tag: any, stream: MediaStream) => {
  const element = findElementByType(tag);
  if (element === null) {
    return;
  }
  if (!element.getAttribute('autoplay')) {
    element.setAttribute('autoplay', 'autoplay');
  }
  if (!element.getAttribute('playsinline')) {
    element.setAttribute('playsinline', 'playsinline');
  }
  element.srcObject = stream;
};

const detachMediaStream = (tag: any) => {
  const element = findElementByType(tag);
  if (element) {
    element.srcObject = null;
  }
};

const muteMediaElement = (tag: any) => {
  const element = findElementByType(tag);
  if (element) {
    element.muted = true;
  }
};

const unmuteMediaElement = (tag: any) => {
  const element = findElementByType(tag);
  if (element) {
    element.muted = false;
  }
};

const toggleMuteMediaElement = (tag: any) => {
  const element = findElementByType(tag);
  if (element) {
    element.muted = !element.muted;
  }
};

const setMediaElementSinkId = async (
  tag: any,
  deviceId: string
): Promise<boolean> => {
  const element: HTMLMediaElement = findElementByType(tag);
  if (element === null) {
    logger.info('No HTMLMediaElement to attach the speakerId');
    return false;
  }
  if (typeof deviceId !== 'string') {
    logger.info(`Invalid speaker deviceId: '${deviceId}'`);
    return false;
  }
  try {
    // @ts-ignore
    await element.setSinkId(deviceId);
    return true;
  } catch (error) {
    return false;
  }
};

const sdpToJsonHack = (sdp) => sdp;

const stopTrack = (track: MediaStreamTrack) => {
  if (track && track.readyState === 'live') {
    track.stop();
  }
};

const stopStream = (stream: MediaStream) => {
  if (streamIsValid(stream)) {
    stream.getTracks().forEach(stopTrack);
  }
  stream = null;
};

const getHostname = () => window.location.hostname;

const buildVideoElementByTrack = (
  videoTrack: MediaStreamTrack,
  streamIds: string[] = []
) => {
  const video = document.createElement('video');
  video.muted = true;
  video.autoplay = true;
  // @ts-ignore
  video.playsinline = true;
  // @ts-ignore
  video._streamIds = streamIds;

  const mediaStream = new MediaStream([videoTrack]);
  video.srcObject = mediaStream;

  const onCanPlay = () => console.debug('video can play!');
  const onPlay = () => console.debug('video is now playing...');
  video.addEventListener('play', onPlay);
  video.addEventListener('canplay', onCanPlay);
  videoTrack.addEventListener('ended', () => {
    video.removeEventListener('play', onPlay);
    video.removeEventListener('canplay', onCanPlay);
    video.srcObject = null;
    // @ts-ignore
    delete video._streamIds;
    video.remove();
  });
  return video;
};

const buildAudioElementByTrack = (
  audioTrack: MediaStreamTrack,
  streamIds: string[] = []
) => {
  const audio = new Audio();
  audio.autoplay = true;
  // @ts-ignore
  audio.playsinline = true;
  // @ts-ignore
  audio._streamIds = streamIds;

  const mediaStream = new MediaStream([audioTrack]);
  audio.srcObject = mediaStream;

  const onCanPlay = () => console.debug('audio can play!');
  const onPlay = () => console.debug('audio is now playing...');
  audio.addEventListener('play', onPlay);
  audio.addEventListener('canplay', onCanPlay);
  audioTrack.addEventListener('ended', () => {
    audio.removeEventListener('play', onPlay);
    audio.removeEventListener('canplay', onCanPlay);
    audio.srcObject = null;
    // @ts-ignore
    delete audio._streamIds;
    audio.remove();
  });

  return audio;
};

export {
  RTCPeerConnection,
  getUserMedia,
  getDisplayMedia,
  enumerateDevices,
  enumerateDevicesByKind,
  getSupportedConstraints,
  streamIsValid,
  attachMediaStream,
  detachMediaStream,
  sdpToJsonHack,
  stopStream,
  stopTrack,
  muteMediaElement,
  unmuteMediaElement,
  toggleMuteMediaElement,
  setMediaElementSinkId,
  getHostname,
  buildVideoElementByTrack,
  buildAudioElementByTrack,
};
