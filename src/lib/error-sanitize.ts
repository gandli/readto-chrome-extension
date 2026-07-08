/**
 * Sanitize error objects before crossing security boundaries.
 *
 * Threat model: service worker forwards errors from LLM providers to
 * content scripts (potentially untrusted pages) via chrome.runtime.sendMessage.
 * OpenAI-compatible endpoints commonly echo the request Authorization header,
 * body, or partial API keys in error messages. These MUST be redacted.
 *
 * Any page can intercept messages targeted at its own content script, so this
 * function is the single choke-point that guarantees no secret exits the
 * privileged extension context.
 */

/** Patterns that match secret-shaped substrings — order matters (broadest first). */
const SECRET_PATTERNS: readonly RegExp[] = [
  // Bearer / JWT / base64-payload API tokens (allows +/= for base64, . for JWT)
  /Bearer\s+[A-Za-z0-9_\-.+/=]{10,}/gi,
  // OpenAI style sk-* / sk-proj-* / sk-ant-* keys
  /sk-[A-Za-z0-9_\-.+/=]{20,}/g,
  // Anthropic dedicated x-api-key header echo
  /x-api-key[\s"':=]+[A-Za-z0-9_\-.+/=]{10,}/gi,
  // Google api key query param `?key=xxx`
  /[?&]key=[A-Za-z0-9_\-.+/=]{10,}/gi,
  // Generic `api_key: "..."` / `authorization="..."` / `token: ...`
  /(api[_-]?key|authorization|token)["'\s]*[:=]["'\s]*[A-Za-z0-9_\-.+/=]{10,}/gi,
];

const MAX_MESSAGE_LENGTH = 200;
/**
 * Pre-truncate window before regex/literal sanitization. Prevents multi-KB
 * error bodies (Cloudflare 5xx pages) from stalling the main thread while
 * still large enough that secrets straddling the 200-char display boundary
 * are fully redacted before slice. (校对鸭 v4 教训)
 */
const PRE_SANITIZE_WINDOW = 1000;
/**
 * Minimum apiKey length that qualifies for literal string-replace fallback.
 * Below this we skip literal replace to avoid nuking UI copy that happens
 * to contain a short test-key value. (校对鸭 v5 教训)
 */
const MIN_LITERAL_APIKEY_LENGTH = 8;
const REDACTED = '[REDACTED]';

export interface SanitizedError {
  readonly code: string;
  readonly message: string;
}

/**
 * Convert an arbitrary thrown value into a redacted, size-bounded, structured
 * error suitable for transmission to a lower-trust context.
 *
 * Guarantees:
 * - No `Bearer <token>`, `sk-…`, or `api_key=…` substrings survive
 * - When `apiKey` (>= 8 chars) is provided, any literal occurrence is redacted
 *   as a belt-and-suspenders defense for provider-specific formats
 *   (`dsk-*` DeepSeek, `qwen-*` Alibaba, or fully custom formats).
 * - Message is <= 200 characters (ellipsis appended when truncated)
 * - Return value is a plain object (structured-clone safe)
 * - Runtime is bounded: input is pre-truncated to PRE_SANITIZE_WINDOW before
 *   the regex pass, so a 100KB Cloudflare error page cannot stall the thread.
 */
export function sanitizeError(err: unknown, apiKey?: string): SanitizedError {
  let raw: string;

  if (err instanceof Error) {
    // Defensive: some custom Error subclasses / cross-context serialization
    // may set .message to a non-string. String() coerces safely without throwing.
    raw = typeof err.message === 'string' ? err.message : String(err.message);
  } else if (err === null) {
    raw = 'null';
  } else if (err === undefined) {
    raw = 'undefined';
  } else if (typeof err === 'string') {
    raw = err;
  } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    // Defensively pull `.message` from plain objects — cross-context serialization
    // (chrome.runtime message boundary, structured clone) may strip the Error prototype
    // so `err instanceof Error` is false while the shape is still error-like.
    raw = (err as { message: string }).message;
  } else {
    try {
      raw = JSON.stringify(err);
    } catch {
      raw = Object.prototype.toString.call(err);
    }
  }

  // Bound the sanitize window BEFORE regex to keep runtime bounded on huge bodies.
  // 1000 chars is > 5× the display cap (200), so any secret that could survive
  // to the visible slice is still covered.
  let msg = raw.length > PRE_SANITIZE_WINDOW ? raw.slice(0, PRE_SANITIZE_WINDOW) : raw;

  for (const pattern of SECRET_PATTERNS) {
    msg = msg.replace(pattern, REDACTED);
  }

  // Literal apiKey fallback — belt & suspenders for custom formats
  // (DeepSeek dsk-*, Kimi, Zhipu, Qwen) that don't match SECRET_PATTERNS.
  // Guard against short/empty keys that could nuke innocent UI text.
  if (apiKey) {
    const trimmed = apiKey.trim();
    if (trimmed.length >= MIN_LITERAL_APIKEY_LENGTH) {
      msg = msg.split(trimmed).join(REDACTED);
    }
  }

  if (msg.length > MAX_MESSAGE_LENGTH) {
    msg = msg.slice(0, MAX_MESSAGE_LENGTH) + '…';
  }

  return { code: 'llm_error', message: msg };
}
