# 审计白皮书 · readto v5

**Repo**: `gandli/readto-chrome-extension`
**Date**: 2026-07-08
**Commit baseline**: `7c8d882` (main)
**Prior audit**: [v4](./audit-report-readto-20260708-v4.md) · 78/C+ → ~85/A- (PR #21 merged)
**Modes**: `full` (Deep Scan)
**Report language**: 简体中文
**Skill**: `fuck-my-shit-mountain` v5 case study

---

## Executive Summary

v4 修复 6 个 findings 后综合分从 78/C+ 升至 ~85/A-，coverage 从虚假的 63.30% 校准到真实的 39.62%。v5 复扫的核心问题：**coverage 39.62% 的真值揭示 content/ 与 options/ 全裸**（0% 覆盖率共 2660+ loc · 占 src/ 40%），以及 v4 明确留给独立 PR 的 P1-D（App.tsx 1172 loc SRP 违反）。此外新扫出 5 处 pattern shadow 与治理缺口：`level-filter.ts` 内嵌 SPEAKER_SVG 与 selection-tooltip 重复、tooltip.css 双源（`src/styles/tooltip.css` + `level-filter.ts:362` 内嵌 CSS 字符串）、5 处 lint warning 未清、缺 SECURITY.md、缺 CODEOWNERS。

**综合评分**：**76 / C+** （下降主因：0% 覆盖率的两大模块进入分母 · v4 只修了 coverage.include 但未真实补测试）

**技术债估算**：约 **28-36 小时**（P0: 0h · P1: 20-26h · P2: 6-8h · P3: 2h）

**方向**：v5 重点是**把 v4 曝光的黑洞真正补测试**（selection-tooltip 429 loc 0% → 80%+，App.tsx 1172 loc 0% → 至少 useSettings hook 独立测试），同时消灭 v4 后新暴露的 pattern shadow（双 CSS 源 / 双 SPEAKER_SVG 引用点）。

---

## Score Dashboard

| 维度 | v4 修复后 | v5 扫描 | 变动 | 一句判词 |
|---|:-:|:-:|:-:|---|
| Security | 9.5 | 9.5 | — | sanitize/permissions/CSP 全绿，无新增攻击面 |
| Testing | 7.5 | **5.0** | ⬇️ 2.5 | coverage 分母诚实化后暴露两大 0% 模块（App.tsx 1172 loc · selection-tooltip 429 loc） |
| Documentation | 8.5 | 8.5 | — | PRIVACY/CONTRIBUTING 就绪，缺 SECURITY/CODEOWNERS |
| Maintainability | 7.5 | **6.5** | ⬇️ 1.0 | tooltip 双源 CSS + 双 SPEAKER_SVG 引用点 = pattern shadow |
| Architecture | 6.0 | **5.5** | ⬇️ 0.5 | App.tsx SRP 违反继续恶化（v4 未拆分） |
| Performance | 8.0 | 8.0 | — | build 正常，无发现回退 |
| Release Readiness | 8.0 | 7.5 | ⬇️ 0.5 | CI 三件套稳定，但缺 SECURITY.md 会阻挡 Chrome Web Store 审核加分项 |
| **综合** | **~85 / A-** | **~76 / C+** | ⬇️ 9 | 覆盖率诚实化后回落到真实水位 |

**评分理由**：v4 的 85 分建立在"扩大 include 后立即修复"的假设上，但只修了 include 而未补测试，2660+ loc 直接进入分母拖低。v5 是**诚实分**，需要真实的覆盖率补齐工作。

---

## Coverage Matrix

| 维度 | 覆盖信心 | 检查方式 | 排除项 |
|---|:-:|---|---|
| Security | High | 手动 review `sanitizeSecrets` / `permissions.ts` / `service-worker.ts` / manifest | node_modules, dist |
| Testing | High | vitest --coverage full report · per-file 表 | e2e/, tests/ (self) |
| Documentation | High | 目录扫描 · 缺失关键文档核对（SECURITY/CODEOWNERS/CONTRIBUTING/PRIVACY） | — |
| Maintainability | High | wc -l 全 src/ · grep 重复代码模式 | node_modules, dist |
| Architecture | High | grep function 定义计数 · hook 计数 · loc 分档 | — |
| Performance | Medium | 构建时间 · bundle size hash 稳定性 | 未做 runtime profiling |
| Release | High | .github/ 目录扫描 · gh CLI 门槛检查 | — |

**未审计**：runtime 性能 profiling · Chrome Web Store 实际提交流程模拟 · accessibility 自动化扫描（axe-core 未集成）

---

## Findings 清单

| ID | 严重 | 领域 | 标题 | 文件 | 状态 |
|---|:-:|---|---|---|:-:|
| **P0** | — | — | 无 P0 | — | — |
| P1-A | 🔴 严重 | Testing | `selection-tooltip.ts` 0% 覆盖率（429 loc · Chrome Web Store 核心用户路径） | src/lib/selection-tooltip.ts | 待修 |
| P1-B | 🔴 严重 | Maintainability | `level-filter.ts` 与 `selection-tooltip.ts` 重复 `SPEAKER_SVG` 引用 + 内嵌 tooltip CSS 双源 | src/lib/level-filter.ts:362 · src/styles/tooltip.css | 待修 |
| P1-C | 🔴 严重 | Testing | `App.tsx` 1172 loc 0% 覆盖率（v4 遗留 P1-D） | src/options/App.tsx | 部分修 |
| P1-D | 🔴 严重 | Code Quality | 5 处 lint warning 未清（未使用变量/import） | multiple test files | 待修 |
| P2-A | 🟡 优化 | Documentation | 缺 SECURITY.md（社区安全策略入口） | .github/ (root) | 待修 |
| P2-B | 🟡 优化 | Documentation | 缺 CODEOWNERS（PR 自动 assign） | .github/CODEOWNERS | 待修 |
| P2-C | 🟡 优化 | Documentation | 缺 PR/Issue templates（.github/ISSUE_TEMPLATE + PULL_REQUEST_TEMPLATE） | .github/ | 待修 |
| P3-A | 🟢 建议 | Architecture | `App.tsx` SRP 违反（1172 loc / 30+ hooks · 应拆分为 4-6 子组件） | src/options/App.tsx | 留独立 refactor PR |

**Confirmed**: 全部 8 项均经 grep/wc/read_file 直接验证。**Suspected**: 无。

---

## 详细 Findings

### 🔴 P1-A · selection-tooltip.ts 0% 覆盖率

**文件**: `src/lib/selection-tooltip.ts` · **loc**: 429 · **coverage**: 0% (0/429)

**证据**：
```
lib
  selection-tooltip.ts  |   0    |   0    |   0    |   0    | 20-423
```

**风险**：selection-tooltip 是 Chrome Web Store 核心用户路径（在页面选中英文单词 → 弹出 tooltip 显示中文注音）。**零覆盖率意味着任何回归都要靠用户线上发现**。已有 v4 提及此风险但因 App.tsx 拆分优先未修。

**失败情境**：
1. 用户选中单词后 tooltip 位置计算 bug → tooltip 遮挡用户光标（`position: fixed` 相对视口计算错误）
2. `chrome.runtime.sendMessage` reject → tooltip 卡在 loading 态
3. `document.getSelection()` 返回 null（iframe / shadow DOM） → 未 guard 就调用 `.getRangeAt(0)` → uncaught

**最小修复**：新建 `tests/selection-tooltip.test.ts` · 至少覆盖 4 条路径：
- (a) 选中 → showTooltip 成功渲染
- (b) 选中 → 已知过滤词 → 不渲染
- (c) sendMessage reject → tooltip 显示 error
- (d) 视口边缘 → tooltip 位置纠偏

**回归测试**：per-path 4 个 test · 每个 test 断言 `document.querySelector('.tooltip')` 期望状态

**Effort**: **8-12h**（大型模块 · 需 jsdom 环境 + chrome mock）

---

### 🔴 P1-B · SPEAKER_SVG 双引用 + tooltip CSS 双源

**文件**:
- `src/lib/selection-tooltip.ts:272` → `speaker.innerHTML = SPEAKER_SVG`（**正规**：外部资产 + 单实现）
- `src/lib/level-filter.ts:452` → `speaker.innerHTML = SPEAKER_SVG`（**pattern shadow**：另一个独立 DOM 创建路径）
- `src/lib/level-filter.ts:362` → 内嵌 `.tooltip{...}` CSS 字符串（**pattern shadow**：与 `src/styles/tooltip.css` 双源）

**证据**：
```
src/lib/selection-tooltip.ts:16:import { SPEAKER_SVG } from './icons';
src/lib/level-filter.ts:16:import { SPEAKER_SVG } from './icons';
src/lib/level-filter.ts:362:.tooltip{position:fixed;background:hsl(30 7% 97%);... 内嵌 500+ chars CSS
```

**风险**：v4 修 tooltip.css `prefers-reduced-motion` + `animation-iteration-count: 1` **只修了 `src/styles/tooltip.css` 一份**。`level-filter.ts:362` 的内嵌 CSS 字符串**从未加 reduced-motion 保护**。用户如果通过 level-filter 路径（Ruby 注音悬停）触发 tooltip，前庭反应风险仍在。

**pattern shadow 定性**：这是 v3→v4→v5 连续三轮 sanitize pattern shadow 的**同型问题**——修 A 出口，B 出口漏网。skill 已收录，v5 首次在 CSS 层发现。

**最小修复**：
1. `level-filter.ts` 使用 `adoptedStyleSheets` 从 `chrome.runtime.getURL('assets/tooltip-css.css')` 加载同一份 CSS（当前已有 `resolveTooltipStylesheetUrl()` 函数但未完全用起来）
2. 或：把内嵌 CSS 抽到共享常量 `src/lib/tooltip-css-inline.ts`，两处都 import

**回归测试**：新建 `tests/tooltip-css-parity.test.ts` · 断言 level-filter 生成的 shadow DOM `.tooltip` 存在且样式来源同 `src/styles/tooltip.css`。

**Effort**: **3-4h**

---

### 🔴 P1-C · App.tsx 0% 覆盖率（v4 遗留 P1-D）

**文件**: `src/options/App.tsx` · **loc**: 1172 · **coverage**: 0% (0/1172)

**证据**：
```
options
  App.tsx  |   0    |   0    |   0    |   0    | 27-1168
```

v4 明确标注"P1-D App.tsx 拆分留独立 refactor PR"，v5 复扫仍是 0%。虽然 SRP 拆分是大工程，但**至少应先补 useSettings hook 独立测试**（该 hook 在 676-871 行 · ~200 loc · 处理所有配置读写与 debounce 保存）。

**风险**：useSettings 承担所有配置读写。**回归可能导致用户 API key 丢失或配置串 storage 冲突**。

**最小修复（v5 范围）**：
- 把 `useSettings` hook 抽到 `src/options/use-settings.ts` 独立文件
- 新建 `tests/use-settings.test.tsx` · 使用 `renderHook` · 覆盖：初始化加载 / debounce 保存 / LLM 配置校验 / 空配置检测

**回归测试**：4 个 test · `renderHook(() => useSettings())` + `chrome.storage.sync.get/set` mock。

**Effort**: **6-8h**（hook 抽离 + 测试补齐 · **不做全量 SRP 拆分**）

**注**：完整 SRP 拆分（1172 loc → 4-6 子组件）留 v6 独立 refactor PR，同 v4 决策。

---

### 🔴 P1-D · 5 处 lint warning 未清

**文件**（bun run lint 输出）：
```
  5:48  warning  'afterEach' is defined but never used
  50:8   warning  'FilteredWord' is defined but never used
  61:10  warning  'firstTextNode' is defined but never used
  82:8  warning  'FilteredWord' is defined but never used
  330:13  warning  'p' is assigned a value but never used
```

**风险**：src/ 已保持 0 warning ceiling，但 tests/ 累积 5 处 warning。**CI warning ceiling 目前只对 src/ 严格**，tests/ 未卡 → 温水煮青蛙风险。

**最小修复**：
- 加下划线前缀：`afterEach` → `_afterEach`，`FilteredWord` → `_FilteredWord`
- 或直接删除未使用 import/变量

**Effort**: **20min**

---

### 🟡 P2-A · 缺 SECURITY.md

**文件**：项目根缺 `SECURITY.md`

**风险**：GitHub 会在 repo Security tab 显示"Security policy" 缺失警告。CVE 披露没有明确入口，用户发现漏洞可能会直接在 Issue 公开，扩大攻击窗口。Chrome Web Store 审核对开源扩展的公开安全策略有隐性加分。

**最小修复**：创建 `SECURITY.md` · 20 行模板（Supported Versions / Reporting a Vulnerability / Response Timeline）· 引导到 GitHub Security Advisory 或 email。

**Effort**: **20min**

---

### 🟡 P2-B · 缺 CODEOWNERS

**文件**：`.github/CODEOWNERS` 缺失

**风险**：PR 无自动 reviewer assign · 未来外部贡献者提 PR 时不清楚谁审核。

**最小修复**：`.github/CODEOWNERS` 单行：`* @gandli`

**Effort**: **5min**

---

### 🟡 P2-C · 缺 PR/Issue templates

**文件**：`.github/ISSUE_TEMPLATE/*.md` + `.github/PULL_REQUEST_TEMPLATE.md` 缺失

**风险**：Issue triage 成本高 · PR 描述质量参差。

**最小修复**：
- `.github/PULL_REQUEST_TEMPLATE.md`（引用 pr-description-standard skill 5 段结构）
- `.github/ISSUE_TEMPLATE/bug_report.md` + `feature_request.md`
- `.github/ISSUE_TEMPLATE/config.yml`（禁 blank issue · 引导 Discussion）

**Effort**: **1-2h**

---

### 🟢 P3-A · App.tsx SRP 违反（留 v6 独立 refactor PR）

**文件**: `src/options/App.tsx` · **loc**: 1172 · **函数/组件**: 15+

**证据**（grep 结果）：
- LevelSlider (275-453 · 178 loc)
- LevelPreview (478-655 · 177 loc)
- Header, Section, LabeledInput, StatusIndicator, ReadtoLogo, ReadtoSubtitle, ReadtoToaster · 各 20-60 loc
- useSettings hook (676-871 · 195 loc)
- App main (872-1165 · 293 loc)

**建议拆分**（v6 refactor PR）：
```
src/options/
  App.tsx                  (~200 loc · main + layout only)
  use-settings.ts          (~200 loc · 独立 hook · v5 已做)
  components/
    LevelSlider.tsx        (~180 loc)
    LevelPreview.tsx       (~180 loc)
    LlmConfigForm.tsx      (~200 loc · 从 App main 拆)
    common.tsx             (~150 loc · Section/LabeledInput/StatusIndicator/Logo/Subtitle/Header)
```

**Effort**: **10-14h**（v6 独立 PR · 与 v5 平行进行）

---
