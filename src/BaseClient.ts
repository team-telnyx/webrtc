import EventEmitter from 'events';
import TypedEmitter from './TypedEmitter';
import {
  ICall,
  IClientOptions,
  ICallOptions,
  ICredentials,
  MessageEvents,
} from './utils/interfaces';
import { Env, RTCElement } from './utils/types';

const STUN_SERVER = { urls: 'stun:stun.telnyx.com:3843' };
const TURN_SERVER = {
  urls: 'turn:turn.telnyx.com:3478?transport=tcp',
  username: 'turnuser',
  credential: 'turnpassword',
};
const REGISTRAR_SERVER = 'sip:sip.telnyx.com:7443';

const getElement = (element: RTCElement): HTMLMediaElement => {
  if (element instanceof HTMLMediaElement) {
    return element;
  } else if (typeof element === 'string') {
    return document.querySelector(element);
  } else if (element instanceof Function) {
    return element();
  }
};

export default abstract class BaseClient {
  public host: string;
  public port: number;
  public env: Env;
  public project?: string;
  public credentials: ICredentials;
  public useMic: string | boolean;
  public useSpeaker: string | boolean;
  public useCamera: string | boolean;
  public displayName: string;
  protected turnServer = TURN_SERVER;
  protected stunServer = STUN_SERVER;
  protected registrarServer = REGISTRAR_SERVER;
  protected _localElement?: HTMLMediaElement;
  protected _remoteElement?: HTMLMediaElement;

  protected eventBus = new EventEmitter() as TypedEmitter<MessageEvents>;

  constructor(o?: IClientOptions) {
    Object.assign(this, {
      env: 'production',
      useCamera: false,
      useSpeaker: true,
      useMic: true,
      ...o,
    });
  }

  set localElement(el: RTCElement) {
    this._localElement = el && getElement(el);
  }

  get localElement() {
    return this._localElement;
  }

  set remoteElement(el: RTCElement) {
    this._remoteElement = el && getElement(el);
  }

  get remoteElement() {
    return this._remoteElement;
  }

  on<E extends keyof MessageEvents>(
    message: E,
    cb: MessageEvents[E]
  ): BaseClient {
    this.eventBus.on(message, cb);
    return this;
  }

  abstract connect(): void;
  abstract disconnect(): void;

  // abstract checkDevices(): Promise<[]>;
  // abstract checkPermissions(): Promise<void>;
  // abstract getVideoDevices(): {}[];
  // abstract getAudioInDevices(): {}[];
  // abstract getAudioOutDevices(): {}[];
  // abstract getDevices(): {}[];

  abstract newCall(options: ICallOptions): ICall;
}
