import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// The same rules as the SDK (packages/js), without its Markdown docs.
export default defineConfig(
  globalIgnores(['lib/**', 'node_modules/**', 'coverage/**']),
  [
    {
      files: ['**/*.js', '**/*.mjs'],
      plugins: {
        js,
      },
      extends: ['js/recommended'],
    },
    {
      files: ['**/*.ts'],
      plugins: {
        tseslint,
      },
      extends: ['tseslint/recommended'],
      rules: {
        '@typescript-eslint/no-unused-expressions': [
          'error',
          { allowTernary: true, allowShortCircuit: true },
        ],
      },
    },
  ]
);
