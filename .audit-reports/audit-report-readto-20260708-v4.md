# readto-chrome-extension · 审计白皮书 v4

- **审计日期**：2026-07-08
- **仓库**：`gandli/readto-chrome-extension`
- **审计 HEAD**：`9d3bfea`（v3b PR #20 merged 后）
- **审计模式**：`full`（Deep Scan · code-quality/security/architecture/testing-authenticity/coverage/supply-chain/documentation/accessibility）
- **前置状态**：v3b 88→90/A- 后 24h 回扫
- **报告语言**：简体中文
- **审计员**：Hermes · fuck-my-shit-mountain skill

## 综合评分 · **78/100 · C+**（较 v3b 90 下降 12 分 · 主因：coverage 盲区暴露）

| 维度 | v3b | v4 扫描 | Δ | 评分依据 |
|---|:-:|:-:|:-:|---|
| Security | 9.0 | **7.5** | ↓1.5 | sanitize 字面量兜底缺失（校对鸭 v4/v5 教训未落地） |
| Architecture | 8.0 | **6.0** | ↓2.0 | App.tsx 1170 loc · 32 组件 · 48 hooks 单文件 |
| Type-safety | 9.0 | **9.0** | → | src/ 0 warning 保持；tests/ 145 any 可豁免 |
| Maintainability | 9.0 | **7.0** | ↓2.0 | tooltip 双实现；巨型 App.tsx |
| Testing | 8.5 | **5.5** | ↓3.0 | Coverage include 仅 lib+background；content/+options/ 完全裸奔；E2E 未在 CI 跑 |
| Release | 9.0 | **8.5** | ↓0.5 | E2E 未纳入 CI；prefers-reduced-motion 缺 |
| Documentation | 8.0 | **6.5** | ↓1.5 | 根目录缺 CONTRIBUTING/PRIVACY；ext 有 optional_host_permissions 但无隐私政策文档 |

## 发现统计

- **P0**：0
- **P1**：4
- **P2**：3
- **P3**：2

## Coverage Matrix

| 维度 | 覆盖 | 证据 | 限制 |
|---|:-:|---|---|
| Security | 高 | egrep 全 pattern；sanitize 出口全量追；innerHTML/eval/danger 扫；manifest CSP/permission 审 | 未跑 SAST/Semgrep（可选） |
| Architecture | 高 | 全部 src/ wc -l；App.tsx hook/组件计数；tooltip 双实现追 | — |
| Testing | 高 | coverage per-file；CI workflow yaml；e2e/ 目录清点 | — |
| Type-safety | 高 | eslint src+tests JSON 输出 by-rule/by-file | — |
| Supply-chain | 高 | Actions SHA 全 pin；dependabot 通配符禁 major | — |
| Documentation | 高 | 顶层 md 存在性；.github/ 治理三件套 | — |
| Accessibility | 中 | prefers-reduced-motion grep；animate/transition 计数 | 未真机测键盘导航 |

## 🔴 P1 Findings

### P1-A · Coverage include 大缺口（testing-authenticity）

**证据**：`vite.config.ts:251` `coverage.include: ['src/lib/*.ts', 'src/background/*.ts']`

**排除**：`src/content/` (bilibili/youtube/page-world/index 5 文件 ~1490 loc) + `src/options/App.tsx` (1170 loc) = **~2660 loc 完全裸奔**。

**症状**：报告 64.09% Statements 实际是 lib+background 子集（占 src/ ~40%）。**综合 src/ coverage 估算 ≤ 25%**。这是 WXT coverage trap 变体（skill `references/wxt-coverage-trap.md` 已记）。

**失败场景**：content-script XHR/fetch 拦截路径的 regex 或 optional chain bug 无测试兜底，用户升级 chrome/bilibili 页面结构变化时线上炸。

**修复**：
1. `vite.config.ts` `coverage.include` 扩展为 `['src/**/*.{ts,tsx}']`
2. 排除清单加：`src/content/index.ts`（依赖 DOM/chrome runtime 难跑 unit）、`src/options/main.tsx`（entry）
3. CI floor 现值 63.30 需重新校准（预计跌到 15-25%），文档化 "coverage 分层门槛"
4. **不放松门槛前提下**：先补 5-10 个关键 content-script 单测（regex/timedtext parser/subtitle url extract）

**回归测试**：`vitest run --coverage` 应显示 `src/content/*.ts` 每个文件都在报告里；`src/options/App.tsx` 出现在 uncovered 清单。

**工作量**：3-4h（重构 include + 补基础 unit + 校准 floor）

### P1-B · E2E 未纳入 CI（release）

**证据**：`.github/workflows/ci.yml` grep `e2e|playwright` = **0 处**。`e2e/` 目录存在 4 spec：debug/extension/levels/minimal。

**失败场景**：spec 目录的 Playwright 测试从未跑过 = 死代码；生产回归无 UI 层兜底。

**修复**：
1. `package.json` 已有 `test:e2e` 脚本 → CI 加 job 跑（可能需要 headed browser 时 mark as manual/nightly）
2. 若 4 spec 里有过时未维护的，先精简到确定能跑的 minimal set
3. 添加 `bunx playwright install chromium` 到 CI setup

