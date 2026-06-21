# Readto Chrome Extension v0.3.1 — Complete Module Analysis

## 1. File Inventory & Sizes

| File | Size | Role |
|------|------|------|
| `assets/level-filter-DqkbMnw5.js` | 3,413,324 B (159,457 lines) | **Mega-bundle**: React, ReactDOM, React-JSX-runtime, tooltip/annotation web component, CEFR word→level map (~159K words), English→Chinese local translation dict, site-specific configs, translator factories, DOM filter |
| `assets/options-ChzBeowE.js` | 212,743 B | Options/settings page (React SPA with lucide-react, sonner toasts, theme support) |
| `assets/llm-stream-bCNi7haT.js` | 232,335 B | Vercel AI SDK + Zod + SSE parser, LLM streaming batch translation |
| `assets/translations-3x5cXER0.js` | 4,199,844 B | Inline JSON dictionary: English word → Chinese translation (~159K entries) |
| `assets/index.ts-Bi-u9n9y.js` | 11,513 B | **Content script** (main web pages) |
| `assets/index.ts-D_6H5iX4.js` | 5,567 B | **YouTube content script** (ISOLATED world) |
| `assets/page-world.ts-BGmjBmlP.js` | 5,727 B | **YouTube MAIN world** script (intercepts caption data) |
| `assets/storage-BlXw-pAd.js` | 3,524 B | Storage helpers + Vite preloader |
| `assets/inline-renderer-CE9Ekxkf.js` | 1,265 B | Word-detail fetch + inline annotation renderer |
| `assets/stream-preview-DRaBErNP.js` | 998 B | LLM stream preview for options page |
| `assets/types-DC28QtkU.js` | 91 B | Shared constants (event name, storage keys) |
| `assets/llm-url-dATdcq50.js` | 359 B | LLM endpoint URL utilities |
| `assets/index.ts-DXxM-6el.js` | 2,990 B | **Service worker** (background script) |

---

## 2. Complete Module Dependency Graph

```
types-DC28QtkU.js  (leaf — no imports)
    ↑
    ├── page-world.ts-BGmjBmlP.js    [imports: a(token), b(eventKey), E(LINES_EVENT)]
    └── index.ts-D_6H5iX4.js         [imports: a(token), E(LINES_EVENT)]

storage-BlXw-pAd.js  (leaf — no imports except Vite runtime)
    ↑
    ├── level-filter-DqkbMnw5.js     [imports: _(__vitePreload)]
    ├── index.ts-Bi-u9n9y.js         [imports: b(getSiteConfig), c(isFullConfig)]
    ├── index.ts-DXxM-6el.js         [imports: _(__vitePreload), m(initStorage), r(getReadableConfig), c(isFullConfig)]
    ├── index.ts-D_6H5iX4.js         [imports: b(getSiteConfig), c(isFullConfig)]
    └── options-ChzBeowE.js          [imports: i(__vitePreload), _(__vitePreload), r(getReadableConfig), w(isEnabled), a(getSiteConfig)]

translations-3x5cXER0.js  (leaf — inline JSON dictionary)
    ↑
    └── level-filter-DqkbMnw5.js     [lazy-loaded via __vitePreload]

llm-url-dATdcq50.js  (leaf — no imports)
    ↑
    ├── llm-stream-bCNi7haT.js       [imports: b(baseUrlFromEndpoint), c(chatCompletionsUrl)]
    └── options-ChzBeowE.js          [imports: e(hasQueryParams), c(chatCompletionsUrl)]

llm-stream-bCNi7haT.js  (imports: llm-url)
    ↑
    ├── index.ts-DXxM-6el.js         [dynamic import → streamBatch]
    └── stream-preview-DRaBErNP.js   [imports: streamBatch]

inline-renderer-CE9Ekxkf.js  (imports: level-filter → $e/createAnnotatedSpan)
    ↑
    ├── index.ts-Bi-u9n9y.js         [imports: g(getWordDetail), a(applyAnnotations)]
    ├── index.ts-D_6H5iX4.js         [unused directly — YouTube uses its own]
    ├── options-ChzBeowE.js          [imports: a(applyAnnotations)]
    └── stream-preview-DRaBErNP.js   [imports: a(applyAnnotations)]

level-filter-DqkbMnw5.js  (imports: storage → __vitePreload)
    ↑
    ├── index.ts-Bi-u9n9y.js         [imports: b→ce(createTranslator), e→Z(isInExclude), d→ee(isInStayOriginal), f→ue(injectStyles), h→le(createTooltip), i→de(computeTooltipPos), p→fe(speak), k→he(getTranslator), m→ge(parseSiteConfig), s→pe(setSiteConfig), l→we(loadWordlist), c→G(filterForLevel)]
    ├── index.ts-D_6H5iX4.js         [imports: n→M(createAnnotatedSpan), k→O(getTranslator), l→k(loadWordlist), c→A(filterForLevel)]
    ├── options-ChzBeowE.js          [imports: r→T(React), g→Cd(default React), j→E(ReactDOM), R→Nd(???), a→_(React component), L→Va(???), l→$a(loadWordlist), c→Ha(filterForLevel)]
    ├── inline-renderer-CE9Ekxkf.js  [imports: n→g(createAnnotatedSpan)]
    └── stream-preview-DRaBErNP.js   [imports: l→f(loadWordlist), L→m(localTranslator), c→p(filterForLevel)]

page-world.ts-BGmjBmlP.js  (imports: types only)
    ↑
    [Injected into YouTube MAIN world — communicates via custom DOM events]

index.ts-DXxM-6el.js  (service worker — imports: storage, lazy-loads llm-stream)
    ↑
    [Responds to messages from content scripts]
```

