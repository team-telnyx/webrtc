import pkg from './package.json';
import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

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
  commonJS(),
  typescript(),
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
