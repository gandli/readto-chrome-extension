/**
 * CEFR word→level mapping data.
 *
 * Loads the full ~144K word-level dictionary from level-data-full.json
 * for accurate word level classification.
 */

import type { CefrLevel } from './types';

/** Cached word-level map */
let wordLevelMap: Map<string, CefrLevel> | null = null;
let loadPromise: Promise<Map<string, CefrLevel>> | null = null;

/**
 * Load the full word-level dictionary from the JSON file.
 * Uses chrome.runtime.getURL() for extension context.
 */
export async function loadLevelData(): Promise<Map<string, CefrLevel>> {
  if (wordLevelMap) return wordLevelMap;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      // Use chrome.runtime.getURL for extension context
      const url = chrome.runtime.getURL('assets/level-data-full.json');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch level data: ${response.status}`);
      }
      const data = await response.json();
      wordLevelMap = new Map(Object.entries(data)) as Map<string, CefrLevel>;
      console.log(`[readto] Loaded ${wordLevelMap.size} word levels from dictionary`);
      return wordLevelMap;
    } catch (err) {
      console.error('[readto] Failed to load level data:', err);
      // Return empty map as fallback
      wordLevelMap = new Map();
      return wordLevelMap;
    }
  })();

  return loadPromise;
}

/**
 * Get the word-level map. Loads it if not already loaded.
 */
export async function getWordLevelMap(): Promise<Map<string, CefrLevel>> {
  return loadLevelData();
}

/**
 * Synchronous access to the word-level map (only works after loadLevelData() completes).
 * Returns null if not loaded yet.
 */
export function getWordLevelMapSync(): Map<string, CefrLevel> | null {
  return wordLevelMap;
}

// For backward compatibility - a placeholder that will be replaced by dynamic loading
const LEVEL_DATA_JSON: Record<string, CefrLevel> = {};

export default LEVEL_DATA_JSON;
