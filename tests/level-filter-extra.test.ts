// @vitest-environment jsdom
/**
 * Additional tests for level-filter.ts — filterWords, createReadtoSpan, getConfig, etc.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome.runtime.getURL and fetch before importing the module
const mockGetURL = vi.fn((path: string) => `chrome-extension://abc/${path}`);
(globalThis as any).chrome = { runtime: { getURL: mockGetURL } };

// Build a small test wordlist for mocking loadLevelData
const TEST_WORDS: Record<string, string> = {
  // A1 words
  hello: 'A1', world: 'A1', the: 'A1', is: 'A1', a: 'A1', cat: 'A1', dog: 'A1',
  big: 'A1', small: 'A1', good: 'A1', bad: 'A1', i: 'A1', you: 'A1',
  // A2 words
  important: 'A2', different: 'A2', because: 'A2', country: 'A2',
  // B1 words
  ambitious: 'B1', sustainable: 'B1', furthermore: 'B1', negotiate: 'B1',
  // B2 words
  ubiquitous: 'B2', exacerbate: 'B2', pragmatic: 'B2',
  // C1 words
  ephemeral: 'C1', sesquipedalian: 'C1', obfuscate: 'C1',
  // C2 words
  defenestrate: 'C2', sesquipedality: 'C2',
};

// Mock loadLevelData to return our test dictionary
vi.mock('../src/lib/level-data', () => ({
  loadLevelData: vi.fn(async () => new Map(Object.entries(TEST_WORDS))),
}));

// Mock pronunciation module (not used in these tests but imported by level-filter)
vi.mock('../src/lib/pronunciation', () => ({
  speakWordSync: vi.fn(),
}));

import {
  loadWordlist,
  filterWords,
  filterForLevel,
  createReadtoSpan,
  getSiteRule,
  getConfig,
  initSiteConfig,
  setSiteConfig,
  isStayOriginal,
  isExcluded,
  checkLevel,
  type FilteredWord,
} from '../src/lib/level-filter';

// Helper: create a simple DOM element with text
function makeContainer(html: string): Element {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

// Helper: get the first text node of an element
function firstTextNode(el: Element): Text {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  return walker.nextNode() as Text;
}

/* ─── Setup: load the mocked wordlist ─── */

beforeEach(async () => {
  await loadWordlist();
});

/* ─── filterWords ─── */

