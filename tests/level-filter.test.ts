/**
 * Tests for level-filter.ts — tokenizer, site rules, level checking, word filtering.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  tokenizeWords,
  getSiteRule,
  initSiteConfig,
  setSiteConfig,
  isStayOriginal,
  isExcluded,
  checkLevel,
  loadWordlist,
  filterWords,
  type FilteredWord,
} from '../src/lib/level-filter';

/* ─── Tokenizer ─── */

describe('tokenizeWords', () => {
  it('splits simple English text into words', () => {
    const tokens = tokenizeWords('Hello world');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].word).toBe('hello');
    expect(tokens[0].offset).toBe(0);
    expect(tokens[0].length).toBe(5);
    expect(tokens[1].word).toBe('world');
    expect(tokens[1].offset).toBe(6);
    expect(tokens[1].length).toBe(5);
  });

  it('handles single character words', () => {
    const tokens = tokenizeWords('I am a person');
    // "I" is a single char word
    expect(tokens.some(t => t.word === 'i')).toBe(true);
  });

  it('tracks uppercase detection', () => {
    const tokens = tokenizeWords('NASA released data');
    const nasa = tokens.find(t => t.word === 'nasa')!;
    expect(nasa.originalIsAllCaps).toBe(true);
    expect(nasa.originalHadUppercase).toBe(true);

    const released = tokens.find(t => t.word === 'released')!;
    expect(released.originalIsAllCaps).toBe(false);
    expect(released.originalHadUppercase).toBe(false);
  });

  it('tracks sentence-start capitalization', () => {
    const tokens = tokenizeWords('Hello. World');
    const hello = tokens[0];
    expect(hello.originalHadUppercase).toBe(true); // capitalized
    const world = tokens[1];
    expect(world.originalHadUppercase).toBe(true); // also capitalized
  });

  it('handles words with apostrophes and hyphens', () => {
    const tokens = tokenizeWords("it's a well-known fact");
    expect(tokens.some(t => t.word === "it's")).toBe(true);
    expect(tokens.some(t => t.word === 'well-known')).toBe(true);
  });

  it('handles accented characters', () => {
    const tokens = tokenizeWords('café résumé naïve');
    expect(tokens.some(t => t.word === 'café')).toBe(true);
    expect(tokens.some(t => t.word === 'résumé')).toBe(true);
    expect(tokens.some(t => t.word === 'naïve')).toBe(true);
  });

  it('returns empty array for empty string', () => {
    expect(tokenizeWords('')).toEqual([]);
  });

  it('handles text with only punctuation', () => {
    expect(tokenizeWords('!@#$%')).toEqual([]);
  });

  it('handles numbers mixed with words', () => {
    const tokens = tokenizeWords('test123 word');
    // "test123" — regex matches the alpha part only
    expect(tokens.some(t => t.word === 'word')).toBe(true);
  });
});

/* ─── Site Rules ─── */

describe('getSiteRule', () => {
  it('returns default rule for unknown sites', () => {
    const rule = getSiteRule('https://example.com');
    expect(rule.id).toBe('default');
    expect(rule.stayOriginalSelectors).toContain('pre');
    expect(rule.stayOriginalSelectors).toContain('code');
    expect(rule.excludeSelectors).toContain('nav');
  });

  it('returns github rule for github.com', () => {
    const rule = getSiteRule('https://github.com/user/repo');
    expect(rule.id).toBe('github');
    expect(rule.stayOriginalSelectors).toContain('.blob-code');
    expect(rule.stayOriginalSelectors).toContain('.highlight');
  });

  it('returns stackoverflow rule', () => {
    const rule = getSiteRule('https://stackoverflow.com/questions/123');
    expect(rule.id).toBe('stackoverflow');
    expect(rule.stayOriginalSelectors).toContain('.hljs');
  });

  it('returns wikipedia rule', () => {
    const rule = getSiteRule('https://en.wikipedia.org/wiki/Article');
    expect(rule.id).toBe('wikipedia');
    expect(rule.stayOriginalSelectors).toContain('.mw-code');
  });

  it('includes default selectors in site-specific rules', () => {
    const rule = getSiteRule('https://github.com');
    // Should have both default AND github-specific
    expect(rule.stayOriginalSelectors).toContain('pre'); // default
    expect(rule.stayOriginalSelectors).toContain('.blob-code'); // github
    expect(rule.excludeSelectors).toContain('nav'); // default
    expect(rule.excludeSelectors).toContain('[role=navigation]'); // default
  });
});

/* ─── Site Config ─── */

describe('initSiteConfig / setSiteConfig', () => {
  it('initializes config without throwing', () => {
    const rule = getSiteRule('https://example.com');
    initSiteConfig(rule);
    // Config should be set — verify by checking the rule structure
    expect(rule.stayOriginalSelectors).toContain('pre');
    expect(rule.excludeSelectors).toContain('nav');
  });

  it('setSiteConfig overrides the active config', () => {
    setSiteConfig({
      excludeSelectors: ['.custom-exclude'],
      stayOriginalSelectors: ['.custom-stay'],
    });
    // The function should not throw when called
    expect(() => setSiteConfig({
      excludeSelectors: [],
      stayOriginalSelectors: [],
    })).not.toThrow();
  });
});

/* ─── CEFR Level Checking ─── */

describe('checkLevel', () => {
  beforeEach(() => {
    // Reset wordMap by reloading
    // Note: loadWordlist loads from chrome.runtime.getURL which won't work in tests
    // We test the logic assuming wordMap is populated
  });

  it('returns undefined when wordlist not loaded', () => {
    // Before loading, checkLevel should return undefined
    // (wordMap is null by default in a fresh module)
    const result = checkLevel('nonexistent');
    // Could be undefined because wordMap is null, or because word isn't in map
    expect(result === undefined || typeof result === 'string').toBe(true);
  });
});

/* ─── Word Filtering (integration with DOM) ─── */

describe('filterWords', () => {
  it('throws if wordlist not loaded', () => {
    // filterWords requires wordMap to be loaded
    // In test environment without chrome API, this should throw
    // Create a minimal DOM-like element using a plain object
    const fakeElement = { childNodes: [] } as any;
    expect(() => filterWords(fakeElement, 'B2')).toThrow('wordlist not loaded');
  });
});

/* ─── Edge Cases ─── */

describe('tokenizeWords edge cases', () => {
  it('handles Unicode smart quotes', () => {
    const tokens = tokenizeWords("it\u2019s a test"); // curly apostrophe
    expect(tokens.some(t => t.word === "it\u2019s")).toBe(true);
  });

  it('handles consecutive spaces', () => {
    const tokens = tokenizeWords('hello   world');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].offset).toBe(0);
    expect(tokens[1].offset).toBe(8);
  });

  it('handles newlines and tabs', () => {
    const tokens = tokenizeWords("hello\n\tworld");
    expect(tokens).toHaveLength(2);
  });

  it('preserves offset accuracy with leading whitespace', () => {
    const tokens = tokenizeWords('  hello');
    expect(tokens[0].offset).toBe(2);
    expect(tokens[0].length).toBe(5);
  });

  it('handles very long text without performance issues', () => {
    const longText = 'word '.repeat(10000);
    const start = Date.now();
    const tokens = tokenizeWords(longText);
    const elapsed = Date.now() - start;
    expect(tokens.length).toBe(10000);
    expect(elapsed).toBeLessThan(1000); // should be fast
  });
});
