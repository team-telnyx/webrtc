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
 * verto-dialog.js - Verto Dialog
 *
 */
import generateGUID from 'uuid/v1';
import VertoRTC from './RTC';
import Enum from './Enum';

/**
 * @hidden
 */
export default class VertoDialog {
  constructor(direction, verto, params) {
    this.params = Object.assign(
      {
        useVideo: verto.options.useVideo,
        useStereo: verto.options.useStereo,
        screenShare: false,
        useCamera: params.screenShare
          ? false
          : verto.options.deviceParams.useCamera,
        useMic: verto.options.deviceParams.useMic,
        useSpeak: verto.options.deviceParams.useSpeak,
        tag: verto.options.tag,
        localTag: verto.options.localTag,
        login: verto.options.login,
        videoParams: verto.options.videoParams,
      },
      params
    );

    this.verto = verto;
    this.direction = direction;
    this.lastState = null;
    this.state = this.lastState = Enum.state.new;
    this.callbacks = verto.callbacks;
    this.answered = false;
    this.attach = params.attach || false;
    this.screenShare = params.screenShare || false;
    this.useCamera = this.params.useCamera;
    this.useMic = this.params.useMic;
    this.useSpeak = this.params.useSpeak;
    this.onStateChange = params.onStateChange;
    this.rtc = null;

    if (this.params.callID) {
      this.callID = this.params.callID;
    } else {
      this.callID = this.params.callID = generateGUID();
    }

    if (typeof this.params.tag === 'function') {
      this.audioStream = this.params.tag();
    } else if (this.params.tag) {
      this.audioStream = document.querySelector(this.params.tag);
    }

    if (this.params.useVideo) {
      this.videoStream = this.audioStream;
    }

    if (this.params.localTag) {
      this.localVideo = document.querySelector(this.params.localTag);
    }

    this.verto.dialogs[this.callID] = this;

    const RTCcallbacks = {};

    if (this.direction == Enum.direction.inbound) {
      if (this.params.display_direction === 'outbound') {
        this.params.remote_caller_id_name = this.params.caller_id_name;
        this.params.remote_caller_id_number = this.params.caller_id_number;
      } else {
        this.params.remote_caller_id_name = this.params.callee_id_name;
        this.params.remote_caller_id_number = this.params.callee_id_number;
      }

      if (!this.params.remote_caller_id_name) {
        this.params.remote_caller_id_name = 'Nobody';
      }

      if (!this.params.remote_caller_id_number) {
        this.params.remote_caller_id_number = 'UNKNOWN';
      }

      RTCcallbacks.onMessage = (rtc, msg) => {
        console.debug(msg);
      };

      RTCcallbacks.onAnswerSDP = (rtc, sdp) => {
        console.error('answer sdp', sdp);
      };
    } else {
      this.params.remote_caller_id_name = 'Outbound Call';
      this.params.remote_caller_id_number = this.params.destination_number;
    }

    RTCcallbacks.onICESDP = (rtc) => {
      // console.log('RECV ' + rtc.type + ' SDP', rtc.mediaData.SDP);

      if (
        this.state == Enum.state.requesting ||
        this.state == Enum.state.answering ||
        this.state == Enum.state.active
      ) {
        location.reload();
        return;
      }

      if (rtc.type == 'offer') {
        if (this.state == Enum.state.active) {
          this.setState(Enum.state.requesting);
          this.sendMethod('verto.attach', {
            sdp: rtc.mediaData.SDP,
          });
        } else {
          this.setState(Enum.state.requesting);

          this.sendMethod('verto.invite', {
            sdp: rtc.mediaData.SDP,
          });
        }
      } else {
        //answer
        this.setState(Enum.state.answering);

        this.sendMethod(this.attach ? 'verto.attach' : 'verto.answer', {
          sdp: this.rtc.mediaData.SDP,
        });
      }
    };

    RTCcallbacks.onICE = (rtc) => {
      //console.log("cand", rtc.mediaData.candidate);
      if (rtc.type == 'offer') {
        // console.log('offer', rtc.mediaData.candidate);
        return;
      }
    };

    RTCcallbacks.onStream = (rtc, stream) => {
      if (
        this.verto.options.permissionCallback &&
        typeof this.verto.options.permissionCallback.onGranted === 'function'
      ) {
        this.verto.options.permissionCallback.onGranted(stream);
      }
      // console.log('stream started');
    };

    RTCcallbacks.onError = (e) => {
      if (
        this.verto.options.permissionCallback &&
        typeof this.verto.options.permissionCallback.onDenied === 'function'
      ) {
        this.verto.options.permissionCallback.onDenied();
      }
      // console.error('ERROR:', e);
      this.hangup({ cause: 'Device or Permission Error' });
    };

    this.rtc = new VertoRTC({
      callbacks: RTCcallbacks,
      localVideo: this.screenShare ? null : this.localVideo,
      useVideo: this.params.useVideo ? this.videoStream : null,
      useAudio: this.audioStream,
      useStereo: this.params.useStereo || false,
      videoParams: this.params.videoParams || {},
      audioParams: verto.options.audioParams || {},
      iceServers: verto.options.iceServers,
      screenShare: this.screenShare,
      useCamera: this.useCamera,
      useMic: this.useMic,
      useSpeak: this.useSpeak,
    });

    if (this.direction == Enum.direction.inbound) {
      if (this.attach) {
        this.answer();
      } else {
        this.ring();
      }
    }
  }

