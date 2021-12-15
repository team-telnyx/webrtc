import React, { useRef, useState, useEffect } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

function Utilities({ username, password, token }) {
  const clientRef = useRef();
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState({ title: '', message: '' });
  const [speakers, setSpeakers] = useState([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');

  function getListFormat({ key, label }) {
    return (
      <ul key={key}>
        <li>{label}</li>
      </ul>
    );
  }

  const initClient = () => {
    clientRef.current = new TelnyxRTC({
      login_token: token,
      login: username,
      password,
    });

    clientRef.current.on('telnyx.ready', (client) => {
      setLog({ message: 'Connected' });
    });

    clientRef.current.on('telnyx.error', (error) => {
      console.log('error:', error);
      setLog({ message: 'Received error attempting to connect' });
    });
  };

  const diconnectClient = async (client) => {
    if (client) {
      await clientRef.current.disconnect();
      clientRef.current.off('telnyx.error');
      clientRef.current.off('telnyx.ready');
      clientRef.current.off('telnyx.notification');
      clientRef.current.off('telnyx.socket.close');
    }
  };

  const connect = async () => {
    if (username && password && clientRef.current) {
      if (isConnected) {
        setIsConnected(false);
        setLog({ message: 'Reconnecting...' });

        diconnectClient();

        initClient();
      }

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

    setSpeakers(results);

    setLog({
      title: 'Audio output devices:',
      message: `${
        results.length ? results.map(({ label }) => label).join(', ') : 'None'
      }`,
    });
  };

  const setSpeaker = (speakerId) => {
    clientRef.current.speaker = speakerId;

    setLog({
      message: 'Updated speaker',
    });
  };

  const getSpeaker = () => {
    const speakerDevice =
      clientRef.current.speaker &&
      speakers.find(({ deviceId }) => deviceId === clientRef.current.speaker);

    setLog({
      title: 'Speaker:',
      message: speakerDevice ? speakerDevice.label : 'None',
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

  const setAudioSettings = async () => {
    const audioInList = await clientRef.current.getAudioInDevices();
    const deviceId = audioInList[0] ? audioInList[0].deviceId : '';
    const label = audioInList[0] ? audioInList[0].label : '';

    const settings = {
      micId: deviceId,
      micLabel: label,
      echoCancellation: true,
    };

    const results = await clientRef.current
      .setAudioSettings(settings)
      .catch((error) => console.log(error));

    setLog({
      title: (
        <span>
          Returns the audio settings applied for <b>{label}</b>
        </span>
      ),
      message: (
        <pre style={{ display: 'block', backgroundColor: '#ccc' }}>
          {JSON.stringify(results, undefined, 2)}
        </pre>
      ),
    });
  };

  const setVideoSettings = async () => {
    const videoInList = await clientRef.current.getVideoDevices();
    const deviceId = videoInList[0] ? videoInList[0].deviceId : '';
    const label = videoInList[0] ? videoInList[0].label : '';

    const settings = {
      camId: deviceId,
      camLabel: label,
      width: 1080,
      height: 720,
    };

    const results = await clientRef.current
      .setVideoSettings(settings)
      .catch((error) => console.log(error));

    setLog({
      title: (
        <span>
          Returns the video settings applied for <b>{label}</b>
        </span>
      ),
      message: (
        <pre style={{ display: 'block', backgroundColor: '#ccc' }}>
          {JSON.stringify(results, undefined, 2)}
        </pre>
      ),
    });
  };

  const getMediaConstraints = () => {
    setLog({
      title: 'Current media constraints',
      message: (
        <pre style={{ display: 'block', backgroundColor: '#ccc' }}>
          {JSON.stringify(clientRef.current.mediaConstraints, undefined, 2)}
        </pre>
      ),
    });
  };

  if (!clientRef.current && username && password) {
    initClient();
  }

  useEffect(() => {
    const getDeviceLists = async () => {
      const results = await clientRef.current.getAudioOutDevices();

      setSpeakers(results);
    };

    getDeviceLists();
  }, []);

  return (
    <div>
      <section>
        <div style={{ margin: '10px 0px' }}>
          Log: {log.title} {log.message}
        </div>
      </section>

      {clientRef.current && (
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <div>
            <button type='button' onClick={() => getAudioInDevices()}>
              Get Audio Input Devices
            </button>
          </div>

          <div>
            <label htmlFor='audioOutDevices'>Choose speaker:</label>{' '}
            <select
              id='audioOutDevices'
              onChange={(e) => setSelectedSpeakerId(e.target.value)}
            >
              {speakers.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>{' '}
            <button type='button' onClick={() => setSpeaker(selectedSpeakerId)}>
              Update
            </button>
          </div>

          <div>
            <button type='button' onClick={() => getAudioOutDevices()}>
              Get Audio Output Devices
            </button>
          </div>

          <div>
            <button type='button' onClick={() => getSpeaker()}>
              Get Speaker
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
            <button type='button' onClick={() => setAudioSettings()}>
              Set Audio Settings
            </button>
          </div>

          <div>
            <button type='button' onClick={() => setVideoSettings()}>
              Set Video Settings
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
