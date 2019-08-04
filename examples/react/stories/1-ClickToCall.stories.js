import React, { useRef, useEffect, useState } from 'react';
import { withKnobs, text, boolean, number } from '@storybook/addon-knobs/react';

import { TelnyxRTC } from 'telnyx-rtc';

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
      destination,
      callerName,
      callerNumber,
    });
    setCall(newCall);
  };

  const connectAndCall = () => {
    const newClient = new TelnyxRTC({
      env: environment,
      credentials: {
        username,
        password,
      },
      remoteElement: () => mediaRef.current,
      useMic: true,
      useSpeaker: true,
      useCamera: false,
    })
      .on('registered', () => {
        setRegistered(true);
        setRegistering(false);

        startCall();
      })
      .on('unregistered', () => {
        setRegistered(false);
        setRegistering(false);
      })
      .on('callUpdate', (call) => {
        if (call.state === 'done') {
          setCall(null);
        } else {
          setCall(call);
        }
      });

    clientRef.current = newClient;
    setRegistering(true);
    newClient.connect();
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

  const mute = () => {
    call.mute();
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
            {/* <button onClick={mute}>Mute</button> */}
          </div>

          <div>{call.state}</div>
        </div>
      )}

      <audio ref={mediaRef} />
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
