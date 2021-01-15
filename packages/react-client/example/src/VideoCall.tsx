import React, { useEffect, useState, useContext } from 'react';
import { Video, TelnyxRTCContext, useNotification } from '@telnyx/react-client';

const videoLabelStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  opacity: 0.3,
  fontSize: '2em',
} as any;

const remoteVideoWrapperStyle = {
  position: 'relative',
  backgroundColor: '#ccc',
  width: '100%',
  height: '100%',
} as any;

const localVideoWrapperStyle = {
  position: 'absolute',
  top: 10,
  right: 10,
  width: 240,
  height: 113,
  backgroundColor: '#ddd',
} as any;

const videoStyle = {
  objectFit: 'contain',
  width: '100%',
  height: '100%',
};

function VideoCall() {
  const client = useContext(TelnyxRTCContext);
  const notification = useNotification();
  const [destination, setDestination] = useState('');
  const handleSubmit = (e: any) => {
    e.preventDefault();

    try {
      const call = client?.newCall({
        destinationNumber: destination,
        callerName: process.env.REACT_APP_TELNYX_PHONE_NUMBER || '',
        callerNumber: process.env.REACT_APP_TELNYX_PHONE_NUMBER || '',
        audio: true,
        video: true,
      });

      console.log('newCall: ', call);
    } catch (err) {
      console.error(err);
    }
  };

  const call = notification?.call;
  const callState = call?.state;

  useEffect(() => {
    console.log('video callState:', callState);
  }, [callState]);

  return (
    <div>
      <div style={{ marginTop: 20, marginBottom: 20 }}>
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
      </div>

      <div style={{ position: 'relative', width: 960, height: 450 }}>
        <section style={remoteVideoWrapperStyle}>
          <div style={videoLabelStyle}>Remote video</div>
          <Video
            style={{
              ...videoStyle,
              boxShadow: 'inset 0 0 0 2px blue',
            }}
            stream={call?.remoteStream}
          />
        </section>

        <section style={localVideoWrapperStyle}>
          <div style={videoLabelStyle}>Local</div>
          <Video
            style={{
              ...videoStyle,
              boxShadow: 'inset 0 0 0 2px yellow',
            }}
            stream={call?.localStream}
            // Prevent echo from your own video:
            muted
          />
        </section>
      </div>
    </div>
  );
}

export default VideoCall;
