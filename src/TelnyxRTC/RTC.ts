/*
 * Verto HTML5/Javascript Telephony Signaling and Control Protocol Stack for FreeSWITCH
 * Copyright (C) 2005-2017, Anthony Minessale II <anthm@freeswitch.org>
 *
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Verto HTML5/Javascript Telephony Signaling and Control Protocol Stack for FreeSWITCH
 *
 * The Initial Developer of the Original Code is
 * Anthony Minessale II <anthm@freeswitch.org>
 * Portions created by the Initial Developer are Copyright (C)
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Seven Du <dujinfang@x-y-t.cn>
 * Xueyun Jiang <jiangxueyun@x-y-t.cn>
 *
 * RTC.js - Verto RTC glue code
 *
 */

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
  const realEndLine = endLine != -1 ? endLine : sdpLines.length;
  for (let i = startLine; i < realEndLine; ++i) {
    if (sdpLines[i].indexOf(prefix) === 0) {
      if (
        !substr ||
        sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1
      ) {
        return i;
      }
    }
  }
  return null;
}

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
function findLine(sdpLines, prefix, substr?) {
  return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadType(sdpLine) {
  const pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
  const result = sdpLine.match(pattern);
  return result && result.length == 2 ? result[1] : null;
}

// Returns a new m= line with the specified codec as the first one.
function setDefaultCodec(mLine, payload) {
  const elements = mLine.split(' ');
  const newLine = [];
  let index = 0;
  for (let i = 0; i < elements.length; i++) {
    if (index === 3) {
      // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) newLine[index++] = elements[i];
  }
  return newLine.join(' ');
}

function setCompat() { }

function checkCompat() {
  return true;
}

function onStreamError(self, e) {
  console.error(
    'There has been a problem retrieving the streams - did you allow access? Check Device Resolution',
    e
  );
  doCallback(self, 'onError', e);
}

function onStreamSuccess(self, stream) {
  // console.log('Stream Success');
  doCallback(self, 'onStream', stream);
}

function onICE(self, candidate) {
  self.mediaData.candidate = candidate;
  self.mediaData.candidateList.push(self.mediaData.candidate);

  doCallback(self, 'onICE');
}

function doCallback(self, func, arg?) {
  if (func in self.options.callbacks) {
    self.options.callbacks[func](self, arg);
  }
}

function onICEComplete(self, candidate?) {
  // console.log('ICE Complete');
  doCallback(self, 'onICEComplete');
}

function onChannelError(self, e) {
  console.error('Channel Error', e);
  doCallback(self, 'onError', e);
}

function onICESDP(self, sdp) {
  self.mediaData.SDP = self.stereoHack(sdp.sdp);
  // console.log('ICE SDP');
  doCallback(self, 'onICESDP');
}

function onAnswerSDP(self, sdp) {
  self.answer.SDP = self.stereoHack(sdp.sdp);
  // console.log('ICE ANSWER SDP');
  doCallback(self, 'onAnswerSDP', self.answer.SDP);
}

function onMessage(self, msg) {
  // console.log('Message');
  doCallback(self, 'onICESDP', msg);
}

function FSRTCattachMediaStream(element, stream) {
  if (
    element &&
    element.id &&
    typeof (<any>window).attachMediaStream == 'function'
  ) {
    (<any>window).attachMediaStream(element, stream);
  } else {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.error('Error attaching stream to element.');
    }
  }
}

function onRemoteStream(self, stream) {
  if (self.options.useVideo) {
    self.options.useVideo.style.display = 'block';
  }

  const element = self.options.useAudio;
  // console.log('REMOTE STREAM', stream, element);

  FSRTCattachMediaStream(element, stream);

  self.options.useAudio.play();
  self.remoteStream = stream;
}

function onOfferSDP(self, sdp) {
  self.mediaData.SDP = self.stereoHack(sdp.sdp);
  // console.log('Offer SDP');
  doCallback(self, 'onOfferSDP');
}

function FSRTCPeerConnection(options: any) {
  let gathering: any = false;
  let done = false;
  const config: any = {};
  const default_ice = {
    urls: ['stun:stun.l.google.com:19302'],
  };

  if (options.iceServers) {
    if (typeof options.iceServers === 'boolean') {
      config.iceServers = [default_ice];
    } else {
      config.iceServers = options.iceServers;
    }
  }

  const peer = new RTCPeerConnection(config);

  openOffererChannel();
  let x = 0;

  function ice_handler() {
    done = true;
    gathering = null;

    if (options.onICEComplete) {
      options.onICEComplete();
    }

    if (options.type == 'offer') {
      options.onICESDP(peer.localDescription);
    } else {
      if (!x && options.onICESDP) {
        options.onICESDP(peer.localDescription);
      }
    }
  }

  peer.onicecandidate = (event) => {
    if (done) {
      return;
    }

    if (!gathering) {
      gathering = setTimeout(ice_handler, 1000);
    }

    if (event) {
      if (event.candidate) {
        options.onICE(event.candidate);
      }
    } else {
      done = true;

      if (gathering) {
        clearTimeout(gathering);
        gathering = null;
      }

      ice_handler();
    }
  };

  // attachStream = MediaStream;

  // @TODO Migrate to `addTrack`
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addStream


  if (options.attachStream && options.attachStream.getTracks().length) {
    for (const track of options.attachStream.getTracks()) {
      console.log("TYPE+++++=====>", track);
      (<any>peer).addTrack(track);
    }
  }

  peer.ontrack = function (event) {
    const remoteMediaStream = event.streams[0];

    // onRemoteStreamEnded(MediaStream)
    (<any>remoteMediaStream).oninactive = function () {
      if (options.onRemoteStreamEnded)
        options.onRemoteStreamEnded(remoteMediaStream);
    };

    // onRemoteStream(MediaStream)
    if (options.onRemoteStream) options.onRemoteStream(remoteMediaStream);

    //console.debug('on:add:stream', remoteMediaStream);
  };

  //const constraints = options.constraints || {
  //offerToReceiveAudio: true,
  //offerToReceiveVideo: true
  //};

  // onOfferSDP(RTCSessionDescription)
  function createOffer() {
    if (!options.onOfferSDP) return;

    // @TODO Migrate to single options argument
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    (<any>peer).createOffer(
      (sessionDescription) => {
        sessionDescription.sdp = serializeSdp(sessionDescription.sdp);
        peer.setLocalDescription(sessionDescription);
        options.onOfferSDP(sessionDescription);
      },
      onSdpError,
      options.constraints
    );
  }

  // onAnswerSDP(RTCSessionDescription)
  function createAnswer() {
    if (options.type != 'answer') return;

    //options.offerSDP.sdp = addStereo(options.offerSDP.sdp);

    // @TODO Verify `setRemoteDescription` and `createAnswer` call signature
    (<any>peer).setRemoteDescription(
      new window.RTCSessionDescription(options.offerSDP),
      onSdpSuccess,
      onSdpError
    );
    (<any>peer).createAnswer(function (sessionDescription) {
      sessionDescription.sdp = serializeSdp(sessionDescription.sdp);
      peer.setLocalDescription(sessionDescription);
      if (options.onAnswerSDP) {
        options.onAnswerSDP(sessionDescription);
      }
    }, onSdpError);
  }

  if (options.onChannelMessage || !options.onChannelMessage) {
    createOffer();
    createAnswer();
  }

  // DataChannel Bandwidth
  function setBandwidth(sdp) {
    // remove existing bandwidth lines
    sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');
    sdp = sdp.replace(/a=mid:data\r\n/g, 'a=mid:data\r\nb=AS:1638400\r\n');

    return sdp;
  }

  // old: FF<>Chrome interoperability management
  function getInteropSDP(sdp) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let extractedChars = '';

    function getChars() {
      extractedChars += chars[Math.floor(Math.random() * 40)] || '';
      if (extractedChars.length < 40) getChars();

      return extractedChars;
    }

    // usually audio-only streaming failure occurs out of audio-specific crypto line
    // a=crypto:1 AES_CM_128_HMAC_SHA1_32 --------- kAttributeCryptoVoice
    if (options.onAnswerSDP)
      sdp = sdp.replace(/(a=crypto:0 AES_CM_128_HMAC_SHA1_32)(.*?)(\r\n)/g, '');

    // video-specific crypto line i.e. SHA1_80
    // a=crypto:1 AES_CM_128_HMAC_SHA1_80 --------- kAttributeCryptoVideo
    const inline = getChars() + '\r\n' + (extractedChars = '');
    sdp =
      sdp.indexOf('a=crypto') == -1
        ? sdp.replace(
          /c=IN/g,
          'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:' + inline + 'c=IN'
        )
        : sdp;

    return sdp;
  }

  function serializeSdp(sdp) {
    return sdp;
  }

  // DataChannel management
  let channel;

  function openOffererChannel() {
    if (!options.onChannelMessage) return;

    _openOffererChannel();

    return;
  }

  function _openOffererChannel() {
    // @TODO Remove `reliable`
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel
    channel = (<any>peer).createDataChannel(
      options.channel || 'RTCDataChannel',
      {
        reliable: false,
      }
    );

    setChannelEvents();
  }

  function setChannelEvents() {
    channel.onmessage = function (event) {
      if (options.onChannelMessage) options.onChannelMessage(event);
    };
    channel.onopen = function () {
      if (options.onChannelOpened) options.onChannelOpened(channel);
    };
    channel.onclose = function (event) {
      if (options.onChannelClosed) options.onChannelClosed(event);

      console.warn('WebRTC DataChannel closed', event);
    };
    channel.onerror = function (event) {
      if (options.onChannelError) options.onChannelError(event);

      console.error('WebRTC DataChannel error', event);
    };
  }

  function openAnswererChannel() {
    peer.ondatachannel = (event) => {
      channel = event.channel;
      channel.binaryType = 'blob';
      setChannelEvents();
    };

    return;
  }

  // fake:true is also available on chrome under a flag!
  function useless() {
    console.log('Error in fake:true');
  }

  function onSdpSuccess() { }

  function onSdpError(e) {
    if (options.onChannelError) {
      options.onChannelError(e);
    }
    console.error('sdp error:', e);
  }

  return {
    addAnswerSDP: (sdp, cbSuccess, cbError) => {
      (<any>peer).setRemoteDescription(
        new window.RTCSessionDescription(sdp),
        cbSuccess ? cbSuccess : onSdpSuccess,
        cbError ? cbError : onSdpError
      );
    },

    addICE: (candidate) => {
      peer.addIceCandidate(
        new window.RTCIceCandidate({
          sdpMLineIndex: candidate.sdpMLineIndex,
          candidate: candidate.candidate,
        })
      );
    },

    peer: peer,
    channel: channel,

    sendData: (message) => {
      if (channel) {
        channel.send(message);
      }
    },

    stop: () => {
      peer.close();
      if (options.attachStream) {
        if (typeof options.attachStream.stop == 'function') {
          options.attachStream.stop();
        }
      }
    },
  };
}

