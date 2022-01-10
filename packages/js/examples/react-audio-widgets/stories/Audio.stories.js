import React from 'react';

import ClickToCallComponent from './components/ClickToCall';
import WebDialerComponent from './components/WebDialer';

export default {
  title: 'Audio',
};

export const ClickToCall = (args, storybook) => (
  <ClickToCallComponent {...args} {...storybook.globals.telnyxAuth} />
);

ClickToCall.args = {
  token: 'JWT_TOKEN',
  callerName: 'Caller ID Name',
  callerNumber: 'Caller ID Number',
  username: process.env.STORYBOOK_USERNAME,
  password: process.env.STORYBOOK_PASSWORD,
  defaultDestination: process.env.STORYBOOK_DESTINATION || '18004377950',
};

export const WebDialer = (args, storybook) => (
  <WebDialerComponent {...args} {...storybook.globals.telnyxAuth} />
);

WebDialer.args = {
  token: 'JWT_TOKEN',
  callerName: 'Caller ID Name',
  callerNumber: 'Caller ID Number',
  disableMicrophone: false,
  username: process.env.STORYBOOK_USERNAME,
  password: process.env.STORYBOOK_PASSWORD,
  defaultDestination: process.env.STORYBOOK_DESTINATION || '18004377950',
};
