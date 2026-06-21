/**
 * E2E tests for the readto Chrome extension.
 *
 * Launches Chrome with the extension loaded, navigates to a test page,
 * and verifies that annotations appear correctly.
 *
 * Run: npx playwright test --project=chrome-extension
 */
import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PAGE = 'http://localhost:3456/test-page.html';

/* ─── Helpers ─── */

/** Wait for readto annotations to appear in the page */
async function waitForAnnotations(page: Page, timeout = 30_000) {
  await page.waitForSelector('[data-readto]', { timeout });
}

/** Count the number of readto annotation spans */
async function countAnnotations(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('[data-readto]').length);
}

/* ─── Test Suite ─── */

test.describe('readto Chrome Extension E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Collect console messages for debugging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('[readto]')) {
        console.log(`[page ${msg.type()}] ${msg.text()}`);
      }
    });
  });

  test('content script loads and annotates advanced words', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const count = await countAnnotations(page);
    expect(count).toBeGreaterThan(5);
  });

  test('annotations have shadow DOM with translation superscript', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const withShadow = await page.evaluate(() => {
      const spans = document.querySelectorAll('[data-readto]');
      let count = 0;
      for (const span of spans) {
        if (span.shadowRoot?.querySelector('.rt')) count++;
      }
      return count;
    });
    expect(withShadow).toBeGreaterThan(0);
  });

  test('translations are non-empty strings', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const translations = await page.evaluate(() => {
      const spans = document.querySelectorAll('[data-readto]');
      return Array.from(spans).map(span => {
        const shadow = span.shadowRoot;
        if (!shadow) return '';
        const rt = shadow.querySelector('.rt');
        return rt?.textContent?.trim() ?? '';
      }).filter(Boolean);
    });
    expect(translations.length).toBeGreaterThan(0);
    for (const t of translations) {
      expect(t.length).toBeGreaterThan(0);
    }
  });

  test('common words in para-common get fewer annotations', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const counts = await page.evaluate(() => {
      const countIn = (sel: string) => {
        const el = document.querySelector(sel);
        return el?.querySelectorAll('[data-readto]').length ?? 0;
      };
      return {
        common: countIn('#para-common'),
        advanced: countIn('#para-1'),
      };
    });
    expect(counts.common).toBeLessThan(counts.advanced);
  });

  test('code blocks are not annotated', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const codeAnnotations = await page.evaluate(() => {
      const codeBlock = document.querySelector('.code-block');
      return codeBlock?.querySelectorAll('[data-readto]').length ?? 0;
    });
    expect(codeAnnotations).toBe(0);
  });

  test('nav elements are excluded from annotation', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const navAnnotations = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      return nav?.querySelectorAll('[data-readto]').length ?? 0;
    });
    expect(navAnnotations).toBe(0);
  });

  test('hovering an annotation shows tooltip with details', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const firstAnnotation = page.locator('[data-readto]').first();
    await expect(firstAnnotation).toBeVisible();
    await firstAnnotation.hover();

    const tooltipAppeared = await page.waitForFunction(() => {
      const spans = document.querySelectorAll('[data-readto]');
      for (const span of spans) {
        const tooltip = span.shadowRoot?.querySelector('.tooltip');
        if (tooltip) return true;
      }
      return false;
    }, { timeout: 5000 }).catch(() => false);

    expect(tooltipAppeared).toBe(true);
  });

  test('tooltip contains phonetic and translation body', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const firstAnnotation = page.locator('[data-readto]').first();
    await firstAnnotation.hover();

    await page.waitForFunction(() => {
      const spans = document.querySelectorAll('[data-readto]');
      for (const span of spans) {
        if (span.shadowRoot?.querySelector('.tooltip')) return true;
      }
      return false;
    }, { timeout: 5000 });

    const tooltipContent = await page.evaluate(() => {
      const spans = document.querySelectorAll('[data-readto]');
      for (const span of spans) {
        const tooltip = span.shadowRoot?.querySelector('.tooltip');
        if (tooltip) {
          return {
            hasBody: !!tooltip.querySelector('.body'),
            bodyText: tooltip.querySelector('.body')?.textContent?.trim() ?? '',
          };
        }
      }
      return null;
    });

    expect(tooltipContent).not.toBeNull();
    expect(tooltipContent?.hasBody).toBe(true);
    expect(tooltipContent?.bodyText.length).toBeGreaterThan(0);
  });

  test('speaker button exists in tooltip', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const firstAnnotation = page.locator('[data-readto]').first();
    await firstAnnotation.hover();

    await page.waitForFunction(() => {
      const spans = document.querySelectorAll('[data-readto]');
      for (const span of spans) {
        if (span.shadowRoot?.querySelector('.tooltip')) return true;
      }
      return false;
    }, { timeout: 5000 });

    const hasSpeaker = await page.evaluate(() => {
      const spans = document.querySelectorAll('[data-readto]');
      for (const span of spans) {
        if (span.shadowRoot?.querySelector('.speaker')) return true;
      }
      return false;
    });
    expect(hasSpeaker).toBe(true);
  });

  test('annotations preserve original word in slot', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const firstText = await page.evaluate(() => {
      const span = document.querySelector('[data-readto]');
      return span?.textContent?.trim() ?? '';
    });
    expect(firstText.length).toBeGreaterThan(0);
  });

  test('extension works on multiple paragraphs', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'networkidle' });
    await waitForAnnotations(page);

    const paragraphCounts = await page.evaluate(() => {
      const paras = ['#para-1', '#para-2', '#para-3', '#para-mixed'];
      return paras.map(sel => ({
        selector: sel,
        count: document.querySelector(sel)?.querySelectorAll('[data-readto]').length ?? 0,
      }));
    });

    for (const p of paragraphCounts) {
      expect(p.count).toBeGreaterThan(0);
    }
  });
});