// getUserMedia
function getUserMedia(options) {
  return navigator.mediaDevices
    .getUserMedia(options.constraints)
    .then((stream) => {
      if (options.localVideo) {
        options.localVideo['src'] = URL.createObjectURL(stream);
        options.localVideo.style.display = 'block';
      }

      if (options.onsuccess) {
        options.onsuccess(stream);
      }
    })
    .catch(options.onerror || console.error);
}

const resList = [
  [160, 120],
  [320, 180],
  [320, 240],
  [640, 360],
  [640, 480],
  [1280, 720],
  [1920, 1080],
];

let resI = 0;
let ttl = 0;

/**
 * @hidden
 */
export default class VertoRTC {
  public options: any;
  public audioEnabled: any;
  public videoEnabled: any;
  public mediaData: any;
  public constraints: any;
  public peer: any;
  public localStream: any;
  public type: any;
  public remoteSDP: any;
  public validRes: any = [];
  public static validRes: any = [];

  constructor(options) {
    this.options = Object.assign(
      {
        useVideo: null,
        useStereo: false,
        userData: null,
        localVideo: null,
        screenShare: false,
        useCamera: 'any',
        iceServers: false,
        videoParams: {},
        audioParams: {},
        callbacks: {
          onICEComplete: function () { },
          onICE: function () { },
          onOfferSDP: function () { },
        },
      },
      options
    );

    this.audioEnabled = true;
    this.videoEnabled = true;

    this.mediaData = {
      SDP: null,
      profile: {},
      candidateList: [],
    };

    this.constraints = {
      offerToReceiveAudio: this.options.useSpeak === 'none' ? false : true,
      offerToReceiveVideo: this.options.useVideo ? true : false,
    };

    if (this.options.useVideo) {
      this.options.useVideo.style.display = 'none';
    }

    setCompat();
    checkCompat();
  }

