# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased] — 2026-08-17

### ✨ Features

- add selection tooltip + Edge TTS + docs update (`725a218`)
- Bilibili 字幕支持 + 项目结构优化 (`ed0a324`)
- initial reverse-engineered readto extension (`09e1b25`)

### 🐛 Bug Fixes

- **audit-v4:** 6 findings 修复 — sanitize/coverage/E2E/a11y (78→~85) (#21) (`3d9bb35`)
- **audit:** phase 1 remediation — P0×4 + governance (72→~85 pts) (#4) (`012fde1`)
- **security:** Chrome Store P0 hardening — permissions + error sanitize + no as any (#3) (`aba7022`)
- update AI SDK dependencies (`e962d96`)
- 选项页加载 Tailwind CSS + 使用 readto.ai 示例文章截图 (`f5fbbb5`)
- 标注功能修复 + E2E 测试框架 + manifest-patch 改进 (`fa87fa8`)
- manifest-patch plugin generates service-worker-loader.js (`15b88ed`)

### ⚡ Performance

- 字体改用 Google Fonts 中国镜像 CDN (零体积 + 设计还原) (`450c3b2`)
- 移除 208 个自定义字体文件 (-11MB)，改用系统字体 (`b3cfd72`)
- translations-detail.json 按首字母拆分为 26 个按需加载文件 (`77e32fe`)

### ♻️ Refactoring

- **audit-v3b:** 类型化 Bilibili/YouTube DOM API — src warning 13→0 (#20) (`3b46265`)

### 📚 Documentation

- update CHANGELOG.md [skip ci] (`2309ee4`)
- update CHANGELOG.md [skip ci] (`e6613a9`)
- update CHANGELOG.md [skip ci] (`af942b3`)
- update CHANGELOG.md [skip ci] (`9c02779`)
- update CHANGELOG.md [skip ci] (`38f91f6`)
- update CHANGELOG.md [skip ci] (`6459fc8`)
- update CHANGELOG.md [skip ci] (`7c8d882`)
- update CHANGELOG.md [skip ci] (`9d3bfea`)
- update CHANGELOG.md [skip ci] (`b6fb940`)
- update CHANGELOG.md [skip ci] (`0d98164`)
- update CHANGELOG.md [skip ci] (`89c3c95`)
- update CHANGELOG.md [skip ci] (`d0ceaa9`)
- **design:** 落地 Readto 设计系统 (DESIGN.md · Google alpha spec) (#17) (`73f4b2c`)
- update CHANGELOG.md [skip ci] (`99a58dd`)
- update CHANGELOG.md [skip ci] (`72ab339`)
- **audit:** phase 1 closure report — 72→86 (C→B+) (#13) (`5ac638b`)
- update CHANGELOG.md [skip ci] (`c14bf92`)
- update CHANGELOG.md [skip ci] (`1be5c85`)
- update CHANGELOG.md [skip ci] (`96a11e6`)
- update CHANGELOG.md [skip ci] (`2af3681`)
- update CHANGELOG.md [skip ci] (`f3768b8`)
- update CHANGELOG.md [skip ci] (`55dc2d4`)
- 添加完整截图（选项页、暗色模式、标注、Tooltip、全页） (`7068513`)
- 英文 README 为主，中文为辅 (`d1f971e`)
- 更新 README 体现逆向工程性质 (`daf097e`)
- 添加中英文 README (`48d0238`)

### 🧪 Tests

- **coverage:** boost Round 1 — quick wins 43.18% → 54.00% (#23) (`8cbab97`)
- 补充全模块测试 (+173 用例，覆盖率 60% → 81%) (`97a6306`)
- 按 Skills 指导补充边界场景测试 (+58 用例) (`46b599b`)
- 新增 123 个测试，覆盖率 27% → 56% (`c97fc9b`)
- 新增 53 个单元测试，覆盖率从 9.8% → 27% (`5192dda`)
- 英语水平×文章难度 E2E 标注量 + Tooltip + 朗读测试 (`5722f72`)
- e2e tests via direct injection (Chrome 149 workaround) (`317a7be`)
- add e2e test framework (Playwright + Chrome extension) (`b4f1e56`)
- add vitest test suite (54 tests) (`cb4b227`)

### 🔧 Chores

- **deps-dev:** bump js-yaml from 4.3.0 to 4.3.1 (#34) (`d4447b0`)
- **deps-dev:** bump postcss from 8.5.15 to 8.5.26 (#33) (`08f0e84`)
- **deps-dev:** bump undici from 7.28.0 to 7.29.0 (#31) (`c62f447`)
- **deps-dev:** bump brace-expansion from 1.1.15 to 1.1.18 (#30) (`de36730`)
- **deps-dev:** bump fast-uri from 3.1.2 to 3.1.5 (#29) (`855d28e`)
- **deps:** bump actions/checkout from 4.3.1 to 4.4.0 (#28) (`50aa7b4`)
- **deps:** bump the runtime group across 1 directory with 3 updates (#26) (`d1d35fe`)
- **deps-dev:** bump the dev-tooling group with 6 updates (#24) (`968ddc5`)
- **audit-v5:** comprehensive fixes — 76→86 + coverage 39.62%→43.18% (#22) (`b775178`)
- **audit-v3:** src/ 48→13 warning + Actions pin SHA — 82→88 (B→B+) (#19) (`65fb881`)
- **audit-v2:** close 5 P1 + 3 P2 findings — 79→88 (B-→B+) (#18) (`5dc0b56`)
- **deps:** bump the runtime group with 3 updates (#16) (`a73b30d`)
- **deps-dev:** bump the dev-tooling group across 1 directory with 2 updates (#15) (`dc52656`)
- **deps:** block dependabot semver-major PRs globally (#14) (`ed6ed32`)
- 优化依赖结构 (`f662bb4`)
- update test:e2e script to use inject-test.mjs (`c52f87b`)
- add test-results to gitignore (`bc2f135`)

### 📦 Other

- Improve options UI and speech latency (`a80bc1c`)

