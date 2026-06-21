/**
 * Bilibili MAIN world script — intercepts subtitle API responses.
 *
 * Intercepts:
 * 1. /x/player/wbi/v2 response → extract subtitle URL
 * 2. Subtitle JSON response → parse and dispatch lines
 *
 * Subtitle JSON format: { "body": [{ "from": 0.0, "to": 1.0, "content": "text" }] }
 */

import { READTO_TRACKS, READTO_EVENT } from '../lib/types';
import type { TranscriptLine } from '../lib/types';

// ─── Subtitle Parsing ─────────────────────────────────────────────

interface BilibiliSubtitleSegment {
  from: number;
  to: number;
  content: string;
}

interface BilibiliSubtitleJson {
  body?: BilibiliSubtitleSegment[];
}

function parseSubtitleJson(data: unknown): TranscriptLine[] {
  if (!data || typeof data !== 'object') return [];
  const body = (data as BilibiliSubtitleJson).body;
  if (!Array.isArray(body) || body.length === 0) return [];

  return body
    .filter((seg) => typeof seg?.content === 'string' && seg.content.trim().length > 0)
    .map((seg) => ({
      start: seg.from,
      end: seg.to,
      text: seg.content.trim(),
    }));
}

// ─── Video ID Extraction ──────────────────────────────────────────

function getBvid(): string | null {
  const match = location.pathname.match(/\/video\/(BV\w+)/);
  return match ? match[1] : null;
}

function getCidFromUrl(): string | null {
  const params = new URLSearchParams(location.search);
  return params.get('cid');
}

// ─── Dispatch ─────────────────────────────────────────────────────

function dispatchLines(lines: TranscriptLine[]): void {
  const bvid = getBvid();
  if (!bvid || lines.length === 0) return;

  document.dispatchEvent(
    new CustomEvent(READTO_EVENT, {
      detail: {
        token: READTO_TRACKS,
        videoId: bvid,
        lines,
      },
    }),
  );
}

// ─── Subtitle URL Extraction ──────────────────────────────────────

/**
 * Extract subtitle URLs from /x/player/wbi/v2 API response.
 * Response structure:
 * {
 *   "data": {
 *     "subtitle": {
 *       "subtitles": [
 *         { "lan": "en", "subtitle_url": "https://..." },
 *         ...
 *       ]
 *     }
 *   }
 * }
 */
function extractSubtitleUrls(data: unknown): string[] {
  try {
    const subtitles = (data as any)?.data?.subtitle?.subtitles;
    if (!Array.isArray(subtitles)) return [];

    return subtitles
      .filter((s: any) => typeof s?.subtitle_url === 'string')
      .map((s: any) => {
        const url = s.subtitle_url as string;
        // Bilibili subtitle URLs may start with // or https:
        return url.startsWith('//') ? `https:${url}` : url;
      });
  } catch {
    return [];
  }
}

/** Pick the best English subtitle URL, or fall back to the first one */
function pickBestSubtitleUrl(urls: string[]): string | null {
  if (urls.length === 0) return null;

  // Prefer English variants
  const enUrl = urls.find(
    (u) => /en[-_]?/i.test(u) || /english/i.test(u),
  );
  return enUrl ?? urls[0];
}

// ─── Fetch Interception ───────────────────────────────────────────

const fetchedSubtitleUrls = new Set<string>();
let pendingPlayerResponse: unknown = null;

function tryFetchSubtitle(url: string): void {
  if (fetchedSubtitleUrls.has(url)) return;
  fetchedSubtitleUrls.add(url);

  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      const lines = parseSubtitleJson(data);
      if (lines.length > 0) {
        dispatchLines(lines);
      }
    })
    .catch(() => {
      fetchedSubtitleUrls.delete(url);
    });
}

function handlePlayerResponse(data: unknown): void {
  const urls = extractSubtitleUrls(data);
  const best = pickBestSubtitleUrl(urls);
  if (best) {
    tryFetchSubtitle(best);
  }
}

function interceptFetch(): void {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url =
      typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof URL
          ? args[0].href
          : (args[0] as Request)?.url;

    if (!url) return response;

    try {
      // Player API response → extract subtitle URL
      if (/\/x\/player\/wbi\/v2/i.test(url) || /\/x\/player\/v2/i.test(url)) {
        const clone = response.clone();
        clone
          .json()
          .then(handlePlayerResponse)
          .catch(() => {});
      }

      // Direct subtitle JSON response
      if (/subtitle.*\.json$/i.test(url) || /aisubtitle/i.test(url)) {
        const clone = response.clone();
        clone
          .json()
          .then((data) => {
            const lines = parseSubtitleJson(data);
            if (lines.length > 0) dispatchLines(lines);
          })
          .catch(() => {});
      }
    } catch {
      // Ignore
    }

    return response;
  };
}

function interceptXHR(): void {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: [boolean?, (string | null)?, (string | null)?]
  ) {
    (this as any)._readto_url = typeof url === 'string' ? url : url.href;
    return (originalOpen as any).call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    this.addEventListener('load', () => {
      const url = (this as any)._readto_url as string | undefined;
      if (!url) return;

      try {
        // Player API
        if (/\/x\/player\/wbi\/v2/i.test(url) || /\/x\/player\/v2/i.test(url)) {
          handlePlayerResponse(JSON.parse(this.responseText));
        }

        // Subtitle JSON
        if (/subtitle.*\.json$/i.test(url) || /aisubtitle/i.test(url)) {
          const lines = parseSubtitleJson(JSON.parse(this.responseText));
          if (lines.length > 0) dispatchLines(lines);
        }
      } catch {
        // Ignore
      }
    });
    return originalSend.call(this, body);
  };
}

// ─── Bilibili SPA Navigation Observer ─────────────────────────────
// Bilibili uses SPA navigation. When the video changes, re-fetch subtitles.

let currentBvid: string | null = null;

function observeNavigation(): void {
  const check = () => {
    const bvid = getBvid();
    if (bvid && bvid !== currentBvid) {
      currentBvid = bvid;
      fetchedSubtitleUrls.clear();
      // Subtitles will be re-fetched when the player API is called
    }
  };

  // Check on URL change (Bilibili uses pushState)
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(check, 500);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(check, 500);
  };

  window.addEventListener('popstate', () => setTimeout(check, 500));

  // Also check periodically (fallback)
  setInterval(check, 2000);
}

// ─── Initialize ───────────────────────────────────────────────────

interceptFetch();
interceptXHR();
observeNavigation();
