/**
 * Service Worker (background script) for the readto extension.
 *
 * Responsibilities:
 * - Handle GET_WORD_DETAIL messages from content scripts (fetch from translations-detail JSON)
 * - Handle TRANSLATE_MANY messages (LLM batch translation with rate limiting)
 * - Initialize storage on install/startup
 * - Open options page on install and action click
 */

import { initStorage, getReadableConfig, isFullConfig } from '../lib/storage';

// ─── Constants ─────────────────────────────────────────────────────

const DETAIL_DIR = '/assets/detail';

const RATE_LIMIT_MAX = 60; // requests per minute
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_KEY = 'llmRateTimestamps';

const BATCH_MAX_TARGETS = 200;
const BATCH_MAX_CHARS = 120_000;
const LLM_TIMEOUT_MS = 120_000;

// ─── Translations Detail Cache ─────────────────────────────────────

interface WordDetail {
  p?: string; // phonetic
  t?: string; // translation with POS
  e?: Array<{ en: string; zh: string }>; // examples
}

/** Per-letter cache: 'a' → Map of word→detail */
const letterCaches = new Map<string, Map<string, WordDetail>>();
const letterPromises = new Map<string, Promise<Map<string, WordDetail>>>();

async function loadLetter(letter: string): Promise<Map<string, WordDetail>> {
  const key = letter.toLowerCase();
  if (letterCaches.has(key)) return letterCaches.get(key)!;
  if (letterPromises.has(key)) return letterPromises.get(key)!;

  const promise = (async () => {
    try {
      const resp = await fetch(chrome.runtime.getURL(`${DETAIL_DIR}/${key}.json`));
      if (!resp.ok) throw new Error(`fetch ${key}.json → ${resp.status}`);
      const data = (await resp.json()) as Record<string, WordDetail>;
      const map = new Map<string, WordDetail>(Object.entries(data));
      letterCaches.set(key, map);
      return map;
    } catch (err) {
      letterPromises.delete(key);
      throw err;
    }
  })();

  letterPromises.set(key, promise);
  return promise;
}

async function getWordDetail(word: string): Promise<WordDetail | null> {
  const w = word.toLowerCase();
  if (!w) return null;
  const letter = w[0];
  const map = await loadLetter(letter);
  return map.get(w) ?? null;
}

// ─── Rate Limiting ─────────────────────────────────────────────────

async function getRateTimestamps(): Promise<number[]> {
  const session = globalThis.chrome?.storage?.session;
  if (!session) return [];
  try {
    const data = await session.get(RATE_KEY);
    return Array.isArray(data?.[RATE_KEY]) ? data[RATE_KEY] : [];
  } catch {
    return [];
  }
}

async function setRateTimestamps(timestamps: number[]): Promise<void> {
  const session = globalThis.chrome?.storage?.session;
  if (!session) return;
  try {
    await session.set({ [RATE_KEY]: timestamps });
  } catch {
    // Ignore
  }
}

let rateLimitQueue = Promise.resolve();

async function checkRateLimit(): Promise<void> {
  const task = rateLimitQueue.then(async () => {
    const now = Date.now();
    const timestamps = await getRateTimestamps();
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX) {
      throw new Error(`LLM rate-limit: ${RATE_LIMIT_MAX}/min exceeded`);
    }
    recent.push(now);
    await setRateTimestamps(recent);
  });
  rateLimitQueue = task.catch(() => {});
  return task;
}

// ─── Local Translation ────────────────────────────────────────────

let localDictMap: Map<string, string> | null = null;

async function loadLocalDict(): Promise<Map<string, string>> {
  if (localDictMap) return localDictMap;
  try {
    const resp = await fetch(chrome.runtime.getURL('assets/translations-data.json'));
    if (!resp.ok) throw new Error(`fetch translations-data.json → ${resp.status}`);
    const data = await resp.json();
    localDictMap = new Map(Object.entries(data));
    console.log(`[readto] Loaded ${localDictMap.size} local translations`);
    return localDictMap;
  } catch (err) {
    console.error('[readto] Failed to load local translations:', err);
    localDictMap = new Map();
    return localDictMap;
  }
}

function translateLocal(
  items: TranslateItem[],
): Array<Array<{ word: string; occurrence: number; translation: string }>> {
  const dict = localDictMap ?? new Map();
  return items.map((item) =>
    item.targets
      .map((t) => {
        const translation = dict.get(t.word.toLowerCase());
        return translation
          ? { word: t.word.toLowerCase(), occurrence: t.occurrence, translation }
          : null;
      })
      .filter(Boolean) as Array<{ word: string; occurrence: number; translation: string }>,
  );
}

// ─── LLM Translation ───────────────────────────────────────────────

async function getStreamBatch() {
  const mod = await import('../lib/llm-stream');
  return mod.streamBatch;
}

interface TranslateItem {
  context: string;
  targets: Array<{ word: string; occurrence: number }>;
}

function estimatePromptSize(items: TranslateItem[]): number {
  let size = 0;
  for (const item of items) {
    size += item.context.length;
    for (const t of item.targets) {
      size += t.word.length + 25; // overhead per target
    }
  }
  return size;
}

async function translateBatch(
  items: TranslateItem[],
  cfg: { endpoint: string; model: string; apiKey: string },
): Promise<Array<Array<{ word: string; occurrence: number; translation: string }>>> {
  const totalTargets = items.reduce((sum, item) => sum + item.targets.length, 0);
  if (totalTargets > BATCH_MAX_TARGETS) {
    throw new Error(`LLM batch too large: ${totalTargets} targets > ${BATCH_MAX_TARGETS} cap`);
  }

  const promptSize = estimatePromptSize(items);
  if (promptSize > BATCH_MAX_CHARS) {
    throw new Error(`LLM prompt too large: ~${promptSize} chars > ${BATCH_MAX_CHARS} cap`);
  }

  await checkRateLimit();

  const streamBatch = await getStreamBatch();
  return streamBatch({
    items,
    cfg,
    abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
}

// ─── Message Handler ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'GET_WORD_DETAIL') {
    if (typeof message.word !== 'string') {
      sendResponse({ ok: false, error: 'malformed GET_WORD_DETAIL' });
      return;
    }

    getWordDetail(message.word)
      .then((detail) => {
        sendResponse({ ok: true, detail });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });

    return true; // async response
  }

  if (message.type === 'TRANSLATE_MANY') {
    const { items, cfg } = message;
    if (!Array.isArray(items) || !cfg) {
      sendResponse({ ok: false, error: 'malformed TRANSLATE_MANY' });
      return;
    }

    // Local mode: use local dictionary directly
    if (cfg.translationMode === 'local') {
      loadLocalDict()
        .then(() => {
          const results = translateLocal(items);
          sendResponse({ ok: true, results });
        })
        .catch((err) => {
          sendResponse({ ok: false, error: String(err) });
        });
      return true;
    }

    // LLM mode: use LLM translation
    translateBatch(items, cfg)
      .then((results) => {
        sendResponse({ ok: true, results });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });

    return true; // async response
  }
});

// ─── Lifecycle ─────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
  initStorage();
});

chrome.runtime.onStartup?.addListener(() => {
  initStorage();
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
