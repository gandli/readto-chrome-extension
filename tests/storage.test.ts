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
  migration,
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

// ─────────────────────────────────────────────
// migration()
// ─────────────────────────────────────────────

describe('migration', () => {
  it('skips migration when already migrated (llmConfig exists)', async () => {
    mockLocalGet.mockResolvedValue({
      llmConfig: { endpoint: 'https://api.openai.com', model: 'gpt-4', hasApiKey: true },
      llmApiKey: 'sk-existing',
    });
    await migration();
    // Should not write new config, just clean up legacy if present
    expect(mockLocalSet).not.toHaveBeenCalled();
    expect(mockLocalRemove).not.toHaveBeenCalledWith('llm');
  });

  it('removes legacy key when already migrated and legacy present', async () => {
    mockLocalGet.mockResolvedValue({
      llmConfig: { endpoint: 'https://api.openai.com', model: 'gpt-4', hasApiKey: false },
      llmApiKey: '',
      llm: { endpoint: 'https://old.com', model: 'old', apiKey: '' },
    });
    await migration();
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
  });

  it('returns early when no legacy data exists', async () => {
    mockLocalGet.mockResolvedValue({});
    await migration();
    expect(mockLocalSet).not.toHaveBeenCalled();
    expect(mockLocalRemove).not.toHaveBeenCalled();
  });

  it('removes corrupt legacy (non-object, e.g. a number)', async () => {
    mockLocalGet.mockResolvedValue({ llm: 42 });
    await migration();
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
    expect(mockLocalSet).not.toHaveBeenCalled();
  });

  it('removes corrupt legacy (non-object, e.g. a string)', async () => {
    mockLocalGet.mockResolvedValue({ llm: 'corrupt-data' });
    await migration();
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
    expect(mockLocalSet).not.toHaveBeenCalled();
  });

  it('removes legacy with missing endpoint/model fields', async () => {
    mockLocalGet.mockResolvedValue({ llm: { apiKey: 'sk-xxx' } });
    await migration();
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
    expect(mockLocalSet).not.toHaveBeenCalled();
  });

  it('removes legacy when endpoint is not a string', async () => {
    mockLocalGet.mockResolvedValue({ llm: { endpoint: 123, model: 'gpt-4', apiKey: 'sk' } });
    await migration();
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
    expect(mockLocalSet).not.toHaveBeenCalled();
  });

  it('performs valid migration from legacy format', async () => {
    mockLocalGet.mockResolvedValue({
      llm: { endpoint: 'https://api.openai.com', model: 'gpt-4', apiKey: 'sk-secret' },
    });
    await migration();
    expect(mockLocalSet).toHaveBeenCalledWith({
      llmConfig: { endpoint: 'https://api.openai.com', model: 'gpt-4', hasApiKey: true },
      llmApiKey: 'sk-secret',
    });
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
  });

  it('migrates legacy with empty apiKey', async () => {
    mockLocalGet.mockResolvedValue({
      llm: { endpoint: 'http://localhost:11434', model: 'llama3', apiKey: '' },
    });
    await migration();
    expect(mockLocalSet).toHaveBeenCalledWith({
      llmConfig: { endpoint: 'http://localhost:11434', model: 'llama3', hasApiKey: false },
      llmApiKey: '',
    });
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
  });

  it('migrates legacy with missing apiKey field', async () => {
    mockLocalGet.mockResolvedValue({
      llm: { endpoint: 'http://localhost:11434', model: 'llama3' },
    });
    await migration();
    expect(mockLocalSet).toHaveBeenCalledWith({
      llmConfig: { endpoint: 'http://localhost:11434', model: 'llama3', hasApiKey: false },
      llmApiKey: '',
    });
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
  });

  it('extracts API key from legacy when already migrated but key missing', async () => {
    mockLocalGet.mockResolvedValue({
      llmConfig: { endpoint: 'https://api.openai.com', model: 'gpt-4', hasApiKey: true },
      llmApiKey: '',
      llm: { endpoint: 'https://api.openai.com', model: 'gpt-4', apiKey: 'sk-rescued' },
    });
    await migration();
    expect(mockLocalSet).toHaveBeenCalledWith({ llmApiKey: 'sk-rescued' });
    expect(mockLocalRemove).toHaveBeenCalledWith('llm');
  });
});

// ─────────────────────────────────────────────
// getFullConfig()
// ─────────────────────────────────────────────

