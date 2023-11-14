import { useContext, useEffect } from 'react';
// @ts-ignore
import { TelnyxRTC, INotification } from '@telnyx/webrtc';
import TelnyxRTCContext from './TelnyxRTCContext';

interface IProps {
  onReady?: (client?: TelnyxRTC) => any;
  onError?: (e?: any) => any;
  onSocketError?: (e?: any) => any;
  onSocketClose?: (e?: any) => any;
  onNotification?: (e: INotification) => any;
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
  console.log('useCallbacks===>telnyxClient', telnyxClient);

  useEffect(() => {
    if (telnyxClient) {
      if (props?.onReady) {
        telnyxClient!.on('telnyx.ready', props.onReady);
      }

      if (props?.onError) {
        telnyxClient!.on('telnyx.error', props.onError);
      }

      if (props?.onSocketError) {
        telnyxClient!.on('telnyx.socket.error', props.onSocketError);
      }

      if (props?.onSocketClose) {
        telnyxClient!.on('telnyx.socket.close', props.onSocketClose);
      }

      if (props?.onNotification) {
        telnyxClient!.on('telnyx.notification', props.onNotification);
      }
    }
  }, []);

  return null;
}

export default useCallbacks;
