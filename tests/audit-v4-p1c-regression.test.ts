/**
 * Audit v4 P1-C regression: sanitizeError apiKey literal-fallback.
 *
 * Threat model: user-configured apiKey formats (DeepSeek `dsk-*`,
 * Alibaba Qwen, Kimi, Zhipu) do NOT match the built-in SECRET_PATTERNS regex.
 * A malicious LLM provider (or upstream Cloudflare error page) can echo the
 * raw Authorization value in an error body; without literal-string fallback,
 * that value would cross the service-worker → content-script boundary and
 * leak into any page's DOM.
 *
 * This test locks in:
 *  1. Custom-format apiKey is redacted when passed to sanitizeError()
 *  2. Short apiKey (< 8 chars) is NOT literal-replaced (avoids nuking UI text)
 *  3. Missing/undefined apiKey preserves v3-and-earlier behavior (regex only)
 *  4. Pre-truncation window (1000 chars) prevents DoS on multi-KB error bodies
 */
import { describe, it, expect } from 'vitest';
import { sanitizeError } from '../src/lib/error-sanitize';

describe('audit v4 P1-C · sanitizeError apiKey literal-fallback', () => {
  it('redacts a custom-format DeepSeek key that would slip past regex', () => {
    const leakedError = 'HTTP 401: {"error":{"message":"Invalid Bearer dsk-abcXYZ1234567890"}}';
    // Regex handles the Bearer prefix, but a bare `dsk-abcXYZ1234567890` in a
    // different context would leak — feed literal for belt-and-suspenders.
    const customKey = 'dsk-abcXYZ1234567890';
    const result = sanitizeError(new Error(leakedError), customKey);
    expect(result.message).not.toContain(customKey);
    expect(result.message).toContain('[REDACTED]');
  });

  it('redacts a fully custom apiKey format that has zero regex overlap', () => {
    // Simulate a hypothetical provider whose keys look like `qwen_YYYYMMDD_hash`.
    const customKey = 'qwen_20260708_a1b2c3d4e5f6';
    const errorBody = `Request failed with key=${customKey} at provider gateway`;
    const result = sanitizeError(errorBody, customKey);
    expect(result.message).not.toContain(customKey);
    expect(result.message).toContain('[REDACTED]');
  });

  it('does NOT literal-replace apiKey shorter than 8 chars (protects UI copy)', () => {
    // Edge case: user typed a short test-key. If we literal-replace it, common
    // words containing that substring would be corrupted in the visible error.
    const shortKey = 'test123';
    const errorBody = `Test failed: expected foo=test123bar`;
    const result = sanitizeError(errorBody, shortKey);
    // Short key preserved verbatim (regex didn't catch it either — that's fine,
    // 7-char keys aren't real API keys)
    expect(result.message).toContain('test123');
  });

  it('preserves v3-behavior when apiKey is omitted (regex-only sanitize)', () => {
    // Backward compat: 3+ audits worth of call sites use the single-arg form.
    const error = new Error('unauthorized: sk-1234567890abcdefghij');
    const result = sanitizeError(error);
    expect(result.message).toContain('[REDACTED]');
    expect(result.message).not.toContain('sk-1234567890abcdefghij');
  });

  it('bounds runtime on multi-KB error bodies via pre-truncation window', () => {
    // Cloudflare 5xx pages can be 50KB+. Ensure we don't churn the regex over
    // that entire mass. 100KB with a secret at byte 500 should still be redacted.
    const secret = 'dsk-secretPayload12345';
    const filler = 'x'.repeat(500);
    const trailingJunk = 'y'.repeat(100_000);
    const errorBody = `${filler}${secret}${trailingJunk}`;
    const start = performance.now();
    const result = sanitizeError(errorBody, secret);
    const elapsed = performance.now() - start;
    // Secret must be redacted (within the 1000-char window)
    expect(result.message).not.toContain(secret);
    // Runtime must be bounded — 100KB body should complete in well under 100ms
    // (jsdom is slow; give generous headroom but assert we didn't loop the tail)
    expect(elapsed).toBeLessThan(100);
    // Visible message capped at 200 chars + ellipsis
    expect(result.message.length).toBeLessThanOrEqual(201);
  });

  it('handles empty / whitespace-only apiKey gracefully (no throw, no replace)', () => {
    const error = 'benign error message';
    expect(sanitizeError(error, '').message).toBe('benign error message');
    expect(sanitizeError(error, '   ').message).toBe('benign error message');
    expect(sanitizeError(error, undefined).message).toBe('benign error message');
  });

  it('redacts multiple occurrences of the same apiKey in one body', () => {
    const customKey = 'kimi_test_key_abcdef123456';
    const errorBody = `Retry 1 with ${customKey} failed. Retry 2 with ${customKey} also failed.`;
    const result = sanitizeError(errorBody, customKey);
    expect(result.message).not.toContain(customKey);
    // Both occurrences should be redacted (String.split.join replaces all)
    const redactedCount = (result.message.match(/\[REDACTED\]/g) || []).length;
    expect(redactedCount).toBeGreaterThanOrEqual(2);
  });
});
