/**
 * Tests for LLM host permission management.
 *
 * The extension declares `host_permissions` as OPTIONAL — users must
 * explicitly grant access to each LLM endpoint domain. This module wraps
 * chrome.permissions to make the grant/check flow testable.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockContains = vi.fn();
const mockRequest = vi.fn();
const mockRemove = vi.fn();

(globalThis as any).chrome = {
  permissions: {
    contains: mockContains,
    request: mockRequest,
    remove: mockRemove,
  },
};

import { hasHostPermission, requestHostPermission, endpointOriginPattern } from '../src/lib/permissions';

describe('endpointOriginPattern', () => {
  it('produces an origin match pattern for https URLs', () => {
    expect(endpointOriginPattern('https://api.openai.com/v1/chat/completions')).toBe('https://api.openai.com/*');
  });

  it('produces an origin match pattern for http URLs', () => {
    expect(endpointOriginPattern('http://localhost:11434/v1/chat/completions')).toBe('http://localhost:11434/*');
  });

  it('preserves non-default ports in match pattern', () => {
    // Chrome match pattern requires host:port literal for non-default ports;
    // stripping it causes chrome.permissions.contains to always return false
    // for Ollama (11434), LM Studio (1234), and self-hosted reverse proxies.
    expect(endpointOriginPattern('http://localhost:11434/v1/chat/completions')).toBe(
      'http://localhost:11434/*',
    );
    expect(endpointOriginPattern('https://api.example.com:8443/v1')).toBe(
      'https://api.example.com:8443/*',
    );
  });

  it('omits port for scheme defaults (http:80, https:443)', () => {
    expect(endpointOriginPattern('http://example.com:80/v1')).toBe('http://example.com/*');
    expect(endpointOriginPattern('https://example.com:443/v1')).toBe('https://example.com/*');
  });

  it('returns null for malformed URLs', () => {
    expect(endpointOriginPattern('not a url')).toBe(null);
    expect(endpointOriginPattern('')).toBe(null);
  });

  it('normalises to lowercase host', () => {
    expect(endpointOriginPattern('https://API.OpenAI.com/v1')).toBe('https://api.openai.com/*');
  });
});

describe('hasHostPermission', () => {
  beforeEach(() => {
    mockContains.mockReset();
  });

  it('returns true when chrome.permissions.contains resolves true', async () => {
    mockContains.mockResolvedValue(true);
    const result = await hasHostPermission('https://api.openai.com/v1');
    expect(result).toBe(true);
    expect(mockContains).toHaveBeenCalledWith({ origins: ['https://api.openai.com/*'] });
  });

  it('returns false for an unknown endpoint', async () => {
    mockContains.mockResolvedValue(false);
    expect(await hasHostPermission('https://claude.ai/v1')).toBe(false);
  });

  it('returns false for malformed URLs without touching chrome API', async () => {
    expect(await hasHostPermission('not a url')).toBe(false);
    expect(mockContains).not.toHaveBeenCalled();
  });

  it('returns true for localhost (dev-only, auto-granted)', async () => {
    // Localhost is treated as always-permitted to preserve dev UX
    expect(await hasHostPermission('http://localhost:11434/v1')).toBe(true);
    expect(await hasHostPermission('http://127.0.0.1:8080')).toBe(true);
    expect(mockContains).not.toHaveBeenCalled();
  });
});

describe('requestHostPermission', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('requests the origin permission and returns the user decision', async () => {
    mockRequest.mockResolvedValue(true);
    const result = await requestHostPermission('https://api.openai.com/v1');
    expect(result).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith({ origins: ['https://api.openai.com/*'] });
  });

  it('returns false if user rejects', async () => {
    mockRequest.mockResolvedValue(false);
    expect(await requestHostPermission('https://claude.ai/v1')).toBe(false);
  });

  it('returns false for malformed URLs without prompting', async () => {
    expect(await requestHostPermission('garbage')).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('short-circuits for localhost (no prompt)', async () => {
    expect(await requestHostPermission('http://localhost:11434')).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