### Simplified Import Tree

```
                   ┌──────────────────────┐
                   │   index.ts-DXxM-6el  │  SERVICE WORKER
                   │  (service worker)    │
                   └──┬──────────┬────────┘
                      │          │  (dynamic import)
            storage   │          │  llm-stream → llm-url
                      │          └──────────────────────┐
                      ▼                                 ▼
               ┌─────────────┐               ┌──────────────────┐
               │  storage    │               │   llm-stream     │
               └──────┬──────┘               │  (Vercel AI SDK, │
                      │                      │   Zod, SSE)      │
                      ▼                      └──────────────────┘
            ┌───────────────────────┐
            │    level-filter       │  MEGA BUNDLE
            │  React + ReactDOM    │
            │  CEFR map (159K)     │  ← lazy-loads translations-3x5cXER0
            │  Local dict translator│
            │  Site configs        │
            │  Tooltip component   │
            │  DOM filter engine   │
            └──┬──────┬──────┬─────┘
               │      │      │
               ▼      │      ▼
    ┌──────────────┐  │  ┌─────────────────────┐
    │inline-renderer│ │  │  stream-preview      │
    └──────────────┘  │  └─────────────────────┘
                      ▼
         ┌────────────────────────┐
         │  index.ts-Bi-u9n9y     │  CONTENT SCRIPT (web pages)
         │  + index.ts-D_6H5iX4   │  CONTENT SCRIPT (YouTube ISOLATED)
         └────────────────────────┘
                      │
                      │ custom DOM events
                      ▼
         ┌────────────────────────┐
         │  page-world.ts-BGmjBmlP│  MAIN WORLD (YouTube)
         │  + types-DC28QtkU      │
         └────────────────────────┘
```

---

## 3. All Exported Symbols with Signatures

### `types-DC28QtkU.js`

| Export Alias | Original Name | Value | Description |
|---|---|---|---|
| `E` | `E` (readto:lines) | `"readto:lines"` | Chrome storage key for YouTube caption lines |
| `a` | `a` (readto-event-v1) | `"readto-event-v1"` | Custom event name for YouTube MAIN→ISOLATED communication |
| `b` | `b` (readto:tracks) | `"readto:tracks"` | Chrome storage key for YouTube track data |

### `storage-BlXw-pAd.js`

| Export Alias | Minified | Signature | Description |
|---|---|---|---|
| `_` | `N` | `(dynamicDeps, staticDeps) → Promise<module>` | Vite `__vitePreload` / dynamic import helper |
| `a` | `R` | `async () → {level, translationMode}` | `getSiteConfig()` — reads level & translationMode from `chrome.storage.sync` |
| `b` | `P` | `async () → {level, translationMode, llm?}` | `getFullConfigWithLlm()` — merges site config + LLM config from `chrome.storage.local` |
| `c` | `U` | `(obj) → boolean` | `isFullConfig()` — validates an object has `{level, translationMode}` shape |
| `i` | `_` | same as `N` above | Vite preload (duplicate alias) |
| `m` | `M` | `async () → void` | `initStorage()` — ensures chrome.storage.local is initialized |
| `r` | `T` | `async () → {level, translationMode, llm?}` | `getReadableConfig()` — like getFullConfigWithLlm but reads actual API key |
| `w` | `D` | `(config) → boolean` | `isEnabled()` — checks if extension is active (valid config) |

