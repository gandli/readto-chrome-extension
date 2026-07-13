// @vitest-environment jsdom
/**
 * Coverage boost — quick wins Round 1
 *
 * Targets small uncovered branches in already high-coverage files.
 * Uses vi.stubGlobal() (recommended by Gemini review) so cleanup is automatic
 * via vi.unstubAllGlobals() and there's no risk of state leaking across tests.
 *
 *   - permissions.ts     L26 (non-http scheme) L42, 57 (chrome API catches)
 *   - storage.ts         L195-198 (getReadableConfig merges real settings + llm)
 *   - error-sanitize.ts  L85 (JSON.stringify throw → toString fallback)
 *   - translations.ts    L25 (dictPromise cache hit on concurrent load)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('coverage-boost round 1: permissions.ts', () => {
  it('endpointOriginPattern returns null for non-http(s) scheme (L26)', async () => {
    const { endpointOriginPattern } = await import('../src/lib/permissions');
    expect(endpointOriginPattern('ftp://example.com/foo')).toBeNull();
    expect(endpointOriginPattern('file:///etc/passwd')).toBeNull();
    expect(endpointOriginPattern('data:text/plain,hi')).toBeNull();
  });

  it('endpointOriginPattern returns null for empty / malformed input', async () => {
    const { endpointOriginPattern } = await import('../src/lib/permissions');
    expect(endpointOriginPattern('')).toBeNull();
    expect(endpointOriginPattern('not a url at all')).toBeNull();
  });

  it('hasHostPermission returns false when chrome.permissions.contains throws (L42 catch)', async () => {
    vi.stubGlobal('chrome', {
      permissions: { contains: () => { throw new Error('permission API boom'); } },
    });
    const { hasHostPermission } = await import('../src/lib/permissions');
    await expect(hasHostPermission('https://api.example.com')).resolves.toBe(false);
  });

  it('requestHostPermission returns false when chrome.permissions.request throws (L57 catch)', async () => {
    vi.stubGlobal('chrome', {
      permissions: { request: () => { throw new Error('permission API boom'); } },
    });
    const { requestHostPermission } = await import('../src/lib/permissions');
    await expect(requestHostPermission('https://api.example.com')).resolves.toBe(false);
  });
});

describe('coverage-boost round 1: storage.ts', () => {
  it('getReadableConfig returns real settings + llm merged from storage (L195-198)', async () => {
    // Match the actual chrome.storage.* shape the module reads:
    // - sync: 'level' | 'translationMode' | 'autoSpeak' (see storage.ts:66)
    // - local: 'llmConfig' (STORAGE_KEY_CONFIG)
    //          'llmApiKey' (STORAGE_KEY_API_KEY) — apiKey is stored SEPARATELY
    const syncStore: Record<string, unknown> = {
      level: 'B2',
      translationMode: 'llm',
      autoSpeak: true,
    };
    const localStore: Record<string, unknown> = {
      llmConfig: {
        endpoint: 'https://api.example.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        hasApiKey: true,
      },
      llmApiKey: 'sk-test-1234',
    };

    const filter = (store: Record<string, unknown>, keys: unknown): Record<string, unknown> => {
      if (typeof keys === 'string') return { [keys]: store[keys] };
      if (Array.isArray(keys)) {
        const out: Record<string, unknown> = {};
        for (const k of keys) if (k in store) out[k as string] = store[k as string];
        return out;
      }
      return { ...store };
    };

    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: vi.fn(async (keys: unknown) => filter(syncStore, keys)),
        },
        local: {
          get: vi.fn(async (keys: unknown) => filter(localStore, keys)),
          set: vi.fn(async () => undefined),
          remove: vi.fn(async () => undefined),
        },
      },
      runtime: { lastError: undefined },
    });

    const { getReadableConfig } = await import('../src/lib/storage');
    const cfg = await getReadableConfig();

    // getReadableConfig destructures { level, translationMode, autoSpeak } from
    // getSettings() then spreads { ...settings, llm } from getLlmConfig().
    // NOTE: the `llm` variable inside getReadableConfig is the ENTIRE FullConfig
    // object (getLlmConfig returns FullConfig, not LlmConfig) — a naming quirk in
    // storage.ts:196-197. So cfg.llm.llm is the real LlmConfig block. We assert
    // both the outer shape (level/translationMode) and the nested llm details.
    expect(cfg.level).toBe('B2');
    expect(cfg.translationMode).toBe('llm');
    expect(cfg.autoSpeak).toBe(true);
    // cfg.llm is a FullConfig; its .llm slot is the real LlmConfig
    const inner = (cfg.llm as unknown as { llm: unknown | null }).llm;
    expect(inner).toEqual({
      endpoint: 'https://api.example.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test-1234',
    });
  });

  it('getReadableConfig returns null inner llm when llmConfig is missing', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        sync: { get: vi.fn(async () => ({ level: 'A2', translationMode: 'local', autoSpeak: false })) },
        local: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
          remove: vi.fn(async () => undefined),
        },
      },
      runtime: { lastError: undefined },
    });
    const { getReadableConfig } = await import('../src/lib/storage');
    const cfg = await getReadableConfig();
    // Same naming quirk — the outer .llm is a FullConfig object; check inner slot
    const inner = (cfg.llm as unknown as { llm: unknown | null }).llm;
    expect(inner).toBeNull();
    expect(cfg.translationMode).toBe('local');
  });
});

describe('coverage-boost round 1: error-sanitize.ts', () => {
  it('handles error object whose JSON.stringify throws (L85 fallback)', async () => {
    const { sanitizeError } = await import('../src/lib/error-sanitize');
    // Circular reference → JSON.stringify throws → toString fallback path
    const circular: Record<string, unknown> = { name: 'weird' };
    circular.self = circular;
    const out = sanitizeError(circular);
    expect(typeof out.message).toBe('string');
    expect(out.message).toContain('[object');
  });
});

describe('coverage-boost round 1: translations.ts', () => {
  it('concurrent loadDictionary calls share the same fetch promise (L25 cache branch)', async () => {
    let resolveFetch: (v: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((res) => { resolveFetch = res; }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('chrome', {
      runtime: { getURL: (p: string) => `chrome-extension://x/${p}` },
    });

    const { default: localTranslator } = await import('../src/lib/translations');

    // Two concurrent calls — first sets dictPromise, second must hit
    // L25 `if (dictPromise) return dictPromise` cache branch
    // (because the first fetch hasn't resolved yet).
    const p1 = localTranslator.translate({
      context: 'hello world',
      targets: [{ word: 'hello', occurrence: 1 }],
    });
    const p2 = localTranslator.translate({
      context: 'hello world',
      targets: [{ word: 'world', occurrence: 1 }],
    });

    resolveFetch(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await Promise.all([p1, p2]);
    // Cache branch proof: fetch fired exactly once despite two concurrent calls
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
