import { defineConfig } from '@playwright/test'

const port = process.env.CAPABILITY_PORT ?? '3109'
const dev = process.env.CAPABILITY_MODE === 'dev'
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: dev
      ? `bun --bun vite dev --host 127.0.0.1 --port ${port} --strictPort`
      : 'bun run start',
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { HOST: '127.0.0.1', PORT: port },
  },
})
