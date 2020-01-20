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
 * verto-livearray.js - Verto LiveArray
 *
 */

/**
 * @hidden
 */
export default class VertoHashArray {
  constructor() {
    this.hash = {};
    this.array = [];
  }

  reorder(a) {
    this.array = a;
    let h = this.hash;
    this.hash = {};

    const len = array.length;

    for (let i = 0; i < len; i++) {
      const key = this.array[i];
      if (h[key]) {
        this.hash[key] = h[key];
        delete h[key];
      }
    }
    h = undefined;
  }

  clear() {
    this.hash = undefined;
    this.array = undefined;
    this.hash = {};
    this.array = [];
  }

  add(name, val, insertAt) {
    let redraw = false;

    if (!this.hash[name]) {
      if (
        insertAt === undefined ||
        insertAt < 0 ||
        insertAt >= this.array.length
      ) {
        this.array.push(name);
      } else {
        let x = 0;
        const n = [];
        const len = this.array.length;

        for (let i = 0; i < len; i++) {
          if (x++ == insertAt) {
            n.push(name);
          }
          n.push(this.array[i]);
        }

        this.array = undefined;
        this.array = n;
        n = undefined;
        redraw = true;
      }
    }

    this.hash[name] = val;

    return redraw;
  }

  del(name) {
    let r = false;

    if (this.hash[name]) {
      this.array = this.array.filter((x) => x !== name);
      delete this.hash[name];
      r = true;
    } else {
      console.error("can't del nonexistant key " + name);
    }

    return r;
  }

  get(name) {
    return this.hash[name];
  }

  order() {
    return this.array;
  }

  hash() {
    return this.hash;
  }

  indexOf(name) {
    return this.array.indexOf(name);
  }

  arrayLen() {
    return this.array.length;
  }

  asArray() {
    const r = [];

    const len = this.array.length;

    for (let i = 0; i < len; i++) {
      const key = this.array[i];
      r.push(this.hash[key]);
    }

    return r;
  }

  each(cb) {
    const len = this.array.length;

    for (let i = 0; i < len; i++) {
      cb(this.array[i], this.hash[this.array[i]]);
    }
  }

  dump(html) {
    let str = '';

    vha.each((name, val) => {
      str +=
        'name: ' +
        name +
        'val: ' +
        JSON.stringify(val) +
        (html ? '<br>' : '\n');
    });

    return str;
  }
}

/**
 * @hidden
 */
export class VertoLiveArray extends VertoHashArray {
  constructor(verto, context, name, config) {
    super();
    this.verto = verto;
    this.lastSerno = 0;
    this.binding = null;
    this.user_obj = config.userObj;
    this.config = config;
    this.local = false;

    // Save the hashArray add, del, reorder, clear methods so we can make our own.
    this._add = super.add;
    this._del = super.del;
    this._reorder = super.reorder;
    this._clear = super.clear;

    this.context = context;
    this.name = name;
    this.errs = 0;
    this.onChange = config.onChange;
    console.log('VertoLiveArray init....');

    if (context) {
      this.binding = verto.subscribe(context, {
        handler: this.eventHandler.bind(this),
        userData: verto,
        userData: this,
        subParams: config.subParams,
      });
    }

    this.bootstrap(config);
  }

  broadcast(channel, obj) {
    console.log('broadcast', obj);
    this.verto.broadcast(channel, obj);
  }

  clear() {
    this._clear();
    this.lastSerno = 0;

    if (this.onChange) {
      this.onChange(this, {
        action: 'clear',
      });
    }
  }

  checkSerno(serno) {
    if (serno < 0) {
      return true;
    }

    if (this.lastSerno > 0 && serno != this.lastSerno + 1) {
      if (this.onErr) {
        this.onErr(la, {
          lastSerno: this.lastSerno,
          serno: serno,
        });
      }
      this.errs++;
      console.debug(this.errs);
      if (this.errs < 3) {
        this.bootstrap(this.user_obj);
      }
      return false;
    } else {
      this.lastSerno = serno;
      return true;
    }
  }

  reorder(serno, a) {
    if (this.checkSerno(serno)) {
      this._reorder(a);
      if (this.onChange) {
        this.onChange(this, {
          serno: serno,
          action: 'reorder',
        });
      }
    }
  }

