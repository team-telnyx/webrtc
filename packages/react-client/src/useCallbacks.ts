import { useContext, useEffect } from 'react';
import { TelnyxRTC, INotification, ITelnyxWarningEvent } from '@telnyx/webrtc';
import TelnyxRTCContext from './TelnyxRTCContext';

interface IProps {
  onReady?: (client?: TelnyxRTC) => any;
  onError?: (e?: any) => any;
  onSocketError?: (e?: any) => any;
  onSocketClose?: (e?: any) => any;
  onNotification?: (e: INotification) => any;
  onWarning?: (e: ITelnyxWarningEvent) => any;
}

/**
 * Specify callbacks for Telnyx client event handlers
 *
 * ## Examples
 * ```jsx
 * import { useCallbacks } from '@telnyx/react-client';
 *
 * function Phone() {
 *   useCallbacks({
 *     onReady: () => console.log('client ready'),
 *     onError: () => console.log('client registration error'),
 *     onNotification: (x) => console.log('received notification:', x),
 *   });
 *
 *   // ...
 * }
 * ```
 */
function useCallbacks(props?: IProps): null {
  const telnyxClient = useContext(TelnyxRTCContext);
  const {
    onReady,
    onError,
    onNotification,
    onSocketError,
    onSocketClose,
    onWarning,
  } = props || {};

  useEffect(() => {
    if (!telnyxClient) return;

    const callbacks: [string, ((event: any) => any) | undefined][] = [
      ['telnyx.ready', onReady],
      ['telnyx.error', onError],
      ['telnyx.notification', onNotification],
      ['telnyx.socket.error', onSocketError],
      ['telnyx.socket.close', onSocketClose],
      ['telnyx.warning', onWarning],
    ];
    const unsubscribe = callbacks.map(([event, callback]) => {
      if (!callback) return () => {};
      // Each hook owns a distinct handler, even if consumers share a callback.
      const handler = (value: any) => callback(value);
      telnyxClient.on(event, handler);
      return () => {
        telnyxClient.off(event, handler);
      };
    });

    return () => {
      unsubscribe.forEach((off) => off());
    };
  }, [
    telnyxClient,
    onReady,
    onError,
    onNotification,
    onSocketError,
    onSocketClose,
    onWarning,
  ]);

  return null;
}

export default useCallbacks;
