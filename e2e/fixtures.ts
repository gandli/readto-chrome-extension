import { test as base, chromium, type BrowserContext } from '@playwright/test';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dist = path.resolve(__dirname, '../dist');

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readto-wxt-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${dist}`,
        `--load-extension=${dist}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
    });
    try {
      await context.waitForEvent('serviceworker', { timeout: 15000 }).catch(() => undefined);
      await use(context);
    } finally {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  },
  extensionId: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0]
      ?? await context.waitForEvent('serviceworker', { timeout: 15_000 });
    const id = sw.url().split('/')[2];
    await use(id);
  },
});
export { expect } from '@playwright/test';