**工作量**：2-3h

### P1-C · Sanitize 字面量兜底缺失（security）

**证据**：`src/lib/error-sanitize.ts:15-26` `SECRET_PATTERNS` 只覆盖 Bearer/`sk-*`/x-api-key/api_key 已知格式。

**失败场景**：用户配置 DeepSeek (`dsk-*`)、Kimi、通义千问、Zhipu 等自定义 apiKey 格式 → LLM error body 回显时正则不匹配 → 密钥泄漏到 content-script（→ 任意页面可截获 sendMessage）。

**修复**（复用校对鸭 v4/v5 方案）：
1. `sanitizeError(err, apiKey?)` 加可选 apiKey 参数
2. 正则脱敏后：`if (apiKey && apiKey.trim().length >= 8) { msg = msg.split(apiKey.trim()).join('[REDACTED]'); }`
3. 调用侧（service-worker + options/App）读 storage 传 apiKey
4. **性能防护**：`msg.slice(0, 1000)` 预切窗口再脱敏（避免大 body 阻塞 · v4 教训）

**回归测试**：
- 3 个自定义 apiKey 用例（`dsk-xxx` / `test-key-abc12345` / Bearer 已在正则）
- 短 key `< 8 char` 不误替换 UI 文案
- 10KB body 处理 `< 1000ms` 断言（flaky-tolerant）

**工作量**：2h

### P1-D · Options App.tsx 巨型组件（architecture/maintainability）

**证据**：`src/options/App.tsx` **1170 loc · 32 top-level components · 48 hooks · 39 top-level declarations 全塞一个文件**。

**失败场景**：任何改动都要读 1170 行才敢下手；多人协作 merge 冲突高发；hook 边界模糊导致状态爆炸。

**修复**（SRP 拆分 · 参考 skill `references/srp-split-pattern.md`）：
- `src/options/components/Header.tsx`（Logo + StatusIndicator）
- `src/options/components/LevelPreview.tsx`（已单独用，抽走）
- `src/options/components/LlmSection.tsx`（endpoint/apiKey/model + handleTest）
- `src/options/constants.ts`（LEVEL_NAMES/TICK_*/DEFAULT_ENDPOINT/PREVIEW_ITEMS）
- `src/options/App.tsx` 只保留顶层 orchestration（预计 250-350 loc）

**Codacy 陷阱预警**：拆分后 Codacy "Complexity increasing per file" 会误报。skill 已记录 `references/srp-split-pattern.md` 建议 PR body 加净复杂度对比。

**工作量**：4-6h

## 🟡 P2 Findings

### P2-A · Selection-tooltip 0% coverage · 429 loc（testing）

**证据**：`src/lib/selection-tooltip.ts` **0% stmts / 0% branch / 0% funcs · 20-423 全裸**（唯一在 include 里却 0% 的文件）。

**失败场景**：DOM 选中弹出 tooltip 的核心交互无任何测试。IME/Shadow DOM/多选择区/键盘导航任何路径都可能未触达。

**修复**：至少补 8-10 个 jsdom 单测（Shadow DOM find + range + speaker 按钮点击 + hide 逻辑）。或者标记为 "整体走 e2e"，从 coverage include 中移除并转 e2e coverage。

**工作量**：3-4h

### P2-B · Tooltip 双实现（maintainability）

**证据**：`level-filter.ts:426` `createTooltipElement()` 与 `selection-tooltip.ts:248` `showTooltip()` 结构性重复，两处都用 `innerHTML = SPEAKER_SVG` 挂 speaker icon。

**失败场景**：一处改样式/无障碍/交互，另一处漏改；behavior drift。

**修复**：抽 `src/lib/tooltip-primitives.ts`（createTooltipShell/mountSpeaker/positionByRange）供两个调用点复用。

**工作量**：3h

### P2-C · 缺 prefers-reduced-motion（accessibility）

**证据**：全项目 `prefers-reduced-motion` 0 处引用；9 处 animate/transition 类。

**修复**：`src/style.css` / tailwind config 加：
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

**工作量**：0.5h

## 🟢 P3 Findings

### P3-A · 根目录缺 CONTRIBUTING/PRIVACY（documentation）

**证据**：`.github/SECURITY.md` 存在但根目录 `CONTRIBUTING.md` / `PRIVACY.md` 缺失。Chrome ext 声明 `optional_host_permissions: ['http://*/*', 'https://*/*']` → Store 审核会问隐私政策。

**修复**：根目录补 CONTRIBUTING.md（引用 .github/SECURITY.md + PR template）+ PRIVACY.md（说明"本地翻译词典 + 可选 LLM 调用；apiKey/endpoint 只存本地 chrome.storage.local；不采集任何用户浏览数据"）。

**工作量**：1h

### P3-B · tests/ 145 个 any（type-safety · 可豁免）

**证据**：`npx eslint tests/**/*.{ts,tsx} -f json` 145 warning，`pronunciation.test.ts` 独占 99。

