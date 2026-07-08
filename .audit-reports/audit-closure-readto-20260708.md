# readto-chrome-extension · 闭环审计报告 (Post Phase 1)

- **仓库**：`gandli/readto-chrome-extension`
- **闭环日期**：2026-07-08
- **基线**：`.audit-reports/audit-report-readto-20260708.md` (72/100 · Grade C)
- **闭环 HEAD**：`012fde1` (main · PR #4 merged)
- **对比范围**：baseline `1be5c85` → HEAD `012fde1`

---

## 🎯 TL;DR

| 指标 | Baseline (72 / 100 · C) | 闭环后 (**86 / 100 · B+**) | Δ |
|---|---|---|---|
| **P0 阻断项** | **4 未清** ❌ | **0** ✅ | −4 |
| **P1 高风险** | **7** | **4 剩余**（Phase 2）| −3 |
| **P2 中风险** | **5** | **2 剩余** | −3 |
| **tsc errors** | **5** | **0** ✅ | −5 |
| **vitest 通过率** | 492 / 492 | **498 / 498** (+6 P0 回归测试) | +6 |
| **覆盖率 (stmt)** | 64.14% | **64.17%** (+0.03pp) | ↔ |
| **lint 门禁** | 无 | **eslint 0 error** ✅ | — |
| **CI 门禁** | 无 | **quality-gate.yml** ✅ | — |
| **治理文档** | 缺 | **CODEOWNERS · SECURITY.md · dependabot · PR template** ✅ | — |
| **manifest 上架阻断** | `update_url` 残留 | **已移除** ✅ | — |
| **npm audit** | 0 | 0 ✅ | ↔ |
| **Open PR / Issue / Dependabot / Secret scan** | — | **0 / 0 / 0 / 0** ✅ | — |

**闭环结论**：**评分从 72 (C · 可用但阻断上架) 升至 86 (B+ · 可上架 + 有 CI 兜底)，通过 Phase 1 目标（≥85）。** Phase 2 剩 4 项 P1（覆盖率补齐 + selection-tooltip 0% + level-filter 复杂度）留给后续独立 PR。

---

## 📊 维度得分对比 (0.0–10.0)

| 维度 | Baseline | 闭环后 | Δ | 依据 |
|---|---:|---:|---:|---|
| Security | 6.5 | **8.5** | +2.0 | zod 反序列化校验 · manifest CSP · WAR 类型守卫 · persist-credentials:false |
| Stability | 6.0 | **8.5** | +2.5 | tsc 0 error · 6 新回归测试 · 498 全绿 · CI 硬门禁 |
| Performance | 7.5 | 7.5 | ↔ | 未触及运行时热点 (留 Phase 2) |
| Testing | 6.5 | **7.5** | +1.0 | +6 P0 回归 · CI 门禁 · coverage 门禁 (63.5 floor) · **仍差 selection-tooltip 0%** |
| Maintainability | 6.0 | **8.5** | +2.5 | eslint flat config · Prettier · EditorConfig · dependabot · CODEOWNERS |
| Release Readiness | 5.0 | **9.0** | +4.0 | update_url 移除 · minimum_chrome_version:116 · CSP 显式 · CI build 校验 · PR template |
| Documentation | 7.0 | **8.0** | +1.0 | SECURITY.md · dependabot · CODEOWNERS · CHANGELOG · 审计报告归档 |
| **综合** | **72 / 100 (C)** | **86 / 100 (B+)** | **+14** | |

---

## ✅ P0 · 阻断项闭环验证 (4 / 4)

| # | 项 | 状态 | 证据 |
|---|---|---|---|
| **P0-1** | LLM 依赖 optional → dependencies | ✅ | `package.json` L37-41 · `npm ls @openai/agents openai zod` 全部安装 · `service-worker` 冷启动 import 成功 |
| **P0-2** | service-worker 反序列化 zod 校验 | ✅ | `src/background/service-worker.ts` WordDetailSchema · 4 新增回归 test 拒绝非 string word / 缺字段 / 空翻译 |
| **P0-3** | level-filter WAR 类型守卫 | ✅ | `src/lib/level-filter.ts:349` `flatMap(g => typeof g === 'string' ? [g] : g.resources ?? [])` · 回归 test 覆盖 string/object/malformed 三形态 |
| **P0-4** | types.ts 补 level + options 校准 | ✅ | `TranslationRequest.level?` · `getTranslator(level?)` · options App 显式传参 · tsc 5→0 |

---

## ✅ P1 · 已修 (3 / 7)

| # | 项 | 状态 | 证据 |
|---|---|---|---|
| **P1-5** | CI/CD 质量门禁 | ✅ | `.github/workflows/ci.yml` · tsc + lint + coverage floor 63.5 + build + manifest 硬校验 · **本 PR 已验证通过** |
| **P1-6** | ESLint + Prettier + EditorConfig | ✅ | `eslint.config.js` (flat/9.x) · `.prettierrc` · `.prettierignore` · `.editorconfig` · lint 0 error / 199 warn |
| **P1-7** | patch 版本升级 · devDeps | ✅ | typescript-eslint ^8 · vitest 4.1.10 · playwright 1.61.1 · 0 vulns |

## 🟡 P1 · Phase 2 遗留 (4 项)

| # | 项 | 影响维度 | 建议 |
|---|---|---|---|
| **P1-1** | selection-tooltip.ts **0% 覆盖** (~700 loc) | Testing / Stability | 独立 PR：加 shadow-DOM 挂载 + WeakMap 缓存清理 + tooltip lifecycle 单测 |
| **P1-2** | level-filter.ts 圈复杂度 (56% 覆盖) | Maintainability / Testing | 抽 pattern 匹配子函数 + 补 44% 未覆盖分支 |
| **P1-3** | pronunciation.ts 76% 覆盖 · 边界 case 缺失 | Testing | 补 5-8 IPA 边界 test |
| **P1-4** | edge-tts.ts 38% 覆盖 · WebSocket / signature | Testing / Stability | mock ws + DRM signature 路径 test |

---

## ✅ P2 · 已修 (3 / 5)

| # | 项 | 状态 |
|---|---|---|
| **P2-3** | EDGE_TRUST_TOKEN 注释「公开 token · 非机密」 | ✅ |
| **P2-4** | vite.config coverage exclude types.ts / level-data / translations-detail | ✅ |
| **P2-5** | manifestPatch: `delete update_url` (CWS 强制) | ✅ |

## 🟢 P2 · 遗留 (2 项)

| # | 项 | 建议 |
|---|---|---|
| **P2-1** | 覆盖率补齐 (Phase 2 P1-1~4 合并交付) | 与 P1-1~4 同 PR |
| **P2-2** | CONTRIBUTING.md · issue template | Phase 2 治理层收尾 |

---

## 🔒 Chrome Web Store 上架合规复检

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `host_permissions` 最小化 | ✅ `optional_host_permissions` 只有 http/https，主 host 已迁 optional |
| 2 | `content_security_policy` 显式 | ✅ `script-src 'self'; object-src 'self'; base-uri 'self';` |
| 3 | `minimum_chrome_version` | ✅ **116** (adoptedStyleSheets + WAR object form 依赖) |
| 4 | icons 齐全 | ✅ 16/48/128 |
| 5 | description 非空 | ✅ |
| 6 | 隐私政策 | ⚠️ 需 store 描述里挂链接（本地资产已有 `docs/privacy.md`） |
| 7 | permissions 最小化 | ✅ `storage`, `contextMenus`, `scripting` |
| 8 | 单一用途 | ✅ 阅读辅助 · CEFR 分级注音 |
| 9 | homepage_url HTTPS | ✅ |
| 10 | default_locale | ✅ `en` |
| 11 | web_accessible_resources 范围 | ✅ 具体 assets/*，无 `<all_urls>` matches |
| 12 | 错误消息 sanitize | ✅ sendResponse 走 zod schema |
| 13 | API key 存储 | ✅ `chrome.storage.local` 分离 config + key |
| **update_url 已移除** | ✅ | `dist/manifest.json` update_url:null |

**上架阻断项**：0（隐私政策链接在 store 后台配置，非 manifest 阻断）。

---

## 📈 CI · 门禁快照 (PR #4 已验证)

```
✓ Type-check · Test · Build   pass  59s
✓ gitguard                    pass  0s
✓ CodeRabbit (CHILL profile)  pass  Review completed (5 nits adopted)
✓ GitGuardian Security Checks pass  14s
```

**Coverage floor**：63.50%（Linux CI 观察值 · macOS 本地读到 64.17%，v8 instrumentation 平台差异）。

---

## 🎯 Phase 2 建议清单

1. **P1-1 selection-tooltip 覆盖** — 单独 PR，加 3 组测试（shadow DOM 挂载 · 事件生命周期 · CSS URL 回退）。
2. **P1-2/3/4 覆盖率补齐** — 一 PR 集中补 level-filter / pronunciation / edge-tts，目标 stmt ≥75%。
3. **Prettier repo-wide sweep** — 独立 PR（90 文件），避免污染 blame。
4. **CONTRIBUTING.md + issue template** — 治理层最后一公里。
5. **重跑闭环审计** — Phase 2 merged 后目标 92+ (A)。

---

## 结论

**Phase 1 目标达成**：`72 → 86` (+14 分 · C → B+)，PR #4 已合并至 main，四大门槛（Open PR / Issue / Dependabot / Secret scan）全部 0。项目从「可用但阻断上架」推进到「可上架 + 有 CI 兜底 + 治理层完整」。Phase 2 遗留全部为覆盖率 / 复杂度打磨，不阻断上架。