describe('getFullConfig', () => {
  it('returns valid config with redacted API key when hasApiKey is true', async () => {
    mockSyncGet.mockResolvedValue({ level: 'C1', translationMode: 'llm', autoSpeak: true });
    mockLocalGet.mockResolvedValue({
      llmConfig: { endpoint: 'https://api.openai.com', model: 'gpt-4', hasApiKey: true },
    });
    const config = await getFullConfig();
    expect(config.llm).toEqual({
      endpoint: 'https://api.openai.com',
      model: 'gpt-4',
      apiKey: '<REDACTED-IN-CONTENT-CONTEXT>',
    });
    expect(config.level).toBe('C1');
    expect(config.autoSpeak).toBe(true);
  });

  it('returns empty apiKey when hasApiKey is false', async () => {
    mockSyncGet.mockResolvedValue({ level: 'B2', translationMode: 'llm' });
    mockLocalGet.mockResolvedValue({
      llmConfig: { endpoint: 'http://localhost:3000', model: 'local', hasApiKey: false },
    });
    const config = await getFullConfig();
    expect(config.llm).toEqual({
      endpoint: 'http://localhost:3000',
      model: 'local',
      apiKey: '',
    });
  });

  it('returns llm null when no stored config', async () => {
    mockSyncGet.mockResolvedValue({});
    mockLocalGet.mockResolvedValue({});
    const config = await getFullConfig();
    expect(config.llm).toBeNull();
    expect(config.level).toBe('B2');
    expect(config.translationMode).toBe('local');
    expect(config.autoSpeak).toBe(false);
  });

  it('returns llm null when stored config has invalid shape', async () => {
    mockSyncGet.mockResolvedValue({});
    mockLocalGet.mockResolvedValue({ llmConfig: 'not-an-object' });
    const config = await getFullConfig();
    expect(config.llm).toBeNull();
  });

  it('does NOT call migration (content-script safe)', async () => {
    mockSyncGet.mockResolvedValue({});
    mockLocalGet.mockResolvedValue({});
    await getFullConfig();
    // getFullConfig calls local.get with ['llmConfig'] only — not ['llmConfig', 'llmApiKey', 'llm']
    expect(mockLocalGet).toHaveBeenCalledWith(['llmConfig']);
  });
});

// ─────────────────────────────────────────────
// getLlmConfig()
// ─────────────────────────────────────────────

