import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:5173', locale: 'en-US', timezoneId: 'UTC', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run test:api', url: 'http://127.0.0.1:8788/api/auth', reuseExistingServer: !process.env.CI },
    { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
  ],
})