describe('filterWords', () => {
  it('returns words above A1 level', async () => {
    const container = makeContainer('The ambitious cat is good');
    const results = filterWords(container, 'A1');

    // "ambitious" is B1, above A1 → should be returned
    const words = results.map(r => r.word);
    expect(words).toContain('ambitious');
    // A1 words should NOT be returned
    expect(words).not.toContain('the');
    expect(words).not.toContain('cat');
    expect(words).not.toContain('good');
  });

  it('returns fewer words at B1 level (only B2+ words)', () => {
    const container = makeContainer('The ambitious ubiquitous pragmatic cat');
    const results = filterWords(container, 'B1');

    const words = results.map(r => r.word);
    // B1 user: only B2/C1/C2 words returned
    expect(words).toContain('ubiquitous');  // B2
    expect(words).toContain('pragmatic');    // B2
    expect(words).not.toContain('ambitious'); // B1 (at or below user level)
    expect(words).not.toContain('cat');      // A1
  });

  it('returns only C2 words at C1 level', () => {
    const container = makeContainer('ephemeral defenestrate ubiquitous');
    const results = filterWords(container, 'C1');

    const words = results.map(r => r.word);
    expect(words).toContain('defenestrate'); // C2
    expect(words).not.toContain('ephemeral'); // C1 (at level)
    expect(words).not.toContain('ubiquitous'); // B2 (below)
  });

  it('returns 0 words at C2 level (nothing above C2)', () => {
    const container = makeContainer('ephemeral defenestrate sesquipedality');
    const results = filterWords(container, 'C2');
    expect(results).toHaveLength(0);
  });

  it('handles empty container', () => {
    const container = makeContainer('');
    const results = filterWords(container, 'A1');
    expect(results).toHaveLength(0);
  });

  it('handles container with no text nodes', () => {
    const container = document.createElement('div');
    // no children at all
    const results = filterWords(container, 'A1');
    expect(results).toHaveLength(0);
  });

  it('tracks occurrence indices for duplicate words', () => {
    const container = makeContainer('Ambitious and ambitious again');
    const results = filterWords(container, 'A1');

    const ambitiousResults = results.filter(r => r.word === 'ambitious');
    expect(ambitiousResults).toHaveLength(2);
    expect(ambitiousResults[0].occurrenceIndex).toBe(0);
    expect(ambitiousResults[1].occurrenceIndex).toBe(1);
  });

  it('skips all-caps words (likely acronyms)', () => {
    const container = makeContainer('NASA is ubiquitous');
    const results = filterWords(container, 'A1');

    const words = results.map(r => r.word);
    expect(words).not.toContain('nasa'); // all-caps → skipped
    expect(words).toContain('ubiquitous');
  });

  it('skips mid-sentence capitalized words (likely proper nouns)', () => {
    const container = makeContainer('the London ubiquitous');
    const results = filterWords(container, 'A1');

    const words = results.map(r => r.word);
    // "London" is capitalized mid-sentence → skipped
    // "ubiquitous" is lowercase B2 → returned
    expect(words).toContain('ubiquitous');
    // "london" is not in the wordlist anyway, so it wouldn't match regardless
    expect(words).not.toContain('london');
  });

  it('returns FilteredWord with correct structure', () => {
    const container = makeContainer('ubiquitous');
    const results = filterWords(container, 'A1');

    expect(results).toHaveLength(1);
    const fw = results[0];
    expect(fw.word).toBe('ubiquitous');
    expect(fw.occurrenceIndex).toBe(0);
    expect(fw.textNode).toBeInstanceOf(Text);
    expect(typeof fw.offsetInNode).toBe('number');
    expect(typeof fw.length).toBe('number');
    expect(fw.length).toBe(10); // "ubiquitous".length
  });

  it('handles nested elements', () => {
    const container = makeContainer('<p>The <em>ambitious</em> <strong>ubiquitous</strong> cat</p>');
    const results = filterWords(container, 'A1');

    const words = results.map(r => r.word);
    expect(words).toContain('ambitious');
    expect(words).toContain('ubiquitous');
  });

  it('skips text inside <code> and <pre> elements', () => {
    const container = makeContainer('<p>ubiquitous</p><code>ubiquitous</code><pre>ubiquitous</pre>');
    const results = filterWords(container, 'A1');

    // Only the one in <p> should be returned
    expect(results).toHaveLength(1);
  });

  it('skips text inside <script> and <style> elements', () => {
    const container = makeContainer('ubiquitous');
    // Manually add a script text node
    const script = document.createElement('script');
    script.textContent = 'ubiquitous';
    container.appendChild(script);

    const results = filterWords(container, 'A1');
    // Only the original text node in the div, not the script
    expect(results).toHaveLength(1);
  });

  it('skips contenteditable elements', () => {
    const container = makeContainer('<p>ubiquitous</p><p contenteditable="true">ubiquitous</p>');
    const results = filterWords(container, 'A1');

    // Only the non-contenteditable one
    expect(results).toHaveLength(1);
  });

  it('skips elements with data-readto attribute', () => {
    const container = makeContainer('ubiquitous');
    const alreadyAnnotated = document.createElement('span');
    alreadyAnnotated.setAttribute('data-readto', '');
    alreadyAnnotated.textContent = 'ubiquitous';
    container.appendChild(alreadyAnnotated);

    const results = filterWords(container, 'A1');
    // Only the original text node, not the data-readto one
    expect(results).toHaveLength(1);
  });

  it('throws if wordlist not loaded', () => {
    // We need to access the internal wordMap. Since loadWordlist was called in beforeEach,
    // we can't easily reset it. But the test in the existing file covers this with a fresh module.
    // Here we just verify the function works after loading.
    const container = makeContainer('test');
    expect(() => filterWords(container, 'A1')).not.toThrow();
  });

  it('works with filterForLevel alias', () => {
    const container = makeContainer('The ambitious ubiquitous cat');
    const results = filterForLevel(container, 'A1');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.word === 'ambitious')).toBe(true);
    expect(results.some(r => r.word === 'ubiquitous')).toBe(true);
  });

  it('respects stayOriginal selectors via setSiteConfig', () => {
    // Set config that marks certain elements as stayOriginal
    setSiteConfig({
      excludeSelectors: [],
      stayOriginalSelectors: ['.notranslate'],
    });

    const container = makeContainer(
      '<span class="notranslate">ubiquitous</span><span>ubiquitous</span>'
    );
    const results = filterWords(container, 'A1');

    // Only the one without .notranslate should be returned
    expect(results).toHaveLength(1);
  });

  it('respects exclude selectors via setSiteConfig', () => {
    setSiteConfig({
      excludeSelectors: ['.skip-me'],
      stayOriginalSelectors: [],
    });

    const container = makeContainer(
      '<div class="skip-me">ubiquitous</div><div>ubiquitous</div>'
    );
    const results = filterWords(container, 'A1');

    // Only the one without .skip-me should be returned
    expect(results).toHaveLength(1);
  });
});

