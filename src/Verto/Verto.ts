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
 * Stefan Yohansson <sy.fen0@gmail.com>
 *
 * verto.js - Main interface
 *
 */
import generateGUID from 'uuid/v1';

import VertoLiveArray from './LiveArray';
import VertoConf from './ConfMan';
import VertoDialog from './Dialog';
import VertoRTC from './RTC';
import Enum from './Enum';

interface DeviceParams {
  useCamera?: 'none' | 'any' | string;
  useMic?: 'none' | 'any' | string;
  useSpeak?: 'none' | 'any' | string;
  onResCheck?: Function;
}

interface VideoParams {
  useCamera?: 'none' | 'any' | string;
  useMic?: 'none' | 'any' | string;
  useSpeak?: 'none' | 'any' | string;
  onResCheck?: Function;
}

// These are currently unused by Telnyx.
interface LoginParams {}
interface UserVariables {}
interface IceServer {
  urls: string | [string];
  username?: string;
  credential?: string;
}

/**
 * @TODO Use a WS package and remove the retry logic in this module.
 * @hidden
 */
export default class Verto {
  _ws_socket: any;
  q: any[];
  _ws_callbacks: {};
  _current_id: number;
  options: {
    sessid?: string;
    login?: string;
    password?: string;
    tag?: Function | string;
    ringFile?: string;
    socketUrl?: string;
    onWSClose?: Function;
    onWSOpen?: Function;
    onWSConnect?: Function;
    onWSLogin?: Function;
    deviceParams?: DeviceParams;
    videoParams?: VideoParams;
    loginParams?: LoginParams;
    userVariables?: UserVariables;
    iceServers?: [IceServer];
    onmessage?: Function;
  };
  SERNO: number;
  dialog: any;
  dialogs: {};
  params: any;
  callbacks: any;
  rpcClient: this;
  generateGUID: any;
  sessid: any;
  eventSUBS: {};
  ringer: any;
  to: any;
  authing: boolean;
  ws_sleep: any;
  ws_cnt: number;
  up_dur: number;
  speedCB: Function;
  down_dur: number;
  speedBytes: number;
  last_response: any;

  static videoDevices: any[];
  static audioInDevices: any[];
  static audioOutDevices: any[];
  static unloadJobs: any[];
  static checkDevices: (runtime?: any) => void;
  static refreshDevices: any;
  static checkPerms: (runtime: any, check_audio: any, check_video: any) => void;
  static init: (options: any, runtime: any) => void;
  static LiveArray: typeof VertoLiveArray;
  static Conf: typeof VertoConf;
  static Dialog: typeof VertoDialog;

  constructor(params, callbacks) {
    this._ws_socket = null;
    this.q = [];
    this._ws_callbacks = {};
    this._current_id = 0;
    this.options = {};
    this.SERNO = 1;
    this.dialog = null;
    this.dialogs = {};
    this.params = params;
    this.callbacks = callbacks;
    this.rpcClient = this; // backward compatible
    this.generateGUID = generateGUID();
    this.connect();
  }

  connect(params = this.params, callbacks = this.callbacks) {
    // console.log('verto connect', this.options.socketUrl);

    if (!params || !params.socketUrl) {
      return;
    }

    this.options = Object.assign(
      {
        login: null,
        password: null,
        socketUrl: null,
        tag: null,
        localTag: null,
        videoParams: {},
        audioParams: {},
        loginParams: {},
        deviceParams: {
          onResCheck: null,
        },
        userVariables: {},
        iceServers: false,
        ringSleep: 6000,
        sessid: null,
        // la: new VertoLiveArray(),
        onmessage: (e) => {
          return this.handleMessage(e.eventData);
        },
      },
      params,
      callbacks
    );

    if (this.options.deviceParams.useCamera !== 'none') {
      VertoRTC.getValidRes(
        this.options.deviceParams.useCamera,
        this.options.deviceParams.onResCheck
      );
    }

    if (!this.options.deviceParams.useMic) {
      this.options.deviceParams.useMic = 'any';
    }

    if (!this.options.deviceParams.useSpeak) {
      this.options.deviceParams.useSpeak = 'any';
    }

    if (this.options.sessid) {
      this.sessid = this.options.sessid;
    } else {
      this.sessid =
        localStorage.getItem('verto_session_uuid') || generateGUID();
      localStorage.setItem('verto_session_uuid', this.sessid);
    }

    this.dialogs = {};
    this.callbacks = callbacks || {};
    this.eventSUBS = {};
    this.connectSocket();
    const tag = this.options.tag;
    const element =
      typeof tag === 'function' ? tag() : document.querySelector(tag);

    if (this.options.ringFile && element) {
      this.ringer = element;
    }

    this.login();
  }

