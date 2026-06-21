/**
 * Screenshot script for readto extension.
 * Uses the readto.ai example article (tax reform).
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dist = path.resolve(__dirname, '../dist');
const outDir = path.resolve(__dirname, '../screenshots');
const TEST_PAGE_PORT = 3456;

fs.mkdirSync(outDir, { recursive: true });

async function main() {
  // Launch browser with extension
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      '--no-first-run',
      '--disable-default-apps',
      '--window-size=1280,900',
    ],
    viewport: { width: 1280, height: 900 },
  });

  // Wait for service worker with longer timeout
  let sw;
  try {
    sw = await context.waitForEvent('serviceworker', { timeout: 30000 });
  } catch {
    // Fallback: wait a bit and check
    console.log('  ⚠️ Service worker event timeout, waiting...');
    await new Promise(r => setTimeout(r, 5000));
    sw = context.serviceWorkers()[0];
    if (!sw) {
      throw new Error('No service worker found after fallback');
    }
  }
  
  const extensionId = sw.url().split('/')[2];
  console.log(`Extension ID: ${extensionId}`);
  await new Promise(r => setTimeout(r, 2000));

  // ── 1. Options Page (Light) ──
  console.log('📸 Options page (light)...');
  const optPage = await context.newPage();
  await optPage.emulateMedia({ colorScheme: 'light' });
  await optPage.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 1000));
  await optPage.screenshot({ path: path.join(outDir, '01-options.png'), fullPage: true });
  console.log('  ✅ 01-options.png');

  // ── 2. Options Page (Dark) ──
  console.log('📸 Options page (dark)...');
  const darkPage = await context.newPage();
  await darkPage.emulateMedia({ colorScheme: 'dark' });
  await darkPage.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 1000));
  await darkPage.screenshot({ path: path.join(outDir, '05-options-dark.png'), fullPage: true });
  console.log('  ✅ 05-options-dark.png');

  // ── 3. Article with annotations ──
  console.log('📸 Article with annotations...');
  const artPage = await context.newPage();
  await artPage.emulateMedia({ colorScheme: 'light' });
  await artPage.goto(`http://localhost:${TEST_PAGE_PORT}/article-tax.html`, { waitUntil: 'networkidle' });
  // Wait for annotations
  try {
    await artPage.waitForSelector('[data-readto]', { timeout: 20000 });
    console.log('  ✅ Found [data-readto] annotations');
  } catch {
    console.log('  ⚠️ No [data-readto] found, taking screenshot anyway...');
  }
  await new Promise(r => setTimeout(r, 2000));
  await artPage.screenshot({ path: path.join(outDir, '02-annotations.png'), fullPage: false });
  console.log('  ✅ 02-annotations.png');

  // ── 4. Full page view ──
  console.log('📸 Full page...');
  await artPage.screenshot({ path: path.join(outDir, '04-fullpage.png'), fullPage: true });
  console.log('  ✅ 04-fullpage.png');

  // ── 5. Tooltip ──
  console.log('📸 Tooltip...');
  const annotated = await artPage.$$('[data-readto]');
  console.log(`  Found ${annotated.length} annotated words`);
  if (annotated.length > 0) {
    // Click to pin tooltip
    await annotated[0].click();
    await new Promise(r => setTimeout(r, 1200));
    
    // Check if tooltip exists in shadow DOM
    const hasTooltip = await annotated[0].evaluate(el => {
      return !!el.shadowRoot?.querySelector('.tooltip');
    });
    console.log(`  Tooltip visible: ${hasTooltip}`);
    
    if (hasTooltip) {
      await annotated[0].scrollIntoViewIfNeeded();
      await new Promise(r => setTimeout(r, 300));
    }
    await artPage.screenshot({ path: path.join(outDir, '03-tooltip.png'), fullPage: false });
    console.log('  ✅ 03-tooltip.png');
  }

  await context.close();
  console.log(`\n✅ All screenshots saved to ${outDir}`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
