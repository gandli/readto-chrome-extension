---
version: alpha
name: readto quiet marginalia
description: A restrained browser-extension landing page that makes Chinese reading notes feel native to English articles.
colors:
  primary: "#141210"
  secondary: "#756F66"
  tertiary: "#B2462A"
  ink: "#141210"
  inkSoft: "#2B2824"
  muted: "#756F66"
  faint: "#9A9489"
  rule: "#E3DFD8"
  ruleSoft: "#EBE7DF"
  paper: "#F5F2EB"
  card: "#FBF9F4"
  accent: "#B2462A"
  accentDeep: "#7D2F1C"
  chrome: "#FFFFFF"
  tooltipInk: "#1C1917"
  tooltipRule: "#DBD8D6"
  tooltipMuted: "hsl(25 5% 45%)"
  tooltipInkHover: "hsl(24 10% 10%)"
  tooltipExample: "hsl(24 10% 18%)"
  tooltipTarget: "hsl(24 80% 35%)"
  tooltipZh: "hsl(25 5% 50%)"
  tooltipDarkRule: "hsl(24 6% 18%)"
  tooltipDarkMuted: "hsl(25 5% 65%)"
  speakerBlue: "#1A73E8"
  speakerBlueDark: "#66B1FF"
  softCoral: "#E07A5F"
  shadowDark40: "rgba(0, 0, 0, 0.4)"
  shadowDark45: "rgba(0, 0, 0, 0.45)"
typography:
  display:
    fontFamily: Charter, Iowan Old Style, Source Serif 4, Georgia, serif
    fontSize: 5rem
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: "-0.035em"
  h2:
    fontFamily: Charter, Iowan Old Style, Source Serif 4, Georgia, serif
    fontSize: 3.25rem
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.028em"
  body:
    fontFamily: Inter, Noto Sans SC, system-ui, -apple-system, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  caption:
    fontFamily: Inter, Noto Sans SC, system-ui, -apple-system, sans-serif
    fontSize: 0.78rem
    fontWeight: 500
    lineHeight: 1.4
spacing:
  xs: 6px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 56px
  section: clamp(72px, 10vw, 132px)
rounded:
  xs: 2px
  sm: 4px
  tooltip: 6px
  md: 8px
  lg: 14px
  pill: 999px
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "999px"
    padding: 14px 22px
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "999px"
    padding: 13px 20px
  annotation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.accentDeep}"
    rounded: "{rounded.sm}"
    padding: 1px 2px
  browser-frame:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 0
---

## Overview

readto 的视觉系统来自“英文读物里的中文旁注”，不是传统学习软件。页面应像一张安静的阅读桌面：纸张、墨色、细线、短中文注释、浏览器窗口。核心记忆点必须是词上方自然浮现的中文小注，而不是功能卡片或抽象 AI 渐变。

设计语气：安静、聪明、克制。它要让中文用户相信：安装后，英文网页会更可读，但原文仍是主角。

## Colors

- **Ink `#141210`**：正文和主标题，接近真实书页油墨。
- **Paper `#F5F2EB`**：沿用现有 readto 纸感背景；只作为阅读氛围，不做模板化奶油 SaaS。
- **Accent `#B2462A` / Accent Deep `#7D2F1C`**：模拟批注红棕色，用于中文小注、重点符号和少量 CTA 状态。
- **Rule `#E3DFD8`**：细线、浏览器框线和节奏分隔。
- **Card `#FBF9F4` / Chrome `#FFFFFF`**：阅读内容和浏览器预览表面。

颜色使用必须克制：页面整体仍然是读物，accent 覆盖率控制在 10% 以下，但每次出现都要指向“标注/解释/继续阅读”。

## Typography

现有品牌已使用 serif + sans 的读物气质，继续保留。Display 使用 Charter / Iowan Old Style / Georgia 这一类系统 serif，避免引入重字体资产；正文使用 Inter / Noto Sans SC / system-ui，保证中英文混排清晰。

标题字距不能小于 `-0.04em`，正文行长控制在 65–75ch。中文小注要小、准、短；不能像词典释义那样抢走英文正文层级。

## Layout

首屏采用“左侧命题 + 水平控制，右侧真实浏览器阅读预览”的结构。后续区块要围绕阅读体验展开：

1. 生词小注如何在原文上出现。
2. 水平不同，标注密度如何变化。
3. 为什么不中断阅读比弹窗查词更自然。
4. 安装 CTA。

布局不使用大数字指标和重复 icon-card 网格。可以使用细线、书页边注、浏览器框、滑杆和真实段落来组织信息。

## Elevation & Depth

深度要非常浅。浏览器预览可以有轻微阴影，但不能形成“卡片堆叠 SaaS”观感。优先使用边框、纸色差异和间距组织层级。

## Shapes

卡片/浏览器框圆角最高 14px；按钮可用 pill。禁止 32px+ 大圆角卡片。中文小注使用 2–4px 小圆角，像文本批注而不是徽章。

## Components

- **Browser preview**：落地页最重要组件。必须保留真实英文段落和可调水平滑杆。
- **Annotation**：产品核心表达。中文解释短、贴近词本身，以 super/subtle 方式呈现。
- **Tooltip**：可展示发音和例句，但视觉上应像轻量词义卡片，不像大型弹窗。
- **CTA**：只保留少数明确动作，“安装 Chrome 扩展”。

## Do's and Don'ts

Do:

- 让第一屏直接展示产品实际效果。
- 用真实英文段落说明标注密度。
- 保持阅读安静、可扫读、可理解。
- 移动端优先保证段落和注释可读。

Don't:

- 不使用紫蓝 AI 渐变、玻璃拟态、英雄大数字。
- 不重复小号大写 eyebrow 作为每区块公式。
- 不把功能拆成同质化 icon 卡片网格。
- 不把翻译做成抢眼弹窗或满屏解释。