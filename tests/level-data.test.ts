/**
 * Comprehensive tests for level-data.ts
 *
 * Tests:
 *  1. loadLevelData success (fetch + chrome.runtime.getURL)
 *  2. Caching (second call reuses cached map, no re-fetch)
 *  3. Parallel calls (concurrent loadLevelData calls share same promise)
 *  4. Fetch error handling (non-ok response, network error)
 *  5. getWordLevelMap delegates to loadLevelData
 *  6. getWordLevelMapSync returns null before load, map after
 *  7. Fallback on error (returns empty map)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Reset module-level singletons between tests ── */
// level-data.ts caches wordLevelMap and loadPromise at module scope.
// We use vi.resetModules() + dynamic import so each test gets fresh state
// when needed.

const TEST_DICT: Record<string, string> = {
  hello: 'A1', world: 'A1', the: 'A1',
  important: 'A2', different: 'A2',
  ambitious: 'B1', sustainable: 'B1',
  ubiquitous: 'B2', exacerbate: 'B2',
  ephemeral: 'C1', obfuscate: 'C1',
  defenestrate: 'C2',
};

let fetchSpy: ReturnType<typeof vi.fn>;
let getURLSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();

  // Set up chrome.runtime.getURL
  getURLSpy = vi.fn((path: string) => `chrome-extension://abc/${path}`);
  (globalThis as any).chrome = {
    runtime: { getURL: getURLSpy },
  };

  // Set up fetch spy — returns TEST_DICT by default
  fetchSpy = vi.fn(async () => ({
    ok: true,
    json: async () => TEST_DICT,
  }));
  (globalThis as any).fetch = fetchSpy;
});

/* ─── loadLevelData ─── */

describe('loadLevelData', () => {
  it('fetches from chrome.runtime.getURL and returns a Map', async () => {
    const { loadLevelData } = await import('../src/lib/level-data');
    const map = await loadLevelData();

    // Should have called chrome.runtime.getURL with the asset path
    expect(getURLSpy).toHaveBeenCalledWith('assets/level-data-full.json');

    // Should have called fetch with the extension URL
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchSpy.mock.calls[0][0];
    expect(fetchUrl).toBe('chrome-extension://abc/assets/level-data-full.json');

    // Should return a Map with all entries
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(Object.keys(TEST_DICT).length);
    expect(map.get('hello')).toBe('A1');
    expect(map.get('defenestrate')).toBe('C2');
  });

  it('caches the result — second call does not re-fetch', async () => {
    const { loadLevelData } = await import('../src/lib/level-data');

    const map1 = await loadLevelData();
    const map2 = await loadLevelData();

    // Only one fetch call
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // Same Map reference
    expect(map1).toBe(map2);
  });

  it('deduplicates concurrent calls — only one fetch', async () => {
    const { loadLevelData } = await import('../src/lib/level-data');

    const [map1, map2, map3] = await Promise.all([
      loadLevelData(),
      loadLevelData(),
      loadLevelData(),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(map1).toBe(map2);
    expect(map2).toBe(map3);
  });

  it('returns empty map when fetch returns non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { loadLevelData } = await import('../src/lib/level-data');

    const map = await loadLevelData();

    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns empty map when fetch throws a network error', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { loadLevelData } = await import('../src/lib/level-data');

    const map = await loadLevelData();

    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns empty map when response.json() throws', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token'); },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { loadLevelData } = await import('../src/lib/level-data');

    const map = await loadLevelData();

    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
    consoleSpy.mockRestore();
  });

  it('logs success message with word count', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { loadLevelData } = await import('../src/lib/level-data');

    await loadLevelData();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${Object.keys(TEST_DICT).length}`)
    );
    logSpy.mockRestore();
  });

  it('caches error result — subsequent calls after error do not re-fetch', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network'));

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { loadLevelData } = await import('../src/lib/level-data');

    const map1 = await loadLevelData();
    expect(map1.size).toBe(0);

    // Second call should also return the cached empty map, not re-fetch
    const map2 = await loadLevelData();
    expect(map2.size).toBe(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

/* ─── getWordLevelMap ─── */

describe('getWordLevelMap', () => {
  it('delegates to loadLevelData', async () => {
    const { getWordLevelMap } = await import('../src/lib/level-data');
    const map = await getWordLevelMap();

    expect(map).toBeInstanceOf(Map);
    expect(map.get('hello')).toBe('A1');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

/* ─── getWordLevelMapSync ─── */

describe('getWordLevelMapSync', () => {
  it('returns null before loadLevelData is called', async () => {
    const { getWordLevelMapSync } = await import('../src/lib/level-data');
    expect(getWordLevelMapSync()).toBeNull();
  });

  it('returns the map after loadLevelData completes', async () => {
    const { loadLevelData, getWordLevelMapSync } = await import('../src/lib/level-data');

    expect(getWordLevelMapSync()).toBeNull();

    await loadLevelData();

    const map = getWordLevelMapSync();
    expect(map).toBeInstanceOf(Map);
    expect(map!.get('hello')).toBe('A1');
  });

  it('returns empty map after a failed load', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('fail'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { loadLevelData, getWordLevelMapSync } = await import('../src/lib/level-data');

    await loadLevelData();

    const map = getWordLevelMapSync();
    expect(map).toBeInstanceOf(Map);
    expect(map!.size).toBe(0);
  });
});

/* ─── LEVEL_DATA_JSON (backward compat default export) ─── */

describe('LEVEL_DATA_JSON default export', () => {
  it('is an empty object', async () => {
    const mod = await import('../src/lib/level-data');
    // default export is LEVEL_DATA_JSON
    expect(mod.default).toEqual({});
  });
});

/* ─── Edge cases ─── */

describe('edge cases', () => {
  it('handles an empty JSON dictionary', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { loadLevelData } = await import('../src/lib/level-data');
    const map = await loadLevelData();

    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });

  it('handles a very large dictionary', async () => {
    const bigDict: Record<string, string> = {};
    for (let i = 0; i < 10000; i++) {
      bigDict[`word${i}`] = 'B1';
    }
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => bigDict,
    });

    const { loadLevelData } = await import('../src/lib/level-data');
    const map = await loadLevelData();

    expect(map.size).toBe(10000);
    expect(map.get('word5000')).toBe('B1');
  });

  it('preserves exact keys from JSON (case-sensitive storage)', async () => {
    const caseDict = { Hello: 'A1', HELLO: 'A1', hello: 'A1' };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => caseDict,
    });

    const { loadLevelData } = await import('../src/lib/level-data');
    const map = await loadLevelData();

    // All three variants stored separately
    expect(map.size).toBe(3);
    expect(map.has('Hello')).toBe(true);
    expect(map.has('HELLO')).toBe(true);
    expect(map.has('hello')).toBe(true);
  });
});
