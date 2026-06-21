/**
 * Tests for llm-stream.ts — LLM batch translation with streaming.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────

// We'll set up streamObject mock that we can control per-test
const mockStreamObject = vi.fn();
const mockCreateOpenAI = vi.fn(() => ({
  chat: vi.fn((model: string) => ({ model })),
}));

vi.mock('ai', () => ({
  streamObject: (...args: any[]) => mockStreamObject(...args),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: (...args: any[]) => mockCreateOpenAI(...args),
}));

vi.mock('../src/lib/llm-url', () => ({
  baseUrlFromEndpoint: (url: string) => url.replace(/\/chat\/completions\/?$/, ''),
}));

// ── Import after mocks ───────────────────────────────────────────────

let streamBatch: typeof import('../src/lib/llm-stream').streamBatch;
let buildBatchedUserMessage: typeof import('../src/lib/llm-stream').buildBatchedUserMessage;
let validateTranslations: typeof import('../src/lib/llm-stream').validateTranslations;
let BATCHED_SYSTEM_PROMPT: typeof import('../src/lib/llm-stream').BATCHED_SYSTEM_PROMPT;
let BatchedResultsSchema: typeof import('../src/lib/llm-stream').BatchedResultsSchema;

beforeEach(async () => {
  vi.clearAllMocks();

  const mod = await import('../src/lib/llm-stream');
  streamBatch = mod.streamBatch;
  buildBatchedUserMessage = mod.buildBatchedUserMessage;
  validateTranslations = mod.validateTranslations;
  BATCHED_SYSTEM_PROMPT = mod.BATCHED_SYSTEM_PROMPT;
  BatchedResultsSchema = mod.BatchedResultsSchema;
});

// ── Helpers ──────────────────────────────────────────────────────────

const defaultCfg = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  apiKey: 'sk-test-key',
};

function makeItem(context: string, targets: Array<{ word: string; occurrence: number }>) {
  return { context, targets };
}

/**
 * Create a mock streamObject result that yields partial objects
 * from the given async iterable.
 */
function mockStreamResult(partialChunks: any[]) {
  async function* generatePartials() {
    for (const chunk of partialChunks) {
      yield chunk;
    }
  }

  return {
    partialObjectStream: generatePartials(),
  };
}

// ── buildBatchedUserMessage ──────────────────────────────────────────

describe('buildBatchedUserMessage', () => {
  it('formats a single item correctly', () => {
    const msg = buildBatchedUserMessage([
      makeItem('Hello world', [{ word: 'hello', occurrence: 0 }]),
    ]);

    expect(msg).toContain('Paragraph 1:');
    expect(msg).toContain('Context: Hello world');
    expect(msg).toContain('"hello"');
    expect(msg).toContain('Return JSON.');
  });

  it('formats multiple items with correct indices', () => {
    const msg = buildBatchedUserMessage([
      makeItem('First paragraph', [{ word: 'first', occurrence: 0 }]),
      makeItem('Second paragraph', [{ word: 'second', occurrence: 0 }]),
    ]);

    expect(msg).toContain('Paragraph 1:');
    expect(msg).toContain('Paragraph 2:');
    expect(msg).toContain('Targets 1:');
    expect(msg).toContain('Targets 2:');
  });

  it('truncates context to 2000 characters', () => {
    const longContext = 'a'.repeat(3000);
    const msg = buildBatchedUserMessage([
      makeItem(longContext, [{ word: 'test', occurrence: 0 }]),
    ]);

    // Should contain exactly 2000 'a' chars in the context portion
    const contextMatch = msg.match(/Context: (a+)/);
    expect(contextMatch).not.toBeNull();
    expect(contextMatch![1]).toHaveLength(2000);
  });

  it('serializes targets as JSON', () => {
    const msg = buildBatchedUserMessage([
      makeItem('ctx', [
        { word: 'run', occurrence: 0 },
        { word: 'run', occurrence: 1 },
      ]),
    ]);

    expect(msg).toContain(JSON.stringify([
      { word: 'run', occurrence: 0 },
      { word: 'run', occurrence: 1 },
    ]));
  });
});

