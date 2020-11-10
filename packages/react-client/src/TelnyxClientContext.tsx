import React from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

const TelnyxClientContext = React.createContext<{
  client: TelnyxRTC | null;
  isReady: boolean;
} | null>(null);

export default TelnyxClientContext;
