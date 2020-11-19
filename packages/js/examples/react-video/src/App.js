import React from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import AuthForm from './components/auth/AuthForm';
import { getLoginParams, setLoginParams } from './helpers';
import Phone from './components/phone/Phone';

import './App.css';

function App() {
  const [state, setState] = React.useState({ connected: false, call: null });
  const telnyxRTCRef = React.useRef(null);

  React.useEffect(() => {
    const tmp = getLoginParams();
    const { login, password } = tmp;
    if (login && password) {
      connect(tmp);
    }

    return function clean() {
      if (telnyxRTCRef.current) {
        telnyxRTCRef.current.disconnect();
      }
    };
  }, []);

  function connect(params) {
    setLoginParams(params);

    const session = new TelnyxRTC({ ...params });
    session.enableMicrophone();
    session.enableWebcam();

    session.on('telnyx.ready', (session) => {
      console.log('Oiiiiii', session);
      setState({ connected: true });
    });
    session.on('telnyx.error', (error) => {
      alert(error.message);
    });

    session.on('telnyx.socket.error', (error) => {
      setState({ connected: false });
      session.disconnect();
    });

    session.on('telnyx.socket.close', (error) => {
      console.log('close', error);
      setState({ connected: false });
      session.disconnect();
    });

    session.on('telnyx.notification', (notification) => {
      console.log('notification', notification);

      switch (notification.type) {
        case 'callUpdate':
          console.log('notification ---> call.state', notification.call.state);
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
        video: true,
      });
      console.log('newCall', newCall);
      setState({ call: newCall, connected: state.connected });
    }
  }

  console.log('state=====>', state);
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
      </main>
      <footer>
        <h2>Telnyx - 2020</h2>
      </footer>
    </div>
  );
}

export default App;
