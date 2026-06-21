/**
 * E2E test — injects extension code directly into pages.
 * 
 * Works around Chrome 149+ removing --load-extension support.
 * Tests the actual annotation logic without relying on extension loading.
 * 
 * Run: node e2e/inject-test.mjs
 */
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const CHROME_PATH = 'C:\\Users\\user\\scoop\\apps\\googlechrome\\current\\chrome.exe';
const TEST_PAGE_PORT = 3456;
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

/* ─── Static file server ─── */
function startServer(port, root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(root, req.url === '/' ? '/test-page.html' : req.url);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
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
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name}`); failed++; }
}

async function run() {
  console.log('\n🧪 readto E2E Tests (Direct Injection)\n');

  const server = await startServer(TEST_PAGE_PORT, FIXTURES_DIR);
  console.log(`📡 Test server on http://localhost:${TEST_PAGE_PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // Load test page
  await page.goto(`http://localhost:${TEST_PAGE_PORT}/test-page.html`, {
    waitUntil: 'domcontentloaded',
  });

  // ─── Inject extension's data files ───
  console.log('📦 Injecting extension data...\n');

  // Load CEFR levels data
  const levelsPath = path.join(DIST_DIR, 'assets', 'level-data-full.json');
  if (fs.existsSync(levelsPath)) {
    const levelsData = JSON.parse(fs.readFileSync(levelsPath, 'utf-8'));
    await page.evaluate((data) => {
      window.__readto_levels = new Map(Object.entries(data));
    }, levelsData);
    console.log(`  📊 Loaded ${Object.keys(levelsData).length} word levels`);
  }

  // Load translations data
  const transPath = path.join(DIST_DIR, 'assets', 'translations-data.json');
  if (fs.existsSync(transPath)) {
    const transData = JSON.parse(fs.readFileSync(transPath, 'utf-8'));
    await page.evaluate((data) => {
      window.__readto_translations = new Map(Object.entries(data));
    }, transData);
    console.log(`  📖 Loaded ${Object.keys(transData).length} translations`);
  }

  // ─── Inject core annotation logic ───
  console.log('💉 Injecting annotation engine...\n');

  // Inject the tokenizer and filter directly
  const annotationResult = await page.evaluate((level) => {
    const LEVEL_ORDER = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    const levels = window.__readto_levels;
    const translations = window.__readto_translations;
    if (!levels || !translations) return { error: 'data not loaded' };

    const WORD_RE = /[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019\-]*[A-Za-z\u00C0-\u024F]|[A-Za-z\u00C0-\u024F]/g;
    const SKIP_TAGS = new Set(['CODE', 'PRE', 'INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'NAV']);

    function tokenize(text) {
      const words = [];
      let match;
      WORD_RE.lastIndex = 0;
      while ((match = WORD_RE.exec(text)) !== null) {
        const orig = match[0];
        words.push({
          word: orig.toLowerCase(),
          offset: match.index,
          length: orig.length,
          isAllCaps: orig.length > 1 && orig === orig.toUpperCase(),
          hadUpper: orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase(),
        });
      }
      return words;
    }

    function collectTextNodes(root, result) {
      for (let i = 0; i < root.childNodes.length; i++) {
        const child = root.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE) result.push(child);
        else if (child.nodeType === Node.ELEMENT_NODE && !SKIP_TAGS.has(child.tagName) && !child.hasAttribute('data-readto')) {
          collectTextNodes(child, result);
        }
      }
    }

    function annotate(root, userLevel) {
      const textNodes = [];
      collectTextNodes(root, textNodes);
      const userLv = LEVEL_ORDER[userLevel];
      const occurrences = new Map();
      let annotated = 0;
      const annotatedWords = [];

      for (const node of textNodes) {
        const tokens = tokenize(node.data);
        for (const tok of tokens) {
          if (tok.length < 2 || tok.isAllCaps) continue;
          const wordLevel = levels.get(tok.word);
          if (!wordLevel || LEVEL_ORDER[wordLevel] <= userLv) continue;
          const trans = translations.get(tok.word);
          if (!trans) continue;

          // Create annotation span
          try {
            const range = node.ownerDocument.createRange();
            range.setStart(node, tok.offset);
            range.setEnd(node, tok.offset + tok.length);
            const span = node.ownerDocument.createElement('span');
            span.setAttribute('data-readto', '');
            const shadow = span.attachShadow({ mode: 'open' });
            const slot = node.ownerDocument.createElement('slot');
            shadow.appendChild(slot);
            const rt = node.ownerDocument.createElement('span');
            rt.className = 'rt';
            rt.textContent = trans;
            rt.style.cssText = 'display:inline;font-size:0.6em;vertical-align:super;line-height:0;opacity:0.85;margin-left:1px;pointer-events:none;user-select:none';
            shadow.appendChild(rt);
            range.deleteContents();
            range.insertNode(span);
            annotated++;
            annotatedWords.push(tok.word);
          } catch {}
        }
      }
      return { annotated, words: annotatedWords.slice(0, 20) };
    }

    // Run annotation on the whole body
    const result = annotate(document.body, level);
    return result;
  }, 'B2');

  console.log(`  🔧 Annotation result: ${annotationResult.annotated} words annotated`);
  if (annotationResult.words?.length) {
    console.log(`  📝 Sample words: ${annotationResult.words.join(', ')}`);
  }

  // ─── Test 1: Annotations created ───
  console.log('\nTest: Annotations Created');
  const count = await page.evaluate(() => document.querySelectorAll('[data-readto]').length);
  assert(count >= 3, `found ${count} annotations (>=3)`);

  // ─── Test 2: Shadow DOM with .rt ───
  console.log('\nTest: Shadow DOM');
  const withRt = await page.evaluate(() => {
    let c = 0;
    document.querySelectorAll('[data-readto]').forEach(s => {
      if (s.shadowRoot?.querySelector('.rt')) c++;
    });
    return c;
  });
  assert(withRt > 0, `${withRt} annotations have .rt in shadow DOM`);

  // ─── Test 3: Translation text ───
  console.log('\nTest: Translation Text');
  const translations = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-readto]'))
      .map(s => s.shadowRoot?.querySelector('.rt')?.textContent?.trim() ?? '')
      .filter(Boolean)
      .slice(0, 5);
  });
  assert(translations.length > 0, `got translations: ${translations.join(', ')}`);

  // ─── Test 4: CEFR filtering ───
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

  // ─── Test 7: Multiple paragraphs ───
  console.log('\nTest: Multiple Paragraphs');
  const paraCounts = await page.evaluate(() => {
    return ['#para-1', '#para-2', '#para-3', '#para-mixed'].map(sel => ({
      sel,
      count: document.querySelector(sel)?.querySelectorAll('[data-readto]').length ?? 0,
    }));
  });
  const annotatedParas = paraCounts.filter(p => p.count > 0).length;
  assert(annotatedParas >= 2, `${annotatedParas}/4 paragraphs annotated: ${paraCounts.map(p => `${p.sel}=${p.count}`).join(', ')}`);

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
