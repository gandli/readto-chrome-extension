/**
 * Debug script — check extension loading via CDP.
 */
import { test } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_PAGE = 'http://localhost:3456/test-page.html';

test('debug: extension loading via CDP', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);

  // 1. List all targets
  const { targetInfos } = await cdp.send('Target.getTargets');
  console.log('\n=== ALL TARGETS ===');
  for (const t of targetInfos) {
    console.log(`  [${t.type}] ${t.title || '(no title)'} | ${t.url}`);
  }

  // 2. Check for service_worker targets
  const swTargets = targetInfos.filter(t => t.type === 'service_worker');
  console.log(`\n=== SERVICE WORKERS: ${swTargets.length} ===`);
  for (const sw of swTargets) {
    console.log(`  ${sw.url}`);
  }

  // 3. Check for background_page targets
  const bgTargets = targetInfos.filter(t => t.type === 'background_page');
  console.log(`\n=== BACKGROUND PAGES: ${bgTargets.length} ===`);
  for (const bg of bgTargets) {
    console.log(`  ${bg.url}`);
  }

  // 4. Navigate to test page
  await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // 5. Re-check targets after navigation
  const { targetInfos: afterNav } = await cdp.send('Target.getTargets');
  console.log('\n=== TARGETS AFTER NAV ===');
  for (const t of afterNav) {
    console.log(`  [${t.type}] ${t.title || '(no title)'} | ${t.url}`);
  }

  // 6. Check if content script injected anything
  const bodyLen = await page.evaluate(() => document.body.innerHTML.length);
  const readtoCount = await page.evaluate(() => document.querySelectorAll('[data-readto]').length);
  console.log(`\n=== PAGE STATE ===`);
  console.log(`  body HTML length: ${bodyLen}`);
  console.log(`  [data-readto] count: ${readtoCount}`);

  // 7. Try to access chrome.runtime from content script context
  // Use CDP to evaluate in the content script's isolated world
  try {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' ? 'available' : 'unavailable'`,
      contextId: undefined, // default context
    });
    console.log(`\n=== chrome.runtime in page: ${result.result.value} ===`);
  } catch (e: any) {
    console.log(`\n=== CDP evaluate error: ${e.message} ===`);
  }
});
