/**
 * CEFR word level filtering and site configuration.
 *
 * This module handles:
 * - Loading the CEFR word→level mapping
 * - Tokenizing text into words
 * - Filtering words that exceed the user's CEFR level
 * - Site-specific selector configuration (stayOriginal, exclude)
 * - Creating readto annotation elements with Shadow DOM
 * - Speech synthesis for pronunciation (4-source fallback)
 */

import type { CefrLevel, SiteRule } from './types';
import { speakWordSync as speakWord } from './pronunciation';
import { loadLevelData } from './level-data';
import { SPEAKER_SVG } from './icons';
// Audit v5 P1-B: single source of truth for tooltip CSS (imports the canonical
// stylesheet as a raw string, avoiding hand-maintained drift).
import TOOLTIP_CSS_RAW from '../styles/tooltip.css?raw';

/* ─── CEFR Level Ordering ─── */

const LEVEL_ORDER: Record<CefrLevel, number> = {
  A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6,
};

/* ─── Word List Cache ─── */

let wordMap: Map<string, CefrLevel> | null = null;

/** Load and cache the CEFR word→level mapping */
export async function loadWordlist(): Promise<Map<string, CefrLevel>> {
  if (wordMap) return wordMap;
  wordMap = await loadLevelData();
  return wordMap;
}

/* ─── Word Tokenizer ─── */

interface TokenizedWord {
  word: string;       // lowercased
  offset: number;     // character offset in source text
  length: number;     // character length in source text
  originalIsAllCaps: boolean;
  originalHadUppercase: boolean;
}

/** Regex matching English words (including accented characters, apostrophes, hyphens) */
const WORD_RE = /[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019-]*[A-Za-z\u00C0-\u024F]|[A-Za-z\u00C0-\u024F]/g;

/** Tokenize text into words with position information */
export function tokenizeWords(text: string): TokenizedWord[] {
  const words: TokenizedWord[] = [];
  let match: RegExpExecArray | null;
  WORD_RE.lastIndex = 0;

  while ((match = WORD_RE.exec(text)) !== null) {
    const original = match[0];
    const lower = original.toLowerCase();
    const isAllCaps = original.length > 1 && original === original.toUpperCase();
    const hadUpper = original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase();

    words.push({
      word: lower,
      offset: match.index,
      length: original.length,
      originalIsAllCaps: isAllCaps,
      originalHadUppercase: hadUpper,
    });
  }

  return words;
}

/* ─── Site Configuration ─── */

/** Built-in site rules for sites that need special handling */
const SITE_RULES: SiteRule[] = [
  {
    id: 'github',
    matches: ['github.com'],
    stayOriginalSelectors: [
      '.blob-code', '.highlight', '.highlight *', '.commit-ref', '.sha',
      '.text-mono', 'code-tag',
    ],
    excludeSelectors: ['nav', '[role=navigation]', '[role=banner]', '[role=contentinfo]'],
  },
  {
    id: 'stackoverflow',
    matches: ['stackoverflow.com', 'stackexchange.com'],
    stayOriginalSelectors: ['pre', 'code', '.hljs', 'kbd'],
    excludeSelectors: ['nav', '.site-header', '.site-footer'],
  },
  {
    id: 'wikipedia',
    matches: ['wikipedia.org', 'wikimedia.org'],
    stayOriginalSelectors: ['code', 'pre', '.mw-code', '.math'],
    excludeSelectors: ['#mw-navigation', '#footer', '.noprint'],
  },
];

const DEFAULT_STAY_ORIGINAL = [
  'pre', 'code', 'kbd', 'samp', 'var', 'tt',
  '.katex', '.katex *', '.MathJax', 'mjx-container', 'math',
  '[translate=no]', '.notranslate', '[class*="notranslate"]',
];

const DEFAULT_EXCLUDE = [
  'nav', '[role=navigation]', '[role=banner]', '[role=contentinfo]',
];

