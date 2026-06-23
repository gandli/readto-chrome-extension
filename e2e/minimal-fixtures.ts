import { test as base, chromium } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MINIMAL_EXT = path.resolve(__dirname, 'fixtures', 'minimal-extension');

export const test = base.extend<{ extensionId: string }>({
  extensionId: async ({ }, use) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readto-minimal-e2e-'));
    const ctx = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${MINIMAL_EXT}`,
        `--load-extension=${MINIMAL_EXT}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
    });
    try {
      const sw = ctx.serviceWorkers()[0]
        ?? await ctx.waitForEvent('serviceworker', { timeout: 10_000 });
      const extId = sw.url().split('/')[2];
      await use(extId);
    } finally {
      await ctx.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  },
});

export const expect = test.expect;
