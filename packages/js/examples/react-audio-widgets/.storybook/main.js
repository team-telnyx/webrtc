module.exports = {
  stories: ['../**/*.stories.@(js|mdx)'],
  addons: [
    './auth-addon/register.js',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-essentials',
  ],
};
