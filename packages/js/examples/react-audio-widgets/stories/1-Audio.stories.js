import React from 'react';

import ClickToCallComponent from './components/ClickToCall';
import WebDialerComponent from './components/WebDialer';

export default {
  title: 'Audio',
  args: {
    defaultDestination: '18004377950',
    callerName: 'Caller ID Name',
    callerNumber: 'Caller ID Number',
    disableMicrophone: false,
  },
};

export const ClickToCall = (args, storybook) => (
  <ClickToCallComponent {...storybook.globals.telnyxAuth} {...args} />
);
export const WebDialer = (args, storybook) => (
  <WebDialerComponent {...storybook.globals.telnyxAuth} {...args} />
);
