import React, { useRef, useEffect, useState } from 'react';

import { TelnyxRTC } from '@telnyx/webrtc';

const ClickToCall = ({
  username,
  password,
  token,
  defaultDestination,
  callerName,
  callerNumber,
}) => {
  const clientRef = useRef();
  const mediaRef = useRef();
  const [registering, setRegistering] = useState();
  const [registered, setRegistered] = useState();
  const [call, setCall] = useState();
  const [isInboundCall, setIsInboundCall] = useState(false);
  const [status, setStatus] = useState('disconnected');

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
  }, [username, password, defaultDestination, callerName, callerNumber]);

  // exposing data for Cypress
  React.useEffect(() => {
    // global is `window`
    if (window.Cypress) {
      window.appReady = true;
      global.storyData = {
        username,
        password,
        defaultDestination,
        callerName,
        callerNumber,
      };
    }
  }, [username, password, defaultDestination, callerName, callerNumber]);

  const startCall = () => {
    const newCall = clientRef.current.newCall({
      callerName,
      callerNumber,
      destinationNumber: defaultDestination,
      audio: true,
      video: false,
    });
    setCall(newCall);
  };

  function detachListeners(client) {
    if (client) {
      client.off('telnyx.error');
      client.off('telnyx.ready');
      client.off('telnyx.notification');
      client.off('telnyx.socket.close');
    }
  }

  const connectAndCall = () => {
    const session = new TelnyxRTC({
      login_token: token,
      login: username,
      password,
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
          setStatus(notification.call.state);
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

  if (mediaRef.current && call && call.remoteStream) {
    mediaRef.current.srcObject = call.remoteStream;
  }

  return (
    <div>
      {!call && (
        <button data-testid='btn-call' onClick={connect} disabled={registering}>
          Call {defaultDestination}
        </button>
      )}

      {registering && !registered && (
        <div data-testid='state-call-registering'>registering...</div>
      )}

      {call && (
        <div>
          <div>
            <button data-testid='btn-end-call' onClick={hangup}>
              End Call
            </button>
          </div>
          <div data-testid={`state-call-${status}`}>{status}</div>
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

export default ClickToCall;
