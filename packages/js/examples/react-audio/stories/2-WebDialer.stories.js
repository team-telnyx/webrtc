import React from 'react';

import { withKnobs, text, boolean } from '@storybook/addon-knobs/react';

import WebDialer from './components/WebDialer';

export default {
  title: 'WebDialer',
  decorators: [withKnobs],
};

export const Example = () => {
  const production = boolean('Production', true);
  const username = text('Connection Username', 'username');
  const password = text('Connection Password', 'password');
  const callerName = text('Caller Name', 'Caller ID Name');
  const callerNumber = text('Caller Number', 'Caller ID Number');
  const disableMicrophone = boolean('Disable Microphone', false);

  return (
    <WebDialer
      environment={production ? 'production' : 'development'}
      username={username}
      password={password}
      defaultDestination='18004377950'
      callerName={callerName}
      callerNumber={callerNumber}
      disableMicrophone={disableMicrophone}
    />
  );
};
