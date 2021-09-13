import React, { useRef, useEffect, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import PropTypes from 'prop-types';
import DialPad from './DialPad';

import { Container, NumberInput } from './styles';

const WebDialer = ({
  username,
  password,
  token,
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
  const [isDeaf, setIsDeaf] = useState(false);

  // exposing data for Cypress
  React.useEffect(() => {
    // global is `window`
    if (window.Cypress) {
      window.appReady = true;
      global.storyData = {
        username,
        password,
        defaultDestination: destination,
        callerName,
        callerNumber,
      };
    }
  }, [username, password, defaultDestination, callerName, callerNumber]);

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
      // NOTE Either audio or video must be true or the call
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

  const detachListeners = (client) => {
    if (client) {
      client.off('telnyx.error');
      client.off('telnyx.ready');
      client.off('telnyx.notification');
      client.off('telnyx.socket.close');
    }
  };

  const connectAndCall = () => {
    const session = new TelnyxRTC({
      login_token: token,
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
      session.disconnect();
      detachListeners(session);
    });

    session.on('telnyx.socket.error', (error) => {
      console.log('telnyx.socket.error', error);
      session.disconnect();
      detachListeners(session);
    });

    session.on('telnyx.socket.close', (error) => {
      console.log('telnyx.socket.close', error);
      session.disconnect();
      detachListeners(session);
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

  const handleDigit = (x) => {
    if (call) {
      call.dtmf(x);
    }
    setDestination(`${destination}${x}`);
  };

  const toggleMute = () => {
    if (call) {
      if (isMute) {
        call.unmuteAudio();
      } else {
        call.muteAudio();
      }
      // Alternatively, use `toggleAudioMute`:
      // call.toggleAudioMute();

      setIsMute(!isMute);
    }
  };

  const toggleHold = async () => {
    if (call) {
      if (isHold) {
        await call.unhold();
      } else {
        await call.hold();
      }
      // Alternatively, use `toggleHold`:
      // await call.toggleHold();

      setIsHold(call.state === 'held');
    }
  };

  const toggleDeaf = () => {
    if (call) {
      setIsDeaf(!isDeaf);
      call.toggleDeaf();
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

      <div data-testid='webdialer'>
        <NumberInput
          data-testid='input-destination'
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
          toggleDeaf={toggleDeaf}
          toggleMute={toggleMute}
          toggleHold={toggleHold}
          isMute={isMute}
          isHold={isHold}
          isDeaf={isDeaf}
          disabled={registering || destination.length === 0}
        />
      </div>

      {registering && !registered && <div>registering...</div>}

      <div data-testid={`state-call-${statusCall}`}>{statusCall}</div>
    </Container>
  );
};

WebDialer.propTypes = {
  username: PropTypes.string,
  password: PropTypes.string,
  token: PropTypes.string,
  defaultDestination: PropTypes.string.isRequired,
  callerName: PropTypes.string.isRequired,
  callerNumber: PropTypes.string.isRequired,
};

export default WebDialer;
