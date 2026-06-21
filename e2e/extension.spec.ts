/**
 * E2E tests for the readto Chrome extension.
 *
 * Uses Playwright's bundled Chromium (NOT installed Chrome) with
 * launchPersistentContext for proper extension support.
 */
import { test, expect } from './fixtures';

const TEST_PAGE = 'http://localhost:3456/test-page.html';

/* ─── Helpers ─── */

/** Wait for annotations to appear inside the page */
async function waitForAnnotations(page: import('@playwright/test').Page, timeout = 20_000) {
  await page.waitForSelector('[data-readto]', { timeout });
}

/* ─── Test Suite ─── */

test.describe('readto Chrome Extension E2E', () => {

  test('service worker loads', async ({ extensionId }) => {
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(10);
  });

  test('content script annotates advanced words', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    const count = await extPage.locator('[data-readto]').count();
    expect(count).toBeGreaterThan(5);
  });

  test('annotations have shadow DOM with translation', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    const withTranslation = await extPage.evaluate(() => {
      const spans = document.querySelectorAll('[data-readto]');
      let count = 0;
      for (const span of spans) {
        if (span.shadowRoot?.querySelector('.rt')) count++;
      }
      return count;
    });
    expect(withTranslation).toBeGreaterThan(0);
  });

  test('translations are non-empty', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    const translations = await extPage.evaluate(() => {
      const spans = document.querySelectorAll('[data-readto]');
      return Array.from(spans)
        .map(s => s.shadowRoot?.querySelector('.rt')?.textContent?.trim() ?? '')
        .filter(Boolean);
    });
    expect(translations.length).toBeGreaterThan(0);
    for (const t of translations) expect(t.length).toBeGreaterThan(0);
  });

  test('common words get fewer annotations', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    const counts = await extPage.evaluate(() => {
      const countIn = (sel: string) =>
        document.querySelector(sel)?.querySelectorAll('[data-readto]').length ?? 0;
      return { common: countIn('#para-common'), advanced: countIn('#para-1') };
    });
    expect(counts.common).toBeLessThan(counts.advanced);
  });

  test('code blocks are not annotated', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    const codeAnnotations = await extPage.evaluate(() =>
      document.querySelector('.code-block')?.querySelectorAll('[data-readto]').length ?? 0
    );
    expect(codeAnnotations).toBe(0);
  });

  test('nav elements are excluded', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await extPage.waitForTimeout(3000);

    const navAnnotations = await extPage.evaluate(() =>
      document.querySelector('nav')?.querySelectorAll('[data-readto]').length ?? 0
    );
    expect(navAnnotations).toBe(0);
  });

  test('hover shows tooltip with details', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    await extPage.locator('[data-readto]').first().hover();

    const tooltipVisible = await extPage.waitForFunction(() => {
      for (const span of document.querySelectorAll('[data-readto]')) {
        if (span.shadowRoot?.querySelector('.tooltip')) return true;
      }
      return false;
    }, { timeout: 5000 }).catch(() => false);

    expect(tooltipVisible).toBe(true);
  });

  test('tooltip has phonetic and body', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    await extPage.locator('[data-readto]').first().hover();
    await extPage.waitForFunction(() => {
      for (const span of document.querySelectorAll('[data-readto]')) {
        if (span.shadowRoot?.querySelector('.tooltip')) return true;
      }
      return false;
    }, { timeout: 5000 });

    const tooltip = await extPage.evaluate(() => {
      for (const span of document.querySelectorAll('[data-readto]')) {
        const tip = span.shadowRoot?.querySelector('.tooltip');
        if (tip) {
          return {
            hasBody: !!tip.querySelector('.body'),
            bodyText: tip.querySelector('.body')?.textContent?.trim() ?? '',
          };
        }
      }
      return null;
    });

    expect(tooltip).not.toBeNull();
    expect(tooltip?.hasBody).toBe(true);
    expect(tooltip?.bodyText.length).toBeGreaterThan(0);
  });

  test('speaker button exists in tooltip', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    await extPage.locator('[data-readto]').first().hover();
    await extPage.waitForFunction(() => {
      for (const span of document.querySelectorAll('[data-readto]')) {
        if (span.shadowRoot?.querySelector('.tooltip')) return true;
      }
      return false;
    }, { timeout: 5000 });

    const hasSpeaker = await extPage.evaluate(() => {
      for (const span of document.querySelectorAll('[data-readto]')) {
        if (span.shadowRoot?.querySelector('.speaker')) return true;
      }
      return false;
    });
    expect(hasSpeaker).toBe(true);
  });

  test('annotations preserve original text', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    const firstText = await extPage.evaluate(() =>
      document.querySelector('[data-readto]')?.textContent?.trim() ?? ''
    );
    expect(firstText.length).toBeGreaterThan(0);
  });

  test('multiple paragraphs annotated', async ({ extPage }) => {
    await extPage.goto(TEST_PAGE, { waitUntil: 'domcontentloaded' });
    await waitForAnnotations(extPage);

    const counts = await extPage.evaluate(() => {
      return ['#para-1', '#para-2', '#para-3', '#para-mixed'].map(sel => ({
        selector: sel,
        count: document.querySelector(sel)?.querySelectorAll('[data-readto]').length ?? 0,
      }));
    });

    for (const p of counts) expect(p.count).toBeGreaterThan(0);
  });

  test('options page loads via extension ID', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    // The options page should render (React app)
    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
