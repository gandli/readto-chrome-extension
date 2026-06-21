/**
 * Inline renderer for readto annotations.
 *
 * This module handles inserting annotation spans into the DOM:
 * - Replaces word text nodes with <span data-readto> shadow DOM elements
 * - LRU cache for word details (tooltips)
 * - Applies translations from a map to filtered word targets
 */

import { createReadtoSpan, type WordDetail } from './level-filter';
import type { FilteredWord } from './level-filter';

/** Maximum number of word details to keep in the LRU cache */
const CACHE_MAX = 100;

/** LRU cache for word details (phonetic, examples, etc.) */
const detailCache = new Map<string, WordDetail | null>();

/**
 * Fetch word detail with LRU caching.
 * Calls the background script's GET_WORD_DETAIL message handler.
 */
export async function getWordDetail(word: string): Promise<WordDetail | null> {
  const key = word.toLowerCase();

  // Move to end (most recently used) if in cache
  if (detailCache.has(key)) {
    const cached = detailCache.get(key) ?? null;
    detailCache.delete(key);
    detailCache.set(key, cached);
    return cached;
  }

  let detail: WordDetail | null = null;
  let success = false;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_WORD_DETAIL',
      word: key,
    });
    if (response && response.ok) {
      detail = response.detail;
      success = true;
    }
  } catch {
    // Message channel closed or service worker inactive
  }

  if (success) {
    // Evict oldest entry if cache is full
    if (detailCache.size >= CACHE_MAX) {
      const oldest = detailCache.keys().next().value;
      if (oldest !== undefined) detailCache.delete(oldest);
    }
    detailCache.set(key, detail);
  }

  return detail;
}

export type AnnotationOutcome = 'done' | 'partial' | 'failed';

/**
 * Apply translations to a set of filtered words in the DOM.
 *
 * For each word target, creates a range over the original text,
 * removes it, and inserts a readto annotation span.
 *
 * @param doc - The document containing the text nodes
 * @param targets - Words to annotate (from filterWords)
 * @param translations - Map of "word#occurrence" → translation string
 * @returns 'done' if all words annotated, 'partial' if some skipped, 'failed' if none annotated
 */
export function applyAnnotations(
  container: Element,
  targets: FilteredWord[],
  translations: Array<{ word: string; occurrence: number; translation: string }>,
  options: { autoSpeak?: boolean } = {},
): AnnotationOutcome {
  const doc = container.ownerDocument;
  // Build lookup map
  const translationMap = new Map<string, string>();
  for (const t of translations) {
    translationMap.set(`${t.word}#${t.occurrence}`, t.translation);
  }

  // Sort targets in reverse document order to avoid offset shifts
  const sorted = [...targets].sort((a, b) => {
    if (a.textNode === b.textNode) return b.offsetInNode - a.offsetInNode;
    const pos = a.textNode.compareDocumentPosition(b.textNode);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return 1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return -1;
    return 0;
  });

  let annotated = 0;
  let skipped = 0;

  for (const target of sorted) {
    const key = `${target.word}#${target.occurrenceIndex}`;
    const translation = translationMap.get(key);

    if (translation === undefined) {
      skipped++;
      continue;
    }

    try {
      const range = doc.createRange();
      range.setStart(target.textNode, target.offsetInNode);
      range.setEnd(target.textNode, target.offsetInNode + target.length);

      const originalText = target.textNode.data.slice(
        target.offsetInNode,
        target.offsetInNode + target.length,
      );

      const annotationSpan = createReadtoSpan(doc, originalText, translation, {
        withHoverDetail: true,
        getDetail: getWordDetail,
        autoSpeak: options.autoSpeak,
      });

      range.deleteContents();
      range.insertNode(annotationSpan);
      annotated++;
    } catch {
      // Range or DOM manipulation failed; skip this word
    }
  }

  if (annotated === 0 && targets.length > 0) return 'failed';
  if (skipped > 0 || annotated < targets.length) return 'partial';
  return 'done';
}
