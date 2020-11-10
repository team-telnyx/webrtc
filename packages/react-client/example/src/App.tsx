import React from 'react';
import { TelnyxClientProvider } from '@telnyx/react-client';
import CallLog from './CallLog';

const App = () => {
  const credential = {
    // Create a .env file with REACT_APP_TELNYX_LOGIN_TOKEN
    // set to your On-Demand Credential Token to try this out
    // https://developers.telnyx.com/docs/v2/webrtc/quickstart
    login_token: process.env.REACT_APP_TELNYX_LOGIN_TOKEN || 'mytoken',
  };

  return (
    <TelnyxClientProvider credential={credential}>
      <CallLog />
    </TelnyxClientProvider>
  );
};

export default App;
