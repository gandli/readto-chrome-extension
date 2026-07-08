# 安全策略 · readto Chrome 扩展

## 支持的版本

只有 `main` 分支上的**最新发布版本**接受安全修复。

## 报告漏洞

**请勿在公开 issue 中提交安全问题。**

- **首选**：通过 GitHub 私有漏洞报告
  ([Security → Report a vulnerability](https://github.com/gandli/readto-chrome-extension/security/advisories/new))
- **备用**：通过邮件联系仓库所有者 `@gandli`

请在报告中包含：

1. 影响的组件（Options 页 / Service Worker / Content Script / LLM 集成 / TTS）
2. 复现步骤（浏览器版本 + Chrome 扩展开发者模式截图）
3. 漏洞类别（XSS / CSP 绕过 / 数据泄露 / 权限提升 / 供应链）
4. 期望的披露时间线

## 响应时间

- **确认收到**：72 小时内
- **初步评估**：7 天内
- **修复补丁 + 协调披露**：根据严重性 30–90 天

## 项目安全承诺

- ✅ MV3 CSP 硬化：`script-src 'self'; object-src 'self'; base-uri 'self';`
- ✅ 无 `<all_urls>` `host_permissions`；LLM 端点访问需用户显式授权
- ✅ Service Worker 端 zod 校验 + 错误消息脱敏
- ✅ 无远程代码执行；所有依赖打包本地
- ✅ 每 PR 三方审计（GitGuardian 秘密扫描 · CodeRabbit · Gemini Review）

## 已知不敏感项

`src/lib/edge-tts.ts` 中的 `EDGE_TRUST_TOKEN` 是 Microsoft Edge 公开的
TrustedClientToken，**不是秘密**，扫描器可能误报。参见文件内注释。
