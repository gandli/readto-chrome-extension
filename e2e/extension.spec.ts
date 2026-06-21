import { test, expect } from './fixtures';

const PAGE = 'https://en.wikipedia.org/wiki/English_language';

test.describe('Extension E2E (real extension loading)', () => {
  test('Service Worker 正常注册', async ({ extensionId }) => {
    expect(extensionId).toMatch(/^[a-z]{32}$/);
    console.log(`Extension ID: ${extensionId}`);
  });

  test('content script 注入并生成 readto 标注', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // Capture console messages from the page
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[readto]') || text.includes('Error') || text.includes('error') || text.includes('Failed')) {
        console.log(`[PAGE] ${text}`);
      }
    });
    
    await page.goto(PAGE, { waitUntil: 'networkidle' });
    // Wait longer for wordlist loading + translation
    await page.waitForTimeout(20000);

    const count = await page.evaluate(() => document.querySelectorAll('[data-readto]').length);
    console.log(`Found ${count} annotations`);
    
    // Check SW console
    const bgPage = context.serviceWorkers()[0];
    if (bgPage) {
      bgPage.on('console', msg => console.log(`[SW] ${msg.text()}`));
    }
    
    expect(count).toBeGreaterThan(0);
  });

  test('options 页面可访问', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('domcontentloaded');
    
    const title = await page.title();
    console.log(`Options page title: ${title}`);
    expect(title).toBeTruthy();
  });
});
