// @ts-check
/**
 * ESLint 9 flat config for readto-chrome-extension.
 *
 * Scope: source under src/ and unit tests under tests/.
 * Skips generated / vendor code.
 *
 * The config is deliberately conservative for the first roll-out (audit P1-6):
 * hard-error only on the highest-signal rules, keep the rest as warn so we
 * can adopt gradually without a mass-fix commit.
 */
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '**/*.d.ts',
      'e2e/**',
      '**/*.config.ts',
      '**/*.config.js',
      'src/lib/level-data.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        chrome: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        globalThis: 'readonly',
        WebSocket: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // Hard errors — anything below is a bug pattern we saw in the audit.
      'no-unused-vars': 'off', // handled by TS
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-undef': 'off', // TS handles this
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-useless-escape': 'warn',
      // Legitimate pattern: throwing-only async generators for mocking
      // stream errors (see tests/llm-stream.test.ts).
      'require-yield': 'off',
      // JS/TS crossover: `require` in configs is fine; forbid in TS source.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
