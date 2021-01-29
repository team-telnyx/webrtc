import React from 'react';

import ClickToCallComponent from './components/ClickToCall';
import WebDialerComponent from './components/WebDialer';

export default {
  title: 'Audio',
  args: {
    callerName: 'Caller ID Name',
    callerNumber: 'Caller ID Number',
    disableMicrophone: false,
    username: process.env.STORYBOOK_USERNAME,
    password: process.env.STORYBOOK_PASSWORD,
    defaultDestination: process.env.STORYBOOK_DESTINATION || '18004377950',
  },
};

export const ClickToCall = (args, storybook) => (
  <ClickToCallComponent {...storybook.globals.telnyxAuth} {...args} />
);
export const WebDialer = (args, storybook) => (
  <WebDialerComponent {...storybook.globals.telnyxAuth} {...args} />
);
