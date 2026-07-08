# 审计白皮书 · readto-chrome-extension

**审计日期**：2026-07-08
**审计模式**：`full`（全维度）
**HEAD commit**：`1be5c85`（`main` 分支，PR #3 已合并）
**审计范围**：`src/`、`tests/`、`manifest.json`、`vite.config.ts`、`package.json`、`.github/`
**方法**：静态分析 + tsc + vitest --coverage + npm outdated + 手动模式扫描（Chrome MV3 pattern reference）

---

## 📊 综合评分

| 指标 | 分数 |
|---|---|
| **综合评分** | **72 / 100** — Grade **C**（可用但阻断上架） |
| **技术债估算** | **~18–24 人时**（P0 修复 6h · P1 修复 10h · P2 打磨 8h） |
| **推荐 Gate** | 阻断上架：4 项 P0 未清 → 上架前必须清 P0 |

### 维度得分（0.0–10.0，越高越好）

| 维度 | 得分 | 关键论据 |
|---|---|---|
| Architecture | 6.5 | 分层清晰但 `level-filter.ts`(774) / `options/App.tsx`(1166) 两个 God-Object |
| Security | 6.0 | 已修 P0×3（PR #3），但 optionalDependencies 陷阱 + Edge TTS 静态 token 未处理 |
| Stability | 5.5 | `tsc` 存在 5 个 baseline error（`unknown` → `WordDetail` 强转）未修 |
| Performance | 7.5 | 字典缓存无 LRU 但项目场景可控；批量翻译流合理 |
| Testability | 7.0 | 492 测试 · 覆盖率 64.14%；`selection-tooltip.ts` 0% + `edge-tts.ts` 37% 是黑洞 |
| Maintainability | 6.0 | 无 ESLint / Prettier / EditorConfig；CI 只有 changelog；两个 1000+ loc 巨文件 |
| Release Readiness | 7.5 | manifest 硬化到位 · `minimum_chrome_version` 有 · 但无 build QA gate |

---

## 🎯 Top 风险速览（TL;DR 表）

| # | 严重性 | 维度 | 摘要 | 文件:行 | 工时 |
|---|---|---|---|---|---|
| P0-1 | 🔴 阻断 | 供应链 | `ai` + `@ai-sdk/openai` 被误标为 `optionalDependencies`，npm install --production 会跳过，翻译功能静默失效 | `package.json:26-29` | 15m |
| P0-2 | 🔴 阻断 | 类型安全 | `service-worker.ts` 中 `Map<string, unknown>` 强扔给 `Map<string, WordDetail>`，Chrome 缓存漂移时静默返回 undefined | `src/background/service-worker.ts:50,58,59` | 30m |
| P0-3 | 🔴 阻断 | 类型安全 | `level-filter.ts` 访问 `war.resources`，但 `war` 联合类型可能是 string → 运行时崩溃 | `src/lib/level-filter.ts:342` | 20m |
| P0-4 | 🔴 阻断 | 类型安全 | `options/App.tsx` 传入 `level` 到 config 但类型未声明该字段 → 保存被吞 | `src/options/App.tsx:110` | 15m |
| P1-1 | 🟡 严重 | 测试 | `selection-tooltip.ts`（427 loc 核心 UX）**0% 覆盖** | `src/lib/selection-tooltip.ts:19-421` | 3h |
| P1-2 | 🟡 严重 | 测试 | `edge-tts.ts` 37% 覆盖，SSML 生成 + WebSocket 帧解析未测 | `src/lib/edge-tts.ts:181-217` | 2h |
| P1-3 | 🟡 严重 | 架构 | `level-filter.ts`（774 loc）God-Object：CEFR 表 / 过滤 / 站点规则 / Shadow DOM / 分词混杂 | `src/lib/level-filter.ts:*` | 4h |
| P1-4 | 🟡 严重 | 架构 | `options/App.tsx`（1166 loc）God-Object：settings + LLM 配置 + 站点规则 + 词表 UI 混杂 | `src/options/App.tsx:*` | 4h |
| P1-5 | 🟡 严重 | CI/CD | 无 `tsc` / `test` / `build` gate；`.github/workflows/` 只有 changelog | `.github/workflows/` | 30m |
| P1-6 | 🟡 严重 | 工具链 | 无 ESLint / Prettier / EditorConfig；无一致性守门 | `(缺失)` | 45m |
| P1-7 | 🟡 严重 | 供应链 | `ai` 6.x → 7.x（major 落后 1 版）；lucide-react / sonner / vitest 落后 major | `package.json` | 2h |
| P2-1 | 🟢 优化 | 覆盖率 | `level-filter.ts` 55% · `pronunciation.ts` 75% 需补测 | `src/lib/*.ts` | 3h |
| P2-2 | 🟢 优化 | 文档 | 无 SECURITY.md · CONTRIBUTING.md · CODEOWNERS · dependabot.yml · issue/PR template | `.github/` | 1h |
| P2-3 | 🟢 优化 | 代码质量 | Edge TTS `EDGE_TRUST_TOKEN` 明文常量会被静态扫描误报，缺注释说明 | `src/lib/edge-tts.ts` | 5m |
| P2-4 | 🟢 优化 | 代码质量 | `types.ts` 0% 覆盖（type-only 文件，为噪音）→ `coverage.exclude` 加白名单 | `vite.config.ts` | 5m |
| P2-5 | 🟢 优化 | Manifest | manifest 中残留 `update_url` 字段（WXT 生成物） | `manifest.json:1` | 2m |

