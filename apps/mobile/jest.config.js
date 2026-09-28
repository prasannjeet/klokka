/* eslint-disable @typescript-eslint/no-require-imports */
/* global require, module */
const path = require('node:path');

// The React copy THIS app bundles. npm may hoist a second `react` next to the exact version mobile
// pins; a Jest run with two Reacts makes every hook read a null dispatcher. Metro never sees that
// split (nodeModulesPaths + disableHierarchicalLookup), so the mapping reproduces its resolution.
const reactRoot = path.dirname(require.resolve('react/package.json'));

// jest-expo resolves the Babel config from the PROCESS working directory and never walks up, so a run
// started at the repo root would silently fall back to expo's internal preset. Anchoring the options
// to this directory closes that trap (Kulram KUL-184); the key must match the preset's byte for byte.
const mobileRoot = path.dirname(require.resolve('./babel.config.js'));
const babelOptions = require('jest-expo/src/resolveBabelOptions').resolveBabelOptions(mobileRoot);

module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/app', '<rootDir>/src'],
  resolver: 'react-native-worklets/jest/resolver',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', babelOptions],
  },
  moduleNameMapper: {
    '^react$': reactRoot,
    '^react/(.*)$': path.join(reactRoot, '$1'),
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-clone-referenced-element|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-worklets|react-native-safe-area-context|react-native-screens|react-native-keyboard-controller|react-native-view-shot|d3-shape|d3-path|internmap|standard-navigation|@standard-navigation/.*))',
  ],
};
