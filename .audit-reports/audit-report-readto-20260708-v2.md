# readto-chrome-extension · Audit v2 · 2026-07-08

**审计模式**：full · **报告语言**：简体中文 · **输出格式**：md · **审计范围**：全项目
**Head**：`89c3c95` · **触发**：Phase 1 闭环（86/B+）后 1 天回扫，验证 pattern shadow

## Executive Summary

> **注**：以下"v2 观察"列为**扫描期快照**（审计写入时点，含 5 P1 + 8 P2 findings）。**最终结论看文末 Closure 章节**（88/B+ · 501/501 tests）。

| 维度 | v1 (86分) | v2 观察 | 主要变化 |
|---|---|---|---|
| Security | 9.0 | **8.0** | 发现 UI 侧 `setTestResult((e as Error).message)` 未 sanitize（Pattern shadow #3）+ 源 manifest 未净化 |
| Architecture | 7.5 | **7.0** | 根目录混入 3 个构建残留（追进 git）+ 双 lockfile 冲突 |
| Type-safety | 8.0 | **7.5** | `false as any` 掩盖 null 类型 · Bilibili API 6 处 `as any` |
| Maintainability | 8.0 | **7.5** | SPEAKER_SVG 双份定义 · App.tsx 1166 loc · .gitignore 重复 |
| Testing | 8.5 | 8.5 | 保持 498/498 pass · selection-tooltip 0% 未动 |
| Release | 8.5 | **7.5** | 双 lockfile（bun/npm）+ CI Actions 未 pin SHA |
| Documentation | 8.0 | 8.0 | 保持（DESIGN.md merged）· 缺 LICENSE |

**综合评分 · 79/100 · B-**（较 v1 下降 7 分）
**核心结论**：v1 修复主线（sanitizeError chokepoint + manifest 硬化）到位，但**同 pattern 独立出口仍有漏网**（UI 侧未走 sanitize · 源 manifest 未净化 · 根目录 3 个构建残留追进 git）。本轮 P1 全部为「pattern shadow 后续暴露」。

## Coverage Matrix

| 维度 | 覆盖度 | 证据 | 排除 |
|---|---|---|---|
| architecture | High | src/ 20 文件全扫 · vite plugin 逻辑通读 | dist/ 已构建产物 |
| security | High | error-sanitize choke point 追踪 · 所有 `setTestResult`/`sendResponse` 出口列举 · public/dist manifest diff | ai-safety（无 LLM tool call 面） |
| type-safety | High | `as any` 全项目 grep 14 处 + 逐一定性 | tests/ 中 199 warning（非阻断） |
| testing | High | 498 test 通过 · statements 64.17% (Linux 63.5) · 逐文件覆盖率对比 | e2e/inject-test.mjs 未跑 |
| release | Medium | CI workflow + lockfile 双份 + Actions 版本 | Chrome Web Store 上架路径未验 |
| maintainability | High | 单文件 loc 统计 · 重复常量 grep · 根目录污染扫描 | — |
| documentation | High | README/README_CN/CHANGELOG/DESIGN 存在性检查 · LICENSE 缺失 | — |

## Project Map

- **entrypoints**：`src/options/App.tsx`(1166) · `src/background/service-worker.ts`(313) · `src/content/{index,youtube,bilibili,page-world,bilibili-world}.ts`
- **shared libs**：`src/lib/{level-filter,selection-tooltip,edge-tts,pronunciation,storage,translations,error-sanitize,inline-renderer}.ts`
- **build**：`vite.config.ts` 含 `manifestPatchPlugin`（构建后重写 manifest）
- **CI**：`.github/workflows/{ci.yml,changelog.yml}` · 硬化门禁齐全（tsc + lint + coverage floor 63.5 + manifest jq verify + build）

## Findings

### 🔴 P1（严重·必修）

#### P1-A · `false as any` 掩盖 null 类型缺陷
**文件**：`src/lib/level-filter.ts:619`

```ts
let hideTimer: ReturnType<typeof setTimeout> | null = false as any;
```

**问题**：类型标注是 `Timeout | null`，初值却用 `false as any` 绕过。逻辑不 crash（后续 `hideTimer !== null` 判断 `false !== null` 永真），但**破坏了类型语义**：读代码人以为初始状态是 null，实际是 boolean。这类 `as any` 是审计 red flag —— 掩盖真实类型错误的经典模式。

**根治**：改为 `null`（唯一正确的初值）。
**回归测试**：hideTimer 关闭 tooltip 的 e2e 已存在，无需额外测试。
**成本**：1 行改动。

#### P1-B · 源 manifest 未净化（依赖构建 plugin 兜底）
**文件**：`public/manifest.json`

**问题**：源文件仍含：
- `"host_permissions": ["<all_urls>"]`（Chrome Web Store 一级审核警告）
- `"update_url": "https://clients2.google.com/service/update2/crx"`（Web Store 上架必删）
- **缺** `content_security_policy`
- **缺** `minimum_chrome_version`