// ── validateTranslations ─────────────────────────────────────────────

describe('validateTranslations', () => {
  const targets = [
    makeItem('Hello world', [
      { word: 'hello', occurrence: 0 },
      { word: 'world', occurrence: 0 },
    ]),
  ];

  it('returns valid translations with Chinese characters', () => {
    const raw = [
      { word: 'hello', occurrence: 0, translation: '你好' },
      { word: 'world', occurrence: 0, translation: '世界' },
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toEqual([
      { word: 'hello', occurrence: 0, translation: '你好' },
      { word: 'world', occurrence: 0, translation: '世界' },
    ]);
  });

  it('returns empty array for non-array input', () => {
    expect(validateTranslations(null, targets)).toEqual([]);
    expect(validateTranslations(undefined, targets)).toEqual([]);
    expect(validateTranslations('string', targets)).toEqual([]);
    expect(validateTranslations(42, targets)).toEqual([]);
  });

  it('skips entries with missing or wrong-type fields', () => {
    const raw = [
      { word: 'hello', occurrence: 0, translation: '你好' },  // valid
      { word: 123, occurrence: 0, translation: '你好' },       // word wrong type
      { word: 'hello', occurrence: 'zero', translation: '你好' }, // occurrence wrong type
      { word: 'hello', occurrence: 0, translation: 42 },       // translation wrong type
      null,                                                       // null entry
      'string',                                                   // non-object entry
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toEqual([
      { word: 'hello', occurrence: 0, translation: '你好' },
    ]);
  });

  it('filters out translations without Chinese characters', () => {
    const raw = [
      { word: 'hello', occurrence: 0, translation: 'hello' },  // no Chinese
      { word: 'world', occurrence: 0, translation: '世界' },    // has Chinese
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toEqual([
      { word: 'world', occurrence: 0, translation: '世界' },
    ]);
  });

  it('filters out translations exceeding 20 characters', () => {
    const raw = [
      { word: 'hello', occurrence: 0, translation: '这是一个超过二十个字符的很长很长很长的翻译' },
      { word: 'world', occurrence: 0, translation: '世界' },
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toEqual([
      { word: 'world', occurrence: 0, translation: '世界' },
    ]);
  });

  it('filters out empty/whitespace-only translations', () => {
    const raw = [
      { word: 'hello', occurrence: 0, translation: '' },
      { word: 'hello', occurrence: 0, translation: '   ' },
      { word: 'world', occurrence: 0, translation: '世界' },
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toEqual([
      { word: 'world', occurrence: 0, translation: '世界' },
    ]);
  });

  it('normalizes word to lowercase', () => {
    const raw = [
      { word: 'HELLO', occurrence: 0, translation: '你好' },
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toEqual([
      { word: 'hello', occurrence: 0, translation: '你好' },
    ]);
  });

  it('filters words not in the target set', () => {
    const raw = [
      { word: 'goodbye', occurrence: 0, translation: '再见' },  // not in targets
      { word: 'hello', occurrence: 0, translation: '你好' },
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toEqual([
      { word: 'hello', occurrence: 0, translation: '你好' },
    ]);
  });

  it('distinguishes by occurrence index', () => {
    const multiTargets = [
      makeItem('run run', [
        { word: 'run', occurrence: 0 },
        { word: 'run', occurrence: 1 },
      ]),
    ];

    const raw = [
      { word: 'run', occurrence: 0, translation: '跑' },
      { word: 'run', occurrence: 1, translation: '运行' },
      { word: 'run', occurrence: 2, translation: '别的' },  // not in targets
    ];

    const result = validateTranslations(raw, multiTargets);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ word: 'run', occurrence: 0, translation: '跑' });
    expect(result[1]).toEqual({ word: 'run', occurrence: 1, translation: '运行' });
  });

  it('trims whitespace from translations', () => {
    const raw = [
      { word: 'hello', occurrence: 0, translation: '  你好  ' },
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toEqual([
      { word: 'hello', occurrence: 0, translation: '你好' },
    ]);
  });

  it('accepts translations at exactly 20 characters', () => {
    const exact20 = '一二三四五六七八九十壹贰叁肆伍陆柒捌玖拾';  // exactly 20
    expect(exact20).toHaveLength(20);

    const raw = [
      { word: 'hello', occurrence: 0, translation: exact20 },
    ];

    const result = validateTranslations(raw, targets);

    expect(result).toHaveLength(1);
    expect(result[0].translation).toBe(exact20);
  });
});

// ── streamBatch ──────────────────────────────────────────────────────

describe('streamBatch', () => {
  it('sends correct request format to the endpoint', async () => {
    mockStreamObject.mockReturnValueOnce(mockStreamResult([
      { results: [{ translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] }] },
    ]));

    await streamBatch({
      items: [makeItem('Hello world', [{ word: 'hello', occurrence: 0 }])],
      cfg: defaultCfg,
    });

    expect(mockStreamObject).toHaveBeenCalledTimes(1);
    const callArgs = mockStreamObject.mock.calls[0][0];

    expect(callArgs.system).toBe(BATCHED_SYSTEM_PROMPT);
    expect(callArgs.temperature).toBe(0.1);
    expect(callArgs.maxOutputTokens).toBe(4096);
    expect(callArgs.prompt).toContain('Hello world');
    expect(callArgs.schema).toBe(BatchedResultsSchema);
  });

  it('calls createOpenAI with the correct base URL and API key', async () => {
    mockStreamObject.mockReturnValueOnce(mockStreamResult([
      { results: [{ translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] }] },
    ]));

    await streamBatch({
      items: [makeItem('Hello', [{ word: 'hello', occurrence: 0 }])],
      cfg: defaultCfg,
    });

    expect(mockCreateOpenAI).toHaveBeenCalledWith({
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
    });
  });

  it('handles SSE stream with word translations', async () => {
    // Simulate streaming: partial updates arrive progressively
    const chunks = [
      { results: [{ translations: [] }] },
      { results: [{ translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] }] },
      { results: [
        { translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] },
        { translations: [{ word: 'world', occurrence: 0, translation: '世界' }] },
      ] },
    ];

    mockStreamObject.mockReturnValueOnce(mockStreamResult(chunks));

    const result = await streamBatch({
      items: [
        makeItem('Hello world', [{ word: 'hello', occurrence: 0 }]),
        makeItem('The world is big', [{ word: 'world', occurrence: 0 }]),
      ],
      cfg: defaultCfg,
    });

    // Paragraph 0 should have been finalized when paragraph 1 appeared
    expect(result[0]).toEqual([{ word: 'hello', occurrence: 0, translation: '你好' }]);
    // Paragraph 1 is finalized in the last pass
    expect(result[1]).toEqual([{ word: 'world', occurrence: 0, translation: '世界' }]);
  });

  it('calls onParagraphDone for each completed paragraph', async () => {
    const chunks = [
      { results: [{ translations: [] }] },
      { results: [
        { translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] },
        { translations: [] },
      ] },
      { results: [
        { translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] },
        { translations: [{ word: 'world', occurrence: 0, translation: '世界' }] },
      ] },
    ];

    mockStreamObject.mockReturnValueOnce(mockStreamResult(chunks));

    const onParagraphDone = vi.fn();

    await streamBatch({
      items: [
        makeItem('Hello world', [{ word: 'hello', occurrence: 0 }]),
        makeItem('The world is big', [{ word: 'world', occurrence: 0 }]),
      ],
      cfg: defaultCfg,
      onParagraphDone,
    });

    // onParagraphDone should be called for paragraph 0 when it first appears as
    // a non-last item, and for paragraph 1 in the final pass
    expect(onParagraphDone).toHaveBeenCalled();

    // Check paragraph 0 callback
    const p0Call = onParagraphDone.mock.calls.find((c: any[]) => c[0] === 0);
    expect(p0Call).toBeDefined();
    expect(p0Call![1]).toEqual([{ word: 'hello', occurrence: 0, translation: '你好' }]);

    // Check paragraph 1 callback
    const p1Call = onParagraphDone.mock.calls.find((c: any[]) => c[0] === 1);
    expect(p1Call).toBeDefined();
    expect(p1Call![1]).toEqual([{ word: 'world', occurrence: 0, translation: '世界' }]);
  });

  it('handles empty items array', async () => {
    mockStreamObject.mockReturnValueOnce(mockStreamResult([
      { results: [] },
    ]));

    const onParagraphDone = vi.fn();

    const result = await streamBatch({
      items: [],
      cfg: defaultCfg,
      onParagraphDone,
    });

    expect(result).toEqual([]);
    expect(onParagraphDone).not.toHaveBeenCalled();
    // streamObject is still called even with empty items
    expect(mockStreamObject).toHaveBeenCalledTimes(1);
  });

  it('respects abort signal — throws AbortError when aborted during iteration', async () => {
    const controller = new AbortController();

    // Create a stream that yields one chunk then the signal is aborted
    async function* abortableStream() {
      yield { results: [{ translations: [] }] };
      controller.abort();
      yield { results: [{ translations: [] }] };
    }

    mockStreamObject.mockReturnValueOnce({
      partialObjectStream: abortableStream(),
    });

    await expect(
      streamBatch({
        items: [makeItem('test', [{ word: 'test', occurrence: 0 }])],
        cfg: defaultCfg,
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow('LLM stream aborted');
  });

  it('respects abort signal — throws AbortError when aborted before final pass', async () => {
    const controller = new AbortController();
    controller.abort(); // Abort before even starting

    async function* singleChunk() {
      yield { results: [{ translations: [{ word: 'test', occurrence: 0, translation: '测试' }] }] };
    }

    mockStreamObject.mockReturnValueOnce({
      partialObjectStream: singleChunk(),
    });

    await expect(
      streamBatch({
        items: [makeItem('test', [{ word: 'test', occurrence: 0 }])],
        cfg: defaultCfg,
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow('LLM stream aborted');
  });

  it('handles API/stream errors by propagating the error', async () => {
    mockStreamObject.mockReturnValueOnce({
      partialObjectStream: (async function* () {
        throw new Error('API rate limit exceeded');
      })(),
    });

    await expect(
      streamBatch({
        items: [makeItem('test', [{ word: 'test', occurrence: 0 }])],
        cfg: defaultCfg,
      }),
    ).rejects.toThrow('API rate limit exceeded');
  });

  it('handles malformed SSE data gracefully (missing results)', async () => {
    const chunks = [
      null,
      {},
      { results: null },
      { results: [null, undefined] },
      { results: [{ translations: null }] },
    ];

    mockStreamObject.mockReturnValueOnce(mockStreamResult(chunks));

    const result = await streamBatch({
      items: [makeItem('Hello', [{ word: 'hello', occurrence: 0 }])],
      cfg: defaultCfg,
    });

    // Malformed chunks produce no valid translations
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([]);
  });























  it('does not call onParagraphDone twice for the same paragraph index', async () => {
    // If a paragraph is completed during streaming (as non-last),
    // it should not be re-processed in the final pass
    const chunks = [
      { results: [
        { translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] },
        { translations: [{ word: 'world', occurrence: 0, translation: '世界' }] },
      ] },
      // Second chunk: same data, paragraph 0 should NOT trigger again
      { results: [
        { translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] },
        { translations: [{ word: 'world', occurrence: 0, translation: '世界' }] },
      ] },
    ];

    mockStreamObject.mockReturnValueOnce(mockStreamResult(chunks));

    const onParagraphDone = vi.fn();

    await streamBatch({
      items: [
        makeItem('Hello world', [{ word: 'hello', occurrence: 0 }]),
        makeItem('The world', [{ word: 'world', occurrence: 0 }]),
      ],
      cfg: defaultCfg,
      onParagraphDone,
    });

    // Each paragraph should be called exactly once
    const p0Calls = onParagraphDone.mock.calls.filter((c: any[]) => c[0] === 0);
    const p1Calls = onParagraphDone.mock.calls.filter((c: any[]) => c[0] === 1);
    expect(p0Calls).toHaveLength(1);
    expect(p1Calls).toHaveLength(1);
  });

  it('returns empty arrays for paragraphs that produce no valid translations', async () => {
    const chunks = [
      { results: [
        { translations: [{ word: 'unknown', occurrence: 0, translation: '未知词' }] },
      ] },
    ];

    mockStreamObject.mockReturnValueOnce(mockStreamResult(chunks));

    const result = await streamBatch({
      items: [makeItem('Some text', [{ word: 'hello', occurrence: 0 }])],
      cfg: defaultCfg,
    });

    // 'unknown' is not in targets, so it gets filtered out
    expect(result).toEqual([[]]);
  });

  it('passes abortSignal to streamObject', async () => {
    const controller = new AbortController();

    mockStreamObject.mockReturnValueOnce(mockStreamResult([
      { results: [{ translations: [{ word: 'test', occurrence: 0, translation: '测试' }] }] },
    ]));

    await streamBatch({
      items: [makeItem('test', [{ word: 'test', occurrence: 0 }])],
      cfg: defaultCfg,
      abortSignal: controller.signal,
    });

    const callArgs = mockStreamObject.mock.calls[0][0];
    expect(callArgs.abortSignal).toBe(controller.signal);
  });

  it('works without onParagraphDone callback', async () => {
    const chunks = [
      { results: [
        { translations: [{ word: 'hello', occurrence: 0, translation: '你好' }] },
      ] },
    ];

    mockStreamObject.mockReturnValueOnce(mockStreamResult(chunks));

    // Should not throw when onParagraphDone is omitted
    const result = await streamBatch({
      items: [makeItem('Hello', [{ word: 'hello', occurrence: 0 }])],
      cfg: defaultCfg,
    });

    expect(result).toEqual([[{ word: 'hello', occurrence: 0, translation: '你好' }]]);
  });

  it('handles empty API key gracefully', async () => {
    mockStreamObject.mockReturnValueOnce(mockStreamResult([
      { results: [{ translations: [{ word: 'test', occurrence: 0, translation: '测试' }] }] },
    ]));

    await streamBatch({
      items: [makeItem('test', [{ word: 'test', occurrence: 0 }])],
      cfg: { ...defaultCfg, apiKey: '' },
    });

    expect(mockCreateOpenAI).toHaveBeenCalledWith({
      baseURL: 'https://api.openai.com/v1',
      apiKey: undefined,
    });
  });

  it('processes multiple paragraphs with mixed valid/invalid translations', async () => {
    const chunks = [
      { results: [
        { translations: [
          { word: 'hello', occurrence: 0, translation: '你好' },
          { word: 'goodbye', occurrence: 0, translation: '再见' },  // not in targets
        ] },
        { translations: [
          { word: 'world', occurrence: 0, translation: '世界' },
        ] },
      ] },
    ];

    mockStreamObject.mockReturnValueOnce(mockStreamResult(chunks));

    const result = await streamBatch({
      items: [
        makeItem('Hello', [{ word: 'hello', occurrence: 0 }]),
        makeItem('World', [{ word: 'world', occurrence: 0 }]),
      ],
      cfg: defaultCfg,
    });

    expect(result[0]).toEqual([{ word: 'hello', occurrence: 0, translation: '你好' }]);
    expect(result[1]).toEqual([{ word: 'world', occurrence: 0, translation: '世界' }]);
  });
});
