import React from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import AuthForm from './components/auth/AuthForm';
import { getLoginParams, setLoginParams } from './helpers';
import Phone from './components/phone/Phone';

import './App.css';

function App() {
  const [state, setState] = React.useState({ connected: false, call: null });
  const [enabledVideo, setEnableVideo] = React.useState(true);

  const telnyxRTCRef = React.useRef(null);

  React.useEffect(() => {
    const tmp = getLoginParams();
    const { login, password } = tmp;
    if (login && password) {
      disconnect();
      connect(tmp);
    }

    return function clean() {
      disconnect();
    };
  }, []);

  React.useEffect(() => {
    if (!state.connected || !telnyxRTCRef.current) return;

    if (enabledVideo) {
      telnyxRTCRef.current.enableWebcam();
    } else {
      telnyxRTCRef.current.disableWebcam();
    }
  }, [state.connected, enabledVideo]);

  function disconnect() {
    if (telnyxRTCRef.current) {
      telnyxRTCRef.current.disconnect();
    }
  }

  function detachListeners(client){
    if(client) {
      client.off('telnyx.error');
      client.off('telnyx.ready');
      client.off('telnyx.notification');
      client.off('telnyx.socket.close');
    }
  }

  function connect(params) {
    setLoginParams(params);

    const session = new TelnyxRTC({ ...params });
    session.enableMicrophone();

    session.on('telnyx.ready', (session) => {
      setState({ connected: true });
    });

    session.on('telnyx.error', (error) => {
      alert(error.message);
      session.disconnect();
      detachListeners(session);
    });

    session.on('telnyx.socket.error', (error) => {
      setState({ connected: false });
      session.disconnect();
      detachListeners(session);
    });

    session.on('telnyx.socket.close', (error) => {
      console.log('close', error);
      setState({ connected: false });
      session.disconnect();
      detachListeners(session);
    });

    session.on('telnyx.notification', (notification) => {
      console.log('notification', notification);

      switch (notification.type) {
        case 'callUpdate':
          if (
            notification.call.state === 'hangup' ||
            notification.call.state === 'destroy'
          ) {
            return setState({ connected: true, call: null });
          }
          if (notification.call.state === 'active') {
            return setState({ connected: true, call: notification.call });
          }
          if (notification.call.state === 'ringing') {
            return setState({ connected: true, call: notification.call });
          }
          break;
        case 'participantData':
          // Caller's data like name and number to update the UI. In case of a conference call you will get the name of the room and the extension.
          break;
        case 'userMediaError':
          // Permission denied or invalid audio/video params on `getUserMedia`
          break;
        default:
      }
    });

    telnyxRTCRef.current = session;
    telnyxRTCRef.current.connect();
  }

  function newCall(extension) {
    if (telnyxRTCRef.current) {
      const newCall = telnyxRTCRef.current.newCall({
        destinationNumber: extension,
        audio: true,
      });
      setState({ call: newCall, connected: state.connected });
    }
  }

  function handleEnableVideo(event) {
    setEnableVideo(event.target.checked);
  }

  const { connected, call } = state;

  const Main = () => {
    if (connected) {
      return (
        <Phone session={telnyxRTCRef.current} dialog={call} newCall={newCall} />
      );
    } else {
      return <AuthForm connect={connect} />;
    }
  };

  return (
    <div className='App flex'>
      <header>
        <h1>Telnyx Video Call Demo</h1>
      </header>
      <main className='flex flex-center'>
        <Main />
        <div>
          <input
            id='enabledVideo'
            name='enabledVideo'
            type='checkbox'
            checked={enabledVideo}
            onChange={(event) => handleEnableVideo(event)}
          ></input>
          <label htmlFor='enabledVideo'>Enable video</label>
        </div>
      </main>
      <footer>
        <h2>{`Telnyx - ${new Date().getFullYear()}`}</h2>
      </footer>
    </div>
  );
}

export default App;