**Internal constants**: `g` = DEFAULT_CONFIG `{level:"B2", translationMode:"local"}`, `a` = `"llmConfig"`, `r` = `"llmApiKey"`, `c` = `"llm"`, `C` = `"<REDACTED-IN-CONTENT-CONTEXT>"`

**Chrome API usage**: `chrome.storage.sync.get(["level","translationMode"])`, `chrome.storage.local.get(["llmConfig","llmApiKey"])`, `chrome.storage.local.set()`

### `level-filter-DqkbMnw5.js` (18 exports)

| Export Alias | Minified | Signature | Description |
|---|---|---|---|
| `L` | `fn` | `{kind:"local", translate({context,targets}) → Promise<{word,translation}[]>}` | **Local translator** object — uses batched `TRANSLATE_MANY` message to service worker |
| `R` | `Ne` | `Object` | ESM module wrapper around React (`{default: React}`) |
| `a` | `Fn` | `React` | React default export |
| `b` | `Ue` | `() → SiteConfig \| null` | `getSiteConfig()` — returns active site-specific config (matched by hostname) |
| `c` | `Ve` | `(element: Element, level: CEFRLevel) → WordMatch[]` | **`filterForLevel()`** — walks DOM text nodes, tokenizes words, returns words above given CEFR level |
| `d` | `je` | `(element: Element) → boolean` | `isInStayOriginal()` — checks if element matches `stayOriginalSelectors` (code, math, etc.) |
| `e` | `qe` | `(element: Element) → boolean` | `isInExclude()` — checks if element matches `excludeSelectors` (nav, banners, etc.) |
| `f` | `ce` | `(shadowRoot: ShadowRoot, doc: Document) → void` | `injectStyles()` — injects tooltip CSS into shadow DOM via `adoptedStyleSheets` or `<style>` |
| `g` | `qn` | `React.default` | React default export helper |
| `h` | `se` | `({doc, word, detail, onSpeak?}) → HTMLElement` | `createTooltip()` — builds tooltip DOM with phonetics, TTS button, examples |
| `i` | `Kn` | `({hostRect, tipRect, vw, vh, gap}) → {top, left}` | `computeTooltipPosition()` — positions tooltip relative to host element |
| `j` | `Pe` | `ReactDOM` | ReactDOM (react-dom) |
| `k` | `Ie` | `(config) → Translator` | `getTranslator(config)` — factory: returns local or LLM translator based on `translationMode` |
| `l` | `Fe` | `async () → Map<string, CEFRLevel>` | `loadWordlist()` — parses embedded CEFR JSON string into `Map<word, level>` |
| `m` | `De` | `(rawConfig, siteRules?) → ParsedSiteConfig` | `parseSiteConfig()` — merges general rules + site-specific overrides for selectors |
| `n` | `$e` | `(doc, word, translation, options?) → DocumentFragment` | **`createAnnotatedSpan()`** — creates `<span data-readto>` with shadow DOM, superscript translation, optional hover detail |
| `p` | `Bn` | `(text: string, abortSignal?) → void` | `speak()` — TTS via `speechSynthesis.speak()`, picks best English voice |
| `r` | `W` | `React` | React (same as `a`/`Fn`) |
| `s` | `Me` | `(config: ParsedSiteConfig) → void` | `setSiteConfig()` — sets active site config, updates internal `I` and `D` selector strings |

**Internal data structures**:
- `X = {A1:1, A2:2, B1:3, B2:4, C1:5, C2:6}` — CEFR level ordering
- `_e` — massive inline JSON string of `{word: CEFRLevel}` (embedded in file, ~159K entries)
- `A = null` — lazy-loaded `Map<string, CEFRLevel>` (word→level)
- Site configs: `ve` (general rules), `ke[]` (site-specific rules for github, wikipedia, arxiv, hackernews, twitter, stackexchange, mdn, reddit)
- `vn = null` — current active site config
- `I = ""` — current exclude selectors string
- `D = ""` — current stayOriginal selectors string

