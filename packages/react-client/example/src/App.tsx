import React, { useState } from 'react';
import { TelnyxRTCProvider } from '@telnyx/react-client';
import ClientStatus from './ClientStatus';
import CallLog from './CallLog';
import Phone from './Phone';
import VideoCall from './VideoCall';

const App = () => {
  const [isAudioOnly, setIsAudioOnly] = useState<boolean>(false);
  const credential = {
    // Create a .env file with REACT_APP_TELNYX_LOGIN_TOKEN
    // set to your On-Demand Credential Token to try this out
    // https://developers.telnyx.com/docs/v2/webrtc/quickstart
    login_token: process.env.REACT_APP_TELNYX_LOGIN_TOKEN || 'mytoken',
  };

  return (
    <TelnyxRTCProvider credential={credential}>
      <ClientStatus />
      <CallLog />

      <div>
        <label>
          <input
            type='checkbox'
            checked={isAudioOnly}
            onChange={(e) => setIsAudioOnly(e.target.checked)}
          />
          Audio-only call
        </label>

        {isAudioOnly ? <Phone /> : <VideoCall />}
      </div>
    </TelnyxRTCProvider>
  );
};

export default App;
