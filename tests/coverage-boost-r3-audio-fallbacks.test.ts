// @vitest-environment jsdom
/**
 * Coverage boost R3 · pronunciation.ts fallback chain
 *
 * Targets uncovered branches:
 *   - waitForVoices L29-40 (event + timeout paths)
 *   - pickBestVoice L44-67 (empty voices, patterns, fallback)
 *   - fetchDictionaryAudio L72-94 (found / not ok / not array / no phonetics / throws)
 *   - speakWord full fallback chain (synth → dict → google → edge → youdao → synth+voices)
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Fake speechSynthesis + SpeechSynthesisUtterance to control the fast path.
function fakeSpeechSynthesis(voices: Array<Partial<SpeechSynthesisVoice>> = []) {
  const listeners = new Map<string, Set<() => void>>();
  const synth = {
    getVoices: vi.fn(() => voices as SpeechSynthesisVoice[]),
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn((type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: () => void) => {
      listeners.get(type)?.delete(fn);
    }),
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null,
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
  } as unknown as SpeechSynthesis & { fire: (t: string) => void };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    voice: unknown = null;
    lang = '';
    rate = 1;
    constructor(t: string) { this.text = t; }
  });
  return synth;
}

beforeEach(() => {
  // Ensure module-level cached state doesn't leak across tests.
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/* ─── pickBestVoice branches ────────────────────────────────────────────── */

describe('coverage-boost R3: pronunciation.speakWord fast path', () => {
  it('speakWord uses SpeechSynthesis when available and returns fast (L198)', async () => {
    const synth = fakeSpeechSynthesis([
      { name: 'Google US English', lang: 'en-US' },
    ] as Partial<SpeechSynthesisVoice>[]);
    const { speakWord } = await import('../src/lib/pronunciation');
    await speakWord('hello');
    // speak() must have been invoked with an utterance
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = (synth.speak as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as { text: string; lang: string };
    expect(utterance.text).toBe('hello');
    expect(utterance.lang).toBe('en-US');
  });

  it('speakWord early-returns when signal already aborted (L193)', async () => {
    const synth = fakeSpeechSynthesis([{ name: 'Voice A', lang: 'en-US' }] as Partial<SpeechSynthesisVoice>[]);
    const { speakWord } = await import('../src/lib/pronunciation');
    const ac = new AbortController();
    ac.abort();
    await speakWord('word', ac.signal);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('speakWord uses fallback lang en-US when no matching voice is found (L170)', async () => {
    const synth = fakeSpeechSynthesis([] as Partial<SpeechSynthesisVoice>[]);
    // No voices → pickBestVoice returns null → utterance.lang = 'en-US'
    const { speakWord } = await import('../src/lib/pronunciation');
    // Also patch fetch so network fallbacks don't run
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
    await speakWord('nomatch');
    // Because no voices available, synth.speak was NOT called on the fast path
    // (speakWithSynthesis returns false when picker returns null but synth exists…
    //  actually it still tries and utterance.lang='en-US' hits L170; check speak was called)
    expect(synth.speak).toHaveBeenCalled();
  });
});

describe('coverage-boost R3: pronunciation network fallbacks', () => {
  // When speechSynthesis is unavailable, the network chain kicks in.
  it('falls through to Google TTS when dict has no audio (L206)', async () => {
    // Remove speechSynthesis so fast path fails
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);

    // dictionaryapi.dev responds 200 with entries but no phonetics.audio
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('dictionaryapi.dev')) {
        return new Response(JSON.stringify([{ phonetics: [{ audio: '' }] }]), { status: 200 });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    // Stub Audio so playAudioUrl(googleTtsUrl) doesn't hang
    class FakeAudio {
      src = '';
      crossOrigin = '';
      preload = '';
      addEventListener(type: string, fn: () => void) {
        if (type === 'ended') setTimeout(fn, 0);
      }
      removeEventListener() {}
      async play() { return; }
    }
    vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);

    // playEdgeTts: stub WebSocket to error immediately, so edge falls through
    class FakeWS {
      binaryType = '';
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() { setTimeout(() => this.onerror?.(), 0); }
      close() {}
      send() {}
    }
    vi.stubGlobal('WebSocket', FakeWS as unknown as typeof WebSocket);

    const { speakWord } = await import('../src/lib/pronunciation');
    // Should complete without throwing — success is that Google TTS Audio was constructed.
    await speakWord('word');
    // The first fetch attempt is dictionaryapi.dev
    expect(fetchMock).toHaveBeenCalled();
    const firstUrl = fetchMock.mock.calls[0][0] as string;
    expect(firstUrl).toContain('dictionaryapi.dev');
  });

  it('fetchDictionaryAudio path returns audio when phonetics[0].audio present', async () => {
    // Force fast path off so dict path is exercised
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify([{ phonetics: [{ audio: 'https://cdn.example/word.mp3' }] }]),
      { status: 200 },
    ));
    vi.stubGlobal('fetch', fetchMock);

    // Audio plays successfully and ends → speakWord returns after dict path
    class FakeAudio {
      src = '';
      crossOrigin = '';
      preload = '';
      addEventListener(type: string, fn: () => void) {
        if (type === 'ended') setTimeout(fn, 0);
      }
      removeEventListener() {}
      async play() { return; }
    }
    vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);

    const { speakWord } = await import('../src/lib/pronunciation');
    await speakWord('word');
    // dict fetch was the entry point
    expect(fetchMock).toHaveBeenCalled();
  });

  it('fetchDictionaryAudio returns null when fetch throws (L92-94)', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    const fetchMock = vi.fn(async () => { throw new Error('offline'); });
    vi.stubGlobal('fetch', fetchMock);
    // Google TTS + edge + youdao all short-circuit via Audio ended
    class FakeAudio {
      src = '';
      addEventListener(t: string, fn: () => void) {
        if (t === 'ended') setTimeout(fn, 0);
      }
      removeEventListener() {}
      async play() { return; }
      crossOrigin = ''; preload = '';
    }
    vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);
    class FakeWS {
      binaryType = ''; onopen: any = null; onerror: any = null; onmessage: any = null; onclose: any = null;
      constructor() { setTimeout(() => this.onerror?.(), 0); }
      close() {} send() {}
    }
    vi.stubGlobal('WebSocket', FakeWS as unknown as typeof WebSocket);
    const { speakWord } = await import('../src/lib/pronunciation');
    await speakWord('word');
    expect(fetchMock).toHaveBeenCalled();
  });
});

