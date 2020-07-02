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

const ButtonAnswer = styled.button`
  color: #fff !important;
  border-radius: 50%;
  width: 80px !important;
  height: 80px !important;
  background-color: #1ea7fd;
  cursor: pointer;
`;

const ButtonEnd = styled.button`
  cursor: pointer;
  color: #fff !important;
  border-radius: 50%;
  width: 80px !important;
  height: 80px !important;
  background-color: #ff6666;
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
  isIncomingCall,
}) => {
  const held = call && call.isHeld;
  const muted = call && call.isMuted;
  const makeSendDigit = (x) => () => onDigit(x);

  const answerCall = async () => {
    if (call) {
      call.answer();
    }
  };

  const hangup = () => {
    call.hangup();
  };

  return (
    <DialPadContainer>
      {isIncomingCall ? (
        <React.Fragment>
          <ButtonAnswer type='button' onClick={answerCall}>
            Answer
          </ButtonAnswer>

          <div />

          <ButtonEnd type='button' onClick={hangup}>
            Reject
          </ButtonEnd>
        </React.Fragment>
      ) : (
        <React.Fragment>
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
        </React.Fragment>
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
}) => {
  const clientRef = useRef();
  const mediaRef = useRef();
  const [registering, setRegistering] = useState();
  const [registered, setRegistered] = useState();
  const [call, setCall] = useState();
  const [destination, setDestination] = useState(defaultDestination);
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
  }, [environment, username, password, callerName, callerNumber]);

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

  if (mediaRef.current && call && call.remoteStream) {
    mediaRef.current.srcObject = call.remoteStream;
  }

  return (
    <Container>
      <audio
        ref={mediaRef}
        id='dialogAudio'
        autoPlay='autoplay'
        controls={false}
      ></audio>

      <div>
        <NumberInput
          placeholder='Destination'
          onChange={(e) => setDestination(e.target.value)}
          value={destination}
          required
        />

        <DialPad
          isIncomingCall={isInboundCall}
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

export const Example = () => {
  const production = boolean('Production', true);
  const username = text('Connection Username', 'username');
  const password = text('Connection Password', 'password');
  const callerName = text('Caller Name', 'Caller ID Name');
  const callerNumber = text('Caller Number', 'Caller ID Number');

  return (
    <WebDialer
      environment={production ? 'production' : 'development'}
      username={username}
      password={password}
      defaultDestination='18004377950'
      callerName={callerName}
      callerNumber={callerNumber}
    />
  );
};
