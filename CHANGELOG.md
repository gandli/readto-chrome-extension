# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased] — 2026-06-21

### ✨ Features

- add selection tooltip + Edge TTS + docs update (`725a218`)
- Bilibili 字幕支持 + 项目结构优化 (`ed0a324`)
- initial reverse-engineered readto extension (`09e1b25`)

### 🐛 Bug Fixes

- 选项页加载 Tailwind CSS + 使用 readto.ai 示例文章截图 (`f5fbbb5`)
- 标注功能修复 + E2E 测试框架 + manifest-patch 改进 (`fa87fa8`)
- manifest-patch plugin generates service-worker-loader.js (`15b88ed`)

### ⚡ Performance

- 字体改用 Google Fonts 中国镜像 CDN (零体积 + 设计还原) (`450c3b2`)
- 移除 208 个自定义字体文件 (-11MB)，改用系统字体 (`b3cfd72`)
- translations-detail.json 按首字母拆分为 26 个按需加载文件 (`77e32fe`)

### 📚 Documentation

- 添加完整截图（选项页、暗色模式、标注、Tooltip、全页） (`7068513`)
- 英文 README 为主，中文为辅 (`d1f971e`)
- 更新 README 体现逆向工程性质 (`daf097e`)
- 添加中英文 README (`48d0238`)

### 🧪 Tests

- 补充全模块测试 (+173 用例，覆盖率 60% → 81%) (`97a6306`)
- 按 Skills 指导补充边界场景测试 (+58 用例) (`46b599b`)
- 新增 123 个测试，覆盖率 27% → 56% (`c97fc9b`)
- 新增 53 个单元测试，覆盖率从 9.8% → 27% (`5192dda`)
- 英语水平×文章难度 E2E 标注量 + Tooltip + 朗读测试 (`5722f72`)
- e2e tests via direct injection (Chrome 149 workaround) (`317a7be`)
- add e2e test framework (Playwright + Chrome extension) (`b4f1e56`)
- add vitest test suite (54 tests) (`cb4b227`)

### 🔧 Chores

- update test:e2e script to use inject-test.mjs (`c52f87b`)
- add test-results to gitignore (`bc2f135`)

