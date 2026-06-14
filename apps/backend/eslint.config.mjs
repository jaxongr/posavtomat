import config from '@savdo-pos/eslint-config';

export default [
  ...config,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Type-aware rule — backend has parserOptions.project set.
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/migrations/**'],
  },
];
