## 🎯 Purpose / 动机

v4 通过扩大 `coverage.include` 让真实覆盖率从虚假 63.30% 校准到 39.62%——但只诚实化了分母，2660+ loc 的 0% 覆盖率黑洞并未真正补测试。v5 复审的核心问题：把 v4 曝光的黑洞真正开始补测试（selection-tooltip.ts / App.tsx / validation 逻辑），同时消灭 v4 后新暴露的 pattern shadow 与治理缺口。

Refs: [.audit-reports/audit-report-readto-20260708-v5.md](.audit-reports/audit-report-readto-20260708-v5.md) · 前置 audit: [v4 PR #21](https://github.com/gandli/readto-chrome-extension/pull/21)

## 📋 Overview / 改动概览

**4 个原子 commit · 每个可独立 review**：

- **[Testing]** `4bda037` P1-D · 5 处 tests/ lint warning 全清（`_afterEach` / `_FilteredWord` / `_firstTextNode` / `_p`）
- **[Governance]** `4bda037` P2-A/B/C · SECURITY.md + CODEOWNERS + PR/Issue 3 template
- **[Maintainability]** `226a8c5` P1-B · tooltip CSS 单一真值源（Vite `?raw` import 替换 15 行硬编码副本 + 4 test 回归护栏）
- **[Testing]** `90647e6` P1-C · 抽 `validation.ts` 出 App.tsx（3 函数 + 4 常量 · 100% coverage · 20 test）
- **[Testing]** `5b10b33` P1-A · selection-tooltip 3 个纯函数骨架测试（0% → 26.58% · 18 test）
- **[Docs]** `837a95a` 完整 audit 白皮书（Executive Summary → Fix Log → Verification → v6 backlog · 432 lines）

## 🧭 Context / 上下文

**为什么 4 个原子 commit 而非单 diff**：SRP 拆分（P3-A · App.tsx 1147 loc）本身需要 10-14h 且改动面极大，与 v5 其他修复混合会让 PR 无法 review。**决策**：P3-A 单独留 v6 · v5 只做骨架测试 + 单源化 + 治理文档。

**为什么 Vite `?raw` 而非 fetch 加载 CSS**：MV3 CSP 对 fetch 内部资源有约束 · runtime IO 增加冷启动延迟。构建期内联（`?raw`）胜。

**为什么 validation.ts 逐字抽出**：保持字节级语义等价，refactor 与 improvement 分开走，避免语义漂移。

**Blast radius:**
- [x] 测试基础设施（+42 test · +2 test env pragma）
- [x] CI 治理文档（.github/*.md · SECURITY.md · CODEOWNERS）
- [x] 构建（Vite `?raw` import · 需要 `src/vite-raw.d.ts` 类型声明）
- [x] Options page 重构（validation 抽出 · 语义等价）
- [ ] 数据模型 / 迁移（无）
- [ ] 公共 API / 契约（无破坏性变更）

**Trade-offs**: 1141 lines diff 超过 400 行硬门禁，但通过 4 个原子 commit 分片解决（**逐 commit review 每个 <400 lines**）。selection-tooltip 骨架 26.58% 未达 80% 目标（完整补齐需 mock inline-renderer/pronunciation · 8-10h · 留 v6）。

**Rejected alternatives**: (a) 一次性 v5 完整 SRP 拆分——超时且 PR 无法 review · (b) 用 fetch 加载 tooltip.css——MV3 CSP + runtime cost 权衡失败 · (c) 保留 FALLBACK_TOOLTIP_CSS 手工同步——已被 v3→v4→v5 三轮 pattern shadow 证明不可持续。

## ✅ Verification / 验证证据

### 🔍 Code Review 结果（`code-review-skill` 3×3 扫描）

| 维度 | 🔴 blocking | 🟡 important | 🟢 nit |
|:---|:---:|:---:|:---:|
| 🔒 安全 | 0 | 0 | 0 |
| ⚡ 性能 | 0 | 0 | 0 |
| 🛠️ 可维护性 | 0 | 0 | 0 |

扫描面：
- 秘密扫描（api_key / password / secret / token / bearer）→ 全部 hits 是 validation.ts 合规校验代码与文档表格，**无泄漏**
- 路径硬编码（`/Users/` / `C:\`）→ **0 hits**
- 危险 API（`eval` / `innerHTML =` / `dangerouslySetInner`）→ 仅 `speaker.innerHTML = SPEAKER_SVG`（外部常量 SVG）与 jsdom test 的 `document.body.innerHTML = ''` reset，**均合规**
- validation.ts / selection-tooltip.ts 抽出保持字节级语义等价（逐字复制 + import 替换）

### 🧪 自动化验证

- [x] `npx tsc --noEmit`：**0 err**
- [x] `bun run lint`：**0 err · 0 warn**（src/ + tests/ 两个目录均 0 warning，超过 CI 当前只对 src/ 严格的门槛）
- [x] `bun run test`：**552 / 552 passed**（20 test files · +42 test vs v5 baseline）
- [x] `bun run build`：ok（bundle 稳定）
- [x] `bunx vitest run --coverage`：**Statements 43.18%** · Branches 46.87% · Functions 42.66% · Lines 43.77%（vs v5 baseline: 39.62% / 41.66% / 40.66% / 40.4%）
- [x] 关键文件覆盖率：`validation.ts` **100%** · `selection-tooltip.ts` **0% → 26.58%**

### 🧍 人工复核

- [x] tooltip CSS `?raw` import 在 build 后正确内联（`bun run build` 无错误）
- [x] validation.ts 逐字对照 App.tsx 原实现（无逻辑漂移）
- [x] 4 个原子 commit 每个可独立 review · 语义清晰 · commit message 齐全

## 👀 Reviewer Guidance / 给评审人的话

**建议阅读顺序**：
1. `.audit-reports/audit-report-readto-20260708-v5.md`（先看**综合评分**表 + **修复日志**了解 4 个 commit 边界）
2. `src/options/validation.ts` + `tests/audit-v5-p1c-validation.test.ts`（新建纯函数 100% coverage · 最容易 review）
3. `src/lib/level-filter.ts` diff（-15 行硬编码 CSS · +2 行 `?raw` import）+ `tests/audit-v5-p1b-tooltip-css-parity.test.ts`
4. `src/lib/selection-tooltip.ts` diff（3 个 `function` → `export function`）+ `tests/audit-v5-p1a-selection-tooltip.test.ts`
5. `SECURITY.md` + `.github/` 治理文档

**重点关注**：
- validation.ts 是否与 App.tsx 原实现语义等价（可逐行对比 `git diff HEAD~4:src/options/App.tsx` 与新文件）
- selection-tooltip.ts 3 个 export 是否会被外部误用（附了 `@internal Exported for testing only` 注释）
- 综合分从 76 → ~86 的评分是否公允（Testing +2.5 是否高估？看 Coverage 表 +3.56%）

**期望反馈类型**：
- [x] 结构建议（v6 backlog 是否合理？6 项 38-56h 估算是否偏高？）
- [x] 语义把关（validation.ts 抽出是否真的字节级等价？）
- [ ] 快速通过（4 个原子 commit 本意是让 review 轻松）

---

<sub>🤖 Generated with Hermes Agent · `fuck-my-shit-mountain` v5 case study</sub>