  useVideo(obj, local) {
    if (obj) {
      this.options.useVideo = obj;
      this.options.localVideo = local;
      this.constraints.offerToReceiveVideo = true;
    } else {
      this.options.useVideo = null;
      this.options.localVideo = null;
      this.constraints.offerToReceiveVideo = false;
    }

    if (this.options.useVideo) {
      this.options.useVideo.style.display = 'none';
    }
  }

  useStereo(on) {
    this.options.useStereo = on;
  }

  // Sets Opus in stereo if stereo is enabled, by adding the stereo=1 fmtp param.
  stereoHack(sdp) {
    if (!this.options.useStereo) {
      return sdp;
    }

    const sdpLines = sdp.split('\r\n');

    // Find opus payload.
    const opusIndex = findLine(sdpLines, 'a=rtpmap', 'opus/48000');
    let opusPayload;

    if (!opusIndex) {
      return sdp;
    } else {
      opusPayload = getCodecPayloadType(sdpLines[opusIndex]);
    }

    // Find the payload in fmtp line.
    const fmtpLineIndex = findLine(
      sdpLines,
      'a=fmtp:' + opusPayload.toString()
    );

    if (fmtpLineIndex === null) {
      // create an fmtp line
      sdpLines[opusIndex] =
        sdpLines[opusIndex] +
        '\r\na=fmtp:' +
        opusPayload.toString() +
        ' stereo=1; sprop-stereo=1';
    } else {
      // Append stereo=1 to fmtp line.
      sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat(
        '; stereo=1; sprop-stereo=1'
      );
    }

    sdp = sdpLines.join('\r\n');
    return sdp;
  }

