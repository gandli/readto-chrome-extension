/**
 * Selection tooltip — select a word → show translation popup.
 *
 * Listens for mouseup on the document. When the user selects a single
 * English word that is above their configured CEFR level and is *not*
 * inside an existing data-readto annotation, a floating tooltip is shown
 * near the selection with phonetic, translation, examples, and a speaker
 * button.
 *
 * The tooltip is a standalone fixed-positioned element at document.body
 * level (not inside any Shadow DOM).
 */

import { getWordDetail } from './inline-renderer';
import { speakWord } from './pronunciation';
import { SPEAKER_SVG } from './icons';

/* ─── State ─── */

let activeContainer: HTMLDivElement | null = null;
let activeAutoHideTimer: ReturnType<typeof setTimeout> | null = null;
let activeAbort: AbortController | null = null;
const activeListeners = new Set<[string, EventListener]>();

/* ─── CSS (matches READTO_CSS tooltip style) ─── */

const SELECTION_TOOLTIP_CSS = `
.readto-selection-tooltip {
  position: fixed;
  background: hsl(30 7% 97%);
  color: hsl(24 10% 10%);
  border: 1px solid hsl(25 6% 85%);
  border-radius: 6px;
  padding: 10px 12px;
  font-family: Charter, 'Iowan Old Style', 'Source Serif 4', Georgia, serif;
  font-size: 14px;
  line-height: 1.55;
  font-weight: 400;
  text-align: left;
  white-space: pre-wrap;
  min-width: 180px;
  max-width: 340px;
  box-shadow: 0 1px 2px rgba(24, 20, 18, 0.05), 0 6px 16px rgba(24, 20, 18, 0.06);
  z-index: 2147483647;
  user-select: text;
  pointer-events: auto;
}
.readto-selection-tooltip .phonetic {
  display: flex;
  align-items: center;
  gap: 6px;
  color: hsl(25 5% 45%);
  margin-bottom: 6px;
}
.readto-selection-tooltip .phonetic .ipa {
  font-style: italic;
}
.readto-selection-tooltip .speaker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 2px;
  margin: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.08s;
}
.readto-selection-tooltip .speaker svg {
  width: 14px;
  height: 14px;
  display: block;
}
.readto-selection-tooltip .speaker:hover {
  background: rgba(24, 20, 18, 0.06);
  color: hsl(24 10% 10%);
}
.readto-selection-tooltip .speaker:active {
  transform: scale(0.9);
}
.readto-selection-tooltip .speaker.playing {
  color: #1a73e8;
  animation: readto-sel-speaker-pulse 0.4s ease-out;
}
@keyframes readto-sel-speaker-pulse {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.18); }
  100% { transform: scale(1); }
}
.readto-selection-tooltip .body {
  /* translation text */
}
.readto-selection-tooltip .examples {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed hsl(25 6% 85%);
}
.readto-selection-tooltip .example { margin-top: 8px; }
.readto-selection-tooltip .example:first-child { margin-top: 0; }
.readto-selection-tooltip .example .en {
  font-size: 13px;
  line-height: 1.5;
  color: hsl(24 10% 18%);
}
.readto-selection-tooltip .example .target {
  font-weight: 600;
  color: hsl(24 80% 35%);
}
.readto-selection-tooltip .example .zh {
  font-size: 12px;
  line-height: 1.45;
  color: hsl(25 5% 50%);
  margin-top: 2px;
}
@media (prefers-color-scheme: dark) {
  .readto-selection-tooltip {
    background: hsl(24 10% 6%);
    color: hsl(30 7% 95%);
    border-color: hsl(24 6% 18%);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 6px 16px rgba(0, 0, 0, 0.45);
  }
  .readto-selection-tooltip .phonetic { color: hsl(25 5% 65%); }
  .readto-selection-tooltip .speaker:hover {
    background: rgba(245, 243, 240, 0.08);
    color: hsl(30 7% 95%);
  }
  .readto-selection-tooltip .speaker.playing { color: #66b1ff; }
  .readto-selection-tooltip .examples { border-top-color: hsl(24 6% 18%); }
  .readto-selection-tooltip .example .en { color: hsl(30 7% 90%); }
  .readto-selection-tooltip .example .target { color: hsl(30 90% 65%); }
  .readto-selection-tooltip .example .zh { color: hsl(25 5% 65%); }
}
`;

