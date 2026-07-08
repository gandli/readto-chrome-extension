## 🎯 Purpose / 动机

v5 白皮书 v6 backlog 里有一条"selection-tooltip 深度补测 + 挖低覆盖率洼地"。这个 PR 是 Round 1 · 摘低垂果实——把 3 个已经在 ~90% 的 lib 文件推到 100%/96%+，同时校准分母，把 loader/content-script 这类只能靠 E2E 覆盖的运行时 bootstrap 从覆盖率分母里剔除。

## 📋 Overview / 改动清单

**1 个 commit · +150 / -2**：

| 文件 | 说明 |
|---|---|
| `vite.config.ts` | `coverage.exclude` +5 项：`**/*.d.ts` · `content/loader.ts` · `content/page-world-loader.ts` · `content/bilibili.ts` · `content/youtube.ts` |
| `tests/coverage-boost-r1-quick-wins.test.ts` | **新增 · 7 tests · jsdom env** |

## 🧠 Context / 背景

- v5 修复了 v4 的分母骗术后，真实 baseline 是 **43.18%**（v5 白皮书已记录）
- 但 v5 之后的分母还含 5 类**永远不可能在 node vitest 里覆盖**的文件：
  1. `.d.ts` 纯类型声明（无 runtime code）
  2. `loader.ts` / `page-world-loader.ts` — 4-17 loc 的 IIFE，只做 `chrome.runtime.getURL()` + 动态 import，靠 E2E smoke 覆盖
  3. `bilibili.ts` / `youtube.ts` — 挂 chrome API 的 content script，需要真实浏览器 · E2E only
- 这些文件占分母 372 loc，占用 ~19% 的分子空间但永远贡献 0 → 严重压低可见数字

## ✅ Verification / 验证

**新增测试（7 pass · 覆盖率提升锚点）**：

| 文件 | before | after | Δ |
|---|:-:|:-:|:-:|
| `permissions.ts` | 87.09% | **96.77%** | +9.68 |
| `storage.ts` | 94.52% | **98.63%** | +4.11 |
| `translations.ts` | 97.43% | **100%** | +2.57 |
| `error-sanitize.ts` | 96.42% | 96.42% | 0 (test 通过但 branch 已被现有 suite 覆盖) |

**全局覆盖率变化**：

| 指标 | v5 baseline | Round 1 后 | 说明 |
|---|:-:|:-:|---|
| Statements | 43.18% | **54.00%** | 分母修正 +10.31 · quick-wins +0.51 |
| Branches | 47.31% | **57.64%** | +10.33 |
| Functions | 42.66% | **50.00%** | +7.34 |
| Lines | 43.87% | **54.59%** | +10.72 |
| Tests | 558 | **565** | +7 |

**三件套**：tsc 0 · lint 0 err/0 warn · **565/565** · build ✓

## 👀 Reviewer guidance / 评审建议

- **重点看** `vite.config.ts` 的 exclude 追加是否合理（loader.ts 真的只做 dynamic import 吗？看代码就 10 行 IIFE）
- 每个新测试对应 1 处 uncovered 分支 · JSDoc 注明 line 号方便对照
- **Round 2 计划**（不在本 PR 内）：`selection-tooltip.ts` (26.58%) · `level-filter.ts` (55.51%) · `edge-tts.ts` (37.71%) 需要更深的 mock 工作 · 单独 PR

**⚠️ CI 门禁调整建议**：如果项目有 coverage floor（原 39.00%），可以在本 PR 合并后提到 50.00%。

#audit-v5 后续 · #coverage-boost-round-1 · #低垂果实
