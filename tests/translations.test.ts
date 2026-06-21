/**
 * Tests for translations.ts — translator factory & local dictionary translator.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Chrome & fetch mocks ──────────────────────────────────────────────
const mockGetURL = vi.fn((path: string) => `chrome-extension://id/${path}`);
const mockFetch = vi.fn();

(globalThis as any).chrome = {
  runtime: { getURL: mockGetURL },
};
(globalThis as any).fetch = mockFetch;

// ── Import after mocks are in place ───────────────────────────────────
// We re-import the module in each test group after resetting modules so
// the module-level caching variables (dictMap / dictPromise) are fresh.
let localTranslator: typeof import('../src/lib/translations').default;
let getTranslator: typeof import('../src/lib/translations').getTranslator;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  // Default: fetch returns a small dictionary
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      hello: '你好',
      world: '世界',
      good: '好',
      morning: '早上好',
    }),
  });

  const mod = await import('../src/lib/translations');
  localTranslator = mod.default;
  getTranslator = mod.getTranslator;
});

// ── getTranslator factory ─────────────────────────────────────────────

describe('getTranslator', () => {
  it('returns local translator for "local" mode', () => {
    const t = getTranslator({ translationMode: 'local' });
    expect(t.kind).toBe('local');
  });

  it('returns LLM translator for "llm" mode', () => {
    const t = getTranslator({
      translationMode: 'llm',
      llm: { endpoint: 'https://api.openai.com', model: 'gpt-4', apiKey: 'sk-x' },
    });
    expect(t.kind).toBe('llm');
  });

  it('local mode translator is the default export', () => {
    const t = getTranslator({ translationMode: 'local' });
    expect(t).toBe(localTranslator);
  });
});

// ── localTranslator.translate ─────────────────────────────────────────

describe('localTranslator', () => {
  it('has kind "local"', () => {
    expect(localTranslator.kind).toBe('local');
  });

  it('looks up words in the dictionary', async () => {
    const results = await localTranslator.translate({
      context: 'Hello world',
      targets: [
        { word: 'hello', occurrence: 0 },
        { word: 'world', occurrence: 0 },
      ],
    });

    expect(results).toEqual([
      { word: 'hello', occurrence: 0, translation: '你好' },
      { word: 'world', occurrence: 0, translation: '世界' },
    ]);
  });

  it('returns empty array for unknown words', async () => {
    const results = await localTranslator.translate({
      context: 'foobar baz',
      targets: [
        { word: 'foobar', occurrence: 0 },
        { word: 'baz', occurrence: 1 },
      ],
    });

    expect(results).toEqual([]);
  });

  it('handles case-insensitive lookup', async () => {
    const results = await localTranslator.translate({
      context: 'HELLO World',
      targets: [
        { word: 'HELLO', occurrence: 0 },
        { word: 'World', occurrence: 0 },
      ],
    });

    expect(results).toEqual([
      { word: 'hello', occurrence: 0, translation: '你好' },
      { word: 'world', occurrence: 0, translation: '世界' },
    ]);
  });

  it('preserves occurrence numbers', async () => {
    const results = await localTranslator.translate({
      context: 'hello hello',
      targets: [
        { word: 'hello', occurrence: 0 },
        { word: 'hello', occurrence: 1 },
      ],
    });

    expect(results).toHaveLength(2);
    expect(results[0].occurrence).toBe(0);
    expect(results[1].occurrence).toBe(1);
  });

  it('returns empty when no targets match', async () => {
    const results = await localTranslator.translate({
      context: 'xyz',
      targets: [{ word: 'xyz', occurrence: 0 }],
    });

    expect(results).toEqual([]);
  });

  it('handles empty targets array', async () => {
    const results = await localTranslator.translate({
      context: '',
      targets: [],
    });

    expect(results).toEqual([]);
  });
});

// ── Dictionary loading & caching ──────────────────────────────────────

describe('dictionary loading', () => {
  it('loads dictionary from chrome.runtime.getURL path', async () => {
    await localTranslator.translate({
      context: 'test',
      targets: [{ word: 'hello', occurrence: 0 }],
    });

    expect(mockGetURL).toHaveBeenCalledWith('assets/translations-data.json');
    expect(mockFetch).toHaveBeenCalledWith('chrome-extension://id/assets/translations-data.json');
  });

  it('loads dictionary only once across multiple calls (caching)', async () => {
    await localTranslator.translate({
      context: 'a',
      targets: [{ word: 'hello', occurrence: 0 }],
    });
    await localTranslator.translate({
      context: 'b',
      targets: [{ word: 'world', occurrence: 0 }],
    });

    // fetch should have been called exactly once despite two translate() calls
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty map on fetch failure (graceful fallback)', async () => {
    // Reset modules and set up a failing fetch
    vi.resetModules();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const mod = await import('../src/lib/translations');
    const results = await mod.default.translate({
      context: 'hello',
      targets: [{ word: 'hello', occurrence: 0 }],
    });

    expect(results).toEqual([]);
  });

  it('returns empty map on network error (graceful fallback)', async () => {
    vi.resetModules();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const mod = await import('../src/lib/translations');
    const results = await mod.default.translate({
      context: 'hello',
      targets: [{ word: 'hello', occurrence: 0 }],
    });

    expect(results).toEqual([]);
  });
});
