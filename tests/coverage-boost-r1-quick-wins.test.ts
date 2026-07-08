// @vitest-environment jsdom
/**
 * Coverage boost — quick wins Round 1
 *
 * Targets small uncovered branches in already high-coverage files.
 * Only branches with clear, mockable entry points are included here.
 *   - permissions.ts     L26 (non-http scheme) L42, 57, 73 (catch paths)
 *   - storage.ts         L196-198 (getReadableConfig merge)
 *   - error-sanitize.ts  L85 (JSON.stringify throw → Object toString fallback)
 *   - translations.ts    L25 (dictPromise cache hit on concurrent load)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

// Preserve original chrome across tests
const ORIGINAL_CHROME = (globalThis as unknown as { chrome?: unknown }).chrome;
afterEach(() => {
  (globalThis as unknown as { chrome?: unknown }).chrome = ORIGINAL_CHROME;
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
    (globalThis as unknown as { chrome: unknown }).chrome = {
      permissions: { contains: () => { throw new Error('permission API boom'); } },
    };
    const { hasHostPermission } = await import('../src/lib/permissions');
    await expect(hasHostPermission('https://api.example.com')).resolves.toBe(false);
  });

  it('requestHostPermission returns false when chrome.permissions.request throws (L57 catch)', async () => {
    (globalThis as unknown as { chrome: unknown }).chrome = {
      permissions: { request: () => { throw new Error('permission API boom'); } },
    };
    const { requestHostPermission } = await import('../src/lib/permissions');
    await expect(requestHostPermission('https://api.example.com')).resolves.toBe(false);
  });

  // L73 catch is inside the same requestHostPermission function; covered above.
  // (The uncovered range 42/57/73 in the coverage report reflected multiple try/catches
  // but the current source only has hasHostPermission + requestHostPermission catches.)
});

describe('coverage-boost round 1: storage.ts', () => {
  it('getReadableConfig merges settings + llm (L195-198)', async () => {
    const store: Record<string, unknown> = {
      settings: {
        translationMode: 'local',
        cefrLevel: 'B2',
        preferLevelFiltering: true,
      },
      llmConfig: {
        endpoint: 'https://api.example.com/v1/chat/completions',
        apiKey: 'sk-test-1234',
        model: 'gpt-4o-mini',
      },
    };
    // chrome.storage.* .get in this project returns a Promise (MV3 style),
    // NOT a callback. Both getSettings (sync) and getFullConfig (local) await it.
    const syncGet = vi.fn(async (_keys: unknown) => store);
    const localGet = vi.fn(async (_keys: unknown) => store);
    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        sync: { get: syncGet },
        local: { get: localGet },
      },
      runtime: { lastError: undefined },
    };
    const { getReadableConfig } = await import('../src/lib/storage');
    const cfg = await getReadableConfig();
    // Should have both settings shape and llm slot
    expect(cfg).toBeDefined();
    expect(cfg).toHaveProperty('llm');
  });
});

describe('coverage-boost round 1: error-sanitize.ts', () => {
  it('handles error object whose JSON.stringify throws (L85 fallback)', async () => {
    const { sanitizeError } = await import('../src/lib/error-sanitize');
    // Circular reference → JSON.stringify throws
    // Object is NOT a string, NOT null/undefined, has no .message string,
    // so it falls into the JSON.stringify branch (L83).
    const circular: Record<string, unknown> = { name: 'weird' };
    circular.self = circular;
    // Not throwing is the success criterion; result must be a string.
    const out = sanitizeError(circular);
    expect(typeof out.message).toBe('string');
    // "[object Object]" is the toString fallback shape
    expect(out.message).toContain('[object');
  });
});

describe('coverage-boost round 1: translations.ts', () => {
  it('concurrent loadDictionary calls share the same fetch promise (L25 cache branch)', async () => {
    let resolveFetch: (v: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((res) => { resolveFetch = res; }));
    vi.stubGlobal('fetch', fetchMock);
    (globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: { getURL: (p: string) => `chrome-extension://x/${p}` },
    };

    // Import fresh module so the private dictMap/dictPromise start null.
    const { default: localTranslator } = await import('../src/lib/translations');

    // Kick off two concurrent translations — first triggers fetch,
    // second must hit the L25 `if (dictPromise) return dictPromise` branch
    // (because the first fetch hasn't resolved yet).
    const p1 = localTranslator.translate({
      context: 'hello world',
      targets: [{ word: 'hello', occurrence: 1 }],
    });
    const p2 = localTranslator.translate({
      context: 'hello world',
      targets: [{ word: 'world', occurrence: 1 }],
    });

    // Resolve fetch with an empty dict so both promises settle
    resolveFetch(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await Promise.all([p1, p2]);
    // Cache branch proof: fetch fired exactly once despite two concurrent calls
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
