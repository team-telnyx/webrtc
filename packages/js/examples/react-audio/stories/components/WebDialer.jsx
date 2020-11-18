import React, { useRef, useEffect, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import PropTypes from 'prop-types';
import DialPad from './DialPad';

import { Container, NumberInput } from './styles';

const WebDialer = ({
  environment,
  username,
  password,
  defaultDestination,
  callerName,
  callerNumber,
  disableMicrophone,
}) => {
  const clientRef = useRef();
  const mediaRef = useRef();
  const [registering, setRegistering] = useState();
  const [registered, setRegistered] = useState();
  const [call, setCall] = useState();
  const [destination, setDestination] = useState(defaultDestination);
  const [isInboundCall, setIsInboundCall] = useState(false);
  const [isMute, setIsMute] = useState(false);
  const [isHold, setIsHold] = useState(false);
  const [statusCall, setStatusCall] = useState('');

  const resetFromStorybookUpdate = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    setRegistered(false);
    setRegistering(false);
    setCall(null);
  };

  useEffect(() => resetFromStorybookUpdate, [
    environment,
    username,
    password,
    callerName,
    callerNumber,
  ]);

  const startCall = () => {
    const newCall = clientRef.current.newCall({
      callerName,
      callerNumber,
      destinationNumber: destination,
      // audio: true,
      // FIXME Either audio or video must be true or the call
      // will be stuck on "new". Enabling video for now so that
      // we can test disabling the audio with Storybook Knobs
      video: true,
    });

    setCall(newCall);
  };

  useEffect(() => {
    if (!registered || !clientRef.current) return;

    if (disableMicrophone) {
      clientRef.current.disableMicrophone();
    } else {
      clientRef.current.enableMicrophone();
    }
  }, [registered, disableMicrophone]);

  const connectAndCall = () => {
    const session = new TelnyxRTC({
      env: environment,
      login: username,
      password,
      ringtoneFile: './sounds/incoming_call.mp3',
      // Used when the "Generate Ringback Tone" option is disabled
      ringbackFile: './sounds/ringback_tone.mp3',
    });
    session.on('telnyx.socket.open', (event) => {
      console.log('telnyx.socket.open', event);
    });
    session.on('telnyx.ready', (event) => {
      console.log('telnyx.ready', event);
      setRegistered(true);
      setRegistering(false);

      startCall();
    });
    session.on('telnyx.error', (error) => {
      console.error('telnyx.error', error);
      setRegistered(false);
      setRegistering(false);
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
          setStatusCall(notification.call.state);
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
        default:
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
    if (call) {
      setIsMute(!isMute);
      call.toggleAudioMute();
    }
  };

  const toggleHold = () => {
    if (call) {
      setIsHold(!isHold);
      call.toggleHold();
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
          isMute={isMute}
          isHold={isHold}
          disabled={registering || destination.length === 0}
        />
      </div>

      {registering && !registered && <div>registering...</div>}

      {statusCall}
    </Container>
  );
};

WebDialer.propTypes = {
  environment: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  defaultDestination: PropTypes.string.isRequired,
  callerName: PropTypes.string.isRequired,
  callerNumber: PropTypes.string.isRequired,
};

export default WebDialer;
