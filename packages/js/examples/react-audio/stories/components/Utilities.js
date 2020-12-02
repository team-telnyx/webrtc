import React, { useRef, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

function Utilities({ environment, username, password }) {
  const clientRef = useRef();
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState({ title: '', message: '' });

  function getListFormat({ key, label }) {
    return (
      <ul key={key}>
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
      ? results.map(({ label }, index) => getListFormat({ key: index, label }))
      : 'None';

    setLog({
      title: 'Return the device list supported by the browser',
      message: devicelist,
    });
  };

  const getDeviceResolutions = async () => {
    const webcamList = await clientRef.current.getVideoDevices();
    const deviceId = webcamList[0] ? webcamList[0].deviceId : '';
    const label = webcamList[0] ? webcamList[0].label : '';

    const results = await clientRef.current
      .getDeviceResolutions(deviceId)
      .catch((error) => console.log(error));

    const devicelist =
      results && results.length
        ? results.map(({ resolution, width, height }, index) =>
            getListFormat({
              key: index,
              label: `${resolution} - ${width}x${height}`,
            })
          )
        : 'None';

    setLog({
      title: `Return the device resolutions of webcam ${label}`,
      message: devicelist,
    });
  };

  const getMediaConstraints = () => {
    setLog({
      title: 'Current media constraints',
      message: JSON.stringify(clientRef.current.mediaConstraints),
    });
  };

  if (!clientRef.current && environment && username && password) {
    initClient();
  }

  return (
    <div>
      <section>
        <div style={{ margin: '10px 0px' }}>
          Log: {log.title} {log.message}
        </div>
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
            <button type='button' onClick={() => getDeviceResolutions()}>
              Get Device Resolutions
            </button>
          </div>

          <div>
            <button type='button' onClick={() => getMediaConstraints()}>
              Get Media Constraints
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
