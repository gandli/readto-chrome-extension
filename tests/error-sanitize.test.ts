/**
 * Tests for error message sanitization.
 *
 * Rationale: service worker forwards LLM errors to content scripts via
 * chrome.runtime.sendMessage. Raw error messages from OpenAI-compatible
 * endpoints may echo the Authorization header, request bodies, or partial
 * API keys. Any page can read runtime messages targeted at its content
 * script, so we MUST redact before crossing the trust boundary.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeError } from '../src/lib/error-sanitize';

describe('sanitizeError', () => {
  it('redacts `Bearer <token>` from error messages', () => {
    const err = new Error('401 Unauthorized: Bearer sk-proj-abc123DEF456ghi789jkl012 rejected');
    const result = sanitizeError(err);
    expect(result.message).not.toContain('sk-proj-abc123DEF456ghi789jkl012');
    expect(result.message).toContain('[REDACTED]');
  });

  it('redacts sk-* style API keys', () => {
    const err = new Error('Invalid API key: sk-1234567890abcdefghij1234567890abcdefghij');
    const result = sanitizeError(err);
    expect(result.message).not.toContain('sk-1234567890abcdefghij');
    expect(result.message).toContain('[REDACTED]');
  });

  it('redacts `api-key: <value>` pairs (JSON body echoes)', () => {
    const err = new Error('Request body: {"api_key":"my-secret-key-xxxxxxxxxx","model":"gpt-4"}');
    const result = sanitizeError(err);
    expect(result.message).not.toContain('my-secret-key-xxxxxxxxxx');
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

  it('returns a structured shape { code, message }', () => {
    const result = sanitizeError(new Error('anything'));
    expect(result).toMatchObject({ code: expect.any(String), message: expect.any(String) });
  });

  it('redacts multiple secrets in a single message', () => {
    const err = new Error('Bearer sk-abc12345678901234567 and sk-xyz98765432109876543 both bad');
    const result = sanitizeError(err);
    expect(result.message).not.toContain('sk-abc12345678901234567');
    expect(result.message).not.toContain('sk-xyz98765432109876543');
  });

  it('is safe for cross-context transmission (no Error prototype leak)', () => {
    // sendResponse serializes via structured clone; ensure result is plain object
    const result = sanitizeError(new Error('test'));
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });
});
