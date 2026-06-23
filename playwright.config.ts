import { defineConfig } from '@playwright/test';

const TEST_PAGE_PORT = 3456;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `python -m http.server ${TEST_PAGE_PORT} --directory e2e/fixtures`,
    url: `http://127.0.0.1:${TEST_PAGE_PORT}/article-all.html`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
