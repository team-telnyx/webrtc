import React from 'react';

import Utilities from './components/Utilities';

export default {
  title: 'Utilities',
  args: {
    callerName: 'Caller ID Name',
    callerNumber: 'Caller ID Number',
    username: process.env.STORYBOOK_USERNAME,
    password: process.env.STORYBOOK_PASSWORD,
    defaultDestination: process.env.STORYBOOK_DESTINATION || '18004377950',
  },
};

export const Examples = (args, storybook) => (
  <Utilities {...args} {...storybook.globals.telnyxAuth} />
);
