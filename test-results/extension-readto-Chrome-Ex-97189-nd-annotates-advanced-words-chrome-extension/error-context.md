# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: extension.spec.ts >> readto Chrome Extension E2E >> content script loads and annotates advanced words
- Location: e2e\extension.spec.ts:43:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-readto]') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - link "Home" [ref=e3] [cursor=pointer]:
      - /url: "#"
    - text: "|"
    - link "About" [ref=e4] [cursor=pointer]:
      - /url: "#"
  - heading "The Serendipity of Scientific Discovery" [level=1] [ref=e5]
  - paragraph [ref=e6]: Throughout history, many groundbreaking discoveries have been the result of serendipitous encounters rather than deliberate investigation. Scientists often stumble upon remarkable findings while pursuing entirely different objectives, demonstrating the quintessential nature of curiosity-driven research.
  - paragraph [ref=e7]: The phenomenon of penicillin's discovery exemplifies this paradigm perfectly. Alexander Fleming noticed that a contaminated petri dish exhibited remarkable antibacterial properties, leading to the development of antibiotics that revolutionized modern medicine and saved countless lives throughout the twentieth century.
  - paragraph [ref=e8]: Similarly, the discovery of X-ray diffraction was an inadvertent consequence of experiments conducted by Wilhelm Röntgen. His meticulous observation of fluorescent screens illuminated by cathode rays ultimately unveiled an unprecedented method for examining the internal architecture of crystalline structures.
  - code [ref=e10]: const x = document.querySelector('.serendipity');
  - paragraph [ref=e11]: The cat sat on the mat and looked at the dog. It was a good day.
  - paragraph [ref=e12]: The ubiquitous smartphone has become an indispensable tool in contemporary society. Its proliferation has transformed communication, commerce, and entertainment in ways that were inconceivable just a few decades ago.
  - text: This technical term should remain unchanged
```

# Test source

```ts
  1   | /**
  2   |  * E2E tests for the readto Chrome extension.
  3   |  *
  4   |  * Launches Chrome with the extension loaded, navigates to a test page,
  5   |  * and verifies that annotations appear correctly.
  6   |  *
  7   |  * Run: npx playwright test --project=chrome-extension
  8   |  */
  9   | import { test, expect, type Page } from '@playwright/test';
  10  | import { fileURLToPath } from 'url';
  11  | import path from 'path';
  12  | 
  13  | const __filename = fileURLToPath(import.meta.url);
  14  | const __dirname = path.dirname(__filename);
  15  | 
  16  | const TEST_PAGE = 'http://localhost:3456/test-page.html';
  17  | 
  18  | /* ─── Helpers ─── */
  19  | 
  20  | /** Wait for readto annotations to appear in the page */
  21  | async function waitForAnnotations(page: Page, timeout = 30_000) {
> 22  |   await page.waitForSelector('[data-readto]', { timeout });
      |              ^ TimeoutError: page.waitForSelector: Timeout 30000ms exceeded.
  23  | }
  24  | 
  25  | /** Count the number of readto annotation spans */
  26  | async function countAnnotations(page: Page): Promise<number> {
  27  |   return page.evaluate(() => document.querySelectorAll('[data-readto]').length);
  28  | }
  29  | 
  30  | /* ─── Test Suite ─── */
  31  | 
  32  | test.describe('readto Chrome Extension E2E', () => {
  33  | 
  34  |   test.beforeEach(async ({ page }) => {
  35  |     // Collect console messages for debugging
  36  |     page.on('console', msg => {
  37  |       if (msg.type() === 'error' || msg.text().includes('[readto]')) {
  38  |         console.log(`[page ${msg.type()}] ${msg.text()}`);
  39  |       }
  40  |     });
  41  |   });
  42  | 
  43  |   test('content script loads and annotates advanced words', async ({ page }) => {
  44  |     await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
  45  |     await waitForAnnotations(page);
  46  | 
  47  |     const count = await countAnnotations(page);
  48  |     expect(count).toBeGreaterThan(5);
  49  |   });
  50  | 
  51  |   test('annotations have shadow DOM with translation superscript', async ({ page }) => {
  52  |     await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
  53  |     await waitForAnnotations(page);
  54  | 
  55  |     const withShadow = await page.evaluate(() => {
  56  |       const spans = document.querySelectorAll('[data-readto]');
  57  |       let count = 0;
  58  |       for (const span of spans) {
  59  |         if (span.shadowRoot?.querySelector('.rt')) count++;
  60  |       }
  61  |       return count;
  62  |     });
  63  |     expect(withShadow).toBeGreaterThan(0);
  64  |   });
  65  | 
  66  |   test('translations are non-empty strings', async ({ page }) => {
  67  |     await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
  68  |     await waitForAnnotations(page);
  69  | 
  70  |     const translations = await page.evaluate(() => {
  71  |       const spans = document.querySelectorAll('[data-readto]');
  72  |       return Array.from(spans).map(span => {
  73  |         const shadow = span.shadowRoot;
  74  |         if (!shadow) return '';
  75  |         const rt = shadow.querySelector('.rt');
  76  |         return rt?.textContent?.trim() ?? '';
  77  |       }).filter(Boolean);
  78  |     });
  79  |     expect(translations.length).toBeGreaterThan(0);
  80  |     for (const t of translations) {
  81  |       expect(t.length).toBeGreaterThan(0);
  82  |     }
  83  |   });
  84  | 
  85  |   test('common words in para-common get fewer annotations', async ({ page }) => {
  86  |     await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
  87  |     await waitForAnnotations(page);
  88  | 
  89  |     const counts = await page.evaluate(() => {
  90  |       const countIn = (sel: string) => {
  91  |         const el = document.querySelector(sel);
  92  |         return el?.querySelectorAll('[data-readto]').length ?? 0;
  93  |       };
  94  |       return {
  95  |         common: countIn('#para-common'),
  96  |         advanced: countIn('#para-1'),
  97  |       };
  98  |     });
  99  |     expect(counts.common).toBeLessThan(counts.advanced);
  100 |   });
  101 | 
  102 |   test('code blocks are not annotated', async ({ page }) => {
  103 |     await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
  104 |     await waitForAnnotations(page);
  105 | 
  106 |     const codeAnnotations = await page.evaluate(() => {
  107 |       const codeBlock = document.querySelector('.code-block');
  108 |       return codeBlock?.querySelectorAll('[data-readto]').length ?? 0;
  109 |     });
  110 |     expect(codeAnnotations).toBe(0);
  111 |   });
  112 | 
  113 |   test('nav elements are excluded from annotation', async ({ page }) => {
  114 |     await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
  115 |     await page.waitForTimeout(3000);
  116 | 
  117 |     const navAnnotations = await page.evaluate(() => {
  118 |       const nav = document.querySelector('nav');
  119 |       return nav?.querySelectorAll('[data-readto]').length ?? 0;
  120 |     });
  121 |     expect(navAnnotations).toBe(0);
  122 |   });
```