  answer(sdp, onSuccess, onError) {
    this.peer.addAnswerSDP(
      {
        type: 'answer',
        sdp: sdp,
      },
      onSuccess,
      onError
    );
  }

  stopPeer() {
    if (this.peer) {
      // console.log('stopping peer');
      this.peer.stop();
    }
  }

  stop() {
    if (this.options.useVideo) {
      this.options.useVideo.style.display = 'none';
      this.options.useVideo['src'] = '';
    }

    if (this.localStream) {
      if (typeof this.localStream.stop == 'function') {
        this.localStream.stop();
      } else {
        if (this.localStream.active) {
          const tracks = this.localStream.getTracks();
          // console.log(tracks);
          tracks.forEach((track, index) => {
            // console.log('stopping track', track);
            track.stop();
          });
        }
      }
      this.localStream = null;
    }

    if (this.options.localVideo) {
      this.options.localVideo.style.display = 'none';
      this.options.localVideo['src'] = '';
    }

    if (this.options.localVideoStream) {
      if (typeof this.options.localVideoStream.stop == 'function') {
        this.options.localVideoStream.stop();
      } else {
        if (this.options.localVideoStream.active) {
          const tracks = this.options.localVideoStream.getTracks();
          // console.log(tracks);
          tracks.forEach((track, index) => {
            // console.log(track);
            track.stop();
          });
        }
      }
    }

    if (this.peer) {
      // console.log('stopping peer');
      this.peer.stop();
    }
  }

