import { useContext, useEffect } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import TelnyxClientContext from './TelnyxClientContext';

interface IProps {
  onReady?: (client: TelnyxRTC) => any;
  onError?: () => any;
  onSocketError?: () => any;
  onSocketClose?: () => any;
  onNotification?: (notification: any) => any;
}

function useEvents(props?: IProps) {
  const contextValue = useContext(TelnyxClientContext);

  useEffect(() => {
    if (!contextValue?.client) return;

    const { client } = contextValue;

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
  }, [contextValue?.client]);

  return null;
}

export default useEvents;
