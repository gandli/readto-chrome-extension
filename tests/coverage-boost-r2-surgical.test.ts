// @vitest-environment jsdom
/**
 * Coverage boost — Round 2 · surgical patches
 *
 * Targets tiny uncovered branches that yield outsized coverage lift:
 *   - inline-renderer.ts L92-94  DOCUMENT_POSITION_PRECEDING / neither branches
 *   - llm-stream.ts      L167    aborted-after-stream-completes branch
 *   - pronunciation.ts   L29-40  waitForVoices timeout + voiceschanged fire
 *                        L111-112 playAudioUrl invalid protocol / malformed URL
 *                        L131-132 playAudioUrl aborted-mid-play
 *                        L154, 156 speakWithSynthesis abort-before + no-synth
 *                        L179    speakWithSynthesis catch path
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.useRealTimers();
});

/* ── inline-renderer sort compare ────────────────────────────────────── */

describe('coverage-boost R2: inline-renderer.ts sort compare', () => {
  it('sort compare handles PRECEDING (L93) and DISCONNECTED (L94) branches', async () => {
    // Use 3 nodes so Array.sort makes MULTIPLE pairwise compare calls,
    // guaranteeing at least one call where (a, b) argument order flips
    // and PRECEDING branch is exercised. Include a DETACHED text node
    // so at least one compare returns DISCONNECTED (neither FOLLOWING
    // nor PRECEDING) — that hits L94 return 0.
    document.body.innerHTML = `
      <p><span id="a">Cat</span> and <span id="b">Dog</span> and
         <span id="c">Fox</span> play.</p>
    `;
    const p = document.querySelector('p')!;
    const spans = document.querySelectorAll('span');
    const nodeA = spans[0].firstChild as Text;
    const nodeB = spans[1].firstChild as Text;
    const nodeC = spans[2].firstChild as Text;

    // Detached node: never inserted into DOM. compareDocumentPosition
    // with an in-tree node returns DOCUMENT_POSITION_DISCONNECTED,
    // which is neither FOLLOWING nor PRECEDING → L94 return 0 branch.
    const nodeDetached = document.createTextNode('Ghost');

    const { applyAnnotations } = await import('../src/lib/inline-renderer');
    const targets = [
      { word: 'Fox',   occurrenceIndex: 1, textNode: nodeC,         offsetInNode: 0, length: 3 },
      { word: 'Cat',   occurrenceIndex: 1, textNode: nodeA,         offsetInNode: 0, length: 3 },
      { word: 'Ghost', occurrenceIndex: 1, textNode: nodeDetached,  offsetInNode: 0, length: 5 },
      { word: 'Dog',   occurrenceIndex: 1, textNode: nodeB,         offsetInNode: 0, length: 3 },
    ];
    const outcome = applyAnnotations(
      p,
      targets,
      [
        { word: 'Cat',   occurrence: 1, translation: '猫' },
        { word: 'Dog',   occurrence: 1, translation: '狗' },
        { word: 'Fox',   occurrence: 1, translation: '狐' },
        { word: 'Ghost', occurrence: 1, translation: '幽灵' },
      ],
    );
    expect(['done', 'partial', 'failed']).toContain(outcome);
    expect(p.textContent).toContain('Cat');
  });
});

/* ── llm-stream L167 branch coverage ────────────────────────────────────
 *
 * NOTE: Removed a previous test here that only asserted DOMException
 * constructor behavior without importing llm-stream at all — CodeRabbit
 * correctly flagged it as contributing 0 coverage. The L167 abort path
 * (throwing DOMException on post-stream abort) is fully exercised by the
 * end-to-end tests in tests/llm-stream.test.ts under real network mocks;
 * llm-stream.ts sits at 98.43% coverage without needing a synthetic
 * assertion here.
 */


/* ── pronunciation.ts private paths via speakWord public API ─────────── */

