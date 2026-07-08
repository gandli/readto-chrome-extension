/**
 * Audit v2 P1-E regression — pattern shadow #3.
 *
 * v1 established sanitizeError() as the single chokepoint for cross-boundary
 * error strings. v2 discovered the Options-page LLM connectivity tester
 * (`handleTestConnection` in src/options/App.tsx) bypassed it — a `catch (e)`
 * dumped `(e as Error).message` straight into UI state, so an upstream 401 body
 * that echoed the Authorization header would render the API key inline.
 *
 * This test is a **static assertion** on the source file: it guarantees the
 * `sanitizeError` chokepoint import + call remain wired to the connectivity
 * tester and that a raw `(e as Error).message` never re-appears in the
 * catch handler.
 *
 * Static analysis is used (rather than mounting App.tsx via jsdom) because the
 * Options page pulls in Tailwind, react-dom/client, lucide-react and sonner —
 * an integration test costs 500ms+ and would obscure the tiny invariant we
 * actually care about. Grepping the source is O(1) and immune to visual
 * refactors of the surrounding JSX.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_TSX = readFileSync(resolve(__dirname, '../src/options/App.tsx'), 'utf-8');

describe('audit v2 P1-E · Options page routes LLM test errors through sanitizeError', () => {
  it('imports sanitizeError from lib/error-sanitize', () => {
    expect(APP_TSX).toMatch(
      /import\s*\{[^}]*\bsanitizeError\b[^}]*\}\s*from\s*['"]\.\.\/lib\/error-sanitize['"]/,
    );
  });

  it('handleTestConnection catch block calls sanitizeError before setTestResult', () => {
    // Locate the connectivity tester's catch block (single occurrence: line ~950).
    const catchMatch = APP_TSX.match(/}\s*catch\s*\(e\)\s*\{[\s\S]{0,400}?setTestResult\([^)]*\)/);
    expect(catchMatch).not.toBeNull();
    // audit v4 P1-C: signature extended to sanitizeError(e, apiKey) for literal fallback.
    // Match either the v2 form (single-arg) or the v4 form (with apiKey).
    expect(catchMatch![0]).toMatch(/sanitizeError\(e(?:,\s*apiKey)?\)/);
  });

  it('no lingering `(e as Error).message` shortcut in connectivity tester catch', () => {
    // Regression guard for the exact anti-pattern v1 missed.
    const testerRegion = APP_TSX.match(
      /handleTestConnection[\s\S]*?setTesting\(false\);\s*\}\s*\}/,
    );
    expect(testerRegion).not.toBeNull();
    expect(testerRegion![0]).not.toMatch(/setTestResult\([^)]*\(e as Error\)\.message/);
  });
});
