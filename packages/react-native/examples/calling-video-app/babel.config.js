// module.exports = {
//   presets: ['module:metro-react-native-babel-preset'],
// };

// babel.config.js
module.exports = {
  presets: [
    ['module:metro-react-native-babel-preset'],
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
};
