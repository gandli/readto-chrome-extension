/**
 * Tests for error message sanitization.
 *
 * Rationale: service worker forwards LLM errors to content scripts via
 * chrome.runtime.sendMessage. Raw error messages from OpenAI-compatible
 * endpoints may echo the Authorization header, request bodies, or partial
 * API keys. Any page can read runtime messages targeted at its content
 * script, so we MUST redact before crossing the trust boundary.
 *
 * ⚠️ All secrets in this file are OBVIOUSLY FAKE placeholders:
 *  - `FAKE_` / `TESTFAKE_` prefix
 *  - repeated `x`/`0` padding
 *  - not accepted by any real provider
 * They exist purely to exercise regex redaction. GitGuardian-safe.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeError } from '../src/lib/error-sanitize';

// Obviously-fake fixtures (won't authenticate anywhere; GitGuardian-safe)
const FAKE_BEARER_TOKEN = 'FAKE_TESTONLY_' + 'x'.repeat(20);
const FAKE_SK_KEY = 'sk-FAKE_' + 'x'.repeat(30);
const FAKE_XAPI_KEY = 'FAKE_TESTONLY_' + 'x'.repeat(20);
const FAKE_GOOGLE_KEY = 'FAKE_TESTONLY_' + 'x'.repeat(20);
const FAKE_INLINE_KEY = 'FAKE_TESTONLY_' + 'x'.repeat(20);

describe('sanitizeError', () => {
  it('redacts `Bearer <token>` from error messages', () => {
    const err = new Error(`401 Unauthorized: Bearer ${FAKE_BEARER_TOKEN} rejected`);
    const result = sanitizeError(err);
    expect(result.message).not.toContain(FAKE_BEARER_TOKEN);
    expect(result.message).toContain('[REDACTED]');
  });

  it('redacts sk-* style API keys', () => {
    const err = new Error(`Invalid API key: ${FAKE_SK_KEY}`);
    const result = sanitizeError(err);
    expect(result.message).not.toContain(FAKE_SK_KEY);
    expect(result.message).toContain('[REDACTED]');
  });

  it('redacts `api_key: xxx` JSON body echoes', () => {
    const err = new Error(`Request body: {"api_key":"${FAKE_INLINE_KEY}","model":"gpt-4"}`);
    const result = sanitizeError(err);
    expect(result.message).not.toContain(FAKE_INLINE_KEY);
    expect(result.message).toContain('[REDACTED]');
  });

  it('redacts Anthropic x-api-key header echoes', () => {
    const err = new Error(`upstream error x-api-key: ${FAKE_XAPI_KEY} at ...`);
    const result = sanitizeError(err);
    expect(result.message).not.toContain(FAKE_XAPI_KEY);
    expect(result.message).toContain('[REDACTED]');
  });

  it('redacts Google-style `?key=xxx` query params', () => {
    const err = new Error(`GET https://gen.example/v1/models?key=${FAKE_GOOGLE_KEY} → 401`);
    const result = sanitizeError(err);
    expect(result.message).not.toContain(FAKE_GOOGLE_KEY);
    expect(result.message).toContain('[REDACTED]');
  });

  it('redacts base64-shaped secrets with +, /, = characters', () => {
    // Simulated JWT / base64 token — the `+/=` chars must be caught
    const jwtLike = 'FAKE.eyJhbGciOiJIUzI1NiJ9.xxxxxxxxxxxx+/=xxxxxxxxxxx';
    const err = new Error(`Bearer ${jwtLike} rejected`);
    const result = sanitizeError(err);
    expect(result.message).not.toContain(jwtLike);
    expect(result.message).toContain('[REDACTED]');
  });

  it('preserves benign network error messages', () => {
    const err = new Error('fetch failed: ECONNREFUSED 127.0.0.1:8080');
    const result = sanitizeError(err);
    expect(result.message).toContain('ECONNREFUSED');
  });

  it('truncates very long messages to 200 chars + ellipsis', () => {
    const err = new Error('x'.repeat(500));
    const result = sanitizeError(err);
    expect(result.message.length).toBeLessThanOrEqual(201);
    expect(result.message.endsWith('…')).toBe(true);
  });

  it('handles non-Error values (string / null / undefined / object)', () => {
    expect(sanitizeError('boom').message).toBe('boom');
    expect(sanitizeError(null).message).toBe('null');
    expect(sanitizeError(undefined).message).toBe('undefined');
    expect(sanitizeError({ foo: 'bar' }).message).toBeTypeOf('string');
  });

  it('extracts .message from plain error-like objects (post structured-clone)', () => {
    // Simulates an error that crossed a chrome.runtime message boundary —
    // Error prototype is stripped but the .message shape survives.
    const errLike = { message: 'downstream_timeout', code: 'UPSTREAM' };
    expect(sanitizeError(errLike).message).toBe('downstream_timeout');
  });

  it('returns a structured shape { code, message }', () => {
    const result = sanitizeError(new Error('anything'));
    expect(result).toMatchObject({ code: expect.any(String), message: expect.any(String) });
  });

  it('redacts multiple secrets in a single message', () => {
    const err = new Error(`Bearer ${FAKE_BEARER_TOKEN} and ${FAKE_SK_KEY} both bad`);
    const result = sanitizeError(err);
    expect(result.message).not.toContain(FAKE_BEARER_TOKEN);
    expect(result.message).not.toContain(FAKE_SK_KEY);
  });

  it('is safe for cross-context transmission (no Error prototype leak)', () => {
    // sendResponse serializes via structured clone; ensure result is plain object
    const result = sanitizeError(new Error('test'));
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });
});
