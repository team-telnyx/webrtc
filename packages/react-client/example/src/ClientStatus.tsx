import React, { useState } from 'react';
import { useEvents } from '@telnyx/react-client';

function ClientStatus() {
  let [error, setError] = useState<string | null>();

  useEvents({
    onReady: (e: any) => {
      console.log('e:', e);
      setError('error');
    },
    onError: (e: any) => {
      console.log('e:', e);
      setError('error');
    },
    onSocketError: () => {
      setError('error');
    },
    onSocketClose: () => {
      setError('error');
    },
  });

  return <div>{error && <p>{error}</p>}</div>;
}

export default ClientStatus;
