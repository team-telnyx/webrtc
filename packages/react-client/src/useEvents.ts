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
  const client = useContext(TelnyxClientContext);

  useEffect(() => {
    if (!client) return;

    if (props?.onReady) {
      client.on('telnyx.ready', props.onReady);
    }

    if (props?.onError) {
      client.on('telnyx.error', props.onError);
    }

    if (props?.onSocketError) {
      client.on('telnyx.socket.error', props.onSocketError);
    }

    if (props?.onSocketClose) {
      client.on('telnyx.socket.close', props.onSocketClose);
    }

    if (props?.onNotification) {
      client.on('telnyx.notification', props.onNotification);
    }
  }, [client]);

  return null;
}

export default useEvents;
