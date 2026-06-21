import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    command: `npx serve e2e/fixtures -p ${TEST_PAGE_PORT} --no-clipboard --no-request-logging`,
    port: TEST_PAGE_PORT,
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
