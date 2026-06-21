/**
 * Chrome storage management for the readto extension.
 *
 * Storage layout:
 * - chrome.storage.sync: { level, translationMode } (user settings, synced across devices)
 * - chrome.storage.local: { llmConfig, llmApiKey } (LLM configuration, device-local)
 * - chrome.storage.session: { llmRateTimestamps } (rate limiting, session-scoped)
 */

import type { CefrLevel, FullConfig, LlmConfig, Settings, TranslationMode } from './types';

const CEFR_LEVELS = new Set<string>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

function isValidLevel(level: unknown): level is CefrLevel {
  return typeof level === 'string' && CEFR_LEVELS.has(level);
}

const DEFAULT_SETTINGS: Settings = {
  level: 'B2',
  translationMode: 'local',
  autoSpeak: false,
};

const STORAGE_KEY_CONFIG = 'llmConfig';
const STORAGE_KEY_API_KEY = 'llmApiKey';
const STORAGE_KEY_LEGACY = 'llm';

/** Sentinel value used when API key should not be exposed to content scripts */
const REDACTED_KEY = '<REDACTED-IN-CONTENT-CONTEXT>';

/** Validates the shape of an LLM config object in storage */
function isValidLlmConfigShape(obj: unknown): obj is { endpoint: string; model: string; hasApiKey: boolean } {
  if (!obj || typeof obj !== 'object') return false;
  const t = obj as Record<string, unknown>;
  return typeof t.endpoint === 'string' && typeof t.model === 'string' && typeof t.hasApiKey === 'boolean';
}

/** Check if endpoint is a local development server */
function isLocalhost(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === '[::1]';
  } catch {
    return false;
  }
}

function hasQueryParams(url: string): boolean {
  try {
    return new URL(url).search.length > 0;
  } catch {
    return /[?]/.test(url);
  }
}

/** Check if a full config has all required fields for LLM mode */
function isFullConfig(config: { translationMode: TranslationMode; llm?: LlmConfig | null }): boolean {
  if (config.translationMode === 'local') return true;
  if (!config.llm || !config.llm.endpoint || !config.llm.model || hasQueryParams(config.llm.endpoint)) return false;
  if (isLocalhost(config.llm.endpoint)) return true;
  return /^https:\/\//i.test(config.llm.endpoint) ? !!config.llm.apiKey : false;
}

/** Get user settings from chrome.storage.sync */
async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(['level', 'translationMode', 'autoSpeak']);
  const level = isValidLevel(stored.level) ? stored.level : DEFAULT_SETTINGS.level;
  const mode = stored.translationMode;
  const translationMode: TranslationMode = (mode === 'local' || mode === 'llm') ? mode : DEFAULT_SETTINGS.translationMode;
  const autoSpeak = typeof stored.autoSpeak === 'boolean' ? stored.autoSpeak : DEFAULT_SETTINGS.autoSpeak;
  return { level, translationMode, autoSpeak };
}

/** Get full config WITHOUT exposing real API key (for content scripts) */
async function getFullConfig(): Promise<FullConfig> {
  const [{ level, translationMode, autoSpeak }, localData] = await Promise.all([
    getSettings(),
    chrome.storage.local.get([STORAGE_KEY_CONFIG]),
  ]);
  const llmStored = localData[STORAGE_KEY_CONFIG];
  if (isValidLlmConfigShape(llmStored)) {
    return {
      level,
      translationMode,
      llm: {
        endpoint: llmStored.endpoint,
        model: llmStored.model,
        apiKey: llmStored.hasApiKey ? REDACTED_KEY : '',
      },
      autoSpeak,
    };
  }
  return { level, translationMode, llm: null, autoSpeak };
}