  connectSocket() {
    if (this.to) {
      clearTimeout(this.to);
    }

    if (!this.socketReady()) {
      this.authing = false;
      if (this._ws_socket) {
        delete this._ws_socket;
      }
      // No socket, or dying socket, let's get a new one.
      this._ws_socket = new WebSocket(this.options.socketUrl);
      if (this._ws_socket) {
        // Set up onmessage handler.
        this._ws_socket.onmessage = (event) => {
          this._onMessage(event);
        };

        this._ws_socket.onclose = (w) => {
          if (!this.ws_sleep) {
            this.ws_sleep = 1000;
            this.ws_cnt = 0;
          }
          if (this.options.onWSClose) {
            this.options.onWSClose(this);
          }
          console.error(
            'Websocket Lost ' +
              this.ws_cnt +
              ' sleep: ' +
              this.ws_sleep +
              'msec'
          );
          this.to = setTimeout(() => {
            console.log('Attempting Reconnection....');
            this.connectSocket();
          }, this.ws_sleep);
          this.ws_cnt++;
          if (this.ws_sleep < 3000 && this.ws_cnt % 10 === 0) {
            this.ws_sleep += 1000;
          }
        };

        // Set up sending of message for when the socket is open.
        this._ws_socket.onopen = () => {
          if (this.to) {
            clearTimeout(this.to);
          }
          this.ws_sleep = 1000;
          this.ws_cnt = 0;
          if (this.options.onWSConnect) {
            this.options.onWSConnect(this);
          }

          let req;
          while ((req = this.q.pop())) {
            this._ws_socket.send(req);
          }
        };
      }
    }

    return Boolean(this._ws_socket);
  }

  socketReady() {
    if (this._ws_socket === null || this._ws_socket.readyState > 1) {
      return false;
    }

    return true;
  }

  purge() {
    // console.log('purging dialogs');
    Object.keys(this.dialogs).forEach((dialog) => {
      this.dialogs[dialog].setState(Enum.state.purge);
    });
    this.eventSUBS = {};
  }

  call(method, params, success_cb?: Function, error_cb?: Function) {
    // Construct the JSON-RPC 2.0 request.
    if (!params) {
      params = {};
    }

    if (this.sessid) {
      params.sessid = this.sessid;
    }

    const request = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: this._current_id++, // Increase the id counter to match request/response
    };

    if (!success_cb) {
      success_cb = (e) => {
        console.log('Success: ', e);
      };
    }

    if (!error_cb) {
      error_cb = (e) => {
        console.log('Error: ', e);
      };
    }

    const requestJson = JSON.stringify(request);