let currentConfig: {
  excludeSelectorString: string;
  stayOriginalSelectorString: string;
  generalRule: SiteRule;
} | null = null;

/** Find the matching site rule for the current URL */
export function getSiteRule(url: string): SiteRule {
  const hostname = new URL(url).hostname;
  const rule = SITE_RULES.find(r => r.matches.some(m => hostname.includes(m)));

  return {
    id: rule?.id ?? 'default',
    matches: rule?.matches ?? [],
    selectors: rule?.selectors,
    stayOriginalSelectors: [
      ...DEFAULT_STAY_ORIGINAL,
      ...(rule?.stayOriginalSelectors ?? []),
    ],
    excludeSelectors: [
      ...DEFAULT_EXCLUDE,
      ...(rule?.excludeSelectors ?? []),
    ],
  };
}

/** Initialize site configuration */
export function initSiteConfig(rule: SiteRule): void {
  const generalRule: SiteRule = {
    ...rule,
    stayOriginalSelectors: [
      ...DEFAULT_STAY_ORIGINAL,
      ...rule.stayOriginalSelectors,
    ],
    excludeSelectors: [
      ...DEFAULT_EXCLUDE,
      ...rule.excludeSelectors,
    ],
  };

  currentConfig = {
    generalRule,
    excludeSelectorString: generalRule.excludeSelectors.length
      ? generalRule.excludeSelectors.join(',')
      : '',
    stayOriginalSelectorString: generalRule.stayOriginalSelectors.length
      ? generalRule.stayOriginalSelectors.join(',')
      : '',
  };
}

/** Update the active site configuration */
export function setSiteConfig(config: { excludeSelectors: string[]; stayOriginalSelectors: string[] }): void {
  currentConfig = {
    generalRule: {
      id: 'dynamic',
      matches: [],
      stayOriginalSelectors: config.stayOriginalSelectors,
      excludeSelectors: config.excludeSelectors,
    },
    excludeSelectorString: config.excludeSelectors.length ? config.excludeSelectors.join(',') : '',
    stayOriginalSelectorString: config.stayOriginalSelectors.length ? config.stayOriginalSelectors.join(',') : '',
  };
}

/** Get current site configuration */
export function getConfig(): SiteRule | null {
  return currentConfig?.generalRule ?? null;
}

/** Check if an element matches the stayOriginal selectors (should not be annotated) */
export function isStayOriginal(element: Element): boolean {
  if (!currentConfig?.stayOriginalSelectorString) return false;
  try {
    return element.matches(currentConfig.stayOriginalSelectorString);
  } catch {
    return false;
  }
}

/** Check if an element matches the exclude selectors (should be skipped entirely) */
export function isExcluded(element: Element): boolean {
  if (!currentConfig?.excludeSelectorString) return false;
  try {
    return element.matches(currentConfig.excludeSelectorString);
  } catch {
    return false;
  }
}

/* ─── CEFR Level Checking ─── */

/** Check the CEFR level of a word. Returns undefined if not in the word list. */
export function checkLevel(word: string): CefrLevel | undefined {
  return wordMap?.get(word.toLowerCase());
}

/* ─── Word Filtering ─── */

/** Punctuation that ends a sentence */
const SENTENCE_END = /[.?!。？！]/;

/** Check if a character is a sentence-ending punctuation */
function isSentenceEnd(char: string): boolean {
  return SENTENCE_END.test(char);
}

