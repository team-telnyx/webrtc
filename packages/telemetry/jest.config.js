/* global require, module */
const { name } = require('./package.json');

module.exports = {
  displayName: name,
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
};
