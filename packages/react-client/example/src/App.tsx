import React, { useState, useEffect } from 'react';
import { useTelnyxClient } from '@telnyx/react-client';

const App = () => {
  let [clientStateLog, setClientStateLog] = useState<
    { name: string; ts: number }[]
  >([]);
  const { client, call, clientState } = useTelnyxClient({
    loginToken: 'mytoken',
  });

  useEffect(() => {
    console.log('client:', client);
  }, [client]);

  useEffect(() => {
    console.log('call:', call);
  }, [call]);

  useEffect(() => {
    if (!clientState) return;

    setClientStateLog([
      ...clientStateLog,
      {
        name: clientState,
        ts: Date.now(),
      },
    ]);
  }, [clientState]);

  return (
    <div>
      <ol>
        {clientStateLog.map((loggedState) => (
          <li key={loggedState.ts}>{loggedState.name}</li>
        ))}
      </ol>
    </div>
  );
};

export default App;