/** Skip tags that should not contain annotatable text */
const SKIP_TAGS = new Set(['CODE', 'PRE', 'INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'NOSCRIPT']);

/** Check if an element should be skipped for annotation */
function shouldSkipElement(el: Element): boolean {
  return !!(
    SKIP_TAGS.has(el.tagName) ||
    el.hasAttribute('contenteditable') ||
    el.hasAttribute('data-readto') ||
    isStayOriginal(el) ||
    isExcluded(el)
  );
}

/** Collect text nodes from an element, skipping protected regions */
function collectTextNodes(root: Element, result: Text[]): void {
  for (let i = 0; i < root.childNodes.length; i++) {
    const child = root.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      result.push(child as Text);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (!shouldSkipElement(child as Element)) {
        collectTextNodes(child as Element, result);
      }
    }
  }
}

/**
 * Look backward in text to determine context (sentence boundary).
 * Returns the last non-whitespace character before the given position.
 */
function lookBehind(text: string, start: number, end: number, fallback: string): string {
  let lastChar = fallback;
  for (let i = start; i < end; i++) {
    const ch = text[i];
    if (/\S/.test(ch)) lastChar = ch;
  }
  return lastChar;
}

export interface FilteredWord {
  word: string;
  occurrenceIndex: number;
  textNode: Text;
  offsetInNode: number;
  length: number;
}

/**
 * Filter words in an element that are above the user's CEFR level.
 *
 * Returns an array of words that should be annotated, with their positions
 * in the DOM text nodes.
 */
export function filterWords(element: Element, level: CefrLevel): FilteredWord[] {
  if (!wordMap) throw new Error('wordlist not loaded; call loadWordlist() first');

  const map = wordMap;
  const userLevel = LEVEL_ORDER[level];
  const textNodes: Text[] = [];
  collectTextNodes(element, textNodes);

  const wordOccurrences = new Map<string, number>();
  const result: FilteredWord[] = [];
  let prevContext = '';

  for (const node of textNodes) {
    const text = node.data;
    const tokens = tokenizeWords(text);
    let prevOffset = 0;
    let context = '';

    for (const token of tokens) {
      // Update context from whitespace/punctuation between tokens
      context = lookBehind(text, prevOffset, token.offset, context);
      prevOffset = token.offset;

      // Determine if this is a sentence start
      const isStart = context === '' || isSentenceEnd(context) || prevContext === '' || isSentenceEnd(prevContext);

      // Track word occurrences for disambiguation
      const occurrence = wordOccurrences.get(token.word) ?? 0;
      wordOccurrences.set(token.word, occurrence + 1);

      // Skip very short words, all-caps (likely acronyms), or mid-sentence capitalized words
      if (token.length < 2 || token.originalIsAllCaps) continue;
      if (token.originalHadUppercase && !isStart) continue;

      // Check word level
      const wordLevel = map.get(token.word);
      if (wordLevel === undefined) continue;
      if (LEVEL_ORDER[wordLevel] <= userLevel) continue;

      result.push({
        word: token.word,
        occurrenceIndex: occurrence,
        textNode: node,
        offsetInNode: token.offset,
        length: token.length,
      });
    }

    // Carry context forward across text nodes
    context = lookBehind(text, prevOffset, text.length, context);
    if (context !== '') prevContext = context;
  }

  return result;
}

/* ─── Annotation Rendering ─── */

/**
 * CSS for the readto annotation Shadow DOM.
 * Injected via adoptedStyleSheets from chrome.runtime.getURL('assets/tooltip.css').
 * The CSS file is bundled separately by Vite and served as a web accessible resource.
 *
 * In test environments (jsdom), the CSS is injected synchronously via an inline
 * <style> element since adoptedStyleSheets + fetch are not available.
 */
/**
 * Resolve the URL of the tooltip stylesheet. Handles MV3
 * `web_accessible_resources` in both legacy string form and the current
 * object form (P0-3 audit fix — old code assumed object form only and
 * would crash on `.some` when a string entry appeared).
 * Exported for test coverage.
 */
export function getTooltipCssUrl(): string {
  // In dev: Vite serves from assets/; in build: hashed filename (tooltip-css-*.css)
  // Read the actual hashed filename from the built manifest at runtime
  try {
    const manifest = chrome.runtime.getManifest();
    const cssAsset = manifest.web_accessible_resources
      ?.flatMap(g => (typeof g === 'string' ? [g] : g.resources ?? []))
      .find(r => r.startsWith('assets/tooltip-css-') && r.endsWith('.css'));
    if (cssAsset) return chrome.runtime.getURL(cssAsset);
  } catch {}
  // Fallback for dev mode or if manifest lookup fails
  return chrome.runtime.getURL('assets/tooltip-css.css');
}

/** Inline fallback CSS for environments where adoptedStyleSheets/fetch are unavailable (tests).
 *  Audit v5 P1-B fix: previously this was a hand-maintained copy of tooltip.css that drifted
 *  (missing @keyframes readto-speaker-pulse + prefers-reduced-motion). Now imported at
 *  build-time from the canonical stylesheet — single source of truth. See vite-raw.d.ts. */
const FALLBACK_TOOLTIP_CSS = TOOLTIP_CSS_RAW;

/**
 * Compute tooltip position relative to the host element.
 * Ensures the tooltip stays within the viewport.
 */
export function computeTooltipPosition(params: {
  hostRect: DOMRect;
  tipRect: DOMRect;
  vw: number;
  vh: number;
  gap: number;
}): { left: number; top: number } {
  const { hostRect, tipRect, vw, vh, gap } = params;

  // Default: below the word
  const belowTop = hostRect.bottom + gap;
  const aboveTop = hostRect.top - tipRect.height - gap;

  // Prefer below, fall back to above if it would overflow
  const fitsBelow = belowTop + tipRect.height + gap <= vh;
  const fitsAbove = aboveTop >= gap;

  const top = fitsBelow ? belowTop : fitsAbove ? aboveTop : belowTop;

  // Horizontal: center on the word, clamped to viewport
  let left = hostRect.left + (hostRect.width - tipRect.width) / 2;
  left = Math.max(gap, Math.min(left, vw - tipRect.width - gap));

  return { left, top };
}

/** speakWord — now imported from pronunciation.ts (4-source fallback) */

/** Parse {target} markers in example sentences */
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

/** Create the tooltip element for a word detail popup — matches original `se()` */
function createTooltipElement(params: {
  doc: Document;
  word: string;
  detail: WordDetail | null;
  onSpeak?: (word: string) => void;
}): HTMLDivElement {
  const { doc, word, detail, onSpeak } = params;
  const onSpeakFn = onSpeak ?? ((w: string) => speakWord(w));

  const tip = doc.createElement('div');
  tip.className = 'tooltip';

  if (!detail) {
    tip.textContent = word;
    return tip;
  }

  // Phonetic + speaker button
  if (detail.p) {
    const phonetic = doc.createElement('div');
    phonetic.className = 'phonetic';

    const speaker = doc.createElement('button');
    speaker.className = 'speaker';
    speaker.type = 'button';
    speaker.setAttribute('aria-label', '播放发音');
    speaker.innerHTML = SPEAKER_SVG;
    speaker.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSpeakFn(word.toLowerCase());
      speaker.classList.remove('playing');
      // Force reflow for re-trigger animation
      void speaker.offsetWidth;
      speaker.classList.add('playing');
      setTimeout(() => speaker.classList.remove('playing'), 400);
    });
    phonetic.appendChild(speaker);

    const ipa = doc.createElement('span');
    ipa.className = 'ipa';
    ipa.textContent = `/${detail.p}/`;
    phonetic.appendChild(ipa);

    tip.appendChild(phonetic);
  }

  // Translation body
  const body = doc.createElement('div');
  body.className = 'body';
  body.textContent = detail.t?.replace(/\\n/g, '\n') ?? '';
  tip.appendChild(body);

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
    tip.appendChild(examples);
  }

  return tip;
}

