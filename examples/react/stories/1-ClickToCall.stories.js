import React, { useRef, useEffect, useState } from 'react';
import { withKnobs, text, boolean, number } from '@storybook/addon-knobs/react';

import { TelnyxRTC } from '@telnyx/webrtc';

export default {
  title: 'ClickToCall',
  decorators: [withKnobs],
};

const ClickToCall = ({
  environment,
  username,
  password,
  destination,
  callerName,
  callerNumber,
}) => {
  const clientRef = useRef();
  const mediaRef = useRef();
  const [registering, setRegistering] = useState();
  const [registered, setRegistered] = useState();
  const [call, setCall] = useState();
  const [isInboundCall, setIsInboundCall] = useState(false);

  const resetFromStorybookUpdate = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    setRegistered(false);
    setRegistering(false);
    setCall(null);
  };

  useEffect(() => {
    return resetFromStorybookUpdate;
  }, [username, password, destination, callerName, callerNumber]);

  const startCall = () => {
    const newCall = clientRef.current.newCall({
      callerName,
      callerNumber,
      destinationNumber: destination,
      audio: true,
      video: false,
    });
    setCall(newCall);
  };

  const connectAndCall = () => {
    const session = new TelnyxRTC({
      env: environment,
      login: username,
      password: password,
      ringFile: './sounds/incoming_call.mp3',
    });
    session.on('telnyx.socket.open', (call) => {
      console.log('telnyx.socket.open', call);
    });
    session.on('telnyx.ready', (session) => {
      console.log('telnyx.ready', session);
      setRegistered(true);
      setRegistering(false);

      startCall();
    });
    session.on('telnyx.error', (error) => {
      console.log('telnyx.error', error);
      alert(error.message);
    });

    session.on('telnyx.socket.error', (error) => {
      console.log('telnyx.socket.error', error);
      session.disconnect();
    });

    session.on('telnyx.socket.close', (error) => {
      console.log('telnyx.socket.close', error);
      session.disconnect();
    });

    session.on('telnyx.notification', (notification) => {
      console.log('telnyx.notification', notification);

      switch (notification.type) {
        case 'callUpdate':
          if (
            notification.call.state === 'hangup' ||
            notification.call.state === 'destroy'
          ) {
            setIsInboundCall(false);
            return setCall(null);
          }
          if (notification.call.state === 'active') {
            setIsInboundCall(false);
            return setCall(notification.call);
          }
          if (notification.call.state === 'ringing') {
            setIsInboundCall(true);
            return setCall(notification.call);
          }
          break;
      }
    });

    setRegistering(true);
    clientRef.current = session;
    clientRef.current.connect();
  };

  const connect = () => {
    if (registered) {
      startCall();
    } else {
      connectAndCall();
    }
  };

  const hangup = () => {
    call.hangup();
  };

  return (
    <div>
      {!call && (
        <button onClick={connect} disabled={registering}>
          Call
        </button>
      )}

      {registering && !registered && <div>registering...</div>}

      {call && (
        <div>
          <div>
            <button onClick={hangup}>End Call</button>
          </div>

          <div>{call.state}</div>
        </div>
      )}

      <audio
        id='dialogAudio'
        autoPlay='autoplay'
        controls={false}
        ref={mediaRef}
      />
    </div>
  );
};

export const Example = () => {
  const production = boolean('Production', true);
  const username = text('Connection Username', 'username');
  const password = text('Connection Password', 'password');
  const destination = text('Destination', '18004377950');
  const callerName = text('Caller Name', 'Caller ID Name');
  const callerNumber = text('Caller Number', 'Caller ID Number');

  return (
    <ClickToCall
      username={username}
      password={password}
      destination={destination}
      callerName={callerName}
      callerNumber={callerNumber}
      environment={production ? 'production' : 'development'}
    />
  );
};
