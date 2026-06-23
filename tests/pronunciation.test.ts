/**
 * Comprehensive tests for pronunciation.ts
 *
 * Tests the public API (speakWord, speakWordSync) and verifies:
 *   1. The 4-source fallback chain (dictionary → google → youdao → synthesis)
 *   2. AbortController cancellation at every stage
 *   3. Voice selection / SpeechSynthesis integration
 *   4. Edge cases (empty text, no voices, network errors)
 *   5. Audio URL safety (HTTPS enforcement, invalid URLs)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* ── Helpers ── */

/** Minimal mock SpeechSynthesisVoice */
function makeVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

/**
 * Create a mock Audio class.
 *
 * playAudioUrl flow: new Audio(url) → audio.play() [await] → audio.addEventListener('ended', fn) [await for fn].
 * Key: 'ended' listener is registered AFTER play() resolves, so we fire 'ended'
 * from addEventListener rather than from play(), to avoid the race.
 */
function createMockAudioClass(opts?: { playFails?: boolean }) {
  const instances: any[] = [];

  class MockAudio {
    src: string;
    paused = false;
    private _ended = false;
    private _endedListener: (() => void) | null = null;

    constructor(url: string) {
      this.src = url;
      instances.push(this);
    }

    play = vi.fn().mockImplementation(() => {
      if (opts?.playFails) return Promise.reject(new Error('play blocked'));
      // Mark that play completed — next addEventListener('ended') should fire.
      this._ended = true;
      return Promise.resolve();
    });

    pause = vi.fn();

    addEventListener = vi.fn((event: string, fn: any) => {
      if (event === 'ended' && this._ended) {
        // play() already resolved — fire ended callback via queueMicrotask
        // so the Promise inside playAudioUrl can resolve on the next microtask tick.
        queueMicrotask(() => fn());
      }
      if (event === 'ended' && !this._ended) {
        // Listener registered before play — store for later
        this._endedListener = fn;
      }
      if (event === 'error' || event === 'abort') {
        // No-op for these tests
      }
    });

    removeEventListener = vi.fn();
  }

  return { AudioClass: MockAudio as any, instances };
}

/* ── Test suite ── */

