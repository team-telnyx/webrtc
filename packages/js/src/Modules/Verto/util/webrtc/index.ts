import { findElementByType } from '../helpers';
import logger from '../logger';
import { trigger } from '../../services/Handler';
import { SwEvent, SHARED_REMOTE_ELEMENT_OVERWRITE } from '../constants';
import { createTelnyxWarning } from '../constants/warnings';

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

const audioIsMediaTrackConstraints = (audio: boolean | MediaTrackConstraints) =>
  typeof audio === 'object';

const videoIsMediaTrackConstraints = (video: boolean | MediaTrackConstraints) =>
  typeof video === 'object';

/**
 * Optional context for `attachMediaStream` diagnostics.
 *
 * When provided, a `telnyx.warning` (SwEvent.Warning) event is emitted alongside
 * the `logger.warn` call if the target element already holds a different
 * MediaStream (last-writer-wins overwrite). The `callId`/`sessionId` are
 * forwarded into the structured warning payload so consumers can correlate the
 * warning with the call/session that triggered the overwrite.
 */
export interface IAttachMediaStreamContext {
  /** Identifier of the call whose stream is being attached. */
  callId?: string;
  /** Identifier of the SDK session owning the call. */
  sessionId?: string;
}

const attachMediaStream = (
  tag: any,
  stream: MediaStream,
  context?: IAttachMediaStreamContext
) => {
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
  // Last-writer-wins diagnostic (VSUP-121).
  // If the element already holds a *different* stream, attaching a new stream
  // silently overwrites it. For a shared remoteElement this disrupts the other
  // call's playout (legacy single-element app); the resolution is a per-call
  // remoteElement. We always log so the overwrite is visible. When `context` is
  // provided (remote-stream path) we also emit a structured `telnyx.warning`
  // event so application code is notified. Intentional same-call local-stream
  // replacements (e.g. camera switch) pass no context, so they only log.
  // Silent on fresh elements (srcObject === null or === stream).
  if (element.srcObject && element.srcObject !== stream) {
    const message =
      'attachMediaStream: element already has a different MediaStream attached; ' +
      'overwriting will disrupt the existing call. Use a per-call remoteElement ' +
      '(client.newCall({ remoteElement }) or call.answer({ remoteElement })) ' +
      'for concurrent calls.';
    logger.warn(message);
    // Only emit the structured `telnyx.warning` event when call/session context
    // is available — i.e. the remote-stream attach path where a shared element
    // genuinely indicates a multi-call problem. Callers that intentionally
    // replace a stream on the same element (e.g. camera switch) pass no context
    // and only get the log line above.
    if (context) {
      const warning = createTelnyxWarning(
        SHARED_REMOTE_ELEMENT_OVERWRITE,
        message
      );
      trigger(
        SwEvent.Warning,
        {
          warning,
          callId: context.callId,
          sessionId: context.sessionId,
        },
        context.callId
      );
    }
  }
  element.srcObject = stream;
};

const detachMediaStream = (tag: any, stream?: MediaStream) => {
  const element = findElementByType(tag);
  if (element) {
    if (stream && element.srcObject !== stream) {
      return;
    }
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
  audioIsMediaTrackConstraints,
  videoIsMediaTrackConstraints,
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
