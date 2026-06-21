/**
 * Content script entry point for regular web pages.
 *
 * Flow:
 * 1. Detect page language (must be English)
 * 2. Load config from chrome.storage
 * 3. Initialize site-specific config
 * 4. Load CEFR wordlist
 * 5. Walk DOM to find candidate elements
 * 6. Use IntersectionObserver for lazy annotation
 * 7. For each visible element: filter words → translate → annotate
 */

import { getFullConfig, isFullConfig } from '../lib/storage';
import {
  filterForLevel,
  loadWordlist,
  getTranslator,
  parseSiteConfig,
  setSiteConfig,
  getSiteConfig,
  isInExclude,
  isInStayOriginal,
} from '../lib/level-filter';
import { applyAnnotations, getWordDetail } from '../lib/inline-renderer';
import { setupSelectionTooltip } from '../lib/selection-tooltip';
import type { CefrLevel, Translator } from '../lib/types';
import type { WordMatch } from '../lib/level-filter';

/** Minimum text length for an element to be considered for annotation */
const MIN_TEXT_LENGTH = 20;

/** Tags that are always considered as candidate blocks */
const BLOCK_TAGS = new Set([
  'P', 'LI', 'BLOCKQUOTE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'ARTICLE', 'SECTION', 'TD', 'DD', 'FIGCAPTION',
]);

/** Tags whose content should never be annotated */
const SKIP_TAGS = new Set([
  'CODE', 'PRE', 'INPUT', 'TEXTAREA',
  'SCRIPT', 'STYLE', 'NOSCRIPT',
]);

// ─── Language Detection ────────────────────────────────────────────

async function isEnglishPage(): Promise<boolean> {
  try {
    const result = await new Promise<chrome.i18n.LanguageDetectionResult>(
      (resolve, reject) => {
        try {
          chrome.i18n.detectLanguage(document.body.innerText.slice(0, 1000), (r) => resolve(r));
        } catch (e) {
          reject(e);
        }
      }
    );
    if (!result || !result.isReliable) return false;
    const top = result.languages?.[0];
    return top ? top.language === 'en' && top.percentage >= 50 : false;
  } catch {
    return false;
  }
}

// ─── DOM Traversal ─────────────────────────────────────────────────

function shouldSkipElement(el: Element): boolean {
  // Skip code/input/script etc.
  let node: Element | null = el;
  while (node) {
    if (SKIP_TAGS.has(node.tagName) || node.hasAttribute('contenteditable')) return true;
    node = node.parentElement;
  }
  return false;
}

function isAlreadyAnnotated(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.hasAttribute('data-readto')) return true;
    node = node.parentElement;
  }
  return false;
}

function isInExcludedZone(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (isInExclude(node) || isInStayOriginal(node)) return true;
    node = node.parentElement;
  }
  return false;
}

function getTextLength(el: Element): number {
  let len = 0;
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      len += (child as Text).data.trim().length;
    }
  }
  return len;
}

function isCandidateBlock(el: Element): boolean {
  if (BLOCK_TAGS.has(el.tagName)) return true;
  return getTextLength(el) >= MIN_TEXT_LENGTH;
}

function walkCandidates(root: Element, results: Element[]): void {
  if (shouldSkipElement(root) || isAlreadyAnnotated(root) || isInExclude(root) || isInStayOriginal(root)) {
    return;
  }
  if (isCandidateBlock(root)) {
    results.push(root);
  }
  for (let i = 0; i < root.children.length; i++) {
    walkCandidates(root.children[i], results);
  }
}

/** Deduplicate nested candidates — keep only the outermost */
function deduplicateCandidates(elements: Element[]): Element[] {
  const result: Element[] = [];
  const seen = new Set<Element>();
  for (const el of elements) {
    if (seen.has(el)) continue;
    // Remove any existing result that this element contains
    seen.add(el);
    while (result.length > 0 && result[result.length - 1].contains(el)) {
      result.pop();
    }
    result.push(el);
  }
  return result;
}

