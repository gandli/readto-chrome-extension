import { test as base, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MINIMAL_EXT = path.resolve(__dirname, 'fixtures', 'minimal-extension');

export const test = base.extend<{ extensionId: string }>({
  extensionId: async ({ }, use) => {
    const ctx = await chromium.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${MINIMAL_EXT}`,
        `--load-extension=${MINIMAL_EXT}`,
      ],
    });
    const sw = ctx.serviceWorkers()[0]
      ?? await ctx.waitForEvent('serviceworker', { timeout: 10_000 });
    const extId = sw.url().split('/')[2];
    await use(extId);
    await ctx.close();
  },
});

export const expect = test.expect;
