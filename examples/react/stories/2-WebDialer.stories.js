import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import { TelnyxRTC } from '@telnyx/webrtc';

import { withKnobs, text, boolean, number } from '@storybook/addon-knobs/react';

export default {
  title: 'WebDialer',
  decorators: [withKnobs],
};

const Container = styled.div`
  font-family: sans-serif;
  margin: 0 auto;
  text-align: center;
  max-width: fit-content;

  * {
    box-sizing: border-box;
  }
`;

const NumberInput = styled.input`
  width: 100%;
  margin-bottom: 10px;
  padding: 5px;
  font-size: 16px;
  text-align: center;
  border: 2px solid #eff1f2;
  border-radius: 4px;
  color: #5c5f64;
`;

const DialPadContainer = styled.div`
  display: grid;
  margin-bottom: 10px;
  max-width: fit-content;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(5, 1fr);
  grid-gap: 10px;
  justify-items: center;
  align-items: center;

  button {
    appearance: none;
    width: 60px;
    height: 60px;
    border: 0;
    border-radius: 50%;
    color: #5c5f64;
    font-size: 20px;

    &:disabled {
      opacity: 0.5;
    }
  }

  button span {
    display: block;
    font-size: 10px;
    text-transform: lowercase;
  }

  .CallButton,
  .EndButton {
    color: #fff;
    font-size: 16px;
  }

  .CallButton {
    background-color: #3fc08b;
  }

  .EndButton {
    background-color: #ff6666;
  }
`;

const DialPad = ({
  call,
  onDigit,
  onBackspace,
  onStartCall,
  onEndCall,
  toggleMute,
  toggleHold,
  disabled,
}) => {
  const held = call && call.isHeld;
  const muted = call && call.isMuted;
  const makeSendDigit = (x) => () => onDigit(x);

  return (
    <DialPadContainer>
      <button type='button' onClick={makeSendDigit('1')}>
        1
      </button>
      <button type='button' onClick={makeSendDigit('2')}>
        2<span>ABC</span>
      </button>
      <button type='button' onClick={makeSendDigit('3')}>
        3<span>DEF</span>
      </button>
      <button type='button' onClick={makeSendDigit('4')}>
        4<span>GHI</span>
      </button>
      <button type='button' onClick={makeSendDigit('5')}>
        5<span>JKL</span>
      </button>
      <button type='button' onClick={makeSendDigit('6')}>
        6<span>MNO</span>
      </button>
      <button type='button' onClick={makeSendDigit('7')}>
        7<span>PQRS</span>
      </button>
      <button type='button' onClick={makeSendDigit('8')}>
        8<span>TUV</span>
      </button>
      <button type='button' onClick={makeSendDigit('9')}>
        9<span>WXYZ</span>
      </button>
      <button type='button' onClick={makeSendDigit('*')}>
        *
      </button>
      <button type='button' onClick={makeSendDigit('0')}>
        0
      </button>
      <button type='button' onClick={makeSendDigit('#')}>
        #
      </button>

      {call ? (
        <button
          type='button'
          onClick={toggleMute}
          className={muted ? 'active' : ''}
        >
          <span role='img' aria-label={muted ? 'Unmute' : 'Mute'}>
            🔇
          </span>
        </button>
      ) : (
        <div />
      )}

      {call ? (
        <button type='button' onClick={onEndCall} className='EndButton'>
          End
        </button>
      ) : (
        <button
          type='button'
          onClick={onStartCall}
          className='CallButton'
          disabled={disabled}
        >
          Call
        </button>
      )}

      {call ? (
        <button
          type='button'
          onClick={toggleHold}
          className={held ? 'active' : ''}
        >
          <span role='img' aria-label={held ? 'Unhold' : 'Hold'}>
            ⏸
          </span>
        </button>
      ) : (
        <button type='button' onClick={onBackspace}>
          ⌫
        </button>
      )}
    </DialPadContainer>
  );
};

const WebDialer = ({
  environment,
  username,
  password,
  defaultDestination,
  callerName,
  callerNumber,
  host,
  port,
}) => {
  const clientRef = useRef();
  const mediaRef = useRef();
  const [registering, setRegistering] = useState();
  const [registered, setRegistered] = useState();
  const [call, setCall] = useState();
  const [destination, setDestination] = useState(defaultDestination);

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
  }, [environment, username, password, callerName, callerNumber]);

  const startCall = () => {
    const newCall = clientRef.current.newCall({
      destination,
      callerName,
      callerNumber,
    });
    setCall(newCall);
  };

  const connectAndCall = () => {
    const configsTelnyxRTC = {
      env: environment,
      credentials: {
        username,
        password,
      },
      remoteElement: () => mediaRef.current,
      useMic: true,
      useSpeaker: true,
      useCamera: false,
    };

    // These parameters comes from URL Params
    if (host && port) {
      configsTelnyxRTC['host'] = host;
      configsTelnyxRTC['port'] = port;
    }

    const newClient = new TelnyxRTC(configsTelnyxRTC)
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

  const handleDigit = (x) =>
    call ? call.dtmf(x) : setDestination(`${destination}${x}`);

  const toggleMute = () => {
    if (call.isMuted) {
      call.unmute();
    } else if (call) {
      call.mute();
    }
  };

  const toggleHold = () => {
    if (call.isHeld) {
      call.unhold();
    } else if (call) {
      call.hold();
    }
  };

  return (
    <Container>
      <audio ref={mediaRef} />

      <div>
        <NumberInput
          placeholder='Destination'
          onChange={(e) => setDestination(e.target.value)}
          value={destination}
          required
        />

        <DialPad
          call={call}
          onEndCall={hangup}
          onStartCall={connect}
          onDigit={handleDigit}
          onBackspace={() => setDestination(destination.slice(0, -1))}
          toggleMute={toggleMute}
          toggleHold={toggleHold}
          disabled={registering || destination.length === 0}
        />
      </div>

      {registering && !registered && <div>registering...</div>}

      {call && call.state}
    </Container>
  );
};

const getUrlParams = () => {
  const queryString = window.location.search;
  if (!queryString) {
    return null;
  }

  const urlParams = new URLSearchParams(queryString);

  return {
    host: urlParams.get('host') || null,
    port: urlParams.get('port') || null,
  };
};

export const Example = () => {
  const production = boolean('Production', true);
  const username = text('Connection Username', 'username');
  const password = text('Connection Password', 'password');
  const defaultDestination = text('Default Destination', '18004377950');
  const callerName = text('Caller Name', 'Caller ID Name');
  const callerNumber = text('Caller Number', 'Caller ID Number');
  let host = null;
  let port = null;
  const configs = getUrlParams();
  if (configs.host && configs.port) {
    host = text('Hostname', configs.host);
    port = text('Port', configs.port);
  }

  return (
    <WebDialer
      environment={production ? 'production' : 'development'}
      username={username}
      password={password}
      defaultDestination={defaultDestination}
      callerName={callerName}
      callerNumber={callerNumber}
      host={host}
      port={port}
    />
  );
};
