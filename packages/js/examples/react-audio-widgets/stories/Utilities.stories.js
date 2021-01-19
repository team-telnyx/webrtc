import React from 'react';

import Utilities from './components/Utilities';

export default {
  title: 'Utilities',
};

export const Example = (args, storybook) => {
  return <Utilities {...storybook.globals.telnyxAuth} {...args} />;
};