/** Word detail from translations-detail.json — re-exported from types */
import type { WordDetail as _WordDetail } from './types';
export type WordDetail = _WordDetail;

/**
 * Create a readto annotation span with Shadow DOM — matches original `$e()`.
 *
 * Structure:
 *   <span data-readto="">
 *     #text (original word)
 *     └── Shadow DOM
 *         ├── <style>
 *         ├── <slot/>           ← projects original text
 *         └── <span class="rt"> ← translation superscript
 */
export function createReadtoSpan(
  doc: Document,
  originalText: string,
  translation: string,
  options: { withHoverDetail?: boolean; getDetail?: (word: string) => Promise<WordDetail | null>; autoSpeak?: boolean } = {},
): HTMLSpanElement {
  const span = doc.createElement('span');
  span.setAttribute('data-readto', '');
  span.appendChild(doc.createTextNode(originalText));

  const shadow = span.attachShadow({ mode: 'open' });

  // Inject CSS into Shadow DOM.
  // Strategy: always inject synchronous inline <style> immediately (works everywhere),
  // then in production upgrade to async-fetched compiled CSS (better caching).
  //
  // The inline <style> is replaced by the fetched CSS if fetch succeeds;
  // in test/non-extension environments the inline version stays.

  // Always inject inline <style> as baseline (synchronous, works in all envs)
  const syncStyle = doc.createElement('style');
  syncStyle.textContent = FALLBACK_TOOLTIP_CSS;
  shadow.appendChild(syncStyle);

  // In production: fetch compiled CSS from bundled file and replace inline version
  if (
    typeof CSSStyleSheet !== 'undefined' &&
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime?.getURL === 'function'
  ) {
    fetch(getTooltipCssUrl())
      .then((r) => r.text())
      .then((cssText) => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        shadow.adoptedStyleSheets = [sheet];
        // Remove the inline <style> since we now have adoptedStyleSheets
        syncStyle.remove();
      })
      .catch(() => {
        // Keep inline <style> as fallback — CSS fetch failed
      });
  }

  // Slot projects the original text node into the shadow
  shadow.appendChild(doc.createElement('slot'));

  // Translation superscript
  const rt = doc.createElement('span');
  rt.className = 'rt';
  rt.textContent = translation;
  shadow.appendChild(rt);

  // Hover tooltip (lazy-loaded)
  if (options.withHoverDetail && options.getDetail) {
    setupHoverDetail(span, shadow, originalText, options.getDetail, options.autoSpeak);
  }

  return span;
}

