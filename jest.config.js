const { jsWithTs: tsjPreset } = require('ts-jest/presets');

module.exports = {
  verbose: true,
  roots: ['<rootDir>/src'],
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/examples/'],
  transform: {
    ...tsjPreset.transform,
  },
};
