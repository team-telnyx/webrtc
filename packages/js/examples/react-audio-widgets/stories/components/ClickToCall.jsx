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

  const connectAndCall = () => {
    const session = new TelnyxRTC({
      login_token: token,
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

  if (mediaRef.current && call && call.remoteStream) {
    mediaRef.current.srcObject = call.remoteStream;
  }

  return (
    <div>
      {!call && (
        <button onClick={connect} disabled={registering}>
          Call {defaultDestination}
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

export default ClickToCall;