  getMute() {
    return this.audioEnabled;
  }

  setMute(what) {
    const audioTracks = this.localStream.getAudioTracks();

    for (let i = 0, len = audioTracks.length; i < len; i++) {
      switch (what) {
        case 'on':
          audioTracks[i].enabled = true;
          break;
        case 'off':
          audioTracks[i].enabled = false;
          break;
        case 'toggle':
          audioTracks[i].enabled = !audioTracks[i].enabled;
        default:
          break;
      }

      this.audioEnabled = audioTracks[i].enabled;
    }

    return !this.audioEnabled;
  }

  getVideoMute() {
    return this.videoEnabled;
  }

  setVideoMute(what) {
    const videoTracks = this.localStream.getVideoTracks();

    for (let i = 0, len = videoTracks.length; i < len; i++) {
      switch (what) {
        case 'on':
          videoTracks[i].enabled = true;
          break;
        case 'off':
          videoTracks[i].enabled = false;
          break;
        case 'toggle':
          videoTracks[i].enabled = !videoTracks[i].enabled;
        default:
          break;
      }

      this.videoEnabled = videoTracks[i].enabled;
    }

    return !this.videoEnabled;
  }

  getMediaParams() {
    let audio;

    if (this.options.useMic && this.options.useMic === 'none') {
      // console.log('Microphone Disabled');
      audio = false;
    } else if (this.options.videoParams && this.options.screenShare) {
      //this.options.videoParams.chromeMediaSource == 'desktop') {
      console.error('SCREEN SHARE', this.options.videoParams);
      audio = false;
    } else {
      audio = {};

      if (this.options.audioParams) {
        audio = this.options.audioParams;
      }

      if (this.options.useMic !== 'any') {
        //audio.optional = [{sourceId: this.options.useMic}]
        audio.deviceId = { exact: this.options.useMic };
      }
    }

    if (this.options.useVideo && this.options.localVideo) {
      getUserMedia({
        constraints: {
          audio: false,
          video: this.options.videoParams,
        },
        localVideo: this.options.localVideo,
        onsuccess: (e) => {
          this.options.localVideoStream = e;
          // console.log('local video ready');
        },
        onerror: (e) => {
          console.error('local video error!');
        },
      });
    }

    let video: any = {};
    let useVideo = false;
    const bestFrameRate = this.options.videoParams.vertoBestFrameRate;
    const minFrameRate = this.options.videoParams.minFrameRate || 15;
    delete this.options.videoParams.vertoBestFrameRate;

    if (this.options.screenShare) {
      console.log('screenShare');
      // fix for chrome to work for now, will need to change once we figure out how to do this in a non-mandatory style constraint.

      if (!!(<any>navigator).mozGetUserMedia) {
        const dowin = confirm(
          'Do you want to share an application window? If not you will share a screen.'
        );

        video = {
          width: {
            min: this.options.videoParams.minWidth,
            max: this.options.videoParams.maxWidth,
          },
          height: {
            min: this.options.videoParams.minHeight,
            max: this.options.videoParams.maxHeight,
          },
          mediaSource: dowin ? 'window' : 'screen',
        };
      } else {
        const opt = [];
        opt.push({ sourceId: this.options.useCamera });

        if (bestFrameRate) {
          opt.push({ minFrameRate: bestFrameRate });
          opt.push({ maxFrameRate: bestFrameRate });
        }

        video = {
          mandatory: this.options.videoParams,
          optional: opt,
        };
      }
    } else {
      video = {
        //mandatory: this.options.videoParams,
        width: {
          min: this.options.videoParams.minWidth,
          max: this.options.videoParams.maxWidth,
        },
        height: {
          min: this.options.videoParams.minHeight,
          max: this.options.videoParams.maxHeight,
        },
      };

      useVideo = this.options.useVideo;

      if (
        useVideo &&
        this.options.useCamera &&
        this.options.useCamera !== 'none'
      ) {
        //if (!video.optional) {
        //video.optional = [];
        //}

        if (this.options.useCamera !== 'any') {
          //video.optional.push({sourceId: obj.options.useCamera});
          video.deviceId = this.options.useCamera;
        }

        if (bestFrameRate) {
          //video.optional.push({minFrameRate: bestFrameRate});
          //video.optional.push({maxFrameRate: bestFrameRate});
          video.frameRate = {
            ideal: bestFrameRate,
            min: minFrameRate,
            max: 30,
          };
        }
      } else {
        console.log('Camera Disabled');
        video = false;
        useVideo = false;
      }
    }

    return { audio: audio, video: video, useVideo: useVideo };
  }

