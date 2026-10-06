import lexjs from '@lexjs/eslint';
import { useIgnoreFile } from '@lexjs/eslint/utils';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import * as tseslint from 'typescript-eslint';

export default defineConfig(
  useIgnoreFile('.gitignore', import.meta),
  lexjs.configs.recommended,
  lexjs.configs.typescript,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        projectService: {
          allowDefaultProject: ['*.js'],
        },
      },
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
  },
  {
    files: ['src/**/*'],
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.app.json',
        },
      },
    },
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.test.{ts,mts,cts}'],
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.test.json',
        },
      },
    },
    rules: {
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
    },
  },
);
