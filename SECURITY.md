# Security Policy

## Supported Versions

我们对最新的 `main` 分支和最近一次发布提供安全更新。

| Version | Supported |
| ------- | :-------: |
| main (unreleased) | ✅ |
| 0.3.x | ✅ |
| < 0.3 | ❌ |

## Reporting a Vulnerability

**请不要通过 public GitHub issue 报告安全漏洞。**

### 推荐渠道

通过 GitHub Security Advisory 私密报告：
- <https://github.com/gandli/readto-chrome-extension/security/advisories/new>

或者发送邮件到项目维护者（GitHub profile 上的联系方式）。

### 报告应包含

- 漏洞类型（XSS / 权限泄漏 / 供应链 / 敏感信息泄漏 / 其他）
- 触发路径（复现步骤或最小 PoC）
- 影响范围（哪个 permissions / content script / 用户数据可能被影响）
- 你希望署名的方式（可选）

### 响应时间

| 阶段 | 目标响应时间 |
|------|:-----------:|
| 首次确认收到 | 72 小时内 |
| 初步分析 | 7 天内 |
| 修复计划或减缓措施 | 14 天内 |
| 修复发布 | 视严重程度 30-90 天 |

### 已知不适用的报告类型

- Chrome Web Store 政策要求扩展声明 `http://*/*` + `https://*/*` 匹配（沉浸式翻译类扩展的固有属性，不构成漏洞）
- 外部依赖的 CVE（请报告到上游）
- 需要用户主动配置远端 LLM 服务后才能触发的 API 泄漏（本扩展默认不发送任何数据）

## 安全承诺

- 用户 API key 仅存储在 `chrome.storage.local` / `chrome.storage.sync`，不上传第三方服务器
- 所有错误消息经 `sanitizeSecrets` 脱敏后再展示 / 上报
- Manifest 使用 `optional_host_permissions`，避免 `<all_urls>` 强制审核
- CSP 严格：`script-src 'self'; object-src 'self'; base-uri 'self';`

## Hall of Fame

感谢发现并私密报告漏洞的研究员——名单将在此列出（经报告者同意）。
