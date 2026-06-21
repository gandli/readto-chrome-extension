/**
 * Tests for storage.ts — settings validation, config logic, migration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome.storage before importing
const mockSyncGet = vi.fn().mockResolvedValue({});
const mockSyncSet = vi.fn().mockResolvedValue(undefined);
const mockLocalGet = vi.fn().mockResolvedValue({});
const mockLocalSet = vi.fn().mockResolvedValue(undefined);
const mockLocalRemove = vi.fn().mockResolvedValue(undefined);

(globalThis as any).chrome = {
  storage: {
    sync: { get: mockSyncGet, set: mockSyncSet },
    local: { get: mockLocalGet, set: mockLocalSet, remove: mockLocalRemove },
  },
};

// Import after chrome mock is set up
import {
  getSettings,
  getFullConfig,
  getLlmConfig,
  saveSettings,
  saveLlmConfig,
  isFullConfig,
  isLocalhost,
} from '../src/lib/storage';

beforeEach(() => {
  vi.clearAllMocks();
  mockSyncGet.mockResolvedValue({});
  mockLocalGet.mockResolvedValue({});
});

describe('isLocalhost', () => {
  it('returns true for localhost', () => {
    expect(isLocalhost('http://localhost:3000')).toBe(true);
  });

  it('returns true for 127.0.0.1', () => {
    expect(isLocalhost('http://127.0.0.1:8080')).toBe(true);
  });

  it('returns true for ::1', () => {
    expect(isLocalhost('http://[::1]:3000')).toBe(true);
  });

  it('returns false for remote URLs', () => {
    expect(isLocalhost('https://api.openai.com')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isLocalhost('not-a-url')).toBe(false);
  });
});

describe('isFullConfig', () => {
  it('local mode is always valid', () => {
    expect(isFullConfig({ translationMode: 'local' })).toBe(true);
  });

  it('LLM mode requires endpoint and model', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: '', model: '', apiKey: '' },
    })).toBe(false);
  });

  it('LLM mode with valid config', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: 'https://api.openai.com', model: 'gpt-4', apiKey: 'sk-xxx' },
    })).toBe(true);
  });

  it('LLM mode with localhost needs no API key', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: 'http://localhost:3000', model: 'local', apiKey: '' },
    })).toBe(true);
  });

  it('LLM mode rejects endpoint with query params', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: 'https://api.com?key=xxx', model: 'gpt-4', apiKey: 'sk' },
    })).toBe(false);
  });
});

describe('getSettings', () => {
  it('returns defaults when storage is empty', async () => {
    mockSyncGet.mockResolvedValue({});
    const settings = await getSettings();
    expect(settings.level).toBe('B2');
    expect(settings.translationMode).toBe('local');
    expect(settings.autoSpeak).toBe(false);
  });

  it('returns stored values', async () => {
    mockSyncGet.mockResolvedValue({ level: 'C1', translationMode: 'llm', autoSpeak: true });
    const settings = await getSettings();
    expect(settings.level).toBe('C1');
    expect(settings.translationMode).toBe('llm');
    expect(settings.autoSpeak).toBe(true);
  });

  it('validates level values', async () => {
    mockSyncGet.mockResolvedValue({ level: 'INVALID' });
    const settings = await getSettings();
    expect(settings.level).toBe('B2'); // falls back to default
  });

  it('validates translationMode values', async () => {
    mockSyncGet.mockResolvedValue({ translationMode: 'invalid' });
    const settings = await getSettings();
    expect(settings.translationMode).toBe('local'); // falls back to default
  });
});

describe('saveSettings', () => {
  it('calls chrome.storage.sync.set', async () => {
    await saveSettings({ level: 'C1' });
    expect(mockSyncSet).toHaveBeenCalledWith({ level: 'C1' });
  });

  it('saves multiple settings', async () => {
    await saveSettings({ level: 'A1', autoSpeak: true });
    expect(mockSyncSet).toHaveBeenCalledWith({ level: 'A1', autoSpeak: true });
  });
});

describe('saveLlmConfig', () => {
  it('saves config with API key separated', async () => {
    await saveLlmConfig({
      endpoint: 'https://api.openai.com',
      model: 'gpt-4',
      apiKey: 'sk-secret',
    });
    expect(mockLocalSet).toHaveBeenCalledWith({
      llmConfig: {
        endpoint: 'https://api.openai.com',
        model: 'gpt-4',
        hasApiKey: true,
      },
      llmApiKey: 'sk-secret',
    });
  });

  it('removes config when null', async () => {
    await saveLlmConfig(null);
    expect(mockLocalRemove).toHaveBeenCalledWith(['llmConfig', 'llmApiKey', 'llm']);
  });
});
