import React from 'react';

import { withKnobs, text, boolean } from '@storybook/addon-knobs/react';

import Utilities from './components/Utilities';

export default {
  title: 'Utilities',
  decorators: [withKnobs],
};

export const Example = () => {
  const production = boolean('Production', true);
  const username = text('Connection Username', 'username');
  const password = text('Connection Password', 'password');

  return (
    <Utilities
      environment={production ? 'production' : 'development'}
      username={username}
      password={password}
    />
  );
};