  invite() {
    this.rtc.call();
  }

  sendMethod(method, obj) {
    obj.dialogParams = {};

    for (let i in this.params) {
      if (i == 'sdp' && method != 'verto.invite' && method != 'verto.attach') {
        continue;
      }

      if (obj.noDialogParams && i != 'callID') {
        continue;
      }

      obj.dialogParams[i] = this.params[i];
    }

    delete obj.noDialogParams;

    this.verto.call(
      method,
      obj,
      (e) => {
        /* Success */
        this.processReply(method, true, e);
      },

      (e) => {
        /* Error */
        this.processReply(method, false, e);
      }
    );
  }

  setAudioOutDevice(sinkId, callback, arg) {
    const element = this.audioStream;

    if (typeof element.sinkId !== 'undefined') {
      const devname = this.find_name(sinkId);
      // console.info(
      //   'Dialog: ' + this.callID + ' Setting speaker:',
      //   element,
      //   devname
      // );

      return element
        .setSinkId(sinkId)
        .then(() => {
          // console.log(
          //   'Dialog: ' +
          //     this.callID +
          //     ' Success, audio output device attached: ' +
          //     sinkId
          // );
          if (callback) {
            callback(true, devname, arg);
          }
        })
        .catch((error) => {
          const errorMessage = error;
          if (error.name === 'SecurityError') {
            errorMessage =
              'Dialog: ' +
              this.callID +
              ' You need to use HTTPS for selecting audio output ' +
              'device: ' +
              error;
          }
          if (callback) {
            callback(false, null, arg);
          }
          console.error(errorMessage);
        });
    } else {
      console.warn(
        'Dialog: ' +
          this.callID +
          ' Browser does not support output device selection.'
      );
      if (callback) {
        callback(false, null, arg);
      }

      return Promise.reject();
    }
  }

  setState(state) {
    if (this.state == Enum.state.ringing) {
      this.stopRinging();
    }

    if (this.state == state || !this.checkStateChange(this.state, state)) {
      console.error(
        'Dialog ' +
          this.callID +
          ': INVALID state change from ' +
          this.state +
          ' to ' +
          state
      );
      this.hangup();
      return false;
    }

    // console.log(
    //   'Dialog ' +
    //     this.callID +
    //     ': state change from ' +
    //     this.state.name +
    //     ' to ' +
    //     state.name
    // );

    this.lastState = this.state;
    this.state = state;

    if (this.callbacks.onDialogState) {
      this.callbacks.onDialogState(this);
    }

    if (this.onStateChange) {
      this.onStateChange(this.state, this.lastState);
    }

    switch (this.state) {
      case Enum.state.early:
      case Enum.state.active:
        const speaker = this.useSpeak;
        // console.info('Using Speaker: ', speaker);

        if (speaker && speaker !== 'any' && speaker !== 'none') {
          setTimeout(() => {
            this.setAudioPlaybackDevice(speaker);
          }, 500);
        }

        break;
      case Enum.state.trying:
        setTimeout(() => {
          if (this.state == Enum.state.trying) {
            this.setState(Enum.state.hangup);
          }
        }, 30000);
        break;
      case Enum.state.purge:
        this.setState(Enum.state.destroy);
        break;
      case Enum.state.hangup:
        if (
          this.lastState > Enum.state.requesting &&
          this.lastState < Enum.state.hangup
        ) {
          this.sendMethod('verto.bye', {});
        }

        this.setState(Enum.state.destroy);
        break;
      case Enum.state.destroy:
        // TODO: This should probably only happen when a tag wasn't specified.
        // if (typeof this.verto.options.tag === 'function') {
        //   this.verto.options.tag().remove();
        // }

        delete this.verto.dialogs[this.callID];
        if (this.params.screenShare) {
          this.rtc.stopPeer();
        } else {
          this.rtc.stop();
        }
        break;
    }

    return true;
  }

