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
    // audit v4 P1-B: use a dedicated userDataDir per test invocation.
    // Empty-string profiles share the OS default; concurrent E2E and
    // dev-browser sessions collide → serviceworker never boots on macOS.
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readto-e2e-'));
    const ctx = await chromium.launchPersistentContext(userDataDir, {
      // Extensions cannot run in Playwright's default headless mode; use the
      // new headless implementation that supports MV3 service workers.
      headless: true,
      args: [
        `--disable-extensions-except=${MINIMAL_EXT}`,
        `--load-extension=${MINIMAL_EXT}`,
        '--headless=new',
      ],
    });
    try {
      const sw = ctx.serviceWorkers()[0]
        ?? await ctx.waitForEvent('serviceworker', { timeout: 15_000 });
      const extId = sw.url().split('/')[2];
      await use(extId);
    } finally {
      await ctx.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  },
});

export const expect = test.expect;
