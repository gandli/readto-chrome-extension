// @vitest-environment jsdom
/**
 * Coverage boost R3 · level-filter.ts main paths
 *
 * Targets:
 *   - filterWords() 274-328: main iteration + word-level check + occurrence tracking
 *   - computeTooltipPosition() 371-395: below/above/clamped left branches
 *   - getTooltipCssUrl() 347-359: manifest lookup + fallback
 *   - getSiteRule / initSiteConfig / setSiteConfig / getConfig / isStayOriginal / isExcluded
 *   - checkLevel()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function stubChromeWithWordlist() {
  const wordlist: Record<string, string> = {
    // Simple wordlist covering B2/C1/C2 levels
    hello: 'A1',
    world: 'A2',
    ubiquitous: 'C1',
    perspicacious: 'C2',
    running: 'B1',
    prescient: 'B2',
  };
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'test-ext',
      getURL: vi.fn((path: string) => `chrome-extension://test-ext/${path}`),
      getManifest: vi.fn(() => ({
        web_accessible_resources: [
          { resources: ['assets/tooltip-css-abc123.css'], matches: ['<all_urls>'] },
          'assets/legacy-string-entry.png',
        ],
      })),
    },
  });
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify(wordlist), { status: 200 }),
  ));
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('coverage-boost R3: level-filter core APIs', () => {
  it('loadWordlist populates map and is idempotent', async () => {
    stubChromeWithWordlist();
    const { loadWordlist } = await import('../src/lib/level-filter');
    const map = await loadWordlist();
    expect(map.get('ubiquitous')).toBe('C1');
    const map2 = await loadWordlist();
    expect(map2).toBe(map); // idempotent
  });

  it('tokenizeWords splits English text with offsets and length', async () => {
    stubChromeWithWordlist();
    const { tokenizeWords } = await import('../src/lib/level-filter');
    const tokens = tokenizeWords('Hello, World! Foo-bar.');
    const words = tokens.map((t: { word: string }) => t.word);
    expect(words).toContain('hello');
    expect(words).toContain('world');
    // Offsets are within-range
    tokens.forEach((t: { offset: number; length: number }) => {
      expect(t.offset).toBeGreaterThanOrEqual(0);
      expect(t.length).toBeGreaterThan(0);
    });
  });

  it('checkLevel returns level or undefined', async () => {
    stubChromeWithWordlist();
    const { loadWordlist, checkLevel } = await import('../src/lib/level-filter');
    await loadWordlist();
    expect(checkLevel('ubiquitous')).toBe('C1');
    expect(checkLevel('notarealword_xyz')).toBeUndefined();
  });

  it('filterWords picks only words above userLevel and tracks occurrences', async () => {
    stubChromeWithWordlist();
    const { loadWordlist, filterWords } = await import('../src/lib/level-filter');
    await loadWordlist();
    document.body.innerHTML = `
      <div id="root">
        <p>The ubiquitous ubiquitous. Perspicacious kids run.</p>
        <p>Hello world running.</p>
      </div>`;
    const root = document.getElementById('root')!;
    const filtered = filterWords(root, 'B2');
    // ubiquitous (C1) and perspicacious (C2) are above B2 → included
    // running (B1), hello (A1), world (A2) are ≤ B2 → excluded
    const words = filtered.map((f: { word: string }) => f.word);
    expect(words).toContain('ubiquitous');
    expect(words).toContain('perspicacious');
    expect(words).not.toContain('running');
    expect(words).not.toContain('hello');
    // Two ubiquitous → occurrenceIndex 0 and 1
    const ubs = filtered.filter((f: { word: string }) => f.word === 'ubiquitous');
    expect(ubs.map((u: { occurrenceIndex: number }) => u.occurrenceIndex).sort()).toEqual([0, 1]);
  });

  it('filterWords throws when wordlist not loaded (L275)', async () => {
    stubChromeWithWordlist();
    const { filterWords } = await import('../src/lib/level-filter');
    // NOTE: do NOT await loadWordlist(); wordMap stays null on the fresh module.
    document.body.innerHTML = '<div id="r">hello</div>';
    expect(() => filterWords(document.getElementById('r')!, 'B2')).toThrow(/wordlist not loaded/);
  });

  it('filterWords excludes all-caps words like acronyms (L305)', async () => {
    stubChromeWithWordlist();
    const { loadWordlist, filterWords } = await import('../src/lib/level-filter');
    await loadWordlist();
    document.body.innerHTML = '<div id="r">The UBIQUITOUS solution.</div>';
    const filtered = filterWords(document.getElementById('r')!, 'B2');
    // UBIQUITOUS is all caps → treated as acronym → excluded
    const words = filtered.map((f: { word: string }) => f.word);
    expect(words).not.toContain('ubiquitous');
  });

  it('filterWords tracks context across text nodes (L322-324 carry forward)', async () => {
    stubChromeWithWordlist();
    const { loadWordlist, filterWords } = await import('../src/lib/level-filter');
    await loadWordlist();
    // Multi-node text — the second <span> starts mid-sentence because the
    // first <span> did not end with a sentence-terminator.
    document.body.innerHTML = '<div id="r"><span>the </span><span>ubiquitous solution.</span></div>';
    const filtered = filterWords(document.getElementById('r')!, 'B2');
    // ubiquitous (C1) is a real word > B2 → present
    const words = filtered.map((f: { word: string }) => f.word);
    expect(words).toContain('ubiquitous');
  });
});

describe('coverage-boost R3: level-filter tooltip position', () => {
  it('computeTooltipPosition places tooltip below when fits', async () => {
    stubChromeWithWordlist();
    const { computeTooltipPosition } = await import('../src/lib/level-filter');
    const pos = computeTooltipPosition({
      hostRect: { top: 100, bottom: 120, left: 50, right: 100, width: 50, height: 20, x: 50, y: 100 } as DOMRect,
      tipRect: { top: 0, bottom: 40, left: 0, right: 200, width: 200, height: 40, x: 0, y: 0 } as DOMRect,
      vw: 1000, vh: 800, gap: 8,
    });
    expect(pos.top).toBe(128); // bottom + gap
    expect(pos.left).toBeGreaterThanOrEqual(8);
    expect(pos.left).toBeLessThanOrEqual(1000 - 200 - 8);
  });

  it('computeTooltipPosition falls back to above when no room below', async () => {
    stubChromeWithWordlist();
    const { computeTooltipPosition } = await import('../src/lib/level-filter');
    const pos = computeTooltipPosition({
      hostRect: { top: 700, bottom: 720, left: 50, right: 100, width: 50, height: 20 } as DOMRect,
      tipRect: { top: 0, bottom: 40, left: 0, right: 200, width: 200, height: 40 } as DOMRect,
      vw: 1000, vh: 800, gap: 8,
    });
    // below would be 728 + 40 + 8 = 776 which just fits (< 800); flip vh smaller to force above
    const posAbove = computeTooltipPosition({
      hostRect: { top: 780, bottom: 800, left: 50, right: 100, width: 50, height: 20 } as DOMRect,
      tipRect: { top: 0, bottom: 40, left: 0, right: 200, width: 200, height: 40 } as DOMRect,
      vw: 1000, vh: 800, gap: 8,
    });
    expect(posAbove.top).toBeLessThan(780); // fell back to above
  });

  it('computeTooltipPosition clamps left when tooltip would overflow', async () => {
    stubChromeWithWordlist();
    const { computeTooltipPosition } = await import('../src/lib/level-filter');
    // Word at right edge → tooltip should clamp left to (vw - tipWidth - gap)
    const pos = computeTooltipPosition({
      hostRect: { top: 100, bottom: 120, left: 950, right: 1000, width: 50, height: 20 } as DOMRect,
      tipRect: { top: 0, bottom: 40, left: 0, right: 200, width: 200, height: 40 } as DOMRect,
      vw: 1000, vh: 800, gap: 8,
    });
    expect(pos.left).toBe(1000 - 200 - 8);
  });
});

describe('coverage-boost R3: level-filter site rules', () => {
  it('getSiteRule returns matching rule or default', async () => {
    stubChromeWithWordlist();
    const { getSiteRule } = await import('../src/lib/level-filter');
    const rule = getSiteRule('https://example.com/article');
    expect(rule).toBeDefined();
    expect(Array.isArray(rule.excludeSelectors)).toBe(true);
  });

  it('initSiteConfig + getConfig round-trips (config carries selectors from rule)', async () => {
    stubChromeWithWordlist();
    const { initSiteConfig, getConfig, getSiteRule } = await import('../src/lib/level-filter');
    const rule = getSiteRule('https://any.example');
    initSiteConfig(rule);
    const cfg = getConfig();
    expect(cfg).not.toBeNull();
    // initSiteConfig merges rule selectors with global defaults, so all rule
    // entries should be present in the resulting excludeSelectors.
    for (const sel of rule.excludeSelectors) {
      expect(cfg!.excludeSelectors).toContain(sel);
    }
  });

  it('setSiteConfig overrides selectors', async () => {
    stubChromeWithWordlist();
    const { setSiteConfig, getConfig } = await import('../src/lib/level-filter');
    setSiteConfig({ excludeSelectors: ['.ads'], stayOriginalSelectors: ['.stay'] });
    const cfg = getConfig();
    expect(cfg!.excludeSelectors).toEqual(['.ads']);
    expect(cfg!.stayOriginalSelectors).toEqual(['.stay']);
  });

  it('isStayOriginal / isExcluded consult site config', async () => {
    stubChromeWithWordlist();
    const { setSiteConfig, isStayOriginal, isExcluded } = await import('../src/lib/level-filter');
    setSiteConfig({ excludeSelectors: ['.ad'], stayOriginalSelectors: ['.stay'] });
    document.body.innerHTML = '<div class="ad" id="a"></div><div class="stay" id="s"></div><div id="n"></div>';
    expect(isExcluded(document.getElementById('a')!)).toBe(true);
    expect(isStayOriginal(document.getElementById('s')!)).toBe(true);
    expect(isExcluded(document.getElementById('n')!)).toBe(false);
    expect(isStayOriginal(document.getElementById('n')!)).toBe(false);
  });
});

describe('coverage-boost R3: level-filter getTooltipCssUrl', () => {
  it('resolves hashed asset from manifest with object entries (L347-355)', async () => {
    stubChromeWithWordlist();
    const { getTooltipCssUrl } = await import('../src/lib/level-filter');
    const url = getTooltipCssUrl();
    expect(url).toBe('chrome-extension://test-ext/assets/tooltip-css-abc123.css');
  });

  it('falls back to unhashed name when manifest lookup fails (L357-358)', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-ext',
        getURL: vi.fn((p: string) => `chrome-extension://test-ext/${p}`),
        getManifest: vi.fn(() => { throw new Error('unavailable'); }),
      },
    });
    const { getTooltipCssUrl } = await import('../src/lib/level-filter');
    expect(getTooltipCssUrl()).toBe('chrome-extension://test-ext/assets/tooltip-css.css');
  });

  it('handles legacy string-form web_accessible_resources entries', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-ext',
        getURL: vi.fn((p: string) => `chrome-extension://test-ext/${p}`),
        getManifest: vi.fn(() => ({
          web_accessible_resources: ['assets/tooltip-css-xyz789.css', 'assets/other.png'],
        })),
      },
    });
    const { getTooltipCssUrl } = await import('../src/lib/level-filter');
    expect(getTooltipCssUrl()).toBe('chrome-extension://test-ext/assets/tooltip-css-xyz789.css');
  });
});

/* ─── createReadtoSpan (Shadow DOM builder) ─────────────────────────────── */

