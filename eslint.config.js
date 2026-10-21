import eslint from '@eslint/js'
import { plugin as shadcn } from '@shadcn/lint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import policy from './design-system.lint.json' with { type: 'json' }

export default defineConfig(
  globalIgnores([
    '.output/**',
    '.tanstack/**',
    'coverage/**',
    'node_modules/**',
    'playwright-report/**',
    'src/routeTree.gen.ts',
    'test-results/**',
    // The fixture is a separate Start app with its own generated routes and #/ alias.
    // Its source is linted and typechecked in the staged app by test:capabilities.
    'tests/server-capabilities/src/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      prettier,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    files: [
      'src/router.tsx',
      'src/routes/**/*.tsx',
      'src/features/**/*.functions.ts',
    ],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/only-throw-error': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { shadcn },
    settings: {
      shadcn: {
        note: 'See template_docs/design-system.md for design rules and approved exceptions.',
      },
    },
    rules: policy.rules,
  },
  ...policy.overrides,
)
