import { Session, UserAgent } from "sip.js";
import { IncomingResponse } from "sip.js/lib/core";
import { SessionManager } from "sip.js/lib/platform/web";
import { Call } from "./call";
import { SwEvent } from "./constant";
import { eventBus } from "./events";
import {
  AnyFunction,
  ICall,
  ICallOptions,
  IClient,
  IClientOptions,
  IWebRTCInfo,
  IWebRTCSupportedBrowser,
} from "./types";

export class Client implements IClient {
  public calls: Record<string, Call>;
  public options: IClientOptions;
  public mediaConstraints: MediaStreamConstraints;

  /**
   * @deprecated
   */
  public static telnyxStateCall(call: ICall) {
    return call;
  }
  private _sessionManager: SessionManager;

  constructor(options: IClientOptions) {
    this.calls = {};
    this.options = options;
    this.mediaConstraints = {
      audio: true,
      video: false,
    };

    this._sessionManager = new SessionManager("wss://sipdev.telnyx.com:7443", {
      aor: `sip:${options.login}@sip.telnyx.com`,
      delegate: {
        onRegistered: this._onRegister,
        onUnregistered: this._onUnregister,
        onServerConnect: this._onSocketOpen,
        onServerDisconnect: this._onSocketClose,
        onCallAnswered: this._onCallAnswered,
        onCallReceived: this._onCallReceived,
        onCallHangup: this._onCallHangup,
      },
      userAgentOptions: {
        logLevel: "warn",
        authorizationUsername: options.login,
        authorizationPassword: options.password,
        uri: UserAgent.makeURI(`sip:${options.login}@sip.telnyx.com`),
        displayName: options.login,
        sessionDescriptionHandlerFactoryOptions: {
          iceGatheringTimeout: 1000,
          peerConnectionConfiguration: {
            bundlePolicy: "max-compat",
            sdpSemantics: "unified-plan",
            rtcpMuxPolicy: "negotiate",
          },
        },
      },
    });
  }

  private _onCallHangup = (session: Session) => {
    const call = this.calls[session.id];
    if (!call) {
      return;
    }
    call.setState("hangup");
    delete this.calls[call.id];
  };
  private _onCallReceived = (session: Session) => {
    const call = new Call(session, this._sessionManager, "inbound");
    this.calls[session.id] = call;
    call.setState("ringing");
  };
  async checkPermissions(audio: boolean, video: boolean): Promise<boolean> {
    return true;
  }
  disableMicrophone(): void {
    this.mediaConstraints.audio = false;
  }
  disableWebcam(): void {
    this.mediaConstraints.video = false;
  }
  enableMicrophone(): void {
    this.mediaConstraints.audio = true;
  }
  enableWebcam(): void {
    this.mediaConstraints.video = true;
  }

  async logout(): Promise<void> {}

  private _onCallTrying = (response: IncomingResponse) => {
    const id = response.message.callId + response.message.fromTag;
    const call = this.calls[id];
    if (!call) {
      return;
    }
    call.setState("trying");
  };

  private _onCallProgress = (response: IncomingResponse) => {
    const id = response.message.callId + response.message.fromTag;
    const call = this.calls[id];
    if (!call) {
      return;
    }
    if (response.message.statusCode === 180) {
      call.setState("ringing");
    }
  };

  async newCall(options: ICallOptions): Promise<Call> {
    const extraHeaders = options.customHeaders
      ? options.customHeaders.map(({ name, value }) => `${name}: ${value}`)
      : [];

    const session = await this._sessionManager.call(
      options.destinationNumber,
      {
        earlyMedia: true,
        extraHeaders: extraHeaders,
      },
      {
        requestDelegate: {
          onTrying: this._onCallTrying,
          onProgress: this._onCallProgress,
        },
      }
    );
    const call = new Call(session, this._sessionManager, "outbound");
    return call;
  }

  private _onCallAnswered = (session: Session) => {
    const call = this.calls[session.id];
    if (!call) {
      return;
    }
    call.setState("active");
  };

  off(eventName: string, callback: AnyFunction): void {
    eventBus.removeListener(eventName, callback);
  }
  on(eventName: string, callback: AnyFunction): void {
    eventBus.addListener(eventName, callback);
  }

  private _onRegister = () => {
    eventBus.emit(SwEvent.Ready);
  };
  private _onUnregister = () => {
    eventBus.emit(SwEvent.Closed);
  };

  private _onSocketOpen = () => {
    eventBus.emit(SwEvent.SocketOpen);
  };
  private _onSocketClose = () => {
    eventBus.emit(SwEvent.SocketClose);
  };

  public get connected() {
    return this._sessionManager.isConnected();
  }

  public async connect() {
    await this._sessionManager.connect();
    await this._sessionManager.register();
  }

  public async disconnect() {
    await this._sessionManager.unregister();
    await this._sessionManager.disconnect();
  }

  // ----------

  localElement: HTMLMediaElement | null;
  remoteElement: HTMLMediaElement | null;
  speaker: string | null;

  webRTCInfo(): IWebRTCInfo {
    return {} as IWebRTCInfo;
  }
  webRTCSupportedBrowserList(): IWebRTCSupportedBrowser[] {
    return [];
  }

  async getAudioInDevices(): Promise<MediaDeviceInfo[]> {
    return [];
  }
  async getAudioOutDevices(): Promise<MediaDeviceInfo[]> {
    return [];
  }
  getDeviceResolutions(
    deviceId: string
  ): { resolution: string; width: number; height: number }[] {
    return [];
  }
  async getDevices(): Promise<MediaDeviceInfo[]> {
    return [];
  }
  async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    return [];
  }
}