describe('coverage-boost R3: createReadtoSpan', () => {
  it('creates span with data-readto attribute + shadow root + text', async () => {
    stubChromeWithWordlist();
    const { createReadtoSpan } = await import('../src/lib/level-filter');
    const span = createReadtoSpan(document, 'ubiquitous', '普遍的');
    expect(span.tagName).toBe('SPAN');
    expect(span.hasAttribute('data-readto')).toBe(true);
    expect(span.textContent).toContain('ubiquitous');
    expect(span.shadowRoot).not.toBeNull();
  });

  it('injects fallback CSS <style> element into shadow DOM (test env baseline)', async () => {
    stubChromeWithWordlist();
    const { createReadtoSpan } = await import('../src/lib/level-filter');
    const span = createReadtoSpan(document, 'word', 'translation');
    // Under vitest the ?raw import returns an empty string, so we only assert
    // the <style> element itself was inserted; its content is exercised in
    // production builds where the CSS is bundled.
    const style = span.shadowRoot!.querySelector('style');
    expect(style).not.toBeNull();
    expect(style!.tagName).toBe('STYLE');
  });

  it('accepts translation string param and passes options.autoSpeak safely', async () => {
    stubChromeWithWordlist();
    const { createReadtoSpan } = await import('../src/lib/level-filter');
    const span = createReadtoSpan(document, 'w', 't', { autoSpeak: false });
    expect(span).toBeInstanceOf(HTMLSpanElement);
  });
});

