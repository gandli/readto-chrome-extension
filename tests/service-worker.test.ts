/**
 * Tests for service-worker.ts — message handler, rate limiting, local dict, lifecycle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks (available before vi.mock hoisting) ────────────────
const { mockInitStorage, mockStreamBatch } = vi.hoisted(() => ({
  mockInitStorage: vi.fn(),
  mockStreamBatch: vi.fn(),
}));

// ── Chrome & fetch mocks ──────────────────────────────────────────────
const mockGetURL = vi.fn((path: string) => `chrome-extension://id/${path}`);
const mockOnMessageAddListener = vi.fn();
const mockOnInstalledAddListener = vi.fn();
const mockOnStartupAddListener = vi.fn();
const mockActionOnClickedAddListener = vi.fn();
const mockOpenOptionsPage = vi.fn();
const mockSessionGet = vi.fn().mockResolvedValue({});
const mockSessionSet = vi.fn().mockResolvedValue(undefined);
const mockFetch = vi.fn();

(globalThis as any).fetch = mockFetch;
(globalThis as any).chrome = {
  runtime: {
    getURL: mockGetURL,
    onMessage: { addListener: mockOnMessageAddListener },
    onInstalled: { addListener: mockOnInstalledAddListener },
    onStartup: { addListener: mockOnStartupAddListener },
    openOptionsPage: mockOpenOptionsPage,
  },
  action: {
    onClicked: { addListener: mockActionOnClickedAddListener },
  },
  storage: {
    session: { get: mockSessionGet, set: mockSessionSet },
  },
};

// ── Module mocks ──────────────────────────────────────────────────────
vi.mock('../src/lib/storage', () => ({
  initStorage: mockInitStorage,
  getReadableConfig: vi.fn(),
  isFullConfig: vi.fn(),
}));

vi.mock('../src/lib/llm-stream', () => ({
  streamBatch: mockStreamBatch,
}));

// ── Test helpers ──────────────────────────────────────────────────────

let messageHandler: (msg: any, sender: any, sendResponse: Function) => boolean | void;
let installedHandler: (details: { reason: string }) => void;

/** Send a message to the service worker handler and capture the response. */
function callHandler(msg: any): Promise<any> {
  return new Promise((resolve) => {
    messageHandler(msg, {}, resolve);
  });
}

const LLM_CFG = {
  translationMode: 'llm',
  endpoint: 'https://api.openai.com',
  model: 'gpt-4',
  apiKey: 'sk-test',
};

// ── Setup / Teardown ──────────────────────────────────────────────────

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.resetAllMocks(); // clear both call history AND implementations

  mockSessionGet.mockResolvedValue({});
  mockSessionSet.mockResolvedValue(undefined);
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  mockStreamBatch.mockResolvedValue([]);

  // Import the service worker — this registers all listeners
  await import('../src/background/service-worker');

  // Extract registered listeners
  messageHandler = mockOnMessageAddListener.mock.calls[0][0];
  installedHandler = mockOnInstalledAddListener.mock.calls[0][0];
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════
// GET_WORD_DETAIL
// ═══════════════════════════════════════════════════════════════════════

