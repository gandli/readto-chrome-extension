/**
 * Multi-source pronunciation system — matches original readto extension.
 *
 * Fallback chain:
 *   1. Free Dictionary API (api.dictionaryapi.dev) → real human MP3
 *   2. Google Translate TTS → synthetic MP3
 *   3. Edge TTS (Microsoft Neural) → high quality synthetic MP3
 *   4. Youdao Dictionary → Chinese TTS service
 *   5. Browser SpeechSynthesis → local TTS (voice priority: Natural > Neural > Google > Microsoft)
 */

/* ── Voice priority for SpeechSynthesis ── */

import { playEdgeTts } from './edge-tts';

const VOICE_PATTERNS: RegExp[] = [
  /\bNatural\b/i,
  /\b(Premium|Enhanced|Neural)\b/i,
  /^Google\b/i,
  /^Microsoft\b/i,
  /^(Samantha|Alex|Ava|Evan|Karen|Daniel|Fiona|Serena|Tom|Moira)$/i,
];

let cachedVoice: SpeechSynthesisVoice | null | undefined; // undefined = not resolved yet
let voicesLoaded = false;

/** Wait for voices to be loaded (Chrome loads them async). */
function waitForVoices(synth: SpeechSynthesis, timeoutMs = 400): Promise<void> {
  if ((synth.getVoices() ?? []).length > 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { synth.removeEventListener?.('voiceschanged', finish); } catch {}
      resolve();
    };
    try { synth.addEventListener?.('voiceschanged', finish); } catch {}
    setTimeout(finish, timeoutMs);
  });
}

/** Pick the best English voice using priority patterns. */
function pickBestVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  if (!voicesLoaded) {
    voicesLoaded = true;
    try { synth.addEventListener?.('voiceschanged', () => { cachedVoice = undefined; }); } catch {}
  }

  const all = synth.getVoices?.() ?? [];
  if (all.length === 0) return (cachedVoice = null);

  const english = all.filter((v) => /^en(-|$)/i.test(v.lang));
  if (english.length === 0) return (cachedVoice = null);

  // Try priority patterns
  for (const pattern of VOICE_PATTERNS) {
    const match = english.find((v) => pattern.test(v.name));
    if (match) return (cachedVoice = match);
  }

  // Fallback: en-US or en-GB, then first available
  const fallback =
    english.find((v) => /^en-(US|GB)\b/i.test(v.lang)) ?? english[0];
  return (cachedVoice = fallback);
}

/* ── Audio URL helpers ── */

/** Free Dictionary API → MP3 URL from phonetics */
async function fetchDictionaryAudio(word: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Array.isArray(data)) return null;
    for (const entry of data) {
      const phonetics = entry?.phonetics;
      if (Array.isArray(phonetics)) {
        for (const p of phonetics) {
          if (p?.audio && typeof p.audio === 'string' && p.audio.length > 0) {
            return p.audio;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Google Translate TTS URL */
function googleTtsUrl(word: string): string {
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=en&client=tw-ob`;
}

/** Youdao Dictionary TTS URL */
function youdaoTtsUrl(word: string): string {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
}

/* ── Play audio from URL ── */

/** Try to play audio from a URL. Returns true if playback started and completed. */
async function playAudioUrl(url: string, signal?: AbortSignal): Promise<boolean> {
  if (!/^https:\/\//i.test(url)) return false;
  try { new URL(url); } catch { return false; }

  const audio = new Audio(url);
  let aborted = false;

  const onAbort = () => {
    aborted = true;
    try { audio.pause(); } catch {}
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    await audio.play();
  } catch {
    signal?.removeEventListener('abort', onAbort);
    return false;
  }

  if (aborted || signal?.aborted) {
    signal?.removeEventListener('abort', onAbort);
    return true; // was playing, got cancelled — count as "succeeded"
  }

  try {
    await new Promise<void>((resolve) => {
      audio.addEventListener('ended', () => resolve(), { once: true });
      audio.addEventListener('error', () => resolve(), { once: true });
      signal?.addEventListener('abort', () => resolve(), { once: true });
    });
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
  return true;
}

/* ── SpeechSynthesis fallback ── */

async function speakWithSynthesis(word: string, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return;
  const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;

  await waitForVoices(synth);
  if (signal?.aborted) return;

  try {
    const utterance = new SpeechSynthesisUtterance(word);
    const voice = pickBestVoice(synth);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = 0.85;
    synth.cancel();
    synth.speak(utterance);
    signal?.addEventListener('abort', () => synth.cancel(), { once: true });
  } catch {
    // SpeechSynthesis not available
  }
}

/* ── Public API ── */

/**
 * Speak a word using the 4-source fallback chain.
 * Matches original readto behavior exactly.
 *
 * @param word  The word to pronounce
 * @param signal  Optional AbortController signal to cancel playback
 */
export async function speakWord(word: string, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return;

  // 1. Free Dictionary API (real human audio)
  const dictUrl = await fetchDictionaryAudio(word, signal);
  if (signal?.aborted) return;
  if (dictUrl && (await playAudioUrl(dictUrl, signal))) return;

  // 2. Google Translate TTS
  if (await playAudioUrl(googleTtsUrl(word), signal)) return;

  // 3. Edge TTS (Microsoft Neural voice)
  if (await playEdgeTts(word, signal)) return;

  // 4. Youdao Dictionary
  if (await playAudioUrl(youdaoTtsUrl(word), signal)) return;

  // 5. Browser SpeechSynthesis (fallback)
  await speakWithSynthesis(word, signal);
}

/**
 * Synchronous version for inline use (button click handlers).
 * Starts playback in background — does not await completion.
 */
export function speakWordSync(word: string, signal?: AbortSignal): void {
  void speakWord(word, signal);
}