/* ─── getTranslator ─────────────────────────────────────────────────────── */

describe('coverage-boost R3: getTranslator', () => {
  it('returns local translator when translationMode !== llm', async () => {
    stubChromeWithWordlist();
    const { getTranslator } = await import('../src/lib/level-filter');
    const t = getTranslator({ level: 'B2', translationMode: 'local' });
    expect(t.kind).toBe('local');
  });

  it('returns llm translator when translationMode === llm', async () => {
    stubChromeWithWordlist();
    const { getTranslator } = await import('../src/lib/level-filter');
    const t = getTranslator({ level: 'B2', translationMode: 'llm' });
    expect(t.kind).toBe('llm');
  });

  it('translate() dispatches TRANSLATE_MANY and normalizes response', async () => {
    stubChromeWithWordlist();
    (globalThis as unknown as { chrome: any }).chrome.runtime.sendMessage = vi.fn(async () => ({
      ok: true,
      results: [[
        { word: 'ubiquitous', occurrence: 0, translation: '普遍' },
        { word: 'perspicacious', occurrence: 1, translation: '有洞察力' },
      ]],
    }));
    const { getTranslator } = await import('../src/lib/level-filter');
    const t = getTranslator({ level: 'B2', translationMode: 'local' });
    const out = await t.translate({ context: 'test', targets: [] });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ word: 'ubiquitous', occurrence: 0, translation: '普遍' });
  });

  it('translate() returns [] on error response', async () => {
    stubChromeWithWordlist();
    (globalThis as unknown as { chrome: any }).chrome.runtime.sendMessage = vi.fn(async () => ({ ok: false }));
    const { getTranslator } = await import('../src/lib/level-filter');
    const t = getTranslator({ level: 'B2', translationMode: 'local' });
    const out = await t.translate({ context: 'x', targets: [] });
    expect(out).toEqual([]);
  });

  it('translate() catches sendMessage exception and returns []', async () => {
    stubChromeWithWordlist();
    (globalThis as unknown as { chrome: any }).chrome.runtime.sendMessage = vi.fn(async () => {
      throw new Error('extension context invalidated');
    });
    const { getTranslator } = await import('../src/lib/level-filter');
    const t = getTranslator({ level: 'B2', translationMode: 'llm' });
    expect(await t.translate({ context: 'x', targets: [] })).toEqual([]);
  });
});