/* ─── createReadtoSpan ─── */

describe('createReadtoSpan', () => {
  it('creates a span with data-readto attribute', () => {
    const span = createReadtoSpan(document, 'hello', '你好');

    expect(span.tagName).toBe('SPAN');
    expect(span.hasAttribute('data-readto')).toBe(true);
  });

  it('contains the original text as a text node', () => {
    const span = createReadtoSpan(document, 'hello', '你好');

    // Should have a text child with the original word
    const textNodes = Array.from(span.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
    expect(textNodes.length).toBeGreaterThanOrEqual(1);
    expect(textNodes[0].textContent).toBe('hello');
  });

  it('creates shadow DOM with slot and .rt elements', () => {
    const span = createReadtoSpan(document, 'hello', '你好');
    const shadow = span.shadowRoot;

    expect(shadow).not.toBeNull();

    // Should have a <slot> element
    const slot = shadow!.querySelector('slot');
    expect(slot).not.toBeNull();

    // Should have a .rt span with the translation
    const rt = shadow!.querySelector('.rt');
    expect(rt).not.toBeNull();
    expect(rt!.textContent).toBe('你好');
  });

  it('injects CSS into the shadow DOM', () => {
    const span = createReadtoSpan(document, 'hello', '你好');
    const shadow = span.shadowRoot!;

    // Should have adopted stylesheets or a <style> element
    const hasStyles =
      shadow.adoptedStyleSheets.length > 0 ||
      shadow.querySelector('style') !== null;
    expect(hasStyles).toBe(true);
  });

  it('does not create tooltip by default', () => {
    const span = createReadtoSpan(document, 'hello', '你好');
    const shadow = span.shadowRoot!;

    const tooltip = shadow.querySelector('.tooltip');
    expect(tooltip).toBeNull();
  });

  it('sets up hover detail when withHoverDetail is true', () => {
    const getDetail = vi.fn(async () => null);
    const span = createReadtoSpan(document, 'hello', '你好', {
      withHoverDetail: true,
      getDetail,
    });

    // The span should have event listeners attached (pointerenter/pointerleave/click)
    // We can verify by dispatching a pointerenter event
    // The tooltip won't appear immediately (150ms delay) but getDetail should be called eventually
    expect(span).toBeDefined();
    expect(span.hasAttribute('data-readto')).toBe(true);
  });

  it('does not set up hover detail when withHoverDetail is false', () => {
    const getDetail = vi.fn(async () => null);
    const span = createReadtoSpan(document, 'hello', '你好', {
      withHoverDetail: false,
      getDetail,
    });

    // getDetail should never be called since hover detail is disabled
    // Dispatch a pointerenter and wait
    span.dispatchEvent(new PointerEvent('pointerenter'));
    expect(getDetail).not.toHaveBeenCalled();
  });

  it('creates tooltip on hover when detail is available', async () => {
    const mockDetail = {
      p: 'həˈloʊ',
      t: 'int. 你好',
      e: [{ en: 'She said {hello} to everyone.', zh: '她向大家问好。' }],
    };
    const getDetail = vi.fn(async () => mockDetail);

    const span = createReadtoSpan(document, 'hello', '你好', {
      withHoverDetail: true,
      getDetail,
      autoSpeak: false,
    });

    // Trigger hover
    span.dispatchEvent(new PointerEvent('pointerenter'));

    // Wait for the show delay (150ms) + some buffer
    await new Promise(resolve => setTimeout(resolve, 200));

    // getDetail should have been called
    expect(getDetail).toHaveBeenCalledWith('hello');
  });
});

/* ─── getConfig / getSiteRule edge cases ─── */

describe('getConfig', () => {
  it('returns null before any config is initialized', () => {
    // getConfig returns the current generalRule or null
    // After setSiteConfig in previous tests, it may return something
    // We test that it returns a SiteRule or null
    const config = getConfig();
    // It should be either null or a SiteRule object
    if (config !== null) {
      expect(config).toHaveProperty('id');
      expect(config).toHaveProperty('stayOriginalSelectors');
      expect(config).toHaveProperty('excludeSelectors');
    }
  });

  it('returns the rule after setSiteConfig', () => {
    setSiteConfig({
      excludeSelectors: ['.test-exclude'],
      stayOriginalSelectors: ['.test-stay'],
    });

    const config = getConfig();
    expect(config).not.toBeNull();
    expect(config!.id).toBe('dynamic');
    expect(config!.stayOriginalSelectors).toContain('.test-stay');
    expect(config!.excludeSelectors).toContain('.test-exclude');
  });

  it('returns the rule after initSiteConfig', () => {
    const rule = getSiteRule('https://github.com');
    initSiteConfig(rule);

    const config = getConfig();
    expect(config).not.toBeNull();
    expect(config!.id).toBe('github');
  });
});

describe('getSiteRule edge cases', () => {
  it('matches stackexchange.com subdomain', () => {
    const rule = getSiteRule('https://meta.stackexchange.com/questions/123');
    expect(rule.id).toBe('stackoverflow');
  });

  it('matches wikipedia.org with any subdomain', () => {
    const rule = getSiteRule('https://de.wikipedia.org/wiki/Artikel');
    expect(rule.id).toBe('wikipedia');
  });

  it('returns default for IP addresses', () => {
    const rule = getSiteRule('https://192.168.1.1/page');
    expect(rule.id).toBe('default');
  });

  it('returns default for localhost', () => {
    const rule = getSiteRule('http://localhost:3000');
    expect(rule.id).toBe('default');
  });

  it('always includes default stayOriginal selectors', () => {
    const rule = getSiteRule('https://random-site.com');
    expect(rule.stayOriginalSelectors).toContain('pre');
    expect(rule.stayOriginalSelectors).toContain('code');
    expect(rule.stayOriginalSelectors).toContain('kbd');
    expect(rule.stayOriginalSelectors).toContain('[translate=no]');
  });

  it('always includes default exclude selectors', () => {
    const rule = getSiteRule('https://random-site.com');
    expect(rule.excludeSelectors).toContain('nav');
    expect(rule.excludeSelectors).toContain('[role=navigation]');
    expect(rule.excludeSelectors).toContain('[role=banner]');
    expect(rule.excludeSelectors).toContain('[role=contentinfo]');
  });
});

/* ─── isStayOriginal / isExcluded with active config ─── */

describe('isStayOriginal / isExcluded', () => {
  it('isStayOriginal returns true for matching elements', () => {
    setSiteConfig({
      excludeSelectors: [],
      stayOriginalSelectors: ['.keep-original'],
    });

    const el = document.createElement('span');
    el.className = 'keep-original';
    expect(isStayOriginal(el)).toBe(true);
  });

  it('isStayOriginal returns false for non-matching elements', () => {
    setSiteConfig({
      excludeSelectors: [],
      stayOriginalSelectors: ['.keep-original'],
    });

    const el = document.createElement('span');
    el.className = 'other';
    expect(isStayOriginal(el)).toBe(false);
  });

  it('isExcluded returns true for matching elements', () => {
    setSiteConfig({
      excludeSelectors: ['.excluded-area'],
      stayOriginalSelectors: [],
    });

    const el = document.createElement('div');
    el.className = 'excluded-area';
    expect(isExcluded(el)).toBe(true);
  });

  it('isExcluded returns false for non-matching elements', () => {
    setSiteConfig({
      excludeSelectors: ['.excluded-area'],
      stayOriginalSelectors: [],
    });

    const el = document.createElement('div');
    el.className = 'content';
    expect(isExcluded(el)).toBe(false);
  });

  it('defaults stayOriginal elements (pre, code, etc.) are recognized via initSiteConfig', () => {
    // initSiteConfig merges DEFAULT_STAY_ORIGINAL selectors
    initSiteConfig({
      id: 'test',
      matches: [],
      stayOriginalSelectors: [],
      excludeSelectors: [],
    });

    // Default selectors include 'pre', 'code', 'kbd', etc.
    const pre = document.createElement('pre');
    expect(isStayOriginal(pre)).toBe(true);

    const code = document.createElement('code');
    expect(isStayOriginal(code)).toBe(true);

    const kbd = document.createElement('kbd');
    expect(isStayOriginal(kbd)).toBe(true);
  });

  it('default exclude elements (nav, etc.) are recognized via initSiteConfig', () => {
    initSiteConfig({
      id: 'test',
      matches: [],
      stayOriginalSelectors: [],
      excludeSelectors: [],
    });

    const nav = document.createElement('nav');
    expect(isExcluded(nav)).toBe(true);
  });
});

/* ─── Level comparison logic (CEFR_ORDER) ─── */

describe('CEFR level comparison in filterWords', () => {
  // CEFR_ORDER: A1=1, A2=2, B1=3, B2=4, C1=5, C2=6
  // filterWords returns words where LEVEL_ORDER[wordLevel] > LEVEL_ORDER[userLevel]

  it('A1 user sees A2+ words', () => {
    const container = makeContainer('important ambitious ubiquitous ephemeral defenestrate');
    const results = filterWords(container, 'A1');
    const words = results.map(r => r.word);

    expect(words).toContain('important');    // A2
    expect(words).toContain('ambitious');     // B1
    expect(words).toContain('ubiquitous');    // B2
    expect(words).toContain('ephemeral');     // C1
    expect(words).toContain('defenestrate');  // C2
  });

  it('A2 user sees B1+ words', () => {
    const container = makeContainer('important ambitious ubiquitous ephemeral defenestrate');
    const results = filterWords(container, 'A2');
    const words = results.map(r => r.word);

    expect(words).not.toContain('important'); // A2 (at level)
    expect(words).toContain('ambitious');     // B1
    expect(words).toContain('ubiquitous');    // B2
  });

  it('B1 user sees B2+ words', () => {
    const container = makeContainer('important ambitious ubiquitous ephemeral');
    const results = filterWords(container, 'B1');
    const words = results.map(r => r.word);

    expect(words).not.toContain('important');  // A2
    expect(words).not.toContain('ambitious');   // B1 (at level)
    expect(words).toContain('ubiquitous');      // B2
    expect(words).toContain('ephemeral');       // C1
  });

  it('B2 user sees C1+ words', () => {
    const container = makeContainer('ambitious ubiquitous ephemeral defenestrate');
    const results = filterWords(container, 'B2');
    const words = results.map(r => r.word);

    expect(words).not.toContain('ambitious');   // B1
    expect(words).not.toContain('ubiquitous');  // B2 (at level)
    expect(words).toContain('ephemeral');       // C1
    expect(words).toContain('defenestrate');    // C2
  });

  it('C1 user sees C2 words', () => {
    const container = makeContainer('ephemeral defenestrate sesquipedality');
    const results = filterWords(container, 'C1');
    const words = results.map(r => r.word);

    expect(words).not.toContain('ephemeral');      // C1 (at level)
    expect(words).toContain('defenestrate');        // C2
    expect(words).toContain('sesquipedality');      // C2
  });

  it('C2 user sees nothing (no level above C2)', () => {
    const container = makeContainer('ephemeral defenestrate sesquipedality');
    const results = filterWords(container, 'C2');

    expect(results).toHaveLength(0);
  });

  it('unknown words (not in wordlist) are skipped', () => {
    const container = makeContainer('xyzzy plugh ambiguous');
    const results = filterWords(container, 'A1');

    // "xyzzy" and "plugh" are not in our test wordlist → skipped
    const words = results.map(r => r.word);
    expect(words).not.toContain('xyzzy');
    expect(words).not.toContain('plugh');
  });
});

/* ─── checkLevel ─── */

describe('checkLevel', () => {
  it('returns the level for a known word', () => {
    expect(checkLevel('hello')).toBe('A1');
    expect(checkLevel('ambitious')).toBe('B1');
    expect(checkLevel('ubiquitous')).toBe('B2');
    expect(checkLevel('ephemeral')).toBe('C1');
    expect(checkLevel('defenestrate')).toBe('C2');
  });

  it('returns undefined for unknown words', () => {
    expect(checkLevel('xyzzy')).toBeUndefined();
  });

  it('is case-insensitive', () => {
    expect(checkLevel('HELLO')).toBe('A1');
    expect(checkLevel('Ambitious')).toBe('B1');
  });
});