    if (this._ws_socket.readyState < 1) {
      // The websocket is not open yet; we have to set sending of the message in onopen.
      this.q.push(requestJson);
    } else {
      // We have a socket and it should be ready to send on.
      // console.log(requestJson);
      this._ws_socket.send(requestJson);
    }
    // Setup callbacks.  If there is an id, this is a call and not a notify.
    if ('id' in request && typeof success_cb !== 'undefined') {
      this._ws_callbacks[request.id] = {
        request: requestJson,
        request_obj: request,
        success_cb: success_cb,
        error_cb: error_cb,
      };
    }
  }

  _onMessage(event) {
    // Check if this could be a JSON RPC message.
    let response;

    // Special sub proto
    if (event.data[0] == '#' && event.data[1] == 'S' && event.data[2] == 'P') {
      if (event.data[3] == 'U') {
        this.up_dur = parseInt(event.data.substring(4));
      } else if (this.speedCB && event.data[3] == 'D') {
        this.down_dur = parseInt(event.data.substring(4));
        const up_kps = (
          (this.speedBytes * 8) /
          (this.up_dur / 1000) /
          1024
        ).toFixed(0);
        const down_kps = (
          (this.speedBytes * 8) /
          (this.down_dur / 1000) /
          1024
        ).toFixed(0);
        console.info('Speed Test: Up: ' + up_kps + ' Down: ' + down_kps);
        this.speedCB(event, {
          upDur: this.up_dur,
          downDur: this.down_dur,
          upKPS: up_kps,
          downKPS: down_kps,
        });
        this.speedCB = null;
      }
      return;
    }

    response = JSON.parse(event.data);
    if (
      typeof response === 'object' &&
      'jsonrpc' in response &&
      response.jsonrpc === '2.0'
    ) {
      /// @todo Handle bad response (without id).
      // If this is an object with result, it is a response.
      if ('result' in response && this._ws_callbacks[response.id]) {
        // Get the success lcallback.
        const success_cb = this._ws_callbacks[response.id].success_cb;
        // set the sessid if present
        // if ('sessid' in response.result && !this.options.sessid || (this.options.sessid != response.result.sessid)) {
        //     this.options.sessid = response.result.sessid;
        //     if (this.options.sessid) {
        //         console.log("setting session UUID to: " + this.options.sessid);
        //     }
        // }
        // Delete the callback from the storage.
        delete this._ws_callbacks[response.id];
        // Run callback with result as parameter.
        success_cb(response.result, this);
        return;
      } else if ('error' in response && this._ws_callbacks[response.id]) {
        // If this is an object with error, it is an error response.
        // Get the error callback.
        const error_cb = this._ws_callbacks[response.id].error_cb;
        const orig_req = this._ws_callbacks[response.id].request;
        // if this is an auth request, send the credentials and resend the failed request
        if (
          !this.authing &&
          response.error.code == -32000 &&
          this.options.login &&
          this.options.password
        ) {
          this.last_response = response;
          this.authing = true;
          this.call(
            'login',
            {
              login: this.options.login,
              passwd: this.options.password,
              loginParams: this.options.loginParams,
              userVariables: this.options.userVariables,
            },
            this._ws_callbacks[response.id].request_obj.method == 'login'
              ? (e) => {
                  this.authing = false;
                  // console.log('logged in');
                  delete this._ws_callbacks[response.id];
                  if (this.options.onWSLogin) {
                    this.options.onWSLogin(this, true);
                  }
                }
              : (e) => {
                  this.authing = false;
                  // console.log(
                  //   'logged in, resending request id: ' + response.id
                  // );
                  if (this._ws_socket) {
                    this._ws_socket.send(orig_req);
                  }
                  if (this.options.onWSLogin) {
                    this.options.onWSLogin(this, true);
                  }
                },
            (e) => {
              // console.log('error logging in, request id:', response.id);
              delete this._ws_callbacks[response.id];
              error_cb(response.error, this);
              if (this.options.onWSLogin) {
                this.options.onWSLogin(this, false);
              }
            }
          );
          return;
        }

        // Delete the callback from the storage.
        delete this._ws_callbacks[response.id];
        // Run callback with the error object as parameter.
        error_cb(response.error, this);
        return;
      }
    }
    // This is not a JSON-RPC response.  Call the fallback message handler, if given.
    if (typeof this.options.onmessage === 'function') {
      event.eventData = response;
      if (!event.eventData) {
        event.eventData = {};
      }
      const reply = this.options.onmessage(event);
      if (reply && typeof reply === 'object' && event.eventData.id) {
        const msg = {
          jsonrpc: '2.0',
          id: event.eventData.id,
          result: reply,
        };
        if (this._ws_socket !== null) {
          this._ws_socket.send(JSON.stringify(msg));
        }
      }
    }
  }

  handleMessage(data) {
    if (!(data && data.method)) {
      console.error('Invalid Data', data);
      return;
    }
    if (data.params.callID) {
      let dialog = this.dialogs[data.params.callID];
      if (data.method === 'verto.attach' && dialog) {
        delete dialog.verto.dialogs[dialog.callID];
        dialog.rtc.stop();
        dialog = null;
      }
      if (dialog) {
        switch (data.method) {
          case 'verto.bye':
            console.log(data.params);
            dialog.hangup(data.params);
            break;
          case 'verto.answer':
            dialog.handleAnswer(data.params);
            break;
          case 'verto.media':
            dialog.handleMedia(data.params);
            break;
          case 'verto.display':
            dialog.handleDisplay(data.params);
            break;
          case 'verto.info':
            dialog.handleInfo(data.params);
            break;
          default:
            console.debug(
              'INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED',
              dialog,
              data.method
            );
            break;
        }
      } else {
        switch (data.method) {
          case 'verto.attach':
            data.params.attach = true;
            if (data.params.sdp && data.params.sdp.indexOf('m=video') > 0) {
              data.params.useVideo = true;
            }
            if (data.params.sdp && data.params.sdp.indexOf('stereo=1') > 0) {
              data.params.useStereo = true;
            }
            dialog = new VertoDialog(Enum.direction.inbound, this, data.params);
            dialog.setState(Enum.state.recovering);
            break;
          case 'verto.invite':
            if (data.params.sdp && data.params.sdp.indexOf('m=video') > 0) {
              data.params.wantVideo = true;
            }
            if (data.params.sdp && data.params.sdp.indexOf('stereo=1') > 0) {
              data.params.useStereo = true;
            }
            dialog = new VertoDialog(Enum.direction.inbound, this, data.params);
            break;
          default:
            console.debug(
              'INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED'
            );
            break;
        }
      }
      return {
        method: data.method,
      };
    } else {
      switch (data.method) {
        case 'verto.punt':
          this.purge();
          this.logout();
          break;
        case 'verto.event':
          let list = null;
          let key = null;
          if (data.params) {
            key = data.params.eventChannel;
          }
          if (key) {
            list = this.eventSUBS[key];
            if (!list) {
              list = this.eventSUBS[key.split('.')[0]];
            }
          }
          if (!list && key && key === this.sessid) {
            if (this.callbacks.onMessage) {
              this.callbacks.onMessage(
                this,
                null,
                Enum.message.pvtEvent,
                data.params
              );
            }
          } else if (!list && key && this.dialogs[key]) {
            this.dialogs[key].sendMessage(Enum.message.pvtEvent, data.params);
          } else if (!list) {
            if (!key) {
              key = 'UNDEFINED';
            }
            console.error('UNSUBBED or invalid EVENT ' + key + ' IGNORED');
          } else {
            list.forEach((sub) => {
              if (!sub || !sub.ready) {
                console.error('invalid EVENT for ' + key + ' IGNORED');
              } else if (sub.handler) {
                sub.handler(this, data.params, sub.userData);
              } else if (this.callbacks.onEvent) {
                this.callbacks.onEvent(this, data.params, sub.userData);
              } else {
                console.log('EVENT:', data.params);
              }
            });
          }
          break;
        case 'verto.info':
          if (this.callbacks.onMessage) {
            this.callbacks.onMessage(
              this,
              null,
              Enum.message.info,
              data.params.msg
            );
          }
          //console.error(data);
          // console.debug("MESSAGE from: " + data.params.msg.from, data.params.msg.body);
          break;
        case 'verto.clientReady':
          if (this.callbacks.onMessage) {
            this.callbacks.onMessage(
              this,
              null,
              Enum.message.clientReady,
              data.params
            );
            console.debug('CLIENT READY', data.params);
          }
          break;
        default:
          console.error(
            'INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED',
            data.method
          );
          break;
      }
    }
  }

  processReply(method, success, e) {
    console.log('Response: ' + method, success, e);
    switch (method) {
      case 'verto.subscribe':
        Object.keys(e.unauthorizedChannels || {}).forEach((channel) => {
          console.error('drop unauthorized channel: ' + channel);
          delete this.eventSUBS[channel];
        });

        Object.keys(e.subscribedChannels || {}).forEach((channel) => {
          this.eventSUBS[channel].forEach((sub) => {
            sub.ready = true;

            // console.log('subscribed to channel: ' + channel);
            if (sub.readyHandler) {
              sub.readyHandler(this, channel);
            }
          });
        });
        break;
      case 'verto.unsubscribe':
        //console.error(e);
        break;
    }
  }

  sendMethod(method, params, success_cb?: Function, error_cb?: Function) {
    this.call(
      method,
      params,
      (e) => {
        /* Success */
        this.processReply(method, true, e);
        // console.log('sendMethod success', e);
        if (success_cb) success_cb(e);
      },
      (e) => {
        /* Error */
        console.log('sendMethod ERR', e);
        if (error_cb) error_cb(e);
        this.processReply(method, false, e);
      }
    );
  }

  broadcast(channel, params) {
    const msg = {
      eventChannel: channel,
      data: {
        ...params,
      },
    };
    this.sendMethod('verto.broadcast', msg);
  }

  fsAPI(cmd, arg, success_cb, failed_cb) {
    this.sendMethod(
      'jsapi',
      {
        command: 'fsapi',
        data: {
          cmd: cmd,
          arg: arg,
        },
      },
      success_cb,
      failed_cb
    );
  }

  fsStatus(success_cb, failed_cb) {
    this.sendMethod(
      'jsapi',
      {
        command: 'fsapi',
        data: {
          cmd: 'status',
        },
      },
      success_cb,
      failed_cb
    );
  }

  showFSAPI(what, success_cb, failed_cb) {
    this.sendMethod(
      'jsapi',
      {
        command: 'fsapi',
        data: {
          cmd: 'show',
          arg: what + ' as json',
        },
      },
      success_cb,
      failed_cb
    );
  }

  do_subscribe(verto, channel, subChannels, sparams) {
    var params = sparams || {};

    var local = params.local;

    var obj = {
      eventChannel: channel,
      userData: params.userData,
      handler: params.handler,
      ready: false,
      local: false,
      readyHandler: params.readyHandler,
      serno: this.SERNO++,
    };

    let isnew = false;

    if (!verto.eventSUBS[channel]) {
      verto.eventSUBS[channel] = [];
      subChannels.push(channel);
      isnew = true;
    }

    verto.eventSUBS[channel].push(obj);

    if (local) {
      obj.ready = true;
      obj.local = true;
    }

    if (!isnew && verto.eventSUBS[channel][0].ready) {
      obj.ready = true;
      if (obj.readyHandler) {
        obj.readyHandler(verto, channel);
      }
    }

    return {
      serno: obj.serno,
      eventChannel: channel,
    };
  }

  subscribe(channel, sparams) {
    const r = [];
    const subChannels = [];
    const params = sparams || {};
    if (typeof channel === 'string') {
      r.push(this.do_subscribe(this, channel, subChannels, params));
    } else {
      Object.keys(channel || {}).forEach((c) => {
        r.push(this.do_subscribe(this, channel, subChannels, params));
      });
    }
    if (subChannels.length) {
      this.sendMethod('verto.subscribe', {
        eventChannel: subChannels.length == 1 ? subChannels[0] : subChannels,
        subParams: params.subParams,
      });
    }
    return r;
  }

  unsubscribe(handle) {
    if (!handle) {
      Object.keys(this.eventSUBS).forEach((event) => {
        this.unsubscribe(this.eventSUBS[event]);
      });
    } else {
      const unsubChannels = {};
      let sendChannels = [];
      if (typeof handle == 'string') {
        delete this.eventSUBS[handle];
        unsubChannels[handle]++;
      } else {
        Object.keys(handle).forEach((channel) => {
          if (typeof channel == 'string') {
            delete this.eventSUBS[channel];
            unsubChannels[channel]++;
          } else {
            const repl = [];
            const eventChannel = handle[channel].eventChannel;
            if (this.eventSUBS[eventChannel]) {
              this.eventSUBS[eventChannel] = this.eventSUBS[
                eventChannel
              ].reduce((acc, ec) => {
                if (ec.serno != handle[channel].serno) {
                  acc.push(ec);
                }
                return acc;
              }, []);
              if (this.eventSUBS[eventChannel].length === 0) {
                delete this.eventSUBS[eventChannel];
                unsubChannels[eventChannel]++;
              }
            }
          }
        });
      }

      sendChannels = Object.keys(unsubChannels).map((i) => {
        // console.log('Sending Unsubscribe for: ', i);
        return i;
      });

      if (sendChannels.length) {
        this.sendMethod('verto.unsubscribe', {
          eventChannel:
            sendChannels.length == 1 ? sendChannels[0] : sendChannels,
        });
      }
    }
  }

  newCall(args, callbacks?) {
    if (!this.socketReady()) {
      console.error('Not Connected...');
      return;
    }
    const dialog = new VertoDialog(Enum.direction.outbound, this, args);
    dialog.invite();
    if (callbacks) {
      dialog.callbacks = callbacks;
    }
    return dialog;
  }

  logout(msg?) {
    // console.log('verto logout', msg);
    this.closeSocket();
    if (this.callbacks.onWSClose) {
      this.callbacks.onWSClose(this, false);
    }
    this.purge();
  }

  closeSocket() {
    if (this.socketReady()) {
      this._ws_socket.onclose = (w) => {
        // console.log('Closing Socket');
      };
      this._ws_socket.close();
    }
  }

  speedTest(bytes, cb) {
    const socket = this._ws_socket;
    if (socket) {
      this.speedCB = cb;
      this.speedBytes = bytes;
      socket.send('#SPU ' + bytes);
      const loops = bytes / 1024;
      const rem = bytes % 1024;
      const data = new Array(1024).join('.');
      for (let i = 0; i < loops; i++) {
        socket.send('#SPB ' + data);
      }
      if (rem) {
        socket.send('#SPB ' + data);
      }
      socket.send('#SPE');
    }
  }

  deviceParams(obj: DeviceParams = {}) {
    this.options.deviceParams = {
      ...this.options.deviceParams,
      ...obj,
    };

    if (obj.useCamera) {
      VertoRTC.getValidRes(
        this.options.deviceParams.useCamera,
        obj ? obj.onResCheck : undefined
      );
    }
  }

  videoParams(obj: VideoParams = {}) {
    this.options.videoParams = {
      ...this.options.videoParams,
      ...obj,
    };
  }

  iceServers(iceServers: [IceServer]) {
    this.options.iceServers = iceServers;
  }

  loginData(params) {
    this.options.login = params.login;
    this.options.password = params.password;
    this.options.loginParams = params.loginParams;
    this.options.userVariables = params.userVariables;
  }

  login(msg?) {
    // this.logout();
    this.call('login', {});
  }

  hangup(callID) {
    if (callID) {
      const dialog = this.dialogs[callID];
      if (dialog) {
        dialog.hangup();
      }
    } else {
      Object.keys(this.dialogs).forEach((dialogKey) => {
        this.dialogs[dialogKey].hangup();
      });
    }
  }
}

