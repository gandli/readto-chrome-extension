/**
 * LLM streaming translation using the Vercel AI SDK.
 *
 * Sends batches of words to an LLM endpoint for translation,
 * using structured output (JSON schema) to get reliable results.
 */

import { streamObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { baseUrlFromEndpoint } from './llm-url';
import type { WordTranslation, TranslateParams } from './types';

/* ─── Zod Schema for LLM Response ─── */

/** Schema for a single translation result */
const TranslationSchema = z.object({
  word: z.string().describe('The English word (lowercased)'),
  occurrence: z.number().describe('Occurrence index for disambiguation'),
  translation: z.string().describe('Chinese translation (max 20 chars)'),
});

/** Schema for a single paragraph's translation results */
const ParagraphResultSchema = z.object({
  translations: z.array(TranslationSchema),
});

/** Schema for the full batched response */
export const BatchedResultsSchema = z.object({
  results: z.array(ParagraphResultSchema),
});

/* ─── Prompt Construction ─── */

export const BATCHED_SYSTEM_PROMPT = `You are a bilingual dictionary assistant.
Given English text paragraphs and target words, provide concise Chinese translations for each target word IN CONTEXT.

Rules:
- Return exactly one translation per target word
- Translations must be ≤20 Chinese characters
- Use the most common/appropriate translation for the given context
- Return valid JSON matching the requested schema`;

/**
 * Build the user message for a batch of paragraphs.
 * Each paragraph contains context text and target words to translate.
 */
export function buildBatchedUserMessage(
  items: TranslateParams[],
): string {
  return items.map((item, index) => {
    return `Paragraph ${index + 1}:
Context: ${item.context.slice(0, 2000)}
Targets ${index + 1}: ${JSON.stringify(item.targets)}`;
  }).join('\n\n') + '\n\nReturn JSON.';
}

/* ─── Translation Validation ─── */

const VALID_TRANSLATION_RE = /[\u4e00-\u9fff]/;  // Must contain at least one Chinese character
const MAX_TRANSLATION_LENGTH = 20;

/**
 * Validate and filter translation results from the LLM.
 * Removes invalid entries and ensures words match the original targets.
 */
export function validateTranslations(
  raw: unknown,
  targets: TranslateParams[],
): WordTranslation[] {
  if (!Array.isArray(raw)) return [];

  const targetSet = new Set(
    targets.flatMap(item =>
      item.targets.map(t => `${t.word}#${t.occurrence}`)
    )
  );

  const results: WordTranslation[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;

    const { word, occurrence, translation } = entry as Record<string, unknown>;

    if (typeof word !== 'string' || typeof occurrence !== 'number' || typeof translation !== 'string') continue;

    const key = `${word.toLowerCase()}#${occurrence}`;
    if (!targetSet.has(key)) continue;

    const trimmed = translation.trim();
    if (!trimmed) continue;
    if (!VALID_TRANSLATION_RE.test(trimmed)) continue;
    if (trimmed.length > MAX_TRANSLATION_LENGTH) continue;

    results.push({
      word: word.toLowerCase(),
      occurrence,
      translation: trimmed,
    });
  }

  return results;
}

/* ─── Streaming Batch Processor ─── */

export interface StreamBatchParams {
  items: TranslateParams[];
  cfg: { endpoint: string; model: string; apiKey: string };
  abortSignal?: AbortSignal;
  onParagraphDone?: (index: number, translations: WordTranslation[]) => void;
}

/**
 * Stream a batch of paragraphs through the LLM for translation.
 *
 * Uses the Vercel AI SDK's generateObject with streaming to get
 * partial results as they become available, calling onParagraphDone
 * for each completed paragraph.
 */
export async function streamBatch(params: StreamBatchParams): Promise<WordTranslation[][]> {
  const { items, cfg, abortSignal, onParagraphDone } = params;

  const baseURL = baseUrlFromEndpoint(cfg.endpoint);
  const openai = createOpenAI({
    baseURL,
    apiKey: cfg.apiKey || undefined,
  });

  const completed = new Set<number>();
  const results: WordTranslation[][] = items.map(() => []);
  const streamResult = streamObject({
    model: openai.chat(cfg.model),
    schema: BatchedResultsSchema,
    system: BATCHED_SYSTEM_PROMPT,
    prompt: buildBatchedUserMessage(items),
    temperature: 0.1,
    maxOutputTokens: 4096,
    abortSignal,
  });
  const { partialObjectStream } = streamResult;
  type PartialResult = typeof partialObjectStream extends AsyncIterable<infer T> ? T : never;
  let lastPartial: PartialResult | null = null;

  const handlePartial = (index: number, raw: unknown) => {
    if (completed.has(index) || index < 0 || index >= items.length) return;
    const validated = validateTranslations(raw, [items[index]]);
    results[index] = validated;
    completed.add(index);
    onParagraphDone?.(index, validated);
  };


  for await (const partial of partialObjectStream) {
    if (abortSignal?.aborted) throw new DOMException('LLM stream aborted', 'AbortError');

    lastPartial = partial;
    const partialResults = partial?.results ?? [];

    // Process all but the last paragraph (which may still be streaming)
    for (let i = 0; i < partialResults.length - 1; i++) {
      handlePartial(i, partialResults[i]?.translations);
    }
  }

  if (abortSignal?.aborted) throw new DOMException('LLM stream aborted', 'AbortError');

  // Handle truncated output
  // (truncation check removed for API compatibility)

  // Process all remaining paragraphs from the final state
  if (lastPartial) {
    const finalResults = lastPartial.results ?? [];
    for (let i = 0; i < finalResults.length; i++) {
      handlePartial(i, finalResults[i]?.translations);
    }
  }

  return results;
}