  processReply(method, success, e) {
    // console.log(
    //   'Response: ' + method + ' State:' + this.state.name,
    //   success,
    //   e
    // );

    switch (method) {
      case 'verto.answer':
      case 'verto.attach':
        if (success) {
          this.setState(Enum.state.active);
        } else {
          this.hangup();
        }
        break;
      case 'verto.invite':
        if (success) {
          this.setState(Enum.state.trying);
        } else {
          this.setState(Enum.state.destroy);
        }
        break;

      case 'verto.bye':
        this.hangup();
        break;
      case 'verto.modify':
        if (e.holdState) {
          if (e.holdState == 'held') {
            if (this.state != Enum.state.held) {
              this.setState(Enum.state.held);
            }
          } else if (e.holdState == 'active') {
            if (this.state != Enum.state.active) {
              this.setState(Enum.state.active);
            }
          }
        }

        if (success) {
        }

        break;
      default:
        break;
    }
  }

  hangup(params) {
    if (params) {
      if (params.causeCode) {
        this.causeCode = params.causeCode;
      }

      if (params.cause) {
        this.cause = params.cause;
      }
    }

    if (!this.cause && !this.causeCode) {
      this.cause = 'NORMAL_CLEARING';
    }

    if (this.state >= Enum.state.new && this.state < Enum.state.hangup) {
      this.setState(Enum.state.hangup);
    } else if (this.state < Enum.state.destroy) {
      this.setState(Enum.state.destroy);
    }
  }

  stopRinging() {
    // console.log('stop ringing');
    if (this.verto.ringer) {
      this.rtc.stopRinger(this.verto.ringer);
    }
  }

  indicateRing() {
    if (this.verto.ringer) {
      this.verto.ringer.src = this.verto.options.ringFile;
      this.verto.ringer.play();
      // console.log('playing ringer');

      setTimeout(() => {
        this.stopRinging();
        if (this.state == Enum.state.ringing) {
          this.indicateRing();
        }
      }, this.verto.options.ringSleep);
    }
  }

  ring() {
    this.setState(Enum.state.ringing);
    this.indicateRing();
  }

  useVideo(on) {
    this.params.useVideo = on;

    if (on) {
      this.videoStream = this.audioStream;
    } else {
      this.videoStream = null;
    }

    this.rtc.useVideo(this.videoStream, this.localVideo);
  }

  setMute(what) {
    return this.rtc.setMute(what);
  }

  mute() {
    return this.rtc.setMute('on');
  }

  unmute() {
    return this.rtc.setMute('off');
  }

  toggleMute() {
    return this.rtc.setMute('toggle');
  }

  getMute() {
    return this.rtc.getMute();
  }

  setVideoMute(what) {
    return this.rtc.setVideoMute(what);
  }

  $getVideoMute() {
    return this.rtc.getVideoMute();
  }

  useStereo(on) {
    this.params.useStereo = on;
    this.rtc.useStereo(on);
  }

  dtmf(digits) {
    if (digits) {
      this.sendMethod('verto.info', {
        dtmf: digits,
      });
    }
  }