---

## 🔴 P0 · 阻断项详解

### P0-1 · `ai` 与 `@ai-sdk/openai` 错标为 optionalDependencies

**文件**：`package.json:24-27`

```json
"optionalDependencies": {
  "@ai-sdk/openai": "^3.0.74",
  "ai": "^6.0.209"
},
```

**问题**：
1. `ai` 与 `@ai-sdk/openai` 是 LLM 翻译模式的**核心运行时依赖**（`src/lib/llm-stream.ts:8-9` 顶层 import）
2. `npm ci --production` / `npm install --omit=optional` 会跳过它们，构建产物看似正常但**运行时 `import 'ai'` 抛错**
3. Chrome Web Store 打包用户如果按最佳实践跳过 optional，扩展装上后 LLM 模式直接崩

**现实失败场景**：CI 用 `npm ci --omit=optional` 优化构建时间 → build ok → 用户装扩展 → 切到 LLM 翻译 → 一片红。

**最小修复**：把两个包移入 `dependencies`。

**回归测试**：`package-lock.json` 中 `ai` 与 `@ai-sdk/openai` 出现在顶层 `packages[""].dependencies`，不在 `optionalDependencies`。

**工时**：15 分钟

---

### P0-2 · `service-worker.ts` 三处 `Map<string, unknown>` 强扔

**文件**：`src/background/service-worker.ts:50,58,59`

```
error TS2345: Argument of type 'Map<string, unknown>' is not assignable to parameter of type 'Map<string, WordDetail>'.
error TS2345: Argument of type 'Promise<Map<string, unknown>>' is not assignable to parameter of type 'Promise<Map<string, WordDetail>>'.
error TS2322: Type 'Map<string, unknown>' is not assignable to type 'Map<string, WordDetail>'.
```

**问题**：Chrome storage 反序列化返回 `unknown`，代码假装它就是 `WordDetail` 直接下发。字典结构一旦上游改动，运行时 `word.zh` 就是 `undefined`，用户看到空 tooltip 却没有任何 error surface。

**最小修复**：加 `parseWordDetail(raw: unknown): WordDetail | null` 校验函数（zod 已经在 deps 中，直接用 schema.parse）。加载时逐条校验并丢弃坏数据。

**回归测试**：`tests/service-worker.test.ts` 加 `it('drops malformed dict entries')`：storage 灌入 `{"apple": {"zh": 123}}` → 加载后 map 里没有 apple。

**工时**：30 分钟

---

### P0-3 · `level-filter.ts:342` war.resources 联合类型未收窄

**文件**：`src/lib/level-filter.ts:342`

```
error TS2339: Property 'resources' does not exist on type 'string | { resources: string[]; matches: string[]; }'.
```

**问题**：`web_accessible_resources` 在 MV3 支持两种形式（字符串数组 or 对象数组）。代码直接 `war.resources.some(...)`，当 war 是 string 时**运行时 crash**（`undefined.some`）。

**最小修复**：加类型守卫 `typeof war === 'string' ? [war] : war.resources`。

**回归测试**：`tests/level-filter.test.ts` 加两个用例，分别传 string 和 object 形式的 war。

**工时**：20 分钟

---

### P0-4 · `options/App.tsx:110` config 类型缺 `level` 字段

**文件**：`src/options/App.tsx:110`

```
error TS2353: Object literal may only specify known properties, and 'level' does not exist in type '{ translationMode: "local" | "llm"; llm?: unknown; }'.
```

**问题**：UI 把用户选的 CEFR level 存到 config，但 `types.ts` 的 config 类型没有 `level` 字段。TypeScript 报错被忽略，运行时 `chrome.storage.sync.set` 写入的 level 在**下次读取时可能被别处的 spread 覆盖丢失**。

**最小修复**：在 `src/lib/types.ts` 补 `level: CEFRLevel;` 到 config 类型。

**工时**：15 分钟

---

## 🟡 P1 · 严重项详解

### P1-1 · `selection-tooltip.ts` 427 行 0% 覆盖
**文件**：`src/lib/selection-tooltip.ts:19-421` · **失败场景**：选词工具（核心 UX）任何回归无守门。 · **修复**：jsdom 环境下补 CSS 注入 / 定位 / click-outside / Escape / Shadow DOM 边界检测五个用例。 · **工时**：3h

### P1-2 · `edge-tts.ts` 37% 覆盖，SSML/WebSocket 帧未测
**文件**：`src/lib/edge-tts.ts:181-217` · **失败场景**：Edge TTS 官方帧协议或 SSML 转义变更时无守门。 · **修复**：mock WebSocket，测帧 boundary + SSML 特殊字符转义。 · **工时**：2h