  init(serno, val, key, index) {
    if (key === null || key === undefined) {
      key = serno;
    }
    if (this.checkSerno(serno)) {
      if (la.onChange) {
        la.onChange(la, {
          serno: serno,
          action: 'init',
          index: index,
          key: key,
          data: val,
        });
      }
    }
  }

  bootObj(serno, val) {
    if (this.checkSerno(serno)) {
      this.clear();
      for (let i in val) {
        this._add(val[i][0], val[i][1]);
      }

      if (this.onChange) {
        this.onChange(this, {
          serno: serno,
          action: 'bootObj',
          data: val,
          redraw: true,
        });
      }
    }
  }

  // 	// @param serno  La is the serial number for la particular request.
  // 	// @param key    If looking at it as a hash table, la represents the key in the hashArray object where you want to store the val object.
  // 	// @param index  If looking at it as an array, la represents the position in the array where you want to store the val object.
  // 	// @param val    La is the object you want to store at the key or index location in the hash table / array.
  add(serno, val, key, index) {
    if (key === null || key === undefined) {
      key = serno;
    }
    if (this.checkSerno(serno)) {
      const redraw = this._add(key, val, index);
      if (this.onChange) {
        this.onChange(this, {
          serno: serno,
          action: 'add',
          index: index,
          key: key,
          data: val,
          redraw: redraw,
        });
      }
    }
  }

  modify(serno, val, key, index) {
    if (key === null || key === undefined) {
      key = serno;
    }
    if (this.checkSerno(serno)) {
      this._add(key, val, index);
      if (this.onChange) {
        this.onChange(this, {
          serno: serno,
          action: 'modify',
          key: key,
          data: val,
          index: index,
        });
      }
    }
  }

  del(serno, key, index) {
    if (key === null || key === undefined) {
      key = serno;
    }
    if (this.checkSerno(serno)) {
      if (index === null || index < 0 || index === undefined) {
        index = this.indexOf(key);
      }
      const ok = this._del(key);

      if (ok && this.onChange) {
        this.onChange(this, {
          serno: serno,
          action: 'del',
          key: key,
          index: index,
        });
      }
    }
  }

  eventHandler(v, e, la) {
    const packet = e.data;

    console.debug('READ:', packet);

    if (packet.name != la.name) {
      return;
    }

    switch (packet.action) {
      case 'init':
        this.init(
          packet.wireSerno,
          packet.data,
          packet.hashKey,
          packet.arrIndex
        );
        break;

      case 'bootObj':
        this.bootObj(packet.wireSerno, packet.data);
        break;
      case 'add':
        this.add(
          packet.wireSerno,
          packet.data,
          packet.hashKey,
          packet.arrIndex
        );
        break;

      case 'modify':
        if (!(packet.arrIndex || packet.hashKey)) {
          console.error('Invalid Packet', packet);
        } else {
          this.modify(
            packet.wireSerno,
            packet.data,
            packet.hashKey,
            packet.arrIndex
          );
        }
        break;
      case 'del':
        if (!(packet.arrIndex || packet.hashKey)) {
          console.error('Invalid Packet', packet);
        } else {
          this.del(packet.wireSerno, packet.hashKey, packet.arrIndex);
        }
        break;

      case 'clear':
        this.clear();
        break;

      case 'reorder':
        this.reorder(packet.wireSerno, packet.order);
        break;

      default:
        if (this.checkSerno(packet.wireSerno)) {
          if (this.onChange) {
            this.onChange(this, {
              serno: packet.wireSerno,
              action: packet.action,
              data: packet.data,
            });
          }
        }
        break;
    }
  }

  destroy() {
    this._clear();
    this.verto.unsubscribe(this.binding);
  }

  sendCommand(cmd, obj) {
    this.broadcast(this.context, {
      liveArray: {
        command: cmd,
        context: this.context,
        name: this.name,
        obj: obj,
      },
    });
  }

  bootstrap(obj) {
    this.sendCommand('bootstrap', obj);
    //this.heartbeat();
  }

  changepage(obj) {
    this.clear();
    this.broadcast(this.context, {
      liveArray: {
        command: 'changepage',
        context: la.context,
        name: la.name,
        obj: obj,
      },
    });
  }

  heartbeat(obj) {
    const callback = () => {
      this.heartbeat.call(this, obj);
    };

    this.broadcast(this.context, {
      liveArray: {
        command: 'heartbeat',
        context: this.context,
        name: this.name,
        obj: obj,
      },
    });

    this.hb_pid = setTimeout(callback, 30000);
  }
}
