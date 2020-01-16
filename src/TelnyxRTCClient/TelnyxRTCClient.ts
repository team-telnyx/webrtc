import { ICall, IClientOptions, ICallOptions } from '../utils/interfaces';
import ITelnyxRTCDialog from './ITelnyxRTCDialog';

const MODULE = 'verto';
const HOST = `webrtc2.telnyx.com`;
const TelnyxRTC_PORT = 14939;
const TelnyxRTC_DEV_PORT = 14938;

import Verto from '../TelnyxRTC/Verto';
import BaseClient from '../BaseClient';
import TelnyxRTCCall from './TelnyxRTCCall';

const getDeviceString = (input: string | Boolean): string => {
  if (typeof input === 'boolean') {
    return input ? 'any' : 'none';
  } else if (typeof input === 'string') {
    return input;
  }

  return 'none';
};

export default class TelnyxRTCClient extends BaseClient {
  /**
   * TelnyxRTC instance, only exposed for testing.
   * @hidden
   */
  public telnyxRTC: Verto;

  constructor(o?: IClientOptions) {
    super(o);
    this.host = this.host || HOST;
    this.port =
      this.port || (this.env === 'development' ? TelnyxRTC_DEV_PORT : TelnyxRTC_PORT);
      this.module = this.module || MODULE;
  }

  async connect() {
    await this.checkPermissions();
    await this.checkDevices();

    const callbacks = {
      onWSConnect: () => {
        this.eventBus.emit('socket.connect');
      },
      onWSLogin: () => {
        this.eventBus.emit('ready');
        this.eventBus.emit('registered');
      },
      onWSClose: () => {
        this.eventBus.emit('unregistered');
        this.eventBus.emit('socket.close');
      },
      onDialogState: (d: ITelnyxRTCDialog) => {
        this.eventBus.emit('callUpdate', new TelnyxRTCCall(d));
      },
    };

    this.telnyxRTC = new Verto(
      {
        login: `${this.credentials.username}@${this.host}`,
        password: this.credentials.token || this.credentials.password,
        socketUrl: `wss://${this.host}:${this.port}`,
        module: this.module,
        // ringFile: 'bell_ring2.wav',
        iceServers: [this.stunServer, this.turnServer],
        deviceParams: {
          useMic: getDeviceString(this.useMic),
          useSpeaker: getDeviceString(this.useSpeaker),
          useCamera: getDeviceString(this.useCamera),
        },
        tag: () => this.remoteElement,
      },
      callbacks
    );
  }

  newCall(options: ICallOptions): ICall {
    if (!options.destination) {
      throw new TypeError('destination is required');
    }

    const call = this.telnyxRTC.newCall({
      destination_number: options.destination,
      caller_id_name: options.callerName || 'Telnyx',
      caller_id_number: options.callerNumber || this.credentials.username,
      // callee_id_number: options.remoteCallerNumber || options.destination,
      // callee_id_name: options.remoteCallerName || 'Outbound Call',
      outgoingBandwidth: 'default',
      incomingBandwidth: 'default',
      useStereo: true,
      useVideo: this.useCamera,
      // useVideo: typeof options.video === 'boolean' ? options.video : true,
      // tag: '#verto-container',
    });

    return new TelnyxRTCCall(call);
  }

  disconnect() {
    if (this.telnyxRTC) {
      this.telnyxRTC.logout();
      this.telnyxRTC = null;
    }

    this.eventBus.removeAllListeners();
  }

  /**
   * @hidden
   */
  async checkDevices() {
    return Verto.checkDevices();
  }

  /**
   * @hidden
   */
  async checkPermissions() {
    return new Promise((resolve, reject) => {
      const useAudio = true;
      const useVideo = this.useCamera;
      Verto.checkPerms(
        (result: boolean) => (result ? resolve() : reject()),
        useAudio,
        useVideo
      );
    });
  }

  /**
   * @hidden
   */
  getVideoDevices(): {}[] {
    return Verto.videoDevices;
  }

  /**
   * @hidden
   */
  getAudioInDevices(): {}[] {
    return Verto.audioInDevices;
  }

  /**
   * @hidden
   */
  getAudioOutDevices(): {}[] {
    return Verto.audioOutDevices;
  }

  /**
   * @hidden
   */
  getDevices(): {}[] {
    return [
      ...this.getAudioInDevices(),
      ...this.getAudioOutDevices(),
      ...this.getVideoDevices(),
    ];
  }
}
