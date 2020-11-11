import React from 'react';
import { Audio } from '@telnyx/react-client';

function Phone() {
  return (
    <div>
      <Audio id='remoteAudio' isRemote />
    </div>
  );
}

export default Phone;