/* ─── Speaker SVG — shared via lib/icons.ts (audit v2 P2-A dedup) ─── */

/* ─── CSS injection ─── */

let cssInjected = false;

function injectCss(): void {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = SELECTION_TOOLTIP_CSS;
  (document.head || document.documentElement).appendChild(style);
}

/* ─── Helpers ─── */

/** Abort any active tooltip and pronunciation. */
function cleanup(): void {
  activeAbort?.abort();
  activeAbort = null;
  if (activeAutoHideTimer !== null) {
    clearTimeout(activeAutoHideTimer);
    activeAutoHideTimer = null;
  }
  // Remove tracked event listeners
  for (const [type, fn] of activeListeners) {
    document.removeEventListener(type, fn);
  }
  activeListeners.clear();
  if (activeContainer) {
    activeContainer.remove();
    activeContainer = null;
  }
}

/**
 * Check whether a DOM node lives inside a data-readto annotation.
 * Handles cross-shadow-DOM boundaries (text inside readto spans lives
 * in the span's shadow root).
 */
function isInReadtoElement(node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      if ((current as Element).closest?.('[data-readto]')) return true;
    }
    const root = (current as any).getRootNode?.() as ShadowRoot | Document | undefined;
    if (root && root !== document && 'host' in root) {
      current = (root as ShadowRoot).host;
      if ((current as Element).hasAttribute?.('data-readto')) return true;
      current = (current as Element).parentNode;
      continue;
    }
    break;
  }
  return false;
}

/**
 * Parse {target} markers in example sentences to highlight the word.
 */
