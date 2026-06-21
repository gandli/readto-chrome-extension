import { streamBatch } from './llm-stream';
import { loadWordlist, getTranslator, filterForLevel } from './level-filter';
import { applyAnnotations } from './inline-renderer';
import type { CefrLevel, LlmConfig, WordMatch } from './types';

interface StreamPreviewParams {
  items: Array<{ context: string; targets: Array<{ word: string; occurrence: number }> }>;
  elements: HTMLElement[];
  cfg: LlmConfig;
  level: CefrLevel;
  abortSignal: AbortSignal;
  onParagraphDone?: (index: number) => void;
}

/**
 * Renders annotations on preview elements using local dict first,
 * then streams LLM translations to fill in missing words.
 */
export async function streamPreviewAnnotations({
  items,
  elements,
  cfg,
  level,
  abortSignal,
  onParagraphDone,
}: StreamPreviewParams): Promise<void> {
  // Load CEFR wordlist
  try {
    await loadWordlist();
  } catch (err) {
    console.warn('[readto] wordlist load failed in stream-preview:', err);
  }

  if (abortSignal.aborted) return;

  // Phase 1: Seed with local dictionary translations
  try {
    const translator = getTranslator({ level, translationMode: 'local' });
    const localResults = await Promise.all(
      items.map((item) =>
        translator.translate({ context: item.context, targets: item.targets })
      )
    );

    for (let i = 0; i < items.length; i++) {
      if (abortSignal.aborted) return;
      const matches = filterForLevel(elements[i], level);
      applyAnnotations(elements[i], matches, localResults[i]);
      onParagraphDone?.(i);
    }
  } catch (err) {
    console.warn('[readto] local-dict seed failed:', err);
  }

  // Phase 2: LLM stream to fill remaining gaps
  try {
    await streamBatch({
      items,
      cfg,
      abortSignal,
      onParagraphDone: (index, translations) => {
        if (abortSignal.aborted) return;
        if (translations.length === 0) return;
        const matches = filterForLevel(elements[index], level);
        applyAnnotations(elements[index], matches, translations);
        onParagraphDone?.(index);
      },
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return;
    console.warn('[readto] LLM stream failed, keeping local-dict annotations:', err);
  }
}