生产用的净化版全靠 `vite.config.ts:20-31` 的 `manifestPatchPlugin` 兜底：
```ts
manifest.minimum_chrome_version = '116';
manifest.content_security_policy = { extension_pages: "..." };
delete manifest.host_permissions;
manifest.optional_host_permissions = ['http://*/*', 'https://*/*'];
delete manifest.update_url;
```

**风险**：任何绕过 vite（如手动 zip · 未来 WXT 迁移 · plugin 顺序变动）都会重新暴露 `<all_urls>` + 缺 CSP 组合。**源真相原则被破坏**。

**根治**：源 manifest 即净化，plugin 只做哈希路径替换。
**回归测试**：`tests/audit-p0-regression.test.ts` 已有 manifest 硬化断言。
**成本**：改 1 个 JSON 文件 + 简化 plugin 4 行。

#### P1-C · 根目录构建残留混入 git 追踪
**文件**：`manifest.json`、`options.html`、`service-worker-loader.js`（项目根）

```bash
$ git ls-files | grep -E '^(manifest|options.html|service-worker-loader)'
manifest.json
options.html
service-worker-loader.js
```

**问题**：这三个是 vite 构建产物，正确位置是 `dist/`（生成）和 `public/manifest.json`（源）。追进 git 造成：
1. 开发者可能误改根副本（不生效 · 会 diff 漂移）
2. 与 `dist/` 每次构建后不同步
3. **P1-B 的 `public/manifest.json` 源 + 根 `manifest.json` 副本 = 两份"源"** · 混淆度极高

**根治**：`git rm` 三个文件 + 加 `.gitignore`。
**回归测试**：加 CI 步骤 `test ! -f manifest.json`。
**成本**：3 行 git rm + 3 行 gitignore。

#### P1-D · 双 lockfile（bun.lock + package-lock.json）
**文件**：`bun.lock`(720 行) · `package-lock.json`(6162 行)

**问题**：CI 用 `npm ci`，但 repo 同时保留 `bun.lock`。用户本地 `bun install` 只更新 bun.lock，`npm install` 只更新 package-lock。**两个 lock 永久漂移**，某天 CI 装的版本和本地跑的不同 → 生产 bug 无法复现。

**根治**：CI 已固定 npm → 删 `bun.lock`。加 `.gitignore` 记入。
**回归测试**：CI 已跑 `npm ci`，删 bun.lock 不影响。
**成本**：git rm 1 文件。

#### P1-E · Options 页 LLM 测试错误未 sanitize（Pattern shadow #3）
**文件**：`src/options/App.tsx:948`

```ts
} catch (e) {
  setTestResult({ ok: false, msg: (e as Error).message });
}
```

**问题**：`handleTestConnection` 直接把 fetch 抛出的 Error message 塞 UI。OpenAI 兼容端点错误 body 常回显 Authorization header（skill 记忆 `error-body-secret-leak`）—— 用户填了错的 key 后，接口回 401 body 里可能包含 `Bearer sk-xxx` 完整字符串。虽然只在 Options 页显示给用户自己，但**违反了 v1 建立的"所有 error 出口必须过 sanitizeError"原则**。已有 `src/lib/error-sanitize.ts` 但未被 UI 调用。

**根治**：改用 `sanitizeError(e).message` 或引入 `formatErrorMessage`。
**回归测试**：新增 test 断言 `setTestResult` 收到含 `sk-xxx` 的 err 时输出 `[REDACTED]`。
**成本**：改 1 行 + 加 1 测试。

### 🟡 P2（优化·择时）

| # | 文件 | 问题 | 根治 |
|---|---|---|---|
| P2-A | `level-filter.ts:409` + `selection-tooltip.ts:140` | `SPEAKER_SVG` 常量重复定义 | 抽到 `src/lib/icons.ts` |
| P2-B | `bilibili-world.ts:87-92,194-202` · `page-world.ts:133-265` | Bilibili/YouTube API 6 处 `as any` | 定义 `BilibiliSubtitleResponse` / `YouTubeCaptionResponse` 类型 |
| P2-C | `selection-tooltip.ts` (427 loc) | 0% 单测覆盖 | Phase 2 backlog（保持） |
| P2-D | `App.tsx` (1166 loc) | 巨型组件 · 28 函数 · 48 hooks | SRP 拆分：Level/Preview/LLM 三个子组件 |
| P2-E | eslint 199 warning | 全是 tests/ 的 `no-explicit-any` | 引入 `@types/xxx` 或 `unknown` 收敛 |
| P2-F | `.gitignore:7-8` | `test-results/` 出现两次 | 去重 |
| P2-G | `.github/workflows/{ci,changelog}.yml` | 6 处 `uses: xxx@v4` 未 pin SHA | 加 SHA 注 tag |
| P2-H | 项目根 | 缺 LICENSE + `package.json` 无 license 字段 | 加 MIT LICENSE |

## Fix Order

1. **P1-A** level-filter.ts `false as any` → `null` · 1 行
2. **P1-B** public/manifest.json 源头净化 · JSON 改 4 项
3. **P1-C** 删 3 个根残留 · git rm + gitignore
4. **P1-D** 删 bun.lock · git rm
5. **P1-E** App.tsx 用 sanitizeError · 1 行 + 1 测试
6. **P2-A** 抽 SPEAKER_SVG · 新建 icons.ts
7. **P2-F** .gitignore 去重
8. **P2-H** 加 LICENSE

