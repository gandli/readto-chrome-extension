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
 * - Message is <= 200 characters (ellipsis appended when truncated)
 * - Return value is a plain object (structured-clone safe)
 */
export function sanitizeError(err: unknown): SanitizedError {
  let raw: string;

  if (err instanceof Error) {
    raw = err.message;
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

  let msg = raw;
  for (const pattern of SECRET_PATTERNS) {
    msg = msg.replace(pattern, REDACTED);
  }

  if (msg.length > MAX_MESSAGE_LENGTH) {
    msg = msg.slice(0, MAX_MESSAGE_LENGTH) + '…';
  }

  return { code: 'llm_error', message: msg };
}
