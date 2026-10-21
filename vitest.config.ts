import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    // These tests use the fixture app's #/ alias and run in its staged project.
    exclude: [
      'tests/server-capabilities/src/**/*.test.{ts,tsx}',
      '**/node_modules/**',
    ],
    restoreMocks: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
