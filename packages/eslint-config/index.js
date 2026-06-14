// Shared ESLint flat config — enforces CLAUDE.md universal bans.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // ❌ any tipi — MUTLAQ TAQIQ
      '@typescript-eslint/no-explicit-any': 'error',
      // ❌ console.log — logger ishlatilsin
      'no-console': 'error',
      // ❌ TODO/FIXME/HACK
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'hack'], location: 'anywhere' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