### `translations-3x5cXER0.js`

| Export | Description |
|---|---|
| `default` | Inline JSON string: `{word: chineseTranslation}` (~159K entries). Example: `{"able":"能够","abnormal":"异常",...}` |

### `llm-url-dATdcq50.js`

| Export Alias | Minified | Signature | Description |
|---|---|---|---|
| `b` | `r` | `(endpoint: string) → string` | `baseUrlFromEndpoint()` — strips trailing slashes and `/chat/completions` |
| `c` | `a` | `(endpoint: string) → string` | `chatCompletionsUrl()` — appends `/chat/completions` to base URL |
| `e` | `c` | `(url: string) → boolean` | `hasQueryParams()` — checks if URL has query string |

### `llm-stream-bCNi7haT.js`

| Export Alias | Minified | Signature | Description |
|---|---|---|---|
| `BATCHED_SYSTEM_PROMPT` | `Yv` | `string` | System prompt instructing LLM to batch-translate words into Chinese |
| `BatchedResultsSchema` | `Kv` | `ZodSchema` | Zod schema for parsing LLM batch response |
| `baseUrlFromEndpoint` | `Mi` | re-export of llm-url `b` | |
| `buildBatchedUserMessage` | `Xv` | `(items: {context, targets[]}[]) → string` | Builds user prompt with paragraph contexts and target words |
| `chatCompletionsUrl` | `ay` | re-export of llm-url `c` | |
| `streamBatch` | `ry` | `async ({items, cfg, abortSignal, onParagraphDone}) → {word,translation}[][]` | **Main LLM streaming function** — sends batch to OpenAI-compatible API, streams partial results |
| `validateTranslations` | `Qv` | `(rawResults, itemContext) → {word, occurrence, translation}[]` | Validates LLM translation output against expected targets |

**Internal**: Uses Vercel AI SDK's `streamText` + custom SSE parser. The Zod schema (`Kv`) defines `{results: [{translations: [{word, occurrence, translation}]}]}`. Translation validation rejects results >20 chars or matching Chinese-only regex.

### `inline-renderer-CE9Ekxkf.js`

| Export Alias | Minified | Signature | Description |
|---|---|---|---|
| `a` | `x` | `(element: Element, wordMatches: WordMatch[], translations: Translation[]) → "done" \| "partial" \| "failed"` | **`applyAnnotations()`** — replaces text nodes with annotated spans, returns status |
| `g` | `p` | `async (word: string) → WordDetail \| null` | `getWordDetail()` — fetches phonetics/examples via `chrome.runtime.sendMessage({type:"GET_WORD_DETAIL"})` with LRU cache |

### `stream-preview-DRaBErNP.js`

| Export Alias | Minified | Signature | Description |
|---|---|---|---|
| `streamPreviewAnnotations` | `v` | `async ({items, elements, cfg, level, abortSignal, onParagraphDone}) → void` | Runs local dict seed + LLM stream for options page preview |

### `page-world.ts-BGmjBmlP.js`

No ES module exports (runs in MAIN world, communicates via DOM events).

**Internal functions**:
- `M(data)` → `CaptionLine[]` — `parseTimedTextJson()` — parses YouTube caption track data (events/actions formats)
- `C(events)` → `boolean` — `isAsrEvents()` — detects ASR-style caption events
- `F(events)` → `{text, tMs}[]` — `flattenAsrSegments()` — flattens ASR segments
- `O(events)` → `CaptionLine[]` — `parseAsrEvents()` — groups ASR segments into lines
- `g(xmlString)` → `CaptionLine[]` — `parseTimedTextXml()` — parses XML timed text (SRT-like)

### `index.ts-D_6H5iX4.js` (YouTube ISOLATED content script)

No ES module exports.

**Internal functions**:
- `F(videoElement)` → `CaptionOverlay` — creates YouTube caption overlay with `setLines()` and `destroy()`
- `U(container, line)` — renders word-level annotations in caption line
- `L()` → `string | null` — extracts current YouTube video ID from URL
- `V(lines)` → `boolean` — validates caption line shape
- `w(tag, data)` — debug logging

---

## 4. Complete Call Graph

### Content Script (index.ts-Bi-u9n9y.js) — Main Web Pages

