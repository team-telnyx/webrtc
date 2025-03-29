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

/**
 * Converts an RTCSessionDescription SDP from Unified Plan to Plan B semantics
 * 
 * @param sessionDescription - The RTCSessionDescription object with Unified Plan SDP
 * @returns A new RTCSessionDescription object with Plan B SDP
 */
export function convertUnifiedPlanToPlanB(sessionDescription: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  if (!sessionDescription || !sessionDescription.sdp) {
    return sessionDescription;
  }

  const sdp = sessionDescription.sdp;
  
  // Parse the SDP into sections
  const sections = sdp.split('m=');
  const firstSection = sections.shift();
  
  // Group media sections by type (audio/video)
  const mediaTypes = {
    audio: [],
    video: []
  };
  
  sections.forEach(section => {
    if (section.startsWith('audio')) {
      mediaTypes.audio.push('m=' + section);
    } else if (section.startsWith('video')) {
      mediaTypes.video.push('m=' + section);
    }
  });
  
  // Create Plan B SDP by consolidating tracks of the same media type
  let planBSdp = firstSection;
  
  // Process audio sections
  if (mediaTypes.audio.length > 0) {
    const consolidatedAudio = consolidateMediaSections(mediaTypes.audio);
    planBSdp += consolidatedAudio;
  }
  
  // Process video sections
  if (mediaTypes.video.length > 0) {
    const consolidatedVideo = consolidateMediaSections(mediaTypes.video);
    planBSdp += consolidatedVideo;
  }
  
  return {
    type: sessionDescription.type,
    sdp: planBSdp
  };
}

/**
 * Helper function to consolidate multiple media sections of the same type
 * into a single Plan B media section
 */
function consolidateMediaSections(sections: string[]): string {
  if (sections.length === 0) return '';
  if (sections.length === 1) return sections[0];
  
  // Take the first section as the base
  const firstSection = sections[0];
  const mLine = firstSection.split('\r\n')[0];
  
  // Extract all SSRCs and related attributes from all sections
  let ssrcs: string[] = [];
  let ssrcGroups: string[] = [];
  let rtpMappings: Set<string> = new Set();
  let rtcpFb: Set<string> = new Set();
  let fmtp: Set<string> = new Set();
  
  sections.forEach(section => {
    const lines = section.split('\r\n');
    
    lines.forEach(line => {
      if (line.includes('a=ssrc:')) {
        ssrcs.push(line);
      } else if (line.includes('a=ssrc-group:')) {
        ssrcGroups.push(line);
      } else if (line.includes('a=rtpmap:')) {
        rtpMappings.add(line);
      } else if (line.includes('a=rtcp-fb:')) {
        rtcpFb.add(line);
      } else if (line.includes('a=fmtp:')) {
        fmtp.add(line);
      }
    });
  });
  
  // Build the consolidated section
  let result = mLine + '\r\n';
  
  // Add common attributes from the first section
  const lines = firstSection.split('\r\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('a=ssrc:') && 
        !line.includes('a=ssrc-group:') &&
        !line.includes('a=rtpmap:') &&
        !line.includes('a=rtcp-fb:') &&
        !line.includes('a=fmtp:')) {
      result += line + '\r\n';
    }
  }
  
  // Add consolidated attributes
  [...rtpMappings].forEach(line => result += line + '\r\n');
  [...rtcpFb].forEach(line => result += line + '\r\n');
  [...fmtp].forEach(line => result += line + '\r\n');
  ssrcGroups.forEach(line => result += line + '\r\n');
  ssrcs.forEach(line => result += line + '\r\n');
  
  return result;
}
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