/** Tooltip show/hide constants — matches original */
const HOVER_SHOW_DELAY = 150;
const HOVER_HIDE_DELAY = 120;

/** Global pinned tooltip state — only one tooltip visible at a time */
let pinnedTooltip: { host: HTMLSpanElement; unpin: () => void } | null = null;

function unpinTooltip() {
  if (pinnedTooltip) {
    pinnedTooltip.unpin();
    pinnedTooltip.host.shadowRoot?.querySelector('.tooltip')?.remove();
    pinnedTooltip = null;
  }
}

/**
 * Setup hover-to-show tooltip — matches original `me()` function.
 * Uses pointerenter/pointerleave with delays, click to pin.
 */
function setupHoverDetail(
  host: HTMLSpanElement,
  shadow: ShadowRoot,
  word: string,
  getDetail: (word: string) => Promise<WordDetail | null>,
  autoSpeak?: boolean,
): void {
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let isPinned = false;
  let seq = 0;
  let speakAbort: AbortController | null = null;
  let tipHovered = false;

  const clearShow = () => { if (showTimer !== null) { clearTimeout(showTimer); showTimer = null; } };
  const clearHide = () => { if (hideTimer !== null) { clearTimeout(hideTimer); hideTimer = null; } };

  const scheduleHide = () => {
    clearHide();
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (isPinned) return;
      const tip = shadow.querySelector('.tooltip');
      if (tip) tip.remove();
      if (pinnedTooltip?.host === host) pinnedTooltip = null;
    }, HOVER_HIDE_DELAY);
  };

  const showTooltip = async () => {
    showTimer = null;
    const mySeq = ++seq;
    const detail = await getDetail(word.toLowerCase());
    if (mySeq !== seq || tipHovered || !detail || !host.isConnected) return;
    if (pinnedTooltip && pinnedTooltip.host !== host) unpinTooltip();
    if (shadow.querySelector('.tooltip')) return;

    const tip = createTooltipElement({
      doc: host.ownerDocument,
      word,
      detail,
      onSpeak: (w) => {
        speakAbort?.abort();
        speakAbort = new AbortController();
        speakWord(w, speakAbort.signal);
      },
    });

    tip.addEventListener('pointerenter', clearHide);
    tip.addEventListener('pointerleave', () => { if (!isPinned) scheduleHide(); });

    tip.style.visibility = 'hidden';
    shadow.appendChild(tip);

    pinnedTooltip = { host, unpin: () => { isPinned = false; } };

    // Position
    const win = host.ownerDocument.defaultView!;
    const { top, left } = computeTooltipPosition({
      hostRect: host.getBoundingClientRect(),
      tipRect: tip.getBoundingClientRect(),
      vw: win.innerWidth,
      vh: win.innerHeight,
      gap: 4,
    });
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
    tip.style.visibility = '';

    // Auto-speak if enabled
    if (autoSpeak) {
      speakWord(word.toLowerCase());
    }
  };

  // Click to pin/unpin
  const onClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPinned) {
      isPinned = false;
      scheduleHide();
    } else {
      isPinned = true;
      clearHide();
    }
  };

  host.addEventListener('pointerenter', () => {
    tipHovered = false;
    clearShow();
    clearHide();
    showTimer = setTimeout(showTooltip, HOVER_SHOW_DELAY);
  });
  host.addEventListener('pointerleave', () => {
    tipHovered = true;
    clearShow();
    if (!isPinned) scheduleHide();
  });
  host.addEventListener('click', onClick);

  // Close on Escape / scroll
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isPinned) { isPinned = false; scheduleHide(); }
  };
  const onScroll = () => { if (isPinned) { isPinned = false; scheduleHide(); } };
  host.ownerDocument.addEventListener('keydown', onKeyDown);
  host.ownerDocument.addEventListener('scroll', onScroll, { passive: true });
}

