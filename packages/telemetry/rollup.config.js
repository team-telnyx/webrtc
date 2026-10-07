import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

/** CommonJS and ES module builds with declarations; dependencies stay imports. */
export default {
  input: 'src/index.ts',
  output: [
    { file: pkg.main, format: 'cjs' },
    { file: pkg.module, format: 'es' },
  ],
  external: Object.keys(pkg.dependencies),
  plugins: [
    typescript({
      tsconfig: 'tsconfig.build.json',
      useTsconfigDeclarationDir: true,
      clean: true,
    }),
  ],
};
