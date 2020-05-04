const { jsWithTs: tsjPreset } = require('ts-jest/presets');

module.exports = {
  verbose: true,
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/examples/'],
  transform: {
    ...tsjPreset.transform,
  },
  setupFiles: [
    '<rootDir>/tests/setup/browsers.ts',
    '<rootDir>/tests/setup/connection.ts',
    '<rootDir>/tests/setup/webrtcMocks.ts',
  ],
};
