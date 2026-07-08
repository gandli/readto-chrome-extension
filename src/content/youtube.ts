/**
 * YouTube content script — runs in ISOLATED world.
 *
 * Receives caption lines from the MAIN world script via custom DOM events,
 * translates words above the user's CEFR level, and renders an annotated
 * caption overlay on the video.
 */

import { getFullConfig, isFullConfig } from '../lib/storage';
import { loadWordlist, getTranslator, filterForLevel } from '../lib/level-filter';
import { READTO_EVENT, READTO_TRACKS } from '../lib/types';
import type { TranscriptLine } from '../lib/types';

const MAX_LINES = 2000;
const CHUNK_SIZE = 4;

// ─── Debug Logging ─────────────────────────────────────────────────

const DEBUG = false;
function w(tag: string, data?: unknown): void {
  if (DEBUG) console.log(`[readto:yt] ${tag}`, data);
}

// ─── Video ID Extraction ───────────────────────────────────────────

function getVideoId(): string | null {
  const match = location.search.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

// ─── Line Validation ───────────────────────────────────────────────

function isValidLine(line: unknown): line is TranscriptLine {
  if (!line || typeof line !== 'object') return false;
  const l = line as Record<string, unknown>;
  return typeof l.start === 'number' && typeof l.end === 'number' && typeof l.text === 'string';
}

function validateLines(lines: unknown[]): lines is TranscriptLine[] {
  return lines.length > 0 && lines.every(isValidLine);
}

// ─── Caption Overlay ───────────────────────────────────────────────

interface CaptionOverlay {
  setLines(lines: AnnotatedLine[]): void;
  destroy(): void;
}

interface AnnotatedLine extends TranscriptLine {
  translations: Record<string, string>;
}

function createCaptionOverlay(video: HTMLVideoElement): CaptionOverlay {
  // Inject CSS to hide native YouTube captions
  let styleEl = document.querySelector<HTMLStyleElement>('style[data-readto-hide-native]');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-readto-hide-native', '');
    styleEl.textContent = '.ytp-caption-window-container{display:none !important;}';
    document.head.appendChild(styleEl);
  }

  // Create overlay container
  const player = video.closest('.html5-video-player');
  const container = document.createElement('div');
  container.id = 'readto-caption';
  container.setAttribute('data-readto', '');

  if (player) {
    Object.assign(container.style, {
      position: 'absolute',
      left: '0', right: '0',
      bottom: '8%',
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: '60',
    });
    player.appendChild(container);
  } else {
    Object.assign(container.style, {
      position: 'fixed',
      left: '0', right: '0',
      bottom: '15%',
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: '60',
    });
    document.body.appendChild(container);
  }

  let lines: AnnotatedLine[] = [];
  let currentIndex = -1;

  const findLineIndex = (time: number): number => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].start <= time && time < lines[i].end) return i;
    }
    return -1;
  };

  const render = () => {
    const idx = findLineIndex(video.currentTime);
    if (idx === currentIndex) return;
    currentIndex = idx;
    container.replaceChildren();
    if (idx < 0) return;

    const line = lines[idx];
    const div = document.createElement('div');
    Object.assign(div.style, {
      background: 'rgba(0,0,0,.75)',
      color: 'white',
      display: 'inline-block',
      padding: '4px 8px',
      lineHeight: '1.6',
      fontSize: '20px',
      borderRadius: '2px',
    });
    div.style.setProperty('--readto-rt-color', '#eee');
    renderAnnotatedWords(div, line);
    container.appendChild(div);
  };

  // Listen for time updates
  const onTimeUpdate = () => render();
  video.addEventListener('timeupdate', onTimeUpdate);

  // Observe subtitle button state
  const isSubtitleOn = (): boolean => {
    const btn = document.querySelector('button.ytp-subtitles-button');
    return btn ? btn.getAttribute('aria-pressed') === 'true' : true;
  };

  const updateVisibility = () => {
    container.style.display = isSubtitleOn() ? '' : 'none';
  };
  updateVisibility();

  const observeTarget = player ?? document;
  const mutationObs = new MutationObserver(updateVisibility);
  mutationObs.observe(observeTarget, {
    attributes: true,
    attributeFilter: ['aria-pressed'],
    childList: true,
    subtree: true,
  });

  return {
    setLines(newLines) {
      lines = newLines;
      currentIndex = -1;
      render();
    },
    destroy() {
      video.removeEventListener('timeupdate', onTimeUpdate);
      mutationObs.disconnect();
      container.remove();
      styleEl?.remove();
    },
  };
}

// ─── Word-Level Annotation Rendering ───────────────────────────────

