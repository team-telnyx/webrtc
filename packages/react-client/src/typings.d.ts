/**
 * Default CSS definition for typescript,
 * will be overridden with file-specific definitions by rollup
 */
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

interface SvgrComponent
  extends React.StatelessComponent<React.SVGAttributes<SVGElement>> {}

declare module '*.svg' {
  const svgUrl: string;
  const svgComponent: SvgrComponent;
  export default svgUrl;
  export { svgComponent as ReactComponent };
}

declare module '@telnyx/webrtc' {
  type TelnyxEventHandler = (...args: any[]) => void;

  export interface IClientOptions {
    login_token?: string;
    login?: string;
    password?: string;
    debug?: boolean;
    [key: string]: unknown;
  }

  export interface INotification {
    call?: unknown;
    [key: string]: unknown;
  }

  export class TelnyxRTC {
    constructor(options: IClientOptions);
    readonly connected: boolean;
    connect(): Promise<void> | void;
    disconnect(): Promise<void> | void;
    on(eventName: string, callback: TelnyxEventHandler): this;
    off(eventName: string, callback?: TelnyxEventHandler): this;
  }
}
