/**
 * Playwright fixtures for Chrome extension testing.
 *
 * Uses chromium.launchPersistentContext (NOT Chrome) — Playwright's bundled
 * Chromium supports --load-extension, while Chrome/Edge removed it.
 */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  extPage: Page;
}>({
  context: async ({ }, use) => {
    const context = await chromium.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-component-update',
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // MV3: wait for service worker
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },

  extPage: async ({ context }, use) => {
    // Reuse existing page or create new one
    const page = context.pages()[0] || await context.newPage();
    await use(page);
  },
});

export const expect = test.expect;