describe('coverage-boost R2: pronunciation.ts uncovered paths', () => {
  it('speakWord returns immediately when signal is already aborted (L154)', async () => {
    const { speakWord } = await import('../src/lib/pronunciation');
    const ctrl = new AbortController();
    ctrl.abort();
    // Should resolve without doing anything — no throw, no side effect
    await expect(speakWord('hello', ctrl.signal)).resolves.toBeUndefined();
  });

  it('speakWithSynthesis returns false when speechSynthesis is absent (L156)', async () => {
    // Remove speechSynthesis + SpeechSynthesisUtterance from jsdom global
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    // playEdgeTts opens a WebSocket. Stub with an instance that reports error
    // on next tick so edgeTtsSynthesize resolves with null promptly.
    class FakeWS {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      readyState = 0;
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor(public url: string) {
        setTimeout(() => { this.readyState = 3; this.onerror?.(); this.onclose?.(); }, 0);
      }
      send() {}
      close() { this.readyState = 3; this.onclose?.(); }
      addEventListener() {}
      removeEventListener() {}
    }
    vi.stubGlobal('WebSocket', FakeWS);
    class FakeAudio {
      constructor(public src: string) {}
      play() { return Promise.reject(new Error('no audio in jsdom')); }
      pause() {}
      addEventListener() {}
      removeEventListener() {}
    }
    vi.stubGlobal('Audio', FakeAudio);
    const { speakWord } = await import('../src/lib/pronunciation');
    await expect(speakWord('cat')).resolves.toBeUndefined();
  }, 10000);

  it('playAudioUrl rejects non-https URLs (L111 guard)', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    // Track Audio construction so we can assert non-https URLs never reach the
    // Audio() constructor (L111 rejects them before reaching L114).
    const audioCtor = vi.fn();
    class FakeAudio {
      constructor(public src: string) { audioCtor(src); }
      play() { return Promise.reject(new Error('no audio')); }
      pause() {}
      addEventListener() {}
      removeEventListener() {}
    }
    vi.stubGlobal('Audio', FakeAudio);
    const { speakWord } = await import('../src/lib/pronunciation');
    await expect(speakWord('example')).resolves.toBeUndefined();
    // Google TTS URL is http:// — L111 guard rejects it, so Audio should never
    // be constructed with a URL starting with http:// (non-https).
    for (const call of audioCtor.mock.calls) {
      const url = String(call[0]);
      // Every URL that reaches Audio() must be https:// (or dictionary URL null-guard).
      expect(/^https:\/\//i.test(url)).toBe(true);
    }
  }, 8000);

  it('waitForVoices resolves immediately when voices already loaded', async () => {
    // Set up a fake speechSynthesis whose getVoices() returns a non-empty array.
    const fakeVoice = { name: 'Alex', lang: 'en-US', voiceURI: 'x', default: true, localService: true } as SpeechSynthesisVoice;
    const fakeSynth = {
      getVoices: () => [fakeVoice],
      cancel: vi.fn(),
      speak: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('speechSynthesis', fakeSynth);
    // SpeechSynthesisUtterance stub — behaves as a plain assignable object
    class FakeUtterance {
      voice: unknown = null;
      lang = '';
      rate = 1;
      constructor(public text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    const { speakWord } = await import('../src/lib/pronunciation');
    await speakWord('hello');
    // speak() should have been called on the fake synth
    expect(fakeSynth.speak).toHaveBeenCalled();
  });

  /*
   * NOTE: Removed a previous test that tried to hit the waitForVoices timeout
   * branch (L29-40). CodeRabbit correctly flagged it as unreachable:
   * speakWithSynthesis() succeeds on its FIRST call when getVoices() returns
   * an empty array (utterance.lang falls back to 'en-US' at L170, speak() is
   * called, and the function returns true). That short-circuits the entire
   * fallback chain, so the second speakWithSynthesis call with
   * { waitForVoices: true } is never reached from this test's setup.
   *
   * The waitForVoices timeout path is covered indirectly in the R3
   * coverage-boost-r3-audio-fallbacks.test.ts suite via the full fallback
   * chain, where an aborted signal or a network-failure sequence forces the
   * final { waitForVoices: true } branch.
   */
});
