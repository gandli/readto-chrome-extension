/**
 * LLM config validation and defaults.
 *
 * Audit v5 P1-C: Extracted from App.tsx as part of the SRP breakup —
 * these pure functions are easier to test in isolation and shared between
 * useSettings hook and the connectivity-test handler in App.tsx.
 */
import type { CefrLevel, LlmConfig } from '../lib/types';
import { hasQueryParams, chatCompletionsUrl as _chatCompletionsUrl } from '../lib/llm-url';
import { isLocalhost } from '../lib/storage';

export const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_MODEL = 'gpt-4o-mini';

export const SAVE_DEBOUNCE_MS = 200;
export const LLM_SAVE_DEBOUNCE_MS = 500;

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/** Check if an LLM config is "valid enough" to actually use for translations. */
export function isLlmConfigValid(llm: LlmConfig | null): boolean {
  if (!llm || !llm.endpoint || !llm.model || hasQueryParams(llm.endpoint)) return false;
  if (isLocalhost(llm.endpoint)) return true;
  return /^https:\/\//i.test(llm.endpoint) ? !!llm.apiKey : false;
}

/** Return true when config has been fully cleared (all three fields empty). */
export function isConfigEmpty(cfg: { endpoint: string; apiKey: string; model: string }): boolean {
  return !cfg.endpoint && !cfg.apiKey && !cfg.model;
}

/**
 * Validate LLM config for user-facing save operations.
 * Returns Chinese error message or null when config is acceptable.
 *
 * Note: local mode + empty config are both "no-op OK" (return null),
 * because the user may be clearing the config or hasn't set anything yet.
 */
export function validateLlmConfig(cfg: {
  level: CefrLevel;
  mode: string;
  endpoint: string;
  apiKey: string;
  model: string;
}): string | null {
  if (cfg.mode === 'local' || isConfigEmpty(cfg)) return null;
  // Defensive: fields may be undefined when storage read returns a partial
  // record (e.g. legacy install missing new keys). Coerce to '' before use.
  const endpoint = cfg.endpoint || '';
  const apiKey = cfg.apiKey || '';
  const model = cfg.model || '';
  if (!/^https?:\/\//i.test(endpoint)) return '接口地址要以 http:// 或 https:// 开头';
  if (!/^https:\/\//i.test(endpoint) && !isLocalhost(endpoint))
    return '非本机地址必须用 https://，否则 API key 会明文传输';
  if (!isLocalhost(endpoint) && apiKey.length < 8) return 'API key 太短';
  if (!model) return '模型不能为空';
  if (hasQueryParams(endpoint)) return '接口地址不能带 ?查询参数（运行时会被丢弃）';
  return null;
}
