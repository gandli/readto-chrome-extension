/**
 * YouTube MAIN world script — runs in the page's JS context.
 *
 * Intercepts YouTube's caption track fetch responses and forwards
 * parsed subtitle lines to the ISOLATED world content script via
 * custom DOM events.
 */

import { READTO_TRACKS, READTO_EVENT } from '../lib/types';

// ─── Caption Parsing ───────────────────────────────────────────────

interface RawCaptionEvent {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Array<{ utf8?: string; tOffsetMs?: number }>;
  aAppend?: number;
}

interface RawTranscriptSegment {
  transcriptSegmentRenderer?: {
    startMs?: string;
    endMs?: string;
    snippet?: { runs?: Array<{ text?: string }> };
  };
}

interface CaptionLine {
  start: number; // seconds
  end: number;
  text: string;
}

const GAP_THRESHOLD_MS = 1500;
const MAX_WORDS_PER_GROUP = 18;
const SENTENCE_END = /[.?!。？！]/;

/** Detect ASR-style caption events (auto-generated captions) */
function isAsrEvents(events: RawCaptionEvent[]): boolean {
  const sample = Math.min(events.length, 50);
  for (let i = 0; i < sample; i++) {
    if (events[i]?.aAppend === 1) return true;
  }
  return false;
}

/** Flatten ASR segments into individual text tokens with timestamps */
function flattenAsrSegments(events: RawCaptionEvent[]): Array<{ text: string; tMs: number }> {
  const result: Array<{ text: string; tMs: number }> = [];
  for (const event of events) {
    if (!Array.isArray(event?.segs) || event.segs.length === 0) continue;
    const baseMs = Number(event.tStartMs ?? 0);
    if (!Number.isFinite(baseMs)) continue;
    for (const seg of event.segs) {
      if (typeof seg?.utf8 !== 'string' || seg.utf8.length === 0) continue;
      const text = seg.utf8.replace(/\n+/g, ' ');
      const offset = Number(seg.tOffsetMs ?? 0);
      const tMs = baseMs + (Number.isFinite(offset) ? offset : 0);
      result.push({ text, tMs });
    }
  }
  return result;
}

/** Group ASR tokens into sentence-like lines */
function parseAsrEvents(events: RawCaptionEvent[]): CaptionLine[] {
  const tokens = flattenAsrSegments(events);
  if (tokens.length === 0) return [];

  const lines: CaptionLine[] = [];
  let buffer: Array<{ text: string; tMs: number }> = [];

  const isWordChar = (ch: string) => /[A-Za-z0-9À-ɏ]/.test(ch);

  const flush = (endMs: number) => {
    if (buffer.length === 0) return;
    const text = buffer.map((t) => t.text).join('').replace(/\s+/g, ' ').trim();
    if (text) {
      lines.push({
        start: buffer[0].tMs / 1000,
        end: Math.max(buffer[0].tMs, endMs) / 1000,
        text,
      });
    }
    buffer = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prev = buffer[buffer.length - 1];
    const gap = prev ? token.tMs - prev.tMs : 0;

    // Flush on large time gap
    if (prev && gap > GAP_THRESHOLD_MS) {
      flush(prev.tMs);
    }

    buffer.push(token);

    // Count alphabetic tokens in buffer
    const wordCount = buffer.reduce((sum, t) => sum + (isWordChar(t.text) ? 1 : 0), 0);

    // Flush on sentence end or max words
    if (SENTENCE_END.test(token.text) || wordCount >= MAX_WORDS_PER_GROUP) {
      const next = tokens[i + 1];
      const endMs = next ? next.tMs : token.tMs + 500;
      flush(endMs);
    }
  }

  if (buffer.length > 0) {
    flush(buffer[buffer.length - 1].tMs + 500);
  }

  return lines;
}

/** Parse non-ASR caption events (manual captions with full lines) */
function parseTimedCaptionEvents(events: RawCaptionEvent[]): CaptionLine[] {
  return events
    .map((e) => ({
      start: (e.tStartMs ?? 0) / 1000,
      end: ((e.tStartMs ?? 0) + (e.dDurationMs ?? 0)) / 1000,
      text: Array.isArray(e.segs) ? e.segs.map((s) => s.utf8 ?? '').join('') : '',
    }))
    .filter((l) => l.text.trim().length > 0);
}

