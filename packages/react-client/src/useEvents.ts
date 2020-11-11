import { useContext, useEffect } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import TelnyxClientContext from './TelnyxClientContext';

interface IProps {
  onReady?: (client?: TelnyxRTC) => any;
  onError?: (e?: any) => any;
  onSocketError?: (e?: any) => any;
  onSocketClose?: (e?: any) => any;
  onNotification?: (e?: any) => any;
}

function useEvents(props?: IProps) {
  const telnyxClient = useContext(TelnyxClientContext);

  useEffect(() => {
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
  }, []);

  return null;
}

export default useEvents;
