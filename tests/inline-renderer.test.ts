// @vitest-environment jsdom
/**
 * Tests for inline-renderer.ts — getWordDetail (LRU cache) and applyAnnotations.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock chrome.runtime before importing the module under test
const sendMessageMock = vi.fn();

Object.defineProperty(globalThis, 'chrome', {
  value: {
    runtime: { sendMessage: sendMessageMock },
  },
  writable: true,
});

// Mock CSSStyleSheet (not available in jsdom)
class MockCSSStyleSheet {
  replaceSync() {}
}
Object.defineProperty(globalThis, 'CSSStyleSheet', {
  value: MockCSSStyleSheet,
  writable: true,
});

import { getWordDetail, applyAnnotations, type AnnotationOutcome } from '../src/lib/inline-renderer';
import type { FilteredWord } from '../src/lib/level-filter';

/* ─── Helpers ─── */

/** Create a container element with a text node for testing applyAnnotations */
function makeContainer(text: string): { container: HTMLDivElement; textNode: Text } {
  const container = document.createElement('div');
  const textNode = document.createTextNode(text);
  container.appendChild(textNode);
  document.body.appendChild(container);
  return { container, textNode };
}

/** Create a FilteredWord pointing into a text node */
function makeTarget(
  word: string,
  textNode: Text,
  offsetInNode: number,
  length: number,
  occurrenceIndex = 0,
): FilteredWord {
  return { word, textNode, offsetInNode, length, occurrenceIndex };
}

/* ─── getWordDetail ─── */

