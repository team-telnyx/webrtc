import React, { useRef, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

function Utilities({ environment, username, password }) {
  const clientRef = useRef();
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');

  if (!clientRef.current && environment && username && password) {
    clientRef.current = new TelnyxRTC({
      env: environment,
      login: username,
      password,
    });
  }

  const connect = async () => {
    if (environment && username && password) {
      if (isConnected) {
        setIsConnected(false);
        setMessage('Reconnecting...');

        await clientRef.current.disconnect();
      }

      const session = new TelnyxRTC({
        env: environment,
        login: username,
        password,
      });

      session.on('telnyx.ready', () => {
        setIsConnected(true);
        setMessage('Connected');
      });

      session.on('telnyx.error', () => {
        setMessage('Received error attempting to connect');
      });

      await session.connect();

      clientRef.current = session;
    } else {
      setMessage('Username and Password are required');
    }
  };

  return (
    <div>
      <section>
        <div>{message && <p>{message}</p>}</div>
        <button type='button' onClick={() => connect()}>
          {isConnected ? 'Reconnect' : 'Connect'}
        </button>
      </section>
    </div>
  );
}

export default Utilities;
