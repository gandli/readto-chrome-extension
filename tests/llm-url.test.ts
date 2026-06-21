import { describe, it, expect } from 'vitest';
import { baseUrlFromEndpoint, chatCompletionsUrl, hasQueryParams } from '../src/lib/llm-url';

describe('baseUrlFromEndpoint', () => {
  it('returns origin + pathname for a standard URL', () => {
    expect(baseUrlFromEndpoint('https://api.example.com/v1')).toBe('https://api.example.com/v1');
  });

  it('strips trailing slashes', () => {
    expect(baseUrlFromEndpoint('https://api.example.com/v1/')).toBe('https://api.example.com/v1');
    expect(baseUrlFromEndpoint('https://api.example.com/v1///')).toBe('https://api.example.com/v1');
  });

  it('strips /chat/completions suffix', () => {
    expect(baseUrlFromEndpoint('https://api.example.com/v1/chat/completions')).toBe('https://api.example.com/v1');
  });

  it('strips trailing slashes before stripping /chat/completions', () => {
    expect(baseUrlFromEndpoint('https://api.example.com/v1/chat/completions/')).toBe('https://api.example.com/v1');
  });

  it('strips query params and fragments from valid URLs', () => {
    expect(baseUrlFromEndpoint('https://api.example.com/v1?key=val')).toBe('https://api.example.com/v1');
    expect(baseUrlFromEndpoint('https://api.example.com/v1#frag')).toBe('https://api.example.com/v1');
  });

  it('handles root path', () => {
    expect(baseUrlFromEndpoint('https://api.example.com/')).toBe('https://api.example.com/');
    expect(baseUrlFromEndpoint('https://api.example.com')).toBe('https://api.example.com/');
  });

  it('handles invalid URLs by falling back to string replacement', () => {
    expect(baseUrlFromEndpoint('not-a-url')).toBe('not-a-url');
    expect(baseUrlFromEndpoint('not-a-url/')).toBe('not-a-url');
    expect(baseUrlFromEndpoint('not-a-url/chat/completions')).toBe('not-a-url');
    expect(baseUrlFromEndpoint('not-a-url/chat/completions/')).toBe('not-a-url');
  });

  it('handles double slashes in path', () => {
    expect(baseUrlFromEndpoint('https://api.example.com//v1//')).toBe('https://api.example.com//v1');
  });
});

describe('chatCompletionsUrl', () => {
  it('appends /chat/completions to a base URL', () => {
    expect(chatCompletionsUrl('https://api.example.com/v1')).toBe('https://api.example.com/v1/chat/completions');
  });

  it('does not double up /chat/completions if already present', () => {
    expect(chatCompletionsUrl('https://api.example.com/v1/chat/completions')).toBe('https://api.example.com/v1/chat/completions');
  });

  it('strips trailing slashes before appending', () => {
    expect(chatCompletionsUrl('https://api.example.com/v1/')).toBe('https://api.example.com/v1/chat/completions');
  });

  it('handles invalid URLs', () => {
    expect(chatCompletionsUrl('not-a-url')).toBe('not-a-url/chat/completions');
  });
});

describe('hasQueryParams', () => {
  it('returns true for URLs with query params', () => {
    expect(hasQueryParams('https://example.com/path?key=value')).toBe(true);
    expect(hasQueryParams('https://example.com/?a=1&b=2')).toBe(true);
  });

  it('returns false for URLs without query params', () => {
    expect(hasQueryParams('https://example.com/path')).toBe(false);
    expect(hasQueryParams('https://example.com/')).toBe(false);
  });

  it('returns false for URLs with empty query string', () => {
    // new URL('https://example.com/path?').search === '' (empty)
    expect(hasQueryParams('https://example.com/path?')).toBe(false);
  });

  it('returns false for URLs with only fragments', () => {
    expect(hasQueryParams('https://example.com/path#fragment')).toBe(false);
  });

  it('handles invalid URLs with fallback regex', () => {
    expect(hasQueryParams('not-a-url?foo=bar')).toBe(true);
    expect(hasQueryParams('not-a-url')).toBe(false);
  });
});