### P1-3 · `level-filter.ts` 774 loc God-Object（Phase 2）
**文件**：`src/lib/level-filter.ts` · **失败场景**：CEFR 表 / 站点规则 / 分词 / Shadow DOM 混杂 → 无法针对性测试。 · **修复**：拆为 5 个子模块（chrome-extension-audit-patterns.md 已有拆分建议）。 · **工时**：4h（Phase 2）

### P1-4 · `options/App.tsx` 1166 loc God-Object（Phase 2）
**文件**：`src/options/App.tsx` · **修复**：拆为 tabs 组件树。 · **工时**：4h（Phase 2）

### P1-5 · 无 CI 质量门禁
**文件**：`.github/workflows/`（只有 changelog.yml） · **失败场景**：破坏 tsc / build 的 commit 直接进 main（PR #3 仅靠 GitGuardian / CodeRabbit / Gemini 三方 bot 兜底）。 · **修复**：新增 `.github/workflows/ci.yml`：checkout → setup-node → npm ci → tsc → vitest --coverage → npm run build。 · **工时**：30m

### P1-6 · 无 ESLint / Prettier / EditorConfig
**失败场景**：no-floating-promises / no-explicit-any / import 顺序等长期漂移。 · **修复**：加 `eslint.config.js` + `.prettierrc` + `.editorconfig`。 · **工时**：45m

### P1-7 · 依赖 major 版本落后
**文件**：`package.json` · **修复**：本轮只升 patch（vitest 4.1.10 · playwright 1.61.1 · @tailwindcss 4.3.2）；major（ai 7 / react 19 / vite 8）defer 到 Phase 2。 · **工时**：30m

---

## 🟢 P2 · 优化项详解

- **P2-1 覆盖率补齐（Phase 2）**：`level-filter.ts` 55%→85% · `pronunciation.ts` 75%→85% · `edge-tts.ts` 37%→60%。
- **P2-2 治理文档**：加 SECURITY / CODEOWNERS / dependabot / PR template（本次 PR 已交付）。CONTRIBUTING.md 归入 Phase 2 follow-up，可与代码风格 sweep 一并落。
- **P2-3 Edge TTS token 注释**：`EDGE_TRUST_TOKEN` 上加块注释说明"公开服务 token，非机密"。
- **P2-4 types.ts 覆盖噪音**：`vite.config.ts` `test.coverage.exclude` 加 `src/lib/types.ts`。
- **P2-5 移除 update_url**：`manifestPatchPlugin.closeBundle` 里 `delete manifest.update_url`。

---

## 📈 覆盖率矩阵（现状）

| 文件 | Stmts % | Branches % | 目标 % | 状态 |
|---|---|---|---|---|
| `service-worker.ts` | 98.47 | 96 | 90 | ✅ |
| `error-sanitize.ts` | 95.45 | 100 | 90 | ✅ |
| `inline-renderer.ts` | 96.49 | 90.32 | 85 | ✅ |
| `level-data.ts` | 100 | 100 | — | ✅ |
| `llm-stream.ts` | 98.43 | 91.66 | 85 | ✅ |
| `llm-url.ts` | 100 | 100 | — | ✅ |
| `permissions.ts` | 87.09 | 95 | 85 | ✅ |
| `storage.ts` | 94.52 | 98.52 | 85 | ✅ |
| `translations.ts` | 97.43 | 90 | 85 | ✅ |
| `stream-preview.ts` | 100 | 100 | — | ✅ |
| **`edge-tts.ts`** | **37.71** | **20.51** | 60 | ❌ P1-2 |
| **`level-filter.ts`** | **55.19** | **59.31** | 80 | ❌ P2-1 |
| **`pronunciation.ts`** | **75.59** | **73.23** | 85 | ❌ P2-1 |
| **`selection-tooltip.ts`** | **0** | **0** | 60 | ❌ P1-1 |
| **`types.ts`** | **0** | 100 | — | ⚠️ P2-4（豁免） |

**总体**：**64.14%** stmts → 本轮目标 ≥64.14%（不降）；Phase 2 目标 ≥75%

---

## 🛠️ 修复计划（本轮 Phase 1）

**范围**：P0×4 + P1-5 + P1-6 + P1-7(patch) + P2-3/4/5 · **延后**：P1-1/P1-2/P1-3/P1-4（大量测试+架构拆分） → Phase 2

**执行顺序**：
1. P0-1 → package.json 挪包
2. P0-2 → `parseWordDetail` + zod schema
3. P0-3 → war 类型守卫
4. P0-4 → types.ts 补 `level`
5. P1-5 → `.github/workflows/ci.yml`
6. P1-6 → ESLint + Prettier + EditorConfig
7. P1-7 → patch 升级
8. P2-3/4/5 → 打磨

**验收标准**：
- `npx tsc --noEmit` → **0 errors**（从 baseline 5 归零）
- `npx vitest run` → 全绿 ≥ 492
- 覆盖率 ≥ 64.14%
- `npm run build` 通过
- 重新审计综合评分 ≥ 85

---
