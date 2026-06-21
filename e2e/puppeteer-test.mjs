/**
 * E2E test using Puppeteer — Chrome's recommended tool for extension testing.
 * 
 * Run: node e2e/puppeteer-test.mjs
 */
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist');
const CHROME_PATH = 'C:\\Users\\user\\scoop\\apps\\googlechrome\\current\\chrome.exe';
const TEST_PAGE_PORT = 3456;
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

/* ─── Simple static file server ─── */
function startServer(port, root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(root, req.url === '/' ? '/test-page.html' : req.url);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
        res.end(fs.readFileSync(filePath));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

/* ─── Test runner ─── */
let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

async function run() {
  console.log('\n🧪 readto E2E Tests (Puppeteer)\n');

  // Start test server
  const server = await startServer(TEST_PAGE_PORT, FIXTURES_DIR);
  console.log(`📡 Test server on http://localhost:${TEST_PAGE_PORT}`);

  // Launch Chrome with extension
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-component-update',
      '--disable-default-apps',
      '--no-sandbox',
    ],
  });

  console.log('🌐 Chrome launched with extension\n');

  // Wait for service worker
  let swTarget;
  try {
    swTarget = await browser.waitForTarget(
      t => t.type() === 'service_worker',
      { timeout: 15000 }
    );
    console.log('🔧 Service Worker loaded:', swTarget.url());
  } catch {
    console.log('⚠️  Service Worker not detected within 15s');
    
    // List all targets for debugging
    const targets = browser.targets();
    console.log('  Available targets:');
    for (const t of targets) {
      console.log(`    [${t.type()}] ${t.url()}`);
    }
  }

  // Get extension ID
  const extId = swTarget?.url().split('/')[2] ?? 'unknown';
  console.log('🆔 Extension ID:', extId, '\n');

  // ─── Test 1: Service worker loads ───
  console.log('Test: Service Worker');
  assert(!!swTarget, 'service worker target exists');

  // ─── Test 2: Content script annotates page ───
  console.log('\nTest: Content Script Annotations');
  const page = await browser.newPage();
  await page.goto(`http://localhost:${TEST_PAGE_PORT}/test-page.html`, {
    waitUntil: 'domcontentloaded',
  });

  // Wait for annotations
  try {
    await page.waitForSelector('[data-readto]', { timeout: 20000 });
    const count = await page.evaluate(() => document.querySelectorAll('[data-readto]').length);
    assert(count > 5, `found ${count} annotations (>5)`);
  } catch {
    const count = await page.evaluate(() => document.querySelectorAll('[data-readto]').length);
    assert(false, `annotations appeared within 20s (found ${count})`);
  }

  // ─── Test 3: Shadow DOM with translation ───
  console.log('\nTest: Shadow DOM');
  const withTranslation = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll('[data-readto]').forEach(span => {
      if (span.shadowRoot?.querySelector('.rt')) count++;
    });
    return count;
  });
  assert(withTranslation > 0, `${withTranslation} annotations have .rt in shadow DOM`);

  // ─── Test 4: Common words get fewer annotations ───
  console.log('\nTest: CEFR Filtering');
  const counts = await page.evaluate(() => {
    const countIn = sel => document.querySelector(sel)?.querySelectorAll('[data-readto]').length ?? 0;
    return { common: countIn('#para-common'), advanced: countIn('#para-1') };
  });
  assert(counts.common < counts.advanced, `common(${counts.common}) < advanced(${counts.advanced})`);

  // ─── Test 5: Code blocks excluded ───
  console.log('\nTest: Code Block Exclusion');
  const codeCount = await page.evaluate(() =>
    document.querySelector('.code-block')?.querySelectorAll('[data-readto]').length ?? 0
  );
  assert(codeCount === 0, `code block has 0 annotations (${codeCount})`);

  // ─── Test 6: Nav excluded ───
  console.log('\nTest: Nav Exclusion');
  const navCount = await page.evaluate(() =>
    document.querySelector('nav')?.querySelectorAll('[data-readto]').length ?? 0
  );
  assert(navCount === 0, `nav has 0 annotations (${navCount})`);

  // ─── Test 7: Tooltip on hover ───
  console.log('\nTest: Tooltip');
  const firstAnnotation = await page.$('[data-readto]');
  if (firstAnnotation) {
    await firstAnnotation.hover();
    await new Promise(r => setTimeout(r, 500));
  }
  const hasTooltip = await page.evaluate(() => {
    for (const span of document.querySelectorAll('[data-readto]')) {
      if (span.shadowRoot?.querySelector('.tooltip')) return true;
    }
    return false;
  });
  assert(hasTooltip, 'tooltip appears on hover');

  // ─── Test 8: Speaker button ───
  console.log('\nTest: Speaker Button');
  const hasSpeaker = await page.evaluate(() => {
    for (const span of document.querySelectorAll('[data-readto]')) {
      if (span.shadowRoot?.querySelector('.speaker')) return true;
    }
    return false;
  });
  assert(hasSpeaker, 'speaker button exists in tooltip');

  // ─── Summary ───
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed\n`);

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
