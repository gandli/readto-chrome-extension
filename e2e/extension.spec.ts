import { test, expect } from './fixtures';

const PAGE = 'http://localhost:3456/article-all.html';

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
    
    await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 10_000 });
    await context.serviceWorkers()[0]?.evaluate(() => new Promise<void>(r => chrome.storage.sync.set({ level: 'A1' }, r)));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('[data-readto]').length > 0, { timeout: 30_000 });

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

  test('LongCat endpoint 自动使用 LongCat 默认模型', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('#llm-toggle', { timeout: 10000 });

    await page.locator('label[for="llm-toggle"]').click();
    await page.locator('#endpoint').fill('https://api.longcat.chat/openai/chat/completions');

    await expect(page.locator('#model')).toHaveValue('LongCat-2.0-Preview');
  });

});
