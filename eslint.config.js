import lexjs from '@lexjs/eslint';
import { useIgnoreFile } from '@lexjs/eslint/utils';
import globals from 'globals';
import * as tseslint from 'typescript-eslint';

export default tseslint.config(
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
    files: ['test*/**/*'],
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.test.json',
        },
      },
    },
  },
);
