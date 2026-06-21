// @vitest-environment jsdom
/**
 * Tests for stream-preview.ts — streamPreviewAnnotations function.
 *
 * Covers:
 * 1. Full happy path (local dict + LLM stream)
 * 2. Wordlist load failure (catch block, continues)
 * 3. AbortSignal already aborted at start
 * 4. Abort during local-dict phase (abortSignal.aborted check in loop)
 * 5. Abort during LLM stream phase (onParagraphDone guard)
 * 6. LLM stream AbortError (silently returns)
 * 7. LLM stream other errors (keeps local annotations, warns)
 * 8. Empty items array
 * 9. onParagraphDone callback
 * 10. LLM onParagraphDone skips empty translations
 * 11. Local-dict phase error still continues to LLM
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock dependencies (vi.hoisted ensures they exist before vi.mock hoisting) ──

const { mockLoadWordlist, mockGetTranslator, mockFilterForLevel, mockApplyAnnotations, mockStreamBatch } = vi.hoisted(() => ({
  mockLoadWordlist: vi.fn(),
  mockGetTranslator: vi.fn(),
  mockFilterForLevel: vi.fn(),
  mockApplyAnnotations: vi.fn(),
  mockStreamBatch: vi.fn(),
}));

vi.mock('../src/lib/level-filter', () => ({
  loadWordlist: mockLoadWordlist,
  getTranslator: mockGetTranslator,
  filterForLevel: mockFilterForLevel,
}));

vi.mock('../src/lib/inline-renderer', () => ({
  applyAnnotations: mockApplyAnnotations,
}));

vi.mock('../src/lib/llm-stream', () => ({
  streamBatch: mockStreamBatch,
}));

// ── Import after mocks ───────────────────────────────────────────────

import { streamPreviewAnnotations } from '../src/lib/stream-preview';

// ── Helpers ──────────────────────────────────────────────────────────

function makeElement(): HTMLElement {
  return document.createElement('div');
}

function makeAbortController(aborted = false): AbortController {
  const ac = new AbortController();
  if (aborted) ac.abort();
  return ac;
}

const items = [
  { context: 'Hello world', targets: [{ word: 'hello', occurrence: 0 }, { word: 'world', occurrence: 0 }] },
  { context: 'Good morning', targets: [{ word: 'good', occurrence: 0 }, { word: 'morning', occurrence: 0 }] },
];

const localResults = [
  [{ word: 'hello', occurrence: 0, translation: '你好' }],
  [{ word: 'morning', occurrence: 0, translation: '早上好' }],
];

const llmTranslations = [
  [{ word: 'world', occurrence: 0, translation: '世界' }],
  [{ word: 'good', occurrence: 0, translation: '好' }],
];

const cfg = { endpoint: 'https://api.openai.com', model: 'gpt-4', apiKey: 'sk-x' };
const level = 'B1';

const mockTranslator = {
  kind: 'local' as const,
  translate: vi.fn(),
};

const fakeMatches = [{ word: 'hello', occurrenceIndex: 0 }] as any[];

// ── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  mockLoadWordlist.mockResolvedValue(new Map());
  mockGetTranslator.mockReturnValue(mockTranslator);
  mockTranslator.translate.mockImplementation((params: any) => {
    const idx = items.findIndex((i: any) => i.context === params.context);
    return Promise.resolve(idx >= 0 ? localResults[idx] : []);
  });
  mockFilterForLevel.mockReturnValue(fakeMatches);
  mockApplyAnnotations.mockReturnValue('done');
  mockStreamBatch.mockImplementation(async (params: any) => {
    // Simulate onParagraphDone callbacks based on actual items
    for (let i = 0; i < params.items.length; i++) {
      if (llmTranslations[i]) {
        params.onParagraphDone?.(i, llmTranslations[i]);
      }
    }
    return params.items.map((_: any, i: number) => llmTranslations[i] ?? []);
  });
});

describe('streamPreviewAnnotations', () => {
  // 1. Full happy path
  it('loads wordlist, applies local annotations, then streams LLM translations', async () => {
    const elements = [makeElement(), makeElement()];
    const ac = makeAbortController();

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: ac.signal,
    });

    // Wordlist loaded
    expect(mockLoadWordlist).toHaveBeenCalledTimes(1);

    // Local translator used
    expect(mockGetTranslator).toHaveBeenCalledWith({ level, translationMode: 'local' });
    expect(mockTranslator.translate).toHaveBeenCalledTimes(2);

    // Local annotations applied per paragraph (2 local + 2 LLM = 4 total)
    expect(mockApplyAnnotations).toHaveBeenCalledTimes(4);
    expect(mockApplyAnnotations).toHaveBeenNthCalledWith(1, elements[0], fakeMatches, localResults[0]);
    expect(mockApplyAnnotations).toHaveBeenNthCalledWith(2, elements[1], fakeMatches, localResults[1]);

    // LLM stream called
    expect(mockStreamBatch).toHaveBeenCalledTimes(1);
    expect(mockStreamBatch).toHaveBeenCalledWith(expect.objectContaining({
      items,
      cfg,
      abortSignal: ac.signal,
    }));
  });

  // 2. Wordlist load failure
  it('continues if wordlist load fails', async () => {
    mockLoadWordlist.mockRejectedValueOnce(new Error('network down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const elements = [makeElement(), makeElement()];
    const ac = makeAbortController();

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: ac.signal,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      '[readto] wordlist load failed in stream-preview:',
      expect.any(Error),
    );
    // Should still proceed to local + LLM phases
    expect(mockGetTranslator).toHaveBeenCalled();
    expect(mockStreamBatch).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // 3. AbortSignal already aborted
  it('returns immediately if abortSignal is already aborted', async () => {
    const elements = [makeElement(), makeElement()];
    const ac = makeAbortController(true);

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: ac.signal,
    });

    // loadWordlist is called before the abort check
    expect(mockLoadWordlist).toHaveBeenCalled();
    // But local translator should NOT be called
    expect(mockGetTranslator).not.toHaveBeenCalled();
    expect(mockStreamBatch).not.toHaveBeenCalled();
  });

  // 4. Abort during local-dict phase
  it('stops local-dict loop when signal aborts between paragraphs', async () => {
    const elements = [makeElement(), makeElement()];
    const ac = makeAbortController();

    // After the first translate call, mark the signal as aborted
    mockTranslator.translate.mockImplementation(async (params: any) => {
      const idx = items.findIndex((i: any) => i.context === params.context);
      if (idx === 0) {
        // Return result for first item, then abort
        return localResults[0];
      }
      // This won't be reached if abort happens before next translate
      return localResults[1] ?? [];
    });

    // We abort the signal right after the first local translate completes.
    // The loop does: if (aborted) return; filterForLevel; applyAnnotations; onParagraphDone
    // So we need to abort before the 2nd iteration's check.
    // The translate calls happen in Promise.all before the loop, so both are already done.
    // The abort check in the loop is what we test. Let's abort after first loop iteration.
    let onDoneCallCount = 0;
    // Use filterForLevel to trigger abort after first loop iteration processes
    mockFilterForLevel.mockImplementation(() => {
      onDoneCallCount++;
      if (onDoneCallCount === 1) {
        // First iteration: returns matches, doesn't abort yet
        return fakeMatches;
      }
      // Should not reach here for 2nd iteration if abort works
      return fakeMatches;
    });

    // Actually, let's think more carefully. The loop is:
    //   for (let i = 0; i < items.length; i++) {
    //     if (abortSignal.aborted) return;      <-- check
    //     const matches = filterForLevel(...);   <-- call
    //     applyAnnotations(...);
    //     onParagraphDone?.(i);
    //   }
    // So we abort BETWEEN iterations. First iteration completes fully,
    // then before 2nd iteration the abort check fires.
    // The cleanest way: abort after applyAnnotations for i=0.
    mockApplyAnnotations.mockImplementation(() => {
      ac.abort(); // Abort after first paragraph is fully annotated
      return 'done';
    });

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: ac.signal,
    });

    // First paragraph: annotated locally
    expect(mockApplyAnnotations).toHaveBeenCalledTimes(1);
    // onParagraphDone called once (for i=0)
    // LLM phase should NOT run (signal is aborted)
    expect(mockStreamBatch).not.toHaveBeenCalled();
  });

  // 5. Abort during LLM stream phase
  it('skips LLM onParagraphDone when signal aborts during stream', async () => {
    const elements = [makeElement(), makeElement()];
    const ac = makeAbortController();

    mockStreamBatch.mockImplementation(async (params: any) => {
      ac.abort(); // Abort during stream
      // The internal onParagraphDone check should skip because signal is aborted
      params.onParagraphDone?.(0, llmTranslations[0]);
      return llmTranslations;
    });

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: ac.signal,
    });

    // Local annotations: 2 paragraphs
    // LLM onParagraphDone: skipped (signal aborted)
    expect(mockApplyAnnotations).toHaveBeenCalledTimes(2);
    expect(mockStreamBatch).toHaveBeenCalledTimes(1);
  });

  // 6. LLM stream AbortError
  it('silently returns when LLM stream throws AbortError', async () => {
    const elements = [makeElement(), makeElement()];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    mockStreamBatch.mockRejectedValueOnce(abortError);

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: makeAbortController().signal,
    });

    // Should NOT log a warning for AbortError
    const llmWarnCalls = warnSpy.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('LLM stream failed'),
    );
    expect(llmWarnCalls).toHaveLength(0);
    // Local annotations should still have been applied
    expect(mockApplyAnnotations).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  // 7. LLM stream other error
  it('warns but keeps local annotations when LLM stream throws non-abort error', async () => {
    const elements = [makeElement(), makeElement()];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockStreamBatch.mockRejectedValueOnce(new Error('API limit'));

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: makeAbortController().signal,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      '[readto] LLM stream failed, keeping local-dict annotations:',
      expect.any(Error),
    );
    // Local annotations preserved
    expect(mockApplyAnnotations).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  // 8. Empty items array
  it('handles empty items array without errors', async () => {
    const ac = makeAbortController();

    await streamPreviewAnnotations({
      items: [],
      elements: [],
      cfg,
      level,
      abortSignal: ac.signal,
    });

    expect(mockLoadWordlist).toHaveBeenCalled();
    expect(mockGetTranslator).toHaveBeenCalled();
    expect(mockTranslator.translate).not.toHaveBeenCalled();
    expect(mockApplyAnnotations).not.toHaveBeenCalled();
    expect(mockStreamBatch).toHaveBeenCalledWith(expect.objectContaining({ items: [] }));
  });

  // 9. onParagraphDone callback
  it('calls onParagraphDone for each paragraph in both local and LLM phases', async () => {
    const elements = [makeElement(), makeElement()];
    const onParagraphDone = vi.fn();

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: makeAbortController().signal,
      onParagraphDone,
    });

    // Called once per paragraph in local phase (0, 1)
    // Called once per paragraph in LLM phase (0, 1)
    expect(onParagraphDone).toHaveBeenCalledTimes(4);
    expect(onParagraphDone).toHaveBeenCalledWith(0);
    expect(onParagraphDone).toHaveBeenCalledWith(1);
  });

  // 10. LLM onParagraphDone skips empty translations
  it('skips LLM onParagraphDone when translations array is empty', async () => {
    const elements = [makeElement(), makeElement()];
    mockStreamBatch.mockImplementation(async (params: any) => {
      params.onParagraphDone?.(0, []); // empty translations
      params.onParagraphDone?.(1, llmTranslations[1]);
    });

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: makeAbortController().signal,
    });

    // Local: 2, LLM: only 1 (paragraph 0 had empty translations, skipped)
    expect(mockApplyAnnotations).toHaveBeenCalledTimes(3);
  });

  // 11. Local-dict phase error still continues to LLM
  it('warns if local-dict phase throws but continues to LLM phase', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockTranslator.translate.mockRejectedValueOnce(new Error('dict error'));

    const elements = [makeElement(), makeElement()];

    await streamPreviewAnnotations({
      items,
      elements,
      cfg,
      level,
      abortSignal: makeAbortController().signal,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      '[readto] local-dict seed failed:',
      expect.any(Error),
    );
    // LLM phase still runs
    expect(mockStreamBatch).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