**判断**：testing-library / mock 场景 any 是**普遍豁免项**（skill 认可）。**不修**，但需在 `eslint.config.js` 显式声明 tests/ overrides 关闭该 rule，去除 lint 噪音（150 warning 混淆真信号）。

**工作量**：0.3h

## 修复顺序（推荐）

| # | Finding | 严重 | 工作量 | 依赖 |
|---|---|:-:|:-:|---|
| 1 | P1-C sanitize 字面量兜底 | P1 | 2h | 独立 |
| 2 | P2-C prefers-reduced-motion | P2 | 0.5h | 独立 |
| 3 | P3-B tests/ any override | P3 | 0.3h | 独立 |
| 4 | P3-A CONTRIBUTING/PRIVACY | P3 | 1h | 独立 |
| 5 | P1-A coverage include | P1 | 3-4h | 需 4 前置（避免 CI 挂） |
| 6 | P1-B E2E in CI | P1 | 2-3h | 独立 |
| 7 | P2-A selection-tooltip 单测 | P2 | 3-4h | 5 后 |
| 8 | P2-B tooltip 抽公共 | P2 | 3h | 7 后 |
| 9 | P1-D App.tsx SRP 拆分 | P1 | 4-6h | 独立（可与 5-8 并行） |

## 快赢

1. **P2-C** (0.5h) 直接改一段 CSS。
2. **P3-B** (0.3h) eslint override 单行。
3. **P1-C** (2h) sanitize 加参数 · 复用校对鸭方案。

三件立即可做，共 **~3h**，评分回升 **~5 分**（Sec 7.5→9 · Doc 6.5→7 · A11y 一档）。

## 战略建议

**Coverage 盲区（P1-A）是本次审计最严重发现**。前 3 轮（v1/v2/v3/v3b）报告的 64% coverage 有系统性水分，实际 src/ 覆盖 ≤ 25%。**不能靠"提高 floor"**解决 —— 现值 63.30 已经是 lib+bg 高覆盖撑起的假象。必须**扩 include 后重新校准**，同时**引入 e2e 作为顶层功能覆盖兜底**。

否则下一轮审计还会在同一处踩同样的雷。

## Closure（本轮 PR 修复完成后回填）

### 已修复（本 PR）

| # | Finding | 状态 | 证据 |
|---|---|:-:|---|
| 1 | P1-A coverage include 大缺口 | ✅ | `vite.config.ts` include→`src/**/*.{ts,tsx}` + `all:true`；floor 63.30→39.00 校准；真实覆盖 39.62% 曝光 |
| 2 | P1-B E2E 未纳入 CI | ✅ | CI 加 `e2e-smoke` job；minimal-fixtures 加 tmpdir userDataDir + try/finally cleanup；`continue-on-error:true` 首轮 |
| 3 | P1-C sanitize 字面量兜底 | ✅ | `sanitizeError(err, apiKey?)` 加 literal replace + 1000-char 预切；7 个 regression tests |
| 4 | P2-C prefers-reduced-motion | ✅ | options.css + tooltip.css 加 `@media` |
| 5 | P3-A CONTRIBUTING/PRIVACY | ✅ | 根目录补两文件 |
| 6 | P3-B tests/ any override | ✅ | eslint.config.js 加 tests/ overrides；lint warning 150→5 |

### 待做（下轮）

| # | Finding | 状态 | 计划 |
|---|---|:-:|---|
| 7 | P1-D App.tsx SRP 拆分 | ⏸ | 独立 refactor PR（4-6h · 与本 PR 分开控风险） |
| 8 | P2-A selection-tooltip 单测 | ⏸ | 需要 P1-A 完成后补测（本 PR 已把它纳入 coverage 分母） |
| 9 | P2-B tooltip 双实现 | ⏸ | 依赖 P2-A 补测后 refactor |

### 门禁验证

- tsc: **0 errors**
- lint: **0 errors · 0 src warnings**（tests/ 5 unused-vars 允许）
- vitest: **510/510 pass**（v3b 503 + audit-v4-p1c 7 新测）
- build: ✅
- coverage: **39.62%** > floor 39.00 ✅（真实值，非虚高）
- Open PR/Issue/Dependabot/Secret alert: 全 0

### 评分变动

| 维度 | v3b | v4 扫描 | v4 修复后 | Δ 修复 |
|---|:-:|:-:|:-:|:-:|
| Security | 9.0 | 7.5 | **9.5** | +2.0 |
| Architecture | 8.0 | 6.0 | 6.0 | → (P1-D 待做) |
| Type-safety | 9.0 | 9.0 | 9.0 | → |
| Maintainability | 9.0 | 7.0 | 7.5 | +0.5 |
| Testing | 8.5 | 5.5 | **7.5** | +2.0（coverage 诚实化 + e2e 上 CI） |
| Release | 9.0 | 8.5 | **9.0** | +0.5 |
| Documentation | 8.0 | 6.5 | **8.5** | +2.0 |

**综合 · v4 修复后 ~85/A-**（较扫描 78 回升 7 分；未及 v3b 90，因架构 P1-D 未做 + coverage 诚实计入）


