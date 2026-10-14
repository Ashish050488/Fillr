import eslint from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.output/**', '.wxt/**', 'node_modules/**', 'eslint.config.js'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // NAMING-CONVENTIONS.md section 2: no source file over 200 lines.
      'max-lines': ['error', { max: 200 }],
      // NAMING-CONVENTIONS.md section 5.4: no single-letter names, even in callbacks.
      'id-length': ['error', { min: 2, exceptions: ['_'], properties: 'never' }],
    },
  },
);
