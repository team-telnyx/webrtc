import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import pkg from './package.json';

const input = 'src/index.ts';
const output = [
  {
    file: pkg.main,
    format: 'umd',
    name: 'TelnyxWebRTC',
  },
  {
    file: pkg.module,
    format: 'es',
  },
];

const plugins = [
  resolve({
    browser: true,
    preferBuiltins: false,
    extensions: ['.mjs', '.js', '.jsx', '.json', '.ts'],
  }),
  // @peermetrics/webrtc-stats ships ES2022 syntax (class fields) from 5.8.0 on.
  // Rollup 1 can't parse it, and it would raise the syntax level our published
  // bundle needs (ES2018 with 5.7.1), so compile that package down before
  // commonJS reads it.
  babel({
    include: /node_modules[\\/]@peermetrics[\\/]webrtc-stats[\\/]/,
    // Keep Babel's helpers inline. Otherwise the plugin adds an `import` of
    // its helper module, and commonJS then reads the file as an ES module and
    // misses its `exports.WebRTCStats`.
    externalHelpers: true,
    babelrc: false,
    configFile: false,
    presets: [
      ['@babel/preset-env', { targets: { esmodules: true }, modules: false }],
    ],
  }),
  commonJS(),
  typescript({
    objectHashIgnoreUnknownHack: true,
  }),
  terser(),
  json(),
];

export default [
  {
    input,
    output,
    plugins,
  },
  {
    input,
    output: { ...output, format: 'esm', file: 'lib/bundle.mjs' },
    plugins,
  },
];
