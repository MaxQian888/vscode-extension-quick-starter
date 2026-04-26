import { defineConfig } from '@tomjs/eslint';

export default defineConfig({
  // 基础配置
  ignores: [
    'dist/**',
    'node_modules/**',
    '.vscode-test/**',
    'test-results/**',
    'playwright-report/**',
    '__tests__/out/**',
    '*.d.ts',
    '.github/**',
    'docs/superpowers/**',
  ],

  // 全局规则
  rules: {
    'no-console': 'off',
    'n/prefer-global/process': 'off',
    'unicorn/prefer-top-level-await': 'off',
    'ts/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'perfectionist/sort-imports': [
      'error',
      {
        type: 'alphabetical',
        order: 'asc',
        ignoreCase: true,
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'type',
        ],
      },
    ],
    'style/semi': ['error', 'always'],
    'style/quotes': ['error', 'single', { avoidEscape: true }],
    'style/comma-dangle': ['error', 'always-multiline'],
    'style/member-delimiter-style': ['error', { multiline: { delimiter: 'semi' } }],
  },

  // 针对 extension 目录的 Node.js 规则
  overrides: {
    'extension/**/*.ts': {
      rules: {
        'n/no-missing-import': 'off',
        'n/no-unpublished-import': 'off',
      },
    },
    // 针对 webview 目录的 React 规则
    'webview/**/*.{ts,tsx}': {
      rules: {
        'react/prop-types': 'off',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
    // 测试文件规则
    '**/__tests__/**/*.{ts,tsx}': {
      rules: {
        'ts/no-explicit-any': 'off',
        'ts/no-non-null-assertion': 'off',
      },
    },
    // 配置文件规则
    '*.config.{ts,mjs,js}': {
      rules: {
        'n/no-unpublished-import': 'off',
        'import/no-default-export': 'off',
      },
    },
  },
});