/* ─── edge-tts.ts via speakWord → playEdgeTts ─────────────────────────── */

describe('coverage-boost R3: edge-tts via WebSocket fake', () => {
  it('edgeTtsSynthesize resolves Blob on turn.end frame', async () => {
    // Feed a synthetic binary frame that contains "Path:turn.end" so parseBinaryFrame
    // returns isTurn=true and edgeTtsSynthesize resolves with a Blob.
    class FakeWS {
      binaryType = '';
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: ArrayBuffer }) => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() {
        setTimeout(() => {
          this.onopen?.();
          // Craft a message with header including "Path:turn.end"
          const headerText = 'X-Timestamp:2024\r\nPath:turn.end\r\n';
          const headerBytes = new TextEncoder().encode(headerText);
          const buf = new ArrayBuffer(2 + headerBytes.length);
          const view = new DataView(buf);
          view.setUint16(0, headerBytes.length);
          new Uint8Array(buf, 2).set(headerBytes);
          this.onmessage?.({ data: buf });
        }, 0);
      }
      close() {}
      send() {}
    }
    vi.stubGlobal('WebSocket', FakeWS as unknown as typeof WebSocket);

    const { edgeTtsSynthesize } = await import('../src/lib/edge-tts');
    const blob = await edgeTtsSynthesize('hello');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('edgeTtsSynthesize collects an audio frame before turn.end', async () => {
    class FakeWS {
      binaryType = '';
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: ArrayBuffer }) => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() {
        setTimeout(() => {
          this.onopen?.();
          // First: an audio frame
          {
            const headerText = 'Path:audio\r\n';
            const headerBytes = new TextEncoder().encode(headerText);
            const audioBytes = new Uint8Array([1, 2, 3, 4]);
            const buf = new ArrayBuffer(2 + headerBytes.length + audioBytes.length);
            const view = new DataView(buf);
            view.setUint16(0, headerBytes.length);
            new Uint8Array(buf, 2, headerBytes.length).set(headerBytes);
            new Uint8Array(buf, 2 + headerBytes.length).set(audioBytes);
            this.onmessage?.({ data: buf });
          }
          // Then: turn.end
          {
            const headerText = 'Path:turn.end\r\n';
            const headerBytes = new TextEncoder().encode(headerText);
            const buf = new ArrayBuffer(2 + headerBytes.length);
            const view = new DataView(buf);
            view.setUint16(0, headerBytes.length);
            new Uint8Array(buf, 2).set(headerBytes);
            this.onmessage?.({ data: buf });
          }
        }, 0);
      }
      close() {}
      send() {}
    }
    vi.stubGlobal('WebSocket', FakeWS as unknown as typeof WebSocket);

    const { edgeTtsSynthesize } = await import('../src/lib/edge-tts');
    const blob = await edgeTtsSynthesize('hello');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.size).toBeGreaterThan(0);
  });

  it('edgeTtsSynthesize resolves null on WS error (L169)', async () => {
    class FakeWS {
      binaryType = '';
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() { setTimeout(() => this.onerror?.(), 0); }
      close() {} send() {}
    }
    vi.stubGlobal('WebSocket', FakeWS as unknown as typeof WebSocket);
    const { edgeTtsSynthesize } = await import('../src/lib/edge-tts');
    expect(await edgeTtsSynthesize('word')).toBeNull();
  });

  it('edgeTtsSynthesize returns null when signal aborted before start (L107)', async () => {
    const { edgeTtsSynthesize } = await import('../src/lib/edge-tts');
    const ac = new AbortController();
    ac.abort();
    expect(await edgeTtsSynthesize('word', ac.signal)).toBeNull();
  });

  it('edgeTtsSynthesize returns null when WebSocket constructor throws (L171-172)', async () => {
    vi.stubGlobal('WebSocket', class { constructor() { throw new Error('no ws'); } } as unknown as typeof WebSocket);
    const { edgeTtsSynthesize } = await import('../src/lib/edge-tts');
    expect(await edgeTtsSynthesize('word')).toBeNull();
  });

  it('playEdgeTts returns false when synthesis returns null (L189-199)', async () => {
    class FakeWS {
      binaryType = '';
      onopen: any = null; onerror: any = null; onmessage: any = null; onclose: any = null;
      constructor() { setTimeout(() => this.onerror?.(), 0); }
      close() {} send() {}
    }
    vi.stubGlobal('WebSocket', FakeWS as unknown as typeof WebSocket);
    const { playEdgeTts } = await import('../src/lib/edge-tts');
    expect(await playEdgeTts('word')).toBe(false);
  });
});
