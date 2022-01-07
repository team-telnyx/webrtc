import React from 'react';

import Utilities from './components/Utilities';

export default {
  title: 'Utilities',
};

export const Examples = (args, storybook) => (
  <Utilities {...args} {...storybook.globals.telnyxAuth} />
);

Examples.args = {
  username: process.env.STORYBOOK_USERNAME,
  password: process.env.STORYBOOK_PASSWORD,
}
