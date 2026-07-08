/**
 * Local translation dictionary.
 *
 * Loads the full ~160K word dictionary from translations-data.json
 * for local mode translations without calling the service worker.
 */

import type { Translator, WordTranslation } from './types';
// NOTE: unused imports/regex are kept prefixed with `_` because this file
// hosts a partially-implemented local translation path; removing them would
// require rewriting the module. Reintroduce (drop `_`) when the local path
// is wired up in a follow-up.
import { loadWordlist as _loadWordlist, tokenizeWords as _tokenizeWords, type FilteredWord as _FilteredWord } from './level-filter';

/** Cached dictionary map */
let dictMap: Map<string, string> | null = null;
let dictPromise: Promise<Map<string, string>> | null = null;

/**
 * Load the full dictionary from the JSON file.
 * Uses chrome.runtime.getURL() for extension context.
 */
async function loadFullDictionary(): Promise<Map<string, string>> {
  if (dictMap) return dictMap;
  if (dictPromise) return dictPromise;

  dictPromise = (async () => {
    try {
      // Use chrome.runtime.getURL for extension context
      const url = chrome.runtime.getURL('assets/translations-data.json');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch translations: ${response.status}`);
      }
      const data = await response.json();
      dictMap = new Map(Object.entries(data));
      console.log(`[readto] Loaded ${dictMap.size} translations from dictionary`);
      return dictMap;
    } catch (err) {
      console.error('[readto] Failed to load translations:', err);
      // Return empty map as fallback
      dictMap = new Map();
      return dictMap;
    }
  })();

  return dictPromise;
}

/** Get or initialize the dictionary map */
async function getDictMap(): Promise<Map<string, string>> {
  return loadFullDictionary();
}

/** Regex for matching English words */
const _WORD_RE = /[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019-]*[A-Za-z\u00C0-\u024F]|[A-Za-z\u00C0-\u024F]/g;

/**
 * Local dictionary translator.
 * Looks up words in the built-in English→Chinese dictionary.
 */
const localTranslator: Translator = {
  kind: 'local',
  async translate(params: { context: string; targets: Array<{ word: string; occurrence: number }> }): Promise<WordTranslation[]> {
    const dict = await getDictMap();
    const results: WordTranslation[] = [];

    for (const target of params.targets) {
      const translation = dict.get(target.word.toLowerCase());
      if (translation) {
        results.push({
          word: target.word.toLowerCase(),
          occurrence: target.occurrence,
          translation,
        });
      }
    }

    return results;
  },
};

export default localTranslator;

/**
 * Get the appropriate translator for the given configuration.
 * Returns local dict translator for 'local' mode, LLM translator for 'llm' mode.
 */
export function getTranslator(config: {
  translationMode: 'local' | 'llm';
  llm?: unknown;
  /** Passed by callers such as options preview; not used by local translator but kept for API symmetry. */
  level?: import('./types').CefrLevel;
}): Translator {
  if (config.translationMode === 'llm') {
    // LLM translator is loaded lazily to avoid bundling AI SDK in content scripts
    return createLlmTranslator(config.llm as { endpoint: string; model: string; apiKey: string });
  }
  return localTranslator;
}

/** Create an LLM-based translator (lazy-loaded) */
function createLlmTranslator(cfg: { endpoint: string; model: string; apiKey: string }): Translator {
  return {
    kind: 'llm',
    async translate(params) {
      // Dynamic import to keep the AI SDK out of the main content script bundle
      const { streamBatch } = await import('./llm-stream');
      const results: WordTranslation[] = [];

      await streamBatch({
        items: [params],
        cfg,
        abortSignal: AbortSignal.timeout(120_000),
        onParagraphDone: (_index, translations) => {
          results.push(...translations);
        },
      });

      return results;
    },
  };
}
