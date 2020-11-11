import React from 'react';
import { Video } from '@telnyx/react-client';

function VideoCall() {
  return (
    <div>
      <section>
        Local:
        <Video
          id='localVideo'
          style={{
            backgroundColor: 'black',
          }}
        />
      </section>
      <section>
        Remote:
        <Video
          id='remoteVideo'
          isRemote
          style={{
            backgroundColor: 'blue',
          }}
        />
      </section>
    </div>
  );
}

export default VideoCall;