P2-B/D/E/G 留 Phase 3。

## 修复后期望

- 类型安全 · 8.5（P1-A 修 + P2-A 副产品）
- Architecture · 8.0（P1-C 修 · 根污染归零）
- Release · 8.5（P1-D 修 · lockfile 单一）
- Security · 8.5（P1-B/E 修 · 出口对齐）
- **综合 · 88/100 · B+**

---

## Closure · 2026-07-08 · fix/audit-v2-p1

**分支**：`fix/audit-v2-p1` · **验证命令**：`npx tsc --noEmit && bun run lint && bun run test && bun run build`

| Finding | 状态 | 证据 |
|---|---|---|
| P1-A `false as any` | ✅ CLOSED | `level-filter.ts:619` 现为 `= null` · tsc 0 error |
| P1-B 源 manifest 未净化 | ✅ CLOSED | `public/manifest.json` 加入 `minimum_chrome_version` / `content_security_policy` / `optional_host_permissions`，移除 `host_permissions:<all_urls>` 和 `update_url`；vite plugin 转为安全网防御 |
| P1-C 根目录构建残留 | ✅ CLOSED | `git rm manifest.json options.html service-worker-loader.js` + `.gitignore` 加 `/manifest.json` / `/options.html` / `/service-worker-loader.js` |
| P1-D 双 lockfile | ✅ CLOSED | `git rm bun.lock` + `.gitignore` 收录 bun.lock/bun.lockb |
| P1-E App.tsx 错误未 sanitize | ✅ CLOSED | `src/options/App.tsx:952` 改走 `sanitizeError(e).message` + 新增 `tests/audit-p1e-regression.test.ts`（3 测试全绿） |
| P2-A SPEAKER_SVG 重复 | ✅ CLOSED | 抽出 `src/lib/icons.ts` · level-filter/selection-tooltip 均 import |
| P2-F .gitignore 重复 | ✅ CLOSED | 重写去重 + 分区注释 |
| P2-H LICENSE 缺失 | ✅ CLOSED | 新增 MIT LICENSE + `package.json` 加 `"license": "MIT"` |

### 复审门禁

```text
tsc --noEmit        : 0 errors
eslint             : 0 errors · 198 warnings (纯 tests/ any，非阻断)
vitest             : 501/501 passed (+3 新回归)
build              : OK
dist manifest jq   : minimum_chrome_version ✅ · CSP ✅ · host_permissions==null ✅ ·
                     optional_host_permissions>0 ✅ · update_url==null ✅
```

### 综合评分复审

| 维度 | v1 | v2 报告 | v2 闭环后 |
|---|---|---|---|
| Security | 9.0 | 8.0 | **9.0**（P1-B/E 修 · 双出口对齐） |
| Architecture | 7.5 | 7.0 | **8.0**（P1-C 修 · 根污染归零） |
| Type-safety | 8.0 | 7.5 | **8.5**（P1-A 修） |
| Maintainability | 8.0 | 7.5 | **8.0**（P2-A/F/H 修） |
| Testing | 8.5 | 8.5 | **8.5**（+3 回归） |
| Release | 8.5 | 7.5 | **8.5**（P1-D 修 · 单 lockfile） |
| Documentation | 8.0 | 8.0 | **8.0** |

**综合 · 88/100 · B+** ✅ 达标（≥85）

### Phase 3 未做（择时）

- **P2-B** Bilibili/YouTube API 类型化（6 处 `as any`） · 需先补 e2e 才能安全重构
- **P2-C** `selection-tooltip.ts` 单测（427 loc 0% 覆盖）
- **P2-D** App.tsx SRP 拆分（1166 loc → Level/Preview/LLM 三子组件）
- **P2-E** tests/ 199 `no-explicit-any` warning 收敛
- **P2-G** GitHub Actions pin SHA（`@v4` → `@<40char>` + tag 注释）

### Pattern shadow 全景表（v1→v2 追踪）

| 轮次 | Pattern | 修复位置 | v2 shadow 位置 |
|---|---|---|---|
| v1 | error 出口未 sanitize | `service-worker.ts:258/267/279/291` | ⚠️ `App.tsx:948` (v2 P1-E) |
| v1 | manifest `<all_urls>` | `vite.config.ts` plugin 兜底 | ⚠️ `public/manifest.json` 源未净化 (v2 P1-B) |
| v1 | 构建产物追进 git | (未触发) | ⚠️ 根 `manifest.json` / `options.html` / `service-worker-loader.js` (v2 P1-C) |

**教训**：**修出口 pattern 时必须回问「本项目还有哪些同 pattern 的独立入口？」**。v1 只修了 service-worker.ts，未回扫 UI 侧；v1 只修了 dist manifest（plugin 兜底），未回扫 source manifest；构建残留追进 git 从未被 v1 意识到。v2 全部补齐后 pattern shadow 清零。