function parseExampleSegments(text: string): Array<{ kind: 'text' | 'target'; value: string }> {
  if (!text) return [];
  const segments: Array<{ kind: 'text' | 'target'; value: string }> = [];
  const re = /\{([^{}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ kind: 'text', value: text.slice(last, m.index) });
    segments.push({ kind: 'target', value: m[1] });
    last = re.lastIndex;
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments;
}

/* ─── Tooltip positioning ─── */

function positionTooltip(
  container: HTMLDivElement,
  rangeRect: DOMRect,
): void {
  const GAP = 6;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipRect = container.getBoundingClientRect();

  // Prefer below the selection, fall back to above
  const belowTop = rangeRect.bottom + GAP;
  const aboveTop = rangeRect.top - tipRect.height - GAP;

  const fitsBelow = belowTop + tipRect.height + GAP <= vh;
  const fitsAbove = aboveTop >= GAP;

  const top = fitsBelow ? belowTop : fitsAbove ? aboveTop : belowTop;

  // Horizontal: center on the selection, clamped to viewport
  let left = rangeRect.left + (rangeRect.width - tipRect.width) / 2;
  left = Math.max(GAP, Math.min(left, vw - tipRect.width - GAP));

  container.style.top = `${top}px`;
  container.style.left = `${left}px`;
}

/* ─── Tooltip rendering ─── */

function showTooltip(
  range: Range,
  word: string,
  detail: { p?: string; t?: string; e?: Array<{ en: string; zh: string }> } | null,
): void {
  cleanup();
  injectCss();

  const doc = document;
  const container = doc.createElement('div');
  container.className = 'readto-selection-tooltip';

  if (!detail) {
    container.textContent = word;
  } else {
    // Phonetic + speaker button
    if (detail.p) {
      const phonetic = doc.createElement('div');
      phonetic.className = 'phonetic';

      const speaker = doc.createElement('button');
      speaker.className = 'speaker';
      speaker.type = 'button';
      speaker.setAttribute('aria-label', 'Play pronunciation');
      speaker.innerHTML = SPEAKER_SVG;
      speaker.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activeAbort?.abort();
        activeAbort = new AbortController();
        speakWord(word.toLowerCase(), activeAbort.signal);
        speaker.classList.remove('playing');
        void speaker.offsetWidth; // force reflow for re-trigger
        speaker.classList.add('playing');
        setTimeout(() => speaker.classList.remove('playing'), 400);
      });
      phonetic.appendChild(speaker);

      const ipa = doc.createElement('span');
      ipa.className = 'ipa';
      ipa.textContent = `/${detail.p}/`;
      phonetic.appendChild(ipa);

      container.appendChild(phonetic);
    }

    // Translation body
    if (detail.t) {
      const body = doc.createElement('div');
      body.className = 'body';
      body.textContent = detail.t.replace(/\\n/g, '\n');
      container.appendChild(body);
    }

    // Examples
    if (detail.e?.length) {
      const examples = doc.createElement('div');
      examples.className = 'examples';
      for (const ex of detail.e) {
        const exDiv = doc.createElement('div');
        exDiv.className = 'example';

        const enDiv = doc.createElement('div');
        enDiv.className = 'en';
        for (const seg of parseExampleSegments(ex.en)) {
          if (seg.kind === 'text') {
            enDiv.appendChild(doc.createTextNode(seg.value));
          } else {
            const targetSpan = doc.createElement('span');
            targetSpan.className = 'target';
            targetSpan.textContent = seg.value;
            enDiv.appendChild(targetSpan);
          }
        }
        exDiv.appendChild(enDiv);

        const zhDiv = doc.createElement('div');
        zhDiv.className = 'zh';
        zhDiv.textContent = ex.zh;
        exDiv.appendChild(zhDiv);

        examples.appendChild(exDiv);
      }
      container.appendChild(examples);
    }
  }

  // Position off-screen first to measure, then move into place
  container.style.visibility = 'hidden';
  doc.body.appendChild(container);

  const rangeRect = range.getBoundingClientRect();
  positionTooltip(container, rangeRect);
  container.style.visibility = '';

  activeContainer = container;

  // ── Dismiss handlers ──

  // Hide on click outside
  const onClickOutside = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) cleanup();
  };
  // Use setTimeout to avoid the current mouseup triggering immediate close
  setTimeout(() => {
    document.addEventListener('mousedown', onClickOutside, { once: true });
  }, 0);

  // Hide on Escape
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cleanup();
  };
  document.addEventListener('keydown', onKeyDown);
  activeListeners.add(['keydown', onKeyDown as EventListener]);

  // Hide on scroll
  const onScroll = () => cleanup();
  document.addEventListener('scroll', onScroll, { passive: true });
  activeListeners.add(['scroll', onScroll]);

  // Hide on selection change (new selection or deselection)
  const onSelectionChange = () => {
    const sel = document.getSelection();
    if (!sel || sel.toString().trim().toLowerCase() !== word.toLowerCase()) {
      cleanup();
    }
  };
  document.addEventListener('selectionchange', onSelectionChange);
  activeListeners.add(['selectionchange', onSelectionChange]);

  // Auto-hide after 30 seconds
  activeAutoHideTimer = setTimeout(cleanup, 30_000);

  // Auto-speak if enabled
  chrome.storage.sync.get({ autoSpeak: false }, (result) => {
    if (result.autoSpeak) {
      activeAbort?.abort();
      activeAbort = new AbortController();
      speakWord(word.toLowerCase(), activeAbort.signal);
    }
  });
}

/* ─── Public API ─── */

/**
 * Set up the selection-tooltip feature.
 * Shows translation popup for any selected English word that has translation data.
 */
export async function setupSelectionTooltip(): Promise<void> {
  // Listen for mouseup to capture text selections
  document.addEventListener('mouseup', async () => {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const text = sel.toString().trim();
    if (!text) return;

    // Must be a single English word: 2+ alpha characters
    if (!/^[A-Za-z]{2,}$/.test(text)) return;

    const word = text.toLowerCase();

    // Skip if selection is inside a data-readto element (already annotated)
    const range = sel.getRangeAt(0);
    if (isInReadtoElement(range.startContainer)) return;

    // Fetch word detail — show tooltip for ANY word that has a translation,
    // regardless of CEFR level (CEFR filtering only applies to inline annotations)
    try {
      const detail = await getWordDetail(word);
      // AbortController might have been triggered during await
      if (activeAbort?.signal.aborted) return;
      // Only show if we have translation data
      if (detail && (detail.t || detail.e?.length)) {
        showTooltip(range, word, detail);
      }
    } catch {
      // Detail fetch failed — silently skip
    }
  });
}
