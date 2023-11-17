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

import '@telnyx/webrtc';
declare module '@telnyx/webrtc' {
  export interface TelnyxRTC {
    on(eventName: string, callback: any): void;
  }
  export interface IClientOptions {}
  export interface INotification {}
}

export * from '@telnyx/webrtc';
