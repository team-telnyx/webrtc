import React, { useRef, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

function Utilities({ environment, username, password }) {
  const clientRef = useRef();
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');

  const initClient = () => {
    clientRef.current = new TelnyxRTC({
      env: environment,
      login: username,
      password,
    });
  };

  const connect = async () => {
    if (environment && username && password) {
      if (isConnected) {
        setIsConnected(false);
        setMessage('Reconnecting...');

        await clientRef.current.disconnect();
      }

      initClient();

      clientRef.current.on('telnyx.ready', () => {
        setIsConnected(true);
        setMessage('Connected');
      });

      clientRef.current.on('telnyx.error', () => {
        setMessage('Received error attempting to connect');
      });

      clientRef.current.connect();
    } else {
      setMessage('Username and Password are required');
    }
  };

  const getAudioInDevices = async () => {
    const results = await clientRef.current.getAudioInDevices();

    setMessage(
      `Audio input devices: ${
        results.length ? results.map(({ label }) => label).join(', ') : 'None'
      }`
    );
  };

  const getAudioOutDevices = async () => {
    const results = await clientRef.current.getAudioOutDevices();

    setMessage(
      `Audio output devices: ${
        results.length ? results.map(({ label }) => label).join(', ') : 'None'
      }`
    );
  };

  if (!clientRef.current && environment && username && password) {
    initClient();
  }

  return (
    <div>
      <section>
        <p>Log: {message}</p>
      </section>

      {clientRef.current && (
        <section>
          <div>
            <button type='button' onClick={() => getAudioInDevices()}>
              Get Audio Input Devices
            </button>
          </div>

          <div>
            <button type='button' onClick={() => getAudioOutDevices()}>
              Get Audio Output Devices
            </button>
          </div>

          <div>
            <button type='button' onClick={() => connect()}>
              {isConnected ? 'Reconnect' : 'Connect'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default Utilities;