```
entry()
  ├─ getSiteConfig() [storage.b]
  ├─ isFullConfig() [storage.c]
  ├─ parseSiteConfig(config) [level-filter.m]
  ├─ setSiteConfig(parsed) [level-filter.s]
  ├─ loadWordlist() [level-filter.l]
  ├─ getTranslator(config) [level-filter.k]
  │   └─ returns localTranslator or llmTranslator
  │
  ├─ observeDOM(root)
  │   ├─ findCandidateElements(root)
  │   │   ├─ uses site selectors OR walks children
  │   │   ├─ isInExclude(el) [level-filter.e]
  │   │   ├─ isInStayOriginal(el) [level-filter.d]
  │   │   └─ isAnnotated(el) — checks data-readto attribute
  │   │
  │   ├─ IntersectionObserver → lazy process visible elements
  │   │
  │   └─ processElement(el)
  │       ├─ filterForLevel(el, level) [level-filter.c]
  │       │   ├─ walks text nodes (skips CODE/PRE/SCRIPT/etc.)
  │       │   ├─ tokenizes words via regex
  │       │   ├─ checks CEFR level from wordlist Map
  │       │   └─ returns WordMatch[] {word, occurrenceIndex, textNode, offsetInNode, length}
  │       │
  │       ├─ translator.translate({context, targets})
  │       │   ├─ LOCAL: chrome.runtime.sendMessage({type:"TRANSLATE_MANY"})
  │       │   └─ LLM: chrome.runtime.sendMessage({type:"TRANSLATE_MANY"}) → LLM API
  │       │
  │       └─ applyAnnotations(el, matches, translations) [inline-renderer.a]
  │           ├─ for each match: createRange() → deleteContents() → insertNode()
  │           └─ createAnnotatedSpan(doc, word, translation, {withHoverDetail}) [level-filter.n]
  │               ├─ creates <span data-readto>
  │               ├─ attaches shadow DOM
  │               ├─ injects CSS [level-filter.f]
  │               ├─ adds superscript translation
  │               └─ addHoverDetail(host, shadowRoot, word, getDetail) [level-filter.n internal]
  │                   ├─ pointerenter → 150ms delay → getWordDetail(word) [inline-renderer.g]
  │                   │   └─ chrome.runtime.sendMessage({type:"GET_WORD_DETAIL"})
  │                   ├─ creates tooltip [level-filter.h]
  │                   │   ├─ phonetics display
  │                   │   ├─ speak button → speak(text) [level-filter.p]
  │                   │   │   └─ speechSynthesis.speak()
  │                   │   └─ example sentences
  │                   └─ computeTooltipPosition() [level-filter.i]
  │
  └─ MutationObserver → re-scan on DOM changes
```

### Service Worker (index.ts-DXxM-6el.js)

```
chrome.runtime.onInstalled → openOptionsPage() + initStorage()
chrome.runtime.onStartup → initStorage()
chrome.action.onClicked → openOptionsPage()

chrome.runtime.onMessage.addListener(handler)
  ├─ type:"GET_WORD_DETAIL"
  │   └─ fetch("/assets/translations-detail-Xy4MITfc.json")
  │       └─ returns {phonetics, examples, ...}
  │
  ├─ type:"TRANSLATE_MANY"
  │   ├─ rate limiting: 60 req/min via chrome.storage.session
  │   ├─ size checks: max 200 targets, max 120K chars
  │   ├─ dynamic import llm-stream-bCNi7haT.js
  │   └─ streamBatch({items, cfg, abortSignal: timeout(60s)})
  │       └─ Vercel AI SDK → OpenAI-compatible chat completions
  │
  └─ type:"LLM_TRANSLATE" (single item)
      └─ similar to TRANSLATE_MANY but for single paragraph
```

### YouTube Content Script (index.ts-D_6H5iX4.js) — ISOLATED World

```
entry()
  ├─ getSiteConfig() [storage.b]
  ├─ isFullConfig() [storage.c]
  ├─ getTranslator(config) [level-filter.k]
  ├─ loadWordlist() [level-filter.l]
  │
  └─ document.addEventListener("readto:lines", handler)
      ├─ validates event.detail.token === TOKEN
      ├─ validates videoId matches current URL
      ├─ validates line shapes
      ├─ F(videoElement) → creates CaptionOverlay
      │   ├─ hides native YouTube captions via CSS
      │   ├─ creates #readto-caption div
      │   ├─ timeupdate listener → shows current line
      │   ├─ U(container, line) → word-level annotations
      │   └─ MutationObserver on subtitle button
      │
      ├─ batch translation loop:
      │   ├─ filterForLevel(tempDiv, level) [level-filter.c]
      │   ├─ translator.translate({context, targets})
      │   └─ wordCache.set(word, translation)
      │
      └─ for each line:
          ├─ create annotated line with translations map
          └─ overlay.setLines(annotatedLines)
```

