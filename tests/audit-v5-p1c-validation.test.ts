/**
 * Audit v5 P1-C — Options page validation module unit tests
 *
 * Covers the LLM config validation logic previously inlined in App.tsx.
 * These were 0% covered before extraction — now testable in isolation.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  isLlmConfigValid,
  isConfigEmpty,
  validateLlmConfig,
} from '../src/options/validation';

describe('validation.ts (audit v5 P1-C)', () => {
  describe('isLlmConfigValid', () => {
    it('rejects null / undefined', () => {
      expect(isLlmConfigValid(null)).toBe(false);
    });

    it('rejects config with query params in endpoint', () => {
      expect(
        isLlmConfigValid({
          endpoint: 'https://api.example.com/v1?foo=bar',
          apiKey: 'sk-test1234',
          model: 'gpt-4',
        })
      ).toBe(false);
    });

    it('accepts localhost without apiKey', () => {
      expect(
        isLlmConfigValid({
          endpoint: 'http://localhost:11434/v1/chat/completions',
          apiKey: '',
          model: 'llama3',
        })
      ).toBe(true);
    });

    it('accepts 127.0.0.1 (loopback ipv4) without apiKey', () => {
      expect(
        isLlmConfigValid({
          endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
          apiKey: '',
          model: 'lm-studio',
        })
      ).toBe(true);
    });

    it('requires apiKey for non-localhost https', () => {
      expect(
        isLlmConfigValid({
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKey: '',
          model: 'gpt-4',
        })
      ).toBe(false);
    });

    it('accepts valid non-localhost https config', () => {
      expect(
        isLlmConfigValid({
          endpoint: DEFAULT_ENDPOINT,
          apiKey: 'sk-testtest12345',
          model: DEFAULT_MODEL,
        })
      ).toBe(true);
    });

    it('rejects non-localhost http (plaintext key risk)', () => {
      expect(
        isLlmConfigValid({
          endpoint: 'http://api.example.com/v1/chat/completions',
          apiKey: 'sk-testtest12345',
          model: 'gpt-4',
        })
      ).toBe(false);
    });

    it('rejects missing endpoint', () => {
      expect(
        isLlmConfigValid({ endpoint: '', apiKey: 'sk-testtest12345', model: 'gpt-4' })
      ).toBe(false);
    });

    it('rejects missing model', () => {
      expect(
        isLlmConfigValid({
          endpoint: DEFAULT_ENDPOINT,
          apiKey: 'sk-testtest12345',
          model: '',
        })
      ).toBe(false);
    });
  });

  describe('isConfigEmpty', () => {
    it('returns true when all three fields empty', () => {
      expect(isConfigEmpty({ endpoint: '', apiKey: '', model: '' })).toBe(true);
    });

    it('returns false when any field non-empty', () => {
      expect(isConfigEmpty({ endpoint: 'x', apiKey: '', model: '' })).toBe(false);
      expect(isConfigEmpty({ endpoint: '', apiKey: 'k', model: '' })).toBe(false);
      expect(isConfigEmpty({ endpoint: '', apiKey: '', model: 'm' })).toBe(false);
    });
  });

  describe('validateLlmConfig', () => {
    const base = { level: 'B2' as const, mode: 'llm' };

    it('returns null for local mode (config bypassed)', () => {
      expect(
        validateLlmConfig({
          ...base,
          mode: 'local',
          endpoint: '',
          apiKey: '',
          model: '',
        })
      ).toBeNull();
    });

    it('returns null for empty config (no-op)', () => {
      expect(validateLlmConfig({ ...base, endpoint: '', apiKey: '', model: '' })).toBeNull();
    });

    it('rejects endpoint without http(s) protocol', () => {
      expect(
        validateLlmConfig({
          ...base,
          endpoint: 'api.openai.com/v1/chat/completions',
          apiKey: 'sk-testtest12345',
          model: 'gpt-4',
        })
      ).toMatch(/http:\/\//);
    });

    it('rejects non-localhost http (plaintext key risk)', () => {
      const msg = validateLlmConfig({
        ...base,
        endpoint: 'http://api.example.com/v1/chat/completions',
        apiKey: 'sk-testtest12345',
        model: 'gpt-4',
      });
      expect(msg).toMatch(/https:\/\//);
      expect(msg).toMatch(/明文/);
    });

    it('accepts localhost http (loopback safe)', () => {
      expect(
        validateLlmConfig({
          ...base,
          endpoint: 'http://localhost:11434/v1/chat/completions',
          apiKey: '',
          model: 'llama3',
        })
      ).toBeNull();
    });

    it('rejects apiKey shorter than 8 chars', () => {
      expect(
        validateLlmConfig({
          ...base,
          endpoint: DEFAULT_ENDPOINT,
          apiKey: 'sk-a',
          model: 'gpt-4',
        })
      ).toMatch(/太短/);
    });

    it('rejects missing model', () => {
      expect(
        validateLlmConfig({
          ...base,
          endpoint: DEFAULT_ENDPOINT,
          apiKey: 'sk-testtest12345',
          model: '',
        })
      ).toMatch(/模型/);
    });

    it('rejects endpoint with query params', () => {
      expect(
        validateLlmConfig({
          ...base,
          endpoint: 'https://api.openai.com/v1/chat/completions?stream=true',
          apiKey: 'sk-testtest12345',
          model: 'gpt-4',
        })
      ).toMatch(/查询参数/);
    });

    it('returns null for valid config', () => {
      expect(
        validateLlmConfig({
          ...base,
          endpoint: DEFAULT_ENDPOINT,
          apiKey: 'sk-abcd1234',
          model: DEFAULT_MODEL,
        })
      ).toBeNull();
    });

    // Regression: Gemini-caught defensive undefined path (audit v5 post-review).
    // Storage may return partial configs on legacy installs; direct property
    // access on cfg.apiKey.length would previously throw TypeError.
    it('does not throw when apiKey is undefined (legacy storage)', () => {
      expect(() =>
        validateLlmConfig({
          ...base,
          endpoint: 'https://api.example.com/v1/chat/completions',
          apiKey: undefined as unknown as string,
          model: DEFAULT_MODEL,
        })
      ).not.toThrow();
    });

    it('does not throw when endpoint is undefined', () => {
      expect(() =>
        validateLlmConfig({
          ...base,
          endpoint: undefined as unknown as string,
          apiKey: 'sk-abcd1234',
          model: DEFAULT_MODEL,
        })
      ).not.toThrow();
    });

    it('does not throw when model is undefined', () => {
      expect(() =>
        validateLlmConfig({
          ...base,
          endpoint: DEFAULT_ENDPOINT,
          apiKey: 'sk-abcd1234',
          model: undefined as unknown as string,
        })
      ).not.toThrow();
    });
  });
});
