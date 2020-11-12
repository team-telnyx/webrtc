import React, { useEffect, useState, useContext } from 'react';
import { Audio, TelnyxRTCContext, useNotification } from '@telnyx/react-client';

function Phone() {
  const client = useContext(TelnyxRTCContext);
  const notification = useNotification();
  const [destination, setDestination] = useState('');
  const handleSubmit = (e: any) => {
    e.preventDefault();

    client?.newCall({
      destinationNumber: destination,
      callerName: process.env.REACT_APP_TELNYX_PHONE_NUMBER || '',
      callerNumber: process.env.REACT_APP_TELNYX_PHONE_NUMBER || '',
      remoteCallerName: '',
      remoteCallerNumber: '',
      audio: true,
      video: false,
    });
  };

  const call = notification?.call;
  const callState = call?.state;
  const callStream = call?.remoteStream;

  useEffect(() => {
    console.log('callState:', callState);
  }, [callState]);

  return (
    <div>
      <strong>Audio-only call</strong>
      <form onSubmit={handleSubmit}>
        <input
          name='destination_phone_number'
          type='tel'
          placeholder='1-555-123-4567'
          value={destination}
          onChange={(e: any) => setDestination(e.target.value)}
        />
        <button type='submit'>Call</button>
        {call && call.state !== 'destroy' && (
          <button type='button' onClick={() => call.hangup()}>
            Hangup
          </button>
        )}
      </form>

      <Audio stream={callStream} />
    </div>
  );
}

export default Phone;