  createAnswer(params) {
    this.type = 'answer';
    this.remoteSDP = params.sdp;
    // console.debug('inbound sdp: ', params.sdp);

    const onSuccess = (stream) => {
      this.localStream = stream;

      this.peer = FSRTCPeerConnection({
        type: this.type,
        attachStream: this.localStream,
        onICE: (candidate) => onICE(this, candidate),
        onICEComplete: () => onICEComplete(this),
        onRemoteStream: (stream) => onRemoteStream(this, stream),
        onICESDP: (sdp) => {
          return onICESDP(this, sdp);
        },
        onChannelError: (e) => {
          return onChannelError(this, e);
        },
        constraints: this.constraints,
        iceServers: this.options.iceServers,
        offerSDP: {
          type: 'offer',
          sdp: this.remoteSDP,
        },
      });

      onStreamSuccess(this, stream);
    };

    const onError = (e) => {
      onStreamError(this, e);
    };

    this.options.useCamera = params.useCamera;
    const mediaParams = this.getMediaParams();

    // console.log('Audio constraints', mediaParams.audio);
    // console.log('Video constraints', mediaParams.video);

    if (this.options.useVideo && this.options.localVideo) {
      getUserMedia({
        constraints: {
          audio: false,
          video: {
            mandatory: this.options.videoParams,
            optional: [],
          },
        },
        localVideo: this.options.localVideo,
        onsuccess: function (e) {
          this.options.localVideoStream = e;
          // console.log('local video ready');
        },
        onerror: function (e) {
          console.error('local video error!');
        },
      });
    }

    getUserMedia({
      constraints: {
        audio: mediaParams.audio,
        video: mediaParams.video,
      },
      onsuccess: onSuccess,
      onerror: onError,
    });
  }

  stopRinger(ringer) {
    if (!ringer) return;

    if (typeof ringer.stop == 'function') {
      ringer.stop();
    } else {
      if (ringer.active) {
        const tracks = ringer.getTracks();
        tracks.forEach((track, index) => {
          track.stop();
        });
      }
    }
  }

