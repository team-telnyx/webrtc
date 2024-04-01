import CallAgent from "./CallAgent";
import { connection } from "./Connection";
import { deRegister, register } from "./Handler";
import { SIPRegistrationAgent } from "./SIPRegistrationAgent";
import {
  ICall,
  ICallOptions,
  IClient,
  IClientOptions,
  IWebRTCInfo,
  IWebRTCSupportedBrowser,
} from "./types";

export default class JanusClient implements IClient {
  private _options: IClientOptions;
  private _sipRegistrationAgent: SIPRegistrationAgent;
  private _callAgent: CallAgent;
  // private _keepAliveAgent: KeepAliveAgent;

  constructor(options: IClientOptions = {}) {
    this._options = options;

    this._sipRegistrationAgent = new SIPRegistrationAgent();
    // this._keepAliveAgent = new KeepAliveAgent();
    this._callAgent = new CallAgent(this._options);
  }

  public get calls(): Record<string, ICall> {
    return this._callAgent.calls;
  }
  public get mediaConstraints() {
    return this._callAgent.defaultMediaConstrains;
  }

  // TODO: implement
  speaker: string | null = null;

  checkPermissions(audio: boolean, video: boolean): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  disableMicrophone(): void {
    this._callAgent.defaultMediaConstrains.audio = false;
  }
  disableWebcam(): void {
    this._callAgent.defaultMediaConstrains.video = false;
  }
  enableMicrophone(): void {
    this._callAgent.defaultMediaConstrains.audio = true;
  }
  enableWebcam(): void {
    this._callAgent.defaultMediaConstrains.video = true;
  }

  getAudioInDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        devices.filter((device) => device.kind === "audioinput")
      );
  }

  getAudioOutDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        devices.filter((device) => device.kind === "audiooutput")
      );
  }

  getDeviceResolutions(
    deviceId: string
  ): { resolution: string; width: number; height: number }[] {
    throw new Error("Method not implemented.");
  }
  getDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices().then((devices) => devices);
  }
  getVideoDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        devices.filter((device) => device.kind === "videoinput")
      );
  }

  /**
   * @deprecated use .disconnect instead
   */
  logout(): Promise<void> {
    return this.disconnect();
  }

  webRTCInfo(): IWebRTCInfo {
    throw new Error("Method not implemented.");
  }
  webRTCSupportedBrowserList(): IWebRTCSupportedBrowser[] {
    throw new Error("Method not implemented.");
  }
  public get connected() {
    return connection.connected;
  }
  public async disconnect() {
    await this._sipRegistrationAgent.unregister();
    // this._keepAliveAgent?.stop();
    connection.disconnect();
  }

  public async connect() {
    await connection.connect();
    if (this._options.login || this._options.login_token) {
      await this._sipRegistrationAgent.register(this._options);
    }
  }

  async newCall(options: ICallOptions) {
    const call = await this._callAgent.newCall(options);
    return call;
  }
  public on(event: string, handler: Function) {
    // TODO change to event emitter instead
    register(event, handler);
  }
  public off(event: string, handler: Function) {
    // TODO change to event emitter instead
    deRegister(event, handler);
  }

  public get localElement(): HTMLMediaElement | null {
    return this._callAgent.localElement;
  }
  public get remoteElement(): HTMLMediaElement | null {
    return this._callAgent.remoteElement;
  }
}