### YouTube MAIN World (page-world.ts-BGmjBmlP.js)

```
Intercepts YouTube's caption track response:
  ├─ Overrides fetch/XMLHttpRequest to capture caption data
  ├─ parseTimedTextJson(data) → CaptionLine[]
  │   ├─ handles "events" format (ASR and non-ASR)
  │   └─ handles "actions" format (transcript panel)
  ├─ parseTimedTextXml(xmlString) → CaptionLine[]
  │
  └─ dispatches CustomEvent("readto:lines", {detail: {videoId, lines, token}})
      → received by index.ts-D_6H5iX4.js (ISOLATED world)
```

---

## 5. Chrome API Usage

### `chrome.storage`
- **`chrome.storage.sync`**: `get(["level", "translationMode"])`, `set({level, translationMode})`
- **`chrome.storage.local`**: `get(["llmConfig", "llmApiKey"])`, `set({llmConfig, llmApiKey})`
- **`chrome.storage.session`**: `get("llmRateTimestamps")`, `set({llmRateTimestamps})` — rate limiting timestamps

### `chrome.runtime`
- **`onInstalled.addListener`**: opens options page on install, initializes storage
- **`onStartup.addListener`**: re-initializes storage
- **`onMessage.addListener`**: handles 3 message types:
  - `GET_WORD_DETAIL` → fetches detail JSON, returns phonetics/examples
  - `TRANSLATE_MANY` → LLM batch translation with rate limiting
  - `LLM_TRANSLATE` → single LLM translation
- **`sendMessage`**: used by content scripts to call service worker
- **`openOptionsPage()`**: called on install and action click

### `chrome.action`
- **`onClicked.addListener`**: opens options page

### `chrome.i18n`
- **`detectLanguage(text, callback)`**: used in content script to detect if page is English

### Other Browser APIs
- **`speechSynthesis`**: TTS for pronunciation (with voice selection heuristics)
- **`IntersectionObserver`**: lazy processing of visible elements
- **`MutationObserver`**: DOM change detection for re-scanning
- **`CSSStyleSheet.adoptedStyleSheets`**: shadow DOM style injection
- **`DOMParser`**: XML subtitle parsing
- **`Range`**: text node manipulation for annotations
- **`fetch`**: loading detail JSON, LLM API calls

---

## 6. DOM Manipulation Patterns

### Annotation Pattern (Inline Renderer)
```
For each word match in a text node:
  1. Create Range at (textNode, offsetInNode) → (textNode, offsetInNode + length)
  2. range.deleteContents()
  3. range.insertNode(annotatedSpan)

Annotated span structure:
  <span data-readto>
    #shadow-root (open)
      <style> (adoptedStyleSheets or <style> element)
      <slot/> (original word text)
      <span class="rt">translation</span>
      <div class="tooltip"> (lazy-loaded on hover)
        <div class="phonetic">...</div>
        <button class="speaker">🔊</button>
        <div class="examples">...</div>
      </div>
  </span>
```

### Tooltip Positioning
```
computeTooltipPosition({hostRect, tipRect, vw, vh, gap=4})
  - Prefers below host element
  - Falls back to above if below would overflow viewport
  - Clamps horizontally to viewport edges
  - Returns {top, left} as fixed coordinates
```

### YouTube Caption Overlay
```
Hides: .ytp-caption-window-container { display: none !important }
Creates: #readto-caption (positioned absolute/fixed at bottom of video)
Structure per line:
  <div> (background: rgba(0,0,0,.75), white text)
    [word] [word] <span data-readto>word<sup>翻译</sup></span> [word]
  </div>
```

### Excluded Elements
- Tags: `CODE, PRE, INPUT, TEXTAREA, SCRIPT, STYLE, NOSCRIPT`
- Attributes: `contenteditable`, `data-readto`
- Site-specific stay-original selectors (code blocks, math, etc.)
- Site-specific exclude selectors (nav, banners, etc.)

