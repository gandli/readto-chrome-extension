/**
 * Host permission management for LLM endpoints.
 *
 * Chrome Web Store审核约束：`<all_urls>` host_permissions 会触发人工审核 +
 * 强权限警告。我们改用 `optional_host_permissions`，用户在保存 LLM 配置时
 * 显式授权目标域名，最小化权限暴露。
 *
 * Content scripts 仍在 http/https 页面自动运行（这是 readto 的核心 UX），
 * 但对外发送请求的域名（LLM endpoint）走按需授权。
 *
 * 本地开发服务器（localhost / 127.0.0.1）短路，不触发浏览器权限弹窗 —
 * MV3 已经允许 http://localhost/* fetch 而不需要 host permission。
 */

/**
 * 将 endpoint URL 归一为 Chrome match pattern（origin 级别）。
 * @returns 形如 `https://api.example.com/*`；无效输入返回 `null`。
 */
export function endpointOriginPattern(endpoint: string): string | null {
  if (!endpoint) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.protocol}//${url.hostname.toLowerCase()}/*`;
  } catch {
    return null;
  }
}

function isLocalhostEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const h = url.hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  } catch {
    return false;
  }
}

/**
 * Check whether the extension already holds host permission for `endpoint`.
 * Localhost short-circuits to `true`.
 */
export async function hasHostPermission(endpoint: string): Promise<boolean> {
  const pattern = endpointOriginPattern(endpoint);
  if (!pattern) return false;
  if (isLocalhostEndpoint(endpoint)) return true;
  try {
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch {
    return false;
  }
}

/**
 * Prompt the user to grant host permission for `endpoint`.
 * MUST be called from a user gesture (button click) or Chrome rejects it.
 * @returns Whether permission was granted.
 */
export async function requestHostPermission(endpoint: string): Promise<boolean> {
  const pattern = endpointOriginPattern(endpoint);
  if (!pattern) return false;
  if (isLocalhostEndpoint(endpoint)) return true;
  try {
    return await chrome.permissions.request({ origins: [pattern] });
  } catch {
    return false;
  }
}
