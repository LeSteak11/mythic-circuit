import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Engine isolation: src/engine/ is pure TypeScript. It must never import
    // React, react-dom, or anything from src/ui/ or src/state/, and must not
    // touch the DOM. Violations fail `npm run lint`.
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'src/engine/ must not import React. The engine is pure TypeScript.',
            },
            {
              group: ['**/ui/**', '**/ui', '**/state/**', '**/state'],
              message: 'src/engine/ must not import from src/ui/ or src/state/.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/engine/ must not touch the DOM.' },
        { name: 'document', message: 'src/engine/ must not touch the DOM.' },
        { name: 'localStorage', message: 'src/engine/ must not touch browser storage.' },
        { name: 'sessionStorage', message: 'src/engine/ must not touch browser storage.' },
        { name: 'navigator', message: 'src/engine/ must not touch browser APIs.' },
        { name: 'fetch', message: 'src/engine/ must not make network calls.' },
      ],
    },
  },
  prettier,
);
