import { findElementByType } from '../helpers';
import logger from '../logger';

const RTCPeerConnection = (config: RTCPeerConnectionConfig) =>
  new window.RTCPeerConnection(config);

const getUserMedia = (constraints: MediaStreamConstraints) =>
  navigator.mediaDevices.getUserMedia(constraints);

// @ts-ignore
const getDisplayMedia = (constraints: MediaStreamConstraints) =>
  navigator.mediaDevices.getDisplayMedia(constraints);

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
  console.log('attachMediaStream===>element', element);

  console.log('attachMediaStream===>stream', stream);
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
};
