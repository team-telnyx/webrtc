module.exports = {
  "stories": [
    "../stories/**/*.stories.mdx",
    "../stories/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    './auth-addon/register.js',
    "@storybook/addon-links",
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    "@storybook/addon-essentials"
  ]
}