---

## 7. Event Handling

### DOM Events
| Event | Where | Purpose |
|---|---|---|
| `pointerenter/leave` | Annotated spans | Tooltip show/hide with 150ms/120ms delays |
| `timeupdate` | YouTube `<video>` | Sync caption overlay with video time |
| `aria-pressed` mutation | YouTube subtitle button | Toggle caption overlay visibility |
| `voiceschanged` | `speechSynthesis` | Voice list ready callback |
| `readto:lines` | `document` (custom event) | YouTube MAIN→ISOLATED caption data delivery |

### Custom Events
- **`readto:lines`** (event name: `"readto-event-v1"`): Dispatched from MAIN world, received in ISOLATED world. Payload: `{videoId, lines[], token}`.

### Chrome Runtime Messages
| Type | Direction | Payload | Response |
|---|---|---|---|
| `GET_WORD_DETAIL` | Content → SW | `{type, word}` | `{ok, detail: {phonetics, examples}}` |
| `TRANSLATE_MANY` | Content → SW | `{type, items: [{context, targets[{word}]}]}` | `{ok, results: [{word, translation}][]}` |

---

## 8. Data Flow: Word → Level Check → Translation → Annotation

### Phase 1: DOM Discovery
```
Page loads
  → Content script injects
  → getSiteConfig() reads CEFR level from chrome.storage.sync (default: "B2")
  → parseSiteConfig() resolves site-specific selectors
  → Walks DOM tree looking for text-containing elements
  → Filters: skip <code>, <pre>, <script>, already-annotated, excluded selectors
  → IntersectionObserver defers processing until element is visible
```

### Phase 2: Word Filtering (`filterForLevel`)
```
Input: DOM element + target CEFR level (e.g., "B2")
  → Collect all TEXT_NODE children (recursive, skipping excluded elements)
  → For each text node:
    → Regex tokenize: /[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019\-]*[A-Za-z\u00C0-\u024F]|[A-Za-z\u00C0-\u024F]/g
    → Track sentence boundaries (period, !, ?)
    → Track capitalization context (sentence-start vs mid-sentence)
    → For each token:
      → Normalize to lowercase
      → Skip: length < 2, ALL_CAPS, or Capitalized mid-sentence
      → Look up in CEFR wordlist Map: word → level (A1/C2/etc.)
      → If word level > target level: ADD to matches
  → Output: WordMatch[] {word, occurrenceIndex, textNode, offsetInNode, length}

CEFR level ordering: A1(1) < A2(2) < B1(3) < B2(4) < C1(5) < C2(6)
  → "B2" target filters out A1-B2 words, keeps C1-C2 words
```

### Phase 3: Translation
```
WordMatch[] → group unique words
  → translator.translate({context: paragraphText, targets: [{word, occurrence:0}]})

LOCAL MODE:
  → chrome.runtime.sendMessage({type:"TRANSLATE_MANY", items})
  → Service worker: look up in embedded translations-3x5cXER0.js dictionary
  → Returns: {word, translation}[] (Chinese translations)

LLM MODE:
  → chrome.runtime.sendMessage({type:"TRANSLATE_MANY", items})
  → Service worker: rate limit check (60/min)
  → Size check (200 targets max, 120K chars max)
  → Dynamic import llm-stream
  → streamBatch() → Vercel AI SDK → OpenAI-compatible API
  → System prompt: "Translate these English words to Chinese, considering context"
  → Zod schema validates response: {results: [{translations: [{word, occurrence, translation}]}]}
  → Streaming partial results with onParagraphDone callback
  → Returns: {word, translation}[]
```

### Phase 4: Annotation
```
applyAnnotations(element, matches, translations)
  → Sort matches by document position (reverse order to preserve offsets)
  → For each match:
    → Look up translation by word#occurrence key
    → Create Range at text node offset
    → Delete original text content
    → Insert annotated span:
      createAnnotatedSpan(doc, word, translation, {withHoverDetail})
        → <span data-readto="...">
           #shadow-root
             <slot/>original-word
             <span class="rt">翻译</span>
           </span>
    → Optional hover detail:
      → On pointerenter (150ms delay):
        → getWordDetail(word) → chrome.runtime.sendMessage("GET_WORD_DETAIL")
        → Service worker fetches /assets/translations-detail-Xy4MITfc.json
        → Returns {phonetics: [{ipa, audio}], examples: [{en, zh}]}
        → createTooltip() builds rich tooltip with:
          - IPA phonetic transcription
          - Audio playback button (speechSynthesis or audio URL)
          - Example sentences with target word highlighted
      → computeTooltipPosition() places tooltip fixed at viewport coordinates
  → Returns: "done" | "partial" | "failed"
```

