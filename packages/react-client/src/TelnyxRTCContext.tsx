import React from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

const TelnyxRTCContext = React.createContext<TelnyxRTC | null>(null);

export default TelnyxRTCContext;