describe('GET_WORD_DETAIL', () => {
  it('returns detail for a known word', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        apple: {
          p: 'ˈæp.əl',
          t: 'n. 苹果',
          e: [{ en: 'I eat an apple', zh: '我吃一个苹果' }],
        },
      }),
    });

    const response = await callHandler({ type: 'GET_WORD_DETAIL', word: 'apple' });

    expect(response).toEqual({
      ok: true,
      detail: {
        p: 'ˈæp.əl',
        t: 'n. 苹果',
        e: [{ en: 'I eat an apple', zh: '我吃一个苹果' }],
      },
    });
    expect(mockGetURL).toHaveBeenCalledWith('/assets/detail/a.json');
    expect(mockFetch).toHaveBeenCalledWith('chrome-extension://id//assets/detail/a.json');
  });

  it('returns null detail for an unknown word', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const response = await callHandler({ type: 'GET_WORD_DETAIL', word: 'zzzzz' });

    expect(response).toEqual({ ok: true, detail: null });
  });

  it('caches letter file — does not re-fetch for same letter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        apple: { p: 'ˈæp.əl' },
        ant: { p: 'ænt' },
      }),
    });

    await callHandler({ type: 'GET_WORD_DETAIL', word: 'apple' });
    await callHandler({ type: 'GET_WORD_DETAIL', word: 'ant' });

    // Only one fetch for 'a.json' despite two lookups
    const detailFetches = mockFetch.mock.calls.filter((c: any[]) =>
      c[0].includes('/assets/detail/'),
    );
    expect(detailFetches).toHaveLength(1);
  });

  it('caches letter file — different letters fetch separately', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('a.json')) return { ok: true, json: async () => ({ apple: { p: 'ˈæp.əl' } }) };
      if (url.includes('b.json')) return { ok: true, json: async () => ({ book: { p: 'bʊk' } }) };
      return { ok: true, json: async () => ({}) };
    });

    await callHandler({ type: 'GET_WORD_DETAIL', word: 'apple' });
    await callHandler({ type: 'GET_WORD_DETAIL', word: 'book' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockGetURL).toHaveBeenCalledWith('/assets/detail/a.json');
    expect(mockGetURL).toHaveBeenCalledWith('/assets/detail/b.json');
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const response = await callHandler({ type: 'GET_WORD_DETAIL', word: 'apple' });

    expect(response.ok).toBe(false);
    expect(response.error).toContain('Network error');
  });

  it('handles non-OK response status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const response = await callHandler({ type: 'GET_WORD_DETAIL', word: 'apple' });

    expect(response.ok).toBe(false);
    expect(response.error).toContain('404');
  });

  it('normalises word to lowercase for lookup', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ apple: { p: 'ˈæp.əl' } }),
    });

    const response = await callHandler({ type: 'GET_WORD_DETAIL', word: 'APPLE' });

    expect(response).toEqual({ ok: true, detail: { p: 'ˈæp.əl' } });
    // Still fetches 'a.json' (first letter lowercased)
    expect(mockGetURL).toHaveBeenCalledWith('/assets/detail/a.json');
  });

  it('rejects malformed GET_WORD_DETAIL (missing word)', async () => {
    const response = await callHandler({ type: 'GET_WORD_DETAIL' });

    expect(response).toEqual({ ok: false, error: 'malformed GET_WORD_DETAIL' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects GET_WORD_DETAIL with non-string word', async () => {
    const response = await callHandler({ type: 'GET_WORD_DETAIL', word: 42 });

    expect(response).toEqual({ ok: false, error: 'malformed GET_WORD_DETAIL' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TRANSLATE_MANY — local mode
// ═══════════════════════════════════════════════════════════════════════

describe('TRANSLATE_MANY local mode', () => {
  const LOCAL_CFG = { translationMode: 'local' };

  it('translates known words using local dictionary', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hello: '你好', world: '世界' }),
    });

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [
        {
          context: 'hello world',
          targets: [
            { word: 'hello', occurrence: 0 },
            { word: 'world', occurrence: 0 },
          ],
        },
      ],
      cfg: LOCAL_CFG,
    });

    expect(response.ok).toBe(true);
    expect(response.results).toEqual([
      [
        { word: 'hello', occurrence: 0, translation: '你好' },
        { word: 'world', occurrence: 0, translation: '世界' },
      ],
    ]);
  });

  it('returns empty array for unknown words', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hello: '你好' }),
    });

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [
        {
          context: 'foobar baz',
          targets: [
            { word: 'foobar', occurrence: 0 },
            { word: 'baz', occurrence: 0 },
          ],
        },
      ],
      cfg: LOCAL_CFG,
    });

    expect(response.ok).toBe(true);
    expect(response.results).toEqual([[]]);
  });

  it('performs case-insensitive lookup', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hello: '你好' }),
    });

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [
        {
          context: 'HELLO',
          targets: [{ word: 'HELLO', occurrence: 0 }],
        },
      ],
      cfg: LOCAL_CFG,
    });

    expect(response.ok).toBe(true);
    expect(response.results).toEqual([[{ word: 'hello', occurrence: 0, translation: '你好' }]]);
  });

  it('loads dictionary from correct chrome extension path', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ a: '一' }),
    });

    await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'a', targets: [{ word: 'a', occurrence: 0 }] }],
      cfg: LOCAL_CFG,
    });

    expect(mockGetURL).toHaveBeenCalledWith('assets/translations-data.json');
    expect(mockFetch).toHaveBeenCalledWith('chrome-extension://id/assets/translations-data.json');
  });

  it('caches dictionary — only one fetch across multiple calls', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hello: '你好', world: '世界' }),
    });

    await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'a', targets: [{ word: 'hello', occurrence: 0 }] }],
      cfg: LOCAL_CFG,
    });
    await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'b', targets: [{ word: 'world', occurrence: 0 }] }],
      cfg: LOCAL_CFG,
    });

    const dictFetches = mockFetch.mock.calls.filter((c: any[]) =>
      c[0].includes('translations-data.json'),
    );
    expect(dictFetches).toHaveLength(1);
  });

  it('handles dictionary load failure gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [
        {
          context: 'hello',
          targets: [{ word: 'hello', occurrence: 0 }],
        },
      ],
      cfg: LOCAL_CFG,
    });

    // loadLocalDict catches internally and returns empty map
    expect(response.ok).toBe(true);
    expect(response.results).toEqual([[]]);
  });

  it('handles multiple paragraphs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hello: '你好', book: '书' }),
    });

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [
        { context: 'hello', targets: [{ word: 'hello', occurrence: 0 }] },
        { context: 'book', targets: [{ word: 'book', occurrence: 0 }] },
      ],
      cfg: LOCAL_CFG,
    });

    expect(response.ok).toBe(true);
    expect(response.results).toEqual([
      [{ word: 'hello', occurrence: 0, translation: '你好' }],
      [{ word: 'book', occurrence: 0, translation: '书' }],
    ]);
  });

  it('rejects malformed TRANSLATE_MANY (missing items)', async () => {
    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      cfg: LOCAL_CFG,
    });

    expect(response).toEqual({ ok: false, error: 'malformed TRANSLATE_MANY' });
  });

  it('rejects malformed TRANSLATE_MANY (missing cfg)', async () => {
    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [],
    });

    expect(response).toEqual({ ok: false, error: 'malformed TRANSLATE_MANY' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TRANSLATE_MANY — LLM mode (validation)
// ═══════════════════════════════════════════════════════════════════════

describe('TRANSLATE_MANY LLM mode', () => {
  it('validates batch size limits (200 max targets)', async () => {
    const targets = Array.from({ length: 201 }, (_, i) => ({
      word: `word${i}`,
      occurrence: 0,
    }));

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'test', targets }],
      cfg: LLM_CFG,
    });

    expect(response.ok).toBe(false);
    expect(response.error).toContain('201 targets');
    expect(response.error).toContain('200');
    // streamBatch should never be called
    expect(mockStreamBatch).not.toHaveBeenCalled();
  });

  it('allows exactly 200 targets', async () => {
    const targets = Array.from({ length: 200 }, (_, i) => ({
      word: `word${i}`,
      occurrence: 0,
    }));
    mockStreamBatch.mockResolvedValue([targets.map((t) => ({ ...t, translation: '翻译' }))]);

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'test', targets }],
      cfg: LLM_CFG,
    });

    expect(response.ok).toBe(true);
    expect(mockStreamBatch).toHaveBeenCalled();
  });

  it('validates prompt size limit (120K chars)', async () => {
    // estimatePromptSize = context.length + (word.length + 25) per target
    // 120001 + (4+25) = 120030 > 120000
    const largeContext = 'x'.repeat(120_001);

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: largeContext, targets: [{ word: 'test', occurrence: 0 }] }],
      cfg: LLM_CFG,
    });

    expect(response.ok).toBe(false);
    expect(response.error).toContain('120000');
    expect(mockStreamBatch).not.toHaveBeenCalled();
  });

  it('calls streamBatch on valid input', async () => {
    mockStreamBatch.mockResolvedValue([
      [{ word: 'hello', occurrence: 0, translation: '你好' }],
    ]);

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [
        {
          context: 'hello world',
          targets: [{ word: 'hello', occurrence: 0 }],
        },
      ],
      cfg: LLM_CFG,
    });

    expect(response.ok).toBe(true);
    expect(response.results).toEqual([
      [{ word: 'hello', occurrence: 0, translation: '你好' }],
    ]);
    expect(mockStreamBatch).toHaveBeenCalledTimes(1);
  });

  it('returns streamBatch error to caller', async () => {
    mockStreamBatch.mockRejectedValue(new Error('LLM connection failed'));

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [
        {
          context: 'test',
          targets: [{ word: 'test', occurrence: 0 }],
        },
      ],
      cfg: LLM_CFG,
    });

    expect(response.ok).toBe(false);
    expect(response.error).toContain('LLM connection failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Rate limiting
// ═══════════════════════════════════════════════════════════════════════

describe('rate limiting', () => {
  it('saves timestamp to session storage after successful LLM call', async () => {
    const now = 1_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'test', targets: [{ word: 'hello', occurrence: 0 }] }],
      cfg: LLM_CFG,
    });

    expect(response.ok).toBe(true);
    expect(mockSessionSet).toHaveBeenCalledWith({ llmRateTimestamps: [now] });
  });

  it('reads existing timestamps from session storage', async () => {
    const now = 1_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const oldTimestamps = [now - 40_000, now - 30_000];
    mockSessionGet.mockResolvedValue({ llmRateTimestamps: oldTimestamps });

    await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'test', targets: [{ word: 'hello', occurrence: 0 }] }],
      cfg: LLM_CFG,
    });

    // Should save old timestamps + new one
    expect(mockSessionSet).toHaveBeenCalledWith({
      llmRateTimestamps: [...oldTimestamps, now],
    });
  });

  it('filters out timestamps older than 60s window', async () => {
    const now = 1_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const oldTimestamps = [
      now - 61_000, // outside window
      now - 59_000, // inside window
    ];
    mockSessionGet.mockResolvedValue({ llmRateTimestamps: oldTimestamps });

    await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'test', targets: [{ word: 'hello', occurrence: 0 }] }],
      cfg: LLM_CFG,
    });

    // Should only keep the one inside the window + new one
    expect(mockSessionSet).toHaveBeenCalledWith({
      llmRateTimestamps: [now - 59_000, now],
    });
  });

  it('rejects when 60 requests within window', async () => {
    const now = 1_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    // 60 timestamps all within the last 30 seconds
    const timestamps = Array.from({ length: 60 }, (_, i) => now - i * 500);
    mockSessionGet.mockResolvedValue({ llmRateTimestamps: timestamps });

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'test', targets: [{ word: 'hello', occurrence: 0 }] }],
      cfg: LLM_CFG,
    });

    expect(response.ok).toBe(false);
    expect(response.error).toContain('rate-limit');
    expect(mockStreamBatch).not.toHaveBeenCalled();
  });

  it('allows request when exactly at boundary (59 within window)', async () => {
    const now = 1_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    // 59 timestamps within window (under the 60 limit)
    const timestamps = Array.from({ length: 59 }, (_, i) => now - i * 500);
    mockSessionGet.mockResolvedValue({ llmRateTimestamps: timestamps });
    mockStreamBatch.mockResolvedValue([[]]);

    const response = await callHandler({
      type: 'TRANSLATE_MANY',
      items: [{ context: 'test', targets: [{ word: 'hello', occurrence: 0 }] }],
      cfg: LLM_CFG,
    });

    expect(response.ok).toBe(true);
    expect(mockStreamBatch).toHaveBeenCalled();
  });

  it('handles missing session storage gracefully', async () => {
    // Simulate no session storage available
    const origSession = (globalThis as any).chrome.storage.session;
    (globalThis as any).chrome.storage.session = undefined;

    // Need to re-import since session storage is checked at call time via globalThis
    vi.resetModules();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    mockStreamBatch.mockResolvedValue([]);
    await import('../src/background/service-worker');
    const handler = mockOnMessageAddListener.mock.calls[mockOnMessageAddListener.mock.calls.length - 1][0];

    const response = await new Promise<any>((resolve) => {
      handler(
        {
          type: 'TRANSLATE_MANY',
          items: [{ context: 'test', targets: [{ word: 'hello', occurrence: 0 }] }],
          cfg: LLM_CFG,
        },
        {},
        resolve,
      );
    });

    // Should succeed — no session storage means no rate limit timestamps
    expect(response.ok).toBe(true);

    // Restore session storage
    (globalThis as any).chrome.storage.session = origSession;
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Message handler — general
// ═══════════════════════════════════════════════════════════════════════

describe('message handler (general)', () => {
  it('ignores null messages', () => {
    const sendResponse = vi.fn();
    messageHandler(null, {}, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('ignores string messages', () => {
    const sendResponse = vi.fn();
    messageHandler('string', {}, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('ignores number messages', () => {
    const sendResponse = vi.fn();
    messageHandler(42, {}, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('ignores unknown message types', () => {
    const sendResponse = vi.fn();
    messageHandler({ type: 'UNKNOWN_TYPE' }, {}, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('returns true for async GET_WORD_DETAIL (keep channel open)', () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const sendResponse = vi.fn();
    const result = messageHandler({ type: 'GET_WORD_DETAIL', word: 'test' }, {}, sendResponse);
    expect(result).toBe(true);
  });

  it('returns true for async TRANSLATE_MANY (keep channel open)', () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const sendResponse = vi.fn();
    const result = messageHandler(
      { type: 'TRANSLATE_MANY', items: [], cfg: { translationMode: 'local' } },
      {},
      sendResponse,
    );
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Lifecycle
// ═══════════════════════════════════════════════════════════════════════

describe('lifecycle', () => {
  it('onInstalled calls initStorage on install', () => {
    installedHandler({ reason: 'install' });
    expect(mockInitStorage).toHaveBeenCalled();
  });

  it('onInstalled opens options page on first install', () => {
    installedHandler({ reason: 'install' });
    expect(mockOpenOptionsPage).toHaveBeenCalled();
  });

  it('onInstalled calls initStorage on update but does not open options', () => {
    installedHandler({ reason: 'update' });
    expect(mockInitStorage).toHaveBeenCalled();
    expect(mockOpenOptionsPage).not.toHaveBeenCalled();
  });

  it('onInstalled calls initStorage on chrome_update', () => {
    installedHandler({ reason: 'chrome_update' });
    expect(mockInitStorage).toHaveBeenCalled();
  });

  it('onStartup calls initStorage', () => {
    const startupHandler = mockOnStartupAddListener.mock.calls[0]?.[0];
    expect(startupHandler).toBeDefined();
    startupHandler();
    expect(mockInitStorage).toHaveBeenCalled();
  });

  it('action.onClicked opens options page', () => {
    const clickHandler = mockActionOnClickedAddListener.mock.calls[0]?.[0];
    expect(clickHandler).toBeDefined();
    clickHandler();
    expect(mockOpenOptionsPage).toHaveBeenCalled();
  });
});