### YouTube-Specific Flow
```
YouTube page loads
  → MAIN world script injects, intercepts caption track fetch
  → Parses timed text (JSON events or XML)
  → Groups into lines: {start, end, text}
  → Dispatches CustomEvent("readto:lines", {videoId, lines, token})

  → ISOLATED world script receives event
  → Validates token, videoId, line shapes
  → Creates caption overlay (hides native YouTube captions)
  → For each line batch:
    → filterForLevel(tempDiv, level) identifies difficult words
    → translator.translate() gets translations
    → wordCache maps word → translation
  → Renders annotated lines in video overlay
  → timeupdate event syncs display with video playback
```

---

## 9. Site-Specific Configurations

The extension has built-in rules for these sites:

| Site | Hostname Match | Special Selectors | Stay-Original Additions |
|---|---|---|---|
| GitHub | `github.com` | — | `.blob-code`, `.highlight`, `.commit-ref`, `.sha`, `.text-mono` |
| Wikipedia | `*.wikipedia.org` | — | `.chemf`, `.mwe-math-element`, `.nowrap`, `.IPA` |
| arXiv | `arxiv.org`, `*.arxiv.org` | — | `.ltx_equation`, `.ltx_Math`, `.ltx_cite` |
| Hacker News | `news.ycombinator.com` | `.titleline > a`, `.commtext`, `.toptext` | — |
| Twitter/X | `twitter.com`, `x.com` | — | tweet text links, usernames, hashtags |
| Stack Exchange | `stackoverflow.com`, `*.stackexchange.com` | — | `.s-code-block`, `.post-tag`, `.badge` |
| MDN | `developer.mozilla.org` | — | `.code-example`, `[class*='token']` |
| Reddit | `*.reddit.com` | — | user links, subreddit links, `.author` |

**General stay-original selectors**: `pre, code, kbd, samp, var, tt, .katex, .MathJax, mjx-container, math, [translate=no], .notranslate, [class*='notranslate']`

**General exclude selectors**: `nav, [role=navigation], [role=banner], [role=contentinfo]`

---

## 10. Storage Schema

### `chrome.storage.sync`
| Key | Type | Default | Description |
|---|---|---|---|
| `level` | `"A1"\|"A2"\|"B1"\|"B2"\|"C1"\|"C2"` | `"B2"` | CEFR level threshold — words at or below this level are NOT annotated |
| `translationMode` | `"local"\|"llm"` | `"local"` | Translation backend |

### `chrome.storage.local`
| Key | Type | Description |
|---|---|---|
| `llmConfig` | `{endpoint: string, model: string, hasApiKey: boolean}` | LLM API configuration |
| `llmApiKey` | `string` | Actual API key (stored separately for security) |

### `chrome.storage.session`
| Key | Type | Description |
|---|---|---|
| `llmRateTimestamps` | `number[]` | Timestamps of recent LLM requests (for 60/min rate limiting) |

---

## 11. LLM Integration Details

### Rate Limiting
- **60 requests/minute** tracked via `chrome.storage.session`
- **200 max targets** per batch
- **120K max characters** per prompt (estimated)
- **60-second timeout** per request via `AbortSignal.timeout(60000)`

### LLM Prompt Structure
```
System: BATCHED_SYSTEM_PROMPT
  "You are a translator. For each paragraph, translate the target English words 
   to Chinese. Return JSON matching the schema..."

User: buildBatchedUserMessage(items)
  "Paragraph 1: <context text>
   Targets 1: [word1, word2, ...]
   
   Paragraph 2: <context text>
   Targets 2: [word3, word4, ...]
   ..."

Response (Zod-validated):
  {results: [{translations: [{word, occurrence, translation}]}]}
```

### Translation Validation
- Translation must be a string
- Must match `/[\u4e00-\u9fff]/` (contains Chinese characters)
- Max 20 characters
- Must match a target word#occurrence key