function renderAnnotatedWords(container: HTMLElement, line: AnnotatedLine): void {
  const wordRegex = /[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019-]*[A-Za-z\u00C0-\u024F]|[A-Za-z\u00C0-\u024F]/g;
  const text = line.text;
  const translations = line.translations;
  const occurrenceCounts: Record<string, number> = {};

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    // Append text before this word
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const word = match[0].toLowerCase();
    occurrenceCounts[word] = (occurrenceCounts[word] || 0) + 1;
    const key = `${word}#${occurrenceCounts[word] - 1}`;
    const translation = translations[key];

    if (translation) {
      const span = document.createElement('span');
      span.style.cssText = 'white-space:nowrap;position:relative;';
      span.appendChild(document.createTextNode(match[0]));

      const rt = document.createElement('span');
      rt.style.cssText =
        'display:inline;font-size:0.6em;vertical-align:super;line-height:0;font-weight:400;color:inherit;opacity:0.85;margin-left:1px;pointer-events:none;user-select:none;';
      rt.textContent = translation;
      span.appendChild(rt);
      container.appendChild(span);
    } else {
      container.appendChild(document.createTextNode(match[0]));
    }

    lastIndex = match.index + match[0].length;
  }

  // Append remaining text
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

// ─── Entry Point ───────────────────────────────────────────────────

let overlayInstance: CaptionOverlay | null = null;
let _currentVideoId: string | null = null;
let sequenceCounter = 0;

async function main(): Promise<void> {
  // Load config
  const config = await getFullConfig();
  if (!isFullConfig(config)) return;

  // Create translator
  const translator = getTranslator(config);

  // Load wordlist
  await loadWordlist();

  w('ready', { level: config.level, mode: config.translationMode });

  // Listen for caption lines from MAIN world
  document.addEventListener(READTO_EVENT, async (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!detail || detail.token !== READTO_TRACKS) return;
    if (typeof detail.videoId !== 'string' || !detail.videoId) return;
    if (!Array.isArray(detail.lines)) return;

    const videoId = getVideoId();
    if (!videoId || detail.videoId !== videoId) return;

    const rawLines = detail.lines as unknown[];
    if (rawLines.length > MAX_LINES) return;
    if (!validateLines(rawLines)) return;

    const lines: TranscriptLine[] = rawLines;
    const seq = ++sequenceCounter;

    w('lines received', { count: lines.length });

    // Find video element
    let video: HTMLVideoElement | null = null;
    for (let i = 0; i < 3; i++) {
      video = document.querySelector('video');
      if (video) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!video || seq !== sequenceCounter) return;

    // Destroy previous overlay
    if (overlayInstance) {
      overlayInstance.destroy();
      overlayInstance = null;
    }

    // Create new overlay
    overlayInstance = createCaptionOverlay(video);
    _currentVideoId = videoId;

    // Initialize annotated lines
    const annotated: AnnotatedLine[] = lines.map((l) => ({ ...l, translations: {} }));
    overlayInstance.setLines(annotated);

    // Word cache for deduplication
    const wordCache = new Map<string, string>();

    // Process lines in chunks
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      if (seq !== sequenceCounter) return;

      const chunk = lines.slice(i, i + CHUNK_SIZE);
            // TODO: chunkAnnotated slice is currently not consumed; the per-line
      // annotation loop below re-indexes into `annotated[lineIdx]`. Kept as
      // `_chunkAnnotated` to preserve the chunking intent for future refactor.
      const _chunkAnnotated = annotated.slice(i, i + CHUNK_SIZE);

      // Find words that need translation
      const allWords = new Set<string>();
      for (const line of chunk) {
        const div = document.createElement('div');
        div.textContent = line.text;
        const matches = filterForLevel(div, config.level);
        for (const m of matches) {
          if (!allWords.has(m.word) && !wordCache.has(m.word)) {
            allWords.add(m.word);
          }
        }
      }

      // Translate unknown words
      if (allWords.size > 0) {
        const context = chunk.map((l) => l.text).join(' ');
        const targets = Array.from(allWords).map((w) => ({ word: w, occurrence: 0 }));

        try {
          const results = await translator.translate({ context, targets });
          for (const r of results) {
            wordCache.set(r.word, r.translation);
          }
        } catch (err) {
          w('translate chunk failed', { error: (err as Error)?.message });
        }
      }

      // Apply translations to annotated lines
      for (let j = 0; j < chunk.length; j++) {
        const lineIdx = i + j;
        const div = document.createElement('div');
        div.textContent = lines[lineIdx].text;
        const matches = filterForLevel(div, config.level);
        const translations: Record<string, string> = {};

        for (const m of matches) {
          const key = `${m.word}#${m.occurrenceIndex}`;
          const cached = wordCache.get(m.word);
          if (cached) translations[key] = cached;
        }

        annotated[lineIdx] = { ...lines[lineIdx], translations };
      }

      // Update overlay
      if (seq === sequenceCounter && overlayInstance) {
        overlayInstance.setLines(annotated);
      }
    }

    w('annotation complete', { videoId });
  });
}

main().catch(console.error);
