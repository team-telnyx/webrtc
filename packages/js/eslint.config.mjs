import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import markdown from '@eslint/markdown';

export default defineConfig(
  globalIgnores(['lib/**', 'node_modules/**', 'coverage/**', 'examples/**']),
  [
    {
      files: ['**/*.js'],
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
    {
      files: ['**/*.md'],
      plugins: {
        markdown,
      },
      extends: ['markdown/recommended'],
    },
  ]
);