  call(profile) {
    checkCompat();

    let screen = false;

    this.type = 'offer';

    if (this.options.videoParams && this.options.screenShare) {
      //this.options.videoParams.chromeMediaSource == 'desktop') {
      screen = true;
    }

    const onSuccess = (stream) => {
      this.localStream = stream;

      if (screen) {
        this.constraints.offerToReceiveVideo = false;
      }

      this.peer = FSRTCPeerConnection({
        type: this.type,
        attachStream: this.localStream,
        onICE: (candidate) => onICE(this, candidate),
        onICEComplete: () => onICEComplete(this),
        onRemoteStream: screen
          ? (stream) => { }
          : (stream) => onRemoteStream(this, stream),
        onOfferSDP: (sdp) => onOfferSDP(this, sdp),
        onICESDP: (sdp) => onICESDP(this, sdp),
        onChannelError: (e) => onChannelError(this, e),
        constraints: this.constraints,
        iceServers: this.options.iceServers,
      });

      onStreamSuccess(this, stream);
    };

    const onError = (e) => {
      onStreamError(this, e);
    };

    const mediaParams = this.getMediaParams();

    // console.log('Audio constraints', mediaParams.audio);
    // console.log('Video constraints', mediaParams.video);

    if (mediaParams.audio || mediaParams.video) {
      getUserMedia({
        constraints: {
          audio: mediaParams.audio,
          video: mediaParams.video,
        },
        video: mediaParams.useVideo,
        onsuccess: onSuccess,
        onerror: onError,
      });
    } else {
      onSuccess(null);
    }
  }

  static resSupported(w, h) {
    return this.validRes.find((res) => res[0] === w && res[1] === h);
  }

  static bestResSupported() {
    let w = 0;
    let h = 0;

    this.validRes.forEach((res) => {
      if (res[0] >= w && res[1] >= h) {
        w = res[0];
        h = res[1];
      }
    });

    return [w, h];
  }

  static getValidRes(cam, func) {
    // const cached = localStorage.getItem('res_' + cam);

    // if (cached) {
    //   const cache = JSON.parse(cached);

    //   if (cache) {
    //     this.validRes = cache.validRes;
    //     // console.log('CACHED RES FOR CAM ' + cam, cache);
    //   } else {
    //     console.error('INVALID CACHE');
    //   }
    //   return func ? func(cache) : null;
    // }

    this.validRes = [];
    resI = 0;

    this.checkRes(cam, func);
  }

  static checkPerms(runtime, check_audio, check_video) {
    getUserMedia({
      constraints: {
        audio: check_audio,
        video: check_video,
        // video: false,
      },
      onsuccess: function (e) {
        e.getTracks().forEach((track) => {
          track.stop();
        });

        // console.info('media perm init complete');
        if (runtime) {
          setTimeout(() => runtime(true), 100);
        }
      },
      onerror: (e) => {
        if (check_video && check_audio) {
          // console.error('error, retesting with audio params only');
          return this.checkPerms(runtime, check_audio, false);
        }

        console.error(e);
        console.error('media perm init error');

        if (runtime) {
          runtime(false);
        }
      },
    });
  }

  static checkRes(cam, func) {
    if (resI >= resList.length) {
      const res = {
        validRes: this.validRes,
        bestResSupported: this.bestResSupported(),
      };

      // localStorage.setItem('res_' + cam, JSON.stringify(res));

      if (func) return func(res);
      return;
    }

    let video: any = {
      mandatory: {},
      optional: [],
    };

    if (cam) {
      video.optional = [{ sourceId: cam }];
      // video.deviceId = { exact: cam };
    }

    const w = resList[resI][0];
    const h = resList[resI][1];
    resI++;

    video = {
      // width: { exact: w },
      // height: { exact: h },
      minWidth: w,
      minHeight: h,
      maxWidth: w,
      maxHeight: h,
    };

    getUserMedia({
      constraints: {
        audio: ttl++ == 0,
        video: cam !== 'none' ? video : false,
      },
      onsuccess: (e) => {
        e.getTracks().forEach(function (track) {
          track.stop();
        });
        // console.info(w + 'x' + h + ' supported.');
        this.validRes.push([w, h]);
        this.checkRes(cam, func);
      },
      onerror: (e) => {
        console.warn(w + 'x' + h + ' not supported.');
        this.checkRes(cam, func);
      },
    });
  }
}