/** Parse transcript panel format (actions → transcriptSegmentRenderer) */
function parseTranscriptPanel(data: unknown): CaptionLine[] {
  const segments: RawTranscriptSegment[] =
    (data as any)?.actions?.[0]?.updateEngagementPanelAction?.content
      ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body
      ?.transcriptSegmentListRenderer?.initialSegments ?? [];

  if (!Array.isArray(segments) || segments.length === 0) return [];

  return segments
    .map((seg) => {
      const r = seg.transcriptSegmentRenderer;
      const startMs = Number(r?.startMs ?? 0);
      const endMs = Number(r?.endMs ?? startMs);
      const text = (r?.snippet?.runs ?? []).map((run) => run.text ?? '').join('');
      return { start: startMs / 1000, end: endMs / 1000, text };
    })
    .filter((l) => l.text.trim().length > 0);
}

/** Parse timed text JSON (main entry point) */
function parseTimedTextJson(data: unknown): CaptionLine[] {
  if (!data || typeof data !== 'object') return [];

  const events = (data as any).events as RawCaptionEvent[] | undefined;
  if (Array.isArray(events) && events.length > 0) {
    return isAsrEvents(events) ? parseAsrEvents(events) : parseTimedCaptionEvents(events);
  }

  // Try transcript panel format
  const panelLines = parseTranscriptPanel(data);
  if (panelLines.length > 0) return panelLines;

  return [];
}

/** Parse timed text XML (TTML/SRT-like format) */
function parseTimedTextXml(xmlString: string): CaptionLine[] {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
  const textElements = Array.from(doc.getElementsByTagName('text'));

  return textElements
    .map((el) => {
      const start = parseFloat(el.getAttribute('start') ?? '0');
      const dur = parseFloat(el.getAttribute('dur') ?? '0');
      const text = el.textContent ?? '';
      return { start, end: start + dur, text };
    })
    .filter((l) => l.text.trim().length > 0);
}

// ─── Caption Interception ──────────────────────────────────────────

let _videoId: string | null = null;

function getVideoId(): string | null {
  const match = location.search.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

function dispatchLines(lines: CaptionLine[]): void {
  const vid = getVideoId();
  if (!vid || lines.length === 0) return;

    _videoId = vid;

  const event = new CustomEvent(READTO_EVENT, {
    detail: {
      token: READTO_TRACKS,
      videoId: vid,
      lines,
    },
  });
  document.dispatchEvent(event);
}

/** Try to parse response body as JSON or XML and dispatch lines */
function tryParseAndDispatch(body: string): boolean {
  // Try JSON
  try {
    const data = JSON.parse(body);
    const lines = parseTimedTextJson(data);
    if (lines.length > 0) {
      dispatchLines(lines);
      return true;
    }
  } catch {
    // Not JSON
  }

  // Try XML
  if (body.trim().startsWith('<')) {
    const lines = parseTimedTextXml(body);
    if (lines.length > 0) {
      dispatchLines(lines);
      return true;
    }
  }

  return false;
}

// ─── fetch/XMLHttpRequest Interception ──────────────────────────────

function interceptFetch(): void {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request)?.url;

    if (url && /timedtext|caption/i.test(url)) {
      try {
        const clone = response.clone();
        const text = await clone.text();
        tryParseAndDispatch(text);
      } catch {
        // Ignore parse errors
      }
    }

    return response;
  };
}

function interceptXHR(): void {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: [boolean?, (string | null)?, (string | null)?]) {
    (this as any)._readto_url = typeof url === 'string' ? url : url.href;
    return (originalOpen as any).call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener('load', () => {
      const url = (this as any)._readto_url as string | undefined;
      if (url && /timedtext|caption/i.test(url)) {
        try {
          tryParseAndDispatch(this.responseText);
        } catch {
          // Ignore
        }
      }
    });
    return originalSend.call(this, body);
  };
}

// ─── Initialize ────────────────────────────────────────────────────

interceptFetch();
interceptXHR();
