## 目的

<!-- 用一句话说明这个 PR 干什么。 -->

## 概览

<!--
- 修了 / 加了 / 改了什么？
- 是否引入新的运行时依赖 / permission / host？
- 是否修改 manifest.json / CSP / 权限？
-->

## 上下文

<!--
- 关联 issue：Closes #
- 审计报告：`.audit-reports/audit-report-readto-*.md` 中的 P0/P1/P2 编号
- 相关 PR：#
-->

## 验证

<!-- 至少一项以下，最好全部 -->

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run test` → 全绿，未新增 skip
- [ ] `npm run test:coverage` → 覆盖率 ≥ 64.14%
- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → dist/manifest.json 硬化字段就位
- [ ] 手工冒烟：Chrome 加载 dist/，打开 options，切 LLM/local 翻译，选词看 tooltip

## Reviewer guidance

<!--
- 重点看什么文件？
- 有什么故意的取舍需要 reviewer 知情？
- 需要 CodeRabbit / Gemini bot 复评的话点 "@coderabbitai review" / "@gemini-code-assist /gemini review"
-->

---

<sub>约定：≥400 行 diff 需拆分或声明分片；body 禁止粘 bot 对话原文与大段 stack trace；参考 `~/.hermes/skills/github/pr-description-standard/`。</sub>
