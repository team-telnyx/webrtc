import React, { useState } from 'react';
import { useCallbacks } from '@telnyx/react-client';

function ClientStatus() {
  let [clientStatus, setClientStatus] = useState<string>('');

  useCallbacks({
    onReady: () => {
      setClientStatus('Ready to make and receive calls');
    },
    onError: (e: any) => {
      setClientStatus(e?.message || 'Cannot make or receive calls');
    },
    onSocketError: () => {
      setClientStatus('Cannot make or receive calls');
    },
  });

  return <p>{clientStatus}</p>;
}

export default ClientStatus;
