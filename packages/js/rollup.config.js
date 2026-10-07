import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import ts from 'typescript';
import path from 'path';
import pkg from './package.json';

/** Bundles the private workspace package @telnyx/webrtc-telemetry from its TypeScript source. */
const bundleTelemetry = () => {
  const source = path.resolve('../telemetry/src') + path.sep; // from packages/js
  return {
    name: 'bundle-telemetry',
    transform(code, id) {
      if (!id.startsWith(source) || !id.endsWith('.ts')) return null;
      const { outputText } = ts.transpileModule(code, {
        fileName: id,
        compilerOptions: {
          target: ts.ScriptTarget.ES2015,
          module: ts.ModuleKind.ESNext,
          importHelpers: true,
        },
      });
      return { code: outputText, map: null };
    },
  };
};

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
  typescript({
    objectHashIgnoreUnknownHack: true,
    // The workspace package @telnyx/webrtc-telemetry stays a library here: it
    // is type-checked, never emitted next to this package's declarations.
    tsconfigOverride: { compilerOptions: { preserveSymlinks: true } },
  }),
  bundleTelemetry(),
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