Verto.videoDevices = [];
Verto.audioInDevices = [];
Verto.audioOutDevices = [];
Verto.unloadJobs = [];
Verto.checkDevices = (runtime?: any) => {
  // console.info('enumerating devices');
  const aud_in = [];
  const aud_out = [];
  const vid = [];

  const gotDevices = (deviceInfos) => {
    // Handles being called several times to update labels. Preserve values.
    deviceInfos.forEach((deviceInfo) => {
      let text = '';
      // console.log(deviceInfo);
      if (deviceInfo.kind === 'audioinput') {
        text = deviceInfo.label || 'microphone ' + (aud_in.length + 1);
        aud_in.push({
          id: deviceInfo.deviceId,
          kind: 'audio_in',
          label: text,
        });
      } else if (deviceInfo.kind === 'audiooutput') {
        text = deviceInfo.label || 'speaker ' + (aud_out.length + 1);
        aud_out.push({
          id: deviceInfo.deviceId,
          kind: 'audio_out',
          label: text,
        });
      } else if (deviceInfo.kind === 'videoinput') {
        text = deviceInfo.label || 'camera ' + (vid.length + 1);
        vid.push({
          id: deviceInfo.deviceId,
          kind: 'video',
          label: text,
        });
      } else {
        // console.log('Some other kind of source/device: ', deviceInfo);
      }
    });

    Verto.videoDevices = vid;
    Verto.audioInDevices = aud_in;
    Verto.audioOutDevices = aud_out;

    if (runtime) {
      runtime(true);
    }
  };

  const handleError = (error) => {
    console.log('device enumeration error: ', error);
    if (runtime) runtime(false);
  };

  navigator.mediaDevices
    .enumerateDevices()
    .then(gotDevices)
    .catch(handleError);
};

Verto.refreshDevices = Verto.checkDevices;
Verto.checkPerms = VertoRTC.checkPerms;

Verto.init = (options, runtime) => {
  if (!options) {
    options = {};
  }

  if (options.skipPermCheck && !options.skipDeviceCheck) {
    Verto.checkDevices(runtime);
  } else if (!options.skipPermCheck && options.skipDeviceCheck) {
    VertoRTC.checkPerms((status) => runtime(status), true, options.useCamera);
  } else {
    runtime(null);
  }
};

Verto.LiveArray = VertoLiveArray;
Verto.Conf = VertoConf;
Verto.Dialog = VertoDialog;

export { VertoLiveArray as LiveArray, VertoConf as Conf };