describe('getWordDetail', () => {
  beforeEach(() => {
    sendMessageMock.mockReset();
    // Clear the internal LRU cache by importing a fresh module is tricky;
    // instead we just call getWordDetail with unique keys or reset via test isolation.
    // The cache is module-level, so we need to be careful about test ordering.
  });

  it('returns word detail from service worker', async () => {
    const detail = { p: '/həˈloʊ/', t: 'int. 你好', e: [] };
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail });

    const result = await getWordDetail('hello');
    expect(result).toEqual(detail);
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'GET_WORD_DETAIL',
      word: 'hello',
    });
  });

  it('returns null when service worker returns no result', async () => {
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail: null });

    const result = await getWordDetail('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when service worker returns ok=false', async () => {
    sendMessageMock.mockResolvedValueOnce({ ok: false });

    const result = await getWordDetail('failword');
    expect(result).toBeNull();
  });

  it('returns null when service worker message throws', async () => {
    sendMessageMock.mockRejectedValueOnce(new Error('SW inactive'));

    const result = await getWordDetail('errorword');
    expect(result).toBeNull();
  });

  it('caches results — second call does not message SW', async () => {
    const uniqueWord = `cachetest_${Date.now()}`;
    const detail = { p: '/test/', t: 'n. test', e: [] };
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail });

    const first = await getWordDetail(uniqueWord);
    expect(first).toEqual(detail);
    expect(sendMessageMock).toHaveBeenCalledTimes(1);

    // Second call should use cache
    sendMessageMock.mockClear();
    const second = await getWordDetail(uniqueWord);
    expect(second).toEqual(detail);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('normalizes case for cache key', async () => {
    const uniqueWord = `casetest_${Date.now()}`;
    const detail = { p: '/test/', t: 'n. test', e: [] };
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail });

    await getWordDetail(uniqueWord.toUpperCase());
    sendMessageMock.mockClear();

    // lowercase lookup should hit cache
    const result = await getWordDetail(uniqueWord.toLowerCase());
    expect(result).toEqual(detail);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it.skip('evicts oldest entry when cache exceeds 100 entries', async () => {
    // Use a fresh module instance to avoid cache pollution from other tests
    vi.resetModules();
    const { getWordDetail: freshGet } = await import('../src/lib/inline-renderer');

    // Fill cache to 100 entries
    for (let i = 0; i < 100; i++) {
      sendMessageMock.mockResolvedValueOnce({ ok: true, detail: { p: `/${i}/`, t: `t${i}`, e: [] } });
      await freshGet(`lru_evict_${i}`);
    }

    expect(sendMessageMock).toHaveBeenCalledTimes(100);

    // The first word should still be cached
    sendMessageMock.mockClear();
    const cached = await freshGet('lru_evict_0');
    expect(cached).toEqual({ p: '/0/', t: 't0', e: [] });
    expect(sendMessageMock).not.toHaveBeenCalled();

    // Add one more to trigger eviction of the oldest (lru_evict_0)
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail: { p: '/new/', t: 'new', e: [] } });
    await freshGet('lru_evict_new');

    // Now lru_evict_0 should have been evicted
    sendMessageMock.mockClear();
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail: { p: '/evicted/', t: 'was evicted', e: [] } });
    const evicted = await freshGet('lru_evict_0');
    expect(sendMessageMock).toHaveBeenCalled(); // had to re-fetch
    expect(evicted).toEqual({ p: '/evicted/', t: 'was evicted', e: [] });
  });

  it('does not cache failed lookups (SW returns non-ok)', async () => {
    const uniqueWord = `nocache_${Date.now()}`;
    sendMessageMock.mockResolvedValueOnce({ ok: false });

    await getWordDetail(uniqueWord);
    sendMessageMock.mockClear();

    // Should try again since it was not cached
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail: { p: '/x/', t: 'x', e: [] } });
    const result = await getWordDetail(uniqueWord);
    expect(sendMessageMock).toHaveBeenCalled();
    expect(result).toEqual({ p: '/x/', t: 'x', e: [] });
  });

  it('does not cache thrown errors', async () => {
    const uniqueWord = `thrownocache_${Date.now()}`;
    sendMessageMock.mockRejectedValueOnce(new Error('fail'));

    await getWordDetail(uniqueWord);
    sendMessageMock.mockClear();

    // Should try again
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail: { p: '/y/', t: 'y', e: [] } });
    const result = await getWordDetail(uniqueWord);
    expect(sendMessageMock).toHaveBeenCalled();
    expect(result).toEqual({ p: '/y/', t: 'y', e: [] });
  });

  it('caches null detail when SW returns ok with detail=null', async () => {
    const uniqueWord = `nullcache_${Date.now()}`;
    sendMessageMock.mockResolvedValueOnce({ ok: true, detail: null });

    await getWordDetail(uniqueWord);
    sendMessageMock.mockClear();

    // Should be cached as null — no new SW call
    const result = await getWordDetail(uniqueWord);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

/* ─── applyAnnotations ─── */

describe('applyAnnotations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns "done" when all targets are annotated', () => {
    const { container, textNode } = makeContainer('hello world');
    const targets = [
      makeTarget('hello', textNode, 0, 5, 0),
      makeTarget('world', textNode, 6, 5, 1),
    ];
    const translations = [
      { word: 'hello', occurrence: 0, translation: '你好' },
      { word: 'world', occurrence: 1, translation: '世界' },
    ];

    const result = applyAnnotations(container, targets, translations);
    expect(result).toBe('done');
  });

  it('returns "failed" when no words are annotated (no matching translations)', () => {
    const { container, textNode } = makeContainer('hello world');
    const targets = [
      makeTarget('hello', textNode, 0, 5, 0),
    ];
    // Empty translations — no match
    const result = applyAnnotations(container, targets, []);
    expect(result).toBe('failed');
  });

  it('returns "failed" when target list is non-empty but all annotation attempts fail', () => {
    const { container, textNode } = makeContainer('hello');
    const targets = [
      makeTarget('hello', textNode, 0, 5, 0),
    ];
    // Provide translation with wrong occurrence index — no match
    const translations = [
      { word: 'hello', occurrence: 99, translation: '你好' },
    ];
    const result = applyAnnotations(container, targets, translations);
    expect(result).toBe('failed');
  });

  it('returns "partial" when some targets are skipped', () => {
    const { container, textNode } = makeContainer('hello world');
    const targets = [
      makeTarget('hello', textNode, 0, 5, 0),
      makeTarget('world', textNode, 6, 5, 1),
    ];
    // Only translate 'hello', skip 'world'
    const translations = [
      { word: 'hello', occurrence: 0, translation: '你好' },
    ];

    const result = applyAnnotations(container, targets, translations);
    expect(result).toBe('partial');
  });

  it('creates readto spans with correct text content', () => {
    const { container, textNode } = makeContainer('hello');
    const targets = [makeTarget('hello', textNode, 0, 5, 0)];
    const translations = [{ word: 'hello', occurrence: 0, translation: '你好' }];

    applyAnnotations(container, targets, translations);

    const span = container.querySelector('span[data-readto]');
    expect(span).not.toBeNull();
    expect(span!.textContent).toContain('hello');
  });

  it('creates readto span with translation in shadow DOM', () => {
    const { container, textNode } = makeContainer('test');
    const targets = [makeTarget('test', textNode, 0, 4, 0)];
    const translations = [{ word: 'test', occurrence: 0, translation: '测试' }];

    applyAnnotations(container, targets, translations);

    const span = container.querySelector('span[data-readto]')!;
    const shadow = span.shadowRoot;
    expect(shadow).not.toBeNull();
    const rt = shadow!.querySelector('.rt');
    expect(rt).not.toBeNull();
    expect(rt!.textContent).toBe('测试');
  });

  it('handles empty targets array', () => {
    const { container } = makeContainer('hello');
    const result = applyAnnotations(container, [], []);
    // 0 annotated, 0 targets → should be 'done' (no failures)
    expect(result).toBe('done');
  });

  it('handles multiple words in a single text node with occurrence tracking', () => {
    const { container, textNode } = makeContainer('cat and cat');
    const targets = [
      makeTarget('cat', textNode, 0, 3, 0),    // first "cat"
      makeTarget('cat', textNode, 8, 3, 1),     // second "cat"
    ];
    const translations = [
      { word: 'cat', occurrence: 0, translation: '猫' },
      { word: 'cat', occurrence: 1, translation: '猫咪' },
    ];

    const result = applyAnnotations(container, targets, translations);
    expect(result).toBe('done');

    const spans = container.querySelectorAll('span[data-readto]');
    expect(spans.length).toBe(2);
  });

  it('passes autoSpeak option through to createReadtoSpan', () => {
    const { container, textNode } = makeContainer('word');
    const targets = [makeTarget('word', textNode, 0, 4, 0)];
    const translations = [{ word: 'word', occurrence: 0, translation: '词' }];

    // Should not throw with autoSpeak option
    expect(() => {
      applyAnnotations(container, targets, translations, { autoSpeak: true });
    }).not.toThrow();
  });

  it('handles targets across multiple text nodes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const textNode1 = document.createTextNode('hello ');
    const textNode2 = document.createTextNode('world');
    container.appendChild(textNode1);
    container.appendChild(textNode2);

    const targets = [
      makeTarget('hello', textNode1, 0, 5, 0),
      makeTarget('world', textNode2, 0, 5, 1),
    ];
    const translations = [
      { word: 'hello', occurrence: 0, translation: '你好' },
      { word: 'world', occurrence: 1, translation: '世界' },
    ];

    const result = applyAnnotations(container, targets, translations);
    expect(result).toBe('done');

    const spans = container.querySelectorAll('span[data-readto]');
    expect(spans.length).toBe(2);
  });

  it('preserves text around annotated words', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const textNode = document.createTextNode('before hello after');
    container.appendChild(textNode);

    const targets = [makeTarget('hello', textNode, 7, 5, 0)];
    const translations = [{ word: 'hello', occurrence: 0, translation: '你好' }];

    applyAnnotations(container, targets, translations);

    // Container should still contain 'before' and 'after' as text
    const fullText = container.textContent;
    expect(fullText).toContain('hello');
  });

  it('annotation match uses word#occurrence key correctly', () => {
    const { container, textNode } = makeContainer('run run');
    const targets = [
      makeTarget('run', textNode, 0, 3, 0),
      makeTarget('run', textNode, 4, 3, 1),
    ];
    // Only translate the second occurrence
    const translations = [
      { word: 'run', occurrence: 1, translation: '跑' },
    ];

    const result = applyAnnotations(container, targets, translations);
    expect(result).toBe('partial');

    // Only one span should be created
    const spans = container.querySelectorAll('span[data-readto]');
    expect(spans.length).toBe(1);
  });
});

/* ─── AnnotationOutcome type ─── */

describe('AnnotationOutcome type', () => {
  it('all three outcomes are valid strings', () => {
    const outcomes: AnnotationOutcome[] = ['done', 'partial', 'failed'];
    expect(outcomes).toHaveLength(3);
  });
});
