module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^react-dom/server$': require.resolve('react-dom/server.node'),
  },
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
