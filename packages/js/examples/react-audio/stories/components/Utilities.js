import React, { useRef, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

function Utilities({ environment, username, password }) {
  const clientRef = useRef();
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState({ title: '', message: '' });

  function getListFormat(label) {
    return (
      <ul>
        <li>{label}</li>
      </ul>
    );
  }

  const initClient = () => {
    clientRef.current = new TelnyxRTC({
      env: environment,
      login: username,
      password,
    });
  };

  const connect = async () => {
    if (environment && username && password && clientRef.current) {
      if (isConnected) {
        setIsConnected(false);
        setLog({ message: 'Reconnecting...' });

        await clientRef.current.disconnect();
      }

      initClient();

      clientRef.current.on('telnyx.ready', () => {
        setIsConnected(true);
        setLog({ message: 'Connected' });
      });

      clientRef.current.on('telnyx.error', () => {
        setLog({ message: 'Received error attempting to connect' });
      });

      clientRef.current.connect();
    } else {
      setLog({ message: 'Username and Password are required' });
    }
  };

  const getAudioInDevices = async () => {
    const results = await clientRef.current.getAudioInDevices();

    setLog({
      title: 'Audio input devices:',
      message: `${
        results.length ? results.map(({ label }) => label).join(', ') : 'None'
      }`,
    });
  };

  const getAudioOutDevices = async () => {
    const results = await clientRef.current.getAudioOutDevices();

    setLog({
      title: 'Audio output devices:',
      message: `${
        results.length ? results.map(({ label }) => label).join(', ') : 'None'
      }`,
    });
  };

  const getDevices = async () => {
    const results = await clientRef.current.getDevices();

    const devicelist = results.length
      ? results.map(({ label }) => getListFormat(label))
      : 'None';

    setLog({
      title: 'Return the device list supported by the browser',
      message: devicelist,
    });
  };

  if (!clientRef.current && environment && username && password) {
    initClient();
  }

  return (
    <div>
      <section>
        <p>
          Log: {log.title} {log.message}
        </p>
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
            <button type='button' onClick={() => getDevices()}>
              Get Device List
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
