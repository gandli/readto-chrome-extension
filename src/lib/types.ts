/**
 * Shared constants and event names used across content scripts.
 */

/** Custom event name for YouTube MAIN world → content script communication */
export const READTO_EVENT = 'readto-event-v1';

/** YouTube player internal track data key */
export const READTO_TRACKS = 'readto:tracks';

/** YouTube player internal lines data key */
export const READTO_LINES = 'readto:lines';

/** Performance metrics passed from loader to content script */
export interface PerfMetrics {
  injectTime: number;
  loadTime: number;
}

/** Event detail for READTO_EVENT custom events */
export interface ReadtoEventDetail {
  token: typeof READTO_TRACKS;
  videoId: string;
  lines?: TranscriptLine[];
  tracks?: unknown;
}

/** A single line/subtitle segment with timing */
export interface TranscriptLine {
  start: number;  // seconds
  end: number;    // seconds
  text: string;
}

/** Word-level annotation target */
export interface AnnotationTarget {
  word: string;
  occurrenceIndex: number;
  textNode: Text;
  offsetInNode: number;
  length: number;
}

/** Translation result for a single word */
export interface WordTranslation {
  word: string;
  occurrence: number;
  translation: string;
}

/** Word detail from translations-detail.json */
export interface WordDetail {
  /** Phonetic transcription */
  p: string;
  /** Part of speech + translation, e.g. "n. 例子" */
  t: string;
  /** Example sentences */
  e: Array<{ en: string; zh: string }>;
}

/** LLM configuration */
export interface LlmConfig {
  endpoint: string;
  model: string;
  apiKey: string;
}

/** Full app configuration */
export interface FullConfig {
  level: CefrLevel;
  translationMode: TranslationMode;
  llm: LlmConfig | null;
  autoSpeak: boolean;
}

/** Settings stored in chrome.storage.sync */
export interface Settings {
  level: CefrLevel;
  translationMode: TranslationMode;
  autoSpeak: boolean;
}

/** CEFR levels from beginner to advanced */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Translation backend */
export type TranslationMode = 'local' | 'llm';

/** Site-specific rule for selector overrides */
export interface SiteRule {
  id: string;
  matches: string[];
  selectors?: string[];
  stayOriginalSelectors: string[];
  excludeSelectors: string[];
}

/** Result of processing a paragraph */
export type ProcessResult = 'done' | 'partial' | 'failed';

/** Translator interface */
export interface Translator {
  kind: 'local' | 'llm';
  translate(params: TranslateParams): Promise<WordTranslation[]>;
}

export interface TranslateParams {
  context: string;
  targets: Array<{ word: string; occurrence: number }>;
}

/** Alias for AnnotationTarget */
export type WordMatch = AnnotationTarget;

/** Single word translation result */
export interface TranslationResult {
  word: string;
  translation: string;
}
