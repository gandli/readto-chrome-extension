# PR Purpose

<!-- 一句话说明这个 PR 解决什么问题。避免"改进代码"、"重构"等模糊描述。 -->

## Overview

<!-- 主要变更列表（3-5 条 bullet），关键 finding/issue 引用（#123 / audit-vN）。 -->

## Context

<!-- 为什么做这个改动？关联 issue 或审计 finding。风险是什么？-->

## Verification

<!-- 你如何证明改动是对的？勾选/填写实际执行的命令。 -->

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `bun run lint` → 0 errors, 0 warnings
- [ ] `bun run test` → all pass
- [ ] `bun run build` → success
- [ ] Coverage 未回退（≥ CI floor）
- [ ] Manual QA（如涉及 UI）：<!-- 描述测试路径 -->

## Reviewer Guidance

<!-- Reviewer 应重点看哪里？哪些改动是机械的可以快速扫过？哪里需要仔细看逻辑？-->

<!--
Checklist:
- [ ] diff < 400 行（超过请拆分或声明分片）
- [ ] 未粘贴 Telegram / 微信 / 机器人对话原文
- [ ] 未粘贴大段 stack trace（保留最小复现路径即可）
- [ ] 关联审计 finding 已在 body 引用（如 audit-vN P1-X）
-->