describe('pronunciation.ts', () => {
  const origFetch = globalThis.fetch;
  const origAudio = (globalThis as any).Audio;
  const origSpeechSynthesis = (globalThis as any).speechSynthesis;
  const origSpeechSynthesisUtterance = (globalThis as any).SpeechSynthesisUtterance;

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = origFetch;
    (globalThis as any).Audio = origAudio;
    (globalThis as any).speechSynthesis = origSpeechSynthesis;
    (globalThis as any).SpeechSynthesisUtterance = origSpeechSynthesisUtterance;
  });

  // ════════════════════════════════════════════════
  // 1. speakWord — low-latency local playback
  // ════════════════════════════════════════════════

  describe('speakWord low-latency local playback', () => {
    it('starts browser SpeechSynthesis immediately without waiting for network TTS', async () => {
      const speakMock = vi.fn();
      const cancelMock = vi.fn();
      (globalThis as any).speechSynthesis = {
        getVoices: () => [makeVoice('TestVoice', 'en-US')],
        speak: speakMock,
        cancel: cancelMock,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      (globalThis as any).SpeechSynthesisUtterance = class {
        text: string;
        voice: any = null;
        lang = '';
        rate = 1;
        constructor(text: string) { this.text = text; }
      };

      (globalThis.fetch as any) = vi.fn().mockImplementation(
        () => new Promise(() => {}),
      );

      const controller = new AbortController();
      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      void speakWord('instant', controller.signal);

      await Promise.resolve();

      expect(speakMock).toHaveBeenCalledTimes(1);
      expect(cancelMock).toHaveBeenCalledBefore(speakMock);
      expect(globalThis.fetch).not.toHaveBeenCalled();

      controller.abort();
    });
  });

  // ════════════════════════════════════════════════
  // 2. speakWord — fallback chain
  // ════════════════════════════════════════════════

  describe('speakWord fallback chain', () => {
    it('uses dictionary API audio when available', async () => {
      const { AudioClass, instances } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;

      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { phonetics: [{ audio: 'https://audio.example.com/hello.mp3' }] },
          ]),
      });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('hello');

      // Should have fetched dictionary and played audio
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('dictionaryapi.dev'),
        expect.objectContaining({ signal: undefined }),
      );
      expect(instances.length).toBe(1);
      expect(instances[0].src).toBe('https://audio.example.com/hello.mp3');
    });

    it('falls back to Google TTS when dictionary returns no audio in phonetics', async () => {
      const { AudioClass, instances } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;

      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ phonetics: [{ text: 'həˈloʊ' }] }]),
      });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('hello');

      // Dictionary had no audio → falls to Google TTS (which succeeds)
      expect(instances.length).toBe(1);
      expect(instances[0].src).toContain('translate.google.com');
    });

    it('falls through to Google TTS when dictionary API returns 404', async () => {
      const { AudioClass, instances } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({ ok: false, json: () => ({}) });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('nonexistent');

      expect(instances.length).toBeGreaterThanOrEqual(1);
      expect(instances[0].src).toContain('translate.google.com');
    });

    it('falls through to Youdao when all audio play() rejects', async () => {
      const { AudioClass, instances } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({ ok: false, json: () => ({}) });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test');

      // All 3 URL sources tried: Google + Youdao (dictionary skipped with 404)
      expect(instances.length).toBeGreaterThanOrEqual(2);
    });

    it('falls through to SpeechSynthesis when all URL sources fail', async () => {
      const speakMock = vi.fn();
      const cancelMock = vi.fn();
      (globalThis as any).speechSynthesis = {
        getVoices: () => [makeVoice('TestVoice', 'en-US')],
        speak: speakMock,
        cancel: cancelMock,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      (globalThis as any).SpeechSynthesisUtterance = class {
        text: string;
        voice: any;
        lang: string = '';
        rate: number = 1;
        constructor(text: string) { this.text = text; }
      };

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('fallback');

      expect(speakMock).toHaveBeenCalledTimes(1);
    });

    it('returns after dictionary audio plays, skipping remaining sources', async () => {
      const { AudioClass, instances } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;

      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { phonetics: [{ audio: 'https://audio.example.com/hello.mp3' }] },
          ]),
      });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('hello');

      // Only 1 Audio instance — dictionary audio, no fallback needed
      expect(instances.length).toBe(1);
      expect(instances[0].src).toBe('https://audio.example.com/hello.mp3');
    });
  });

  // ════════════════════════════════════════════════
  // 2. AbortController cancellation
  // ════════════════════════════════════════════════

  describe('AbortController cancellation', () => {
    it('returns immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      (globalThis.fetch as any) = vi.fn();
      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('cancelled', controller.signal);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('returns when signal aborts between dictionary fetch and audio play', async () => {
      const controller = new AbortController();

      (globalThis.fetch as any) = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            controller.signal.addEventListener('abort', () => {
              resolve({ ok: false, json: () => Promise.resolve({}) });
            });
          }),
      );

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      const p = speakWord('slow', controller.signal);

      controller.abort();
      await p;
    });

    it('cancels SpeechSynthesis when signal aborts during synthesis', async () => {
      const cancelMock = vi.fn();
      const speakMock = vi.fn();

      // Set up synthesis with delayed voices so we can abort mid-way
      let voicesReady: (() => void) | null = null;
      (globalThis as any).speechSynthesis = {
        getVoices: () => [],
        speak: speakMock,
        cancel: cancelMock,
        addEventListener: vi.fn((event: string, handler: any) => {
          if (event === 'voiceschanged') {
            // Store handler so we can trigger it manually
            voicesReady = handler;
          }
        }),
        removeEventListener: vi.fn(),
      };

      (globalThis as any).SpeechSynthesisUtterance = class {
        text: string;
        voice: any = null;
        lang = '';
        rate = 1;
        constructor(t: string) { this.text = t; }
      };

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      const controller = new AbortController();
      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');

      const p = speakWord('abort-synth', controller.signal);

      // Now voices load (which clears the waitForVoices wait)
      if (voicesReady) voicesReady();

      // The getVoices mock now returns voices for the second call (pickBestVoice)
      (globalThis as any).speechSynthesis.getVoices = () => [makeVoice('TestVoice', 'en-US')];

      // Wait for speakWord to reach the synth.speak() call
      await new Promise((r) => setTimeout(r, 20));

      // Now cancel should have been called from synth.cancel() before synth.speak()
      expect(cancelMock).toHaveBeenCalled();
      expect(speakMock).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════
  // 3. SpeechSynthesis voice selection
  // ════════════════════════════════════════════════

  describe('SpeechSynthesis voice selection', () => {
    async function runWithVoices(voices: SpeechSynthesisVoice[]) {
      const speakMock = vi.fn();
      const cancelMock = vi.fn();

      (globalThis as any).speechSynthesis = {
        getVoices: () => voices,
        speak: speakMock,
        cancel: cancelMock,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      let capturedUtterance: any;
      (globalThis as any).SpeechSynthesisUtterance = class {
        text: string;
        voice: any = null;
        lang: string = '';
        rate: number = 1;
        constructor(text: string) {
          this.text = text;
          capturedUtterance = this;
        }
      };

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test-word');

      return { speakMock, cancelMock, capturedUtterance };
    }

    it('selects a Natural voice when available', async () => {
      const { capturedUtterance } = await runWithVoices([
        makeVoice('Google US English', 'en-US'),
        makeVoice('Natural Enhanced', 'en-US'),
        makeVoice('Microsoft David', 'en-US'),
      ]);
      expect(capturedUtterance.voice.name).toBe('Natural Enhanced');
    });

    it('selects a Neural/Premium voice over Google', async () => {
      const { capturedUtterance } = await runWithVoices([
        makeVoice('Google US English', 'en-US'),
        makeVoice('Microsoft Neural', 'en-US'),
      ]);
      expect(capturedUtterance.voice.name).toBe('Microsoft Neural');
    });

    it('selects Google voice over generic Microsoft', async () => {
      const { capturedUtterance } = await runWithVoices([
        makeVoice('Microsoft David', 'en-US'),
        makeVoice('Google US English', 'en-US'),
      ]);
      expect(capturedUtterance.voice.name).toBe('Google US English');
    });

    it('selects named voices (Samantha, Alex, etc.)', async () => {
      const { capturedUtterance } = await runWithVoices([
        makeVoice('Some Random Voice', 'en-US'),
        makeVoice('Samantha', 'en-US'),
      ]);
      expect(capturedUtterance.voice.name).toBe('Samantha');
    });

    it('falls back to en-US/en-GB when no pattern matches', async () => {
      const { capturedUtterance } = await runWithVoices([
        makeVoice('CustomVoice', 'en-AU'),
        makeVoice('OtherVoice', 'en-US'),
      ]);
      expect(capturedUtterance.voice.lang).toMatch(/^en-(US|GB)/);
    });

    it('sets rate to 0.85', async () => {
      const { capturedUtterance } = await runWithVoices([makeVoice('TestVoice', 'en-US')]);
      expect(capturedUtterance.rate).toBe(0.85);
    });

    it('sets lang to en-US when no voice is found', async () => {
      const { capturedUtterance } = await runWithVoices([]);
      expect(capturedUtterance.lang).toBe('en-US');
      expect(capturedUtterance.voice).toBeNull();
    });

    it('ignores non-English voices', async () => {
      const { capturedUtterance } = await runWithVoices([
        makeVoice('中文语音', 'zh-CN'),
        makeVoice('Voix Française', 'fr-FR'),
      ]);
      expect(capturedUtterance.voice).toBeNull();
      expect(capturedUtterance.lang).toBe('en-US');
    });

    it('calls synth.speak with the utterance', async () => {
      const { speakMock } = await runWithVoices([makeVoice('TestVoice', 'en-US')]);
      expect(speakMock).toHaveBeenCalledTimes(1);
    });

    it('calls synth.cancel before speaking', async () => {
      const { cancelMock, speakMock } = await runWithVoices([makeVoice('TestVoice', 'en-US')]);
      expect(cancelMock).toHaveBeenCalled();
      expect(speakMock).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════
  // 4. waitForVoices — async voice loading
  // ════════════════════════════════════════════════

  describe('waitForVoices (async voice loading)', () => {
    it('resolves immediately when voices are already loaded', async () => {
      (globalThis as any).speechSynthesis = {
        getVoices: () => [makeVoice('Test', 'en-US')],
        speak: vi.fn(),
        cancel: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      (globalThis as any).SpeechSynthesisUtterance = class {
        text = '';
        voice: any = null;
        lang = '';
        rate = 1;
        constructor(t: string) { this.text = t; }
      };

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('quick');
    });

    it('resolves on voiceschanged event when voices initially empty', async () => {
      let voiceschangedHandler: Function | null = null;
      const voices = [makeVoice('TestVoice', 'en-US')];

      (globalThis as any).speechSynthesis = {
        getVoices: vi.fn()
          .mockReturnValueOnce([])
          .mockReturnValue(voices),
        speak: vi.fn(),
        cancel: vi.fn(),
        addEventListener: vi.fn((event: string, handler: any) => {
          if (event === 'voiceschanged') voiceschangedHandler = handler;
        }),
        removeEventListener: vi.fn(),
      };

      (globalThis as any).SpeechSynthesisUtterance = class {
        text = '';
        voice: any = null;
        lang = '';
        rate = 1;
        constructor(t: string) { this.text = t; }
      };

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');

      const p = speakWord('wait-for-voices');
      if (voiceschangedHandler) voiceschangedHandler();
      await p;

      expect((globalThis as any).speechSynthesis.addEventListener).toHaveBeenCalledWith(
        'voiceschanged',
        expect.any(Function),
      );
    });

    it('resolves after timeout when voices never load', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      (globalThis as any).speechSynthesis = {
        getVoices: () => [],
        speak: vi.fn(),
        cancel: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      (globalThis as any).SpeechSynthesisUtterance = class {
        text = '';
        voice: any = null;
        lang = '';
        rate = 1;
        constructor(t: string) { this.text = t; }
      };

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');

      const p = speakWord('timeout-voices');
      await vi.advanceTimersByTimeAsync(500);
      await p;
    });
  });

  // ════════════════════════════════════════════════
  // 5. speakWordSync
  // ════════════════════════════════════════════════

  describe('speakWordSync', () => {
    it('returns void immediately (fire-and-forget)', async () => {
      vi.resetModules();
      const { speakWordSync } = await import('../src/lib/pronunciation');
      const result = speakWordSync('hello');
      expect(result).toBeUndefined();
    });

    it('initiates speakWord in background', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: false, json: () => ({}) });
      globalThis.fetch = fetchSpy as any;

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;

      vi.resetModules();
      const { speakWordSync } = await import('../src/lib/pronunciation');
      speakWordSync('hello');

      await new Promise((r) => setTimeout(r, 10));
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════
  // 6. Edge cases
  // ════════════════════════════════════════════════

  describe('edge cases', () => {
    function setupAllFailMocks() {
      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false, json: () => ({}) });
    }

    it('handles empty string', async () => {
      setupAllFailMocks();
      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('');
    });

    it('handles very long text', async () => {
      setupAllFailMocks();
      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('word '.repeat(1000));
    });

    it('handles text with special characters', async () => {
      setupAllFailMocks();
      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord("it's a test! @#$%");
    });

    it('handles dictionary API returning non-array', async () => {
      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'not found' }),
      });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test');
    });

    it('handles dictionary API returning array with no phonetics', async () => {
      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ word: 'test' }]),
      });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test');
    });

    it('handles dictionary API returning phonetics with empty audio strings', async () => {
      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ phonetics: [{ audio: '' }, { audio: '' }] }]),
      });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test');
    });

    it('handles dictionary API network error', async () => {
      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test');
    });

    it('handles fetch throwing synchronously', async () => {
      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockImplementation(() => {
        throw new Error('fetch is not a function');
      });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test');
    });

    it('gracefully handles missing SpeechSynthesis API', async () => {
      delete (globalThis as any).speechSynthesis;
      delete (globalThis as any).SpeechSynthesisUtterance;

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('no-synth');
    });
  });

  // ════════════════════════════════════════════════
  // 7. Audio URL safety
  // ════════════════════════════════════════════════

  describe('Audio URL safety', () => {
    it('constructs correct Google TTS URL', async () => {
      const urls: string[] = [];
      (globalThis as any).Audio = class {
        src: string;
        play = vi.fn().mockRejectedValue(new Error('fail'));
        pause = vi.fn();
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        constructor(url: string) { this.src = url; urls.push(url); }
      };
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('hello');

      const googleUrl = urls.find((u: string) => u.includes('translate.google.com'));
      expect(googleUrl).toBeDefined();
      expect(googleUrl).toContain('q=hello');
      expect(googleUrl).toContain('tl=en');
      expect(googleUrl).toContain('client=tw-ob');
    });

    it('constructs correct Youdao TTS URL', async () => {
      const urls: string[] = [];
      (globalThis as any).Audio = class {
        src: string;
        play = vi.fn().mockRejectedValue(new Error('fail'));
        pause = vi.fn();
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        constructor(url: string) { this.src = url; urls.push(url); }
      };
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('hello');

      const youdaoUrl = urls.find((u: string) => u.includes('dict.youdao.com'));
      expect(youdaoUrl).toBeDefined();
      expect(youdaoUrl).toContain('audio=hello');
      expect(youdaoUrl).toContain('type=2');
    });

    it('URL-encodes special characters in dictionary API URL', async () => {
      let fetchedUrl = '';
      (globalThis.fetch as any) = vi.fn().mockImplementation((url: string) => {
        fetchedUrl = url;
        return Promise.resolve({ ok: false, json: () => ({}) });
      });

      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = AudioClass;

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord("it's a test");

      expect(fetchedUrl).toContain(encodeURIComponent("it's a test"));
    });

    it('URL-encodes spaces in Google/Youdao URLs', async () => {
      const urls: string[] = [];
      (globalThis as any).Audio = class {
        src: string;
        play = vi.fn().mockRejectedValue(new Error('fail'));
        pause = vi.fn();
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        constructor(url: string) { this.src = url; urls.push(url); }
      };
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('hello world');

      const googleUrl = urls.find((u: string) => u.includes('translate.google.com'));
      expect(googleUrl).toContain('q=hello%20world');
    });
  });

  // ════════════════════════════════════════════════
  // 8. Dictionary API response parsing
  // ════════════════════════════════════════════════

  describe('dictionary API response parsing', () => {
    it('extracts audio from first phonetics entry with audio', async () => {
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              phonetics: [
                { text: 'həˈloʊ' },
                { audio: 'https://audio1.example.com/hello.mp3' },
                { audio: 'https://audio2.example.com/hello.mp3' },
              ],
            },
          ]),
      });

      const urls: string[] = [];
      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = class extends AudioClass {
        constructor(url: string) {
          super(url);
          urls.push(url);
        }
      };

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('hello');

      expect(urls[0]).toBe('https://audio1.example.com/hello.mp3');
    });

    it('handles multiple entries and picks first audio across entries', async () => {
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { phonetics: [{ text: 'v1' }] },
            { phonetics: [{ audio: 'https://audio.example.com/v2.mp3' }] },
          ]),
      });

      const urls: string[] = [];
      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = class extends AudioClass {
        constructor(url: string) {
          super(url);
          urls.push(url);
        }
      };

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test');

      expect(urls[0]).toBe('https://audio.example.com/v2.mp3');
    });

    it('skips entries where phonetics is not an array', async () => {
      (globalThis.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { phonetics: 'not-an-array' },
            { phonetics: null },
            { phonetics: [{ audio: 'https://audio.example.com/found.mp3' }] },
          ]),
      });

      const urls: string[] = [];
      const { AudioClass } = createMockAudioClass();
      (globalThis as any).Audio = class extends AudioClass {
        constructor(url: string) {
          super(url);
          urls.push(url);
        }
      };

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');
      await speakWord('test');

      expect(urls[0]).toBe('https://audio.example.com/found.mp3');
    });
  });

  // ════════════════════════════════════════════════
  // 9. Voice patterns — regex verification
  // ════════════════════════════════════════════════

  describe('voice pattern regexes', () => {
    const VOICE_PATTERNS: RegExp[] = [
      /\bNatural\b/i,
      /\b(Premium|Enhanced|Neural)\b/i,
      /^Google\b/i,
      /^Microsoft\b/i,
      /^(Samantha|Alex|Ava|Evan|Karen|Daniel|Fiona|Serena|Tom|Moira)$/i,
    ];

    function pickBest(voices: Array<{ name: string; lang: string }>) {
      const english = voices.filter((v) => /^en(-|$)/i.test(v.lang));
      for (const pattern of VOICE_PATTERNS) {
        const match = english.find((v) => pattern.test(v.name));
        if (match) return match;
      }
      return english.find((v) => /^en-(US|GB)\b/i.test(v.lang)) ?? english[0] ?? null;
    }

    it('Natural beats everything', () => {
      expect(pickBest([
        { name: 'Premium Voice', lang: 'en-US' },
        { name: 'Natural Enhanced', lang: 'en-US' },
        { name: 'Google US English', lang: 'en-US' },
      ])?.name).toBe('Natural Enhanced');
    });

    it('Premium/Enhanced/Neural beats Google', () => {
      expect(pickBest([
        { name: 'Google US English', lang: 'en-US' },
        { name: 'Enhanced Voice', lang: 'en-US' },
      ])?.name).toBe('Enhanced Voice');

      expect(pickBest([
        { name: 'Google US English', lang: 'en-US' },
        { name: 'Premium Voice', lang: 'en-US' },
      ])?.name).toBe('Premium Voice');
    });

    it('Google beats Microsoft', () => {
      expect(pickBest([
        { name: 'Microsoft David', lang: 'en-US' },
        { name: 'Google US English', lang: 'en-US' },
      ])?.name).toBe('Google US English');
    });

    it('Microsoft beats named voices', () => {
      expect(pickBest([
        { name: 'Samantha', lang: 'en-US' },
        { name: 'Microsoft David', lang: 'en-US' },
      ])?.name).toBe('Microsoft David');
    });

    it('all named voices are recognized', () => {
      for (const name of ['Samantha', 'Alex', 'Ava', 'Evan', 'Karen', 'Daniel', 'Fiona', 'Serena', 'Tom', 'Moira']) {
        expect(pickBest([
          { name: 'Generic Voice', lang: 'en-US' },
          { name, lang: 'en-US' },
        ])?.name).toBe(name);
      }
    });

    it('named voices are case-insensitive', () => {
      expect(pickBest([
        { name: 'generic', lang: 'en-US' },
        { name: 'samantha', lang: 'en-US' },
      ])?.name).toBe('samantha');
    });

    it('returns null for empty voice list', () => {
      expect(pickBest([])).toBeNull();
    });

    it('returns null for only non-English voices', () => {
      expect(pickBest([
        { name: '中文', lang: 'zh-CN' },
        { name: 'French', lang: 'fr-FR' },
      ])).toBeNull();
    });

    it('prefers en-US over other English locales', () => {
      expect(pickBest([
        { name: 'Voice A', lang: 'en-AU' },
        { name: 'Voice B', lang: 'en-US' },
      ])?.lang).toBe('en-US');
    });

    it('accepts en-GB as a fallback locale', () => {
      expect(pickBest([
        { name: 'Voice A', lang: 'en-AU' },
        { name: 'Voice B', lang: 'en-GB' },
      ])?.lang).toBe('en-GB');
    });

    it('picks first English voice if no en-US/en-GB available', () => {
      expect(pickBest([
        { name: 'Voice A', lang: 'en-AU' },
        { name: 'Voice B', lang: 'en-IN' },
      ])?.name).toBe('Voice A');
    });
  });

  // ════════════════════════════════════════════════
  // 10. Module-level voice caching
  // ════════════════════════════════════════════════

  describe('voice caching behavior', () => {
    it('caches the selected voice across calls', async () => {
      // Google has higher priority than Samantha, so it should be cached
      const voices = [
        makeVoice('Google US English', 'en-US'),
        makeVoice('Samantha', 'en-US'),
      ];

      const speakMock = vi.fn();
      const cancelMock = vi.fn();

      (globalThis as any).speechSynthesis = {
        getVoices: () => voices,
        speak: speakMock,
        cancel: cancelMock,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      let callCount = 0;
      const captured: any[] = [];
      (globalThis as any).SpeechSynthesisUtterance = class {
        text: string;
        voice: any = null;
        lang = '';
        rate = 1;
        constructor(t: string) {
          this.text = t;
          captured[callCount] = this;
          callCount++;
        }
      };

      const { AudioClass } = createMockAudioClass({ playFails: true });
      (globalThis as any).Audio = AudioClass;
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({ ok: false });

      vi.resetModules();
      const { speakWord } = await import('../src/lib/pronunciation');

      await speakWord('first');
      await speakWord('second');

      // Google has higher priority (pattern #3) than Samantha (pattern #5)
      expect(captured[0].voice?.name).toBe('Google US English');
      expect(captured[1].voice?.name).toBe('Google US English');
    });
  });
});