/** Get full config WITH real API key (for service worker / options page) */
async function getLlmConfig(): Promise<FullConfig> {
  await migration();
  const [{ level, translationMode, autoSpeak }, localData] = await Promise.all([
    getSettings(),
    chrome.storage.local.get([STORAGE_KEY_CONFIG, STORAGE_KEY_API_KEY]),
  ]);
  const llmStored = localData[STORAGE_KEY_CONFIG];
  if (isValidLlmConfigShape(llmStored)) {
    return {
      level,
      translationMode,
      llm: {
        endpoint: llmStored.endpoint,
        model: llmStored.model,
        apiKey: typeof localData[STORAGE_KEY_API_KEY] === 'string' ? localData[STORAGE_KEY_API_KEY] : '',
      },
      autoSpeak,
    };
  }
  return { level, translationMode, llm: null, autoSpeak };
}

/** Save user settings to chrome.storage.sync */
async function saveSettings(settings: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(settings);
}

/** Save LLM configuration to chrome.storage.local */
async function saveLlmConfig(config: LlmConfig | null): Promise<void> {
  if (config === null) {
    await chrome.storage.local.remove([STORAGE_KEY_CONFIG, STORAGE_KEY_API_KEY, STORAGE_KEY_LEGACY]);
    return;
  }
  await chrome.storage.local.set({
    [STORAGE_KEY_CONFIG]: {
      endpoint: config.endpoint,
      model: config.model,
      hasApiKey: !!config.apiKey,
    },
    [STORAGE_KEY_API_KEY]: config.apiKey ?? '',
  });
  await chrome.storage.local.remove(STORAGE_KEY_LEGACY);
}

/**
 * Migrate old storage format to new format.
 * Old format stored everything under 'llm' key.
 * New format splits into 'llmConfig' (no secret) and 'llmApiKey' (secret).
 */
async function migration(): Promise<void> {
  const stored = await chrome.storage.local.get([STORAGE_KEY_LEGACY, STORAGE_KEY_CONFIG, STORAGE_KEY_API_KEY]);
  const legacy = stored[STORAGE_KEY_LEGACY];
  const existingApiKey = typeof stored[STORAGE_KEY_API_KEY] === 'string' ? stored[STORAGE_KEY_API_KEY] : '';

  if (isValidLlmConfigShape(stored[STORAGE_KEY_CONFIG])) {
    // Already migrated, but ensure API key is extracted
    if ((stored[STORAGE_KEY_CONFIG] as { hasApiKey: boolean }).hasApiKey && !existingApiKey && legacy && typeof legacy === 'object' && typeof (legacy as Record<string, unknown>).apiKey === 'string') {
      await chrome.storage.local.set({ [STORAGE_KEY_API_KEY]: (legacy as Record<string, unknown>).apiKey });
    }
    if (legacy !== undefined) {
      await chrome.storage.local.remove(STORAGE_KEY_LEGACY);
    }
    return;
  }

  if (!legacy) return;
  if (typeof legacy !== 'object') {
    await chrome.storage.local.remove(STORAGE_KEY_LEGACY);
    return;
  }

  const obj = legacy as Record<string, unknown>;
  if (typeof obj.endpoint !== 'string' || typeof obj.model !== 'string') {
    await chrome.storage.local.remove(STORAGE_KEY_LEGACY);
    return;
  }

  const apiKey = typeof obj.apiKey === 'string' ? obj.apiKey : '';
  await chrome.storage.local.set({
    [STORAGE_KEY_CONFIG]: { endpoint: obj.endpoint, model: obj.model, hasApiKey: !!apiKey },
    [STORAGE_KEY_API_KEY]: apiKey,
  });
  await chrome.storage.local.remove(STORAGE_KEY_LEGACY);
}

export {
  getSettings,
  getFullConfig,
  getLlmConfig,
  saveSettings,
  saveLlmConfig,
  isFullConfig,
  isLocalhost,
  migration,
};

// Compatibility aliases
export const initStorage = migration;
export async function getReadableConfig() {
  const settings = await getSettings();
  const llm = await getLlmConfig();
  return { ...settings, llm };
}