function findCandidateElements(root: Element): Array<{ element: Element }> {
  const candidates: Element[] = [];
  const siteCfg = getSiteConfig();

  if (siteCfg?.selectors && siteCfg.selectors.length > 0) {
    const selector = siteCfg.selectors.join(', ');
    let matched: Element[];
    try {
      matched = Array.from(root.querySelectorAll(selector));
    } catch {
      matched = [];
    }
    for (const el of matched) {
      if (!isInExcludedZone(el)) {
        walkCandidates(el, candidates);
      }
    }
  } else {
    for (let i = 0; i < root.children.length; i++) {
      walkCandidates(root.children[i], candidates);
    }
  }

  return deduplicateCandidates(candidates).map((el) => ({ element: el }));
}

// ─── IntersectionObserver (Lazy Processing) ────────────────────────

function observeAndProcess(
  candidates: Array<{ element: Element }>,
  level: CefrLevel,
  translator: Translator,
): () => void {
  const candidateMap = new Map<Element, { element: Element }>();
  for (const c of candidates) candidateMap.set(c.element, c);

  let pending = candidateMap.size;
  if (pending === 0) return () => {};

  const processed = new Set<Element>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        if (processed.has(el)) continue;
        processed.add(el);
        observer.unobserve(el);
        processElement(el, level, translator).then(() => {
          pending--;
          if (pending === 0) observer.disconnect();
        });
      }
    },
    { rootMargin: '200px' }
  );

  for (const c of candidates) {
    observer.observe(c.element);
  }

  return () => observer.disconnect();
}

// ─── Element Processing ────────────────────────────────────────────

/** Auto-speak setting from config */
let autoSpeakEnabled = false;

async function processElement(
  el: Element,
  level: CefrLevel,
  translator: Translator,
): Promise<void> {
  if (shouldSkipElement(el) || isAlreadyAnnotated(el)) return;

  const matches = filterForLevel(el, level);
  if (matches.length === 0) return;

  const context = el.textContent?.trim() || '';
  const targets = matches.map((m) => ({ word: m.word, occurrence: m.occurrenceIndex }));

  try {
    const translations = await translator.translate({ context, targets });
    applyAnnotations(el, matches, translations, { autoSpeak: autoSpeakEnabled });
  } catch (err) {
    console.warn('[readto] translation failed:', err);
  }
}

// ─── MutationObserver (DOM Changes) ────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function observeMutations(
  level: CefrLevel,
  translator: Translator,
): () => void {
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      scan(level, translator);
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

// ─── Main Scan ─────────────────────────────────────────────────────

function scan(level: CefrLevel, translator: Translator): void {
  const candidates = findCandidateElements(document.body);
  if (candidates.length === 0) return;
  observeAndProcess(candidates, level, translator);
}

// ─── Entry Point ───────────────────────────────────────────────────

export async function onExecute(perf?: { injectTime: number; loadTime: number }): Promise<void> {
  // 1. Detect language
  const isEn = await isEnglishPage();
  if (!isEn) return;

  // 2. Load config
  const config = await getFullConfig();
  if (!isFullConfig(config)) return;

  // Store auto-speak setting
  autoSpeakEnabled = config.autoSpeak ?? false;

  // 3. Initialize site config
  const siteRule = parseSiteConfig(window.location.href);
  if (siteRule) setSiteConfig({ excludeSelectors: siteRule.excludeSelectors ?? [], stayOriginalSelectors: siteRule.stayOriginalSelectors ?? [] });

  // 4. Load CEFR wordlist
  await loadWordlist();

  // 5. Create translator
  const translator = getTranslator(config);

  // 6. Initial scan
  scan(config.level, translator);

  // 7. Observe future DOM changes
  observeMutations(config.level, translator);

  // 8. Setup selection tooltip (select a word → translation popup)
  setupSelectionTooltip();
}
