import React from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

const TelnyxClientContext = React.createContext<TelnyxRTC | null>(null);

export default TelnyxClientContext;
