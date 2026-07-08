/**
 * Edge TTS — Microsoft Edge's free text-to-speech service.
 *
 * Uses WebSocket to connect to Microsoft's speech synthesis service.
 * No API key required, no rate limits, high quality Neural voices.
 *
 * Protocol:
 *   1. Connect to WSS endpoint with trust token
 *   2. Send speech config
 *   3. Send SSML request
 *   4. Receive audio chunks (binary frames)
 *   5. Combine into audio blob and play
 */

const EDGE_TTS_WSS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
/**
 * P2-3 audit note: this token is **NOT a secret**. It is the public
 * TrustedClientToken value published by Microsoft Edge's read-aloud
 * feature and hard-coded in every Edge TTS client implementation on
 * GitHub. Static-analysis scanners (Gitleaks / GitGuardian / TruffleHog)
 * may flag this hex constant as an entropy-based false positive; the
 * project's PR/security workflow should whitelist this specific value.
 */
const EDGE_TRUST_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_VOICE = 'Microsoft Server Speech Text to Speech Voice (en-US, AriaNeural)';

/** Generate Edge TTS connection URL with required params. */
function buildWssUrl(): string {
  const params = new URLSearchParams({
    TrustedClientToken: EDGE_TRUST_TOKEN,
    ConnectionId: crypto.randomUUID().replace(/-/g, ''),
  });
  return `${EDGE_TTS_WSS}?${params}`;
}

/** Generate unique request ID for message correlation. */
function requestId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** Build the speech config message (sent once after connect). */
function speechConfigMessage(): string {
  const context = {
    synthesis: {
      audio: {
        metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      },
    },
  };
  return `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(context)}`;
}

/** Build the SSML request message. */
function ssmlMessage(text: string, voice: string = EDGE_VOICE): string {
  const id = requestId();
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody rate='-10%' pitch='+0Hz'>${escapeXml(text)}</prosody></voice></speak>`;
  return `X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp()}\r\nPath:ssml\r\n\r\n${ssml}`;
}

/** Escape XML special characters. */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Current timestamp formatted for Edge TTS. */
function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

/** Binary message header size (includes 2 bytes for header length). */
const HEADER_SIZE_OFFSET = 2;

/**
 * Parse an Edge TTS binary response frame.
 * Returns { audio: Uint8Array | null, isTurn: boolean }
 */
function parseBinaryFrame(data: ArrayBuffer): { audio: Uint8Array | null; isTurn: boolean } {
  const view = new DataView(data);
  const headerLen = view.getUint16(0);
  const headerBytes = new Uint8Array(data, HEADER_SIZE_OFFSET, headerLen);
  const header = new TextDecoder().decode(headerBytes);

  // Check for turn.end signal
  if (header.includes('Path:turn.end')) {
    return { audio: null, isTurn: true };
  }

  // Check for audio data
  if (header.includes('Path:audio')) {
    const audioStart = HEADER_SIZE_OFFSET + headerLen;
    const audio = new Uint8Array(data, audioStart);
    return { audio, isTurn: false };
  }

  return { audio: null, isTurn: false };
}

/**
 * Synthesize speech using Edge TTS and return audio as a Blob.
 * Returns null if synthesis fails.
 */
export async function edgeTtsSynthesize(
  text: string,
  signal?: AbortSignal,
): Promise<Blob | null> {
  if (signal?.aborted) return null;

  return new Promise<Blob | null>((resolve) => {
    const chunks: Uint8Array[] = [];
    let ws: WebSocket | null = null;
    let settled = false;
    let connectTimeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
      if (ws) {
        try { ws.close(); } catch {}
        ws = null;
      }
    };

    const settle = (result: Blob | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    // Abort handler
    const onAbort = () => settle(null);
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      ws = new WebSocket(buildWssUrl());
      ws.binaryType = 'arraybuffer';

      // Connection timeout
      connectTimeout = setTimeout(() => settle(null), 8000);

      ws.onopen = () => {
        if (settled) return;
        if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }

        try {
          // Send speech config
          ws!.send(speechConfigMessage());
          // Send SSML request
          ws!.send(ssmlMessage(text));
        } catch {
          settle(null);
        }
      };

      ws.onmessage = (event) => {
        if (settled) return;
        if (event.data instanceof ArrayBuffer) {
          const { audio, isTurn } = parseBinaryFrame(event.data);
          if (audio && audio.length > 0) {
            chunks.push(audio);
          }
          if (isTurn) {
            const blob = new Blob(chunks, { type: 'audio/mpeg' });
            settle(blob);
          }
        }
      };

      ws.onerror = () => settle(null);
      ws.onclose = () => settle(null);
    } catch {
      settle(null);
    }
  });
}

/**
 * Play audio from Edge TTS synthesis.
 * Returns true if playback started successfully.
 */
export async function playEdgeTts(
  text: string,
  signal?: AbortSignal,
): Promise<boolean> {
  if (signal?.aborted) return false;

  const blob = await edgeTtsSynthesize(text, signal);
  if (!blob || blob.size === 0) return false;
  if (signal?.aborted) return false;

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  let aborted = false;

  const onAbort = () => {
    aborted = true;
    try { audio.pause(); } catch {}
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    await audio.play();
  } catch {
    URL.revokeObjectURL(url);
    signal?.removeEventListener('abort', onAbort);
    return false;
  }

  if (aborted || signal?.aborted) {
    URL.revokeObjectURL(url);
    signal?.removeEventListener('abort', onAbort);
    return true;
  }

  try {
    await new Promise<void>((resolve) => {
      audio.addEventListener('ended', () => resolve(), { once: true });
      audio.addEventListener('error', () => resolve(), { once: true });
      signal?.addEventListener('abort', () => resolve(), { once: true });
    });
  } finally {
    URL.revokeObjectURL(url);
    signal?.removeEventListener('abort', onAbort);
  }
  return true;
}
