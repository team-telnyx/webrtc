// Workaroung https://github.com/webpack/webpack/issues/6426
module.exports = {
  webpackFinal: async (config, { configType }) => {
    config.optimization = {
      splitChunks: {
        name: false,
      },
    };
    config.output.chunkFilename = "[name].js"
    return config;
  },
  stories: ['../**/*.stories.@(js|mdx)'],
  addons: [
    './auth-addon/register.js',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-essentials',
  ],
};