// ─── Compatibility Aliases ─────────────────────────────────────────
// These aliases match the import names used by content scripts

/** Alias for filterWords — matches content script import name */
export const filterForLevel = filterWords;

/** Alias for getConfig — matches content script import name */
export const getSiteConfig = getConfig;

/** Alias for isExcluded — matches content script import name */
export const isInExclude = isExcluded;

/** Alias for isStayOriginal — matches content script import name */
export const isInStayOriginal = isStayOriginal;

/** Alias for getSiteRule — matches content script import name */
export const parseSiteConfig = getSiteRule;

// ─── Translator (re-export from types for backward compat) ─────────
// Avoid duplicating the Translator interface that already exists in types.ts.
// The getTranslator factory below returns a Translator-compatible object.

import type { Translator } from './types';
export type { Translator };

export interface TranslationResult {
  word: string;
  translation: string;
}

// WordMatch = FilteredWord (alias for content script imports)
export type WordMatch = FilteredWord;

/**
 * Create a translator based on the config's translationMode.
 * - "local": uses chrome.runtime.sendMessage to service worker's local dict
 * - "llm": uses chrome.runtime.sendMessage to service worker's LLM
 */
export function getTranslator(config: { level: CefrLevel; translationMode: string }): Translator {
  return {
    kind: config.translationMode === 'llm' ? 'llm' : 'local',
    async translate({ context, targets }) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'TRANSLATE_MANY',
          items: [{ context, targets }],
          cfg: config,
        });
        if (response?.ok && Array.isArray(response.results)) {
          const rawItems = (response.results[0] ?? []) as Array<{
            word?: unknown;
            occurrence?: unknown;
            translation?: unknown;
          }>;
          return rawItems.map((r) => ({
            word: String(r.word ?? ''),
            occurrence: Number(r.occurrence ?? 0),
            translation: String(r.translation ?? ''),
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
  };
}