describe('getLlmConfig', () => {
  it('triggers migration before reading config', async () => {
    mockLocalGet
      // first call: migration() reads [STORAGE_KEY_LEGACY, STORAGE_KEY_CONFIG, STORAGE_KEY_API_KEY]
      .mockResolvedValueOnce({})
      // second call: getLlmConfig reads [STORAGE_KEY_CONFIG, STORAGE_KEY_API_KEY]
      .mockResolvedValueOnce({
        llmConfig: { endpoint: 'https://api.openai.com', model: 'gpt-4', hasApiKey: true },
        llmApiKey: 'sk-real-key',
      });
    mockSyncGet.mockResolvedValue({ level: 'B2', translationMode: 'llm' });
    const config = await getLlmConfig();
    // migration() calls local.get with 3 keys
    expect(mockLocalGet).toHaveBeenNthCalledWith(1, ['llm', 'llmConfig', 'llmApiKey']);
    // getLlmConfig() calls local.get with 2 keys
    expect(mockLocalGet).toHaveBeenNthCalledWith(2, ['llmConfig', 'llmApiKey']);
    expect(config.llm!.apiKey).toBe('sk-real-key');
  });

  it('returns real API key from storage', async () => {
    mockLocalGet
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        llmConfig: { endpoint: 'https://api.openai.com', model: 'gpt-4', hasApiKey: true },
        llmApiKey: 'sk-real-key',
      });
    mockSyncGet.mockResolvedValue({ level: 'C1', translationMode: 'llm' });
    const config = await getLlmConfig();
    expect(config.llm).toEqual({
      endpoint: 'https://api.openai.com',
      model: 'gpt-4',
      apiKey: 'sk-real-key',
    });
  });

  it('returns empty apiKey when llmApiKey is missing', async () => {
    mockLocalGet
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        llmConfig: { endpoint: 'https://api.openai.com', model: 'gpt-4', hasApiKey: false },
      });
    mockSyncGet.mockResolvedValue({ level: 'B2', translationMode: 'llm' });
    const config = await getLlmConfig();
    expect(config.llm!.apiKey).toBe('');
  });

  it('returns llm null when llmConfig has invalid shape', async () => {
    mockLocalGet
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ llmConfig: 'just-a-string' });
    mockSyncGet.mockResolvedValue({ level: 'B2', translationMode: 'llm' });
    const config = await getLlmConfig();
    expect(config.llm).toBeNull();
  });

  it('returns llm null when no llmConfig stored', async () => {
    mockLocalGet
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    mockSyncGet.mockResolvedValue({});
    const config = await getLlmConfig();
    expect(config.llm).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────

describe('error handling', () => {
  it('propagates sync.set quota exceeded error', async () => {
    mockSyncSet.mockRejectedValue(new Error('QUOTA_BYTES_PER_ITEM quota exceeded'));
    await expect(saveSettings({ level: 'C1' })).rejects.toThrow('QUOTA_BYTES_PER_ITEM');
  });

  it('propagates sync.get rejection', async () => {
    mockSyncGet.mockRejectedValue(new Error('Extension context invalidated'));
    await expect(getSettings()).rejects.toThrow('Extension context invalidated');
  });

  it('propagates local.set error', async () => {
    mockLocalSet.mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'));
    await expect(saveLlmConfig({
      endpoint: 'https://api.openai.com',
      model: 'gpt-4',
      apiKey: 'sk-xxx',
    })).rejects.toThrow('QUOTA_BYTES');
  });

  it('propagates local.get rejection in getFullConfig', async () => {
    mockSyncGet.mockResolvedValue({});
    mockLocalGet.mockRejectedValue(new Error('Storage access denied'));
    await expect(getFullConfig()).rejects.toThrow('Storage access denied');
  });

  it('propagates local.get rejection in getLlmConfig (migration phase)', async () => {
    mockLocalGet.mockRejectedValue(new Error('Storage corrupted'));
    await expect(getLlmConfig()).rejects.toThrow('Storage corrupted');
  });

  it('propagates local.remove rejection in saveLlmConfig(null)', async () => {
    mockLocalRemove.mockRejectedValue(new Error('Remove failed'));
    await expect(saveLlmConfig(null)).rejects.toThrow('Remove failed');
  });
});

// ─────────────────────────────────────────────
// Corrupt data resilience
// ─────────────────────────────────────────────

describe('corrupt data resilience', () => {
  describe('level field', () => {
    it('falls back to default when level is a number', async () => {
      mockSyncGet.mockResolvedValue({ level: 42 });
      const s = await getSettings();
      expect(s.level).toBe('B2');
    });

    it('falls back to default when level is an object', async () => {
      mockSyncGet.mockResolvedValue({ level: { foo: 'bar' } });
      const s = await getSettings();
      expect(s.level).toBe('B2');
    });

    it('falls back to default when level is an array', async () => {
      mockSyncGet.mockResolvedValue({ level: ['A1'] });
      const s = await getSettings();
      expect(s.level).toBe('B2');
    });

    it('falls back to default when level is null', async () => {
      mockSyncGet.mockResolvedValue({ level: null });
      const s = await getSettings();
      expect(s.level).toBe('B2');
    });

    it('falls back to default when level is empty string', async () => {
      mockSyncGet.mockResolvedValue({ level: '' });
      const s = await getSettings();
      expect(s.level).toBe('B2');
    });
  });

  describe('autoSpeak field', () => {
    it('falls back to default when autoSpeak is a string', async () => {
      mockSyncGet.mockResolvedValue({ autoSpeak: 'true' });
      const s = await getSettings();
      expect(s.autoSpeak).toBe(false);
    });

    it('falls back to default when autoSpeak is a number', async () => {
      mockSyncGet.mockResolvedValue({ autoSpeak: 1 });
      const s = await getSettings();
      expect(s.autoSpeak).toBe(false);
    });

    it('falls back to default when autoSpeak is null', async () => {
      mockSyncGet.mockResolvedValue({ autoSpeak: null });
      const s = await getSettings();
      expect(s.autoSpeak).toBe(false);
    });
  });

  describe('llmConfig stored as wrong type', () => {
    it('treats llmConfig string as invalid shape in getFullConfig', async () => {
      mockSyncGet.mockResolvedValue({});
      mockLocalGet.mockResolvedValue({ llmConfig: '{"endpoint":"x","model":"y"}' });
      const config = await getFullConfig();
      expect(config.llm).toBeNull();
    });

    it('treats llmConfig array as invalid shape in getFullConfig', async () => {
      mockSyncGet.mockResolvedValue({});
      mockLocalGet.mockResolvedValue({ llmConfig: ['endpoint', 'model'] });
      const config = await getFullConfig();
      expect(config.llm).toBeNull();
    });

    it('treats llmConfig number as invalid shape in getFullConfig', async () => {
      mockSyncGet.mockResolvedValue({});
      mockLocalGet.mockResolvedValue({ llmConfig: 0 });
      const config = await getFullConfig();
      expect(config.llm).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────
// isFullConfig edge cases
// ─────────────────────────────────────────────

describe('isFullConfig edge cases', () => {
  it('returns false when llm is null', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: null,
    })).toBe(false);
  });

  it('returns false when llm is undefined', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: undefined as any,
    })).toBe(false);
  });

  it('returns false for HTTP non-localhost endpoint', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: 'http://192.168.1.100:8080', model: 'gpt-4', apiKey: '' },
    })).toBe(false);
  });

  it('returns false for HTTPS endpoint without apiKey', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: 'https://api.openai.com', model: 'gpt-4', apiKey: '' },
    })).toBe(false);
  });

  it('returns false for HTTPS endpoint with empty string model', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: 'https://api.openai.com', model: '', apiKey: 'sk-xxx' },
    })).toBe(false);
  });

  it('returns true for localhost without apiKey', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: 'http://127.0.0.1:11434', model: 'llama3', apiKey: '' },
    })).toBe(true);
  });

  it('returns false for endpoint with query params even with valid apiKey', () => {
    expect(isFullConfig({
      translationMode: 'llm',
      llm: { endpoint: 'https://api.com/v1?key=leaked', model: 'gpt-4', apiKey: 'sk-xxx' },
    })).toBe(false);
  });
});
