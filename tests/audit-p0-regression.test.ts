/**
 * Regression tests for audit findings P0-2 and P0-3.
 *
 * P0-2: `service-worker.ts` originally cast the raw JSON dictionary to
 *       `Map<string, WordDetail>` without validation, letting malformed
 *       entries reach downstream callers. We now use zod + `safeParse`
 *       and silently drop malformed rows.
 *
 * P0-3: `level-filter.ts::getTooltipCssUrl` originally treated the
 *       `web_accessible_resources` manifest entries as `{ resources }` objects
 *       only. The MV3 spec allows string entries too; when Chrome or a
 *       tool emits the string form, the old code crashed with
 *       `Cannot read properties of undefined (reading 'some')`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── P0-3 · getTooltipCssUrl ──────────────────────────────────────────
describe('P0-3 audit regression · getTooltipCssUrl handles both WAR shapes', () => {
  const mockGetURL = vi.fn((path: string) => `chrome-extension://id/${path}`);
  const mockGetManifest = vi.fn();

  beforeEach(() => {
    (globalThis as any).chrome = {
      runtime: {
        getURL: mockGetURL,
        getManifest: mockGetManifest,
      },
    };
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete (globalThis as any).chrome;
  });

  it('picks the hashed tooltip CSS from the object-form WAR entry', async () => {
    mockGetManifest.mockReturnValue({
      web_accessible_resources: [
        {
          matches: ['<all_urls>'],
          resources: ['assets/tooltip-css-abc123.css', 'assets/other.js'],
        },
      ],
    });
    const { getTooltipCssUrl } = await import('../src/lib/level-filter');
    expect(getTooltipCssUrl()).toBe(
      'chrome-extension://id/assets/tooltip-css-abc123.css',
    );
  });

  it('does NOT crash and gracefully falls back when WAR contains a bare string entry', async () => {
    // Legacy MV2/MV3-string form (rare but spec-legal).
    mockGetManifest.mockReturnValue({
      web_accessible_resources: [
        'assets/other.js', // string entry
        {
          matches: ['<all_urls>'],
          resources: ['assets/tooltip-css-def456.css'],
        },
      ],
    });
    const { getTooltipCssUrl } = await import('../src/lib/level-filter');
    // Should still find the hashed CSS via the object entry, not throw.
    expect(getTooltipCssUrl()).toBe(
      'chrome-extension://id/assets/tooltip-css-def456.css',
    );
  });

  it('falls back to unhashed url when manifest lookup throws', async () => {
    mockGetManifest.mockImplementation(() => {
      throw new Error('boom');
    });
    const { getTooltipCssUrl } = await import('../src/lib/level-filter');
    expect(getTooltipCssUrl()).toBe(
      'chrome-extension://id/assets/tooltip-css.css',
    );
  });

  it('falls back when no web_accessible_resources entry matches', async () => {
    mockGetManifest.mockReturnValue({
      web_accessible_resources: [
        { matches: ['<all_urls>'], resources: ['assets/other.js'] },
      ],
    });
    const { getTooltipCssUrl } = await import('../src/lib/level-filter');
    expect(getTooltipCssUrl()).toBe(
      'chrome-extension://id/assets/tooltip-css.css',
    );
  });
});
