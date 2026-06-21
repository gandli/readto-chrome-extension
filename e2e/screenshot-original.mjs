/**
 * Screenshot the original readto extension's options page for comparison.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const origDist = path.resolve(__dirname, '../../readto 0.3.1');
const outDir = path.resolve(__dirname, '../screenshots');

async function main() {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${origDist}`,
      `--load-extension=${origDist}`,
      '--no-first-run',
      '--disable-default-apps',
      '--window-size=1280,900',
    ],
    viewport: { width: 1280, height: 900 },
  });

  let sw;
  try {
    sw = await context.waitForEvent('serviceworker', { timeout: 30000 });
  } catch {
    await new Promise(r => setTimeout(r, 5000));
    sw = context.serviceWorkers()[0];
  }

  const extensionId = sw.url().split('/')[2];
  console.log(`Original Extension ID: ${extensionId}`);
  await new Promise(r => setTimeout(r, 2000));

  // Options page (light)
  console.log('📸 Original options page (light)...');
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`, { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outDir, '00-original-options.png'), fullPage: true });
  console.log('  ✅ 00-original-options.png');

  // Options page (dark)
  console.log('📸 Original options page (dark)...');
  const darkPage = await context.newPage();
  await darkPage.emulateMedia({ colorScheme: 'dark' });
  await darkPage.goto(`chrome-extension://${extensionId}/src/options/index.html`, { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 1500));
  await darkPage.screenshot({ path: path.join(outDir, '00-original-options-dark.png'), fullPage: true });
  console.log('  ✅ 00-original-options-dark.png');

  await context.close();
  console.log('\n✅ Done');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
