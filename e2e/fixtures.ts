import { test as base, chromium, type BrowserContext } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dist = path.resolve(__dirname, '../dist');

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${dist}`,
        `--load-extension=${dist}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
    });
    // Wait for service worker
    await context.waitForEvent('serviceworker', { timeout: 15000 });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0];
    if (!sw) throw new Error('No service worker found');
    const id = sw.url().split('/')[2];
    await use(id);
  },
});
export { expect } from '@playwright/test';
