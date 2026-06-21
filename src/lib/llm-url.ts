/**
 * URL helpers for LLM API endpoints.
 * Normalizes endpoint URLs and constructs chat completions paths.
 */

/** Strip trailing slashes and /chat/completions from a URL path */
function stripPath(path: string): string {
  return path.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
}

/** Normalize a base URL: strip trailing slashes and /chat/completions */
export function baseUrlFromEndpoint(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = stripPath(parsed.pathname);
    return parsed.origin + parsed.pathname;
  } catch {
    return stripPath(url.replace(/\/+$/, ''));
  }
}

/** Append /chat/completions to a base endpoint URL */
export function chatCompletionsUrl(endpoint: string): string {
  return baseUrlFromEndpoint(endpoint) + '/chat/completions';
}

/** Check if a URL contains query parameters */
export function hasQueryParams(url: string): boolean {
  try {
    return new URL(url).search.length > 0;
  } catch {
    return /[?]/.test(url);
  }
}
