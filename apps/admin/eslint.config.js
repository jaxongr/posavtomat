import config from '@savdo-pos/eslint-config';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  fetch: 'readonly',
};

export default [
  ...config,
  {
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'vite.config.ts'],
  },
];