  rtt(obj) {
    const pobj = {};

    if (!obj) {
      return false;
    }

    pobj.code = obj.code;
    pobj.chars = obj.chars;

    if (pobj.chars || pobj.code) {
      this.sendMethod('verto.info', {
        txt: obj,
        noDialogParams: true,
      });
    }
  }

  transfer(dest, params) {
    if (dest) {
      this.sendMethod('verto.modify', {
        action: 'transfer',
        destination: dest,
        params: params,
      });
    }
  }

  hold(params) {
    this.sendMethod('verto.modify', {
      action: 'hold',
      params: params,
    });
  }

  unhold(params) {
    this.sendMethod('verto.modify', {
      action: 'unhold',
      params: params,
    });
  }

  toggleHold(params) {
    this.sendMethod('verto.modify', {
      action: 'toggleHold',
      params: params,
    });
  }

  message(msg) {
    let err = 0;

    msg.from = this.params.login;

    if (!msg.to) {
      console.error('Missing To');
      err++;
    }

    if (!msg.body) {
      console.error('Missing Body');
      err++;
    }

    if (err) {
      return false;
    }

    this.sendMethod('verto.info', {
      msg: msg,
    });

    return true;
  }

  answer(params) {
    if (this.answered) return;

    if (!params) params = {};

    params.sdp = this.params.sdp;

    if (params) {
      if (params.useVideo) {
        this.useVideo(true);
      }

      this.params.callee_id_name = params.callee_id_name;
      this.params.callee_id_number = params.callee_id_number;

      if (params.useCamera) {
        this.useCamera = params.useCamera;
      }

      if (params.useMic) {
        this.useMic = params.useMic;
      }

      if (params.useSpeak) {
        this.useSpeak = params.useSpeak;
      }
    }

    this.rtc.createAnswer(params);
    this.answered = true;
  }

  handleAnswer(params) {
    this.gotAnswer = true;

    if (this.state >= Enum.state.active) {
      return;
    }

    if (this.state >= Enum.state.early) {
      this.setState(Enum.state.active);
    } else {
      if (this.gotEarly) {
        // console.log(
        //   'Dialog ' +
        //     this.callID +
        //     ' Got answer while still establishing early media, delaying...'
        // );
      } else {
        // console.log('Dialog ' + this.callID + ' Answering Channel');
        this.rtc.answer(
          params.sdp,
          () => {
            this.setState(Enum.state.active);
          },
          (e) => {
            console.error(e);
            this.hangup();
          }
        );
        // console.log('Dialog ' + this.callID + 'ANSWER SDP', params.sdp);
      }
    }
  }

  cidString(enc) {
    const party =
      this.params.remote_caller_id_name +
      (enc ? ' &lt;' : ' <') +
      this.params.remote_caller_id_number +
      (enc ? '&gt;' : '>');
    return party;
  }

  sendMessage(msg, params) {
    if (this.callbacks.onMessage) {
      this.callbacks.onMessage(this.verto, this, msg, params);
    }
  }

  handleInfo(params) {
    this.sendMessage(Enum.message.info, params);
  }

  handleDisplay(params) {
    if (params.display_name) {
      this.params.remote_caller_id_name = params.display_name;
    }
    if (params.display_number) {
      this.params.remote_caller_id_number = params.display_number;
    }

    this.sendMessage(Enum.message.display, {});
  }

  handleMedia(params) {
    if (this.state >= Enum.state.early) {
      return;
    }

    this.gotEarly = true;

    this.rtc.answer(
      params.sdp,
      () => {
        // console.log('Dialog ' + this.callID + 'Establishing early media');
        this.setState(Enum.state.early);

        if (this.gotAnswer) {
          // console.log('Dialog ' + this.callID + 'Answering Channel');
          this.setState(Enum.state.active);
        }
      },
      (e) => {
        console.error(e);
        this.hangup();
      }
    );

    // console.log('Dialog ' + this.callID + 'EARLY SDP', params.sdp);
  }

  checkStateChange(oldS, newS) {
    if (newS == Enum.state.purge || Enum.states[oldS][newS]) {
      return true;
    }

    return false;
  }

  find_name(id) {
    const sourceMatch = this.verto.audioOutDevices.find(
      (source) => source.id === id
    );
    return sourceMatch ? sourceMatch.label : id;
  }
}
