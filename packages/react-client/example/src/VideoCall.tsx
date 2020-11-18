import React, { useEffect, useState, useContext } from 'react';
import { Video, TelnyxRTCContext, useNotification } from '@telnyx/react-client';

function VideoCall() {
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
      video: true,
    });
  };

  const call = notification?.call;
  const callState = call?.state;

  useEffect(() => {
    console.log('callState:', callState);
  }, [callState]);

  return (
    <div>
      <strong>Video call</strong>
      <form onSubmit={handleSubmit}>
        <input
          name='destination_sip_uri'
          type='text'
          placeholder='sip:username@sip.telnyx.com'
          value={destination}
          onChange={(e: any) => setDestination(e.target.value)}
        />
        <button type='submit'>Video Call</button>
        {call && call.state !== 'destroy' && (
          <button type='button' onClick={() => call.hangup()}>
            Hangup
          </button>
        )}
      </form>

      <section>
        Local:
        <Video
          style={{
            border: '1px solid red',
          }}
          stream={call?.localStream}
        />
      </section>
      <section>
        Remote:
        <Video
          style={{
            border: '1px solid blue',
          }}
          stream={call?.remoteStream}
        />
      </section>
    </div>
  );
}

export default VideoCall;
